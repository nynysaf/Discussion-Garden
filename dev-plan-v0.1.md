# Discussion Garden — Development & Implementation Plan

**Version:** 0.1  
**Last updated:** 2026-09-30 (plan created; no code yet)  
**Target tool:** Cursor (AI coding assistant)  
**Tech stack:** Next.js (App Router) · Tailwind CSS v4 · Supabase (Postgres, Auth, Realtime) · Vercel · Deepgram (streaming STT) · OpenAI (synthesis) · `d3-force`  
**Companion docs:** `prd-v0.2.md` (product) · `DESIGN_GUIDE.md` (visual)  
**Reference project:** Camp-CLAI (`C:\Users\narya\OneDrive\Documents\GitHub\Camp-CLAI`) — copy code, don't import it.  
**Deadline:** festival date **TBD — less than 2 weeks from 2026-09-30**. Fill in exact dates in §4.

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
| Repo | Standalone, **public while building** (Vercel Hobby) unless the team decides otherwise | Simple deploys; forces good secret hygiene |
| Live STT | Browser → Deepgram WebSocket, using a short-lived token from `/api/deepgram-token` | Vercel functions can't hold long audio sockets; lowest latency; key stays server-side |
| Caption fan-out | Supabase Realtime **broadcast** channel (`captions:{sessionId}`) for interim + final text; only **final** segments saved to `transcript_segments` | Interim words change many times per second — too chatty for DB writes |
| Garden/feed/state sync | Supabase Realtime **Postgres changes** on `garden_nodes`, `garden_vines`, `audience_submissions`, `app_state` | TVs update automatically when rows change; on reconnect, re-fetch |
| AI scheduler | Admin tab calls `/api/synthesis` every ~35s while Live and mode ≠ Manual | No background job service needed for a 2-day event |
| Host auth | Supabase Auth email/password; host emails in an allowlist (env or `hosts` table) | Reuses Camp-CLAI patterns; displays + audience need no login |
| Audience writes | `/api/submissions` server route: length check, profanity check, per-device rate limit, then insert with the secret key | Anonymous inserts shouldn't hit the DB directly |
| Garden layout | `d3-force` + `forceY` per tier (seeds low, themes high) + collide; freeze after settle | Garden-bed shape, calm on TVs |

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
**Phase 0 — not started.** Docs created 2026-09-30.

### Festival facts (fill in)
- Festival dates: **TBD**
- Session slugs: **TBD** (e.g. `day_1_morning`, `day_1_afternoon`, `day_2_morning`, `day_2_afternoon`)
- Rehearsal date/time at venue: **TBD**
- Production URL: **TBD**

### Shipped
- 2026-09-30 — `prd-v0.2.md`, `DESIGN_GUIDE.md`, `dev-plan-v0.1.md`, `.cursorrules`, git repo initialized on `main`.

### In progress
- *(none)*

