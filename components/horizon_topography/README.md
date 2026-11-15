# Mission Operations & GIS Remote Sensing Drawers (`components/horizon_topography/`)

## Architecture & Component Overview

The `horizon_topography` micro-frontend provides dual slide-out analytical command drawers for the **NASA Lunar Landing Site Navigator**:
- **Left Drawer (`.drawer-left-horizon`)**: **Universal Mission Constraints & EVA Traverse Planner** — Models surface mission archetypes, ephemeris-coupled power budgets, and physiographic waypoint navigation.
- **Right Drawer (`.drawer-right-horizon`)**: **GIS Remote Sensing & Multi-Spectral Overlays** — Controls authentic orbital basemaps, context-sensitive scientific heatmaps, adaptive calibration decks, and opacity blending.
- **Persistent Edge Handles**: Pinned at 50% viewport height (`[ 🧭 Mission & Traverse ❯ ]` and `[ ❮ GIS Overlays 🗺️ ]`) for friction-free toggling.

---

## 1. Left Drawer: Universal Mission Planner

### Mission Archetype Engine
Supports 4 mission classes with real operational constraints:

| Archetype | Class | Power System | Darkness Reserve | Crew | Traverse Radius | Nominal Speed | Stay Window | Deployable Payload |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `crewed` | Artemis Sortie (LTV) | 10.0 kW (VSAT) | 72 hrs (RFC) | 2 Astronauts | 12.5 km (LTV) | 8.0 km/h | 48–240 hrs | ALSEP, Heat Flow, retroreflector, drill |
| `rover` | Robotic Rover (VIPER/CADRE) | 450 W (Solar Mast) | 48 hrs (Battery/RHU) | 0 (Autonomous) | 3.5 km | 0.2 km/h | 24–720 hrs | MSolo, NIRVSS, TRIDENT 1m drill |
| `lander` | Science Lander (CLPS) | 1.2 kW (GaAs Array) | 14 hrs (Twilight) | 0 (Stationary) | 1.5 m (Arm) | 0.0 km/h (Static) | 24–360 hrs | Laser retroreflector, magnetometer, ion sensor |
| `basecamp` | Extended Outpost | 40.0 kW (Fission Surface Power) | 360 hrs (Night Capable) | 4 Astronauts | 25.0 km (Pressurized) | 12.0 km/h | 72–720 hrs | In-situ resource plant, habitat power grid, greenhouse |

### Ephemeris-Coupled Power Budget
- **JPL Horizons Integration**: Reads continuous daylight windows ($T_{\text{daylight}}$) from authentic 720-hour November 2026 ephemeris series.
- **Daylight Margin Calculation**: $M_{\text{daylight}} = T_{\text{daylight}} - T_{\text{stay}}$.
- **Battery / RFC State of Charge (SoC)**:
  - Nominal Solar Float ($\ge 94\%$): `.fill-sage` green.
  - Shadow Discharge ($20\% - 85\%$): `.fill-warn` amber.
  - Critical Depletion ($< 20\%$): `.fill-danger` crimson alert.

### Dynamic Physiographic Waypoint Route Generator
Procedurally synthesizes 3 waypoints based on landing site geographic zone:
- **Polar Sites ($|\text{lat}| \ge 75^\circ$)**: Touchdown LZ $\to$ Solar Illumination Ridge Crest Station $\to$ Permanently Shadowed Region (Cold Trap) Perimeter.
- **Equatorial & Mid-Latitude ($|\text{lat}| < 75^\circ$)**: Touchdown LZ $\to$ Mare Basalt Outcrop $\to$ Impact Crater Ejecta Blanket.
- **Far Side Sites ($|\text{normLon}| \ge 100^\circ$)**: Basin Floor LZ $\to$ Central Peak Uplift / Mantle Outcrop $\to$ Earth-Moon L2 Relay Sightline Mast.
- **Stationary Landers**: Touchdown Pad ($0.0\text{ m}$) $\to$ Robotic Arm Envelope ($5.0\text{ m}$) $\to$ Surface Sensor & Magnetometer Deployment ($15.0\text{ m}$).
- **Geodesic Trajectory Calculation**: Employs spherical trigonometry with Moon mean radius $R_{\text{moon}} = 1,737.4\text{ km}$.

---

## 2. Right Drawer: GIS Remote Sensing Console

### Universal Cartographic Basemap Engine
Configured with authentic NASA and JAXA orbital sensor specifications:

| Key | Layer Name | Sensor Instrument | Spectral Band | Spatial Resolution | Provider |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `lroc` | LROC WAC Albedo Mosaic | Wide Angle Camera (WAC) | 395–689 nm (Visible) | 100 m/px | NASA LRO |
| `lola` | LOLA Topographic Relief | Lunar Orbiter Laser Altimeter | 1064 nm Laser ($\pm 1\text{ m}$) | 59 m/px | NASA LRO |
| `kaguya` | Kaguya TC Ortho Terrain | Terrain Camera (TC) | High-contrast Stereo Ortho | 10 m/px | JAXA SELENE |

