# Discussion Garden — Development & Implementation Plan

**Version:** 0.1  
**Last updated:** 2026-10-01 (repo moved to `C:\dev\Discussion-Garden`; full C: drive found + partly cleared; user testing of Phases 1/3 still pending)  
**Target tool:** Cursor (AI coding assistant)  
**Tech stack:** Next.js (App Router) · Tailwind CSS v4 · Supabase (Postgres, Auth, Realtime) · Vercel · Deepgram (streaming STT) · OpenAI (synthesis) · `d3-force`  
**Companion docs:** `prd-v0.2.md` (product) · `DESIGN_GUIDE.md` (visual)  
**Reference project:** Camp-CLAI (`C:\Users\narya\OneDrive\Documents\GitHub\Camp-CLAI`) — copy code, don't import it.  
**Festival:** Oct 16–18, 2026 · **live Sat Oct 17 & Sun Oct 18, 11:00–17:00** · rehearsal at venue Fri Oct 16 if possible. No fixed build calendar — work in phase order as time allows.

---

## 0. Handoff — start here

### Colleague / new-agent checklist
1. Pull latest `main`. Never commit `.env.local` or real keys (see `.cursorrules` → Secrets).
2. Copy `.env.example` → `.env.local`; fill values from the team's password manager / Vercel. `.env.local` points the app at **local** Supabase; `SUPABASE_ACCESS_TOKEN` + `SUPABASE_DB_PASSWORD` there are only for pushing to the hosted project (§7).
3. `npm install` → start Docker Desktop → `npm run db:start` (local Supabase; put its URL + publishable + secret keys in `.env.local`) → `npm run host:add -- email "password"` → `npm run dev` → open http://localhost:3000.
4. Read **§4 Progress & Decisions** before writing code.
5. Build **one module at a time** from §5; verify with its test checklist; update §4; commit to `main`.

### Do not break
- **Captions never depend on AI.** Synthesis errors must not stop or slow captions.
- **Displays are read-only.** `/captions` and `/room-feed` never write to the database.
- **Hosts stay in control of every TV.** Audience messages go live without pre-approval (2026-10-01), but the host can always Hide one (gone from the TV in seconds) or pause sharing. AI nodes need approval in Hybrid.
- **The Deepgram and OpenAI keys stay server-side.** The browser only ever gets a short-lived Deepgram token.
- **Transcripts are private.** `transcript_segments` is host-only under RLS.

---

## 1. Product framing (summary)
- **Upstairs:** live discussion + mic + host laptop (`/admin`) + TV showing the audience feed (`/room-feed`).
- **Downstairs:** overflow room TV with captions + live question + garden + schedule + QR (`/captions`).
- **Phones:** `/audience` — zero-login messages, shown on the room TV straight away (host can hide / pause).
- **Garden:** seeds (soil) → sprouts (stems) → themes (blooms); vines connect them. Modes: Manual (boot default) · Hybrid (expected) · Auto.
- **Out of scope:** translation, audio storage, audience → garden promotion, CLara integration.

---

## 2. Architecture decisions
| Decision | Choice | Why |
| :--- | :--- | :--- |
| Repo | Standalone, **public** GitHub repo (confirmed 2026-09-30) deployed on Vercel Hobby | Simple deploys; forces good secret hygiene |
| Deepgram plan | **Free $200 credit** (pay-as-you-go tier, no card). Nova-3 English streaming + diarization ≈ $0.41–0.58 per live hour | Whole festival + testing ≈ $15–20 of credit |
| Live STT | Browser → Deepgram WebSocket, using a short-lived token from `/api/deepgram-token` | Vercel functions can't hold long audio sockets; lowest latency; key stays server-side |
| Caption fan-out | Supabase Realtime **private broadcast** channel `captions` (hosts send, everyone listens) + `captions-hello` for catch-up; only **finished** bubbles saved to `transcript_segments` | Interim words change many times per second — too chatty for DB writes |
| Garden/feed/state sync | Supabase Realtime **Postgres changes** on `garden_nodes`, `garden_vines`, `audience_submissions`, `app_state` | TVs update automatically when rows change; on reconnect, re-fetch |
| AI scheduler | Admin tab calls `/api/synthesis` every ~35s while Live and mode ≠ Manual | No background job service needed for a 2-day event |
| Host auth | Supabase Auth email/password; allowlist in the `public.hosts` table (checked by RLS via `is_host()`); sign-ups disabled | Reuses Camp-CLAI patterns; displays + audience need no login |
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
| Phase | Status |
| :--- | :--- |
| 0 — Setup | Done except **Vercel** |
| 1 — Data + realtime spine | Done — user-verified 2026-10-01 (two browsers) |
| 2 — Live captions | Working; speaker separation user-verified. Wi-Fi-drop + 60-min run still to do |
| 3 — Schedule + live question + QR | Done — user-verified 2026-10-01 (schedule → TV, phone QR scan) |
| Hosted Supabase | Linked, schema + seed pushed, sign-ups off, `db:check` 19/19. Not yet used by the app |
| 4 — Audience → room feed | Done — user-verified 2026-10-01 (no pre-approval; Hide/Pin/pause sharing) |
| 5 — Garden | 5A canvas user-verified 2026-10-01 (15 → 150 live, readable, settles, fills box). 5B admin editor user-verified 2026-10-01. Day-switch check pending |
| 6 → 8 (incl. 6B layouts) | Not started |

