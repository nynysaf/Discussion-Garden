# Product Requirements Document
## **Discussion Garden** | *We Create Our Futures Festival*

**Version:** 0.2  
**Last updated:** 2026-09-30  
**Supersedes:** `Discussion_Garden_PRD_and_Design_Guide.md` (v0.1 — kept for reference)  
**Companion docs:** `DESIGN_GUIDE.md` (visual system) · `dev-plan-v0.1.md` (build roadmap + progress log)

### Changelog
- **v0.2 (2026-09-30):** Split design guide into `DESIGN_GUIDE.md`. Confirmed room layout (upstairs = live discussion + mic; downstairs = overflow captions + garden). STT committed to streaming Deepgram (Whisper is not live). Hybrid is the expected festival mode; Manual stays the fail-safe default on boot. Audience submissions stay **separate** from the garden. English only. Transcripts kept privately (no audio stored). Added data model, privacy/moderation, failure handling, success criteria, and scope cut lines for a < 2 week build. Standalone repo that **copies** map modules from Camp-CLAI.
- **v0.1:** Original PRD + design guide.

---

## 1. Executive Summary
**Discussion Garden** is a lightweight, real-time web application built for the *We Create Our Futures* festival. It captures live room microphone dialogue in the upstairs discussion room, streams closed captions to TV displays, presents schedule-aligned discussion prompts, collects audience questions via QR code, and grows an interactive **digital garden** that visualizes emerging conversation topics in real time.

> **Key Architectural Principle:** Always-On Cloud Transcription + Toggleable AI Synthesis.  
> The speech-to-text feed stays continuously active for closed captions. The garden can switch between manual host entry, AI drafts approved by the host (Hybrid), and fully automatic AI — and **captions must never depend on the AI pipeline**.

### 1.1 Goals
1. **Accessibility:** readable, low-latency live captions for everyone in the building.
2. **Inclusion of the overflow room:** downstairs attendees follow the conversation, the live question, and the growing garden.
3. **Participation:** anyone can send a question or reflection from their phone with zero login.
4. **Sense-making:** the garden makes the shape of the conversation visible as it grows, and leaves a record organizers can revisit after the festival.

### 1.2 Non-goals (this festival)
- Multi-language captions or translation.
- Audience accounts, voting, or reactions.
- Storing or replaying audio.
- Turning audience submissions into garden nodes (feed and garden stay separate).
- Integration with the CLara platform (standalone app; may borrow code only).

---

## 2. Rooms & Screens (confirmed)

| Location | What happens | Screens |
| :--- | :--- | :--- |
| **Upstairs — Discussion room** | Live conversation. Host laptop + microphone live here. | Host laptop (`/admin`), TV with **audience feed** (`/room-feed`) so facilitators can weave in questions |
| **Downstairs — Overflow room** | Attendees follow along remotely. | TV(s) with **captions + live question + garden + schedule + QR** (`/captions`) |
| **Everyone's phone** | Submit questions / reflections. | `/audience` via QR code |

> Open: how many TVs downstairs, their resolution (1080p vs 4K), and whether any TV upstairs should *also* show the garden (see §11).

---

## 3. System Architecture & Tech Stack

```
 UPSTAIRS (discussion room)
 ┌───────────────────────────────┐
 │ Host laptop — /admin          │
 │ • Mic intake (Web Audio)      │──── audio (WebSocket) ────►  Deepgram streaming STT
 │ • Schedule / live question    │◄─── interim + final text ──┘
 │ • Garden editor + draft queue │
 │ • Moderation queue            │──── final segments + edits ─►  Supabase (Postgres + Realtime)
 └───────────────────────────────┘                                     │
            │ every ~35s (Hybrid/Auto only)                            │ Realtime broadcast + row changes
            ▼                                                          ▼
   /api/synthesis → LLM (JSON proposals) ──► drafts / nodes    ┌─────────────────────────────┐
                                                               │ DOWNSTAIRS TV — /captions   │
 Phones — /audience ──► /api/submissions ──► moderation ──────►│ UPSTAIRS TV  — /room-feed   │
                                                               └─────────────────────────────┘
```

| Component | Technology | Role & rationale |
| :--- | :--- | :--- |
| **Frontend** | Next.js (App Router) + Tailwind CSS v4, hosted on Vercel | Same stack as Camp-CLAI, so map code copies over cleanly. |
| **Database & realtime** | Supabase (Postgres + Realtime) | Persists sessions, schedule, garden, submissions. Realtime **broadcast** carries live caption text; **row changes** carry garden/feed updates. |
| **Speech-to-text** | **Deepgram streaming** (latest Nova model; confirm at build time) | True word-by-word streaming with interim results. The browser gets a **short-lived token** from our server; the real API key never leaves the server. |
| **Post-event transcript (optional)** | OpenAI Whisper (batch) | Only if we later want a cleaner archival pass. Not live. |
| **Synthesis LLM** | OpenAI (small, fast model; name set via env var) | Every ~35s, reads the new transcript window **plus the current garden** and returns JSON proposals. |
| **Garden visualizer** | `d3-force` + SVG, adapted from Camp-CLAI `KnowledgeMap` | Tier gravity (seeds low, themes high) inside a force layout; plant sprites; curved vines. |

