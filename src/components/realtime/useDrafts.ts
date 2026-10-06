"use client";

import { EMPTY_DRAFTS } from "@/lib/synthesis/drafts";
import { DRAFT_TABLES, fetchDrafts } from "@/lib/synthesis/drafts-db";
import { useLiveData } from "./useLiveData";

/** The host's AI draft queue, kept fresh through changes and reconnects. */
export function useDrafts() {
  const { data, ...rest } = useLiveData(fetchDrafts, DRAFT_TABLES, EMPTY_DRAFTS);
  return { drafts: data, ...rest };
}
