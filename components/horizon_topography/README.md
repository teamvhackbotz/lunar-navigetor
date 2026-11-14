# Mission Constraints & GIS Overlays Drawers (`components/horizon_topography/`)

## Assigned Developer
Teammate D (Mission Operations & Remote Sensing)

## Responsibilities
- **Dual Global Analytical Drawers:**
  1. **Left Drawer: Mission Constraints & EVA Traverse Planner**
     - Surface stay duration slider (48 to 240 hrs) and battery discharge calculations.
     - Power budget gauges (10 kW VSAT solar array, 72-hr RFC darkness reserve, 94% battery SoC).
     - Lunar Terrain Vehicle (LTV) mobility constraints (12.5 km operating radius, walk-back margins).
     - Interactive EVA traverse waypoint routes (Touchdown, Saddle Science Station, PSR Cold Trap perimeter).
     - Route slope hazard warning banner (alerts if traverse crosses slopes $>15^\circ$).
     - Deployable science payload checklist (PCMS, Cryogenic Drill, Retroreflector, Seismic Station).
  2. **Right Drawer: GIS Remote Sensing & Spatial Overlays**
     - Optical basemap selector: LROC WAC Albedo (Visible light), LOLA Topographic Relief (Altimeter DEM), and Kaguya TC Ortho.
     - Analytical hazard and resource overlays: LOLA Slope Gradient heatmap, Permanently Shadowed Regions (PSRs), Water-Equivalent Hydrogen (WEH), and Earth Radio line-of-sight occlusion mask.
     - Overlay opacity mixer (0% to 100% transparency blending).
     - Instrument calibration legend and USGS / NASA citation metadata.
- **Physical Protruding Edge Handles:** Provide persistent edge tabs (`[ 🧭 Mission & Traverse ❯ ]` and `[ ❮ GIS Overlays 🗺️ ]`) pinned at 50% screen height to open/close each tool independently.

## EventBus Interface
- **Emits:**
  - `traverse:waypoint_select`: Dispatched when an operator clicks an EVA waypoint (`{ waypointId, lat, lon, title, slope }`).
  - `mission:constraint_change`: Dispatched when the stay slider moves (`{ stayHours, batterySoc, daylightMargin }`).
  - `layer:basemap_change`: Dispatched when switching basemap (`{ basemap: 'lroc' | 'lola' | 'kaguya' }`).
  - `layer:toggle`: Dispatched when toggling overlay layers (`{ layerId: 'slope' | 'psr' | 'ice' | 'dte', enabled: boolean }`).
  - `layer:opacity`: Dispatched when adjusting overlay opacity (`{ opacity: number }`).
  - `site:marked`: Dispatched when clicking the waypoint focus button (`{ lat, lon, name, focus: true }`).
- **Listens for:**
  - `site:marked`: Dynamically updates the active site header and re-populates the EVA waypoint route.

## File Structure
- `horizon_topography.html`: Markup for Left (Mission Planner) and Right (GIS Overlays) drawers and edge handles.
- `horizon_topography.css`: Positioning, pure-CSS sibling slide transitions, responsive handle offsets, and control styles.
- `horizon_topography.js`: Waypoint route controller, power calculations, basemap switching, and layer states.
- `test.html`: Standalone micro-frontend test harness.
