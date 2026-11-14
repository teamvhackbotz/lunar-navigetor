# Celestial Triad Mini-Map Component (`components/minimap_triad/`)

## Assigned Developer
Teammate B

## Responsibilities
- **Celestial Reference Frame Indicator:** Render an interactive orbital diagram displaying the Moon, Earth, and Sun geometry in the top-left viewport corner.
- **Reference Frame State Machine:** Click to cycle the central anchor body through three operational frames:
  - Moon-Centric (Default): Visualizes Earth's libration wobble in the lunar sky.
  - Earth-Centric: Depicts geocentric lunar orbit and phases.
  - Sun-Centric: Depicts heliocentric Earth-Moon barycenter motion.
- **Libration Wobble Simulation:** Listens to `time:changed` events from the global timeline and wobbles the Earth node position using a dual-frequency sinusoidal oscillation ($\Delta x = \pm 6\text{px}$, $\Delta y = \pm 4\text{px}$) reflecting the Moon's orbital eccentricity and 5.14° inclination.

## EventBus Interface
- **Emits:**
  - `frame:changed`: `{ mode: 'moon' | 'earth' | 'sun' }` when the user clicks the widget to change perspective.
- **Listens for:**
  - `time:changed`: `{ sliderValue: number }` to advance libration phase angles.

## File Structure
- `minimap_triad.html`: Markup for widget card, concentric dashed orbit rings, and emoji celestial nodes.
- `minimap_triad.css`: Stacking context (`z-index: 20`), positioning (`top: 72px`, `left: 18px`), and node transitions.
- `minimap_triad.js`: Frame cycling state machine and timeline libration wobble animator.
- `test.html`: Standalone micro-frontend test harness.
