# Discussion Garden — Visual Design Guide

**Version:** 0.2.2 · 2026-09-30  
**Applies to:** all four views (`/admin`, `/captions`, `/audience`, `/room-feed`).  
**Companion:** `prd-v0.2.md` · `dev-plan-v0.1.md`  
**Changelog:** v0.2.2 voices get garden-animal emoji (self-hosted SVG) instead of "Voice N" labels; no names ever. v0.2.1 caption speech bubbles colour-coded per speaker (§5.2), captions move to a tall right column, schedule becomes a Now · Next strip. v0.2 split out of the original PRD; Tailwind v4 tokens; contrast rules; TV display rules; garden canvas spec (light "poster paper" canvas, confirmed 2026-09-30).

> Tell your AI coding agent: **"Use these tokens as the single source of truth. Never hard-code colors or fonts; always reference the token."**

---

## 1. Design intent

The festival poster is warm, hand-illustrated, and paper-like, framed in foliage. The app should feel like **that poster came alive**: cream paper, ink headlines, a garden that grows quietly as people talk.

**Three words:** warm · legible · alive.

- ✅ Paper textures, soft shadows, illustrated plants, slow organic growth, big clear captions.
- ❌ Dark dashboards, neon, busy animation, anything that makes captions harder to read.

---

## 2. Color

### 2.1 Palette (from the festival poster)

| Token | Hex | Poster source | Use |
| :--- | :--- | :--- | :--- |
| `festival-green` (Pistachio) | `#A8D580` | Outer foliage frame | Frames, active borders, sprout fills, accents |
| `festival-forest` | `#3B5B28` | Dark foliage speckles | Primary buttons, headings on cream, stems / grows-into vines |
| `festival-cream` | `#FAF8F5` | Poster paper | Page and canvas background |
| `festival-ink` | `#1A1C1A` | Poster headline | Body text, captions, titles |
| `festival-marigold` | `#EE9A23` | CSI sunburst | Live Question badge fill, theme (bloom) nodes, "now" highlights |
| `festival-terracotta` | `#C86A58` | Illustration accent | Seed nodes, soil band tint |
| `festival-lavender` | `#9682AF` | Illustration accent | Secondary tags, theme-to-theme bridges |
| `festival-denim` | `#4C6D8C` | Illustration accent | Relates-to vines, links, info states |

### 2.2 Contrast rules (measured, WCAG)

| Pairing | Ratio | Allowed for |
| :--- | :--- | :--- |
| Ink on cream | 16.2 : 1 | Everything — **captions use this** |
| Forest on cream | 7.3 : 1 | Any text |
| Denim on cream | 5.1 : 1 | Body text, links |
| Terracotta on cream | 3.5 : 1 | Large text (≥ 24px bold / 32px) and graphics only |
| Lavender on cream | 3.2 : 1 | Large text and graphics only |
| Marigold on cream | 2.1 : 1 | **Never text.** Fills/graphics only |
| Pistachio on cream | 1.6 : 1 | **Never text.** Fills/frames only |
| Ink on marigold | 7.6 : 1 | Live Question badge text |
| Ink on pistachio | 10.2 : 1 | Text on green fills |
| Cream on forest | 7.3 : 1 | Primary button text |

Don't rely on color alone for status — always pair with a word or icon.

---

## 3. Typography

- **Display (title header):** `Cormorant Garamond` (fallback `Cinzel`), all-caps, semibold/bold, letter-spacing `0.05em`.
- **Question banners:** `Cormorant Garamond` italic, medium.
- **Captions & UI body:** `Plus Jakarta Sans` (fallback `Inter`), medium/semibold, line-height `1.35`.
- Load fonts with `next/font/google` and expose them as CSS variables (no external `<link>` tags).

Cormorant is elegant but thin at small sizes — **never use it for captions or text under 24px**.

---

## 4. Tailwind v4 tokens (drop-in)

Tailwind v4 defines theme values in CSS, not `tailwind.config.js`. Put this in `src/app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-festival-green: #A8D580;
  --color-festival-forest: #3B5B28;
  --color-festival-cream: #FAF8F5;
  --color-festival-ink: #1A1C1A;
  --color-festival-marigold: #EE9A23;
  --color-festival-terracotta: #C86A58;
  --color-festival-lavender: #9682AF;
  --color-festival-denim: #4C6D8C;

  --font-display: var(--font-cormorant), "Cinzel", serif;
  --font-caption: var(--font-jakarta), "Inter", system-ui, sans-serif;

  /* caption speaker slots — strip / bubble tint (see §5.2) */
  --color-voice-1: #3B5B28; --color-voice-1-tint: #D0D5C8;
  --color-voice-2: #4C6D8C; --color-voice-2-tint: #D4D9DE;
  --color-voice-3: #C86A58; --color-voice-3-tint: #EFD9D2;
  --color-voice-4: #9682AF; --color-voice-4-tint: #E4DEE6;
  --color-voice-5: #1A1C1A; --color-voice-5-tint: #F7E3C7;
  --color-voice-6: #1A1C1A; --color-voice-6-tint: #E8F0DB;

  --shadow-poster: 0 4px 20px -2px rgba(26, 28, 26, 0.08);

  --ease-garden: cubic-bezier(.22, .61, .36, 1);
}
```

