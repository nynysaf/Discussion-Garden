// Snapshot published garden nodes/vines for the public archive.
// Usage:
//   npm run hosted -- scripts/archive/export-garden.mjs
//   node --env-file=.env.local scripts/archive/export-garden.mjs   (local DB)
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outPath = join(root, "src/data/archive/garden-snapshot.json");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and a Supabase key.");
  process.exit(1);
}

const supabase = createClient(url, key);

const [nodes, vines] = await Promise.all([
  supabase
    .from("garden_nodes")
    .select("id, tier, label, weight, origin_session_id, created_at, updated_at, description")
    .eq("status", "published")
    .order("created_at")
    .limit(1000),
  supabase
    .from("garden_vines")
    .select("id, source_node_id, target_node_id, kind")
    .eq("status", "published")
    .limit(3000),
]);

const error = nodes.error ?? vines.error;
if (error) {
  console.error(error.message);
  process.exit(1);
}

const gardenNodes = (nodes.data ?? []).map((row) => ({
  id: row.id,
  tier: row.tier,
  label: row.label,
  weight: row.weight,
  originSessionId: row.origin_session_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  description: row.description ?? "",
}));

const ids = new Set(gardenNodes.map((n) => n.id));
const gardenVines = (vines.data ?? [])
  .map((row) => ({
    id: row.id,
    sourceId: row.source_node_id,
    targetId: row.target_node_id,
    kind: row.kind,
  }))
  .filter((v) => ids.has(v.sourceId) && ids.has(v.targetId));

const snapshot = {
  exportedAt: new Date().toISOString(),
  nodes: gardenNodes,
  vines: gardenVines,
};

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
console.log(`Wrote ${gardenNodes.length} nodes, ${gardenVines.length} vines → ${outPath}`);
