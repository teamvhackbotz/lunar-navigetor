# Global Timeline & Cockpit Toolbar Component (`components/timeline/`)

## Assigned Developer
Teammate E

## Responsibilities
- **Temporal Simulation Engine:** Drive global time progression across all views, simulating lunar orbital and lighting dynamics for the November 2026 Artemis III landing window.
- **Tier 1 Cockpit Controls (Height: 44px):**
  - Mission tools toolbar: "📍 Mark Site" pin-drop tool, "▲ 2D Maps" drawer trigger (`for="toggle-bottom-map"`), and "👨‍🚀 Dr. Raj AI" assistant toggle.
  - Live UTC simulation clock (`status-clock`) formatted as `YYYY-MM-DD HH:mm UTC`.
  - Active site telemetry badge (`active-coord-display`) presenting target name, hemisphere, and decimal coordinates.
  - Media playback controls: Step Back 1h, Play/Pause toggle with active state styling, Step Forward 1h, and accelerated simulation multipliers ($100\times$, $1000\times$).
- **Tier 2 Precision Scale Scrubber (Height: 48px):**
  - Full-width HTML range slider (`min=0`, `max=100`) with terracotta accent color.
  - Integrated SVG precision scale ruler with sub-day tick graduations and solstice marker.
  - Calendar event markers for Artemis III target window and polar solstice.

## EventBus Interface
- **Emits:**
  - `time:changed`: Broadcasts whenever the scrubber is moved or the playback animation ticks.
    - Payload: `{ sliderValue: number, isoString: string, timestamp: Date }`
    - Listened to by `moon_3d` to recalculate solar light azimuth and terminator line.
  - `ai:toggle`: Broadcasts when the Dr. Raj AI button is clicked to open/close the assistant drawer.
- **Listens for:**
  - `site:marked`: Updates the center status coordinate readout badge with the newly selected site name and selenographic coordinates.

## File Structure
- `timeline.html`: Markup for two-tiered cockpit dock, media controls, SVG ruler, and time scrubber.
- `timeline.css`: Docking layout (`z-index: 100`, height: 92px), playback button styling, and SVG scale styling.
- `timeline.js`: Playback animation interval loop, speed multiplier scaling, epoch calculation (November 2026), and EventBus emitter/listener.
- `test.html`: Standalone micro-frontend test harness.
