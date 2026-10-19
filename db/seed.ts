import { SAMPLE_LECTURE_DATA } from "../lib/db/mock-data";
import { getDb } from "../lib/db/client";
import { lectures, sections, concepts, conceptEdges, cards, quizQuestions } from "./schema";

async function main() {
  console.log("🌱 RecallLoop Seeder starting...");
  console.log(`Lecture: "${SAMPLE_LECTURE_DATA.title}"`);
  console.log(`Concepts: ${SAMPLE_LECTURE_DATA.concepts.length}`);
  console.log(`Flashcards: ${SAMPLE_LECTURE_DATA.cards.length}`);
  console.log(`Quiz Questions: ${SAMPLE_LECTURE_DATA.quizQuestions.length}`);

  // Programmatic verification check:
  console.log("\n🔍 Verifying all flashcard evidence quotes exist verbatim in transcript...");
  let allQuotesFound = true;
  for (const card of SAMPLE_LECTURE_DATA.cards) {
    const found = SAMPLE_LECTURE_DATA.rawTranscript.includes(card.evidenceQuote);
    if (!found) {
      console.error(`❌ Quote NOT found for card ${card.id}: "${card.evidenceQuote.slice(0, 50)}..."`);
      allQuotesFound = false;
    }
  }

  if (allQuotesFound) {
    console.log("✅ All flashcard evidence quotes are 100% verified verbatim in raw transcript!");
  } else {
    process.exit(1);
  }

  const db = getDb();
  if (!db) {
    console.log("ℹ️ No live PostgreSQL database configured. Seed verified for in-memory & mock operation.");
    return;
  }

  const demoUserId = "00000000-0000-0000-0000-000000000001";

  try {
    console.log("Inserting demo lecture into PostgreSQL...");
    await db.insert(lectures).values({
      id: SAMPLE_LECTURE_DATA.id,
      userId: demoUserId,
      title: SAMPLE_LECTURE_DATA.title,
      sourceType: SAMPLE_LECTURE_DATA.sourceType,
      rawTranscript: SAMPLE_LECTURE_DATA.rawTranscript,
      cleanTranscript: SAMPLE_LECTURE_DATA.cleanTranscript,
      language: SAMPLE_LECTURE_DATA.language,
      wordCount: SAMPLE_LECTURE_DATA.wordCount,
      durationSeconds: SAMPLE_LECTURE_DATA.durationSeconds,
      status: "ready",
      qualityReport: SAMPLE_LECTURE_DATA.qualityReport,
    }).onConflictDoNothing();

    console.log("✅ Database successfully seeded!");
  } catch (err) {
    console.warn("Could not insert directly into live database:", err);
  }
}

main().catch((err) => {
  console.error("Seeding error:", err);
  process.exit(1);
});
