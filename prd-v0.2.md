# Product Requirements Document
## **Discussion Garden** | *We Create Our Futures Festival*

**Version:** 0.2.4  
**Last updated:** 2026-09-30  
**Festival:** Oct 16–18, 2026 · **Discussion Garden live:** Sat Oct 17 & Sun Oct 18, 11:00–17:00  
**Supersedes:** `Discussion_Garden_PRD_and_Design_Guide.md` (v0.1 — kept for reference)  
**Companion docs:** `DESIGN_GUIDE.md` (visual system) · `dev-plan-v0.1.md` (build roadmap + progress log)

### Changelog
- **v0.2.5 (2026-09-30):** `/captions` schedule is a **Now · Next strip** (per DESIGN_GUIDE v0.2.1), not a sidebar. "Now" = the item the host put live, not the clock (sessions run late).
- **v0.2.4 (2026-09-30):** Host allowlist is a `hosts` table (checked by RLS), not an env var; public sign-up disabled. `transcript_segments` gains `bubble_id` (unique) so saves can be retried safely. Caption broadcast uses a **private** realtime channel — only hosts can send to the TVs.
- **v0.2.3 (2026-09-30):** Voices are **never named** — each is labelled with a **garden-animal emoji** (🐸 🐦 🐞 🦋 🐝 🐛 …). Deepgram **Nova-3 (English)** on the **free $200 credit**, with `mip_opt_out=true` so Deepgram doesn't keep audio for model training. Cost section updated with published rates. GitHub repo is **public**.
- **v0.2.2 (2026-09-30):** Deepgram confirmed for captions. Captions now **separate speakers** (Deepgram diarization) and show as a **sequence of speech bubbles** — one sentence per bubble, colour-coded per voice with a text label. Admin toggle to fall back to single-colour bubbles. No fixed build calendar (build order only).
- **v0.2.1 (2026-09-30):** Dates confirmed (festival Oct 16–18; garden live Oct 17 & 18, 11:00–17:00). **One shared garden across both days** — Day 2 grows from Day 1's garden, never resets. Sessions = days (`day_1`, `day_2`) for transcript/export partitioning only. Recording is one continuous stream per day; transcript saves automatically in short segments, so no manual chunking. Cost estimate updated to ~12 live hours.
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

### 2.1 Schedule
| Date | What | Sessions |
| :--- | :--- | :--- |
| Fri Oct 16 | Festival day 1 — Discussion Garden **not** live | Venue setup + full rehearsal (target) |
| Sat Oct 17 | Discussion Garden live 11:00–17:00 | `day_1` |
| Sun Oct 18 | Discussion Garden live 11:00–17:00 | `day_2` |

Times are venue-local (assumed Eastern, UTC-4 — confirm). Schedule items (topics / live questions) sit inside each day.

### 2.2 One garden, two days
Both days grow **the same garden**. Sunday opens with Saturday's garden already on screen and keeps growing it. Sessions (`day_1`, `day_2`) only split the private transcript and exports; they never filter or reset the garden. Each node remembers which day it first appeared (`origin_session_id`), so a later "which day did this come from" tint or filter is possible without changing the data.

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
| **Speech-to-text** | **Deepgram streaming, Nova-3 Monolingual (English)** with **diarization**, smart formatting, and `mip_opt_out=true`; on Deepgram's **free $200 credit** | True word-by-word streaming with interim results, plus a speaker number on every word so captions can separate voices. Nova-3 is Deepgram's recommended model for crosstalk and far-field (room mic) audio. The browser gets a **30-second temporary token** from our server (only needed to open the connection); the real API key never leaves the server. |
| **Post-event transcript (optional)** | OpenAI Whisper (batch) | Only if we later want a cleaner archival pass. Not live. |
| **Synthesis LLM** | OpenAI (small, fast model; name set via env var) | Every ~35s, reads the new transcript window **plus the current garden** and returns JSON proposals. |
| **Garden visualizer** | `d3-force` + SVG, adapted from Camp-CLAI `KnowledgeMap` | Tier gravity (seeds low, themes high) inside a force layout; plant sprites; curved vines. |

