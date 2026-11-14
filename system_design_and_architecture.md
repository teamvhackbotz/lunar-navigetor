# System Design & UI Architecture: Lunar Landing Site Navigator

*Documenting the team's architectural blueprint, UI layout, modular component breakdown, and feature specifications.*

---

## 1. High-Level Concept & Design Philosophy

The application is conceived as a **unified, interactive mission cockpit** built as a single-page web application. Instead of forcing mission planners or students to switch between disjointed external tools, all primary evaluations (3D surface geometry, 2D GIS cartography, celestial dynamics, topographic horizon occlusion, and scenario comparison) exist in a single synchronized viewport with modular, collapsible panels.

### Core Technology Stack
- **Backend:** FastAPI (Python)
  - Serves API endpoints for celestial calculations (Sun/Earth positions, libration, Horizons/SPICE data or precomputed datasets).
  - Supplies terrain/DEM profile queries and landing site metadata.
  - Hosts backend integration for the AI persona ("Dr. Raj").
- **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES6+ Modules) + **Three.js via CDN**
  - **Decoupled Architecture:** Zero build tooling (no Node.js/npm, no Webpack/Vite, no React). Pure standard web standards so team members can edit `.html`, `.css`, and `.js` files directly.
  - **3D Engine:** Three.js imported via a single `<script>` CDN tag. Leverages the user's GPU (WebGL) for smooth 60 FPS rendering of the textured Moon sphere, directional solar lighting, dynamic shadows, and orbital camera controls.
  - **Communication:** Centralized Event Bus (`static/js/event_bus.js`) for seamless cross-component communication.

---

## 2. Component Layout & Wireframe Map

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [Top Collapsible Window]: Side-by-Side Landing Site Comparison Cards                            │
│ (Site Name, Slope/Incline, Sunset/rise, Earthset/rise, Temp, Horizon/Occlusion, Solar Elv, etc.)│
├─────────────────────────────────────────────────────────────────────────────────────────┬───────┤
│ [Top-Left Mini-Map]                                                                     │ [☰]   │
│ Celestial Triad: Sun - Moon - Earth                                                     │ Right │
│ (Center-switching: Moon/Earth/Sun-centric)                                              │ Nav   │
│                                                                                         │ Menu  │
│                                                                                         │       │
│                                                                                         │       │
│                                  [CENTER MAIN VIEWPORT]                                 │       │
│                                   3D Interactive Moon                                   │       │
│                               (Three.js / WebGL / Cesium)                               │       │
│                                                                                         │       │
│ [Left Collapsible Window]                                                               │       │
│ Topography, Horizon Profiles &                                                          │       │
│ Extreme Crater Shadowing (LOLA)                                                         │       │
│                                                                                         │       │
├─────────────────────────────────────────────────────────────────────────────────────────┴───────┤
│ [Bottom Collapsible Drawer]: Flat 2D Lunar Map (Synchronized 2-way with 3D Moon)                │
│ (Point marking, Distance measuring tool, Basemaps)                                              │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [Bottom Left Floating Card]            │ [Bottom Persistent Control]                            │
│ "Dr. Raj, Ph.D. Astrophysicist" (AI)   │ Global Interactive Time Scrub Bar                      │
│ (Planner guidance & Student Moon Q&A)  │ (Play/Pause, Speed multiplier, Lunar Day/Season marks) │
└────────────────────────────────────────┴────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Component Breakdown

### Component 1: 3D Moon Central Viewport
- **Role:** Main visual focal point.
- **Capabilities:**
  - Orbit, pan, and zoom around the lunar globe.
  - Visual pin markers for curated landing sites and user-defined custom coordinates.
  - Frustum culling / toggleable visibility for 3D Earth and distant Sun to maintain smooth rendering performance.
  - Dynamic lighting cast from the calculated solar position at the selected timestamp.

### Component 2: Synchronized Collapsible 2D Map (Bottom Drawer)
- **Role:** Slides up from above the timeline to allow flat spatial analysis without navigating away.
- **Bi-directional Synchronization:**
  - Clicking/marking a coordinate on the 2D map immediately places the marker on the 3D globe.
  - Selecting a site in 3D centers/highlights the point on the 2D map.
- **Tools:**
  - Two-point distance measuring tool.
  - Surface feature inspection.