### Geographic Context-Sensitive Spatial Overlays
Re-evaluates surface layers dynamically when landing coordinates change:

1. **Equatorial & Mid-Latitude PSR Suppression Rule ($|\text{lat}| < 75^\circ$)**:
   - Because sub-solar elevation angles reach up to $90^\circ$ at lower latitudes, Permanently Shadowed Regions (PSRs) do not physically exist.
   - The PSR toggle is automatically disabled and un-checked.
   - Context badge displayed: `ℹ️ PSRs absent at equatorial latitudes (|lat| < 75°)`.
2. **Lunar Far Side Radio Occlusion Rule ($|\text{normLon}| \ge 100^\circ$)**:
   - Permanent tidal blocking of Direct-to-Earth (DTE) radio contact by lunar bulk.
   - Displays context alert: `⚠️ 100% Far Side Radio Shadow — Relay Required (e.g. Queqiao-1/2)`.
3. **Near Side Direct-to-Earth Line of Sight ($|\text{normLon}| \le 80^\circ$)**:
   - Reports clear radio line-of-sight clearance.

### Adaptive Multi-Spectral Calibration Deck
The calibration deck dynamically reconfigures its scale, gradient, and citations depending on the active or focused layer:

- **LOLA Slope Gradient**:
  - Gradient: Safe Sage (`#7d967e`) $\to$ Caution Amber (`#c99e52`) $\to$ Hazard Red (`#b85c5c`).
  - Scale: $0^\circ\text{ (Flat/Safe)} \to 8^\circ\text{ (Moderate)} \to 20^\circ+\text{ (Steep Hazard)}$.
  - Citation: *NASA LRO LOLA Laser Altimeter DEM. IAU 1,737.4 km lunar sphere datum.*
- **Diviner Cryogenic Thermal Traps (PSR)**:
  - Gradient: Ultra-Cold Violet (`#4a2e7a`) $\to$ Cryo Blue (`#3b82f6`) $\to$ Sublimation Cyan (`#06b6d4`).
  - Scale: $25\text{ K (-248°C)} \to 40\text{ K (Volatile Trap)} \to 100\text{ K (Sublimation Barrier)}$.
  - Citation: *NASA LRO Diviner Lunar Radiometer Experiment (DLRE) bolometric temperature maps.*
- **Water-Equivalent Hydrogen (WEH / Ice)**:
  - Gradient: Anhydrous Dune (`#3f3529`) $\to$ Hydrated Teal (`#0d9488`) $\to$ Volatile Blue (`#2563eb`).
  - Scale: $0.1\text{ wt}\% \to 0.5\text{ wt}\% \to 1.5+\text{ wt}\% \text{ (Neutron Flux Dip)}$.
  - Citation: *NASA LRO LEND Epithermal Neutron Detector epithermal neutron count suppression.*
- **Earth Radio Occlusion Mask (DTE)**:
  - Gradient: Blocked Red (`#b85c5c`) $\to$ Horizon Yellow (`#eab308`) $\to$ High Zenith Green (`#22c55e`).
  - Scale: $-5^\circ\text{ (Occluded)} \to 0^\circ\text{ (Horizon Limit)} \to +45^\circ\text{ (Zenith Line-of-Sight)}$.
  - Citation: *NASA JPL Horizons Direct-to-Earth (DTE) topographic line-of-sight elevation.*

### Opacity Mixer & Blend Presets
- Continuous opacity slider ($10\% - 100\%$).
- Quick-select blend preset pills:
  - `30% Subtle` (Subtle underlying morphology verification)
  - `60% Balanced` (Standard side-by-side analytical view)
  - `75% Standard` (Default balanced scientific overlay)
  - `90% Analytical` (High-contrast boundary extraction)

---

## 3. Public API Specification

### `window.MissionPlanner` (Left Drawer)
```javascript
// Switch active surface mission archetype
window.MissionPlanner.setArchetype('crewed' | 'rover' | 'lander' | 'basecamp');

// Query active archetype key
window.MissionPlanner.getArchetype(); // -> 'crewed'

// Retrieve configuration parameters for an archetype
window.MissionPlanner.getArchetypeConfig('rover');

// Retrieve active landing site profile
window.MissionPlanner.getActiveSite();

// Re-evaluate power budget and daylight margins for a given stay duration
window.MissionPlanner.updatePowerBudgetAndStay(stayHours);

// Generate procedural waypoints for a given site and archetype
window.MissionPlanner.generateTraverseWaypoints(site, 'crewed');

// Calculate spherical great-circle distance on the Moon (in kilometers)
window.MissionPlanner.calculateLunarDistanceKm(lat1, lon1, lat2, lon2);
```