### ▶ Resume here (next session)
**1. Start the machine back up** (agent runs these, from **`C:\dev\Discussion-Garden`** — the old OneDrive copy is retired):
- Check free space on C: first (`Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"`). Under ~5 GB free → Docker breaks; tell the user before doing anything else.
- Start **Docker Desktop**, then `npm run db:start` (local Supabase; data persists in Docker volumes).
- `npm run dev`. If pages hang or 404: stop it, delete `.next`, run again.
- Sanity: `npm test` (146 pass) and `npm run db:check` (23/23).

**2. Testing notes:**
- Open `/admin` at **`http://localhost:3000`** (mic needs a secure page). Phones/TVs use the LAN IP (`http://10.0.0.141:3000`; re-check with `Get-NetIPAddress` if Wi-Fi changed). Phone can't connect → turn off the VPN (ProTUN), allow Node through Windows Firewall.
- Local `/admin` login: the user's own host account, or reset one with `npm run host:add -- email "password"`. (A throwaway `agent-test@example.com` also exists on **local** only.)

- Demo garden (made-up labels, **local DB only** — the script refuses any non-127.0.0.1 URL): `npm run garden:demo -- 15`, `-- 150`, or `-- clear`. Demo nodes are tagged `description = '[demo]'`; clear only removes those.
- Headless screenshot check: `msedge --headless=new --hide-scrollbars --force-prefers-reduced-motion --window-size=1920,1080 --virtual-time-budget=15000 --screenshot=...` (reduced motion, or the 600 ms grow-in gets caught half-faded). Headless Edge leaves an empty strip at the right/bottom of the garden box (it measures before its final resize) — check in a real browser before "fixing" it.

**3. Then build:** finish Phase 5 (user test of the 5B editor, then the day-switch test in §5 Phase 5), then **Phase 6 — Hybrid AI synthesis**.

**Open decisions for the user:** real festival schedule · Vercel deploy timing · what to clear on the nearly full C: drive (see Blocked / open).

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
- 2026-09-30 — **Speaker separation re-test passed** (user: "It works!") with voice cleanup off.
- 2026-09-30 — **Phase 1 — data + realtime spine (local Supabase via Docker):**
  - `supabase/migrations/20260930000001_core.sql` — all PRD §6 tables + `hosts` allowlist + `is_host()` + RLS; `app_state` single row (boots `manual`); `transcript_segments.bubble_id` unique (safe retries); realtime publication for app_state/sessions/schedule/garden/submissions; **private broadcast policies** on `realtime.messages` (`captions`: everyone listens, hosts send; `captions-hello`: anyone).
  - `supabase/seed.sql` — `day_1` / `day_2` + 6 made-up schedule items; active day = `day_1`.
  - Auth: `/login` (sign-in only; sign-ups disabled), `src/proxy.ts` (session refresh on host routes only), `requireHost()` on `/admin`, `/api/deepgram-token` now **host-only** (401/403) instead of blocked in production. `npm run host:add -- email "password"` creates/updates a host.
  - Realtime: `createSupabaseCaptionChannel` (one per tab, `getCaptionChannel()`), `useFestivalState` (app_state + days + schedule; **re-fetches on every change and every reconnect** via `watchTables` + `createRefetcher`), TVs show "Reconnecting" when their own connection drops.
  - Host: status (Live/Paused…) + speaker colours persisted to `app_state`; finished bubbles saved to `transcript_segments` via `TranscriptQueue` (batched every 3s, retries, capped); admin notices for save backlog / missing day. New **Festival day** + **Live question** pickers on `/admin`.
  - `/captions` + `/room-feed` show the live question.
  - Verified by agent: `npm run db:check` → **19/19 access checks pass** (visitor can't read transcripts or write anything; non-host can't either; non-host broadcast doesn't reach TVs; public-channel spoof doesn't reach the private channel); `/admin` → 307 to `/login` when signed out; token route 401 signed out; browser login → `/admin` works; live question change in DB → `/captions` updated without reload. 73 unit tests pass.

