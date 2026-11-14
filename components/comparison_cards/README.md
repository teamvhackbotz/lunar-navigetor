# Candidate Comparison Cards Component (`components/comparison_cards/`)

## Assigned Developer
Teammate C

## Responsibilities
- **Floating Horizontal Carousel:** Render responsive, swipeable, scroll-snapped site cards across the top viewport below the top navigation bar.
- **Corridor Boundary Management:** Adapt left and right margins dynamically via pure-CSS sibling selectors when side drawers open, ensuring cards never tuck or bleed under side drawers.
- **Mission Trade-Off Metrics:** Present quantitative safety criteria per card:
  - Touchdown slope incline with safety categorization ($<5^\circ$ safe, $5^\circ-8^\circ$ moderate, $>8^\circ$ hazardous).
  - Solar altitude elevation angle and rising/grazing/shadow status.
  - Time remaining until next sunset or sunrise.
  - Direct-to-Earth line-of-sight communication elevation angle.
- **Secondary Dropdown Card System (Multi-Site Evaluation):**
  - Attached sub-cards (`.secondary-detail-card`) dropping down directly beneath parent cards.
  - 4 Interactive view tabs:
    - `🌄 Horizon`: 360° panoramic skyline mask, azimuth axis ($0^\circ - 360^\circ$), and dynamic Sun ☀️ and Earth 🌍 celestial trackers.
    - `📈 Slope`: Local radial crater cross-section SVG, touchdown marker, and safe gradient zone.
    - `☀️ Solar`: 14-day continuous solar stay curve across the mission window.
    - `📡 Comms`: Direct-to-Earth RF link margin and Deep Space Network Canberra/Goldstone lock status.
  - Allows comparing **3 or more sites' horizons/slopes side-by-side** simultaneously in the carousel.
- **Dynamic Site Card Generation:** When a landing site is searched in the quick search palette (`/`) or marked on the 3D Moon or 2D Maps, dynamically synthesizes a complete candidate card with procedural SVG terrain silhouettes, slopes, and solar curves.
- **Full Undo / Redo History Stack:** Operators can dismiss (`×`) candidate cards without fear of permanent data loss. The corridor toolbar provides live `[ ↩ Undo ]` and `[ ↪ Redo ]` controls, fully integrated with global `Ctrl + Z` and `Ctrl + Y` keyboard shortcuts.
- **Shift-Hold Multi-Card Peek:** Holding Shift while clicking any sub-card tab expands that tab across all candidate cards simultaneously as long as the mouse button is held down.
- **Real-Time Sun Tracking:** Moves the Sun ☀️ icon across open 360° skyline cards in real time as the timeline plays or scrubs.

## EventBus Interface
- **Emits:**
  - `site:marked`: Dispatched when an operator clicks any site card or Focus 3D.
    - Payload: `{ lat: number, lon: number, name: string, source: 'comparison-cards', focus?: boolean }`
  - `card:inspect`: Dispatched when an operator clicks `[ ⛶ Grow ]` on a secondary card (launches Step 3 focus modal).
    - Payload: `{ siteKey: string, siteData: object, tab: string }`
- **Listens for:**
  - `site:marked`: Highlights matching cards or dynamically creates new candidate cards when receiving selections from search palette, 3D Moon, or 2D Maps.
  - `cards:undo` / `cards:redo`: Triggers undo/redo actions across the comparison deck.
  - `time:changed`: Dynamically shifts the Sun position on open 360° skyline masks in real time.
  - `cardlayout:changed`: Toggles between attached dropdown mode (`layout-dropdown`) and fixed shelf mode (`layout-shelf`).

## File Structure
- `comparison_cards.html`: Carousel markup containing `.site-card-column` containers, primary summary cards, and attached secondary sub-cards.
- `comparison_cards.css`: Stacking context (`z-index: 90`), corridor clipping (`overflow: hidden`), scroll-snap, sub-card unroll transitions (`max-height: 290px`), and SVG chart styling.
- `comparison_cards.js`: Selection click delegation, dismiss handlers, tab switching controller, SVG view generation, and EventBus listeners.
- `test.html`: Standalone micro-frontend test harness.
