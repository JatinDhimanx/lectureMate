import { describe, it, expect } from "vitest";
import { parseSubtitles } from "@/lib/parsers/srt";
import { ingestTranscript } from "@/lib/pipeline/ingest";
import { parseSpreadsheetBuffer } from "@/lib/parsers/spreadsheet";
import * as XLSX from "xlsx";

describe("Multi-Source Ingestion & Parsers", () => {
  describe("Subtitles & SRT Parser", () => {
    const sampleSrt = `1
00:00:01,000 --> 00:00:04,000
Welcome to distributed systems class.

2
00:00:04,500 --> 00:00:09,000
Today we examine the CAP theorem and consensus.
`;

    it("parses SRT content into cues and full text", () => {
      const result = parseSubtitles(sampleSrt);

      expect(result.cues.length).toBe(2);
      expect(result.cues[0].text).toBe("Welcome to distributed systems class.");
      expect(result.cues[0].startMs).toBe(1000);
      expect(result.cues[0].endMs).toBe(4000);

      expect(result.cues[1].text).toBe("Today we examine the CAP theorem and consensus.");
      expect(result.cues[1].startMs).toBe(4500);
      expect(result.cues[1].endMs).toBe(9000);

      expect(result.fullText).toContain("Welcome to distributed systems class.");
      expect(result.fullText).toContain("CAP theorem and consensus.");
    });

    it("correctly constructs charToTimeMap", () => {
      const result = parseSubtitles(sampleSrt);
      expect(result.charToTimeMap.length).toBe(2);
      expect(result.charToTimeMap[0].timeMs).toBe(1000);
      expect(result.charToTimeMap[1].timeMs).toBe(4500);
      expect(result.charToTimeMap[1].charIndex).toBeGreaterThan(0);
    });

    it("handles plain text fallback gracefully", () => {
      const plainText = "This is a raw transcript without any timestamp markers.";
      const result = parseSubtitles(plainText);
      expect(result.cues.length).toBe(0);
      expect(result.fullText).toBe(plainText);
    });
  });

  describe("Pasted Notes & Markdown Ingestion", () => {
    it("ingests pasted text into unified normalized document", async () => {
      const note = `# Lecture 1: Memory Hierarchy\n\nCache memory sits between registers and RAM to reduce average memory access latency. L1 cache is the fastest on-chip SRAM.`;
      const result = await ingestTranscript({
        sourceType: "paste",
        text: note,
      });

      expect(result.wordCount).toBeGreaterThan(10);
      expect(result.normalizedDocument).toBeDefined();
      expect(result.normalizedDocument?.sourceType).toBe("markdown");
      expect(result.normalizedDocument?.segments.length).toBe(2);
      expect(result.normalizedDocument?.segments[0].type).toBe("heading");
      expect(result.normalizedDocument?.segments[1].type).toBe("paragraph");
    });
  });

  describe("Spreadsheet (CSV & XLSX) Parser", () => {
    it("parses CSV buffers and preserves columns & row relations", async () => {
      const csvContent = `Term,Definition,Importance\nCAP Theorem,Pick 2 of 3 Consistency Availability Partition,High\nQuorum,Majority of nodes agreeing,Critical`;
      const csvBuffer = Buffer.from(csvContent, "utf-8");

      const result = await parseSpreadsheetBuffer(csvBuffer, "csv");
      expect(result.sheetCount).toBeGreaterThan(0);
      expect(result.text).toContain("CAP Theorem");
      expect(result.text).toContain("Quorum");
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.segments[0].type).toBe("table");
    });

    it("parses XLSX buffers and segments sheets", async () => {
      const wb = XLSX.utils.book_new();
      const wsData = [
        ["Topic", "Notes"],
        ["Paging", "Virtual memory split into fixed pages."],
        ["Segmentation", "Memory split into variable segments."],
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, "OS Memory");
      const xlsxBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      const result = await parseSpreadsheetBuffer(xlsxBuffer, "xlsx");
      expect(result.sheetCount).toBe(1);
      expect(result.text).toContain("OS Memory");
      expect(result.text).toContain("Virtual memory split into fixed pages.");
    });
  });

  describe("Validation & Error Safeguards", () => {
    it("rejects empty text", async () => {
      await expect(
        ingestTranscript({
          sourceType: "paste",
          text: "   ",
        })
      ).rejects.toThrow("empty");
    });

    it("rejects missing YouTube URL", async () => {
      await expect(
        ingestTranscript({
          sourceType: "youtube",
        })
      ).rejects.toThrow("required");
    });
  });
});