- 2026-09-30 — **Dev server froze** (every page hung, then 404s after restart). Cause: corrupted `.next` cache — likely OneDrive syncing the folder while Next.js writes to it. Fix: stop the server, delete `.next`, `npm run dev`. If it recurs, move the repo out of OneDrive (e.g. `C:\dev\Discussion-Garden`). Also: caption sends before the channel is joined now use `httpSend()` explicitly (Supabase deprecates the silent REST fallback).
- 2026-09-30 — **Hosted Supabase ready** (`mjjzfqyrskvhngwstjoz`): linked, schema + seed pushed via new `npm run db:push:hosted` (Management API over HTTPS — direct Postgres connection is blocked on the user's network), sign-ups disabled, `db:check` 19/19 against hosted. `.env.local` still points the app at **local** Supabase. Found while testing: hosted Realtime confirms postgres_changes a moment *after* `SUBSCRIBED`, so `watchTables` now also refetches on that `system` "ok" message, and `db:check` waits for it.

- 2026-09-30 — **Phase 3 — schedule + live question + QR:**
  - `src/lib/schedule/` — `time.ts` (`venueTime`, `toVenueIso`; venue zone `America/Toronto`, offset `-04:00`), `schedule.ts` (`dayItems`, `nowAndNext`, `moveItem`, `nextSortOrder`, `validateDraft`: title ≤ 80, question ≤ 200), `schedule-db.ts` (host-only writes; throw on error). `src/lib/qr/qr.ts` — `qrShape` (QR as one SVG path, coloured with tokens), `audienceUrl`, `displayUrl`.
  - `/admin` → **Schedule & live question** panel (`ScheduleManager`); Festival day panel now only picks the day.
  - `/captions` footer → `NowNextStrip` + `AudienceQr` (13vh, links to `<this screen's origin>/audience`).
  - Verified by agent in the browser: add (14:05 round-trips), move, edit, Show on TVs, Next question, delete-while-live (TV drops the question, strip shows "UP NEXT"); TV updates without reload. 92 unit tests pass.
- 2026-09-30 — Dev server froze **again** (2nd time today, same `.next` fix). Strong sign OneDrive syncing is the cause — see Blocked / open.
- 2026-10-01 — **Repo moved out of OneDrive to `C:\dev\Discussion-Garden`** (robocopy without `node_modules`/`.next`, then `npm ci`). Git history, remote, and `.env.local` intact; local Supabase data kept (Docker project id is fixed in `supabase/config.toml`, not taken from the folder name). Old copy at `C:\Users\narya\OneDrive\Documents\GitHub\Discussion Garden` is retired — delete it once the user is happy.
- 2026-10-01 — **C: drive was 100% full (0 GB of 935 GB)** — this broke Docker (storage went read-only) and probably caused the "OneDrive" dev-server freezes too. Freed 8 GB (npm cache + old `node_modules`). Docker Desktop hung on restart → force-quit + `wsl --terminate docker-desktop`. The Supabase `storage-api` image was damaged by the full disk (crash loop, exit 139) → deleted the image so `db:start` re-pulled it. After that: `db:start` clean, `db:check` 19/19, 94 tests pass. Supabase's `vector` log collector restart-loops on this machine; harmless (we don't use it).

- 2026-10-01 — **Phase 4A — audience form + `/api/submissions`:**
  - `src/lib/submissions/` — `limits.ts` (body ≤ 500, name ≤ 40; matches the DB checks), `validate.ts` (`cleanText`, `validateSubmission`), `profanity.ts` (`obscenity` package, English dataset), `rate-limit.ts` (`checkRateLimit`, `DEVICE_RULES` 3/min + 12/hour, `FLOOD_RULES` 60/min across everyone). `src/lib/supabase/admin.ts` — server-only secret-key client.
  - `/api/submissions` — validate → anonymous `dg_device` cookie (httpOnly, 30 days; stored only as a SHA-256 `device_hash`) → rate limits counted from the DB → insert as `pending` with the active day. Friendly errors: 400 empty/too long, 422 profanity, 429 + `Retry-After`, 500.
  - `/audience` — `AudienceForm` (textarea with characters-left count, optional name/tag, consent line, "Sent — thank you" + sprout + "Send another").
  - Agent-verified against local Supabase: good → 201 pending `day_1`; profanity → 422; empty → 400; 4th rapid send → 429; public sees 0 pending rows. 110 unit tests pass.

