# Lunar Landing Site Navigator: Comprehensive User Manual & Operations Guide

---

## 1. Executive Summary & Mission Purpose

The **Lunar Landing Site Navigator** is an interactive aerospace mission cockpit and cartographic analysis platform engineered to solve the complex trade-offs of lunar surface site selection.

Evaluating lunar landing sites—particularly across the extreme terrain of the Lunar South Pole ($84^\circ\text{S} - 90^\circ\text{S}$)—has historically forced planetary scientists, mission architects, and flight dynamicists to juggle isolated, disjointed software suites:

- **NASA QuickMap / Moon Trek** for optical cartography and slope mapping.
- **JPL Horizons & NAIF SPICE** for raw ephemeris tables and planetary vectors.
- **LOLA DEM ray-tracers** for topographic horizon occlusion and extreme crater shadowing.
- **Offline spreadsheets and plotting scripts** for battery depth-of-discharge, solar array sizing, and Direct-to-Earth (DTE) comms line-of-sight.

When a launch window slips by several days or a primary landing target is deemed hazardous, mission teams previously spent days recomputing celestial vectors, rebuilding horizon masks, and synthesizing comparative charts.

The **Lunar Landing Site Navigator** unifies these workflows into a single **zero-latency, event-driven flight deck**. By pairing a high-fidelity WebGL 3D lunar globe with multi-projection 2D GIS synchronization, dynamic ephemeris lighting, authentic NASA/JAXA remote sensing layers, and real-time battery/traverse constraint modeling, the system delivers immediate, intuitive answers to mission-critical trade-off inquiries.

```
                                  LUNAR COCKPIT ARCHITECTURE
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                      TOP NAVIGATION: Brand, API Status, Search, Themes                 │
 ├────────────────────────────────────────────────────────────────────────────────────────┤
 │                  TOP CORRIDOR: Candidate Site Comparison Cards (Alt + ↑)               │
 ├────────────────────────────┬──────────────────────────────┬────────────────────────────┤
 │        LEFT DRAWER         │     CENTER MAIN VIEWPORT     │        RIGHT DRAWER        │
 │  Mission & EVA Planner     │     3D Interactive Moon      │    GIS Remote Sensing      │
 │  - Surface Stay Slider     │   - Authentic JPL Lighting   │    - Basemaps (LROC/LOLA)  │
 │  - Battery SoC Simulation  │   - 4K/8K Surface Textures   │    - Slope / PSR Ice / WEH │
 │  - LTV Traverse Radius     │   - Point Marking / Orbit    │    - DTE Sightline Mask    │
 │  - Waypoint Hazards        │   - Earth & Sun Celestial    │    - Opacity Blend Mixer   │
 │        (Alt + [)           │                              │         (Alt + ])          │
 ├────────────────────────────┴──────────────────────────────┴────────────────────────────┤
 │             BOTTOM DRAWER: 2D Cartographic Synchronizer Deck (Alt + ↓)                 │
 │             - South Pole / 2:1 Flat Map / North Pole / Tri-Map Comparison              │
 │             - Tactical Flanking Wings (Target Shortcuts & Live Selenographic Telemetry)│
 │             - Great Circle Distance Measurement Tool (Shift + Right-Click)             │
 ├────────────────────────────────────────────────────────────────────────────────────────┤
 │             BOTTOM COCKPIT DOCK: Ephemeris Timeline & Playback Controller              │
 │             - November 2026 Scrub Bar, Speed Multipliers (1x, 100x, 1000x), UTC Clock  │
 │             - Floating AI Assistant Launcher ("Dr. Raj, Ph.D. Astrophysicist")         │
 └────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. System Architecture & Getting Started

### 2.1 Technology Stack & System Design

The application is architected around a modern, modular **micro-frontend architecture** that operates with zero heavy frontend build steps (no Node.js/npm bundling, no Webpack/Vite compilation, no framework runtime overhead):

- **3D Graphics Engine:** Three.js (r128) via WebGL with custom Lambertian lunar shaders, directional solar illumination, and orbital controls.
- **Decoupled Event Bus:** `core/event_bus.js` implements a publish/subscribe communication backbone (`site:marked`, `time:changed`, `mission:constraint_change`, `layer:toggle`, `layer:opacity`).
- **Mathematics & Physics Core:** `core/coord_math.js` (selenographic spherical trigonometry, Haversine/Great Circle distance, polar stereographic projections) and `core/lunar_physics.js` (JPL Horizons ephemerides, solar elevation models, cryogenic temperatures).
- **Backend Service:** High-performance Python **FastAPI** (`backend-api/`) delivering live JPL Horizons queries, 21 authentic NASA candidate profiles, LOLA digital elevation data, and AI analytics.

### 2.2 System Prerequisites

- **Web Browser:** Any modern evergreen browser with WebGL 2.0 hardware acceleration enabled (Google Chrome 110+, Mozilla Firefox 115+, Microsoft Edge 110+, Apple Safari 16+).
- **Hardware:** Dedicated or modern integrated GPU (Intel Iris Xe, AMD Radeon 600M+, Apple Silicon M-series, or NVIDIA GeForce GTX 1050+ recommended for 8K texture rendering).
- **Local Runtime:** Node.js v16+ (for local HTTP micro-server) and Python 3.10+ with UV or pip (optional, for the live backend API).

### 2.3 Launching the Application

#### Step 1: Launch the Local HTTP Web Server

Due to browser Cross-Origin Resource Sharing (CORS) security policies regarding dynamic `fetch()` calls of micro-frontend HTML templates and JSON datasets, the application must be served over an HTTP protocol rather than raw `file://`.

