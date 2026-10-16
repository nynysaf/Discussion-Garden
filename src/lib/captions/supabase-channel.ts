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
 *
 * Joins only after `getSession()` resolves so a logged-in host is authorized
 * as a host (not anon). Anon can listen but not send on `captions`; joining
 * too early dropped every bubble while the admin preview still worked locally.
 */
export function createSupabaseCaptionChannel(supabase: SupabaseClient): CaptionChannel {
  const handlers = new Set<(message: CaptionMessage) => void>();
  const connectionHandlers = new Set<(connection: Connection) => void>();
  const sendErrorHandlers = new Set<(detail: string) => void>();
  const states: Record<string, Connection> = {
    [CAPTIONS_TOPIC]: "connecting",
    [HELLO_TOPIC]: "connecting",
  };
  let connection: Connection = "connecting";
  let captions: RealtimeChannel | null = null;
  let hello: RealtimeChannel | null = null;

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

  const ready = (async () => {
    // Wait for cookie session hydration before joining private channels.
    // Without this, a host tab can join as anon: Preview still works (local),
    // but every bubble send is dropped by RLS and /captions stays on "Listening…".
    const { data } = await supabase.auth.getSession();
    await supabase.realtime.setAuth(data.session?.access_token ?? null);
    captions = join(CAPTIONS_TOPIC);
    hello = join(HELLO_TOPIC);
  })();

  const reportSendError = (detail: string) => {
    sendErrorHandlers.forEach((h) => h(detail));
  };

  return {
    send(message) {
      void ready
        .then(async () => {
          const channel = message.type === "hello" ? hello : captions;
          if (!channel) throw new Error("Caption channel not ready");
          if (channel.state === "joined") {
            const result = await channel.send({
              type: "broadcast",
              event: EVENT,
              payload: message,
            });
            if (result !== "ok") {
              throw new Error(`Caption broadcast failed (${result})`);
            }
          } else {
            const result = await channel.httpSend(EVENT, message);
            if (!("success" in result) || !result.success) {
              throw new Error("Caption broadcast failed (REST)");
            }
          }
        })
        .catch((error: unknown) => {
          reportSendError(
            error instanceof Error ? error.message : "Caption broadcast failed",
          );
        });
    },
    subscribe(handler) {
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
      };
    },
    onConnection(handler) {
      connectionHandlers.add(handler);
      handler(connection);
      return () => {
        connectionHandlers.delete(handler);
      };
    },
    onSendError(handler) {
      sendErrorHandlers.add(handler);
      return () => {
        sendErrorHandlers.delete(handler);
      };
    },
  };
}
