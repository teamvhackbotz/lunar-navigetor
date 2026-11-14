# Top Navigation Bar Component (`components/top_nav/`)

## Assigned Developer
Teammate G

## Responsibilities
- **Application Header Banner:** Render fixed 54px header displaying project branding ("Lunar Landing Site Navigator", "NASA Space Apps Challenge · South Pole Cockpit").
- **Dead-Center Comparison Action:** Provide the primary "Compare Sites" drawer toggle button centered using a 3-column CSS Grid layout (`1fr auto 1fr`), driving `#toggle-top-cards` via pure-CSS label binding.
- **Settings Launcher:** Host the settings cog button that emits `settings:open` across the EventBus.

## EventBus Interface
- **Emits:**
  - `settings:open`: Dispatched when the user clicks the "Settings ⚙️" button.

## File Structure
- `top_nav.html`: Header markup with 3-column layout (branding, compare sites toggle, settings button).
- `top_nav.css`: Grid layout, dimensions (height: 54px, z-index: 100), and button hover styles.
- `top_nav.js`: Click event listener for settings button dispatching `settings:open`.
- `test.html`: Standalone micro-frontend test harness.
