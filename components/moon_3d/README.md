# 3D Moon Viewport Component (`components/moon_3d/`)

## Assigned Developer
3D Graphics & WebGL Engineer

## Overview
This module manages the central 3D viewport of the cockpit using Three.js:
- **Interactive WebGL Globe:** Renders a 3D spherical Moon ($R = 2.5$) textured with authentic NASA LROC global cylindrical albedo imagery.
- **Camera & OrbitControls:** Smooth inertial rotation, pitch, and zoom clamped between $[3.0, 10.0]$ distance units, initially angled to inspect the lunar South Pole.
- **Dynamic Solar Kinematics:** A directional Sun light source revolves around the Moon according to timeline scrubber progression, incorporating a simulated $1.54^\circ$ lunar axial inclination.
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
