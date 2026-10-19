import { YoutubeTranscript } from "youtube-transcript";

export interface YouTubeTranscriptItem {
  text: string;
  duration: number;
  offset: number;
}

export function extractYouTubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  return match ? match[1] : null;
}

export async function fetchYouTubeTranscript(url: string): Promise<{
  fullText: string;
  items: YouTubeTranscriptItem[];
}> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new Error("Invalid YouTube URL. Please provide a valid YouTube watch or short link.");
  }

  let transcriptItems: YouTubeTranscriptItem[] | null = null;
  let lastErrorMsg = "";

  const langAttempts = [undefined, "en", "hi", "en-US", "en-GB", "es"];

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
    } catch (err: unknown) {
      lastErrorMsg = err instanceof Error ? err.message : String(err);
    }
  }

  if (transcriptItems && transcriptItems.length > 0) {
    const fullText = transcriptItems
      .map((item) => item.text.replace(/&amp;/g, "&").replace(/&#39;/g, "'"))
      .join(" ");

    return {
      fullText,
      items: transcriptItems,
    };
  }

  throw new Error(
    "Captions are disabled or unavailable for this YouTube video. YouTube creator has not enabled public subtitles. Please copy & paste lecture notes/transcript into the 'Paste Text' tab, or upload an audio file."
  );
}
