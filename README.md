# 🌕 Lunar Landing Site Navigator

> **Unified Aerospace Cockpit & Spatial Cartography Suite for Lunar Surface Site Selection**  
> *NASA Space Apps Challenge · Artemis Exploration Architecture & Multi-Spectral Mission Planning*

---

## 🚀 Overview

The **Lunar Landing Site Navigator** is an interactive, GPU-accelerated mission cockpit and spatial analysis platform engineered to solve multi-variable trade-offs in lunar landing site selection.

Evaluating candidate sites—especially across the rugged terrain of the **Lunar South Pole ($84^\circ\text{S} - 90^\circ\text{S}$)**—traditionally requires juggling fragmented software suites (QuickMap, Moon Trek, JPL Horizons, SPICE kernels, and in-house ray-tracers). When launch windows shift or primary landing sites become hazardous, re-evaluating celestial vectors and horizon occlusion can take days of specialist time.

This platform consolidates these critical workflows into a **single, zero-latency flight deck**:

- **WebGL 3D Lunar Globe:** Dynamic directional sunlight synchronized with authentic JPL Horizons ephemerides, 4K/8K NASA LROC textures, and LOLA topographic relief.
- **Side-by-Side Comparison Corridor (`Alt + ↑`):** Rapid trade-off evaluations featuring 720-hour authentic solar illumination curves, touchdown slope hazard ratings, cryogenic PSR cold trap temperatures, and direct-to-Earth communication status.
- **Mission Constraints & EVA Traverse Planner (`Alt + [`):** Ephemeris-coupled battery State-of-Charge (SoC) simulation, surface stay window limits (24h to 720h), Lunar Terrain Vehicle (LTV) walk-back margins, and ordered sortie waypoint hazard profiling.
- **GIS Remote Sensing & Spatial Overlays (`Alt + ]`):** Multi-spectral orbital basemaps (NASA LROC, LOLA DEM, JAXA Kaguya) and analytical layers (LOLA Slope Heatmap, Diviner Cryogenic PSR Ice, LEND Water-Equivalent Hydrogen, Earth DTE Radio Mask) with automatic lunar physics boundary enforcement.
- **2D Cartographic Synchronizer Deck (`Alt + ↓`):** Polar Stereographic, 2:1 Equirectangular, and Tri-Map panoramic views with Great Circle surface distance measurement (`Shift + Right-Click`) and docked bottom edge tab handle.
- **Ephemeris Timeline Controller:** Full playback controls ($1\times, 100\times, 1000\times$), custom date windowing, and solar illumination indicators spanning the November 2026 Artemis III launch window.
- **Dr. Raj, Ph.D. (AI Mission Analyst):** Integrated astrophysics assistant with real-time telemetry ingestion and instant analytical prompt pills.

---

## 🖥️ Flight Deck Architecture

```
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

## ⚡ Quick Start

### Prerequisites

- Modern web browser with WebGL 2.0 support (Chrome, Firefox, Edge, Safari).
- [Node.js](https://nodejs.org/) (v16+) for serving static micro-frontends.
- [Python](https://www.python.org/) (3.10+) with `uv` or `pip` *(optional, for live backend API)*.

### 1. Launch the Frontend Cockpit

Because the application dynamically loads isolated micro-frontend templates via `fetch()`, it must be served over HTTP rather than `file://`:

```bash
# Clone the repository
git clone https://github.com/teamvhackbotz/lunar-navigetor.git
cd lunar-navigetor

# Start the local micro-server
node scripts/serve.js
```

Open your browser and navigate to **`http://127.0.0.1:8000/`**.

> **Note:** The frontend contains complete pre-baked offline datasets for all 21 NASA candidate sites. The cockpit is fully interactive even without running the backend!

### 2. Launch the FastAPI Backend (Optional / Recommended)

To enable real-time JPL Horizons vector calculations, dynamic terrain queries, and live AI assistant intelligence:

```bash
cd backend-api

# Using UV (Recommended):
uv run python run.py

# Or standard pip:
pip install -r requirements.txt
python run.py
```

The status badge in the Top Navigation will illuminate green: **`● API: LIVE (21)`**.

---

## 📖 Documentation & User Manual

