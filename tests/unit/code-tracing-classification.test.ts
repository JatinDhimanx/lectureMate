import { describe, it, expect } from "vitest";
import {
  isExecutableCodeSnippet,
  classifyContentType,
  sanitizeFlashcard,
} from "@/lib/pipeline/classifier";
import { generateCards } from "@/lib/pipeline/generateCards";

describe("Strict Code-Tracing & Question-Type Classification", () => {
  const reportedSample =
    "Viewpoint variation → projective homography + RPC model for orbital geometry correction.";
  const javaCodeSample = "In Java, System.out.println(2 + 3); prints the sum of two integers.";
  const javaArraySample =
    "new int[3]{1, 2, 3} throws a compile-time error because dimension cannot be declared with initializer.";
  const symbolicMathSample =
    "Algorithm complexity is O(n log n) where n is the number of vertices in graph G = (V, E).";

  describe("isExecutableCodeSnippet()", () => {
    it("returns false for conceptual statements containing arrows and model names", () => {
      expect(isExecutableCodeSnippet(reportedSample)).toBe(false);
    });

    it("returns false for symbolic mathematical text", () => {
      expect(isExecutableCodeSnippet(symbolicMathSample)).toBe(false);
    });

    it("returns true for actual Java print invocation", () => {
      expect(isExecutableCodeSnippet(javaCodeSample)).toBe(true);
    });

    it("returns true for Java array instantiation syntax", () => {
      expect(isExecutableCodeSnippet(javaArraySample)).toBe(true);
    });
  });

  describe("classifyContentType()", () => {
    it("classifies 'Viewpoint variation → projective homography + RPC model' as process_workflow, NEVER code_tracing", () => {
      const type = classifyContentType(reportedSample);
      expect(type).toBe("process_workflow");
      expect(type).not.toBe("code_tracing");
    });

    it("classifies executable Java snippet as code_tracing", () => {
      const type = classifyContentType(javaCodeSample);
      expect(type).toBe("code_tracing");
    });

    it("classifies algorithm complexity as formula_calculation", () => {
      const type = classifyContentType(symbolicMathSample);
      expect(type).toBe("formula_calculation");
    });
  });

  describe("sanitizeFlashcard() Server-side Validation", () => {
    it("detects and regenerates an invalid Code Tracing card into a conceptual question", () => {
      const invalidCard = {
        front:
          'Code Tracing / Output Analysis: What will happen when evaluating the following statement, and why? "Viewpoint variation → projective homography + RPC model for orbital geometry correction."',
        back: "Viewpoint variation → projective homography + RPC model for orbital geometry correction.",
        evidenceQuote: reportedSample,
        conceptName: "Orbital Geometry",
        type: "worked_example",
      };

      const sanitized = sanitizeFlashcard(invalidCard);

      expect(sanitized.wasRegenerated).toBe(true);
      expect(sanitized.front).not.toContain("Code Tracing");
      expect(sanitized.front).not.toContain("Output Analysis");
      expect(sanitized.front).toBe('Which methods or models address "Viewpoint variation"?');
      expect(sanitized.back).toBe(
        "projective homography + RPC model for orbital geometry correction."
      );
    });

    it("preserves genuine code-tracing cards that have actual executable code", () => {
      const validCodeCard = {
        front:
          'Code Tracing / Output Analysis:\nWhat will happen when evaluating the following statement, and why?\n"System.out.println(2 + 3);"',
        back: "It prints 5 because the + operator performs integer addition before printing.",
        evidenceQuote: "System.out.println(2 + 3);",
        conceptName: "Integer Addition",
        type: "worked_example",
      };

      const sanitized = sanitizeFlashcard(validCodeCard);
      expect(sanitized.wasRegenerated).toBe(false);
      expect(sanitized.front).toContain("Code Tracing");
    });
  });

  describe("generateCards() Integration", () => {
    it("never produces a 'Code Tracing' front for the reported viewpoint variation text", async () => {
      const lectureText = `${reportedSample} Remote sensing satellites utilize stereo imagery for surface height calculation.`;
      const concepts = [
        {
          name: "Orbital Geometry",
          definition: "Geometric alignment of satellite optical sensors.",
        },
      ];

      const cards = await generateCards({
        cleanedText: lectureText,
        concepts,
        cardCount: 2,
      });

      expect(cards.length).toBe(2);
      for (const card of cards) {
        expect(card.front).not.toContain("Code Tracing / Output Analysis");
      }
    });
  });
});
