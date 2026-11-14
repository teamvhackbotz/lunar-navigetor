# High-Resolution Site Inspector Component (`components/inspection_modal/`)

## Assigned Developer
Teammate H (Inspection & Decision Analytics)

## Responsibilities
- **High-Resolution Analytical Workspace:** Expand candidate site details into an expansive viewport featuring:
  - 360° panoramic skyline SVG mask with vertical elevation axes ($-5^\circ$ to $+15^\circ$) and $15^\circ$ azimuth compass ticks.
  - Interactive crosshair cursor that follows the mouse across the skyline to show exact azimuth degree and local terrain obstruction angle.
  - Radial crater slope cross-section with touchdown coordinates, rim crest elevation, and descent hazard zones.
  - 14-day continuous solar stay curve and Deep Space Network (DSN) direct-to-Earth RF link budget.
- **Dual Presentation Modes:**
  1. `mode-modal` (Default): Centered modal with frosted-glass backdrop for high-contrast deep study.
  2. `mode-hud`: Draggable non-modal floating HUD panel allowing simultaneous interaction with the Three.js 3D Moon and timeline.
- **Live Ephemeris Tracking:** Reacts in real time to `time:changed` events, shifting the Sun ☀️ icon azimuth across the high-res skyline as the mission timeline scrubber moves.

## EventBus Interface
- **Listens for:**
  - `card:inspect`: Emitted when an operator clicks `[ ⛶ Grow ]` on any secondary sub-card.
    - Payload: `{ siteKey: string, siteData?: object, tab: 'horizon' | 'slope' | 'solar' | 'comms' }`
  - `time:changed`: Advances live solar position on the high-res skyline.
    - Payload: `{ sliderValue: number }`
  - `inspectmode:changed`: Toggles `.mode-modal` vs `.mode-hud` from Settings.
    - Payload: `{ mode: 'modal' | 'hud' }`
- **Emits:**
  - `site:marked`: Dispatched when the operator clicks `[ Focus 3D Viewport ]` in the inspector footer with `{ focus: true }`.

## File Structure
- `inspection_modal.html`: Dialog markup containing draggable header, view switcher tabs, primary stage, and telemetry footer.
- `inspection_modal.css`: Centered modal and draggable HUD window styling, crosshair guidelines, and SVG grid styles.
- `inspection_modal.js`: Window drag kinematics, interactive mouse crosshair tracking, view rendering, and EventBus listeners.
- `test.html`: Standalone micro-frontend test harness.