Open a terminal in the project directory:

```bash
node scripts/serve.js
```

The server will bind locally and output:

```text
[Lunar Navigator Server] Serving on http://127.0.0.1:8000
```

Open your browser and navigate to `http://127.0.0.1:8000/`.

#### Step 2: Launch the FastAPI Backend (Optional / Recommended)

The frontend contains full offline fallback datasets for all 21 curated NASA landing sites. However, to enable live ephemeris vector calculations, dynamic terrain endpoints, and AI assistant intelligence:

Open a second terminal window:

```bash
cd backend-api
uv run python run.py
```

*(Alternatively with standard Python: `pip install -r requirements.txt && python run.py`)*

Once started, the backend runs at `http://127.0.0.1:8000` (or configured API port), and the frontend Top Navigation status badge will immediately transition to **`API: LIVE (21)`**.

---

## 3. Top Navigation & Cockpit Control Bar

The persistent Top Navigation bar (`components/top_nav/`) provides system-level telemetry and flight deck configuration:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🌕 Lunar Navigator   [● API: LIVE (21)]       [🔍 Search (Ctrl+K)]   [▼ Compare Sites (2)]  [⚙]│
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Brand & Mission Banner:** Displays the application title and current mission operational state.
2. **API Connection Indicator:**
   - **`● API: LIVE (21)` (Emerald):** Real-time connection established to the FastAPI backend service; all 21 NASA landing sites and live ephemeris services active.
   - **`○ API: STANDBY (Static)` (Amber):** Backend offline; client is seamlessly operating in resilient offline cached mode using pre-baked NASA telemetry.
3. **Global Search Palette Trigger (`Ctrl + K`):** Opens the fast command palette to instantly search across Artemis candidate zones, Apollo historic sites, CLPS targets, and geographic features.
4. **Candidate Site Comparison Trigger (`Alt + ↑`):** Toggles the top comparison corridor and displays the count badge of currently pinned candidate sites (`Compare Sites [N]`).
5. **View Mode Switcher:**
   - **Surface Mode:** Puts focus on the lunar terrain, local slope, and surface operations.
   - **System Mode:** Expands the camera to the macro celestial triad (Sun-Earth-Moon orbital vectors).
6. **Cockpit Settings (`⚙`):** Opens configuration settings for graphics quality (anti-aliasing, shadow mapping, texture resolution), ephemeris telemetry source, and active operational theme.
7. **Operational Themes:**
   - **Earth Marine (Default):** Deep charcoal cockpit with terracotta and sand telemetry accents.
   - **Regolith Tactical:** Monochromatic dark basalt theme optimized for high-contrast low-light operations.
   - **Deep Space Amber:** High-visibility amber avionics theme inspired by Apollo flight computers.

---

## 4. Central 3D Lunar Viewport Operations