### 3.1 Why these choices
- **Captions go browser → Deepgram directly** (not through our server): Vercel serverless functions can't hold long-lived audio WebSockets, and a direct connection keeps latency lowest.
- **Live caption words are broadcast, not written row-by-row:** interim words change many times per second. Only **final** segments are saved to the database.
- **No manual recording chunks:** each day runs as one continuous live stream (Start at 11:00, Pause for breaks, Stop at 17:00). Deepgram returns text in short "final" segments (a sentence or so each), and each is saved as its own row. If the connection drops, the app reconnects and carries on — the transcript simply continues. No audio file exists, so there's nothing to split.
- **The admin browser drives the AI timer:** simplest reliable scheduler for a 2-day event — no background job service needed. Only one admin tab may run the timer (see §7).

---

## 4. Multi-Screen Views

### View 1: Host Admin Control Panel (`/admin`) — upstairs laptop
Requires host login (1–3 host accounts).
* **Live audio control:** Start / Pause / Resume / Stop; mic picker; input level meter; connection status (Live / Reconnecting / Paused / Offline).
* **Day picker:** choose the active session (`day_1` or `day_2`). Switching day changes where transcript segments are filed — the garden stays the same.
* **Schedule & live question manager:** add/reorder schedule items; one click sets the **active live question** on all screens.
* **Synthesis mode toggle:** Manual · Hybrid · Auto (see §5). Boots in **Manual**.
* **Garden editor:** plant seeds, create sprouts, bloom themes, draw vines, edit/rename/delete, merge duplicates.
* **Draft queue (Hybrid):** AI proposals listed with Approve / Edit / Reject; "Approve all" for speed.
* **Moderation queue:** incoming audience submissions with Approve / Highlight / Dismiss.
* **Kill switches:** "Hide garden on TVs", "Freeze captions", and "Speaker colours" on/off.

### View 2: Downstairs Captions & Garden (`/captions`) — overflow TV
Read-only, no login, designed for viewing from 3–6 m (10–20 ft).
* **Header:** "Discussion Garden" + the active **Live Question**.
* **Live captions as speech bubbles:** each sentence appears as its own bubble, colour-coded by speaker and marked with that voice's animal emoji (🐸, 🐦, 🐞…); newest at the bottom, older bubbles scroll up. Words still being recognized appear lighter inside the newest bubble. See §4.1.
* **Garden canvas:** published seeds, sprouts, themes, and vines, with gentle growth animation.
* **Now · Next strip:** the live item and the one after it, with venue times; "now" highlighted.
* **QR code:** persistent corner code linking to `/audience`.
* **Status:** subtle `[PAUSED]` / "Reconnecting…" indicator; never a blank screen.

### 4.1 Caption bubbles & speaker separation
**What the audience sees:** a chat-like column of bubbles. A new bubble starts when **the sentence ends** or **the speaker changes**. Each voice gets its own bubble colour **and** its own garden-animal emoji, so colour isn't the only cue.

**Voices are never named.** No real names, roles, or initials appear on any screen — only the animal.

| Voice | Emoji | Colour |
| :--- | :--- | :--- |
| 1 | 🐸 Frog | Forest |
| 2 | 🐦 Bird | Denim |
| 3 | 🐞 Ladybug | Terracotta |
| 4 | 🦋 Butterfly | Lavender |
| 5 | 🐝 Bee | Marigold |
| 6 | 🐛 Caterpillar | Pistachio |
| 7–12 | 🦔 Hedgehog · 🐌 Snail · 🦉 Owl · 🐇 Rabbit · 🐢 Turtle · 🐿️ Squirrel | Colours 1–6 repeat |

**How it works:** Deepgram tags every word with a speaker number (0, 1, 2…). A small pure helper (`buildCaptionBubbles`) turns the word stream into bubbles: same speaker + unfinished sentence → keep adding to the bubble; sentence punctuation (`.` `?` `!`) or a different speaker → start a new bubble. The host laptop does this and broadcasts finished and in-progress bubbles to the TVs.

