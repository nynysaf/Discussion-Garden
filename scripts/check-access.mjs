// Verifies RLS + Realtime rules against the configured Supabase project.
// Creates two temporary users (one host, one not), runs checks, deletes them.
// Usage: npm run db:check
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !publishable || !secret) {
  console.error("Missing Supabase values in .env.local");
  process.exit(1);
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, secret, opts);
const suffix = Math.random().toString(36).slice(2, 8);
const password = `check-${crypto.randomUUID()}`;
const hostEmail = `check-host-${suffix}@example.com`;
const guestEmail = `check-guest-${suffix}@example.com`;

let failures = 0;
function check(name, ok, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail && !ok ? ` — ${detail}` : ""}`);
}

async function signedIn(email) {
  const client = createClient(url, publishable, opts);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

function waitFor(predicate, ms = 5000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (predicate()) return resolve(true);
      if (Date.now() - start > ms) return resolve(false);
      setTimeout(tick, 100);
    };
    tick();
  });
}

function subscribe(channel) {
  return new Promise((resolve) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve(true);
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") resolve(false);
    });
  });
}

const created = [];
const { data: original } = await admin.from("app_state").select("*").single();

try {
  for (const email of [hostEmail, guestEmail]) {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    created.push(data.user.id);
  }
  await admin.from("hosts").insert({ email: hostEmail });

  const anon = createClient(url, publishable, opts);
  const guest = await signedIn(guestEmail);
  const host = await signedIn(hostEmail);

  // ── Public reads ──
  const sessions = await anon.from("sessions").select("slug");
  check("visitor can read sessions", !sessions.error && sessions.data.length >= 2, sessions.error?.message);
  const state = await anon.from("app_state").select("audio_status").single();
  check("visitor can read app_state", !state.error, state.error?.message);

  // ── Private / write-protected ──
  await admin.from("transcript_segments").insert({
    bubble_id: `check-${suffix}`, connection_id: "check", speaker: 0, text: "Sample line.", start_ms: 0, end_ms: 1,
  });
  const anonTranscript = await anon.from("transcript_segments").select("id");
  check("visitor cannot read transcripts", Boolean(anonTranscript.error) || anonTranscript.data.length === 0);
  const guestTranscript = await guest.from("transcript_segments").select("id");
  check("non-host cannot read transcripts", Boolean(guestTranscript.error) || guestTranscript.data.length === 0);

  const anonUpdate = await anon.from("app_state").update({ garden_hidden: true }).eq("id", true).select();
  check("visitor cannot change app_state", Boolean(anonUpdate.error) || anonUpdate.data.length === 0);
  const guestUpdate = await guest.from("app_state").update({ garden_hidden: true }).eq("id", true).select();
  check("non-host cannot change app_state", Boolean(guestUpdate.error) || guestUpdate.data.length === 0);
  const anonNode = await anon.from("garden_nodes").insert({ tier: "seed", label: "x", status: "published" });
  check("visitor cannot plant garden nodes", Boolean(anonNode.error));

  // ── Host powers ──
  const isHost = await host.rpc("is_host");
  check("is_host() is true for a host", isHost.data === true, isHost.error?.message);
  const guestIsHost = await guest.rpc("is_host");
  check("is_host() is false for a non-host", guestIsHost.data === false, guestIsHost.error?.message);
  const hostTranscript = await host.from("transcript_segments").select("id").eq("bubble_id", `check-${suffix}`);
  check("host can read transcripts", !hostTranscript.error && hostTranscript.data.length === 1, hostTranscript.error?.message);
  const hostInsert = await host.from("transcript_segments").upsert(
    { bubble_id: `check-${suffix}`, connection_id: "check", speaker: 0, text: "Dup.", start_ms: 0, end_ms: 1 },
    { onConflict: "bubble_id", ignoreDuplicates: true },
  );
  check("host re-saving a bubble is a harmless no-op", !hostInsert.error, hostInsert.error?.message);

  // ── Realtime: app_state row changes reach visitors ──
  const seen = [];
  const watch = anon
    .channel(`check-watch-${suffix}`)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "app_state" }, (p) => seen.push(p.new));
  check("visitor subscribes to app_state changes", await subscribe(watch));
  const hostUpdate = await host.from("app_state").update({ garden_hidden: !original.garden_hidden }).eq("id", true).select();
  check("host can change app_state", !hostUpdate.error && hostUpdate.data.length === 1, hostUpdate.error?.message);
  check("visitor receives the app_state change", await waitFor(() => seen.length > 0));

  // ── Realtime: private caption broadcast ──
  const received = [];
  const listener = anon
    .channel("captions", { config: { private: true } })
    .on("broadcast", { event: "message" }, ({ payload }) => received.push(payload));
  check("visitor can listen on captions", await subscribe(listener));

  const sender = host.channel("captions", { config: { private: true } });
  check("host joins captions", await subscribe(sender));
  await sender.send({ type: "broadcast", event: "message", payload: { from: "host" } });
  check("host broadcast reaches visitors", await waitFor(() => received.some((m) => m.from === "host")));

  const hostHears = [];
  const hostListen = host
    .channel("captions-hello", { config: { private: true } })
    .on("broadcast", { event: "message" }, ({ payload }) => hostHears.push(payload));
  await subscribe(hostListen);
  const intruder = guest.channel("captions", { config: { private: true } });
  await subscribe(intruder);
  await intruder.send({ type: "broadcast", event: "message", payload: { from: "intruder" } });
  const leaked = await waitFor(() => received.some((m) => m.from === "intruder"), 2500);
  check("non-host broadcast does NOT reach TVs", !leaked);

  const helloer = anon.channel("captions-hello", { config: { private: true } });
  await subscribe(helloer);
  await helloer.send({ type: "broadcast", event: "message", payload: { type: "hello" } });
  check("visitor hello reaches host", await waitFor(() => hostHears.some((m) => m.type === "hello")));

  for (const c of [anon, guest, host]) await c.removeAllChannels();
} catch (error) {
  failures++;
  console.error("ERROR", error.message ?? error);
} finally {
  if (original) {
    const { id, updated_at, ...rest } = original;
    void id;
    void updated_at;
    await admin.from("app_state").update(rest).eq("id", true);
  }
  await admin.from("transcript_segments").delete().eq("bubble_id", `check-${suffix}`);
  await admin.from("hosts").delete().eq("email", hostEmail);
  for (const id of created) await admin.auth.admin.deleteUser(id);
}

console.log(failures === 0 ? "\nAll access checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