- 2026-10-01 — **Phase 4B — no pre-approval; host "Audience messages" panel:**
  - Migrations: `20261001000001_open_submissions.sql` (`app_state.submissions_open`, submissions default to `approved`); `20261001000002_feed_hide_signal.sql` (trigger: a status change touches `app_state` and unpins a hidden message).
  - Why the trigger: **Realtime filters row changes through RLS**, so when a message becomes `dismissed` the public TVs receive *nothing* (verified) and would keep showing it. Every screen already watches `app_state`, so touching it makes them re-fetch. Gotcha found while testing: Supabase rejects `UPDATE` without `WHERE` even inside a trigger — the trigger uses `where id = true`.
  - `/api/submissions` refuses with 403 + `closed: true` when sharing is paused and inserts as `approved`. `/audience` shows a "Sharing is paused" state (server-checked on load, and on a 403).
  - `src/lib/submissions/feed.ts` (`fetchSubmissions`, `roomFeed` → pinned + others newest first, hidden never shown), `submissions-db.ts` (host writes), `useSubmissions` hook (watches `audience_submissions` + `app_state`). `AudiencePanel` on `/admin`: open/paused switch, live list, Pin/Unpin, Hide/Show.
  - Agent-verified: open → 201 visible; paused → 403 + paused page; anon can't insert directly or flip the switch; hide → TV is notified and pin clears; `db:check` 19/19; 115 unit tests pass.

- 2026-10-01 — **Phase 4C — `/room-feed` board** (DESIGN_GUIDE §5.3): `RoomFeedScreen` uses `useFestivalState` + `useSubmissions` + `roomFeed()`; pinned "Being discussed" card; two-column cards newest first with `.fade-bottom`; "Sharing is paused" pill; Reconnecting pill. Auto-scroll = pure `stepAutoScroll` (`src/lib/submissions/auto-scroll.ts`, hold top 10 s → 24 px/s → hold bottom 6 s → back to top) driven by `useAutoScroll`, which writes `transform` directly (no React re-render per frame) and resets on a new message; off under reduced motion. Read-only (no writes). 121 unit tests pass. Screenshot check via headless Edge at 1920×1080.

- 2026-10-01 — **Phase 5A — garden canvas on `/captions`** (DESIGN_GUIDE §6). 115 Camp-CLAI Plant sprites copied to `public/garden-sprites/{seed,sprout,theme}/` (shrunk to 160 px; user confirmed we own them). Pure helpers in `src/lib/garden/`: `layout.ts` (seeded `d3-force` — every TV computes the identical layout; tier bands theme 0.2 / sprout 0.5 / seed 0.8; label-aware collision so sprite+label boxes never overlap; keeps previous positions as canvas fractions so the garden barely moves when it grows), `labels.ts` (≤ 6 words, wrapped to two lines; in a crowded garden (≥ 60 nodes) only the 12 newest seeds keep labels), `sprites.ts` (stable sprite per node id), `curves.ts` (vine paths). `GardenCanvas` lays out once per change, glides nodes to new spots (CSS transitions), grows in new nodes, draws vines on; sprite errors fall back to tier-coloured circles; honours `garden_hidden`. `useLiveData` hook now shared by `useFestivalState`, `useSubmissions`, `useGarden`. Migration `20261001000003_garden_status_signal.sql`: publishing/unpublishing a node or vine touches `app_state`, because Realtime hides RLS-invisible changes from anonymous TVs (same trick as audience Hide). Pushed to hosted (4/4). 139 unit tests pass; screenshots at 1920×1080 with 15 and 150 demo nodes are readable with no overlapping labels.

