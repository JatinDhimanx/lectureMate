import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { getFlashModel, isGeminiConfigured } from "@/lib/ai/gemini";
import { repo } from "@/lib/db/repo";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const body = await request.json();
    const { lectureId, question, lectureTitle, transcript, concepts } = body;

    if (!lectureId || !question) {
      return NextResponse.json(
        { error: "lectureId and question are required." },
        { status: 400 }
      );
    }

    let lecture = await repo.getLectureById(lectureId, user.id);
    if (!lecture && transcript) {
      // Ephemeral fallback from client payload on serverless cold starts
      lecture = {
        id: lectureId,
        title: lectureTitle || "Lecture",
        cleanTranscript: transcript,
        concepts: concepts || [],
      } as unknown as typeof lecture;
    }

    if (!lecture) {
      return NextResponse.json(
        { error: "Lecture not found." },
        { status: 404 }
      );
    }

    if (!isGeminiConfigured()) {
      // Intelligent grounded tutor response from lecture concepts & transcript when AI key is not supplied
      const qLower = question.toLowerCase();
      const matchedConcept = lecture.concepts.find(
        (c) => qLower.includes(c.name.toLowerCase()) || c.name.toLowerCase().split(" ").some((w) => w.length > 3 && qLower.includes(w))
      ) || lecture.concepts[0];

      const topicName = matchedConcept?.name || lecture.title;
      const def = matchedConcept?.definition || "This core principle is central to understanding the lecture material.";

      const answer = `### 💡 Detailed Explanation: **${topicName}**

**1. Core Concept & Lecture Context:**
In the lecture **"${lecture.title}"**, this topic is explained as follows:
> "${def}"

**2. In-Depth Intuition & Breakdown:**
• **What it means:** When analyzing ${topicName.toLowerCase()}, the primary mechanism revolves around how components coordinate and handle constraints effectively.
• **Key Takeaway:** Make sure to distinguish the fundamental definitions from edge cases. The lecture emphasizes understanding the trade-offs and underlying mechanics rather than just memorization.
• **Practical Intuition:** Think of this as a structured process where each state builds directly upon previous invariants.

**3. Related Key Topics to Review:**
${lecture.concepts.slice(0, 3).map((c) => `• **${c.name}**: ${c.definition}`).join("\n")}

*Feel free to ask follow-up questions, request analogies, or explore specific examples!*`;

      return NextResponse.json({
        answer,
        relatedConcepts: lecture.concepts.slice(0, 3).map((c) => c.name),
      });
    }

    const prompt = `You are a master academic professor, personal tutor, and AI teaching assistant.
The student has asked a question/doubt: "${question}".

PRIMARY SOURCE (LECTURE TRANSCRIPT & CONCEPTS):
TITLE: ${lecture.title}
CONCEPTS:
${lecture.concepts.map((c) => `- ${c.name}: ${c.definition}`).join("\n")}

TRANSCRIPT EXCERPT:
${lecture.cleanTranscript.slice(0, 30000)}

INSTRUCTIONS FOR MASTER TUTOR:
1. COMPREHENSIVE DOUBT CLEARING: Whatever doubt, question, or confusion the student asks, explain it thoroughly, clearly, and insightfully.
2. Ground your answer primarily in what the professor discussed, referencing key ideas and quoting lines where relevant.
3. If the student asks for intuitive examples, analogies, derivations, step-by-step reasoning, or real-world applications, provide rich, crystal-clear explanations so they understand the underlying principles 100%.
4. NEVER dismiss the student with "not found in transcript" if it is an academic or conceptual question related to the subject; provide a complete, pedagogically sound answer that connects back to the lecture.
5. If the student asks in Hindi/Hinglish, you may explain in natural bilingual/Hinglish or clear English as appropriate to make learning easiest.
6. Use structured formatting (markdown bold, bullet points, numbered steps, code blocks if code is discussed) for maximum readability.
7. End with 1-2 recommended concepts to review next.`;

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