### 3.1 Why these choices
- **Captions go browser → Deepgram directly** (not through our server): Vercel serverless functions can't hold long-lived audio WebSockets, and a direct connection keeps latency lowest.
- **Live caption words are broadcast, not written row-by-row:** interim words change many times per second. Only **final** segments are saved to the database.
- **The admin browser drives the AI timer:** simplest reliable scheduler for a 2-day event — no background job service needed. Only one admin tab may run the timer (see §7).

---

## 4. Multi-Screen Views

### View 1: Host Admin Control Panel (`/admin`) — upstairs laptop
Requires host login (1–3 host accounts).
* **Live audio control:** Start / Pause / Resume / Stop; mic picker; input level meter; connection status (Live / Reconnecting / Paused / Offline).
* **Session picker:** choose the active session (e.g. `day_1_morning`).
* **Schedule & live question manager:** add/reorder schedule items; one click sets the **active live question** on all screens.
* **Synthesis mode toggle:** Manual · Hybrid · Auto (see §5). Boots in **Manual**.
* **Garden editor:** plant seeds, create sprouts, bloom themes, draw vines, edit/rename/delete, merge duplicates.
* **Draft queue (Hybrid):** AI proposals listed with Approve / Edit / Reject; "Approve all" for speed.
* **Moderation queue:** incoming audience submissions with Approve / Highlight / Dismiss.
* **Kill switches:** "Hide garden on TVs" and "Freeze captions" for emergencies.

### View 2: Downstairs Captions & Garden (`/captions`) — overflow TV
Read-only, no login, designed for viewing from 3–6 m (10–20 ft).
* **Header:** "Discussion Garden" + the active **Live Question**.
* **Live captions:** large high-contrast text, 2–3 visible lines, interim words styled lighter than final words.
* **Garden canvas:** published seeds, sprouts, themes, and vines, with gentle growth animation.
* **Schedule sidebar:** today's items with times; current item highlighted.
* **QR code:** persistent corner code linking to `/audience`.
* **Status:** subtle `[PAUSED]` / "Reconnecting…" indicator; never a blank screen.

### View 3: Participant Mobile Entry (`/audience`)
* **Zero login.** Text field (question, story, or reaction) + optional name/tag.
* **Consent line:** short note that submissions are moderated and may be shown on screens.
* **Confirmation:** friendly "Sent — thank you" state; allow another submission.
* **Limits:** max length (~500 chars), rate limit per device, basic profanity check before it reaches the host.

### View 4: Upstairs Room Feed (`/room-feed`) — discussion-room TV
* **Community board:** auto-scrolling list of host-approved submissions.
* **Highlight badge:** the submission the host marks as "being discussed now" is pinned and emphasized.
* **Live question** shown at top for context.

---

## 5. Garden Knowledge Graph & Synthesis

### 5.1 Node tiers
| Tier | Metaphor | Meaning | Placement |
| :--- | :--- | :--- | :--- |
| **Seed** | Planted seed / low plant | A specific experience, example, or fact voiced in discussion. | Ground level (bottom band) |
| **Sprout** | Growing stem | A shared principle connecting several seeds. Grows larger as it is revisited. | Middle band |
| **Theme** | Bloomed flower | A macro insight uniting several sprouts. | Top band |

**Vines** connect nodes: *grows-into* (seed → sprout, sprout → theme) and *relates-to* (cross-links, dotted).

**Growth:** each node has a `weight` (mention count). Revisiting a sprout increases its size up to a cap, so "sprouts grow as concepts are revisited" is visible.

### 5.2 Synthesis modes
* **Manual (boot default / fail-safe):** AI paused. Host plants and links nodes by hand.
* **Hybrid (expected festival mode):** every ~35s the AI proposes changes; they enter the **draft queue** and only reach the TVs once the host approves.
* **Auto:** AI proposals publish directly. Host can still edit/delete. Use only if Hybrid proves too busy.

### 5.3 AI synthesis contract
- **Input:** transcript text since the last run (with timestamps), the active live question, and a compact list of **existing published nodes** (id, tier, label).
- **Output (JSON):** `new_nodes[]`, `reinforce[]` (existing node ids to bump weight), `new_vines[]` (by id or label), each with a short rationale and the transcript segment ids it came from.
- **Rules:** prefer reinforcing an existing node over creating a near-duplicate; seeds must be grounded in something actually said; labels ≤ 6 words; skip windows with little substance.
- **Failure:** any AI error is logged and shown as a small admin notice; captions and the manual editor keep working.

---

## 6. Data Model (Supabase)

