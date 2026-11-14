# Mission Cockpit Settings Modal Component (`components/settings_modal/`)

## Assigned Developer
Teammate H

## Responsibilities
- **Global Configuration Dialog:** Host a centered modal dialog with frosted backdrop overlay (`rgba(10, 11, 13, 0.75)`, blur: 8px) stacking at `z-index: 1000`.
- **Visual Theme Selection:**
  - Toggle between three operational color palettes: Muted Earth (default), Lunar Regolith (monochrome titanium/basalt), and High-Contrast Space (obsidian & cyan/amber).
  - Dynamically updates body classes (`theme-earth`, `theme-regolith`, `theme-space`) to swap CSS custom property variables globally.
- **3D Graphics & Simulation Tuning:**
  - Vertical terrain elevation exaggeration (1.0x, 2.0x, 3.0x).
  - Directional sunlight cast shadow quality (4096², 2048², 1024²).
  - Polar coordinate wireframe grid toggle.
  - Earth orbital libration wobble toggle.
- **Ephemeris & Telemetry Notation:**
  - Decimal degrees vs degrees-minutes-seconds (DMS) coordinate notation.
  - UTC vs Mission Elapsed Time (MET) vs Local Solar Time (LST) standards.
- **Persistence:** Automatically loads and stores configuration in browser `localStorage` (`spaceapp_mission_settings`).

## EventBus Interface
- **Listens for:**
  - `settings:open`: Displays the modal overlay with a smooth opacity transition.
  - `settings:close`: Dismisses the modal dialog.
- **Emits:**
  - `theme:changed`: `{ theme: 'earth' | 'regolith' | 'space' }`
  - `settings:changed`: Object containing full updated mission settings.
  - `grid:toggle`: `{ enabled: boolean }`
  - `terrain:exaggeration`: `{ factor: number }`

## File Structure
- `settings_modal.html`: Modal dialog markup with theme cards, 3D graphics controls, and toggle switches.
- `settings_modal.css`: Fullscreen frosted backdrop (`z-index: 1000`), entrance zoom animation, gradient swatches, and switch toggles.
- `settings_modal.js`: Local storage synchronization, theme class switching, DOM synchronization, and EventBus emission.
- `test.html`: Standalone micro-frontend test harness with live EventBus logger.
