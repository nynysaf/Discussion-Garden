// Add (or clear) made-up sample talk in the LOCAL transcript, for testing the garden AI without a mic.
// Usage: npm run transcript:demo -- 1      (first stretch of talk)
//        npm run transcript:demo -- 2      (a later stretch that revisits some ideas)
//        npm run transcript:demo -- clear  (remove all sample talk)
// Sample rows use connection_id "demo". Refuses to run against hosted Supabase.
import { createClient } from "@supabase/supabase-js";

const arg = process.argv[2] ?? "1";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const secret = process.env.SUPABASE_SECRET_KEY;
const CONNECTION = "demo";

if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url) || !secret) {
  console.error("transcript:demo only runs against local Supabase (127.0.0.1) with SUPABASE_SECRET_KEY set.");
  process.exit(1);
}

const supabase = createClient(url, secret, { auth: { persistSession: false } });

const TALK = {
  1: [
    "I want to start with something small that happened on my street last spring.",
    "A few of us set up a tool library in an old shed behind the community centre.",
    "Nobody on our block needs to own a ladder or a power drill anymore.",
    "People borrow a drill, and then they end up staying to chat for half an hour.",
    "That's the part I didn't expect, the tools are really an excuse to meet each other.",
    "We have something similar, a seed swap at the library every March.",
    "Folks bring seeds saved from their own gardens and leave with something new to try.",
    "It feels like the same idea to me, lending and sharing instead of everyone buying.",
    "And it keeps money in the neighbourhood instead of sending it to big box stores.",
    "Which connects to what was said earlier about local currency.",
    "If the tool library and the seed swap accepted a local currency, the value would circulate right here.",
    "The question is who looks after these things when the first volunteers get tired.",
  ],
  2: [
    "Coming back to the money question for a minute.",
    "The market near the bus loop started taking a neighbourhood currency this summer.",
    "Vendors said customers spend it locally because they can't use it anywhere else.",
    "So local currency really does keep wealth in the community, at least at that market.",
    "On the volunteer point, our community garden pays a small stipend to two caretakers.",
    "Since then the garden has stayed open every weekend, even through the heat wave.",
    "Shared spaces seem to last when somebody is clearly responsible for looking after them.",
    "The tool library could do the same, a rotating caretaker with a little support.",
    "Maybe a small grant from the city could cover that.",
    "I love that, small amounts of money making these commons last.",
  ],
};

async function clear() {
  const { data, error } = await supabase.from("transcript_segments").delete().eq("connection_id", CONNECTION).select("id");
  if (error) throw error;
  console.log(`Removed ${data.length} sample sentences.`);
}

async function add(part) {
  const lines = TALK[part];
  const { data: state } = await supabase.from("app_state").select("active_session_id").maybeSingle();
  const now = Date.now();
  const rows = lines.map((text, i) => {
    const startMs = i * 6000;
    return {
      bubble_id: `${CONNECTION}:${now}:${i}`,
      session_id: state?.active_session_id ?? null,
      connection_id: CONNECTION,
      speaker: i % 3,
      text,
      start_ms: startMs,
      end_ms: startMs + 5000,
      created_at: new Date(now - (lines.length - i) * 1000).toISOString(),
    };
  });
  const { error } = await supabase.from("transcript_segments").insert(rows);
  if (error) throw error;
  console.log(`Added ${rows.length} sample sentences (part ${part}).`);
}

if (arg === "clear") await clear();
else if (TALK[arg]) await add(arg);
else {
  console.error("Usage: npm run transcript:demo -- <1 | 2 | clear>");
  process.exit(1);
}
