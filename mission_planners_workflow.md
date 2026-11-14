# Mission Planner's Workflow

This document outlines the current 5-step workflow that mission planners and engineers follow across separate tools (NASA QuickMap, Moon Trek, JPL Horizons, SPICE, and in-house analysis tools) to evaluate lunar landing sites.

---

## The 5-Step Workflow

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
```

---

## Detailed Step Breakdown

### Step 1: Regional Candidate Selection
- **Primary Tools:** NASA QuickMap, Moon Trek
- **Objective:** Identify candidate regions that meet primary mission science and engineering landing constraints.
- **Key Parameters Analyzed:**
  - **Science Objectives:** Distance to Permanently Shadowed Regions (PSRs), water ice cold traps, geological features of interest.
  - **Landing Hazards:** Surface slopes (typically required to be $< 5^\circ$ to $10^\circ$ to avoid lander tip-over), crater density, boulder fields, and surface roughness.
  - **Elevation:** Digital Elevation Models (LOLA DEM) at 20 m to 100 m resolution.
- **Output:** A shortlist of candidate coordinates $(\text{Latitude}, \text{Longitude}, \text{Altitude})$.

### Step 2: Celestial Vector Calculation (Ephemerides)
- **Primary Tools:** JPL Horizons System, NAIF SPICE Kernels, WebGeocalc
- **Objective:** Compute relative positions of celestial bodies over time from the perspective of an observer on the lunar surface.
- **Key Inputs:**
  - Observer location: Lunar fixed coordinates (lat, lon, elevation).
  - Target bodies: Sun (for solar power/thermal) and Earth (for direct communication).
  - Time interval: Mission window with appropriate time step (e.g., 10-minute to 1-hour resolution).
- **Output:** Raw tabular data containing:
  - Solar Azimuth and Solar Elevation angle relative to the local horizontal plane.
  - Earth Azimuth and Earth Elevation angle relative to the local horizontal plane.
  - Lunar libration angles (Earth wobble in lunar sky).

### Step 3: Topographic Horizon Masking (Occlusion)
- **Primary Tools:** LOLA DEM datasets, custom Python/MATLAB ray-tracing scripts, in-house mission analysis software.
- **Objective:** Determine whether surrounding topography (crater rims, ridges, hills) blocks the line-of-sight to the Sun or Earth.
- **The Core Problem:**
  - The Moon has no atmosphere, meaning no refraction lifts celestial bodies above the horizon.
  - At the South Pole ($>84^\circ\text{S}$), the Sun never rises more than $1.5^\circ$ to $2^\circ$ above the geometric horizon.
  - Distant crater rims 10 km to 60 km away can project $+2^\circ$ or higher above the local horizon, casting long shadows.
- **Calculation:**
  - Compute a $360^\circ$ horizon profile (maximum elevation angle as a function of azimuth).
  - For each time step, check:
    $$\text{Sun Illuminated} = \text{Solar Elevation}(t) > \text{Horizon Elevation}(\text{Solar Azimuth}(t))$$
    $$\text{Earth Visible (DTE Comms)} = \text{Earth Elevation}(t) > \text{Horizon Elevation}(\text{Earth Azimuth}(t))$$
- **Output:** Binary timeline arrays of real solar illumination and Earth line-of-sight visibility.

### Step 4: Mission Feasibility & Survival Synthesis
- **Primary Tools:** Spreadsheets, custom plotting scripts, mission design documents.
- **Objective:** Evaluate mission viability metrics from the occlusion profiles.
- **Key Metrics Synthesized:**
  - **Continuous Sunlight Duration:** Maximum uninterrupted operational window for solar arrays.
  - **Maximum Eclipse / Night Duration:** Sizing of battery reserves and radioisotope thermal heating requirements.
  - **Direct-to-Earth (DTE) Comms Windows:** Available time slots for direct downlink without needing lunar relay satellites.
  - **Joint Illumination & Comms Windows:** Overlapping periods where the lander can actively operate instruments and transmit science data simultaneously.

### Step 5: The "What-If" Crisis (Launch Delay / Alternate Site Comparison)
- **Primary Tools:** Manual repetition across all above tools.
- **The Pain Point:**
  - Launch schedules are inherently uncertain due to weather, rocket readiness, and orbital transfer windows.
  - A slip of 5 to 14 days shifts the lunar illumination phase and libration geometry entirely.
  - Planners must manually repeat Steps 2, 3, and 4 for every new date and every candidate site.
- **The Bottleneck:** Rapid trade-off evaluations cannot be done on the fly during planning meetings; each scenario requires hours or days of data re-processing.
