# 2D Cartographic Synchronizer Component (`components/map_2d/`)

## Assigned Developer
Teammate B (Cartography & GIS Systems)

## Overview
This module provides precision 2D lunar inspection viewports with dual presentation modes, solving the 2:1 cylindrical distortion bottleneck and enlarging polar discs for Artemis III landing site analysis:
1. **Single Focused View (Default):**
   - **Tactical Wings Console:** Symmetrically flanks the centered map with Left (Targets) and Right (Telemetry) wings. **Collapsed as default** for pure cartographic focus; slides out via `[ 📊 Tactical Wings ]`.
   - **Left Wing (Target Shortcuts):** Dynamically populated based on active projection: Artemis III Candidate Shortcuts for South Pole (`Connecting Ridge`, `Shackleton Rim`, `Malapert Massif`, `Amundsen Rim`), Historical missions for Global Flat (`Apollo 11`, `Apollo 17`, `Chandrayaan-3`), and Cold Traps for North Pole (`Hermite Crater`, `Peary Rim`).
   - **Center Map Stage:**
     * **South Pole Stereographic (Artemis III Target Zone, 70°S – 90°S):** Enlarged ~290px to 380px circular disc with scaled concentric latitude rings ($88^\circ, 85^\circ, 80^\circ$), meridian crosshairs, and cardinal directions.
     * **Global Cylindrical Flat Map (180°W – 180°E):** Strictly locked to its natural **2:1 aspect ratio** (`flex: 0 0 auto; height: 100%; aspect-ratio: 2 / 1; width: auto;`), completely preventing horizontal crater elongation.
     * **North Pole Stereographic (Cold Traps, 70°N – 90°N):** Enlarged disc for volatile cold trap inspection (Peary, Hermite, Byrd).
   - **Right Wing (Live Selenographic Telemetry):** Real-time coordinates, distance to pole, solar elevation angle, PSR thermal temperature ($38\text{ K}$), and Direct-to-Earth (DTE) radio lock elevation.
2. **Tri-Map Panoramic View (`[ ◫ Tri-Map ]`):**
   - 3-viewport side-by-side comparison deck (North Disc | Global Flat | South Disc) for macro-scale whole-moon context.

## Capabilities & Controls
- **Segmented Header Switcher:** Instant 1-click tabs in the drawer header: `[ 🎯 South Pole ]`, `[ 🌐 Global Flat ]`, `[ ❄️ North Pole ]`, and `[ ◫ Tri-Map ]`.
- **Tactical Wings Toggle (`[ 📊 Tactical Wings ]`):** Simultaneously slides out or collapses the Left and Right wings with smooth 0.28s animation.
- **Smart Dual-Height Workspace:**
  - **Baseline Tactical:** `390px` height (leaves $>530\text{px}$ of the Three.js 3D Moon sphere visible above).
  - **Maximized Inspection (`[ ⛶ Maximize ]`):** Expands the drawer to `500px` for deep crater inspection, and `[ ◰ Restore ]` returns to `390px`.
- **Cross-View Great-Circle Distance Tool:** Shift + right-click two marked sites to select a pair, then right-click either and choose **Measure distance**. A blue great-circle route and kilometer label appear in the global, North Pole, and South Pole views; the shared measurement also appears on the 3D Moon.
- **Bidirectional Event Synchronization:**
  - **Emits:**
    - `site:marked`: `{ lat, lon, name, source, focus }` when clicking any map or quick target button.
    - `map2d:view_change`: `{ mode, projection }` when switching views.
    - `map2d:wings_toggle`: `{ expanded: boolean }` when toggling tactical wings.
  - **Listens to:**
    - `site:marked`: Updates pin positions and telemetry readouts.
    - `map2d:set_layout`: Triggered by Settings Modal to update mode, projection, wings, and height preferences.
- **Preference Persistence:** Automatically saves and restores view mode, active projection, wings state, and maximize state to `localStorage` (`spaceapp_map2d_prefs`).

## Isolated Testing
Open `http://localhost:8080/components/map_2d/test.html` in your browser to test and develop this component in complete isolation from the rest of the application.
