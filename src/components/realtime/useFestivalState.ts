"use client";

import {
  EMPTY_FESTIVAL_STATE,
  FESTIVAL_TABLES,
  fetchFestivalState,
} from "@/lib/realtime/festival-state";
import { useLiveData } from "./useLiveData";

/** Live app state + days + schedule, kept fresh through reconnects. */
export function useFestivalState() {
  const { data, ...rest } = useLiveData(fetchFestivalState, FESTIVAL_TABLES, EMPTY_FESTIVAL_STATE);
  return { state: data, ...rest };
}