The central viewport (`components/moon_3d/`) renders an authentic, GPU-accelerated lunar globe using NASA LROC high-resolution basemaps and LOLA topographic elevation displacement.

### 4.1 Camera Navigation & Orbit Controls

- **Rotate / Orbit:** Click and hold the **Left Mouse Button**, then drag to rotate the Moon across all latitudes and longitudes.
- **Pan Camera:** Click and hold the **Right Mouse Button** (or hold **Shift + Left Click**), then drag to translate the camera laterally.
- **Zoom In / Out:** Scroll the **Mouse Wheel** (or pinch-to-zoom on multitouch trackpads/touchscreens). Inertial damping prevents jarring camera stops.
- **Reset Orientation:** Double-click on empty space to re-center the view on the current active landing site.

### 4.2 Flight Modes: Grab vs. Mark Mode

Located in the lower-left corner of the 3D viewport is the Mode HUD:

- **Grab Mode (Default):** Normal navigation mode. Dragging rotates the globe without placing pins.
- **Mark Mode (`Point Marking`):** Click the crosshair icon. When active, clicking anywhere on the 3D Moon calculates exact selenographic coordinates (latitude, longitude, elevation) and dispatches a universal `site:marked` event across all application modules.

### 4.3 Texture Resolution & Performance Controls

In the lower-left toolbar, operators can toggle between:

- **4K HD:** High-performance basemap ideal for integrated GPUs or mobile devices.
- **8K Ultra-HD:** NASA LROC global equirectangular basemap ($8192 \times 4096$) rendering micro-craters, ridges, and massifs with surgical clarity.
- **Dynamic Normal Mapping:** Toggle surface normal relief to highlight micro-roughness under grazing sunlight.

### 4.4 Ephemeris-Coupled Solar Illumination

The 3D lunar globe does not use static game lighting. The directional light vector in Three.js is mathematically synchronized with the global timeline:

- As you scrub the timeline across November 2026, the Sun's position moves according to authentic JPL Horizons ephemerides.
- Watch crater rims cast long, dynamic shadows across polar depressions.
- Observe extreme polar lighting where peaks remain sunlit while crater floors remain engulfed in permanent cryogenic darkness.

---

## 5. Candidate Site Comparison Deck (Top Corridor)

Accessible via the `Compare Sites` button in the top navigation or pressing **`Alt + ↑`**, the Top Corridor (`components/comparison_cards/`) provides side-by-side trade-off evaluations.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ CANDIDATE SITE COMPARISON CORRIDOR                                            [✕ Close]│
│ ┌───────────────────────────────┐ ┌───────────────────────────────┐ ┌────────────────┐ │
│ │ PEAK NEAR SHACKLETON   [Pin]  │ │ NOBILE RIM 1           [Pin]  │ │ + ADD SITE     │ │
│ │ 89.6° S, 129.2° E  · Alt: +1.1km│ │ 85.2° S, 53.5° E   · Alt: +0.4km│ │                │ │
│ │ Local Slope: 4.2° (SAFE)      │ │ Local Slope: 8.7° (CAUTION)   │ │ Select from    │ │
│ │ ── Authentic Solar Curve ──   │ │ ── Authentic Solar Curve ──   │ │ curated list   │ │
│ │ ~~~/\~~~~~~~~~~~~~~~~~~~~~~~  │ │ ~~~~~~/\~~~~~~~~~~~~~~~~~~~~  │ │ or click 3D    │ │
│ │ Next Sunrise: In 14 hrs       │ │ Next Sunrise: In 48 hrs       │ │ globe...       │ │
│ │ Next Sunset:  In 144 hrs      │ │ Next Sunset:  In 96 hrs       │ │                │ │
│ │ Solar Elevation: +1.4° (Day)  │ │ Solar Elevation: -0.8° (Night)│ │                │ │
│ │ PSR Ice Temp: 38 K (-235°C)   │ │ PSR Ice Temp: 42 K (-231°C)   │ │                │ │
│ │ DTE Comms: Clear LOS (+6.2°)  │ │ DTE Comms: Clear LOS (+4.1°)  │ │                │ │
│ │ [Inspect Site]     [Remove ✕] │ │ [Inspect Site]     [Remove ✕] │ │                │ │
│ └───────────────────────────────┘ └───────────────────────────────┘ └────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Card Telemetry Metrics

