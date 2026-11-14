# Component: Global Timeline Controller

## 1. Overview & Role
The **Global Timeline Controller** is a persistent horizontal control panel anchored at the bottom of the screen. It drives the temporal dynamics across the entire application, synchronizing the positions of the Sun, Moon, and Earth, and updating lighting, solar elevation, and communication windows in real time.

---

## 2. Key Features & Specifications

### A. Temporal Scrubbing & Navigation
- **Interactive Scrubber Bar:**
  - Drag-and-scrub slider spanning days, weeks, or full lunar months (synodic month $\approx 29.53$ Earth days).
  - Fine-grained stepping: Buttons for $+1\text{ hour}$, $-1\text{ hour}$, $+1\text{ day}$, $-1\text{ day}$.
- **Direct Date/Time Picker:**
  - Input field allowing planners to type an exact target launch/landing date and time (UTC).
- **Preset Event Markers / Bookmarks:**
  - Key lunar events (e.g., Artemis III launch windows, lunar eclipses, seasonal solstices).

### B. Playback Controls
- **Play / Pause Button:** Animates continuous time progression.
- **Speed Multipliers:** Toggle buttons for $1\times$ (real-time), $100\times$, $1000\times$, and $10000\times$ speeds to easily observe full lunar days or multi-month seasonal trends in seconds.
- **Current Timestamp Readout:** Prominent UTC display showing Current Date, Time, and Lunar Phase (e.g., "Full Moon", "New Moon", "Waxing Crescent").

---

## 3. Team Member Implementation Responsibilities
- **Assigned Developer:** [Team Member C]
- **Key Files:** `static/js/components/timeline.js`, `static/css/timeline.css`
- **Events to Listen to:**
  - `timeline:jump_to`: `{ timestamp }` (e.g., triggered by clicking a "Next Sunrise" button on a card).
- **Events to Emit:**
  - `time:changed`: `{ timestamp: ISOString, unixEpoch: number }` (broadcast to 3D Moon, 2D Map, Cards, Mini-map, and Horizon Profiler).
