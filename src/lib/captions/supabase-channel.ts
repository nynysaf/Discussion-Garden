import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { CaptionChannel, CaptionMessage, Connection } from "./channel";

/** Only hosts may send here (RLS on realtime.messages); everyone may listen. */
export const CAPTIONS_TOPIC = "captions";
/** Displays ask the host for a snapshot here after (re)connecting. */
export const HELLO_TOPIC = "captions-hello";
const EVENT = "message";

type SubscribeStatus = "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR";

export function connectionFor(status: SubscribeStatus): Connection {
  return status === "SUBSCRIBED" ? "live" : "reconnecting";
}

/**
 * Supabase Realtime broadcast transport. Lives for the whole tab — React
 * components add and remove listeners instead of opening new channels.
 */
export function createSupabaseCaptionChannel(supabase: SupabaseClient): CaptionChannel {
  const handlers = new Set<(message: CaptionMessage) => void>();
  const connectionHandlers = new Set<(connection: Connection) => void>();
  const states: Record<string, Connection> = {
    [CAPTIONS_TOPIC]: "connecting",
    [HELLO_TOPIC]: "connecting",
  };
  let connection: Connection = "connecting";

  const updateConnection = () => {
    const values = Object.values(states);
    const next: Connection = values.every((s) => s === "live")
      ? "live"
      : values.includes("reconnecting")
        ? "reconnecting"
        : "connecting";
    if (next === connection) return;
    connection = next;
    connectionHandlers.forEach((h) => h(next));
  };

  const join = (topic: string): RealtimeChannel =>
    supabase
      .channel(topic, { config: { private: true, broadcast: { self: false } } })
      .on("broadcast", { event: EVENT }, ({ payload }) => {
        handlers.forEach((h) => h(payload as CaptionMessage));
      })
      .subscribe((status) => {
        states[topic] = connectionFor(status as SubscribeStatus);
        updateConnection();
      });

  const captions = join(CAPTIONS_TOPIC);
  const hello = join(HELLO_TOPIC);

  return {
    send(message) {
      const channel = message.type === "hello" ? hello : captions;
      void channel
        .send({ type: "broadcast", event: EVENT, payload: message })
        .catch(() => undefined);
    },
    subscribe(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    onConnection(handler) {
      connectionHandlers.add(handler);
      handler(connection);
      return () => connectionHandlers.delete(handler);
    },
  };
}
