# Discussion Garden — Development & Implementation Plan

**Version:** 0.1  
**Last updated:** 2026-09-30 (caption pipeline + route shells built on a same-browser transport; awaiting mic test)  
**Target tool:** Cursor (AI coding assistant)  
**Tech stack:** Next.js (App Router) · Tailwind CSS v4 · Supabase (Postgres, Auth, Realtime) · Vercel · Deepgram (streaming STT) · OpenAI (synthesis) · `d3-force`  
**Companion docs:** `prd-v0.2.md` (product) · `DESIGN_GUIDE.md` (visual)  
**Reference project:** Camp-CLAI (`C:\Users\narya\OneDrive\Documents\GitHub\Camp-CLAI`) — copy code, don't import it.  
**Festival:** Oct 16–18, 2026 · **live Sat Oct 17 & Sun Oct 18, 11:00–17:00** · rehearsal at venue Fri Oct 16 if possible. No fixed build calendar — work in phase order as time allows.

---

## 0. Handoff — start here

### Colleague / new-agent checklist
1. Pull latest `main`. Never commit `.env.local` or real keys (see `.cursorrules` → Secrets).
2. Copy `.env.example` → `.env.local`; fill values from the team's password manager / Vercel.
3. `npm install` && `npm run dev` → open http://localhost:3000.
4. Read **§4 Progress & Decisions** before writing code.
5. Build **one module at a time** from §5; verify with its test checklist; update §4; commit to `main`.

### Do not break
- **Captions never depend on AI.** Synthesis errors must not stop or slow captions.
- **Displays are read-only.** `/captions` and `/room-feed` never write to the database.
- **Nothing unmoderated on a TV.** Audience text needs host approval; AI nodes need approval in Hybrid.
- **The Deepgram and OpenAI keys stay server-side.** The browser only ever gets a short-lived Deepgram token.
- **Transcripts are private.** `transcript_segments` is host-only under RLS.

---

## 1. Product framing (summary)
- **Upstairs:** live discussion + mic + host laptop (`/admin`) + TV showing the audience feed (`/room-feed`).
- **Downstairs:** overflow room TV with captions + live question + garden + schedule + QR (`/captions`).
- **Phones:** `/audience` — zero-login submissions, moderated.
- **Garden:** seeds (soil) → sprouts (stems) → themes (blooms); vines connect them. Modes: Manual (boot default) · Hybrid (expected) · Auto.
- **Out of scope:** translation, audio storage, audience → garden promotion, CLara integration.

---

## 2. Architecture decisions
| Decision | Choice | Why |
| :--- | :--- | :--- |
| Repo | Standalone, **public** GitHub repo (confirmed 2026-09-30) deployed on Vercel Hobby | Simple deploys; forces good secret hygiene |
| Deepgram plan | **Free $200 credit** (pay-as-you-go tier, no card). Nova-3 English streaming + diarization ≈ $0.41–0.58 per live hour | Whole festival + testing ≈ $15–20 of credit |
| Live STT | Browser → Deepgram WebSocket, using a short-lived token from `/api/deepgram-token` | Vercel functions can't hold long audio sockets; lowest latency; key stays server-side |
| Caption fan-out | Supabase Realtime **broadcast** channel (`captions:{sessionId}`) for interim + final text; only **final** segments saved to `transcript_segments` | Interim words change many times per second — too chatty for DB writes |
| Garden/feed/state sync | Supabase Realtime **Postgres changes** on `garden_nodes`, `garden_vines`, `audience_submissions`, `app_state` | TVs update automatically when rows change; on reconnect, re-fetch |
| AI scheduler | Admin tab calls `/api/synthesis` every ~35s while Live and mode ≠ Manual | No background job service needed for a 2-day event |
| Host auth | Supabase Auth email/password; host emails in an allowlist (env or `hosts` table) | Reuses Camp-CLAI patterns; displays + audience need no login |
| Audience writes | `/api/submissions` server route: length check, profanity check, per-device rate limit, then insert with the secret key | Anonymous inserts shouldn't hit the DB directly |
| Garden layout | `d3-force` + `forceY` per tier (seeds low, themes high) + collide; freeze after settle | Garden-bed shape, calm on TVs |
| Garden scope | One festival-wide garden; `sessions` = days (`day_1`, `day_2`) for transcripts/exports only | Sunday keeps growing Saturday's garden |
| Speaker bubbles | Deepgram diarization on (`diarize_model=latest`); host laptop groups words into bubbles (new bubble on speaker change or sentence end) with a pure helper, then broadcasts bubbles | One place does the grouping, so every TV shows identical bubbles; helper is unit-testable |
| Recording | One continuous Deepgram stream per day; save each final segment as a row; keep-alive during silence; auto-reconnect | No audio files, so nothing to chunk; reconnects are seamless |

