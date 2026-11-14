# Component: Collapsible 2D Moon Map

## 1. Overview & Role
The **Collapsible 2D Moon Map** is a slide-up drawer located directly above the bottom timeline bar. It allows mission planners and users to inspect flat cartographic projections, measure surface distances, and place coordinates without navigating away to external GIS tools like NASA QuickMap.

---

## 2. Key Features & Specifications

### A. Collapsible Drawer UI
- **Position:** Anchored directly above the persistent bottom timeline.
- **Toggle Mechanism:** A slide-up / collapse chevron button or drawer tab with smooth CSS transition.
- **State Preservation:** Keeps active pins, measurements, and zoom level even when collapsed.

### B. Projections & Cartography
The 2D map module provides three synchronized projection modes:
1. **Global Equirectangular Basemap:** Full lunar surface ($180^\circ\text{W} - 180^\circ\text{E}$, $90^\circ\text{N} - 90^\circ\text{S}$).
2. **South Pole Stereographic Disc (Artemis / CLPS Focus):** Circular projection centered at the South Pole ($70^\circ\text{S} - 90^\circ\text{S}$) with concentric rings at $80^\circ\text{S}, 85^\circ\text{S}, 88^\circ\text{S}$ with zero polar distortion.
3. **North Pole Stereographic Disc (Cold Trap / Science Comparison):** Circular projection centered at the North Pole ($70^\circ\text{N} - 90^\circ\text{N}$) covering Hermite and Peary craters.

- **Overlay Layers:**
  - Latitude / Longitude coordinate graticule.
  - Named geological features (craters, maria, mountain massifs).
  - Curated landing site icons (Apollo, Artemis, CLPS, International).

### C. Interactive Tools
- **Point Marking & Coordinate Drop:**
  - Clicking on the 2D map drops an interactive pin.
  - Automatically broadcasts the coordinate to the **3D Moon** and the **Top Comparison Cards**.
- **Two-Point Distance Measuring Tool:**
  - Click Point A, click Point B.
  - Calculates great-circle surface distance in kilometers using the spherical lunar radius ($R_\text{moon} \approx 1,737.4\text{ km}$).
  - Displays distance readout directly on the map.

---

## 3. Team Member Implementation Responsibilities
- **Assigned Developer:** [Team Member B]
- **Isolated Component Directory:** `components/map_2d/`
  - `map_2d.html` — Dual map DOM & projection toggles (South Pole, North Pole, Global Flat)
  - `map_2d.css` — Scoped styles for map discs, graticules, and distance indicators
  - `map_2d.js` — Projection transform math, click listeners, and measuring tool
  - `test.html` — Standalone test harness (can be run directly in browser without the rest of the app)
- **Events to Listen to:**
  - `site:marked`: `{ lat, lon, name }` (when user marks on 3D Moon or Card, updates map markers).
  - `time:changed`: Optional day/night shadow overlay update across the 2D projection.
- **Events to Emit:**
  - `site:marked`: `{ lat, lon, name }` to sync with 3D Moon, Cards, and Horizon profiler.
  - `measurement:completed`: `{ distanceKm, pointA, pointB }`.
