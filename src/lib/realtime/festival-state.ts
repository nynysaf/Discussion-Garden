import type { SupabaseClient } from "@supabase/supabase-js";
import type { LiveInquiry } from "@/lib/inquiries/inquiries";
import { nowAndNext, timedItems } from "@/lib/schedule/schedule";
import {
  APP_STATE_COLUMNS,
  DEFAULT_APP_STATE,
  toAppState,
  type AppState,
  type AppStateRow,
} from "./app-state";

export type FestivalSession = { id: string; slug: string; title: string; date: string };

export type ScheduleItem = {
  id: string;
  sessionId: string;
  title: string;
  question: string | null;
  startsAt: string | null;
  sortOrder: number;
};

export type FestivalState = {
  appState: AppState;
  sessions: FestivalSession[];
  schedule: ScheduleItem[];
  inquiries: LiveInquiry[];
};

export const EMPTY_FESTIVAL_STATE: FestivalState = {
  appState: DEFAULT_APP_STATE,
  sessions: [],
  schedule: [],
  inquiries: [],
};

type ScheduleRow = {
  id: string;
  session_id: string;
  title: string;
  question: string | null;
  starts_at: string | null;
  sort_order: number;
};

type InquiryRow = {
  id: string;
  body: string;
  session_id: string | null;
  created_at: string;
  last_activated_at: string | null;
};

export function toScheduleItem(row: ScheduleRow): ScheduleItem {
  return {
    id: row.id,
    sessionId: row.session_id,
    title: row.title,
    question: row.question,
    startsAt: row.starts_at,
    sortOrder: row.sort_order,
  };
}

export function toLiveInquiry(row: InquiryRow): LiveInquiry {
  return {
    id: row.id,
    body: row.body,
    sessionId: row.session_id,
    createdAt: row.created_at,
    lastActivatedAt: row.last_activated_at,
  };
}

/** Clock-based "Now" schedule block across both festival days (same rule as the TV strip). */
export function activeScheduleItem(state: FestivalState, nowMs = Date.now()): ScheduleItem | null {
  return nowAndNext(timedItems(state.schedule), nowMs).now;
}

export function activeLiveInquiry(state: FestivalState): LiveInquiry | null {
  const id = state.appState.activeLiveInquiryId;
  return state.inquiries.find((item) => item.id === id) ?? null;
}

/** Tables whose changes should trigger a re-read of the festival state. */
export const FESTIVAL_TABLES = ["app_state", "sessions", "schedule_items", "live_inquiries"];

/** One round trip for everything the screens need (all tiny tables). */
export async function fetchFestivalState(supabase: SupabaseClient): Promise<FestivalState> {
  const [app, sessions, schedule, inquiries] = await Promise.all([
    supabase.from("app_state").select(APP_STATE_COLUMNS).maybeSingle(),
    supabase.from("sessions").select("id, slug, title, date").order("date"),
    supabase
      .from("schedule_items")
      .select("id, session_id, title, question, starts_at, sort_order")
      .order("sort_order"),
    supabase
      .from("live_inquiries")
      .select("id, body, session_id, created_at, last_activated_at")
      .order("created_at", { ascending: false }),
  ]);
  const error = app.error ?? sessions.error ?? schedule.error ?? inquiries.error;
  if (error) throw new Error(error.message);
  return {
    appState: toAppState(app.data as AppStateRow | null),
    sessions: (sessions.data ?? []) as FestivalSession[],
    schedule: ((schedule.data ?? []) as ScheduleRow[]).map(toScheduleItem),
    inquiries: ((inquiries.data ?? []) as InquiryRow[]).map(toLiveInquiry),
  };
}