---

## 3. Camp-CLAI code map (what to copy)

Copy these files into this repo and adapt them. **Do not** add Camp-CLAI as a dependency.

| Copy from Camp-CLAI | Into Discussion Garden | Adapt |
| :--- | :--- | :--- |
| `src/lib/graph/layout.ts` | `src/lib/garden/layout.ts` | Replace Atom/Concept/Framework/Theme with `seed/sprout/theme`; add `forceY` tier bands; radius from `weight` |
| `src/lib/graph/curves.ts` | `src/lib/garden/curves.ts` | Likely as-is |
| `src/lib/graph/view-transform.ts` | `src/lib/garden/view-transform.ts` | Keep for admin pan/zoom; TVs use fit-to-screen |
| `src/lib/graph/spatial-nav.ts` | `src/lib/garden/spatial-nav.ts` | Admin keyboard nav only |
| `src/lib/graph/node-sprite.ts` (`stableIndex`, `nodeSpriteUrl`) | `src/lib/garden/sprites.ts` | Tier → pool map: seed→`atom`, sprout→`concept`, theme→`theme`; single "plant" theme |
| `public/map-sprites/plant/**` + `manifest.json` (plant part) | `public/garden-sprites/**` | Verify look on cream first (Phase 5) |
| `src/lib/graph/closeness.ts` | *(optional)* | Only if weight-based sizing isn't enough |
| `src/lib/map-theme/noise.ts` + `generate-topo.ts` | *(optional)* `src/lib/garden/paper.ts` | Only for subtle paper/soil texture; skip if short on time |
| `src/lib/listens/screen-wake-lock.ts` | `src/lib/audio/wake-lock.ts` | Keep host laptop awake while Live |
| `src/lib/graph/extract-graph.ts` | `src/lib/synthesis/propose.ts` | Starting shape for the OpenAI JSON call; new prompt per PRD §5.3 |
| `src/lib/supabase/{client,server,admin}.ts` | `src/lib/supabase/` | Same env var names |
| `src/components/KnowledgeMap.tsx` (1,000+ lines) | `src/components/garden/GardenCanvas.tsx` | **Reference only** — rebuild a smaller version (render + animation), don't copy wholesale |

**Skip:** Inngest, embeddings/Ask, streams/isolation, Commons, map theme unlocks, Whisper recording pipeline.

---

## 4. Progress & Decisions (living log)

### Current phase
**Phase 0 — nearly done** (only Vercel left). **Phase 2 (2A + 2B) — built, awaiting manual mic test.** Captions currently travel between tabs of the **same browser** (BroadcastChannel); swap to Supabase Realtime in Phase 1 without touching the UI (`CaptionChannel` interface).

**Next session:** (1) finish the Phase 2 test checklist, (2) start Phase 1 (Supabase) or Phase 3 (schedule) depending on accounts.

### Festival facts (fill in)
- Festival: **Fri Oct 16 – Sun Oct 18, 2026**
- Discussion Garden live: **Sat Oct 17 & Sun Oct 18, 11:00–17:00** (venue-local; assumed Eastern — confirm)
- Session slugs: **`day_1`** (Oct 17) · **`day_2`** (Oct 18) — for transcript/export partitioning only
- Garden: **one shared garden** across both days; never reset between days
- Rehearsal at venue: **Fri Oct 16 (target — confirm access)**
- Daily topic schedule / live questions: **TBD**
- Production URL: **TBD**

