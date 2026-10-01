// Apply supabase/migrations/*.sql to the hosted project over HTTPS (Management API).
// Use this when `supabase db push` can't reach the database port from your network.
// Usage: npm run db:push:hosted   (apply missing migrations)
// Flags: --seed (also run supabase/seed.sql if no sessions exist), --dry-run
//   PowerShell strips `--`, so pass flags by calling node directly:
//   node --env-file=.env.local scripts/push-hosted.mjs --seed --dry-run
// Needs SUPABASE_ACCESS_TOKEN in .env.local and a linked project (npx supabase link).
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const seed = args.has("--seed");
const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref =
  process.env.SUPABASE_PROJECT_REF ||
  (await readFile("supabase/.temp/project-ref", "utf8").catch(() => "")).trim();

if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN in .env.local");
  process.exit(1);
}
if (!ref) {
  console.error("No linked project. Run: npx supabase link --project-ref <ref>");
  process.exit(1);
}

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return text ? JSON.parse(text) : [];
}

const quote = (value) => `'${value.replaceAll("'", "''")}'`;

await sql(`
  create schema if not exists supabase_migrations;
  create table if not exists supabase_migrations.schema_migrations (
    version text primary key, statements text[], name text
  );
`);

const applied = new Set(
  (await sql("select version from supabase_migrations.schema_migrations")).map((r) => r.version),
);
const files = (await readdir("supabase/migrations")).filter((f) => f.endsWith(".sql")).sort();
const pending = files.filter((f) => !applied.has(f.split("_")[0]));

console.log(`Project ${ref}: ${applied.size} applied, ${pending.length} pending.`);
for (const file of pending) {
  const [version, ...rest] = path.basename(file, ".sql").split("_");
  if (dryRun) {
    console.log(`  would apply ${file}`);
    continue;
  }
  const body = await readFile(path.join("supabase/migrations", file), "utf8");
  await sql(`begin;
${body}
;
insert into supabase_migrations.schema_migrations (version, name)
values (${quote(version)}, ${quote(rest.join("_"))});
commit;`);
  console.log(`  applied ${file}`);
}

if (seed && dryRun && pending.length > 0) {
  console.log("  would run supabase/seed.sql if no sessions exist");
} else if (seed) {
  const [{ count }] = await sql("select count(*)::int as count from public.sessions");
  if (count > 0) {
    console.log(`Seed skipped: ${count} sessions already exist.`);
  } else if (dryRun) {
    console.log("  would run supabase/seed.sql");
  } else {
    await sql(`begin;\n${await readFile("supabase/seed.sql", "utf8")}\n;\ncommit;`);
    console.log("  seeded supabase/seed.sql");
  }
}
