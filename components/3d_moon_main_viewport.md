# Component: 3D Moon Main Viewport

## 1. Overview & Role
The **3D Moon Main Viewport** is the central visual canvas of the application. It provides an interactive 3D representation of the Moon, rendering realistic topography, surface markings, dynamic solar illumination, and spatial relationships with Earth and the Sun.

---

## 2. Key Features & Specifications

### A. Celestial Bodies & Lighting
- **3D Lunar Sphere:** Textured with high-resolution lunar surface basemaps (e.g., LROC WAC / USGS monochrome or color albedo).
- **Dynamic Solar Illumination:** A directional light source representing the Sun positioned based on the current timestamp from the global timeline. Casts real-time terminator lines (lunar day vs. night) and realistic grazing shadow angles across polar craters.
- **3D Earth & Sun Models:**
  - Located at calculated orbital vectors.
  - Frustum culling / toggleable: Rendered conditionally when within the user's field of view, or toggled off via settings to preserve performance.

### B. Interactive Controls & Navigation
- **Orbital Camera:** Free rotation (pitch/yaw), smooth panning, and zoom into specific craters or landing sites.
- **Surface Pins & Markers:**
  - Visual pin markers for curated landing sites (Artemis III candidates, CLPS, Apollo, international).
  - Custom pin dropped when the user clicks anywhere on the 3D surface.
- **Bi-directional Sync with 2D Map:**
  - Clicking on the 3D Moon broadcasts coordinates to the 2D map.
  - Selecting a site in the 2D map rotates the 3D camera to focus on that coordinate.

### C. Visual Indicators
- **Local Horizon & Surface Normal:** Visual tangent plane showing the local horizon at the selected landing site.
- **Sun & Earth Rays:** Vector lines extending from the landing site toward the Sun and Earth to visually indicate elevation angle above or below the local horizon.

---

## 3. Team Member Implementation Responsibilities
- **Assigned Developer:** [Team Member A]
- **Key Files:** `static/js/components/moon3d.js`, `static/css/moon3d.css`
- **Events to Listen to:**
  - `time:changed`: Recalculate solar light direction and Earth position vector.
  - `site:selected`: Animate camera to focus on target latitude/longitude.
  - `layer:toggle`: Show/hide labels, coordinate grids, Earth/Sun models.
- **Events to Emit:**
  - `site:clicked`: `{ lat, lon }` when user clicks on the lunar surface.
