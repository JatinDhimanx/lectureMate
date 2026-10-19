import { describe, it, expect } from "vitest";
import { parseSubtitles } from "@/lib/parsers/srt";

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
