import type { CaptionChannel, CaptionMessage } from "./channel";

export const LOCAL_CAPTION_CHANNEL = "discussion-garden-captions";

/** Same-browser transport (BroadcastChannel) — for local testing only. */
export function createLocalCaptionChannel(
  name: string = LOCAL_CAPTION_CHANNEL,
): CaptionChannel {
  const channel = new BroadcastChannel(name);
  const handlers = new Set<(message: CaptionMessage) => void>();

  channel.onmessage = (event: MessageEvent<CaptionMessage>) => {
    for (const handler of handlers) handler(event.data);
  };

  return {
    send(message) {
      channel.postMessage(message);
    },
    subscribe(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    close() {
      handlers.clear();
      channel.close();
    },
  };
}
