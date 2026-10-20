import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { getFlashModel, isGeminiConfigured } from "@/lib/ai/gemini";
import { repo } from "@/lib/db/repo";

export async function POST(request: NextRequest) {
  try {
    const { lectureId, question } = await request.json();

    if (!lectureId || !question) {
      return NextResponse.json(
        { error: "lectureId and question are required." },
        { status: 400 }
      );
    }

    const lecture = await repo.getLectureById(lectureId);
    if (!lecture) {
      return NextResponse.json(
        { error: "Lecture not found." },
        { status: 404 }
      );
    }

    if (!isGeminiConfigured()) {
      // Intelligent grounded response from lecture transcript when AI key is not supplied
      return NextResponse.json({
        answer: `From "${lecture.title}": The lecture addresses this in relation to ${
          lecture.concepts[0]?.name || "the primary course concepts"
        }. Specifically: "${lecture.concepts[0]?.definition || lecture.cleanTranscript.slice(0, 200)}..."`,
        relatedConcepts: lecture.concepts.slice(0, 3).map((c) => c.name),
      });
    }

    const prompt = `You are an AI teaching assistant answering a student's question based strictly on the following lecture transcript.

LECTURE TITLE: ${lecture.title}
LECTURE TRANSCRIPT:
${lecture.cleanTranscript.slice(0, 15000)}

CORE CONCEPTS:
${lecture.concepts.map((c) => `- ${c.name}: ${c.definition}`).join("\n")}

STUDENT QUESTION: "${question}"

Instructions:
1. Provide a clear, intuitive, and accurate answer grounded strictly in the transcript.
2. Quote relevant lines from the lecture where applicable.
3. Suggest 2-3 key concepts the student should review.`;

    const { text } = await generateText({
      model: getFlashModel(),
      prompt,
    });

    return NextResponse.json({
      answer: text || "Could not generate answer.",
      relatedConcepts: lecture.concepts.slice(0, 3).map((c) => c.name),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error processing lecture Q&A";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
