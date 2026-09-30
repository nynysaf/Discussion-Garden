import type { CaptionMessage, CaptionStatus } from "./channel";
import type { CaptionBubble } from "./types";

export const MAX_RECENT_BUBBLES = 40;

export type CaptionFeed = {
  recent: CaptionBubble[];
  live: CaptionBubble[];
  status: CaptionStatus;
};

export const INITIAL_FEED: CaptionFeed = {
  recent: [],
  live: [],
  status: { audioStatus: "idle", speakerColoursOn: true },
};

export function appendRecent(
  recent: CaptionBubble[],
  completed: CaptionBubble[],
  max: number = MAX_RECENT_BUBBLES,
): CaptionBubble[] {
  if (completed.length === 0) return recent;
  const seen = new Set(recent.map((b) => b.id));
  const merged = [...recent, ...completed.filter((b) => !seen.has(b.id))];
  return merged.slice(-max);
}

/** Pure reducer shared by the admin preview and every display screen. */
export function feedReducer(
  feed: CaptionFeed,
  message: CaptionMessage,
): CaptionFeed {
  switch (message.type) {
    case "bubbles":
      return {
        ...feed,
        recent: appendRecent(feed.recent, message.completed),
        live: message.live,
      };
    case "status":
      return { ...feed, status: message.status };
    case "snapshot":
      return {
        recent: message.recent.slice(-MAX_RECENT_BUBBLES),
        live: message.live,
        status: message.status,
      };
    case "hello":
      return feed;
  }
}

/**
 * Speaker numbers heard on the newest connection, in order of first
 * appearance. Earlier connections are ignored because numbering restarts.
 */
export function voicesHeard(feed: CaptionFeed): number[] {
  const all = [...feed.recent, ...feed.live];
  const connectionId = all.at(-1)?.connectionId;
  const speakers: number[] = [];
  for (const bubble of all) {
    if (bubble.connectionId !== connectionId) continue;
    if (!speakers.includes(bubble.speaker)) speakers.push(bubble.speaker);
  }
  return speakers;
}

/** Bubbles to draw, oldest first, newest (in-progress) last. */
export function visibleBubbles(
  feed: CaptionFeed,
  limit: number,
): CaptionBubble[] {
  return [...feed.recent, ...feed.live].slice(-limit);
}
