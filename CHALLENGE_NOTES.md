# NASA Space Apps Challenge: Lunar Landing Site Navigator
*Collaborative Brainstorming & Notes Document*

---

## 1. Challenge Overview & Core Problem

- **Event:** NASA Space Apps Challenge 2026
- **Difficulty:** Advanced / Intermediate
- **Subjects:** Human Exploration, Moon, Software, Space Exploration
- **Core Mission:** Create an intuitive tool or application that enables mission planners, educators, and the public to rapidly evaluate and compare lunar landing sites and dates.

### The Real-World Operational Context
- **CLPS (Commercial Lunar Payload Services) & Artemis:** NASA and international partners are heavily targeting the **lunar South Pole** due to resources like volatile water ice in permanently shadowed craters.
- **Dynamic Mission Timelines:** Launch dates frequently slip due to hardware readiness, launch windows, weather, and orbital mechanics. When a launch slips by days or weeks, the original landing site conditions change drastically.
- **The Decision Crisis:** Planners need to answer:
  1. *If we slip launch by $X$ days, is our primary landing site still viable?*
  2. *If not, which alternative landing site in the region provides adequate solar illumination and Earth communication?*
  3. *What are the trade-offs between Site A and Site B on Date Y?*

---

## 2. Breakdown of Existing Tools & The Core Gap

### What the Existing Systems Actually Do
Your observation is spot-on. Here is how those three systems divide the work:

1. **NASA QuickMap (LROC / ASU):**
   - **What it is:** A specialized 2D/3D Lunar GIS (Geographic Information System) web browser.
   - **What it provides:** Thousands of map layers — high-resolution Lunar Reconnaissance Orbiter (LROC) imagery, LOLA digital elevation models (DEMs), slope maps, Diviner temperature data, permanent shadow maps.
   - **How it's used:** Detailed surface inspection and geological mapping.

2. **Moon Trek (NASA Solar System Treks / JPL):**
   - **What it is:** "Google Earth for the Moon" — an interactive 2D map and 3D globe visualization suite.
   - **What it provides:** Basemaps, crater/feature bookmarks, elevation profiling, line-of-sight calculation tools, and 3D terrain rendering.
   - **How it's used:** Mission planning walkthroughs and public exploration of spatial layers.

3. **JPL Horizons System (JPL SSD):**
   - **What it is:** A pure computational ephemeris engine and astronomical calculator (no maps, no 3D graphics).
   - **What it provides:** Highly accurate vector tables and celestial coordinate data (API / text queries). For any given coordinate on the Moon and any timestamp, it computes the exact Azimuth and Elevation of the Sun, Earth, libration angles, and distances.
   - **How it's used:** The raw mathematical backend for trajectory and orbital calculations.

### Where the Friction / Gap Exists
Currently, to evaluate a candidate landing site, a team has to manually stitch these separate tools together:
1. Query **JPL Horizons** (or SPICE kernels) to get the Sun and Earth trajectories (azimuth/elevation over time).
2. Cross-reference with **QuickMap / Moon Trek** to see the terrain elevation profile at that coordinate.
3. Compare both manually: *If the Sun is at $+1.5^\circ$ elevation at azimuth $180^\circ$, does that crater ridge shown in LOLA block it?*
4. Repeat this laborious workflow from scratch if the launch slips by 5 days or if evaluating an alternative site 30 km away.

**The Opportunity:** A unified interface that connects the astronomical positioning (Horizons) with the local lunar horizon/terrain (LOLA/Trek/QuickMap) to give instant answers on power (Sun) and comms (Earth) for rapid scenario comparisons.

---

## 2.1 The Current Mission Planner Workflow (Step-by-Step)

Here is how an engineering or mission design team currently navigates across these tools:

