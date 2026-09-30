import type { AudioStatus, CaptionBubble } from "./types";

export type CaptionStatus = {
  audioStatus: AudioStatus;
  speakerColoursOn: boolean;
};

/** Everything the host laptop tells the display screens about captions. */
export type CaptionMessage =
  | { type: "bubbles"; completed: CaptionBubble[]; live: CaptionBubble[] }
  | { type: "status"; status: CaptionStatus }
  /** Sent by a display that just opened, asking the host for a snapshot. */
  | { type: "hello" }
  | {
      type: "snapshot";
      recent: CaptionBubble[];
      live: CaptionBubble[];
      status: CaptionStatus;
    };

export type Connection = "connecting" | "live" | "reconnecting";

/** Transport between the host laptop and display screens. */
export interface CaptionChannel {
  send(message: CaptionMessage): void;
  subscribe(handler: (message: CaptionMessage) => void): () => void;
  /** Called immediately with the current state, then on every change. */
  onConnection(handler: (connection: Connection) => void): () => void;
}
