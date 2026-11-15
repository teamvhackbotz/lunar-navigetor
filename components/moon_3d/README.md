# 3D Moon Viewport Component (`components/moon_3d/`)

## Assigned Developer
3D Graphics & WebGL Engineer

## Overview
This module manages the central 3D viewport of the cockpit using Three.js:
- **Interactive WebGL Globe:** Renders a 3D spherical Moon ($R = 2.5$) textured with authentic NASA LROC global cylindrical albedo imagery.
- **Physical system scale:** Moon mean radius is 1,737.4 km at 2.5 scene units; Earth and Sun radii and their Moon-relative distances use the same conversion. Mean center-to-center distances are 384,400 km to Earth and 149.6 million km to the Sun.
- **Camera & OrbitControls:** Surface drag rotates the Moon. In SYSTEM, left-drag pans between bodies and right-drag rotates the camera. Scrolling over the Moon, Earth, or Sun focuses the zoom on that body and allows close inspection of its loaded texture. Zoom ranges from the lunar surface through a viewport-dependent distance that frames the 1 AU solar path; the initial Moon close-up is 16 scene units. Logarithmic depth supports the range.
- **Dynamic Solar Kinematics:** The Earth follows its eccentric lunar orbit and the Sun follows its apparent monthly path as the mission timeline changes. A directional light keeps lunar illumination consistent at the true rendered Sun distance.
- **Deep-space backdrop:** A 2,048 × 2,048 pixel Milky Way illustration from NASA Science's The Milky Way Galaxy page fades in at wide system zoom.
- **Click-to-Mark Raycasting:** Translates 2D screen clicks into 3D camera rays intersecting the lunar sphere, converting Cartesian $(x, y, z)$ coordinates into lunar latitude/longitude.
- **3D Surface Pin:** A composite 3D mesh (glowing sphere head + cylindrical anchor stem) dynamically positioned and oriented normal to the sphere's curved surface.

## EventBus Contract
- **Emits:**
  - `site:marked` `{ lat: number, lon: number, name: string, source: "moon-3d" }` when the user clicks anywhere on the 3D surface.
- **Listens for:**
  - `site:marked` (moves the 3D pin marker when user clicks 2D maps or cards).
  - `time:changed` `{ sliderValue: number (0-100), timeISO: string }` (revolves the sunlight around the Moon).

## Isolated Testing
Open `http://localhost:8080/components/moon_3d/test.html` in your browser to test and develop the 3D WebGL viewport in complete isolation!
