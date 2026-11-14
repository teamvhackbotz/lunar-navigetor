# Component: Left Collapsible Window (Topography, Shadows & Horizon Matching)

## 1. Overview & Role
The **Left Collapsible Window** is a dedicated slide-out drawer on the left side of the screen. Because extreme polar terrain conditions (steep slopes, deep crater cold traps, and 360° horizon obstructions) require rich visual space that small summary cards cannot accommodate, this window provides in-depth topographic horizon profiling and shadow analysis.

---

## 2. Key Features & Specifications

## 2. In-Depth Concept: Horizon Silhouette vs. Crater Shadowing

At the lunar South Pole, lighting and line-of-sight are governed by two distinct scales of physics: **Far-Field Obstructions (Horizon Silhouette)** and **Near-Field Micro-Topography (Crater Shadowing)**. The Left Window provides dedicated visualizers for both.

---

### Concept 1: Horizon Silhouette (Far-Field Skyline Obstruction)
- **What it is:** The $360^\circ$ panoramic skyline seen by a lander standing on the surface looking outward to distant ridges, massifs, and crater rims $5\text{ km}$ to $80\text{ km}$ away.
- **Why it matters:**
  - Because the Moon has no atmosphere, there is no atmospheric refraction or blue sky scattering. If a mountain peak blocks your line of sight to the Sun, you are in immediate pitch-black darkness.
  - At polar latitudes ($>85^\circ\text{S}$), the Sun never climbs high into the sky—it skims continuously along the horizon at a shallow elevation angle of only $+1.5^\circ$ to $+2.0^\circ$.
  - A distant ridge only $1.5\text{ km}$ high at a distance of $40\text{ km}$ subtends an angle of $\arctan(1.5 / 40) \approx +2.15^\circ$ above the horizon.
  - **The Result:** Even if astronomical calculators (like JPL Horizons) report that the Sun or Earth is mathematically above the horizon ($+1.2^\circ$), that distant ridge completely eclipses the Sun or severs the Direct-to-Earth radio link.
- **The Visualization (Upper Half of Window):**
  - **$360^\circ$ Panoramic Horizon Plot:** An elevation-versus-azimuth chart ($0^\circ$ North to $360^\circ$ on the X-axis, $-5^\circ$ to $+15^\circ$ on the Y-axis).
  - The jagged silhouette of all surrounding terrain is shaded as dark grey mountains.
  - The calculated positions of the Sun (☀️ yellow icon/path) and Earth (🌍 blue icon/path) are plotted over time.
  - **Instant Visual Test:** If the Sun icon is above the jagged mountain line, solar power is active. If it dips behind the silhouette, the site is in eclipse.

---

### Concept 2: Crater Shadowing & Slopes (Near-Field Micro-Topography)
- **What it is:** The local elevation drop, bowl geometry, and slope angles within $0\text{ to }5\text{ km}$ of the touchdown point (e.g., inside craters like Shackleton, Faustini, or Haworth).
- **Why it matters:**
  - **Permanently Shadowed Regions (PSRs):** South pole crater walls are steep ($15^\circ - 30^\circ$). Because the Sun's rays strike nearly parallel to the surface, the interior floors and deep walls of these impact craters have not seen sunlight for over 2 billion years, maintaining cryogenic temperatures (~$30\text{ K} / -243^\circ\text{C}$) where water ice is trapped.
  - **Landing Gear Limits:** Lunar landers (CLPS and Artemis HLS) have strict structural slope limits: landing on a slope $>10^\circ$ risks tip-over, catastrophic slide, or engine damage during engine cutoff.
  - **Thermal Shock:** The temperature gradient across a crater rim is extreme—the sunlit rim can be $+50^\circ\text{C}$ while the shadowed interior 100 meters away is $-200^\circ\text{C}$.
- **The Visualization (Lower Half of Window):**
  - **Local Radial Cross-Section:** A sliced cross-section of the local terrain showing the landing point's elevation profile relative to the crater rim and crater floor.
  - **Slope Incline Gauge:** Real-time slope readout with safety indicators ($<5^\circ$ Safe [Green], $5^\circ-10^\circ$ Moderate [Amber], $>10^\circ$ Dangerous [Red]).
  - **Distance to Cold Trap (PSR):** Metric showing proximity to volatile water-ice cold traps (key scientific exploration objective).

---

## 3. Screen Layout Inside the Left Window

```
┌──────────────────────────────────────────────────────────────┐
│ [LEFT WINDOW: TOPOGRAPHY, HORIZON & SHADOWS]         [◀ Hide]│
├──────────────────────────────────────────────────────────────┤
│ 1. 360° PANORAMIC HORIZON SILHOUETTE                         │
│  Elevation                                                   │
│    +10° ┤                                                    │
│     +5° ┤                  ☀️ Sun (+1.4°)                    │
│      0° ┼─────/\──────/\───○────────/\──────/\───────────────│
│     -5° ┤____/  \____/  \__________/  \____/  \______________│
│         0°(N)    90°(E)    180°(S)    270°(W)    360°(N)     │
│         [Status: ☀️ Sun CLEAR (Power 100%) | 🌍 Earth BLOCKED]│
├──────────────────────────────────────────────────────────────┤
│ 2. LOCAL CRATER PROFILE & SLOPE HAZARD                       │
│  Elevation (m)                                               │
│   2000m ┤        📍 Landing Point (Rim)                      │
│   1000m ┤         \____                                      │
│      0m ┤              \_________ Crater Floor (Dark PSR)    │
│  -1000m ┤                        \_________________          │
│         0 km      2 km      4 km      6 km      8 km         │
│                                                              │
│  • Surface Slope at Touchdown: 4.2°  [✓ SAFE (< 5°)]         │
│  • Distance to Permanent Ice Trap: 1.8 km                    │
│  • Local Terrain Elevation: +1,240 m (above lunar mean)      │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Team Member Implementation Responsibilities
- **Assigned Developer:** [Team Member F]
- **Key Files:** `static/js/components/horizon.js`, `static/css/horizon.css`
- **Events to Listen to:**
  - `site:selected`: Fetch and render local LOLA DEM horizon profile for the new coordinate.
  - `time:changed`: Update position marker of Sun and Earth on the horizon profile plot.
- **Events to Emit:**
  - `horizon:occlusion_detected`: `{ sunOccluded: boolean, earthOccluded: boolean }`.
