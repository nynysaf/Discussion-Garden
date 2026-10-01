import type { SupabaseClient } from "@supabase/supabase-js";
import type { Connection } from "@/lib/captions/channel";
import { uniqueId } from "@/lib/unique-id";

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
  let channel = supabase.channel(`watch-${tables.join("-")}-${uniqueId()}`);
  for (const table of tables) {
    channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, onChange);
  }
  // Hosted Realtime confirms the database subscription shortly after SUBSCRIBED;
  // refetch then too so a change made in that gap isn't missed.
  channel = channel.on("system", {}, (payload: { extension?: string; status?: string }) => {
    if (payload.extension === "postgres_changes" && payload.status === "ok") onChange();
  });
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
