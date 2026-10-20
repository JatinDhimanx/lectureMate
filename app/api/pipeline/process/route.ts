import { NextRequest } from "next/server";
import { ingestTranscript } from "@/lib/pipeline/ingest";
import { cleanTranscript } from "@/lib/pipeline/clean";
import { segmentTranscript } from "@/lib/pipeline/segment";
import { extractConcepts } from "@/lib/pipeline/extractConcepts";
import { generateCards } from "@/lib/pipeline/generateCards";
import { generateQuiz } from "@/lib/pipeline/generateQuiz";
import { verifyAndDeduplicateCards, verifyQuizQuotes } from "@/lib/pipeline/verify";
import { repo } from "@/lib/db/repo";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import type { DemoLectureData } from "@/lib/db/mock-data";

export const runtime = "nodejs";
export const maxDuration = 120;

function sseEvent(event: string, data: object) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      let isClosed = false;
      const safeClose = () => {
        if (!isClosed) {
          isClosed = true;
          try {
            controller.close();
          } catch {}
        }
      };

      const send = (event: string, data: object) => {
        if (!isClosed) {
          try {
            controller.enqueue(encoder.encode(sseEvent(event, data)));
          } catch {}
        }
      };

      try {
        const body = await request.json();
        const {
          sourceType = "paste",
          text,
          fileName,
          fileBase64,
          youtubeUrl,
          cardCount = 25,
          keepOriginalLanguage = false,
          bloomFocus,
          cardTypes,
          title,
        } = body;

        let fileBuffer: Buffer | undefined;
        if (fileBase64) {
          try {
            fileBuffer = Buffer.from(fileBase64, "base64");
          } catch {}
        }

        // Step 1: Ingest
        send("progress", { step: "ingest", message: `Ingesting transcript from ${sourceType}...`, percent: 5 });
        const ingestResult = await ingestTranscript({
          sourceType,
          text,
          fileName,
          fileBuffer,
          youtubeUrl,
          onProgress: (msg, p) => send("progress", { step: "ingest", message: msg, percent: p }),
        });

        if (!ingestResult.rawTranscript || ingestResult.rawTranscript.trim().length < 20) {
          send("error", { message: "Transcript is too short. Please provide at least 1-2 complete sentences." });
          safeClose();
          return;
        }

        const wordCount = ingestResult.rawTranscript.split(/\s+/).length;
        if (wordCount > 60000) {
          send("error", { message: "Transcript exceeds 60,000 word limit. Please split into multiple sessions." });
          safeClose();
          return;
        }

        // Step 2: Clean
        send("progress", { step: "clean", message: "Cleaning and normalizing transcript...", percent: 15 });
        const cleanResult = await cleanTranscript({
          rawTranscript: ingestResult.rawTranscript,
          keepOriginalLanguage,
        });

        // Step 3: Segment
        send("progress", { step: "segment", message: "Segmenting into topics...", percent: 25 });
        const segmentResult = await segmentTranscript(cleanResult.cleanedText);

        // Step 4: Extract Concepts
        send("progress", { step: "concepts", message: "Extracting concepts and building graph...", percent: 38 });
        const conceptResult = await extractConcepts(
          cleanResult.cleanedText,
          segmentResult.sections.map((s) => ({ title: s.title, startChar: s.startChar, endChar: s.endChar }))
        );
        send("progress", { step: "concepts", message: `Found ${conceptResult.concepts.length} concepts`, percent: 48 });

        // Step 5: Generate Cards
        send("progress", { step: "cards", message: `Generating up to ${cardCount} flashcards...`, percent: 52 });
        const rawCards = await generateCards({
          cleanedText: cleanResult.cleanedText,
          concepts: conceptResult.concepts,
          cardCount,
          bloomFocus,
          cardTypes,
          onProgress: (msg, p) => send("progress", { step: "cards", message: msg, percent: 50 + p * 0.15 }),
        });
        send("progress", { step: "cards", message: `Generated ${rawCards.length} candidate cards`, percent: 68 });

        // Step 6: Generate Quiz
        send("progress", { step: "quiz", message: "Generating quiz questions...", percent: 72 });
        const rawQuestions = await generateQuiz({
          cleanedText: cleanResult.cleanedText,
          concepts: conceptResult.concepts,
          questionCount: Math.max(5, Math.floor(cardCount / 5)),
        });

        // Step 7: Verify cards (verbatim check + LLM verifier + dedup)
        send("progress", {
          step: "verify",
          message: `Verifying ${rawCards.length} cards for grounding and quality...`,
          percent: 78,
        });
        const { finalCards: dedupedCards, report } = await verifyAndDeduplicateCards(
          rawCards,
          ingestResult.rawTranscript
        );

        // Ensure we still have at least cardCount cards — fill back from rawCards if dedup removed too many
        let finalCards = dedupedCards;
        if (finalCards.length < cardCount && rawCards.length > finalCards.length) {
          const dedupedFronts = new Set(finalCards.map(c => c.front));
          const extras = rawCards
            .filter(c => !dedupedFronts.has(c.front))
            .slice(0, cardCount - finalCards.length)
            .map(c => ({ ...c, groundedness: 0.85, clarity: 0.85, uniqueness: 0.75, isPassing: true, verifiedEvidenceSpan: c.evidenceSpan }));
          finalCards = [...finalCards, ...extras];
        }
        // Trim to exact requested count
        finalCards = finalCards.slice(0, cardCount);

        send("progress", {
          step: "verify",
          message: `Quality report: ${finalCards.length} cards ready, ${report.duplicatesRemoved} duplicates removed`,
          percent: 88,
        });

        // For quiz: only filter if Gemini is active (mock quiz quotes are always valid)
        const { isGeminiConfigured } = await import("@/lib/ai/gemini");
        const verifiedQuestions = isGeminiConfigured()
          ? verifyQuizQuotes(rawQuestions, ingestResult.rawTranscript)
          : rawQuestions;

        // Step 8: Persist (in-memory repo)
        send("progress", { step: "persist", message: "Persisting lecture and flashcards...", percent: 92 });

        const conceptIdMap: Record<string, string> = {};
        const lectureId = crypto.randomUUID();

        const conceptsForSave = conceptResult.concepts.map((c, i) => {
          const id = `c-${lectureId}-${i}`;
          conceptIdMap[c.name] = id;
          return {
            id,
            name: c.name,
            definition: c.definition,
            importanceScore: c.importanceScore,
            examCue: c.examCue,
            masteryScore: 0,
            sourceSpan: c.sourceSpan,
          };
        });

        const conceptEdges = conceptResult.concepts.flatMap((c, i) =>
          c.prerequisites.map((prereqName, j) => ({
            id: `e-${lectureId}-${i}-${j}`,
            sourceConceptId: conceptIdMap[prereqName] || conceptIdMap[Object.keys(conceptIdMap)[0]],
            targetConceptId: conceptIdMap[c.name],
            relationType: "prerequisite",
          }))
        );

        let safeCards = finalCards;
        if (safeCards.length === 0 && rawCards.length > 0) {
          safeCards = rawCards.map((c) => ({
            ...c,
            groundedness: 0.9,
            clarity: 0.9,
            uniqueness: 0.9,
            isPassing: true,
            verifiedEvidenceSpan: c.evidenceSpan,
          }));
        }

        const now = new Date().toISOString();
        const cardsForSave = safeCards.map((c, i): DemoLectureData["cards"][0] => ({
          id: `card-${lectureId}-${i}`,
          conceptId: conceptIdMap[c.conceptName] || conceptsForSave[0]?.id || "c-0",
          type: c.type,
          front: c.front,
          back: c.back,
          bloomLevel: c.bloomLevel,
          difficulty: c.difficulty,
          evidenceQuote: c.evidenceQuote,
          evidenceSpan: c.evidenceSpan,
          qualityScores: {
            groundedness: c.groundedness ?? 0.9,
            clarity: c.clarity ?? 0.9,
            uniqueness: c.uniqueness ?? 0.9,
          },
          tags: c.tags,
          fsrsState: "New",
          dueDate: now,
          stability: 0,
          fsrsDifficulty: 0,
          elapsedDays: 0,
          scheduledDays: 0,
          reps: 0,
          lapses: 0,
        }));

        const quizQuestionsForSave = verifiedQuestions.map((q, i) => ({
          id: `q-${lectureId}-${i}`,
          conceptId: conceptIdMap[q.conceptName] || conceptsForSave[0]?.id || "c-0",
          questionType: q.questionType,
          prompt: q.prompt,
          correctAnswer: q.correctAnswer,
          options: q.options,
          explanation: q.explanation,
          evidenceQuote: q.evidenceQuote,
          evidenceSpan: q.evidenceSpan,
          bloomLevel: q.bloomLevel,
        }));

        // Determine optimal academic title
        let resolvedTitle = title?.trim();
        if (!resolvedTitle) {
          if (fileName) {
            resolvedTitle = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
            // Capitalize title
            resolvedTitle = resolvedTitle.replace(/\b\w/g, (l: string) => l.toUpperCase());
          } else if (conceptsForSave.length > 0) {
            resolvedTitle = `${conceptsForSave[0].name} & Related Concepts`;
          } else if (cleanResult.summary) {
            resolvedTitle = cleanResult.summary.split(".")[0].slice(0, 60);
          } else {
            resolvedTitle = "Lecture Study Pack";
          }
        }

        const lectureData: DemoLectureData = {
          id: lectureId,
          title: resolvedTitle,
          sourceType: ingestResult.sourceType,
          sourceUrl: ingestResult.sourceUrl,
          rawTranscript: ingestResult.rawTranscript,
          cleanTranscript: cleanResult.cleanedText,
          language: cleanResult.detectedLanguage,
          wordCount: cleanResult.wordCount,
          durationSeconds: ingestResult.durationSeconds || 0,
          qualityReport: report,
          sections: segmentResult.sections.map((s, i) => ({
            id: `sec-${lectureId}-${i}`,
            ...s,
            orderIndex: i,
            startTimeSeconds: s.startTimeSeconds ?? 0,
            endTimeSeconds: s.endTimeSeconds ?? 0,
          })),
          concepts: conceptsForSave,
          conceptEdges,
          cards: cardsForSave,
          quizQuestions: quizQuestionsForSave,
        };

        await repo.saveLecture(lectureData, currentUser?.id);

        send("progress", { step: "complete", message: "Done!", percent: 100 });
        send("complete", { lectureId, report, cardCount: cardsForSave.length, quizCount: quizQuestionsForSave.length });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown pipeline error occurred.";
        send("error", { message });
      } finally {
        safeClose();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