```
[ Step 1: Regional Candidate Selection ]
   Tools: NASA QuickMap / Moon Trek
   Action: Filter surface maps by science interest (e.g. proximity to water ice).
   Checks: Terrain slopes (<5° to 10° for landing gear stability), hazard density, boulder fields.
   Output: Candidate coordinates (Latitude, Longitude, Altitude).

               │
               ▼
[ Step 2: Celestial Vector Calculation ]
   Tools: JPL Horizons / SPICE Kernels / WebGeocalc
   Action: Generate ephemeris for given candidate coordinates across proposed mission dates.
   Inputs: Observer location (lat/lon/alt), Targets (Sun, Earth), Time window & step (e.g., 1-hour steps).
   Output: Raw numeric tables of Azimuth, Elevation, Distances, and Libration angles.

               │
               ▼
[ Step 3: Topographic Horizon Masking (Occlusion) ]
   Tools: Custom scripts, GIS Altimetry (LOLA DEM), or in-house ray-tracers
   Problem: Moon has no atmosphere; high-latitude Sun/Earth are <2° above horizon.
   Action: Calculate 360° horizon elevation profile around the landing site.
   Check: Is Sun_Elevation(t) > Horizon_Elevation(Sun_Azimuth(t))?
          Is Earth_Elevation(t) > Horizon_Elevation(Earth_Azimuth(t))?
   Output: Real visibility binary states (Sun visible? Earth visible?).

               │
               ▼
[ Step 4: Mission Feasibility & Survival Synthesis ]
   Tools: Spreadsheets, custom Python scripts, PowerPoint
   Action: Synthesize metrics:
     - Continuous illumination window (hours/days of solar power).
     - Longest continuous shadow duration (battery sizing & thermal survival).
     - Direct-To-Earth (DTE) comms windows (when Earth is unoccluded).
     - Power + Comms overlap (can we downlink data while active?).

               │
               ▼
[ Step 5: The "What-If" Crisis (Launch Delay / Alternate Site) ]
   The Pain Point: Launch slips by 10 days, or primary site is declared unsafe.
   Current Reality: Planners must RE-RUN Steps 2, 3, and 4 from scratch, export data, and manually rebuild comparison charts.
   Bottleneck: Takes hours or days of specialist time to answer simple trade-off questions.

---

## 2.2 Curated List of Notable Lunar Landing Sites

The challenge explicitly requests supporting a curated list of notable landing sites alongside custom coordinate input:

### A. Artemis III Candidate Regions (Lunar South Pole, 84°S – 89.5°S)
*NASA's 13 official candidate regions for the first crewed landing:*
1. **Peak Near Shackleton** (~89.6° S, 129.2° E) – *High illumination ridge near the South Pole.*
2. **Connecting Ridge** (~89.4° S, 222.6° E) – *Narrow ridge connecting Shackleton and de Gerlache.*
3. **Connecting Ridge Extension**
4. **Faustini Rim A** (~87.1° S, 67.0° E)
5. **de Gerlache Rim 1** (~88.3° S, 291.5° E)
6. **de Gerlache Rim 2** (~88.1° S, 290.0° E)
7. **de Gerlache-Kocher Massif** (~85.8° S, 236.4° E)
8. **Haworth Crater Rim** (~87.4° S, 343.0° E)
9. **Malapert Massif** (~85.9° S, 2.9° E) – *Massive mountain with high Earth visibility.*
10. **Leibnitz Beta Plateau** (~85.8° S, 328.0° E)
11. **Nobile Rim 1** (~85.2° S, 53.5° E)
12. **Nobile Rim 2** (~84.2° S, 60.7° E)
13. **Amundsen Rim** (~84.5° S, 105.0° E)

### B. CLPS (Commercial Lunar Payload Services) Mission Targets
*Commercial landers delivering NASA and commercial payloads:*
- **Intuitive Machines IM-1 (Odysseus):** Malapert A (~80.13° S, 1.44° E) – *Landed Feb 2024.*
- **Intuitive Machines IM-2 (PRIME-1 / Athena):** Shackleton Connecting Ridge (~89.4° S) – *Targeting ice drill demo.*
- **Astrobotic Griffin / VIPER / Mission 2:** Mons Mouton / Nobile Region (~85.5° S, 31.8° E).
- **Astrobotic Peregrine (Mission 1 Target):** Sinus Viscositatis / Gruithuisen Domes (~36.6° N, 39.3° W).
- **Firefly Blue Ghost Mission 1:** Mare Crisium (~18.56° N, 61.81° E).
- **ispace Hakuto-R Mission 1:** Atlas Crater (~47.5° N, 44.4° E).

### C. Notable International Missions
*Recent international exploration milestones:*
- **Chandrayaan-3 (ISRO - India):** Shiv Shakti Point (~69.37° S, 32.35° E) – *First landing in southern high latitude.*
- **Chang'e 4 (CNSA - China):** Von Kármán Crater (~45.46° S, 177.60° E) – *First landing on the lunar farside.*
- **Chang'e 5 (CNSA - China):** Mons Rümker (~43.06° N, 51.92° W) – *Sample return from near-side volcanic plain.*
- **Chang'e 6 (CNSA - China):** Apollo Basin / South Pole-Aitken (~41.64° S, 153.99° W) – *First farside sample return.*
- **SLIM (JAXA - Japan):** Shioli Crater (~13.31° S, 25.25° E) – *Pinpoint landing demonstration.*

### D. Historical Apollo Missions (Equatorial / Mid-Latitude Baseline)
*Provides historical reference & contrast to extreme polar environments:*
- **Apollo 11:** Mare Tranquillitatis (0.674° N, 23.473° E)
- **Apollo 12:** Oceanus Procellarum (3.012° S, 23.422° W)
- **Apollo 14:** Fra Mauro (3.645° S, 17.471° W)
- **Apollo 15:** Hadley-Apennine (26.132° N, 3.634° E)
- **Apollo 16:** Descartes Highlands (8.973° S, 15.500° E)
- **Apollo 17:** Taurus-Littrow (20.191° N, 30.772° E)

---

## 3. Key Physics & Environmental Realities at the Lunar South Pole

1. **Grazing Solar Angles:**
   - At the lunar poles, the Sun skims very close to the horizon (typically $1^\circ$ to $2^\circ$ above or below).
   - Slight elevation changes (a crater rim vs. crater floor) make the difference between perpetual sunlight ("peaks of eternal light") and eternal darkness (Permanently Shadowed Regions / PSRs).
2. **Earth Visibility & Libration:**
   - The Moon is tidally locked, but lunar libration causes the Earth to "wobble" by up to $\pm 6^\circ$ to $8^\circ$ in the sky.
   - Near the South Pole, Earth hovers right near the horizon. Libration can cause Earth to dip below crater rims or the horizon ("Earthset"), cutting off Direct-to-Earth (DTE) communication.
3. **No Atmosphere:**
   - No atmospheric refraction or scattering.
   - The visible horizon is defined strictly by the lunar sphere geometry and local topography (DEMs).
4. **Mission Survival Window:**
   - Solar elevation dictates solar array power output and thermal survival.
   - Direct-to-Earth line-of-sight dictates whether expensive relay satellite infrastructure is mandatory or if direct comms can be maintained.

---

## 4. Key Challenge Objectives & Requirements

- **Interactive Site Selection & Comparison:**
  - Support curated landing sites (Apollo, CLPS, international missions) and custom coordinates (lat/long).
  - Enable side-by-side or sequential comparison of sites to assess trade-offs.
- **Date and Time Flexibility:**
  - Dynamically explore conditions across lunar days, seasons, and multi-year windows.
- **Sun & Earth Horizon Visualization:**
  - Elevation & azimuth relative to local terrain.
  - Clear countdown/indicators for time remaining before sunset or Earthset.
- **Power & Communication Metrics:**
  - Solar elevation angle, duration of sunlight, thermal state indicator.
  - Earth line-of-sight windows.
- **Flexible Presentation Medium:**
  - Could be a web app, desktop tool, mobile app, interactive 3D visualization, simulation, or educational tool.

---

## 5. Team Brainstorming & Architecture Decisions

*(Detailed system architecture and layout recorded in [system_design_and_architecture.md](file:///home/battlescar26/SpaceApp/system_design_and_architecture.md))*

### Topic A: Target Audience & Primary Use-Case Scope
- **Dual Audience Architecture:** Caters to both **Mission Planners** (rapid site comparison cards, illumination countdowns, slope analysis) and **Students/Public/Educators** (interactive visual exploration, celestial triad mini-map, and AI tutor).
- **AI Persona:** *"Dr. Raj, Ph.D. Astrophysicist"* situated in the bottom-left corner to provide operational advice or educational answers.

### Topic B: Visual & Interaction Layout
- **Single-Screen Cockpit Model:** No external page switching.
  - **Center View:** Full 3D Interactive Moon (WebGL/Three.js) with dynamic Sun lighting.
  - **Bottom Drawer:** Collapsible 2D Map sliding up above the timeline with bi-directional sync (click on 2D marks 3D, and vice-versa, with distance measurement tool). Supports:
    1. Global Rectangular Equirectangular ($180^\circ\text{W} - 180^\circ\text{E}$)
    2. South Pole Stereographic ($70^\circ\text{S} - 90^\circ\text{S}$)
    3. North Pole Stereographic ($70^\circ\text{N} - 90^\circ\text{N}$)
  - **Top Panel:** Clean floating side-by-side comparison cards (unenclosed HUD style) for candidate sites (slope, sunrise/sunset, earthrise/earthset, solar elevation, temperature, mini-graphs).
  - **Bottom Persistent Bar (Two-Tier):**
    - Tier 1: Media playback, speed multipliers ($100\times, 1000\times$), UTC clock, live coordinates, and global marking/measuring tools.
    - Tier 2: Full-width edge-to-edge timeline with precision SVG scale ruler.
  - **Top-Left Mini-Map:** Celestial Triad (Sun-Moon-Earth) with clickable center-switching (Moon-centric, Earth-centric, Sun-centric).
  - **Left Collapsible Window:** Topographic Horizon Masking & extreme shadow analysis (LOLA DEM horizon vs Sun/Earth paths) for the active candidate site.
  - **Settings Modal Dialog:** Dedicated center dialog with theme switcher (Muted Earth, Lunar Regolith, High Contrast), freeing up the right side for comparative analysis.

### Topic C: Self-Contained Component Folder Architecture (Zero-Conflict Git Workflow)
*(Detailed blueprint in [modular_team_folder_structure.md](file:///home/battlescar26/SpaceApp/modular_team_folder_structure.md))*
- **Folderized Components:** Every window/widget lives in its own directory (`/components/<name>/`) containing its own `.html`, `.css`, `.js`, and standalone `test.html`.
- **Git Safety:** Teammates work exclusively in their assigned folder. Commits and pull requests have $0\%$ merge collision risk.
- **Standalone Development:** Developers can open `components/<name>/test.html` to build and test their window in isolation without needing the rest of the application running.
- **Unified Event Bus:** Components interact strictly via `window.eventBus` (`site:marked`, `time:changed`, `theme:changed`, etc.), ensuring complete decoupling.

### Topic D: Unique Value Proposition
- Unifies what currently takes 3+ separate NASA tools (QuickMap + Moon Trek + JPL Horizons) into a single, intuitive, synchronized decision cockpit.