Each candidate site card provides a standardized operational scorecard:

1. **Selenographic Location:** Latitude, Longitude, and elevation relative to the lunar mean radius (1,737.4 km).
2. **Local Slope Hazard:** Computed over a 30-meter baseline. Color-coded into three aerospace safety tiers:
   - **SAFE (Green, $<5^\circ$):** Nominal stability for crewed and uncrewed landing gear.
   - **CAUTION (Amber, $5^\circ - 12^\circ$):** Marginal slope requiring active touchdown hazard detection.
   - **CRITICAL (Red, $>12^\circ$):** High tip-over risk; exceeds standard Artemis lander landing envelope.
3. **Authentic 720-Hour Solar Illumination Curve:** An SVG sparkline displaying the continuous solar elevation profile throughout the mission month. The horizontal datum line represents the local astronomical horizon ($0^\circ$). Regions above the line indicate direct sunlight; regions below indicate shadow.
4. **Astronomical Event Countdowns:** Real-time countdowns to the next Sunrise, Sunset, Earthrise, and Earthset.
5. **Solar Elevation Angle:** Real-time sun angle relative to the local horizon, indicating solar panel power collection efficiency.
6. **PSR Ice Cold Trap Temperature:** Modeled cryogenic floor temperature (Kelvin and Celsius) from NASA Diviner thermal radiometer data.
7. **Direct-To-Earth (DTE) Comms Status:** Indicates whether Earth is visible above the local topographic skyline or occluded by crater terrain.

### 5.2 Card Operations

- **Add Candidates:** Click the `+ Add Candidate` slot or mark any location on the 3D globe / 2D map.
- **Inspect Site:** Clicking `Inspect Site` opens the High-Resolution Site Inspector modal with 360° horizon profiles.
- **Remove Candidate:** Click the `✕` icon to remove a site from the trade-off deck.

---

## 6. Mission Constraints & EVA Traverse Planner (Left Drawer)

Open by clicking the **`Mission & Traverse`** tab on the left screen edge or pressing **`Alt + [`**. This drawer (`components/horizon_topography/`) houses the surface stay simulation, power subsystem modeling, and sortie waypoint planner.

### 6.1 Mission Archetype Selection

Switch between three distinct surface vehicle archetypes, which dynamically reconfigure mobility constraints, power limits, and slope thresholds:

1. **Crewed Mission (Artemis III / IV):**
   - Focus: Astronaut surface stay limits, Lunar Terrain Vehicle (LTV) mobility, strict slope safety ($<5^\circ$ nominal), and life-support power.
2. **Robotic Rover (VIPER / LTV Scout):**
   - Focus: Continuous traverse planning, 450 W solar mast collection, 720-hour extended mission duration, and instrument cold-trap sampling.
3. **Stationary Lander (CLPS / Blue Ghost):**
   - Focus: Touchdown envelope footprint ($30.0\text{ m}$ radius), static solar arrays, tilt angle margin, and stationary payload telemetry.

### 6.2 Surface Duration, Energy & Battery Simulation

The planner features an interactive **Stay Window Slider** (24 to 720 hours):

- **Primary Power Architecture:** Displays active system (e.g., $10.0\text{ kW}$ Vertical Solar Array Technology - VSAT, or Fuel Cells).
- **Daylight Margin & Darkness Reserve:** Continuously calculates daylight operational reserve hours against the selected stay duration.
- **Ephemeris-Coupled Battery State-of-Charge (SoC):** As you drag the timeline into shadows, the battery simulator calculates discharge curves:
  - **Nominal ($>80\%$ SoC):** Green indicator.
  - **Warning ($50\% - 80\%$ SoC):** Amber indicator.
  - **Critical Depletion ($<50\%$ SoC):** Red alert indicating battery depletion exceeds regenerative fuel cell reserve.

### 6.3 Surface Mobility & LTV Walk-Back Margin

For crewed exploration, the system monitors astronaut safety envelopes:

- **Operating Radius:** Maximum authorized sortie distance from the lander ($12.5\text{ km}$).
- **Nominal Speed:** Rover traverse speed ($8.0\text{ km/h}$).
- **Planned Traverse:** Real-time round-trip cumulative distance.
- **Walk-Back Margin:** Verifies whether astronauts can walk back to the lander on foot within primary suit life-support reserves ($<5.0\text{ km}$ threshold).