### `window.GISOverlays` (Right Drawer)
```javascript
// Select active optical cartographic basemap
window.GISOverlays.setBasemap('lroc' | 'lola' | 'kaguya');

// Query active basemap ID
window.GISOverlays.getBasemap(); // -> 'lroc'

// Programmatically enable or disable an overlay layer
window.GISOverlays.setLayer('slope' | 'psr' | 'ice' | 'dte', true | false);

// Query all overlay states
window.GISOverlays.getLayers(); // -> { slope: true, psr: false, ice: false, dte: false }

// Query whether a specific layer is currently active
window.GISOverlays.isLayerActive('slope'); // -> true

// Adjust overlay blend opacity (10 to 100)
window.GISOverlays.setOpacity(75);

// Query current normalized opacity float
window.GISOverlays.getOpacity(); // -> 0.75

// Programmatically switch active calibration legend
window.GISOverlays.setLegend('slope' | 'psr' | 'ice' | 'dte');

// Query active legend ID
window.GISOverlays.getActiveLegend(); // -> 'slope'

// Synchronize geographic boundary rules against active coordinates
window.GISOverlays.updateOverlayGeographicBounds(lat, lon);
```

---

## 4. EventBus Communication Contracts

### Emitted Events

| Event Name | Payload Structure | Description |
| :--- | :--- | :--- |
| `mission:archetype_change` | `{ archetype: string, config: Object }` | Dispatched when switching mission archetype. |
| `mission:constraint_change` | `{ stayHours, daylightAvailable, daylightMargin, shadowHours, batterySoc, batteryStatus, primaryPower, darknessReserve, archetype, siteId }` | Dispatched when stay duration or active site changes. |
| `traverse:waypoint_select` | `{ waypointId, lat, lon, title, slope, dist, archetype }` | Dispatched when selecting a waypoint route node. |
| `layer:basemap_change` | `{ basemap: string, name: string, sensor: string, band: string, resolution: string, provider: string }` | Dispatched when switching orbital basemap. |
| `layer:toggle` | `{ layerId: string, enabled: boolean, activeLayers: Object, context: Object }` | Dispatched when enabling/disabling an overlay. |
| `layer:opacity` | `{ opacity: number, percent: number }` | Dispatched when adjusting overlay blend opacity. |
| `site:marked` | `{ lat: number, lon: number, name: string, source: "waypoint-focus", focus: true }` | Dispatched when focusing camera on an EVA waypoint. |

### Received Events

| Event Name | Expected Payload | Component Action |
| :--- | :--- | :--- |
| `site:marked` | `{ site_id, name, lat, lon }` | Updates active landing site profile, recalculates ephemeris power budget, refreshes waypoint route, and evaluates geographic boundary rules (PSR latitude check & Far Side DTE alert). |
| `time:changed` | `{ hour: number }` | Re-evaluates ephemeris power budget against current timeline scrubber hour. |

---

## 5. Test Harness & Verification

### Interactive Browser Sandbox (`test.html`)
Open [test.html](file:///c:/Users/main/codinways/nasa/lunar-navigetor/components/horizon_topography/test.html) in any modern browser to verify:
1. **Master Drawer Toggle Buttons**: Open/close Left and Right drawers independently.
2. **Left Drawer Simulation Cluster**: Switch between Crewed, Rover, Lander, and Base Camp archetypes; inject Polar (Shackleton), Equatorial (Apollo 11), Far Side (Chang'e 4), and Custom coordinates.
3. **Right Drawer Simulation Cluster**: Switch basemaps (LROC, LOLA, Kaguya); toggle analytical overlays (Slope, PSR, WEH, DTE); select opacity presets (30%, 60%, 75%, 90%); switch calibration legends.
4. **Real-time EventBus Telemetry Stream**: Live log capturing all dispatched events and payload structures.

### Automated Test Suites
Run the full automated test matrix via Node.js:

```powershell
# GIS Right Drawer test suites
node scripts/test_gis_basemap.js          # Step 1: Basemap engine & sensor metadata
node scripts/test_gis_overlays.js         # Step 2: Geographic boundary rules (PSR / DTE)
node scripts/test_gis_legend_opacity.js    # Step 3: Adaptive calibration legends & opacity mixer
node scripts/test_gis_integration.js       # Step 4: Master end-to-end integration test

# Universal Mission Left Drawer test suites
node scripts/test_archetype_engine.js      # Multi-class archetypes
node scripts/test_power_budget.js          # Ephemeris power budget & battery SoC
node scripts/test_waypoint_engine.js       # Dynamic physiographic waypoints
node scripts/test_mission_planner.js       # Master Left Drawer integration
```