### Shipped
- 2026-09-30 — `prd-v0.2.md`, `DESIGN_GUIDE.md`, `dev-plan-v0.1.md`, `.cursorrules`, git repo initialized on `main`.
- 2026-09-30 — Public repo https://github.com/nynysaf/Discussion-Garden connected; Next.js **16.3.8** + React 19.2 + Tailwind v4 scaffolded (`src/` dir, `@/*` alias, npm); `.env.example` (placeholders), README with secrets policy. Deepgram account + key created (key lives only in `.env.local`).
- 2026-09-30 — **Caption pipeline (Phase 2A + 2B code):**
  - `src/lib/deepgram/` — `buildListenUrl` (nova-3, diarize, `mip_opt_out=true`), `parseDeepgramMessage`, server-only `grantDeepgramToken`, client `fetchDeepgramToken`.
  - `src/lib/captions/` — `groupWords` (new bubble on speaker change or sentence end), `BubbleAccumulator` (keeps only the unfinished tail → no memory growth), `voiceFor` (12 animals / 6 colours), `feedReducer` (last 40 bubbles), `CaptionChannel` interface + `createLocalCaptionChannel` (BroadcastChannel), `LiveCaptioner` (mic → MediaRecorder 250ms webm/opus → Deepgram WebSocket; reconnect with 1s→10s backoff and a new `connectionId`).
  - `src/lib/audio/` — level meter, backoff, recorder MIME pick, wake lock (from Camp-CLAI), single-controller Web Lock.
  - `/api/deepgram-token` — **returns 403 in production** until host login exists (protects free credit on the public URL).
  - UI: `/admin` (AudioPanel: mic picker, level meter, Start/Pause/Resume/Stop, speaker-colours toggle, live preview), `/captions` (DESIGN_GUIDE §5.1 layout with garden/QR/schedule placeholders), `/audience` + `/room-feed` placeholders, home hub.
  - 12 Noto Emoji SVGs in `public/voices/` + licence. Vitest set up: `npm test` → 58 tests passing.