**Known limits (set expectations):**
- **Speakers are anonymous by design** — Deepgram knows "voice 1 vs voice 2", not who they are, and we keep it that way.
- **Animals can reshuffle after a reconnect.** Each new Deepgram connection starts counting speakers from scratch, so after a Wi-Fi drop the same person may come back as a different animal. Minimizing reconnects (wired/hotspot internet) keeps colours stable.
- **Accuracy depends on audio.** Clear mic pickup of each speaker matters most; very short interjections ("yeah", "mm") and overlapping talk may be attributed to the wrong voice.
- **More than 6 voices** reuse colours but still get a unique animal (up to 12, then animals repeat too).

**Host controls:** "Speaker colours" on/off (off = single-colour bubbles with no animals, still one sentence per bubble) in case diarization misbehaves in the room.

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
- **Input:** transcript text since the last run (with timestamps), the active live question, and a compact list of **existing published nodes** (id, tier, label) from the whole two-day garden. If the garden grows past ~150 nodes, send all themes + sprouts and only the most recent/heaviest seeds to keep the prompt small.
- **Output (JSON):** `new_nodes[]`, `reinforce[]` (existing node ids to bump weight), `new_vines[]` (by id or label), each with a short rationale and the transcript segment ids it came from.
- **Rules:** prefer reinforcing an existing node over creating a near-duplicate; seeds must be grounded in something actually said; labels ≤ 6 words; skip windows with little substance.
- **Failure:** any AI error is logged and shown as a small admin notice; captions and the manual editor keep working.

---

## 6. Data Model (Supabase)

| Table | Key columns | Visibility |
| :--- | :--- | :--- |
| `sessions` | `id`, `slug` (`day_1`, `day_2`), `title`, `date`, `starts_at`, `ends_at` | Public read |
| `schedule_items` | `id`, `session_id`, `title`, `question`, `starts_at`, `sort_order` | Public read |
| `app_state` (single row) | `active_session_id`, `active_schedule_item_id`, `synthesis_mode`, `audio_status`, `garden_hidden`, `speaker_colours_on`, `highlighted_submission_id` | Public read, host write |
| `hosts` | `email` (lowercase) — 1–3 host accounts allowed into `/admin` | No client access (managed by script) |
| `transcript_segments` | `id`, `bubble_id` (unique), `session_id`, `connection_id`, `speaker` (Deepgram number within that connection), `text` (one sentence/bubble), `start_ms`, `end_ms`, `created_at` | **Host only** (private archive) |
| `garden_nodes` | `id`, `tier` (seed/sprout/theme), `label`, `description`, `weight`, `status` (draft/published/rejected), `origin` (manual/ai), `origin_session_id`, `source_segment_ids[]` | Public read of `published` only |
| `garden_vines` | `id`, `source_node_id`, `target_node_id`, `kind` (grows_into/relates_to), `status`, `origin`, `origin_session_id` | Public read of `published` only |
| `synthesis_runs` | `id`, `session_id`, `window_start`, `window_end`, `mode`, `raw_output`, `error`, `created_at` | Host only (debug/audit) |
| `audience_submissions` | `id`, `session_id`, `body`, `name_tag`, `status` (pending/approved/highlighted/dismissed), `device_hash`, `created_at` | Public read of approved/highlighted only; inserts via server route |

- There is **one garden for the whole festival**. Garden tables have no session filter; `origin_session_id` records provenance only.
- Displays read with the public (anon) key and see only what RLS allows. Writes from the host go through authenticated requests; audience inserts go through a server route that rate-limits.

---

## 7. Operations, Privacy & Failure Handling