For an in-depth walkthrough of every cockpit module, analytical telemetry metric, and aerospace planning workflow, refer to the **Complete User Manual**:

- 📘 **[USER_MANUAL.md](USER_MANUAL.md)** — Comprehensive operations guide, aerospace physics calculations, step-by-step Artemis III mission scenario, and troubleshooting FAQ.

---

## ⌨️ Flight Deck Keyboard Shortcuts

| Hotkey | Command / Action | Module |
| :--- | :--- | :--- |
| **`Ctrl + K`** / **`Cmd + K`** | Open Quick Search Command Palette | Global |
| **`Space`** | Play / Pause Ephemeris Timeline Simulation | Global |
| **`Alt + ←`** / **`Alt + →`** | Step Timeline Backward / Forward 1 Hour | Global |
| **`Alt + ↑`** | Toggle Top Candidate Comparison Corridor | Global |
| **`Alt + ↓`** | Toggle Bottom 2D Cartographic Synchronizer Deck | Global |
| **`Alt + [`** | Toggle Left Mission Constraints & EVA Planner Drawer | Global |
| **`Alt + ]`** | Toggle Right GIS Remote Sensing & Spatial Overlays Drawer | Global |
| **`Shift + Right-Click`** | Place Measurement Points A and B on 2D Maps | 2D Maps |
| **`Esc`** | Close Open Modal Windows (Inspector, Search, Settings) | Modals |

---

## 🗺️ Curated Landing Sites Catalog

The platform includes curated, authentic telemetry profiles for 21 high-priority landing sites across four strategic categories:

1. **Artemis III / IV Polar Candidate Regions ($84^\circ\text{S} - 90^\circ\text{S}$):**  
   *Peak Near Shackleton, Connecting Ridge, Connecting Ridge Extension, Faustini Rim A, de Gerlache Rim 1 & 2, de Gerlache-Kocher Massif, Haworth Crater Rim, Malapert Massif, Leibnitz Beta Plateau, Nobile Rim 1 & 2, Amundsen Rim.*
2. **Commercial Lunar Payload Services (CLPS) Targets:**  
   *IM-1 Odysseus (Malapert A), IM-2 PRIME-1 (Shackleton Connecting Ridge), Griffin / VIPER (Mons Mouton), Peregrine (Gruithuisen Domes), Blue Ghost 1 (Mare Crisium), Hakuto-R (Atlas Crater).*
3. **International Milestones:**  
   *Chandrayaan-3 Shiv Shakti Point (ISRO), Chang'e 4 Von Kármán Far-Side (CNSA), Chang'e 5 Mons Rümker (CNSA), Chang'e 6 Apollo Basin Far-Side (CNSA), SLIM Shioli Crater (JAXA).*
4. **Historical Apollo Equatorial Baselines:**  
   *Apollo 11 (Sea of Tranquility), Apollo 12, Apollo 15, Apollo 17.*

---

## 🧪 Verification & Test Suites

The codebase includes comprehensive integration test suites verifying mathematical accuracy, event bus pub/sub integrity, and physics engine constraints:

```bash
# Run all 10 core verification test suites
node scripts/test_mission_planner.js
node scripts/test_gis_integration.js
node scripts/test_pointer_passthrough.js
node scripts/test_comparison_cards.js
node scripts/test_archetype_engine.js
node scripts/test_waypoint_engine.js
node scripts/test_power_budget.js
node scripts/test_gis_basemap.js
node scripts/test_gis_overlays.js
node scripts/test_gis_legend_opacity.js
```

---

## 🛰️ Data Sources & Acknowledgments

- **NASA Lunar Reconnaissance Orbiter (LRO):** LROC WAC/NAC optical basemaps, LOLA Digital Elevation Models (DEM), Diviner Lunar Radiometer Experiment cryogenic thermal data, and LEND neutron detector datasets.
- **NASA JPL Horizons & NAIF SPICE:** High-precision planetary ephemerides, libration matrices, and celestial vectors.
- **JAXA SELENE (Kaguya):** Terrain Camera (TC) low-angle solar morphology maps.
- **ISRO & CNSA:** Surface coordinate data for Chandrayaan-3 and Chang'e landing missions.

---

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
