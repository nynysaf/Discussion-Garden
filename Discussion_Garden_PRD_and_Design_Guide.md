# Product Requirements Document & Design Guide
## **Discussion Garden** | *We Create Our Futures Festival*

---

## 1. Executive Summary
**Discussion Garden** is a lightweight, real-time web application built for the *We Create Our Futures* festival. The application captures live room microphone dialogue, streams closed-captioned transcriptions across multi-room TV displays, presents dynamic schedule-aligned discussion prompts, and provides an interactive digital garden knowledge graph that visualizes emerging conversation topics in real time.

The system is designed with extreme operational flexibility: it features continuous AI speech-to-text transcription for high accessibility, coupled with a manual-first mode toggle for the synthesis engine. Event facilitators can run the synthesis garden fully manually, fully automated via LLM analysis, or in a hybrid oversight mode.

> **Key Architectural Principle:** Always-On Cloud Transcription + Toggleable AI Synthesis.  
> The speech-to-text feed remains continuously active to support closed captions, while the network synthesis garden can seamlessly switch between automated LLM parsing and direct manual entry by the host.

---

## 2. System Architecture & Tech Stack

```
                                  ┌─────────────────────────────┐
                                  │      Host Laptop (Admin)    │
                                  │  • Mic Intake               │
                                  │  • Control Dashboard UI     │
                                  │  • Manual Node Overrides    │
                                  └──────────────┬──────────────┘
                                                 │
                             ┌───────────────────┴───────────────────┐
                             │                                       │
                    (Audio Stream / Chunks)                       (Admin Edits)
                             │                                       │
                             ▼                                       ▼
                  ┌────────────────────┐                   ┌───────────────────┐
                  │ Cloud STT Service  │                   │ Supabase Database │
                  │ (Deepgram API)     │                   │ & Realtime Engine │
                  └──────────┬─────────┘                   └─────────┬─────────┘
                             │                                       │
                     (Text Stream)                                   │
                             │                                       │
                             ▼                                       ▼
                  ┌────────────────────┐                   ┌───────────────────┐
                  │ Cloud LLM Engine   │                   │ Interactive       │
                  │ (OpenAI / Claude)  │                   │ Audience Phones   │
                  └──────────┬─────────┘                   └─────────┬─────────┘
                             │                                       │
                      (Garden JSON)                                  │
                             │                                       │
                             ▼                                       ▼
         ┌───────────────────────────────────────────────────────────────┐
         │                    Display Screens (TVs)                      │
         │  • Downstairs: Live Captions + Schedule + QR Code + Garden    │
         │  • Upstairs Room: Live Audience Questions / Comments Feed     │
         └───────────────────────────────────────────────────────────────┘
```

| Component | Selected Technology | Operational Role & Justification |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js (App Router) + Tailwind CSS** | Hosted on Vercel. Ensures rapid initial page loads, clean responsive layouts, and native serverless route support. |
| **Database & Realtime** | **Supabase (PostgreSQL + Realtime)** | Handles multi-screen state synchronization via WebSocket channels with zero infrastructure setup. |
| **Speech-to-Text (STT)** | **Deepgram Nova-2 / OpenAI Whisper API** | Cloud-based live audio streaming STT. Ensures 98%+ accuracy, sub-second caption streaming, and offloads host CPU. |
| **Synthesis Engine (LLM)** | **OpenAI GPT-4o-mini / Claude 3.5 Haiku** | Analyzes 30–40s transcript windows to extract structured JSON (seeds, sprouts, themes). Controlled by AI Mode Toggle. |
| **Graph Visualizer** | **React Flow / D3.js (Reference Module)** | Custom force-directed network graph component integrated from existing sample code subfolder. |

---

## 3. Multi-Screen Architecture (4 Core Views)

The application routes functionality across four distinct, synchronized browser interfaces to support the host, downstairs attendees, mobile participants, and upstairs room observers.

### View 1: Host Admin Control Panel (`/admin`)
Serves as the primary operational command center for the host in the main room:
* **Live Audio Stream Control:** Web Audio API mic intake with Start, Pause, Resume, and Stop controls.
* **Schedule & Live Question Manager:** Reorder scheduled topics and instantly update the active prompt on TV screens.
* **Synthesis Mode Toggle:** Switch between Manual Mode, AI-Assisted Mode, or Hybrid Mode on the fly.
* **Manual Knowledge Graph Editor:** Directly plant seeds, create sprout concepts, elevate macro themes, and draw connecting vines.
* **Audience Submissions Moderation Queue:** Review incoming participant comments/questions with single-click actions to Approve, Highlight, or Dismiss.

### View 2: Downstairs Live Caption & Garden Screen (`/captions`)
The primary public broadcast screen displayed on downstairs TV monitors:
* **Header & Prompt Area:** Prominently features 'Discussion Garden' and the active 'Live Question'.
* **High-Contrast Closed Captions:** Large, easily readable live scrolling transcript stream.
* **Dynamic Garden Canvas:** Visual network graph displaying blooming seeds, sprouts, themes, and animated connecting vines.
* **Schedule Sidebar:** Daily schedule breakdown with timestamps and upcoming topics.
* **Interactive QR Code Overlay:** Persistent corner QR code routing phone cameras directly to View 3.

### View 3: Participant Mobile Entry (`/audience`)
A zero-friction, mobile-optimized webpage accessed via QR code scan:
* **Zero-Auth Access:** No account creation or login required for immediate submission.
* **Input Form:** Text field for questions, personal stories, or grounded reactions, plus an optional Name/Tag input.
* **Submission Feedback:** Instant confirmation screen acknowledging their contribution has been sent to the feed.

