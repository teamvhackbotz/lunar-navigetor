# Component: 3D Moon Main Viewport

## 1. Overview & Role
The **3D Moon Main Viewport** is the central visual canvas of the application. It provides an interactive 3D representation of the Moon, rendering realistic topography, surface markings, dynamic solar illumination, and spatial relationships with Earth and the Sun.

---

## 2. Key Features & Specifications

### A. Celestial Bodies & Lighting
- **3D Lunar Sphere:** Textured with ultra-high resolution NASA LROC cylindrical mosaics (native 8K Ultra-HD: $8192 \times 4096$, progressive 4K HD: $4096 \times 2048$, and 2K baseline).
- **Surface Normal & Relief Mapping:** High-detail normal displacement map derived from LOLA topography data. Casts authentic grazing shadows, crater rim relief, and massif depth (e.g. Malapert Massif, Shackleton, Connecting Ridge) as dynamic solar light moves.
- **Anisotropic Filtering & High Tessellation:** Configured with maximum GPU anisotropy (`renderer.capabilities.getMaxAnisotropy()`) and 128×128 UV sphere segment tessellation, completely eliminating polar grazing blur and polygonal silhouette distortion.
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

### C. Visual Indicators & HUD Controls
- **Clarity HUD Control:** Real-time on-screen HUD pill allowing instant toggling between 8K Ultra-HD ($8192 \times 4096$) and 4K High-Res ($4096 \times 2048$) with live loading state indicator.
- **Local Horizon & Surface Normal:** Visual tangent plane showing the local horizon at the selected landing site.
- **Sun & Earth Rays:** Vector lines extending from the landing site toward the Sun and Earth to visually indicate elevation angle above or below the local horizon.

---

## 3. Team Member Implementation Responsibilities
- **Assigned Developer:** [Team Member A]
- **Key Files:** `components/moon_3d/moon_3d.js`, `components/moon_3d/moon_3d.css`, `components/moon_3d/moon_3d.html`
- **Events to Listen to:**
  - `time:changed`: Recalculate solar light direction and Earth position vector.
  - `site:selected` / `site:marked`: Animate camera to focus on target latitude/longitude.
  - `texture:resolution`: `{ resolution: '8k' | '4k' | '2k' }` switch active lunar albedo map.
  - `relief:intensity`: `{ intensity: number }` adjust normal map topographic relief depth.
  - `layer:toggle`: Show/hide labels, coordinate grids, Earth/Sun models.
- **Events to Emit:**
  - `site:marked`: `{ lat, lon, name, source: 'moon-3d' }` when user clicks on the lunar surface.
  - `texture:resolution`: `{ resolution }` when user changes clarity in the 3D HUD deck.