### 6.4 Sortie Path Planning & EVA Waypoints

The lower section manages ordered surface traverse waypoints:

- Displays **Waypoint 1 (Touchdown Landing Zone)** followed by sequential science stations (e.g., *Solar Illumination Crest*, *Cold Trap Perimeter*).
- Inspects each waypoint's local distance, elevation change, and terrain slope hazard rating (`SAFE`, `CAUTION`, `CRITICAL`).
- Supports adding custom waypoints to dynamically plan scientific exploration routes.

---

## 7. GIS Remote Sensing & Spatial Overlays (Right Drawer)

Open by clicking the **`GIS Overlays`** tab on the right screen edge or pressing **`Alt + ]`**. This drawer provides multi-spectral orbital datasets directly from NASA and JAXA missions.

### 7.1 Sensor Basemaps

Select between three authentic orbital imagery basemaps:

1. **NASA LROC WAC/NAC:** High-resolution optical surface photography from the Lunar Reconnaissance Orbiter Camera.
2. **NASA LOLA Topography:** Digital Elevation Model (DEM) color-coded by absolute elevation above lunar datum.
3. **JAXA Kaguya TC:** High-contrast low-sun elevation morphology captured by Japan's SELENE orbiter, emphasizing micro-craters and surface roughness.

### 7.2 Multi-Spectral Analytical Overlays

Toggle independent spatial analytical layers:

- **LOLA Slope Heatmap:** Highlights surface inclines across the terrain (green for flat plains, orange for moderate slopes, red for steep crater scarps).
- **Diviner Cryogenic PSR Ice Cold Traps:** Displays regions with sustained temperatures below $40\text{ K}$ ($-233^\circ\text{C}$) capable of harboring ancient volatile water ice.
- **LEND Water-Equivalent Hydrogen (WEH):** Epithermal neutron suppression mapping from the Lunar Exploration Neutron Detector indicating subsurface hydrogen deposits.
- **Direct-To-Earth (DTE) Radio Sightline Mask:** Spatial coverage map showing uninhibited line-of-sight to the NASA Deep Space Network (DSN Canberra, Goldstone, Madrid).

### 7.3 Authentic Lunar Physics Safeguards

The GIS engine enforces physical lunar realities automatically:

