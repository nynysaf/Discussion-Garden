// Run one of our scripts against the HOSTED Supabase project instead of local.
// Usage: npm run hosted -- scripts/check-access.mjs
//        npm run hosted -- scripts/add-host.mjs someone@example.com
// Reads the hosted URL + publishable/secret keys with SUPABASE_ACCESS_TOKEN (Management API)
// and passes them to the child process only — they are never printed.
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const [script, ...rest] = process.argv.slice(2);
const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref =
  process.env.SUPABASE_PROJECT_REF ||
  (await readFile("supabase/.temp/project-ref", "utf8").catch(() => "")).trim();

if (!script) {
  console.error("Usage: npm run hosted -- scripts/<script>.mjs [args...]");
  process.exit(1);
}
if (!token || !ref) {
  console.error("Missing SUPABASE_ACCESS_TOKEN in .env.local or no linked project.");
  process.exit(1);
}

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys?reveal=true`, {
  headers: { Authorization: `Bearer ${token}` },
});
if (!res.ok) {
  console.error(`Couldn't read hosted keys (HTTP ${res.status}). Is the project paused?`);
  process.exit(1);
}
const keys = await res.json();
const publishable = keys.find((k) => k.type === "publishable")?.api_key;
const secret = keys.find((k) => k.type === "secret")?.api_key;
if (!publishable || !secret) {
  console.error("Hosted project has no publishable/secret key (it may still be waking up).");
  process.exit(1);
}

const child = spawnSync(process.execPath, [script, ...rest], {
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: publishable,
    SUPABASE_SECRET_KEY: secret,
  },
});
process.exit(child.status ?? 1);
