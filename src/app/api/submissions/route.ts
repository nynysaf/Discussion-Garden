import { createHash, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  checkRateLimit,
  DEVICE_RULES,
  FLOOD_RULES,
  lookbackMs,
} from "@/lib/submissions/rate-limit";
import { SUBMISSIONS_CLOSED_MESSAGE } from "@/lib/submissions/limits";
import { validateSubmission } from "@/lib/submissions/validate";

const DEVICE_COOKIE = "dg_device";
const MAX_REQUEST_CHARS = 5_000;

function reply(status: number, body: object, headers: Record<string, string> = {}) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

function tooFast(retryAfterSec: number, message: string) {
  return reply(429, { error: message, retryAfterSec }, { "Retry-After": String(retryAfterSec) });
}

export async function POST(request: Request) {
  let input: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_REQUEST_CHARS) {
      return reply(413, { error: "That's too long to send." });
    }
    input = JSON.parse(raw);
  } catch {
    return reply(400, { error: "Something went wrong. Please try again." });
  }

  const checked = validateSubmission(input);
  if (!checked.ok) {
    return reply(checked.reason === "profanity" ? 422 : 400, { error: checked.message });
  }

  // A random, anonymous id per phone. Venue Wi-Fi puts every phone behind one
  // IP address, so limiting by IP would block the whole room at once.
  const cookieStore = await cookies();
  let deviceId = cookieStore.get(DEVICE_COOKIE)?.value;
  if (!deviceId || deviceId.length > 64) {
    deviceId = randomUUID();
    cookieStore.set(DEVICE_COOKIE, deviceId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }
  const deviceHash = createHash("sha256").update(deviceId).digest("hex");

  try {
    const supabase = createAdminClient();
    const now = Date.now();
    const since = (rules: typeof DEVICE_RULES) =>
      new Date(now - lookbackMs(rules)).toISOString();

    const [mine, everyone, state] = await Promise.all([
      supabase
        .from("audience_submissions")
        .select("created_at")
        .eq("device_hash", deviceHash)
        .gte("created_at", since(DEVICE_RULES)),
      supabase
        .from("audience_submissions")
        .select("created_at")
        .gte("created_at", since(FLOOD_RULES))
        .limit(FLOOD_RULES[0].max + 1),
      supabase
        .from("app_state")
        .select("active_session_id, submissions_open")
        .limit(1)
        .maybeSingle(),
    ]);
    if (mine.error) throw mine.error;
    if (everyone.error) throw everyone.error;
    if (state.error) throw state.error;

    if (state.data?.submissions_open === false) {
      return reply(403, { error: SUBMISSIONS_CLOSED_MESSAGE, closed: true });
    }

    const times = (rows: { created_at: string }[]) => rows.map((r) => Date.parse(r.created_at));

    const device = checkRateLimit(times(mine.data), now, DEVICE_RULES);
    if (!device.allowed) {
      return tooFast(
        device.retryAfterSec,
        `You're sending quickly — please wait ${formatWait(device.retryAfterSec)} and try again.`,
      );
    }
    const flood = checkRateLimit(times(everyone.data), now, FLOOD_RULES);
    if (!flood.allowed) {
      return tooFast(flood.retryAfterSec, "Lots of messages right now — please try again in a minute.");
    }

    const { error } = await supabase.from("audience_submissions").insert({
      body: checked.value.body,
      name_tag: checked.value.nameTag,
      status: "approved",
      session_id: state.data?.active_session_id ?? null,
      device_hash: deviceHash,
    });
    if (error) throw error;

    return reply(201, { ok: true });
  } catch (error) {
    console.error("[submissions]", error);
    return reply(500, { error: "Couldn't send right now. Please try again in a moment." });
  }
}

function formatWait(seconds: number): string {
  if (seconds < 60) return seconds === 1 ? "a second" : `${seconds} seconds`;
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? "a minute" : `${minutes} minutes`;
}