### In progress
- 2026-10-01 — **Phase 5B — Garden panel on `/admin`** (`src/components/admin/garden/`). Live preview (same `GardenCanvas` as the TVs); **Plant** form (Seed / Sprout / Theme + optional "grows into" the next tier up; shows "The TV will show: …" when the label gets shortened; keeps tier + parent selected for fast entry); searchable idea list grouped by tier; per-idea editor: rename, change tier, size −/+ ("Mentioned again"), list/remove vines, connect (defaults to "grows into" for the next tier up, else "relates to"; hides ideas already connected), **merge** into a duplicate, delete (confirm). **"Hide garden on TVs"** switch (confirm before hiding). Manual edits insert as `published`, `origin = manual`, `origin_session_id` = active day. Merge = Postgres function `merge_garden_nodes(keep_id, drop_id)` (migration `20261001000004`, `security invoker` so RLS applies + explicit host check): moves vines without loops/duplicates, adds weights, unions transcript sources, deletes the duplicate — all-or-nothing. Pure helpers in `src/lib/garden/edit.ts` (7 tests); writes in `garden-edit-db.ts`; shared `useHostAction` hook. `db:check` gained 4 merge checks (23/23). Pushed to hosted (5/5). 146 unit tests pass.

### In progress
- Phase 5: day-switch check (`day_1` → `day_2`: garden unchanged; new ideas record `origin_session_id` = `day_2`).
- Hosted Supabase is in sync: all 2026-10-01 migrations pushed (5/5 applied).
- Hosted follow-ups (§7): private channel for `watchTables` before turning off Realtime public access; real hosts; Vercel.
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
- 2026-09-30 — **Caption transport = Supabase Realtime private broadcast** behind the `CaptionChannel` interface (`send` / `subscribe` / `onConnection`). Topic `captions` (hosts send, everyone listens) + `captions-hello` (display asks for a snapshot after every (re)connect; only the tab holding the mic replies, max once/second). One channel per tab — supabase-js reuses channels by topic name, so components add/remove listeners instead of opening channels.
- 2026-09-30 — **Status source of truth = `app_state`** (audio status + speaker colours), also broadcast for speed. TVs read it on load and on reconnect.
- 2026-09-30 — **Hosts live in `public.hosts`** (not an env var) so RLS can check them via `is_host()`. Public sign-up is **disabled**; host accounts are created with `npm run host:add`. Host emails are never committed (seed has none).
- 2026-09-30 — **Local development uses the Supabase CLI + Docker** (`npm run db:start`). Hosted project only needed for real TVs / deploy.
- 2026-09-30 — **Pause = close the Deepgram connection** (`CloseStream`), so paused time costs nothing; Resume opens a fresh connection. While Live, MediaRecorder keeps sending (silent) audio, so no separate KeepAlive message is needed.
- 2026-09-30 — **Only one tab can control the mic** (Web Locks). A second `/admin` tab shows a warning instead of starting a second paid stream.
- 2026-09-30 — **"Now" on the TVs = the item the host put live**, not the clock (sessions run late). With nothing live, the strip shows the day's first item as "UP NEXT". Times are entered and shown in **venue time** (`src/lib/schedule/time.ts`) regardless of the device's clock.
- 2026-09-30 — **QR only on `/captions`** (PRD §4). It encodes the address the TV was opened with + `/audience`, so no config: on Vercel it points at Vercel; for a local phone test open `/captions` via the laptop's LAN address (e.g. `http://10.0.0.141:3000`). `next.config.ts` `allowedDevOrigins` allows private LAN IPs in dev (otherwise Next blocks the page's scripts). Other devices can't load *data* locally — `.env.local` points at `127.0.0.1` Supabase — so multi-device tests need hosted Supabase/Vercel.
- 2026-09-30 — **Never call `crypto.randomUUID()` directly** in browser code — it's missing on plain-http pages (LAN IP) and crashed `/captions`. Use `uniqueId()` from `src/lib/unique-id.ts`.
- 2026-10-01 — **Audience rate limit = anonymous per-phone cookie, counted in the DB**, not by IP (venue Wi-Fi puts every phone behind one IP) and not in server memory (Vercel runs several instances). Plus a room-wide flood cap so a cookie-clearing script can't bury the host queue. Profanity is **rejected with a "please rephrase"** before it's saved.
- 2026-10-01 — **No host pre-approval for audience messages** (user decision: "if it's being abused, we'll turn it off"). Messages go to `/room-feed` immediately after the server checks. Host tools: **Sharing open/paused switch**, **Hide/Show** per message, **Pin** one as "being discussed" (`app_state.highlighted_submission_id`; status `highlighted` is unused). Replaces the Approve/Dismiss queue.
- 2026-10-01 — **`/captions` gets three layouts: Garden · Both · Captions** (PRD v0.2.6, DESIGN_GUIDE §5.1a). Smooth slide (garden grows right / captions grow left); header, live question, Now · Next, QR fixed in all three. Host buttons on `/admin` + optional auto-rotate; TV rotates locally from `app_state` (`captions_layout`, `captions_rotate_seconds`) so it stays read-only. "Hide garden" forces Captions. **Should-have, built as Phase 6B after Hybrid AI**; until then `/captions` is always Both. Cut before Hybrid if behind.
- 2026-10-01 — **`/admin` (the mic) only works on a secure page:** `http://localhost:3000` locally, `https://` on Vercel. On a plain-http LAN address (`http://10.0.0.x`) browsers hide the mic API; `LiveCaptioner` now shows a plain-English message instead of crashing. LAN addresses are only for phones/TVs.
- 2026-10-01 — **Garden layout is computed on each screen, deterministically** (seeded randomness, no shared positions table). Same nodes + same canvas size → same picture on every TV. Node positions are not stored in the DB.
- 2026-10-01 — **Realtime + RLS gotcha:** when a row becomes invisible to a viewer (message hidden, node unpublished), that viewer gets **no** event. Fix pattern: a `security definer` trigger touches `app_state` (`where id = true` — Supabase rejects UPDATE without WHERE), which every screen watches, and screens re-fetch.
- 2026-09-30 — Test runner = **Vitest** (`npm test`); pure helpers live in `src/lib/**` with `*.test.ts` beside them.

