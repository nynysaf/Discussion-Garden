import type { AudioStatus } from "@/lib/captions/types";

export type SynthesisMode = "manual" | "hybrid" | "auto";

export type AppState = {
  activeSessionId: string | null;
  activeScheduleItemId: string | null;
  synthesisMode: SynthesisMode;
  audioStatus: AudioStatus;
  gardenHidden: boolean;
  speakerColoursOn: boolean;
  highlightedSubmissionId: string | null;
};

export type AppStateRow = {
  active_session_id: string | null;
  active_schedule_item_id: string | null;
  synthesis_mode: string;
  audio_status: string;
  garden_hidden: boolean;
  speaker_colours_on: boolean;
  highlighted_submission_id: string | null;
};

export const APP_STATE_COLUMNS =
  "active_session_id, active_schedule_item_id, synthesis_mode, audio_status, garden_hidden, speaker_colours_on, highlighted_submission_id";

const AUDIO_STATUSES: AudioStatus[] = [
  "idle",
  "connecting",
  "live",
  "reconnecting",
  "paused",
  "error",
];
const SYNTHESIS_MODES: SynthesisMode[] = ["manual", "hybrid", "auto"];

export const DEFAULT_APP_STATE: AppState = {
  activeSessionId: null,
  activeScheduleItemId: null,
  synthesisMode: "manual",
  audioStatus: "idle",
  gardenHidden: false,
  speakerColoursOn: true,
  highlightedSubmissionId: null,
};

/** Database row → app shape, with safe defaults for anything unexpected. */
export function toAppState(row: Partial<AppStateRow> | null | undefined): AppState {
  if (!row) return DEFAULT_APP_STATE;
  return {
    activeSessionId: row.active_session_id ?? null,
    activeScheduleItemId: row.active_schedule_item_id ?? null,
    synthesisMode: SYNTHESIS_MODES.includes(row.synthesis_mode as SynthesisMode)
      ? (row.synthesis_mode as SynthesisMode)
      : "manual",
    audioStatus: AUDIO_STATUSES.includes(row.audio_status as AudioStatus)
      ? (row.audio_status as AudioStatus)
      : "idle",
    gardenHidden: row.garden_hidden === true,
    speakerColoursOn: row.speaker_colours_on !== false,
    highlightedSubmissionId: row.highlighted_submission_id ?? null,
  };
}

const COLUMN_FOR: Record<keyof AppState, keyof AppStateRow> = {
  activeSessionId: "active_session_id",
  activeScheduleItemId: "active_schedule_item_id",
  synthesisMode: "synthesis_mode",
  audioStatus: "audio_status",
  gardenHidden: "garden_hidden",
  speakerColoursOn: "speaker_colours_on",
  highlightedSubmissionId: "highlighted_submission_id",
};

/** App-shaped change → database columns (only the keys provided). */
export function toAppStatePatch(patch: Partial<AppState>): Partial<AppStateRow> {
  const row: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    const column = COLUMN_FOR[key as keyof AppState];
    if (column && value !== undefined) row[column] = value;
  }
  return row as Partial<AppStateRow>;
}
