import {
  cleanRotation,
  isCaptionsView,
  CAPTIONS_VIEWS,
  type CaptionsView,
  type ViewSettings,
} from "@/lib/captions/layout";
import { clampFontScale, FONT_SCALE_DEFAULT } from "@/lib/captions/font-scale";
import { isCaptionsFooter, type CaptionsFooter } from "@/lib/captions/footer";
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
  submissionsOpen: boolean;
  captionsLayout: CaptionsView;
  captionsRotation: CaptionsView[];
  captionsRotateSeconds: number | null;
  captionsRotateSince: string | null;
  /** Caption size on /captions as percent of default (75–175). */
  captionsFontScale: number;
  /** Bottom banner on Both/Captions: schedule strip or live inquiry + QR. */
  captionsFooter: CaptionsFooter;
};

export type AppStateRow = {
  active_session_id: string | null;
  active_schedule_item_id: string | null;
  synthesis_mode: string;
  audio_status: string;
  garden_hidden: boolean;
  speaker_colours_on: boolean;
  highlighted_submission_id: string | null;
  submissions_open: boolean;
  captions_layout: string;
  captions_rotation: string[];
  captions_rotate_seconds: number | null;
  captions_rotate_since: string | null;
  captions_font_scale?: number;
  captions_footer?: string;
};

export const APP_STATE_COLUMNS =
  "active_session_id, active_schedule_item_id, synthesis_mode, audio_status, garden_hidden, speaker_colours_on, highlighted_submission_id, submissions_open, captions_layout, captions_rotation, captions_rotate_seconds, captions_rotate_since, captions_font_scale, captions_footer";

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
  submissionsOpen: true,
  captionsLayout: "both",
  captionsRotation: CAPTIONS_VIEWS,
  captionsRotateSeconds: null,
  captionsRotateSince: null,
  captionsFontScale: FONT_SCALE_DEFAULT,
  captionsFooter: "schedule",
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
    submissionsOpen: row.submissions_open !== false,
    captionsLayout: isCaptionsView(row.captions_layout) ? row.captions_layout : "both",
    captionsRotation: Array.isArray(row.captions_rotation)
      ? cleanRotation(row.captions_rotation)
      : CAPTIONS_VIEWS,
    captionsRotateSeconds:
      typeof row.captions_rotate_seconds === "number" ? row.captions_rotate_seconds : null,
    captionsRotateSince: row.captions_rotate_since ?? null,
    captionsFontScale:
      typeof row.captions_font_scale === "number"
        ? clampFontScale(row.captions_font_scale)
        : FONT_SCALE_DEFAULT,
    captionsFooter: isCaptionsFooter(row.captions_footer) ? row.captions_footer : "schedule",
  };
}

export function captionsViewSettings(state: AppState): ViewSettings {
  return {
    selected: state.captionsLayout,
    rotation: state.captionsRotation,
    rotateSeconds: state.captionsRotateSeconds,
    rotateSince: state.captionsRotateSince,
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
  submissionsOpen: "submissions_open",
  captionsLayout: "captions_layout",
  captionsRotation: "captions_rotation",
  captionsRotateSeconds: "captions_rotate_seconds",
  captionsRotateSince: "captions_rotate_since",
  captionsFontScale: "captions_font_scale",
  captionsFooter: "captions_footer",
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