### Blocked / open
- Daily topic schedule (live questions + times, lunch break?).
- Venue access on Fri Oct 16 for setup + rehearsal; venue time zone.
- TV count, resolution, and what device runs the browser on each TV.
- Mic hardware and whether we can take a feed from the venue PA/mixer.
- Who operates `/admin` during sessions (host vs dedicated operator).
- Accounts still needed: Vercel project, OpenAI API key. (Hosted Supabase done.) (Deepgram Member key + public GitHub repo done.)
- Stale "Live" on TVs if the host tab crashes/closes while live (app_state keeps `live`). Consider a host heartbeat in Phase 7.
- Two host **laptops** could both press Start (Web Lock only covers one browser). Runbook: only one admin laptop runs captions.
- Official poster art / fonts license for the garden frame.
- ~~Repo lives in OneDrive~~ — **resolved 2026-10-01**, moved to `C:\dev\Discussion-Garden`.
- **Laptop disk nearly full** (~8 GB free of 935 GB on 2026-10-01). Biggest folders: Music ~223 GB, Downloads ~83 GB, Videos ~30 GB, `AppData\Local\AINoteTaker` ~24 GB. User to decide what to clear. If this laptop runs `/admin` at the festival it needs real headroom.

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
- [x] Migration (`supabase/migrations/20260930000001_core.sql`): tables from PRD §6 + RLS (public read of published/approved; host write; transcripts host-only). Garden tables have **no** session filter.
- [x] Seed (`supabase/seed.sql`): sessions `day_1` (Oct 17, 11:00–17:00) and `day_2` (Oct 18, 11:00–17:00) + placeholder schedule items (made-up text only).
- [x] Host login (`/login`) + allowlist (`public.hosts`) protecting `/admin` and `/api/deepgram-token`.
- [x] Route shells: `/admin`, `/captions`, `/audience`, `/room-feed` (built early, 2026-09-30).
- [x] `src/lib/realtime/` helpers: subscribe to `app_state` + broadcast channel; re-fetch on reconnect.
- [x] `npm run db:check` access-rule checks (19 checks).
- **Test:** change `app_state.active_schedule_item_id` in Supabase → both TV routes update within ~1s without reload. Logged-out user cannot open `/admin`. *(Agent-verified 2026-09-30; user to confirm in two browsers.)*

### Phase 2 — Live captions — **MUST**

**Module 2A — Plain live captions (get words flowing first)**
- [x] `/api/deepgram-token` calls Deepgram `POST /v1/auth/grant` and returns the 30-second token. Fetch a fresh one for every (re)connect — the open WebSocket outlives the token. **Host-only** (Phase 1).
- [x] Admin mic capture (mic picker, level meter) → Deepgram WebSocket: `model=nova-3`, `language=en`, `interim_results=true`, `smart_format=true`, **`diarize_model=latest`**, **`mip_opt_out=true`**.
- [x] Broadcast to the display screens via Supabase Realtime private channel `captions` (one live stream, so no per-session topic).
- [x] Pause/Resume/Stop; auto-reconnect with backoff; wake lock; single-controller lock. [ ] "Tab hidden" warning on `/admin`.
- **Test:** speak into laptop → second browser shows captions in ≤ ~1.5s; pull Wi-Fi 10s → reconnects and resumes; Pause shows `[PAUSED]` and stops Deepgram usage; stay silent 2 minutes while Live → connection stays open (or reconnects cleanly); **run 60+ minutes continuously** → no memory growth or slowdown in the admin tab.

