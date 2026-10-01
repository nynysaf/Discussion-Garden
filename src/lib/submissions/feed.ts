import type { SupabaseClient } from "@supabase/supabase-js";

export type Submission = {
  id: string;
  body: string;
  nameTag: string | null;
  hidden: boolean;
  createdAt: string;
};

type SubmissionRow = {
  id: string;
  body: string;
  name_tag: string | null;
  status: string;
  created_at: string;
};

export function toSubmission(row: SubmissionRow): Submission {
  return {
    id: row.id,
    body: row.body,
    nameTag: row.name_tag,
    hidden: row.status === "dismissed",
    createdAt: row.created_at,
  };
}

/** Tables whose changes mean "re-read the messages" (app_state also signals hides). */
export const FEED_TABLES = ["audience_submissions", "app_state"];

/** Newest first. RLS decides what each caller sees: TVs get visible ones, hosts get all. */
export async function fetchSubmissions(
  supabase: SupabaseClient,
  limit = 100,
): Promise<Submission[]> {
  const { data, error } = await supabase
    .from("audience_submissions")
    .select("id, body, name_tag, status, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data ?? []) as SubmissionRow[]).map(toSubmission);
}

/** What the room TV shows: the pinned message (if visible) and the rest, newest first. */
export function roomFeed(
  submissions: Submission[],
  highlightedId: string | null,
): { pinned: Submission | null; others: Submission[] } {
  const visible = submissions.filter((s) => !s.hidden);
  const pinned = visible.find((s) => s.id === highlightedId) ?? null;
  const others = visible
    .filter((s) => s !== pinned)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { pinned, others };
}
