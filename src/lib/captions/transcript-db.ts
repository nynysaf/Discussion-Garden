import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchActivationsForSession } from "@/lib/inquiries/inquiries-db";
import {
  formatDayTranscript,
  transcriptFilename,
  type TranscriptLine,
} from "./transcript-export";

type SessionRow = { id: string; slug: string; title: string };

/** Download today's (or the selected day's) transcript as a .txt file in the browser. */
export async function downloadDayTranscript(
  supabase: SupabaseClient,
  sessionId: string | null,
): Promise<{ filename: string; lineCount: number }> {
  if (!sessionId) throw new Error("Pick a festival day first.");

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, slug, title")
    .eq("id", sessionId)
    .maybeSingle();
  if (sessionError) throw new Error(sessionError.message);
  if (!session) throw new Error("That festival day wasn't found.");

  const [{ data: rows, error }, activations] = await Promise.all([
    supabase
      .from("transcript_segments")
      .select("speaker, text, start_ms, created_at")
      .eq("session_id", sessionId)
      .order("start_ms", { ascending: true }),
    fetchActivationsForSession(supabase, sessionId),
  ]);
  if (error) throw new Error(error.message);

  const lines: TranscriptLine[] = (rows ?? []).map((row) => ({
    speaker: row.speaker as number,
    text: row.text as string,
    startMs: row.start_ms as number,
    createdAt: row.created_at as string,
  }));

  const day = session as SessionRow;
  const text = formatDayTranscript(lines, {
    daySlug: day.slug,
    dayTitle: day.title,
    inquiries: activations.map((a) => ({ body: a.body, activatedAt: a.activatedAt })),
  });
  const filename = transcriptFilename(day.slug);
  triggerBrowserDownload(filename, text, "text/plain;charset=utf-8");
  return { filename, lineCount: lines.length };
}

function triggerBrowserDownload(filename: string, body: BlobPart, type: string) {
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
