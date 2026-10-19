import { describe, it, expect } from "vitest";
import { verifyQuotesVerbatim, deduplicateCards, type VerifiedCard } from "@/lib/pipeline/verify";
import type { FlashcardItem } from "@/lib/ai/schemas";

describe("Pipeline Verification & Deduplication", () => {
  const sampleTranscript =
    "In distributed systems, the CAP theorem states that a system cannot simultaneously provide Consistency, Availability, and Partition tolerance. You must pick at most two guarantees.";

  it("passes cards with verbatim matching evidence quotes", () => {
    const card: FlashcardItem = {
      type: "basic",
      conceptName: "CAP Theorem",
      front: "What are the three guarantees in the CAP theorem?",
      back: "Consistency, Availability, and Partition tolerance.",
      evidenceQuote: "the CAP theorem states that a system cannot simultaneously provide Consistency, Availability, and Partition tolerance.",
      evidenceSpan: { startChar: 0, endChar: 10 },
      bloomLevel: "understand",
      difficulty: 2,
      tags: ["distributed-systems"],
    };

    const result = verifyQuotesVerbatim([card], sampleTranscript);
    expect(result.verified.length).toBe(1);
    expect(result.failed.length).toBe(0);
    expect(result.verified[0].evidenceSpan.startChar).toBe(24);
  });

  it("fails cards whose evidence quote does not appear in transcript", () => {
    const ungroundedCard: FlashcardItem = {
      type: "basic",
      conceptName: "Quantum Entanglement",
      front: "What is quantum entanglement?",
      back: "A phenomenon where quantum particles become inextricably linked.",
      evidenceQuote: "Quantum computing uses qubits to break RSA encryption instantly.",
      evidenceSpan: { startChar: 0, endChar: 50 },
      bloomLevel: "remember",
      difficulty: 3,
      tags: ["quantum"],
    };

    const result = verifyQuotesVerbatim([ungroundedCard], sampleTranscript);
    expect(result.verified.length).toBe(0);
    expect(result.failed.length).toBe(1);
  });

  it("deduplicates cards with high lexical similarity", () => {
    const card1: VerifiedCard = {
      type: "basic",
      conceptName: "CAP Theorem",
      front: "What does CAP stand for in distributed systems theorem?",
      back: "Consistency, Availability, Partition tolerance",
      evidenceQuote: "CAP theorem states",
      evidenceSpan: { startChar: 0, endChar: 10 },
      bloomLevel: "remember",
      difficulty: 2,
      tags: [],
      groundedness: 0.95,
      clarity: 0.9,
      uniqueness: 0.9,
      isPassing: true,
      verifiedEvidenceSpan: { startChar: 0, endChar: 10 },
    };

    const card2Duplicate: VerifiedCard = {
      type: "basic",
      conceptName: "CAP Theorem",
      front: "What does CAP stand for in distributed systems theorem?",
      back: "Consistency, Availability, and Partition tolerance",
      evidenceQuote: "CAP theorem states",
      evidenceSpan: { startChar: 0, endChar: 10 },
      bloomLevel: "remember",
      difficulty: 2,
      tags: [],
      groundedness: 0.95,
      clarity: 0.9,
      uniqueness: 0.4,
      isPassing: true,
      verifiedEvidenceSpan: { startChar: 0, endChar: 10 },
    };

    const result = deduplicateCards([card1, card2Duplicate]);
    expect(result.deduped.length).toBe(1);
    expect(result.duplicatesRemoved).toBe(1);
  });
});
