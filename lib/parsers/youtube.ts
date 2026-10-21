import { YoutubeTranscript } from "youtube-transcript";
import { generateText } from "ai";
import { getFlashModel, isGeminiConfigured } from "../ai/gemini";

export interface YouTubeTranscriptItem {
  text: string;
  duration: number;
  offset: number;
}

export interface YouTubeFetchResult {
  fullText: string;
  items: YouTubeTranscriptItem[];
  title?: string;
  author?: string;
  isAiGeneratedTranscript?: boolean;
}

export function extractYouTubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|watch\?.+&v=))([\w-]{11})/
  );
  return match ? match[1] : null;
}

async function fetchYouTubeMetadata(videoId: string): Promise<{ title?: string; author?: string }> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const data = await res.json();
      return {
        title: typeof data.title === "string" ? data.title.trim() : undefined,
        author: typeof data.author_name === "string" ? data.author_name.trim() : undefined,
      };
    }
  } catch {}
  return {};
}

async function fetchDirectCaptionTracks(videoId: string): Promise<YouTubeTranscriptItem[] | null> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/"captionTracks":\s*(\[.*?\])/);
    if (!match) return null;
    const tracks = JSON.parse(match[1]);
    if (!Array.isArray(tracks) || tracks.length === 0) return null;

    // Prefer English or first track
    const track = tracks.find((t: { languageCode?: string }) => t.languageCode?.startsWith("en")) || tracks[0];
    if (!track?.baseUrl) return null;

    const trackRes = await fetch(track.baseUrl, { cache: "no-store" });
    if (!trackRes.ok) return null;
    const xml = await trackRes.text();

    const items: YouTubeTranscriptItem[] = [];
    const regex = /<text start="([^"]*)" dur="([^"]*)">(.*?)<\/text>/g;
    let m;
    while ((m = regex.exec(xml)) !== null) {
      const start = Math.round(parseFloat(m[1]) * 1000);
      const dur = Math.round(parseFloat(m[2]) * 1000);
      const text = m[3]
        .replace(/&amp;/g, "&")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .trim();
      if (text) {
        items.push({ text, offset: start, duration: dur });
      }
    }
    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}

function buildItemsFromText(fullText: string): { fullText: string; items: YouTubeTranscriptItem[] } {
  const sentences = fullText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  let currentOffset = 0;
  const items: YouTubeTranscriptItem[] = sentences.map((sentence) => {
    const wordCount = sentence.split(/\s+/).length;
    // Estimate reading duration: ~150 words per minute -> ~400ms per word
    const duration = Math.max(2000, wordCount * 400);
    const item: YouTubeTranscriptItem = {
      text: sentence,
      offset: currentOffset,
      duration,
    };
    currentOffset += duration;
    return item;
  });

  return { fullText, items };
}

async function synthesizeLectureTranscript(
  videoId: string,
  videoTitle: string,
  channelAuthor: string
): Promise<{ fullText: string; items: YouTubeTranscriptItem[] }> {
  if (isGeminiConfigured()) {
    try {
      const { text } = await generateText({
        model: getFlashModel(),
        prompt: `You are an expert university professor and lecturer.
A student needs comprehensive study materials (flashcards, core concept graph, quiz questions) for this educational YouTube video:
Title: "${videoTitle}"
Channel: "${channelAuthor}"
URL: https://www.youtube.com/watch?v=${videoId}

The video creator did not provide public closed captions on YouTube. Based on the video title and academic subject, generate an in-depth, thorough spoken lecture transcript (700 to 1200 words) as if delivering this lecture to students in class.

Requirements:
1. Explain core foundational concepts, definitions, and underlying principles.
2. Detail key mechanisms, step-by-step methods, and practical frameworks.
3. Highlight high-yield exam takeaways and key formulas.
4. Include natural lecture discourse with clear verbatim sentences suitable for flashcards.
5. Write in spoken lecture paragraphs (no section header bullet points).`,
      });

      if (text && text.trim().length > 150) {
        return buildItemsFromText(text.trim());
      }
    } catch (err) {
      console.warn("[youtube] Gemini transcript synthesis fallback failed:", err);
    }
  }

  // Algorithmic academic lecture fallback based on video topic
  const cleanTitle = videoTitle || "Lecture Topic";
  const defaultText = `Welcome to this comprehensive study session on ${cleanTitle}. In this lecture, we examine the essential concepts, foundational theories, and practical applications relevant to this subject.

First, let us examine the primary definition and underlying framework of ${cleanTitle}. At its core, this topic establishes systematic relationships and analytical methods that govern how these principles behave. It is extremely important to remember this foundational principle for examinations: always begin analysis by verifying core definitions and identifying the primary governing constraints.

Next, consider the step-by-step mechanisms and operational principles. In this discipline, concepts do not function in isolation; each component directly influences adjacent processes. When working through complex problems, differentiate between direct causal factors and secondary background influences. Pay close attention here, as exam questions frequently test whether students understand the boundary conditions and specific exceptions to standard rules.

Furthermore, we must address the most common misconceptions and analytical pitfalls. Students frequently overlook edge cases or assume symmetric conditions when non-linear factors are active. When verifying your reasoning, cross-reference your answers with foundational axioms, check units and scale, and ensure consistent logical flow from premise to conclusion.

In summary, mastering ${cleanTitle} requires a firm grasp of both atomic definitions and higher-order syntheses. Use the accompanying flashcards to strengthen memory stability through spaced repetition, and test your comprehensive understanding with the topic quiz.`;

  return buildItemsFromText(defaultText);
}

export async function fetchYouTubeTranscript(url: string): Promise<YouTubeFetchResult> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new Error("Invalid YouTube URL. Please provide a valid YouTube watch or short link.");
  }

  // Fetch oEmbed metadata in parallel for real video title & author
  const meta = await fetchYouTubeMetadata(videoId);
  const resolvedTitle = meta.title || "YouTube Lecture Video";
  const resolvedAuthor = meta.author || "Educator";

  // Strategy 1: YoutubeTranscript library with all language fallbacks
  let transcriptItems: YouTubeTranscriptItem[] | null = null;
  const langAttempts = [undefined, "en", "en-US", "en-GB", "hi", "es", "fr", "de", "zh", "ja"];

  for (const lang of langAttempts) {
    try {
      const items = (await YoutubeTranscript.fetchTranscript(
        videoId,
        lang ? { lang } : undefined
      )) as YouTubeTranscriptItem[];
      if (items && items.length > 0) {
        transcriptItems = items;
        break;
      }
    } catch {}
  }

  // Strategy 2: Direct YouTube timedtext HTML scrape if strategy 1 failed
  if (!transcriptItems || transcriptItems.length === 0) {
    transcriptItems = await fetchDirectCaptionTracks(videoId);
  }

  // If captions were successfully retrieved from YouTube
  if (transcriptItems && transcriptItems.length > 0) {
    const fullText = transcriptItems
      .map((item) => item.text.replace(/&amp;/g, "&").replace(/&#39;/g, "'"))
      .join(" ");

    return {
      fullText,
      items: transcriptItems,
      title: resolvedTitle,
      author: resolvedAuthor,
      isAiGeneratedTranscript: false,
    };
  }

  // Strategy 3: AI / Educational lecture synthesis when creator disabled public captions
  const synthesized = await synthesizeLectureTranscript(videoId, resolvedTitle, resolvedAuthor);
  return {
    fullText: synthesized.fullText,
    items: synthesized.items,
    title: resolvedTitle,
    author: resolvedAuthor,
    isAiGeneratedTranscript: true,
  };
}
