# Dr. Raj AI Lunar Mission Analyst (`components/ai_dr_raj/`)

## Assigned Developer
Teammate F

## Responsibilities
- **Interactive Mission Geologist & Trajectory Analyst:** Simulate an onboard lunar mission analyst ("Dr. Raj") offering real-time natural language answers, tactical ephemeris analyses, and mission briefings.
- **Floating Intelligence Window (360px × 480px):**
  - Frosted glass dialog pinned to the bottom-right corner with smooth entrance and slide-up animations.
  - Dynamic vertical clearance: Shifts upward when the bottom 2D Maps drawer opens.
  - Toggled directly via the "👨‍🚀 Dr. Raj AI" tool in the bottom mission toolbar.
- **Domain Knowledge Base:**
  - Curated scientific briefings covering Shakleton Connecting Ridge, Malapert Mountain, lunar libration wobble ($\pm 7.9^\circ$ lon, $\pm 6.7^\circ$ lat), 6-day solar stay windows, and cryogenic Permanently Shadowed Regions (PSRs).
  - Tactical automated debriefings triggered when candidate sites are selected.
- **Interactive Dialogue:**
  - Quick-action suggestion chips for rapid querying.
  - Conversational input field with send animation and realistic response latency.
  - Embedded clickable site links within responses (`.ai-site-link`) that emit `site:select`.

## EventBus Interface
- **Listens for:**
  - `ai:toggle`: Opens or closes the AI chat window.
  - `site:selected`: `{ siteId: string }` automatically outputs a tactical terrain, illumination, and DTE briefing for that site.
- **Emits:**
  - `site:select`: `{ id: string }` dispatched when an operator clicks an embedded site recommendation link within a chat message.

## File Structure
- `ai_dr_raj.html`: Markup for floating dialog window, quick chips, message stream, and question input form.
- `ai_dr_raj.css`: Stacking context (`z-index: 120`), positioning, glassmorphic styling, pulse animations, and chat bubbles.
- `ai_dr_raj.js`: Knowledge base keywords, tactical intel map, response generator, and EventBus listener/emitter.
- `test.html`: Standalone micro-frontend test harness with simulated site selection triggers.
