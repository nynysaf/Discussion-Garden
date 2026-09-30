import { createClient } from "@/lib/supabase/client";
import type { CaptionChannel } from "./channel";
import { createSupabaseCaptionChannel } from "./supabase-channel";

let shared: CaptionChannel | null = null;

/** The tab's one caption channel (browser only). */
export function getCaptionChannel(): CaptionChannel {
  shared ??= createSupabaseCaptionChannel(createClient());
  return shared;
}
