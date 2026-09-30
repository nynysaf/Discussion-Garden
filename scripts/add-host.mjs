// Create (or reset the password of) a host account and add it to the allowlist.
// Usage: npm run host:add -- someone@example.com "a long password"
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local.
import { createClient } from "@supabase/supabase-js";

const [emailArg, password] = process.argv.slice(2);
const email = emailArg?.trim().toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!email || !password || password.length < 8) {
  console.error('Usage: npm run host:add -- email@example.com "password (8+ chars)"');
  process.exit(1);
}
if (!url || !secret) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUser(target) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === target);
    if (match || data.users.length < 200) return match ?? null;
  }
  return null;
}

const existing = await findUser(email);
if (existing) {
  const { error } = await supabase.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
  });
  if (error) throw error;
  console.log(`Updated password for ${email}`);
} else {
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  console.log(`Created account ${email}`);
}

const { error: hostError } = await supabase.from("hosts").upsert({ email });
if (hostError) throw hostError;
console.log(`${email} is on the host list.`);
