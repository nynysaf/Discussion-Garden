"use client";

import { fetchPublishedGarden, GARDEN_TABLES } from "@/lib/garden/garden-db";
import type { Garden } from "@/lib/garden/types";
import { useLiveData } from "./useLiveData";

const EMPTY: Garden = { nodes: [], vines: [] };

/** The published festival garden, kept fresh through changes and reconnects. */
export function useGarden() {
  const { data, ...rest } = useLiveData(fetchPublishedGarden, GARDEN_TABLES, EMPTY);
  return { garden: data, ...rest };
}