**Module 2B — Speech bubbles + speaker colours**
- [x] Pure helper (built as `group-words.ts` + `bubble-accumulator.ts`): takes Deepgram word results (`punctuated_word`, `speaker`, `start`, `end`, final/interim) and returns bubbles `{ id, connectionId, speaker, text, isFinal, startMs, endMs }`. New bubble when the speaker changes **or** a sentence ends (`.` `?` `!`). Unit-test it with made-up word arrays (speaker switch mid-sentence, two sentences from one speaker, interim → final replacement, reconnect with a new `connectionId`).
- [x] Pure helper `src/lib/captions/voice-slot.ts`: speaker number → `{ animal, emojiSrc, colourSlot }` — animal from the 12-animal list (wraps after 12), colour slot 1–6 (wraps after 6). Unit-test the wrapping.
- [x] Add 12 Noto Emoji animal SVGs to `public/voices/` + the Noto licence file.
- [x] Broadcast bubbles (not raw words) to the TVs. [x] Save each **finished** bubble as one `transcript_segments` row with `connection_id` + `speaker` (`TranscriptQueue`, idempotent on `bubble_id`).
- [x] `/captions` bubble column per `DESIGN_GUIDE.md` §5.2: tint + strip + animal emoji (no names), alternate indent, newest at bottom, fade-rise entry.
- [x] Admin "Speaker colours" toggle → single-colour bubbles when off; saved in `app_state.speaker_colours_on`.
- **Test:** two or three people take turns reading a made-up script → each sentence is its own bubble; speaker changes switch colour most of the time; a speaker who says two sentences gets two same-coloured bubbles; toggle colours off → all bubbles cream, still one sentence each; reload `/captions` mid-talk → recent bubbles reappear.

### Phase 3 — Schedule + live question + QR — **MUST**
- [x] Admin schedule manager (add/edit/delete/reorder, "Show on TVs", "Next question →", Clear; day tabs to prep the other day).
- [x] Live Question header on `/captions` and `/room-feed`; "Now · Next" schedule strip; QR to `/audience` (`qrcode` package, as in Camp-CLAI).
- **Test:** set active item on admin → both TVs update; QR scanned from a phone opens `/audience`. *(Agent-verified 2026-09-30 except the phone scan — user to confirm.)*

### Phase 4 — Audience → room feed — **MUST**
- [x] `/audience` form + confirmation + consent line. *(4A, 2026-10-01)*
- [x] `/api/submissions`: length limit, profanity check, per-device rate limit, insert. *(4A, 2026-10-01)*
- [x] Admin "Audience messages" panel: Sharing open/paused, Hide/Show, Pin/Unpin (realtime). *(4B, 2026-10-01 — replaces the Approve/Dismiss queue)*
- [x] `/room-feed` board + highlighted pin. *(4C, 2026-10-01)*
- **Test:** submit from 2 phones → appear in admin and on the room feed within ~1s; Hide → gone from the room feed within seconds; Pin → pinned; pause sharing → phone shows "paused"; spam 10 rapid submissions → rate-limited with friendly message.

### Phase 5 — Garden canvas + Manual editor — **MUST**
- [x] Copy + adapt layout/curves/sprites (§3); pure helpers in `src/lib/garden/` with unit tests if a runner exists. *(5A, 2026-10-01)*
- [x] `GardenCanvas` renders published nodes/vines with tier bands, sprites, labels, growth animation; freezes after settle. *(5A, 2026-10-01 — user-verified)*
- [x] Admin editor: plant seed, create sprout, bloom theme, draw vine, rename, delete, merge; "Hide garden on TVs". *(5B, 2026-10-01 — user-verified)*
- [x] Verify Camp-CLAI Plant sprites on cream; swap or fall back to circles if they clash. *(look fine on cream; circle fallback built in)*
- **Test:** plant 15 nodes across tiers → TV shows seeds low, themes high, no overlaps, no continuous jitter; reduced-motion shows no pulses. Switch active day `day_1` → `day_2` → garden is unchanged and new nodes record `origin_session_id = day_2`. Load ~150 fake nodes (a full two-day garden) → still readable on a 1080p TV, no slowdown.

