# Discussion Garden — Visual Design Guide

**Version:** 0.2 · 2026-09-30  
**Applies to:** all four views (`/admin`, `/captions`, `/audience`, `/room-feed`).  
**Companion:** `prd-v0.2.md` · `dev-plan-v0.1.md`  
**Changelog:** v0.2 split out of the original PRD; Tailwind v4 tokens; contrast rules; TV display rules; garden canvas spec (light "poster paper" canvas, confirmed 2026-09-30).

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

  --shadow-poster: 0 4px 20px -2px rgba(26, 28, 26, 0.08);

  --ease-garden: cubic-bezier(.22, .61, .36, 1);
}
```

This generates classes like `bg-festival-cream`, `text-festival-ink`, `font-display`, `font-caption`, `shadow-poster`.

---

## 5. TV display rules (`/captions`, `/room-feed`)

TVs are read from 3–6 m (10–20 ft) by people who can't interact with them.

- **No hover or click required** to understand anything. No tooltips on TV views.
- **Caption size:** start at **52px** on a 1080p screen (scale with `vh`/`clamp()`), tune in rehearsal from the back row.
- **Caption layout:** 2–3 visible lines, ≤ ~55 characters per line, newest line at the bottom. Final words in `festival-ink`; interim (still-changing) words at ~60% opacity.
- **Safe area:** keep content ≥ 3% from every edge (some TVs overscan/crop).
- **Status is subtle but present:** `[PAUSED]`, "Reconnecting…" in a small pill — never a blank or frozen-looking screen.
- **Motion on TV:** calm. The garden settles and **stops moving**; only new/changed nodes animate.

### 5.1 `/captions` layout (16:9, draft)

```
┌──────────────────────────────────────────────────────────────┐
│ DISCUSSION GARDEN        [ LIVE QUESTION: "How might we…" ]  │  ~14%
├───────────────────────────────────────────────┬──────────────┤
│                                               │  SCHEDULE    │
│              GARDEN CANVAS                    │  10:00 ...   │
│   (themes top · sprouts middle · seeds soil)  │ ▶11:00 ...   │  ~56%
│                                               │  13:00 ...   │
├───────────────────────────────────────────────┤              │
│  live captions line 1                         │   ┌──────┐   │
│  live captions line 2 (newest)                │   │  QR  │   │  ~30%
│                                               │   └──────┘   │
└───────────────────────────────────────────────┴──────────────┘
```
Open question: side-by-side (above) vs alternating full-screen garden. Decide after the first TV test.

### 5.2 `/room-feed` layout
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
- Captions: ink on cream, large, stable line positions (no jumping).
- Full keyboard use on `/admin` and `/audience`; visible focus rings (`festival-forest`, 2px offset).
- `prefers-reduced-motion` respected everywhere.
- Status never color-only.
- Form labels on every input; alt text on images; semantic headings.