### Decisions (must remember)
- 2026-09-30 — Standalone repo; **copy** map modules from Camp-CLAI.
- 2026-09-30 — Upstairs = discussion + mic + `/admin` + `/room-feed`. Downstairs = overflow `/captions`.
- 2026-09-30 — Garden canvas is **light cream poster paper** (not Camp-CLAI's dark map).
- 2026-09-30 — Expected mode **Hybrid**; app boots in **Manual** (fail-safe).
- 2026-09-30 — Audience submissions do **not** become garden nodes.
- 2026-09-30 — **English only.**
- 2026-09-30 — Transcripts kept **privately** after the festival; **no audio stored**.
- 2026-09-30 — Streaming STT = **Deepgram**; Whisper is not used live.

### Blocked / open
- Exact festival dates and schedule.
- TV count, resolution, and what device runs the browser on each TV.
- Mic hardware and whether we can take a feed from the venue PA/mixer.
- Who operates `/admin` during sessions (host vs dedicated operator).
- Accounts needed: Supabase project, Vercel project, Deepgram account + API key, OpenAI API key, GitHub repo (public or private?).
- Official poster art / fonts license for the garden frame.

---

## 5. Phase plan (< 2 weeks)

Build order follows the PRD's **Must → Should → Nice** list. If a day slips, cut from the bottom (§5.9), never from captions.

### Phase 0 — Project setup *(Day 1)*
- [ ] Create Next.js app. `create-next-app` refuses non-empty folders and names with spaces, so scaffold into a temp folder (e.g. `npx create-next-app@latest dg-scaffold --ts --tailwind --app --src-dir --eslint`) and move its contents up into this folder.
- [ ] Read `node_modules/next/dist/docs/` for any version-specific changes before writing code.
- [ ] Add Tailwind v4 tokens + fonts from `DESIGN_GUIDE.md` §3–4.
- [ ] `.env.example` with placeholder names only (see §6).
- [ ] Create GitHub repo, push `main`, connect Vercel, add env vars in Vercel.
- **Test:** home page renders in cream/ink with Cormorant title; Vercel preview deploys from `main`.

### Phase 1 — Data + realtime spine *(Day 2)*
- [ ] Migration `0001_core.sql`: tables from PRD §6 + RLS (public read of published/approved; host write; transcripts host-only).
- [ ] Seed script for sessions + schedule items.
- [ ] Host login (`/login`) + allowlist check protecting `/admin`.
- [ ] Route shells: `/admin`, `/captions`, `/audience`, `/room-feed`.
- [ ] `src/lib/realtime/` helpers: subscribe to `app_state` + broadcast channel; re-fetch on reconnect.
- **Test:** change `app_state.active_schedule_item_id` in Supabase → both TV routes update within ~1s without reload. Logged-out user cannot open `/admin`.

### Phase 2 — Live captions *(Days 3–4)* — **MUST**
- [ ] `/api/deepgram-token` (host-only) returns a short-lived token.
- [ ] Admin mic capture (mic picker, level meter) → Deepgram WebSocket with interim results.
- [ ] Broadcast interim/final to `captions:{sessionId}`; insert final segments into `transcript_segments`.
- [ ] `/captions` caption band per `DESIGN_GUIDE.md` §5.
- [ ] Pause/Resume/Stop; auto-reconnect with backoff; wake lock; "tab hidden" warning; single-controller lock.
- **Test:** speak upstairs-style into laptop → second browser shows captions in ≤ ~1.5s; pull Wi-Fi 10s → reconnects and resumes; Pause shows `[PAUSED]` and stops Deepgram usage.

### Phase 3 — Schedule + live question + QR *(Day 5)* — **MUST**
- [ ] Admin schedule manager (add/edit/reorder, set active).
- [ ] Live Question header on `/captions` and `/room-feed`; schedule sidebar; QR to `/audience` (`qrcode` package, as in Camp-CLAI).
- **Test:** set active item on admin → both TVs update; QR scanned from a phone opens `/audience`.

### Phase 4 — Audience → moderation → room feed *(Day 6)* — **MUST**
- [ ] `/audience` form + confirmation + consent line.
- [ ] `/api/submissions`: length limit, profanity check, per-device rate limit, insert.
- [ ] Admin moderation queue: Approve / Highlight / Dismiss (realtime).
- [ ] `/room-feed` board + highlighted pin.
- **Test:** submit from 2 phones → appear in admin within ~1s; approve → room feed shows it; highlight → pinned; spam 10 rapid submissions → rate-limited with friendly message.

### Phase 5 — Garden canvas + Manual editor *(Days 7–8)* — **MUST**
- [ ] Copy + adapt layout/curves/sprites (§3); pure helpers in `src/lib/garden/` with unit tests if a runner exists.
- [ ] `GardenCanvas` renders published nodes/vines with tier bands, sprites, labels, growth animation; freezes after settle.
- [ ] Admin editor: plant seed, create sprout, bloom theme, draw vine, rename, delete, merge; "Hide garden on TVs".
- [ ] Verify Camp-CLAI Plant sprites on cream; swap or fall back to circles if they clash.
- **Test:** plant 15 nodes across tiers → TV shows seeds low, themes high, no overlaps, no continuous jitter; reduced-motion shows no pulses.

### Phase 6 — Hybrid AI synthesis *(Day 9)* — SHOULD
- [ ] `/api/synthesis` (host-only): builds window + current garden → OpenAI JSON → validates → inserts **draft** nodes/vines (Hybrid) or **published** (Auto); logs to `synthesis_runs`.
- [ ] Admin timer (~35s) only while Live and mode ≠ Manual; skip if previous call still running.
- [ ] Draft queue UI: Approve / Edit / Reject / Approve all; `reinforce` bumps weight on approve.
- **Test:** 5 minutes of sample talk → drafts arrive, no near-duplicates of existing nodes; force an API error → admin notice, captions unaffected; switch to Manual → timer stops.

### Phase 7 — Hardening + export + rehearsal *(Day 10)* — SHOULD
- [ ] Export per session: garden JSON + PNG, transcript text (host-only).
- [ ] Real TV test at venue (or same model TV): caption size, safe area, contrast from back row.
- [ ] Run the §7 failure drills.
- **Test:** full 30-minute dress rehearsal with a real mic and all four screens.

### Phase 8 — Nice to have (only if ahead)
- [ ] Auto mode polish · festival-wide garden view · growth timelapse for closing.

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
DEEPGRAM_API_KEY=                     # server only — used to mint short-lived tokens
OPENAI_API_KEY=                       # server only
OPENAI_SYNTHESIS_MODEL=               # small/fast chat model name
HOST_EMAILS=                          # comma-separated allowlist for /admin
```

---

## 7. Festival runbook (fill in during Phase 7)

### Day before
- [ ] Test every TV browser loads its URL full-screen (F11 / kiosk) and survives a Wi-Fi toggle.
- [ ] Mic check upstairs from the actual seating positions.
- [ ] Confirm Deepgram + OpenAI credit / billing limits.
- [ ] Print consent signage for both rooms.

### Each session
- [ ] Admin: select session → confirm schedule → mode Manual → **Start** audio → check downstairs captions.
- [ ] Switch to Hybrid once captions are stable.
- [ ] Pause during breaks; Stop at session end; export.

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
