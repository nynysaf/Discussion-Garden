// Plant (or clear) a made-up demo garden in the LOCAL database, for testing the canvas.
// Usage: npm run garden:demo -- 15     (≈15 nodes)
//        npm run garden:demo -- 150    (a full two-day garden)
//        npm run garden:demo -- clear  (remove demo nodes; real nodes untouched)
// Demo nodes are marked with description "[demo]". Refuses to run against hosted Supabase.
import { createClient } from "@supabase/supabase-js";

const arg = process.argv[2] ?? "15";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const secret = process.env.SUPABASE_SECRET_KEY;
const MARK = "[demo]";

if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url) || !secret) {
  console.error("garden:demo only runs against local Supabase (127.0.0.1) with SUPABASE_SECRET_KEY set.");
  process.exit(1);
}

const supabase = createClient(url, secret, { auth: { persistSession: false } });

async function clear() {
  const { data, error } = await supabase.from("garden_nodes").delete().eq("description", MARK).select("id");
  if (error) throw error;
  console.log(`Removed ${data.length} demo nodes (their vines go with them).`);
}

const THEMES = [
  "Neighbours as infrastructure",
  "Slow, walkable streets",
  "Young people shape the plan",
  "Shared spaces need caretakers",
  "Repair over replace",
  "Belonging starts small",
];
const SPROUTS = [
  "Lending beats buying", "Know your block", "Kids walk to school", "Shade and places to rest",
  "Youth council with real budget", "Meetings at kid-friendly times", "Who maintains it?",
  "Volunteers burn out", "Fix-it skills are fading", "Libraries as commons",
  "Food brings people together", "Welcome newcomers early", "Quiet streets feel safer",
  "Gardens double as classrooms", "Local makers, local jobs", "Trust takes repetition",
  "Small grants, big ripples", "Elders hold the stories", "Empty lots as possibility",
  "Night-time public life", "Bikes need safe routes", "Rituals mark the seasons",
  "Free indoor space matters", "Ask before you build",
];
const SEED_A = [
  "Tool library on", "Soup night at", "Seed swap by", "Bike repair near", "Story circle in",
  "Pop-up market on", "Mural project at", "Tree planting on", "Book exchange by", "Repair café at",
];
const SEED_B = [
  "Elm Street", "the old firehall", "Riverside park", "the school yard", "Main and 5th",
  "the community centre", "the corner store", "the bus loop", "the rail trail", "the library steps",
  "the empty lot", "Harbour Road",
];

function plan(target) {
  const themes = Math.max(1, Math.round(target / 25));
  const sproutsPerTheme = target >= 100 ? 4 : 2;
  const seedsPerSprout = Math.max(1, Math.round((target - themes - themes * sproutsPerTheme) / (themes * sproutsPerTheme)));
  return { themes, sproutsPerTheme, seedsPerSprout };
}

async function plant(target) {
  const { data: state } = await supabase.from("app_state").select("active_session_id").maybeSingle();
  const session = state?.active_session_id ?? null;
  const { themes, sproutsPerTheme, seedsPerSprout } = plan(target);
  const base = { status: "published", origin: "manual", description: MARK, origin_session_id: session };

  const insert = async (rows) => {
    const { data, error } = await supabase.from("garden_nodes").insert(rows).select("id");
    if (error) throw error;
    return data.map((r) => r.id);
  };

  let seedCount = 0;
  const vines = [];
  const themeIds = await insert(THEMES.slice(0, themes).map((label) => ({ ...base, tier: "theme", label, weight: 1 })));
  for (let t = 0; t < themeIds.length; t++) {
    const labels = SPROUTS.slice(t * sproutsPerTheme, (t + 1) * sproutsPerTheme);
    const sproutIds = await insert(labels.map((label, i) => ({ ...base, tier: "sprout", label, weight: 1 + ((t + i) % 4) })));
    for (const sproutId of sproutIds) {
      vines.push({ source_node_id: sproutId, target_node_id: themeIds[t], kind: "grows_into" });
      const seeds = Array.from({ length: seedsPerSprout }, () => {
        const label = `${SEED_A[seedCount % SEED_A.length]} ${SEED_B[(seedCount * 7) % SEED_B.length]}`;
        seedCount++;
        return { ...base, tier: "seed", label, weight: 1 };
      });
      for (const seedId of await insert(seeds)) {
        vines.push({ source_node_id: seedId, target_node_id: sproutId, kind: "grows_into" });
      }
    }
    if (t > 0) vines.push({ source_node_id: themeIds[t], target_node_id: themeIds[t - 1], kind: "relates_to" });
  }
  const { error } = await supabase
    .from("garden_vines")
    .insert(vines.map((v) => ({ ...v, status: "published", origin: "manual", origin_session_id: session })));
  if (error) throw error;
  console.log(`Planted ${themeIds.length + themeIds.length * sproutsPerTheme + seedCount} demo nodes and ${vines.length} vines.`);
}

if (arg === "clear") {
  await clear();
} else {
  const target = Number(arg);
  if (!Number.isFinite(target) || target < 3 || target > 300) {
    console.error('Usage: npm run garden:demo -- <3..300 | clear>');
    process.exit(1);
  }
  await clear();
  await plant(target);
}