This generates classes like `bg-festival-cream`, `text-festival-ink`, `font-display`, `font-caption`, `shadow-poster`.

---

## 5. TV display rules (`/captions`, `/room-feed`)

TVs are read from 3–6 m (10–20 ft) by people who can't interact with them.

- **No hover or click required** to understand anything. No tooltips on TV views.
- **Caption size:** start at **44–48px** on a 1080p screen (scale with `vh`/`clamp()`), tune in rehearsal from the back row.
- **Caption bubbles:** one sentence per bubble, newest at the bottom; older bubbles scroll up and fade out near the top. Aim for 4–6 visible bubbles. Final words in `festival-ink`; still-changing words at ~60% opacity inside the newest bubble. See §5.2.
- **Safe area:** keep content ≥ 3% from every edge (some TVs overscan/crop).
- **Status is subtle but present:** `[PAUSED]`, "Reconnecting…" in a small pill — never a blank or frozen-looking screen.
- **Motion on TV:** calm. The garden settles and **stops moving**; only new/changed nodes animate.

### 5.1 `/captions` layout (16:9, draft)

```
┌──────────────────────────────────────────────────────────────────┐
│ DISCUSSION GARDEN          [ LIVE QUESTION: "How might we…" ]    │  ~14%
├─────────────────────────────────────┬────────────────────────────┤
│                                     │ ┃🐸 That's what I noticed. │
│                                     │                            │
│          GARDEN CANVAS              │     ┃🐦 Can you say more?  │
│  (themes top · sprouts middle ·     │                            │
│   seeds in the soil)                │ ┃🐸 Sure — last spring we… │  ~72%
│                                     │                            │
│                                     │                            │
├─────────────────────────────────────┴──────────────┬─────────────┤
│ NOW 11:00 Topic A  ·  NEXT 12:30 Topic B  ·  …      │  QR  Join → │  ~14%
└─────────────────────────────────────────────────────┴─────────────┘
   garden ~58% width                    caption column ~42% width
```
Captions get a tall right column because bubbles need vertical room. The schedule becomes a compact "Now · Next" strip along the bottom with the QR code. Open question: this side-by-side layout vs alternating full-screen garden — decide after the first TV test.

### 5.2 Caption bubbles & speaker colours

**Bubble anatomy:** rounded card (`16px` radius, slightly organic corner on the speaker side), light tinted background, a **6px coloured strip** on the left edge, the voice's **animal emoji** at the start (≈0.9× caption size, vertically centred on the first line), and the sentence in ink. **No names or text labels** — voices are anonymous; the emoji is the non-colour cue. For screen readers, each bubble has `aria-label="Frog: <sentence>"` (animal name only).

**Alignment:** alternate speakers get a slight indent (e.g. odd voices flush left, even voices indented ~8%) so turn-taking reads at a glance, like a conversation — without a two-sided phone-chat layout that wastes width.

**Speaker palette** (tints = 22% colour on cream; ink text on every tint measures ≥ 11 : 1):

| Voice | Emoji | Strip colour | Bubble tint | Strip vs cream |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 🐸 Frog | `festival-forest` `#3B5B28` | `#D0D5C8` | 7.3 : 1 ✅ |
| 2 | 🐦 Bird | `festival-denim` `#4C6D8C` | `#D4D9DE` | 5.1 : 1 ✅ |
| 3 | 🐞 Ladybug | `festival-terracotta` `#C86A58` | `#EFD9D2` | 3.5 : 1 ✅ |
| 4 | 🦋 Butterfly | `festival-lavender` `#9682AF` | `#E4DEE6` | 3.2 : 1 ✅ |
| 5 | 🐝 Bee | `festival-ink` strip | `#F7E3C7` (marigold tint) | 16 : 1 ✅ |
| 6 | 🐛 Caterpillar | `festival-ink` strip, dashed | `#E8F0DB` (pistachio tint) | 16 : 1 ✅ |
| 7–12 | 🦔 Hedgehog · 🐌 Snail · 🦉 Owl · 🐇 Rabbit · 🐢 Turtle · 🐿️ Squirrel | colours 1–6 repeat | | |

- Marigold and pistachio are too pale for strips on cream, so voices 5–6 use an ink strip (dashed for 6) with their tint as the bubble background.
- Voices 7–12 reuse colours 1–6 but keep a unique animal. After 12, both repeat.
- **Speaker colours off** (admin toggle): all bubbles use `festival-cream` with a `festival-green` border and no emoji — still one sentence per bubble.