- 2026-09-30 — **First live captions working locally** (mic → Deepgram → bubbles on `/admin`). Gotcha: a Deepgram key made with default settings returns `403 Insufficient permissions` from `/v1/auth/grant`; the key must be created with **Advanced → Member** (permission can't be changed afterwards).
- 2026-09-30 — Manual test: second tab, Pause/Resume, colours toggle, `/captions` reload **pass**. **Issue:** in the first real test every voice got the same colour/animal.
  - Diagnosis: streamed a synthetic two-voice clip (Windows TTS, made-up text, deleted afterwards) straight to Deepgram with our exact settings → speakers **were** separated (0/1), with the usual one-sentence lag at each change. So Deepgram + our parsing work; the browser mic path is the suspect.
  - Fix: mic now opens with **browser voice cleanup off** (`echoCancellation` / `noiseSuppression` / `autoGainControl` = false via `micConstraints()`), since that processing makes voices sound alike. Admin toggle "Browser voice cleanup" to turn it back on for a very noisy room.
  - Added **"Voices heard"** row on `/admin` (`voicesHeard(feed)`) — shows one animal per detected speaker on the current connection; use it for the venue mic check.
  - Switched `diarize=true` → `diarize_model=latest` (deprecated param; same v1 streaming diarizer today).

### In progress
- Re-test speaker separation with 2–3 real people (voice cleanup off). If still one animal: try a better/closer mic, then consider whether the festival mic setup (single room mic vs. mixer feed) can support it; the colours toggle is the fallback.
- Remaining Phase 2 checks: Wi-Fi drop, 60-minute run.

### Decisions (must remember)
- 2026-09-30 — Standalone repo; **copy** map modules from Camp-CLAI.
- 2026-09-30 — Upstairs = discussion + mic + `/admin` + `/room-feed`. Downstairs = overflow `/captions`.
- 2026-09-30 — Garden canvas is **light cream poster paper** (not Camp-CLAI's dark map).
- 2026-09-30 — Expected mode **Hybrid**; app boots in **Manual** (fail-safe).
- 2026-09-30 — Audience submissions do **not** become garden nodes.
- 2026-09-30 — **English only.**
- 2026-09-30 — Transcripts kept **privately** after the festival; **no audio stored**.
- 2026-09-30 — Streaming STT = **Deepgram**; Whisper is not used live.
- 2026-09-30 — **Both days share one garden.** Garden tables have no session filter; nodes/vines store `origin_session_id` for provenance only.
- 2026-09-30 — **Captions = speech bubbles, one sentence each, colour-coded per speaker** via Deepgram diarization. Colours may reshuffle after a reconnect (new connection restarts speaker numbering). Admin toggle falls back to single-colour bubbles.
- 2026-09-30 — **Voices are never named.** Each voice gets a garden-animal emoji (🐸 🐦 🐞 🦋 🐝 🐛, then 🦔 🐌 🦉 🐇 🐢 🐿️), rendered from self-hosted Noto Emoji SVGs so every TV looks the same.
- 2026-09-30 — **Deepgram:** Nova-3 Monolingual English, free $200 credit, `diarize_model=latest` (replaces deprecated `diarize=true`; never send both), `smart_format=true`, `interim_results=true`, **`mip_opt_out=true`** (no audio kept for training). Browser uses a 30-second temporary token from `/api/deepgram-token` (`POST /v1/auth/grant`); the API key must have **Member** permission.
- 2026-09-30 — **GitHub repo is public.**
- 2026-09-30 — **No fixed build calendar**; build in phase order as time allows.
- 2026-09-30 — **No manual recording chunks.** One continuous stream per day (Start / Pause for breaks / Stop); Deepgram's final segments are saved as individual rows; reconnects just continue the transcript.
- 2026-09-30 — **Caption transport is swappable.** UI talks to a `CaptionChannel` (`send` / `subscribe` / `close`). Today: BroadcastChannel (same browser only, for dev). Phase 1: Supabase Realtime broadcast. Display screens say `hello` on load; the host tab replies with a `snapshot` so a reloaded TV shows recent bubbles.
- 2026-09-30 — **Pause = close the Deepgram connection** (`CloseStream`), so paused time costs nothing; Resume opens a fresh connection. While Live, MediaRecorder keeps sending (silent) audio, so no separate KeepAlive message is needed.
- 2026-09-30 — **Only one tab can control the mic** (Web Locks). A second `/admin` tab shows a warning instead of starting a second paid stream.
- 2026-09-30 — Test runner = **Vitest** (`npm test`); pure helpers live in `src/lib/**` with `*.test.ts` beside them.

### Blocked / open
- Daily topic schedule (live questions + times, lunch break?).
- Venue access on Fri Oct 16 for setup + rehearsal; venue time zone.
- TV count, resolution, and what device runs the browser on each TV.
- Mic hardware and whether we can take a feed from the venue PA/mixer.
- Who operates `/admin` during sessions (host vs dedicated operator).
- Accounts needed: Supabase project, Vercel project, Deepgram account (free credit) + Member API key, OpenAI API key, public GitHub repo.
- Official poster art / fonts license for the garden frame.

---

## 5. Phase plan

No fixed calendar — we build in this order as time allows and see how far we get before Sat Oct 17. Build order follows the PRD's **Must → Should → Nice** list, so whatever exists on the day is the most important part. If time runs short, cut from the bottom (§5.9), never from captions.

### Phase 0 — Project setup
- [x] Create Next.js app. `create-next-app` refuses non-empty folders and names with spaces, so scaffold into a temp folder (e.g. `npx create-next-app@latest dg-scaffold --ts --tailwind --app --src-dir --eslint`) and move its contents up into this folder.
- [x] Read `node_modules/next/dist/docs/` for any version-specific changes before writing code.
- [x] Add Tailwind v4 tokens + fonts from `DESIGN_GUIDE.md` §3–4 (`src/app/globals.css`, `layout.tsx`).
- [x] `.env.example` with placeholder names only (see §6).
- [x] Create **public** GitHub repo, push `main`.
- [ ] Connect Vercel, add env vars in Vercel.
- [x] Sign up for Deepgram (free $200 credit, no card). Console → API Keys → Create Key → Advanced → **Member** permission. Store it only in `.env.local` / Vercel as `DEEPGRAM_API_KEY`.
- **Test:** home page renders in cream/ink with Cormorant title; Vercel preview deploys from `main`.

### Phase 1 — Data + realtime spine
- [ ] Migration `0001_core.sql`: tables from PRD §6 + RLS (public read of published/approved; host write; transcripts host-only). Garden tables have **no** session filter.
- [ ] Seed script: sessions `day_1` (Oct 17, 11:00–17:00) and `day_2` (Oct 18, 11:00–17:00) + placeholder schedule items (made-up text only).
- [ ] Host login (`/login`) + allowlist check protecting `/admin`.
- [x] Route shells: `/admin`, `/captions`, `/audience`, `/room-feed` (built early, 2026-09-30).
- [ ] `src/lib/realtime/` helpers: subscribe to `app_state` + broadcast channel; re-fetch on reconnect.
- **Test:** change `app_state.active_schedule_item_id` in Supabase → both TV routes update within ~1s without reload. Logged-out user cannot open `/admin`.

### Phase 2 — Live captions — **MUST**

**Module 2A — Plain live captions (get words flowing first)**
- [x] `/api/deepgram-token` calls Deepgram `POST /v1/auth/grant` and returns the 30-second token. Fetch a fresh one for every (re)connect — the open WebSocket outlives the token. *(Blocked in production until host login; make it host-only in Phase 1.)*
- [x] Admin mic capture (mic picker, level meter) → Deepgram WebSocket: `model=nova-3`, `language=en`, `interim_results=true`, `smart_format=true`, **`diarize_model=latest`**, **`mip_opt_out=true`**.
- [x] Broadcast to the display screens — **local transport only** (BroadcastChannel). [ ] Supabase Realtime `captions:{sessionId}` (Phase 1).
- [x] Pause/Resume/Stop; auto-reconnect with backoff; wake lock; single-controller lock. [ ] "Tab hidden" warning on `/admin`.
- **Test:** speak into laptop → second browser shows captions in ≤ ~1.5s; pull Wi-Fi 10s → reconnects and resumes; Pause shows `[PAUSED]` and stops Deepgram usage; stay silent 2 minutes while Live → connection stays open (or reconnects cleanly); **run 60+ minutes continuously** → no memory growth or slowdown in the admin tab.

**Module 2B — Speech bubbles + speaker colours**
- [x] Pure helper (built as `group-words.ts` + `bubble-accumulator.ts`): takes Deepgram word results (`punctuated_word`, `speaker`, `start`, `end`, final/interim) and returns bubbles `{ id, connectionId, speaker, text, isFinal, startMs, endMs }`. New bubble when the speaker changes **or** a sentence ends (`.` `?` `!`). Unit-test it with made-up word arrays (speaker switch mid-sentence, two sentences from one speaker, interim → final replacement, reconnect with a new `connectionId`).
- [x] Pure helper `src/lib/captions/voice-slot.ts`: speaker number → `{ animal, emojiSrc, colourSlot }` — animal from the 12-animal list (wraps after 12), colour slot 1–6 (wraps after 6). Unit-test the wrapping.
- [x] Add 12 Noto Emoji animal SVGs to `public/voices/` + the Noto licence file.
- [x] Broadcast bubbles (not raw words) to the TVs. [ ] Save each **finished** bubble as one `transcript_segments` row with `connection_id` + `speaker` (needs Supabase, Phase 1).
- [x] `/captions` bubble column per `DESIGN_GUIDE.md` §5.2: tint + strip + animal emoji (no names), alternate indent, newest at bottom, fade-rise entry.
- [x] Admin "Speaker colours" toggle → single-colour bubbles when off. *(Local state for now; move to `app_state.speaker_colours_on` in Phase 1.)*
- **Test:** two or three people take turns reading a made-up script → each sentence is its own bubble; speaker changes switch colour most of the time; a speaker who says two sentences gets two same-coloured bubbles; toggle colours off → all bubbles cream, still one sentence each; reload `/captions` mid-talk → recent bubbles reappear.

### Phase 3 — Schedule + live question + QR — **MUST**
- [ ] Admin schedule manager (add/edit/reorder, set active).
- [ ] Live Question header on `/captions` and `/room-feed`; "Now · Next" schedule strip; QR to `/audience` (`qrcode` package, as in Camp-CLAI).
- **Test:** set active item on admin → both TVs update; QR scanned from a phone opens `/audience`.

### Phase 4 — Audience → moderation → room feed — **MUST**
- [ ] `/audience` form + confirmation + consent line.
- [ ] `/api/submissions`: length limit, profanity check, per-device rate limit, insert.
- [ ] Admin moderation queue: Approve / Highlight / Dismiss (realtime).
- [ ] `/room-feed` board + highlighted pin.
- **Test:** submit from 2 phones → appear in admin within ~1s; approve → room feed shows it; highlight → pinned; spam 10 rapid submissions → rate-limited with friendly message.

### Phase 5 — Garden canvas + Manual editor — **MUST**
- [ ] Copy + adapt layout/curves/sprites (§3); pure helpers in `src/lib/garden/` with unit tests if a runner exists.
- [ ] `GardenCanvas` renders published nodes/vines with tier bands, sprites, labels, growth animation; freezes after settle.
- [ ] Admin editor: plant seed, create sprout, bloom theme, draw vine, rename, delete, merge; "Hide garden on TVs".
- [ ] Verify Camp-CLAI Plant sprites on cream; swap or fall back to circles if they clash.
- **Test:** plant 15 nodes across tiers → TV shows seeds low, themes high, no overlaps, no continuous jitter; reduced-motion shows no pulses. Switch active day `day_1` → `day_2` → garden is unchanged and new nodes record `origin_session_id = day_2`. Load ~150 fake nodes (a full two-day garden) → still readable on a 1080p TV, no slowdown.

### Phase 6 — Hybrid AI synthesis — SHOULD
- [ ] `/api/synthesis` (host-only): builds window + current garden → OpenAI JSON → validates → inserts **draft** nodes/vines (Hybrid) or **published** (Auto); logs to `synthesis_runs`.
- [ ] Admin timer (~35s) only while Live and mode ≠ Manual; skip if previous call still running.
- [ ] Draft queue UI: Approve / Edit / Reject / Approve all; `reinforce` bumps weight on approve.
- **Test:** 5 minutes of sample talk → drafts arrive, no near-duplicates of existing nodes; force an API error → admin notice, captions unaffected; switch to Manual → timer stops.

### Phase 7 — Hardening + export + rehearsal — SHOULD (rehearsal itself is a must before Sat Oct 17)
- [ ] Export: festival garden JSON + PNG (with each node's origin day); transcript text per day (host-only).
- [ ] "Reset test data" admin action for **before** Saturday only (clears rehearsal nodes/submissions/transcripts) — guarded by a typed confirmation, and disabled once `day_1` has started.
- [ ] Real TV test at venue (or same model TV): caption size, safe area, contrast from back row.
- [ ] Run the §7 failure drills.
- **Test:** full 30-minute dress rehearsal with a real mic and all four screens.

### Phase 8 — Nice to have (only if ahead)
- [ ] Auto mode polish · day tint/filter on the garden · growth timelapse (both days) for the Sunday close.

### 5.9 Cut lines if behind
1. Drop Phase 8 entirely.
2. Drop Auto mode (keep Manual + Hybrid).
3. Drop Hybrid (Manual only) — garden still works.
4. Drop garden PNG export (keep JSON + transcript).
**Never cut:** captions, live question, moderation.

---

## 6. Environment variables (names only — values live in `.env.local` / Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=        # Supabase *publishable* key
SUPABASE_SECRET_KEY=                  # server only — audience inserts, admin tasks
NEXT_PUBLIC_APP_URL=
DEEPGRAM_API_KEY=                     # server only — Member-permission key, used to mint 30s tokens
OPENAI_API_KEY=                       # server only
OPENAI_SYNTHESIS_MODEL=               # small/fast chat model name
HOST_EMAILS=                          # comma-separated allowlist for /admin
```

---

## 7. Festival runbook (fill in during Phase 7)

### Fri Oct 16 (setup + rehearsal)
- [ ] Test every TV browser loads its URL full-screen (F11 / kiosk) and survives a Wi-Fi toggle.
- [ ] Mic check upstairs from the actual seating positions.
- [ ] Confirm Deepgram + OpenAI credit / billing limits.
- [ ] Print consent signage for both rooms.
- [ ] After rehearsal: **reset test data** so Saturday starts with an empty garden.

### Sat Oct 17 (`day_1`)
- [ ] ~10:30: Admin → select `day_1` → confirm schedule → mode Manual → **Start** audio → check downstairs captions.
- [ ] Switch to Hybrid once captions are stable.
- [ ] Pause during breaks; **Stop** at 17:00; export the day's transcript + a garden backup. **Do not clear the garden.**

### Sun Oct 18 (`day_2`)
- [ ] ~10:30: Admin → select `day_2` → confirm Saturday's garden is on the downstairs TV → Manual → **Start** → Hybrid.
- [ ] Pause during breaks; **Stop** at 17:00; export Sunday transcript + final festival garden (JSON + PNG).

### Failure drills
| Drill | Expected |
| :--- | :--- |
| Kill host Wi-Fi 15s | Captions resume automatically |
| Reload `/captions` mid-session | Returns to current question, garden, last captions |
| Revoke OpenAI key (staging) | Admin notice; captions + manual garden unaffected |
| Close admin tab while Live | TVs show Paused/Offline indicator, not a frozen screen |

---

## 8. Cursor implementation guidelines
- Server Components by default; `"use client"` for mic, realtime subscriptions, garden canvas, forms.
- Pure logic in `src/lib/**` (layout, tier mapping, proposal validation, rate limiting) so it's testable without UI.
- Wrap every AI/network call in try/catch with a visible, non-blocking error state.
- Follow `DESIGN_GUIDE.md`; never hard-code colors.
- Update §4 after each module; land work on `main`.
