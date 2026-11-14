# Component: Celestial Triad Mini-Map

## 1. Overview & Role
The **Celestial Triad Mini-Map** sits in the top-left corner of the main window. It provides high-level macro-orbital context of the Sun-Earth-Moon system, allowing users to switch reference frames and visually understand relative motion, orbital variations, and Earth's libration.

---

## 2. Key Features & Specifications

### A. Celestial Visualizer
- **Triad Representation:** Renders the Sun, Earth, and Moon with distinct iconography and orbit path traces.
- **Illumination Ray:** Depicts sunlight rays traveling from the Sun toward Earth and the Moon, showing how lunar phases form naturally.

### B. Interactive Reference Frame Switching (Clickable Center Mode)
Clicking the mini-map cycles the center body between three astronomical frames of reference:
1. **Moon-Centric Mode (Lunar Frame):**
   - The Moon is fixed at the center.
   - Shows the Sun revolving around the Moon every ~29.5 days.
   - **Visualizes Earth's Libration (Wobble):** Earth does not stay static; it moves in a tight, looping figure-eight pattern due to the Moon's axial tilt and elliptical orbit.
2. **Earth-Centric Mode (Geocentric Frame):**
   - Earth is fixed at the center.
   - Shows the Moon's orbit, phases, and perigee/apogee variations.
3. **Sun-Centric Mode (Heliocentric Frame):**
   - The Sun is fixed at the center.
   - Shows the Earth-Moon barycenter orbiting the Sun, illustrating seasonal solar elevation shifts at the lunar poles.

---

## 3. Team Member Implementation Responsibilities
- **Assigned Developer:** [Team Member D]
- **Key Files:** `static/js/components/minimap.js`, `static/css/minimap.css`
- **Events to Listen to:**
  - `time:changed`: Update positions of Sun, Earth, and Moon along their orbital vectors.
- **Events to Emit:**
  - `reference_frame:changed`: `{ mode: 'moon' | 'earth' | 'sun' }` (can update camera perspective or status indicators).
