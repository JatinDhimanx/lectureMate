/**
 * Content classifier and strict code-tracing validator.
 * Ensures questions are correctly matched to source content type
 * and prevents conceptual/symbolic text from becoming "code tracing".
 */

export type SourceContentType =
  | "definition"
  | "conceptual_explanation"
  | "comparison"
  | "process_workflow"
  | "algorithm"
  | "code_tracing"
  | "debugging"
  | "formula_calculation"
  | "example_application";

/**
 * Robust detection of genuine, executable code snippets.
 * A snippet is ONLY executable code if it exhibits concrete programming syntax
 * (e.g. variable assignments, method invocations with arguments/semicolons,
 * control loops with blocks, or print statements).
 */
export function isExecutableCodeSnippet(text: string): boolean {
  if (!text || text.trim().length < 8) return false;
  const clean = text.trim();

  // Definite code invocation patterns
  const invocationPatterns = [
    /System\s*\.\s*out\s*\.\s*print(ln)?\s*\(/, // Java print
    /console\s*\.\s*log\s*\(/,                  // JS print
    /print\s*\([^)]*\)/,                        // Python print
    /\bnew\s+[A-Za-z0-9_<>[\]]+\s*\([^)]*\)/,   // Object/array instantiation: new int[3]
    /\bnew\s+[A-Za-z0-9_]+\[[^\]]*\]/,          // Array instantiation: new int[]
    /\b(for|while)\s*\([^)]+;[^)]+;[^)]*\)/,     // for loop: for (int i = 0; ...)
    /\bpublic\s+(static\s+)?(void|class|int|String)\b/, // Java class/method declaration
    /\bdef\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(/,      // Python function
    /\bfunction\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(/, // JS function
    /\b(int|double|float|char|boolean|String)\s+[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*[^;]+;/, // Java typed declaration: int x = 5;
    /\b(const|let|var)\s+[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*[^;]+/, // JS variable
    /\b[a-zA-Z_][a-zA-Z0-9_]*\s*\.\s*(length\(\)|equals\(|substring\(|split\(|concat\()/, // Explicit string/collection method calls
  ];

  if (invocationPatterns.some((pattern) => pattern.test(clean))) {
    return true;
  }

  // Multi-line code block or braced statement
  if (clean.includes("{") && clean.includes("}") && /[a-zA-Z0-9_]+\s*\(/.test(clean)) {
    return true;
  }

  return false;
}

/**
 * Classifies an excerpt into its true academic content type.
 * Explicitly guards against technical jargon, arrows (→, ->), and mathematical models
 * being misclassified as code.
 */
export function classifyContentType(sentence: string): SourceContentType {
  const clean = sentence.trim();

  // 1. Strict Code Tracing check
  if (isExecutableCodeSnippet(clean)) {
    if (/\b(error|exception|bug|fix|crash|fails)\b/i.test(clean)) {
      return "debugging";
    }
    return "code_tracing";
  }

  // 2. Mathematical formula or calculation
  if (/\b(O\s*\([^)]+\)|formula|equation|sum\s*=|\d+\s*[+*/-]\s*\d+\s*=)/i.test(clean)) {
    return "formula_calculation";
  }

  // 3. Comparisons and contrasts
  if (/\b(difference between|compared to|versus|\bvs\b|unlike|whereas|similarly)\b/i.test(clean)) {
    return "comparison";
  }

  // 4. Algorithm / Sequence
  if (/\b(algorithm|quicksort|mergesort|binary search|dijkstra|step 1|step 2)\b/i.test(clean)) {
    return "algorithm";
  }

  // 5. Definitions
  if (/^([A-Z][a-zA-Z0-9\s-_]{2,45})\s+(?:is|are|means|refers to|defined as|states that)\s+[^.!?]{10,}/i.test(clean)) {
    return "definition";
  }

  // 6. Process / Workflow (including arrows and pipelines)
  if (clean.includes("→") || clean.includes("->") || /\b(leads to|followed by|pipeline|workflow|procedure)\b/i.test(clean)) {
    return "process_workflow";
  }

  // 7. Example / Application
  if (/\b(for example|for instance|such as|applied in|use case|in practice)\b/i.test(clean)) {
    return "example_application";
  }

  return "conceptual_explanation";
}

/**
 * Validates a flashcard. If a card was classified as "Code Tracing / Output Analysis"
 * but the underlying quote contains no actual executable code, it MUST be sanitized
 * and regenerated as a conceptual question.
 */
export function sanitizeFlashcard(card: {
  front: string;
  back: string;
  evidenceQuote: string;
  conceptName: string;
  type: string;
}): {
  front: string;
  back: string;
  type: string;
  wasRegenerated: boolean;
} {
  const isLabeledAsCode =
    card.front.includes("Code Tracing") ||
    card.front.includes("Output Analysis") ||
    card.front.includes("What will happen when evaluating the following statement");

  if (isLabeledAsCode) {
    const hasRealCode = isExecutableCodeSnippet(card.evidenceQuote) || isExecutableCodeSnippet(card.front);

    if (!hasRealCode) {
      // The quote is conceptual or technical text, NOT executable code!
      // Transform into a technique association or conceptual explanation question.
      const quote = card.evidenceQuote.trim();

      // Check if it's an arrow / association like: "X → Y + Z"
      if (quote.includes("→") || quote.includes("->")) {
        const parts = quote.split(/→|->/);
        const lhs = parts[0]?.trim();
        const rhs = parts.slice(1).join(" ").trim();

        if (lhs && rhs) {
          return {
            front: `Which methods or models address "${lhs}"?`,
            back: rhs,
            type: "basic",
            wasRegenerated: true,
          };
        }
      }

      // Default conceptual conversion
      const cleanFront = `What is the core role and function of "${card.conceptName || "this concept"}"?`;
      return {
        front: cleanFront,
        back: card.evidenceQuote || card.back,
        type: "basic",
        wasRegenerated: true,
      };
    }
  }

  return {
    front: card.front,
    back: card.back,
    type: card.type,
    wasRegenerated: false,
  };
}
