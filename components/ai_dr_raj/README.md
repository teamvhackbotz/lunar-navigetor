# Dr. Raj AI Lunar Mission Analyst (`components/ai_dr_raj/`)

## Assigned Developer
Teammate F

## Responsibilities
- **Lunar Mission Decision Support:** Provide concise, professional analysis of lunar sites, illumination, communications, and terrain for astronauts and mission planners, with uncertainty and mission-specific safety constraints stated explicitly.
- **Floating Intelligence Window (360px × 480px):**
  - Frosted glass dialog pinned to the bottom-right corner with smooth entrance and slide-up animations.
  - Dynamic vertical clearance: Shifts upward when the bottom 2D Maps drawer opens.
  - Toggled directly via the "👨‍🚀 Dr. Raj AI" tool in the bottom mission toolbar.
- **Domain Knowledge Base:**
  - Curated scientific briefings covering Shakleton Connecting Ridge, Malapert Mountain, lunar libration wobble ($\pm 7.9^\circ$ lon, $\pm 6.7^\circ$ lat), 6-day solar stay windows, and cryogenic Permanently Shadowed Regions (PSRs).
  - Tactical automated debriefings triggered when candidate sites are selected.
- **Interactive Dialogue:**
  - Header toggle selects the Dr. Raj conversational style (On) or formal mission-operations style (Off); the choice persists in `localStorage`. Neither style may invent personal history or credentials.
  - Quick-action suggestion chips for rapid querying.
  - Conversational input field that sends requests immediately.
  - The send button changes to a Stop icon while a Gemini request or algorithm response is active.
  - An expandable diagnostics log records model attempts, API status, tool activity, errors, and elapsed time without recording prompts or API keys.
  - Embedded clickable site links within responses (`.ai-site-link`) that emit `site:select`.

## EventBus Interface
- **Listens for:**
  - `ai:toggle`: Opens or closes the AI chat window.
  - `site:selected`: `{ siteId: string, id?: string, name?: string }` opens the chat and automatically requests a tactical terrain, illumination, and DTE briefing.
  - `settings:gemini_key_changed`: Refreshes the API-key status indicator.
- **Emits:**
  - `site:select`: `{ id: string }` dispatched when an operator clicks an embedded site recommendation link within a chat message.
  - `algorithm:find_best_site`: `{ startDate, endDate, criteria }` for algorithm-backed landing site recommendations; Dr. Raj listens for `algorithm:result` and marks the returned site.
  - `site:marked`: Used for named locations and algorithm recommendations.
  - `timeline:jump`: `{ isoString }` when moving the timeline.

## Gemini API Key
Open `test.html` to enter a Gemini API key, save it in `localStorage` as `dr_raj_gemini_key`, and test connectivity to `gemini-2.5-flash-lite` with `gemini-3.5-flash-lite` as the availability fallback. Saving broadcasts `settings:gemini_key_changed` so an open Dr. Raj instance refreshes its status indicator.

## File Structure
- `ai_dr_raj.html`: Markup for floating dialog window, quick chips, message stream, and question input form.
- `ai_dr_raj.css`: Stacking context (`z-index: 120`), positioning, glassmorphic styling, pulse animations, and chat bubbles.
- `ai_dr_raj.js`: Knowledge base keywords, tactical intel map, response generator, and EventBus listener/emitter.
- `test.html`: Standalone micro-frontend test harness with simulated site selection triggers.
