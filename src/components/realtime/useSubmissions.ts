"use client";

import { FEED_TABLES, fetchSubmissions, type Submission } from "@/lib/submissions/feed";
import { useLiveData } from "./useLiveData";

const EMPTY: Submission[] = [];
const fetchLatest = (supabase: Parameters<typeof fetchSubmissions>[0]) => fetchSubmissions(supabase);

/** Audience messages, kept fresh through changes, hides, and reconnects. */
export function useSubmissions() {
  const { data, ...rest } = useLiveData(fetchLatest, FEED_TABLES, EMPTY);
  return { submissions: data, ...rest };
}
