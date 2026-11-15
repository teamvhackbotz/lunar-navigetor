# Mission Constraints & GIS Overlays Drawers (`components/horizon_topography/`)

## Assigned Developer

Teammate D (Mission Operations & Remote Sensing)

## Responsibilities

- **Dual Global Analytical Drawers:**
  1. **Left Drawer: Universal Mission Constraints & EVA Traverse Planner**
     - **Multi-Class Mission Archetypes**:
       - `🧑‍🚀 Crewed`: Artemis III/IV Sortie (10.0 kW VSAT, 72-hr RFC darkness reserve, 2 Astronauts, 12.5 km LTV radius, 8.0 km/h, 48–240h stay).
       - `🤖 Rover`: Robotic Prospecting Rover (450 W Solar Mast, 48-hr Battery/RHU, 0 Crew, 3.5 km chassis radius, 0.2 km/h science drive, 24–720h stay).
       - `📡 Lander`: Stationary Science Lander (1.2 kW GaAs Array, 14-hr Twilight Battery, 0 Crew, 1.5 m robotic arm envelope, 0.0 km/h static, 24–360h stay).
       - `🏗️ Base Camp`: Extended Surface Outpost (40.0 kW Fission Surface Power, 360-hr full lunar night reserve, 4 Astronauts, 25.0 km Pressurized Rover radius, 72–720h stay).
     - **Ephemeris-Coupled Power Budget**:
       - Calculates authentic continuous daylight window ($T_{\text{daylight}}$) from JPL Horizons November 2026 ephemeris series.
       - Evaluates physical daylight margin ($M_{\text{daylight}} = T_{\text{daylight}} - T_{\text{stay}}$).
       - Simulates battery/RFC State of Charge (SoC) % with floating solar charge ($\ge 94\%$), shadow discharge ($20\% - 85\%$), and critical depletion alerts ($< 20\%$) with `.fill-sage`, `.fill-warn`, and `.fill-danger` styling.
     - **Dynamic Physiographic Waypoint Route Generator**:
       - Procedurally synthesizes 3 waypoints for any landing site:
         - **Polar ($|\text{lat}| \ge 75^\circ$)**: Touchdown LZ $\to$ Solar Illumination Crest Station $\to$ Cold Trap / PSR Perimeter.
         - **Equatorial ($|\text{lat}| < 75^\circ$)**: Touchdown LZ $\to$ Geologic Unit Contact / Basalt Outcrop $\to$ Impact Crater Ejecta Blanket (eliminates `null km` & `None PSR`).
         - **Far Side ($|\text{normLon}| \ge 100^\circ$)**: Basin Floor LZ $\to$ Central Peak Uplift / Mantle Outcrop $\to$ Earth-Moon L2 Relay Sightline Mast.
         - **Stationary Lander**: Touchdown Pad ($0.0\text{ m}$) $\to$ Robotic Arm Deployment ($5.0\text{ m}$) $\to$ Surface Sensor / EMI Mast ($15.0\text{ m}$).
       - Calculates genuine spherical geodesic distances on the Moon ($R_{\text{moon}} = 1737.4\text{ km}$) and reports cumulative round-trip traverse.
     - **Vehicle-Specific Slope Hazard Monitor**:
       - Evaluates terrain slope against active vehicle limits (Lander touchdown tip-over $> 10^\circ$, Rover wheel-stall $> 12^\circ$, LTV steep flank $> 15^\circ$).
     - **Adaptive Science Payload Checklist**:
       - Re-renders deployable instruments dynamically based on active archetype.
  2. **Right Drawer: GIS Remote Sensing & Spatial Overlays**
     - Optical basemap selector: LROC WAC Albedo (Visible light), LOLA Topographic Relief (Altimeter DEM), and Kaguya TC Ortho.
     - Analytical hazard and resource overlays: LOLA Slope Gradient heatmap, Permanently Shadowed Regions (PSRs), Water-Equivalent Hydrogen (WEH), and Earth Radio line-of-sight occlusion mask.
     - Overlay opacity mixer (0% to 100% transparency blending).
     - Instrument calibration legend and USGS / NASA citation metadata.
- **Physical Protruding Edge Handles:** Provide persistent edge tabs (`[ 🧭 Mission & Traverse ❯ ]` and `[ ❮ GIS Overlays 🗺️ ]`) pinned at 50% screen height to open/close each tool independently.

## EventBus Interface

- **Emits:**
  - `mission:archetype_change`: Dispatched when switching mission class (`{ archetype, config }`).
  - `mission:constraint_change`: Dispatched when stay slider scrubs or active site updates (`{ stayHours, daylightAvailable, daylightMargin, shadowHours, batterySoc, batteryStatus, primaryPower, darknessReserve, archetype, siteId }`).
  - `traverse:waypoint_select`: Dispatched when clicking an EVA waypoint (`{ waypointId, lat, lon, title, slope, dist, archetype }`).
  - `site:marked`: Dispatched when clicking the waypoint focus button (`{ lat, lon, name, source: "waypoint-focus", focus: true }`).
  - `layer:basemap_change`: Dispatched when switching basemap (`{ basemap: 'lroc' | 'lola' | 'kaguya' }`).
  - `layer:toggle`: Dispatched when toggling overlay layers (`{ layerId: 'slope' | 'psr' | 'ice' | 'dte', enabled: boolean }`).
  - `layer:opacity`: Dispatched when adjusting overlay opacity (`{ opacity: number }`).
- **Listens for:**
  - `site:marked`: Resolves site through `LunarPhysics.findSite()` or synthesizes custom coordinates via `LunarPhysics.synthesizeCustomSite()`.
  - `time:changed`: Re-evaluates ephemeris power budget and stay constraints when the timeline scrubber moves.

## Public API (`window.MissionPlanner`)

- `setArchetype(archetypeKey)`: Programmatically switch active mission class.
- `getArchetype()`: Returns active archetype string (`'crewed'`, `'rover'`, `'lander'`, `'basecamp'`).
- `getArchetypeConfig(key)`: Returns complete configuration object for an archetype.
- `getActiveSite()`: Returns current active site profile object.
- `getActiveSiteKey()`: Returns current active site ID slug.
- `generateTraverseWaypoints(site, archetype)`: Returns procedural waypoints array.
- `renderWaypoints(site)`: Re-renders route cards, cumulative traverse distance, and hazard alert.
- `updatePowerBudgetAndStay(stayHours)`: Recalculates daylight reserve, shadow hours, and battery SoC %.
- `calculateLunarDistanceKm(lat1, lon1, lat2, lon2)`: Geodesic distance formula.

## File Structure

- `horizon_topography.html`: Markup for Left (Universal Mission Planner) and Right (GIS Overlays) drawers and edge handles.
- `horizon_topography.css`: Layout, archetype pill controls, progress bar fills (`.fill-sage`, `.fill-warn`, `.fill-danger`), hazard callouts, and sibling slide transitions.
- `horizon_topography.js`: Universal mission archetype controller, geodesic waypoint generator, power budget engine, and GIS overlays coordinator.
- `test.html`: Standalone micro-frontend test harness with interactive simulation triggers.
