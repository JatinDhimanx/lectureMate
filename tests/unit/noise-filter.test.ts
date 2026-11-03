import { describe, it, expect } from "vitest";
import { isNoiseSentence, scoreAcademicValue, removeNoiseAndChatter, cleanTranscript } from "@/lib/pipeline/clean";
import { extractConcepts } from "@/lib/pipeline/extractConcepts";
import { generateCards } from "@/lib/pipeline/generateCards";
import { generateQuiz } from "@/lib/pipeline/generateQuiz";

describe("High-Yield Content Filter & Purge Fluff", () => {
  it("correctly identifies noise sentences vs academic sentences", () => {
    // Noise sentences
    expect(isNoiseSentence("Good morning everyone!")).toBe(true);
    expect(isNoiseSentence("Can you hear me? Am I audible?")).toBe(true);
    expect(isNoiseSentence("Screen dikh rahi hai sabko?")).toBe(true);
    expect(isNoiseSentence("Please mark your attendance in the link given below.")).toBe(true);
    expect(isNoiseSentence("Don't forget to like, share and subscribe to the channel.")).toBe(true);
    expect(isNoiseSentence("Arey kisi ko koi doubt hai kya?")).toBe(true);
    expect(isNoiseSentence("Submit assignment by Friday for 10 marks.")).toBe(true);
    expect(isNoiseSentence("Okay.")).toBe(true);

    // Academic sentences
    expect(isNoiseSentence("Newton's second law states that force equals mass times acceleration.")).toBe(false);
    expect(isNoiseSentence("The CAP theorem states that a distributed system cannot simultaneously provide Consistency, Availability, and Partition tolerance.")).toBe(false);
    expect(isNoiseSentence("Quorum consensus requires that read quorum plus write quorum exceeds the total number of nodes.")).toBe(false);
  });

  it("gives high positive scores to core academic statements and negative scores to noise", () => {
    const academicScore = scoreAcademicValue(
      "The CAP theorem states that a distributed data store can guarantee at most two of consistency, availability, and partition tolerance."
    );
    const noiseScore = scoreAcademicValue("Awaaz aa rahi hai kya students? Please mute your mic.");

    expect(academicScore).toBeGreaterThan(5);
    expect(noiseScore).toBeLessThan(0);
  });

  it("removes all noise and retains only high-yield content from a noisy lecture transcript", async () => {
    const rawNoisyTranscript = `
Good morning everyone! Can you hear me? Am I audible?
Screen visible hai na sabko? Chalo shuru karte hain.
Please mark your attendance in the link given in chat.
Assignment deadline is next Monday for 10 marks.
The CAP theorem states that a distributed data store can guarantee at most two of consistency, availability, and partition tolerance.
Samajh aaya sabko? Kisi ko koi doubt?
Like and subscribe to the channel and hit the bell icon.
Consistency ensures every read receives the most recent write or an error.
Availability guarantees that every non-failing node returns a response for every request.
Partition tolerance means the system continues to operate despite an arbitrary number of messages being dropped by the network.
Class is dismissed, see you tomorrow.
    `.trim();

    const cleaned = await cleanTranscript({ rawTranscript: rawNoisyTranscript });

    // Assert noise was purged
    expect(cleaned.cleanedText).not.toContain("Good morning");
    expect(cleaned.cleanedText).not.toContain("audible");
    expect(cleaned.cleanedText).not.toContain("attendance");
    expect(cleaned.cleanedText).not.toContain("Assignment deadline");
    expect(cleaned.cleanedText).not.toContain("subscribe");
    expect(cleaned.cleanedText).not.toContain("dismissed");

    // Assert essential academic content was preserved
    expect(cleaned.cleanedText).toContain("CAP theorem");
    expect(cleaned.cleanedText).toContain("Consistency");
    expect(cleaned.cleanedText).toContain("Availability");
    expect(cleaned.cleanedText).toContain("Partition tolerance");

    // Test concept extraction on the cleaned text
    const concepts = await extractConcepts(cleaned.cleanedText, [
      { title: "Distributed Consensus", startChar: 0, endChar: cleaned.cleanedText.length },
    ]);

    expect(concepts.concepts.length).toBeGreaterThan(0);
    for (const c of concepts.concepts) {
      expect(isNoiseSentence(c.name)).toBe(false);
      expect(isNoiseSentence(c.definition)).toBe(false);
    }

    // Test flashcard generation
    const cards = await generateCards({
      cleanedText: cleaned.cleanedText,
      concepts: concepts.concepts,
      cardCount: 4,
    });

    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(card.front).not.toMatch(/attendance|audible|subscribe|good morning/i);
      expect(card.back).not.toMatch(/attendance|audible|subscribe|good morning/i);
    }

    // Test quiz generation
    const quiz = await generateQuiz({
      cleanedText: cleaned.cleanedText,
      concepts: concepts.concepts,
      questionCount: 3,
    });

    expect(quiz.length).toBeGreaterThan(0);
    for (const q of quiz) {
      expect(q.prompt).not.toMatch(/attendance|audible|subscribe|good morning/i);
    }
  });
});