### Component 3: Side-by-Side Comparison Cards (Top Collapsible Panel)
- **Role:** Solves the core trade-off decision dilemma for mission planners and educators.
- **Card Contents per Candidate Site:**
  - Site Name & Coordinates (Lat, Long, Elevation).
  - Terrain morphology & surface slope / incline angle.
  - Countdown & timestamps: Next Sunset, Sunrise, Earthset, Earthrise.
  - Solar elevation angle (power generation efficiency indicator).
  - Surface temperature estimate.
  - Horizon obstruction impact & Earth visibility status.
  - Temporal trend mini-graphs (illumination and comms windows across lunar days or seasons).
- **Interactions:**
  - Add site via dropdown (curated list), manual coordinate typing, or clicking 2D/3D map.
  - Remove, pin, or reorder cards to evaluate trade-offs side by side.

### Component 4: Global Timeline Controller (Bottom Bar)
- **Role:** Controls temporal dynamics across the entire application.
- **Capabilities:**
  - Scrub backwards and forwards through dates, hours, lunar days, and seasons.
  - Playback controls (Play, Pause, Speed Multiplier: $1\times, 100\times, 1000\times$).
  - Bookmarks / quick-jump buttons for key mission milestones or eclipse events.
  - Broadcasts timestamp updates to all listening components simultaneously.

### Component 5: Celestial Triad Mini-Map (Top-Left)
- **Role:** Provides spatial macro-context of the Sun-Earth-Moon system.
- **Interactive Center-Switching:**
  - **Moon-centric:** Shows how the Sun and Earth move relative to the Moon (visualizing lunar libration and the apparent Earth wobble in the lunar sky).
  - **Earth-centric:** Shows the Moon orbiting Earth with solar illumination phases.
  - **Heliocentric (Sun-centric):** Shows the Earth-Moon system orbiting the Sun.

### Component 6: Topography & Horizon Shadowing (Left Collapsible Window)
- **Role:** Evaluates the extreme lighting constraints of South Pole topography that cannot fit into standard cards.
- **Capabilities:**
  - Generates the $360^\circ$ terrain horizon elevation mask from Digital Elevation Models (LOLA).
  - Overlays the Sun and Earth trajectories directly over the local mountain/crater silhouette.
  - Visualizes deep crater shadowing and steep slope hazard warnings.

### Component 7: AI Advisor - "Dr. Raj, Ph.D. Astrophysicist" (Bottom-Left)
- **Role:** Dual-purpose conversational agent for accessibility across all skill levels.
  - **For Mission Planners:** Provides rapid analytical commentary (*"Site A has 48 hours more continuous illumination than Site B during the November window, but Earth elevation dips below 1.2°"*).
  - **For Students & Public:** Answers foundational lunar science questions (*"Why does the Earth wobble in the lunar sky?", "What is a peak of eternal light?"*).

### Component 8: Hamburger Navigation Menu (Right Side)
- **Role:** Global settings, layer toggles (show/hide labels, toggle 3D Earth, coordinate grid overlays), documentation, and export tools.

---

## 4. Inter-Component Communication Strategy (Decoupled Team Architecture)

To ensure team members can develop components independently without stepping on each other's code, the frontend uses a **Shared Event Bus**:

```
                       ┌─────────────────────────┐
                       │  Global State / Bus     │
                       │  (AppState / EventBus)  │
                       └────────────┬────────────┘
                                    │
       ┌──────────────┬─────────────┼──────────────┬──────────────┐
       │              │             │              │              │
       ▼              ▼             ▼              ▼              ▼
  [3D Moon]       [2D Map]     [Timeline]    [Top Cards]    [Left Horizon]
  (Member A)     (Member B)    (Member C)    (Member D)       (Member E)
```

### Standardized Event Contracts:
1. `time:changed` $\rightarrow$ `{ timestamp: Date }` (Fired by Timeline; all components update positions/metrics).
2. `site:selected` $\rightarrow$ `{ id, lat, lon, name }` (Fired by 2D Map, 3D Moon, or Cards; centers view & syncs markers).
3. `site:added` $\rightarrow$ `{ lat, lon, name }` (Adds new card to comparison window).
4. `reference_frame:changed` $\rightarrow$ `{ center: 'moon' | 'earth' | 'sun' }` (Fired by Mini-Map).
