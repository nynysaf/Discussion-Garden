import type { SupabaseClient } from "@supabase/supabase-js";
import type { Connection } from "@/lib/captions/channel";

/**
 * Calls `onChange` whenever a row in any of `tables` changes, and again every
 * time the subscription (re)connects — so a screen that lost Wi-Fi catches up.
 */
export function watchTables(
  supabase: SupabaseClient,
  tables: string[],
  onChange: () => void,
  onConnection: (connection: Connection) => void,
): () => void {
  // Unique topic: supabase-js reuses channels with the same name.
  let channel = supabase.channel(`watch-${tables.join("-")}-${crypto.randomUUID()}`);
  for (const table of tables) {
    channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, onChange);
  }
  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      onConnection("live");
      onChange();
    } else {
      onConnection("reconnecting");
    }
  });
  return () => {
    void supabase.removeChannel(channel);
  };
}