### View 4: Upstairs Room Feed (`/room-feed`)
Dedicated display feed situated upstairs where live dialogue is active:
* **Live Community Board:** Auto-scrolling feed of host-approved audience questions and comments submitted via QR code.
* **Active Integration Highlight:** Visual badge highlighting specific participant thoughts currently being woven into live discussion.
* **Unified Aesthetics:** Clean, distraction-free typography matching the overall festival branding.

---

## 4. Dynamic Garden Knowledge Graph & Synthesis Mechanics

The Discussion Garden visualizer translates linear verbal conversation into a dynamic, interconnected network graph structured into a three-tier concept hierarchy.

| Node Tier | Visual Metaphor | Description & Logic |
| :--- | :--- | :--- |
| **Tier 1: Seeds** | Planted Seed / Root Node | Represents atomic evidence, specific personal experiences, or grounded facts voiced in discussion. Appears at canvas ground level. |
| **Tier 2: Sprouts** | Growing Stem / Sprout | Formed when multiple atomic seeds share common logical principles. Sprouts grow upward as concepts are revisited. |
| **Tier 3: Themes** | Bloomed Flower / Cluster | Overarching macro-themes uniting multiple sprouts into high-level festival insights. |

### Operational Mode Toggle (Manual vs. AI-Assisted)
The host dashboard features a global 'Synthesis Mode' toggle controlling how graph nodes and connecting vines are created:
* **Manual Mode (Default/Fail-Safe):** The LLM synthesis pipeline is paused. The host uses quick-action admin forms to manually label seeds, spawn sprouts, group themes, and link related nodes with dotted vines.
* **AI-Assisted Mode:** Every 30–40 seconds, transcript buffers are sent to the cloud LLM. The model returns structured JSON proposals (new seeds, growing sprouts, connecting vines), which auto-populate the canvas.
* **Hybrid Oversight Mode:** LLM proposals enter a 'Draft Queue' on the host dashboard. The host approves, modifies, or rejects generated nodes before they render on public TV screens.

---

## 5. Official Brand & Design Guide

### 5.1 Color Palette (Extracted from Festival Poster)

| Color Name | Hex Code | RGB | Poster Source | App UI Application |
| :--- | :--- | :--- | :--- | :--- |
| **Poster Pistachio Green** | `#A8D580` | `168, 213, 128` | Outer foliage textured frame | App primary accent, active borders, sprout stems, screen container framing |
| **Deep Forest Green** | `#3B5B28` | `59, 91, 40` | Dark foliage speckles in border | High-contrast text on light backgrounds, dark mode canopy backgrounds |
| **Natural Paper Cream** | `#FAF8F5` | `250, 248, 245` | Main inner poster canvas | Primary background for cards, banners, mobile screen view (`/audience`) |
| **Ink Charcoal / Black** | `#1A1C1A` | `26, 28, 26` | "WE CREATE OUR FUTURES" header | High-contrast caption text, titles, primary display headers |
| **Sunburst Marigold** | `#EE9A23` | `238, 154, 35` | CSI sunburst logo | **Live Question** badge, active dialogue highlights, blooming macro-theme nodes |
| **Terracotta Clay** | `#C86A58` | `200, 106, 88` | Central illustration accent | Ground-level atomic seeds, lived experience tags, prompt indicators |
| **Muted Lavender** | `#9682AF` | `150, 130, 175` | Illustration accent | Secondary node tags, cross-cutting theme bridges |
| **Denim Blue** | `#4C6D8C` | `76, 109, 140` | Illustration accent | Secondary graph connection links |

### 5.2 Typography System

* **Primary Display Font (Title Header):** `Cormorant Garamond` (or `Cinzel`), All-Caps, Bold / Semi-Bold, Letter spacing `+0.05em`.
* **Secondary Display Font (Question Banners):** `Cormorant Garamond Italic`, Medium Italic.
* **High-Legibility Body Font (TV Caption Feed):** `Plus Jakarta Sans` or `Inter`, Medium / Semi-Bold weight (`1.35` line height).

### 5.3 Tailwind CSS Theme Configuration

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        festival: {
          green: '#A8D580',      // Poster outer foliage green
          forest: '#3B5B28',     // Dark foliage green
          cream: '#FAF8F5',      // Poster paper background
          ink: '#1A1C1A',        // Dark text / headline black
          marigold: '#EE9A23',   // CSI sunburst yellow-orange
          terracotta: '#C86A58', // Clay illustration rose
          lavender: '#9682AF',   // Accent lavender
          denim: '#4C6D8C',      // Accent blue
        }
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'Cinzel', 'serif'],
        italic: ['Cormorant Garamond', 'serif'],
        caption: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'poster': '0 4px 20px -2px rgba(26, 28, 26, 0.08)',
      }
    },
  },
}
```

---

## 6. 2-Day Festival Operational Guidelines

* **Session Partitioning:** Data is tagged by session ID (e.g., `day_1_morning`, `day_2_afternoon`) to cleanly split history while allowing multi-day synthesis.
* **Pause/Resume Fail-Safe:** Pausing audio mutes Cloud STT calls to conserve quota while maintaining the garden state on screen with a subtle `[PAUSED]` status indicator.
* **Network Redundancy:** Connect the host laptop to a dedicated hotspot or private router, isolating stream traffic from public festival Wi-Fi.
* **Reference Codebase Integration:** Place existing network graph sample code into `/components/garden-graph` for instant visual parity.