### Phase 6 — Hybrid AI synthesis — SHOULD
- [ ] `/api/synthesis` (host-only): builds window + current garden → OpenAI JSON → validates → inserts **draft** nodes/vines (Hybrid) or **published** (Auto); logs to `synthesis_runs`.
- [ ] Admin timer (~35s) only while Live and mode ≠ Manual; skip if previous call still running.
- [ ] Draft queue UI: Approve / Edit / Reject / Approve all; `reinforce` bumps weight on approve.
- **Test:** 5 minutes of sample talk → drafts arrive, no near-duplicates of existing nodes; force an API error → admin notice, captions unaffected; switch to Manual → timer stops.

### Phase 6B — `/captions` layouts: Garden · Both · Captions — SHOULD (after Phase 6)
- [ ] Migration: `app_state.captions_layout` (`garden`/`both`/`captions`, default `both`) + `captions_rotate_seconds` (null = off).
- [ ] Pure helper `src/lib/captions/layout.ts`: `effectiveLayout(selected, gardenHidden)` and `nextRotation(current, elapsed, seconds)`, with unit tests.
- [ ] `/captions`: middle band animates between layouts per DESIGN_GUIDE §5.1a (transform/clip-path slide; cross-fade under reduced motion); garden re-fits once after the slide.
- [ ] `/admin`: Garden · Both · Captions buttons + auto-rotate on/off + seconds.
- **Test:** each button → TV slides within ~1s, header/strip/QR never move; auto-rotate at 20s cycles all three and survives a TV reload; "Hide garden" → Captions; reduced-motion → fade only; full-screen captions stay readable from the back row.

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
3. Drop the `/captions` layout switcher (Phase 6B) — the TV stays on Both.
4. Drop Hybrid (Manual only) — garden still works.
5. Drop garden PNG export (keep JSON + transcript).
**Never cut:** captions, live question, host Hide + pause sharing for audience messages.

---

## 6. Environment variables (names only — values live in `.env.local` / Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=        # Supabase *publishable* key
SUPABASE_SECRET_KEY=                  # server only — host:add / db:check scripts, audience inserts (Phase 4)
NEXT_PUBLIC_APP_URL=
DEEPGRAM_API_KEY=                     # server only — Member-permission key, used to mint 30s tokens
OPENAI_API_KEY=                       # server only
OPENAI_SYNTHESIS_MODEL=               # small/fast chat model name
```
Hosts are **not** an env var — they live in `public.hosts` (`npm run host:add`).

---

## 7. Festival runbook (fill in during Phase 7)

### Going to hosted Supabase (before real TVs / Vercel)
Hosted project: **`mjjzfqyrskvhngwstjoz`** ("Discussion Garden", `us-east-1`), URL `https://mjjzfqyrskvhngwstjoz.supabase.co`. `.env.local` holds `SUPABASE_ACCESS_TOKEN` (CLI / Management API) + `SUPABASE_DB_PASSWORD`; its `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SECRET_KEY` stay on **local**.

- [x] Create a Supabase project (free tier) — `us-east-1`.
- [x] Link: `npx supabase link --project-ref mjjzfqyrskvhngwstjoz` (with `SUPABASE_ACCESS_TOKEN` + `SUPABASE_DB_PASSWORD` loaded from `.env.local` into the shell).
- [x] Push schema + seed. `npx supabase db push` **times out on the user's home network** (Postgres pooler connection gets cut), so use **`npm run db:push:hosted`** — applies missing `supabase/migrations/*.sql` over HTTPS via the Management API and records them in `supabase_migrations.schema_migrations` (compatible with `db push`). Seed: `node --env-file=.env.local scripts/push-hosted.mjs --seed` (only seeds if no sessions exist). PowerShell strips `--` from `npm run x -- --flag`, so call node directly for flags.
- [ ] Replace the made-up schedule with the real one (once known).
- [ ] **Realtime "Allow public access" OFF** (`private_only`). **Not yet — would break TVs:** `watchTables` (postgres_changes) uses public channels. First move it to a private channel + add a `realtime.messages` select policy for its topic, verify against current Supabase docs, then flip.
- [x] **Sign-ups disabled** (`disable_signup = true`, set via Management API).
- [ ] Put the hosted URL + publishable + secret keys in Vercel env vars. Keys can be read with the access token (`GET /v1/projects/<ref>/api-keys?reveal=true`) — never print them.
- [ ] `host:add` each real host (1–3) against hosted: set `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SECRET_KEY` in the shell first (shell vars win over `--env-file`). Password typed by the user, not in chat.
- [x] `db:check` against hosted (same shell-var trick) → **19/19 pass** (2026-09-30).
- [ ] Hosted `site_url` is still `http://localhost:3000` — set to the Vercel URL at deploy.

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