### Privacy & consent
- **Signage** in both rooms: "This discussion is live-captioned and summarized. Audio is not recorded."
- **No audio stored** anywhere. Transcript text is kept privately for organizers after the festival.
- **Deepgram opt-out:** every connection sends `mip_opt_out=true`, so Deepgram keeps audio only as long as needed to transcribe it and never uses it for model training. Without this flag, Deepgram may store samples — which would contradict the signage.
- **Voices are anonymous** on every screen (animal emoji only).
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
| Long silence while Live | App sends keep-alive messages so Deepgram doesn't close an idle connection; if it closes anyway, reconnect as above. |
| Overnight between days | Nothing runs. Sunday: pick `day_2`, press Start — the garden is already there. |

### Session partitioning
Transcript segments and synthesis runs are tagged by day (`day_1`, `day_2`) so organizers can export each day's transcript separately. The garden is shared and exported as one festival garden (with each node's origin day).

---

## 8. Success Criteria
- Captions appear on the downstairs TV within **~1.5 s** of speech during rehearsal and the festival.
- Zero caption outages longer than **30 s** that aren't caused by venue internet.
- In rehearsal with 3+ people talking, a change of speaker starts a new, differently coloured bubble in the large majority of turns; each bubble holds one sentence.
- In Hybrid, host can clear the draft queue in under **1 minute** per window on average.
- Sunday 11:00 opens with Saturday's garden intact, and by 17:00 Sunday the garden holds themes supported by seeds from **both** days.
- Organizers can export the festival garden (JSON + PNG) and each day's transcript after the festival.

---

## 9. Scope for a < 2 Week Build

**Must have (festival fails without these)**
1. Live captions upstairs mic → downstairs TV as one-sentence speech bubbles, colour-coded by speaker (with single-colour fallback), with pause/resume and reconnect.
2. Schedule + live question on all screens.
3. Audience submission → moderation → upstairs room feed.
4. Garden canvas on `/captions` with **Manual** editing, persisting across both days.

**Should have**
5. Hybrid AI drafts + approval queue.
6. Garden export (JSON + PNG) and transcript export.

**Nice to have (cut first if behind)**
7. Auto mode.
8. Day tint/filter on the garden ("show what grew on Sunday").
9. Garden growth timelapse for the Sunday close (replays both days).

---

## 10. Cost Estimate (rough — verify current pricing)
- **STT (Deepgram, published rates 2026-09-30):** Nova-3 English streaming **$0.0048/min** (limited-time promo; regular $0.0077) + speaker diarization add-on **$0.0020/min** ≈ **$0.41–$0.58 per live hour**.
  - Festival: 2 days × 6 h = 720 min max → **~$5–7**.
  - Building + testing + rehearsal (allow ~20 h) → **~$8–12**.
  - **Free $200 credit** (one-time, no expiry, no credit card) covers roughly **340–490 hours** of streaming — far more than we need. Streaming concurrency on the free/pay-as-you-go tier is up to 150 connections; we use 1.
  - Pause stops sending audio, which saves credit. Watch usage in the Deepgram console after the first test.
- **LLM:** 12 hours ÷ ~35s windows ≈ **~1,250 calls** with small prompts on a small model; likely a few dollars.
- **Supabase / Vercel:** free/hobby tiers should suffice; confirm Realtime connection limits vs number of TVs + phones.

---

## 11. Open Questions
1. **Daily topic schedule** within 11:00–17:00 (live questions + times), and whether there's a lunch break to Pause through.
2. Can we get into the venue on **Fri Oct 16** for setup and a rehearsal with the real mic and TVs? Confirm venue time zone.
3. Number and resolution of TVs; are they smart TVs, laptops, or streaming sticks running a browser?
4. Mic hardware: one room mic, a mixer feed from existing PA, or lapel mics? (The biggest driver of caption quality **and** of how well voices are told apart.)
5. Who operates `/admin` during sessions — the host themself or a dedicated operator? (Hybrid works best with a dedicated operator; 6-hour days are long for one person.)
6. Final brand assets: official fonts licensing, poster art for the garden background, logo files.
7. Should the downstairs TV show the garden and captions side-by-side, or alternate full-screen?
8. Venue internet: is a wired connection or dedicated hotspot available upstairs? (Fewer reconnects = more stable speaker colours.)