| Table | Key columns | Visibility |
| :--- | :--- | :--- |
| `sessions` | `id`, `slug` (`day_1_morning`), `title`, `day`, `starts_at`, `ends_at` | Public read |
| `schedule_items` | `id`, `session_id`, `title`, `question`, `starts_at`, `sort_order` | Public read |
| `app_state` (single row) | `active_session_id`, `active_schedule_item_id`, `synthesis_mode`, `audio_status`, `garden_hidden`, `highlighted_submission_id` | Public read, host write |
| `transcript_segments` | `id`, `session_id`, `text`, `start_ms`, `end_ms`, `created_at` | **Host only** (private archive) |
| `garden_nodes` | `id`, `session_id`, `tier` (seed/sprout/theme), `label`, `description`, `weight`, `status` (draft/published/rejected), `origin` (manual/ai), `source_segment_ids[]` | Public read of `published` only |
| `garden_vines` | `id`, `session_id`, `source_node_id`, `target_node_id`, `kind` (grows_into/relates_to), `status`, `origin` | Public read of `published` only |
| `synthesis_runs` | `id`, `session_id`, `window_start`, `window_end`, `mode`, `raw_output`, `error`, `created_at` | Host only (debug/audit) |
| `audience_submissions` | `id`, `session_id`, `body`, `name_tag`, `status` (pending/approved/highlighted/dismissed), `device_hash`, `created_at` | Public read of approved/highlighted only; inserts via server route |

- Garden is scoped per **session**; a festival-wide view (all sessions) is a stretch goal.
- Displays read with the public (anon) key and see only what RLS allows. Writes from the host go through authenticated requests; audience inserts go through a server route that rate-limits.

---

## 7. Operations, Privacy & Failure Handling

### Privacy & consent
- **Signage** in both rooms: "This discussion is live-captioned and summarized. Audio is not recorded."
- **No audio stored** anywhere. Transcript text is kept privately for organizers after the festival.
- Audience name/tag is optional; no emails or phone numbers collected.
- Nothing from the audience reaches a TV without host approval.

### Failure handling
| Failure | Behavior |
| :--- | :--- |
| Deepgram connection drops | Auto-reconnect with backoff; admin shows "Reconnecting"; TVs show a subtle indicator, last captions stay visible. |
| Wi-Fi drop on a TV | Realtime reconnects automatically; on reconnect the page re-fetches current state. |
| Host laptop sleeps / tab hidden | Screen Wake Lock while live; admin warns if the tab is backgrounded. Use a dedicated hotspot/router for the host laptop. |
| AI error or slow response | Skip that window, log it, keep going. Mode can drop to Manual in one click. |
| Two admin tabs open | Only the tab that pressed **Start** runs the mic and AI timer; others are view-only for those controls. |
| Pause | Stops sending audio to Deepgram (saves quota); garden stays on screen with `[PAUSED]`. |

### Session partitioning
Data is tagged by session (`day_1_morning`, `day_2_afternoon`, …) so history splits cleanly while still allowing a whole-festival export.

---

## 8. Success Criteria
- Captions appear on the downstairs TV within **~1.5 s** of speech during rehearsal and the festival.
- Zero caption outages longer than **30 s** that aren't caused by venue internet.
- In Hybrid, host can clear the draft queue in under **1 minute** per window on average.
- Every session ends with a garden of at least one theme and its supporting sprouts/seeds.
- Organizers can export each session's garden (JSON + PNG) and transcript after the festival.

---

## 9. Scope for a < 2 Week Build

**Must have (festival fails without these)**
1. Live captions upstairs mic → downstairs TV, with pause/resume and reconnect.
2. Schedule + live question on all screens.
3. Audience submission → moderation → upstairs room feed.
4. Garden canvas on `/captions` with **Manual** editing.

**Should have**
5. Hybrid AI drafts + approval queue.
6. Garden export (JSON + PNG) and transcript export.

**Nice to have (cut first if behind)**
7. Auto mode.
8. Festival-wide garden view.
9. Garden growth timelapse for the closing session.

---

## 10. Cost Estimate (rough — verify current pricing)
- **STT:** ~2 days × ~8 live hours ≈ 960 minutes of streaming. Check Deepgram's current per-minute rate; likely tens of dollars.
- **LLM:** ~35s windows ≈ 1,650 calls with small prompts on a small model; likely a few dollars.
- **Supabase / Vercel:** free/hobby tiers should suffice; confirm Realtime connection limits vs number of TVs + phones.

---

## 11. Open Questions
1. **Exact festival dates** and daily schedule (needed for session slugs and the build deadline).
2. Number and resolution of TVs; are they smart TVs, laptops, or streaming sticks running a browser?
3. Mic hardware: one room mic, a mixer feed from existing PA, or lapel mics? (The biggest driver of caption quality.)
4. Who operates `/admin` during sessions — the host themself or a dedicated operator? (Hybrid works best with a dedicated operator.)
5. Final brand assets: official fonts licensing, poster art for the garden background, logo files.
6. Should the downstairs TV show the garden and captions side-by-side, or alternate full-screen?
7. Venue internet: is a wired connection or dedicated hotspot available upstairs?