- **Polar-Only Constraints:** If an equatorial landing site (e.g., *Apollo 11*, $0.67^\circ\text{N}$) is selected, permanent shadow (PSR) layers are automatically disabled and flagged with a contextual badge, because equatorial latitudes experience overhead sun and zero permanent shadow.
- **Far-Side Direct Radio Shadow:** If a far-side site (e.g., *Chang'e 4*, $177.58^\circ\text{E}$) is selected, the system triggers a permanent radio shadow alert and prompts the user to verify lunar relay satellite availability (e.g., Queqiao).

### 7.4 Calibration Legends & Opacity Blend Mixer

- **Dynamic Calibration Deck:** The legend automatically morphs its numerical scale and unit dimensions based on the active layer (Slope in degrees, PSR in Kelvin, WEH in ppm, DTE in elevation angle).
- **Opacity Slider & Quick Blend Presets:** Adjust overlay transparency smoothly from $10\%$ to $100\%$, or click one-touch presets (`25%`, `50%`, `75%`, `100%`) to blend multi-spectral data over the optical basemap.

---

## 8. 2D Cartographic Synchronizer Deck (Bottom Drawer)

The bottom 2D cartography deck (`components/map_2d/`) provides precision 2D surface navigation and measurement tools.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [▲ 2D MAPS]                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 🗺️ 2D Maps  [📏 Select 2 sites]  [✦ 8K UHD]       (◎ South) (🌐 Flat) (❄️ North) (◫ Tri)   [+][-][⤢][✕]│
├──────────────────────────┬──────────────────────────────────────────┬───────────────────────────┤
│ ◀ TARGETS                │        ACTIVE PROJECTION VIEWPORT        │ TELEMETRY ▶               │
│ - Peak Near Shackleton   │                                          │ - Sun Elev: +1.4° (Day)   │
│ - Connecting Ridge       │      [ High-Resolution 2D Map ]          │ - PSR Temp: 38 K (-235°C) │
│ - Malapert Massif        │       - Click to mark coordinates        │ - Earth LOS: +6.2° (Lock) │
│ - Apollo 11 Base         │       - Shift + Right-Click to measure   │ - Slope: 5.8° (Safe)      │
│ - Chang'e 4 Far Side     │                                          │ - DSN Canberra Tracking   │
└──────────────────────────┴──────────────────────────────────────────┴───────────────────────────┘
```

### 8.1 Collapsible Edge Tab Handle (`#handle-bottom-map`)

- **Docked Position:** When collapsed, the tab rests flush directly above the bottom cockpit toolbar at `bottom: 92px`.
- **Expanded Position:** Clicking the tab or pressing **`Alt + ↓`** slides the 2D deck upward into view. The tab travels smoothly with the top edge of the drawer, inverting its chevron indicator.
- **Dual Enforcement:** Position and layout are guarded by both CSS sibling rules and JavaScript runtime enforcement (`syncBottomHandlePosition()`), ensuring it never floats in the center of the screen.

### 8.2 Cartographic Projections

Toggle between 4 presentation views using the segmented control:

1. **South Pole (`South`):** Polar Stereographic projection ($70^\circ\text{S} - 90^\circ\text{S}$) centering the Artemis exploration zone.
2. **Global Flat (`Flat`):** True 2:1 aspect ratio Equirectangular projection ($180^\circ\text{W} - 180^\circ\text{E}$) showing the entire lunar surface.
3. **North Pole (`North`):** Polar Stereographic projection ($70^\circ\text{N} - 90^\circ\text{N}$) focused on northern cold traps (Peary, Hermite).
4. **Tri-Map Panoramic Deck (`Tri`):** Simultaneous 3-column comparison deck displaying the North Polar Disc, Global Flat Map, and South Polar Disc side-by-side.

### 8.3 Tactical Flanking Wings

In Single Focused View, the map is flanked by symmetrical 76px compact grab tabs:

- **Left Wing (Targets Shortcut Console):** Click to expand quick-jump shortcuts to Artemis candidate zones, Apollo historical landmarks, and deep cold traps.
- **Right Wing (Live Telemetry & DSN Console):** Click to inspect live Sun elevation, PSR ice temperature, Earth line-of-sight angle, touchdown slope, and DSN ground station lock status.

### 8.4 Two-Point Distance Measuring Tool

1. Hold **`Shift`** and **Right-Click** on any first lunar feature to place Point A.
2. Hold **`Shift`** and **Right-Click** on a second lunar feature to place Point B.
3. Right-click either point and select **`Measure Distance`** from the context menu.
4. The system calculates and displays the exact **Great Circle (Haversine) surface distance in kilometers** along the lunar sphere (radius $1,737.4\text{ km}$), drawing a calibrated vector between the points.

### 8.5 Deck Zoom & Tactical Maximize

- **Pan & Zoom:** Use the zoom controls (`+`, `-`, `Reset`) or drag with the mouse to pan across high-resolution $8\text{K}$ basemaps.
- **Tactical Height Toggle (`⤢`):** Toggle between the baseline **390px** deck and the expanded **500px** tactical operations deck.

---

## 9. Global Mission Timeline Controller

Positioned across the bottom of the screen (`components/timeline/`), the persistent timeline regulates all temporal calculations:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [⏮] [▶] [⏭]  Speed: [1x] [100x] [1000x]  [✏ Edit]   🕐 2026-11-15 14:00 UTC  ● Daylight Window │
│ ├───────────────────────────────▲─────────────────────────────────────────────────────────────┤ │
│ 2026-11-01 00:00               Scrubber (Nov 15)                             2026-11-30 23:59 │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Playback Controls:**
   - **Play / Pause (`Space`):** Toggles real-time ephemeris simulation.
   - **Step Backward / Forward (`Alt + ←` / `Alt + →`):** Steps time in 1-hour increments.
   - **Speed Multipliers:** Select between $1\times$ (real-time), $100\times$ (accelerated orbit), and $1000\times$ (rapid lunar day/night cycles).
2. **Interactive Time Scrubber:** Drag the scrub thumb across November 2026 to evaluate lighting changes over time.
3. **Mission Window Edit Dialog (`✏ Edit`):** Custom-define the start date, end date, and calculation step resolution (10 minutes, 1 hour, 6 hours).
4. **Ephemeris Illumination Status Indicator:** Real-time badge indicating whether the currently selected site is in **Polar Day (Sunlit)**, **Twilight**, or **Polar Night (Shadowed)**.

---

## 10. AI Lunar Mission Analyst ("Dr. Raj, Ph.D.")

Dr. Raj is an integrated aerospace intelligence assistant (`components/ai_dr_raj/`) providing context-aware guidance:

- **Launch:** Click the **`AI`** button in the lower-right timeline dock or press the AI widget trigger.
- **Live Context Ingestion:** Dr. Raj automatically ingests the active landing site coordinates, current timeline timestamp, solar elevation angle, battery State-of-Charge, and active GIS layers.
- **Quick Query Pills:** One-click prompts for rapid mission analysis:
  - *"Assess solar illumination window for this site."*
  - *"Evaluate rover battery depth-of-discharge risk."*
  - *"Check Direct-to-Earth comms line-of-sight."*
  - *"Summarize terrain slope hazards."*
- **Interactive Astrophysics Q&A:** Ask complex mission design questions, request landing site comparisons, or learn about lunar geology and orbital mechanics.

---

## 11. High-Resolution Site Inspector & Search Palette

### 11.1 High-Resolution Candidate Site Inspector (`components/inspection_modal/`)

Triggered by clicking **`Inspect Site`** on any comparison card or candidate list:

- **360° Skyline Horizon Obstruction Ray-Tracer:** Visualizes surrounding crater walls and peaks blocking the horizon. Compares the Sun and Earth paths against the terrain silhouette to reveal micro-shadowing.
- **Slope Distribution Histogram:** Quantifies landing terrain into slope frequency bins ($0^\circ - 3^\circ$, $3^\circ - 6^\circ$, $6^\circ - 10^\circ$, $>10^\circ$).
- **Scientific Scorecard:** Evaluates volatile water ice accessibility, Earth communication coverage, trafficability, and planetary science return value.

### 11.2 Command Search Palette (`components/search_palette/`)

- Press **`Ctrl + K`** (or click the search bar in Top Nav).
- Type any site name (e.g., *"Shackleton"*, *"Apollo 11"*, *"Malapert"*), mission program (*"Artemis"*, *"CLPS"*), or coordinate pairs.
- Press **`Enter`** to smoothly pan the 3D globe and focus all cockpit modules on the target site.

---

## 12. Complete Keyboard Shortcuts & Quick Reference

| Key Combination | Function / Command | Context |
| :--- | :--- | :--- |
| **`Ctrl + K`** / **`Cmd + K`** | Open Quick Search Command Palette | Global |
| **`Space`** | Play / Pause Timeline Ephemeris Simulation | Global |
| **`Alt + ←`** | Step Timeline Backward 1 Hour | Global |
| **`Alt + →`** | Step Timeline Forward 1 Hour | Global |
| **`Alt + ↑`** | Toggle Top Candidate Comparison Corridor | Global |
| **`Alt + ↓`** | Toggle Bottom 2D Cartographic Synchronizer Deck | Global |
| **`Alt + [`** | Toggle Left Mission Constraints & EVA Planner Drawer | Global |
| **`Alt + ]`** | Toggle Right GIS Remote Sensing & Spatial Overlays Drawer | Global |
| **`Shift + Right-Click`** | Place Measurement Points A and B on 2D Maps | 2D Maps |
| **`Enter`** / **`Space`** | Toggle Focused Edge Tab Handles | Edge Tabs |
| **`Esc`** | Close Open Modals (Inspector, Search, Settings) | Modals |

---

## 13. Step-by-Step Mission Planning Walkthrough

### Scenario: Evaluating an Artemis III Crewed Landing at Peak Near Shackleton

1. **Locate Candidate Site:**
   - Press **`Ctrl + K`**, type `"Shackleton"`, and select **Peak Near Shackleton (89.6° S, 129.2° E)**.
   - The 3D Moon camera rotates to the South Pole, positioning the site directly under the crosshairs.

2. **Inspect Solar Illumination Over Time:**
   - In the bottom timeline dock, click **`Play`** or drag the scrubber through November 2026.
   - Observe the directional sunlight grazing the crater rim. Peak Near Shackleton remains illuminated while the interior floor of Shackleton Crater remains dark.
   - The timeline status confirms **`Polar Day`** with a solar elevation of $+1.4^\circ$.

3. **Verify Terrain & Slope Hazards:**
   - Press **`Alt + ]`** to open the **GIS Overlays** drawer.
   - Select the **`LOLA Slope Heatmap`** layer and set opacity to **`50%`**.
   - Note that the peak ridge displays soft green shades, confirming a gentle local slope ($4.2^\circ$, safe for lander gear).

4. **Verify Direct-to-Earth Communication:**
   - In GIS Overlays, activate the **`Earth Direct-to-Earth (DTE)`** mask.
   - The telemetry readout indicates a positive elevation angle ($+6.2^\circ$), confirming an uninhibited radio sightline to NASA DSN ground stations without requiring a relay satellite.

5. **Plan Crew Surface Stay & Rover Traverse:**
   - Press **`Alt + [`** to open the **Mission Constraints & Traverse Planner**.
   - Set Mission Archetype to **`Crewed`**.
   - Adjust the **Stay Window Slider** to **`144 hours (6.0 days)`**.
   - Check the **Power Budget**: Battery State-of-Charge remains at $95\%$ nominal with $+83\text{ hrs}$ daylight margin.
   - Review the Sortie Waypoints: The round-trip traverse to the Cold Trap Perimeter is $4.6\text{ km}$, safely within the $5.0\text{ km}$ walk-back safety limit.

6. **Conduct Side-by-Side Trade-Off Analysis:**
   - Press **`Alt + ↑`** to open the **Candidate Comparison Corridor**.
   - Click **`+ Add Candidate`** and select **Malapert Massif**.
   - Compare the two scorecards side-by-side: Note Malapert's higher elevation ($+5.0\text{ km}$) and superior Earth visibility against Shackleton's closer proximity to permanent water ice deposits.

---

## 14. System Configuration & Troubleshooting (FAQ)

### Q1: The browser displays a "Local file:// protocol detected" banner on load

**Cause:** Modern web browsers block asynchronous template fetching (`fetch()`) when pages are loaded directly from disk via `file:///`.  
**Solution:** Run the built-in micro-server by executing `node scripts/serve.js` from the project root and navigate to `http://127.0.0.1:8000/`.

### Q2: The 3D Moon appears dark or black

**Cause:** The active timeline date may be set to a period of polar night for that specific lunar hemisphere, or the directional sun vector is on the far side.  
**Solution:** Scrub the bottom timeline slider forward into a sunlit window (e.g., mid-November 2026 for South Pole targets) or rotate the globe toward the sunlit crescent.

### Q3: Why is the Diviner PSR Ice Cold Trap layer disabled when viewing Apollo 11?

**Cause:** The application's authentic lunar physics engine automatically suppresses polar-only phenomena at equatorial and mid-latitude sites ($|\text{Lat}| < 75^\circ$), where high sun angles eliminate permanent shadowing.  
**Solution:** To inspect cryogenic cold traps, select a high-latitude polar candidate such as *Peak Near Shackleton*, *de Gerlache Rim*, or *Hermite Crater*.

### Q4: 3D globe frame rate is low on my laptop

**Cause:** Hardware acceleration may be disabled or the basemap is set to 8K Ultra-HD on an integrated GPU.  
**Solution:**

1. Open the lower-left viewport resolution toggle and switch from **`8K UHD`** to **`4K HD`**.
2. Open Settings (`⚙`) and set Anti-Aliasing to `Off`.
3. Verify that your browser has Hardware Acceleration enabled in browser settings.

### Q5: How do I measure surface distances in the 2D Cartography Deck?

**Solution:**

1. Open 2D Maps (`Alt + ↓`).
2. Hold **`Shift`** and **Right-Click** on your starting landmark (Point A).
3. Hold **`Shift`** and **Right-Click** on your destination landmark (Point B).
4. Right-click either marker and choose **`Measure Distance`**. The calculated Great Circle distance will be displayed in kilometers in the top badge and along the vector.

---
*Lunar Landing Site Navigator — NASA Space Apps Challenge & Lunar Mission Architecture Suite*