**Emoji rendering:** TV browsers (smart TVs, streaming sticks, Windows vs Android) draw emoji very differently, and some lack colour emoji entirely. Ship the 12 animals as **self-hosted SVG files** in `public/voices/` (from the open-source **Noto Emoji** set — images Apache 2.0 per its README, repo licence file OFL 1.1; the licence file is kept as `public/voices/LICENSE-noto-emoji.txt`) and render them as `<img>` so every screen looks identical. Don't depend on the system emoji font.
- Add these as tokens: `--color-voice-1` … `--color-voice-6` and `--color-voice-1-tint` … `--color-voice-6-tint`.

**Motion:** a new bubble fades + rises ~10px over 250ms; the column scrolls smoothly. Reduced motion: bubbles simply appear.

### 5.3 `/room-feed` layout
Live question banner on top; highlighted submission pinned large with a marigold "Being discussed" badge (ink text); approved submissions scroll slowly beneath as cream cards with `shadow-poster`.

---

## 6. Garden canvas

### 6.1 Canvas
- Background `festival-cream` with an optional very subtle paper grain.
- Three soft horizontal bands: **soil** (bottom, faint terracotta tint), **stems** (middle), **sky** (top, faint pistachio/marigold warmth). Bands are atmosphere, not hard lines.
- Framed with a pistachio foliage border echoing the poster (image or CSS), kept outside the node area.

### 6.2 Nodes

| Tier | Placement | Color role | Sprite pool (Camp-CLAI Plant pack) | Base size |
| :--- | :--- | :--- | :--- | :--- |
| Seed | Soil band | Terracotta | `atom` (20 icons) | small |
| Sprout | Stem band | Pistachio / forest | `concept` (47 icons) | medium, grows with `weight` |
| Theme | Sky band | Marigold | `theme` (48 icons) | large |

- Each node keeps the **same sprite** every render (stable hash of its id — copy `stableIndex` from Camp-CLAI).
- If a sprite is missing or doesn't suit the poster style, fall back to a **colored circle** in the tier color with a thin ink outline.
- **Labels:** `font-caption`, semibold, ink text with a cream halo (`paint-order: stroke; stroke: #FAF8F5; stroke-width: 4px`) so they read over vines. Labels ≤ 6 words; truncate with ellipsis.
- **Density over two days:** the garden keeps growing through Sunday (plan for ~150 nodes). When crowded, always label themes and sprouts; show seed labels only for new/recently reinforced seeds so the TV stays readable.
- **Verify in Phase 5:** do the Camp-CLAI Plant sprites look right on cream next to the poster art? If not, swap the pack — the code doesn't change.

### 6.3 Vines
- **Grows-into** (seed → sprout → theme): solid `festival-forest`, 2px, gentle quadratic curve (copy Camp-CLAI `curves.ts`).
- **Relates-to:** dotted `festival-denim`, 1.5px.
- **Theme ↔ theme bridge** (optional): dotted `festival-lavender`.

### 6.4 Growth motion
- **New node:** fades in and scales from 60% → 100% over ~600ms, easing `--ease-garden`.
- **Weight bump:** one soft pulse (scale 100% → 108% → 100%).
- **New vine:** draws on from source to target (~500ms stroke-dash animation).
- **Layout:** physics settles within ~2s, then freezes. New nodes gently "reheat" only their neighbors.
- **Reduced motion:** honor `prefers-reduced-motion` — no pulses or draw-ons; nodes simply appear.

---

## 7. Mobile audience view (`/audience`)
- Cream background, ink text, forest primary button with cream text.
- Tap targets ≥ 44×44px; text area ≥ 4 lines tall; font ≥ 16px (prevents iOS zoom).
- Title in display font; helper text and consent line in caption font.
- After submit: warm confirmation with a small sprout illustration and "Send another".

## 8. Admin view (`/admin`)
- Functional first: light cream background, clear sections (Audio · Schedule · Garden · Drafts · Moderation).
- **Audio status** is the loudest element: large pill (Live = forest, Paused = marigold with ink text, Reconnecting/Offline = terracotta with ink text) + word.
- Destructive actions (Stop, Delete node, Hide garden) require confirmation.
- Icons: thin rounded line icons (Lucide), 1.5px stroke.

## 9. Accessibility checklist
- Captions: ink text on light tints, large, smooth scrolling (no jumping); every speaker bubble shows its animal emoji so voice isn't shown by colour alone; screen-reader label uses the animal name only (never a person's name).
- Full keyboard use on `/admin` and `/audience`; visible focus rings (`festival-forest`, 2px offset).
- `prefers-reduced-motion` respected everywhere.
- Status never color-only.
- Form labels on every input; alt text on images; semantic headings.
