# Component: Comparison Carousel Cards

## 1. Overview & Role
The **Comparison Carousel Cards** component is a collapsible drawer descending from the top of the viewport (just under the top menu bar). It provides side-by-side comparative evaluation cards for multiple candidate landing sites, directly answering the mission planner's trade-off dilemmas.

---

## 2. Key Features & Specifications

### A. Collapsible Top Panel & Carousel Layout
- **Drawer Behavior:** Smooth slide-down and collapse toggle to keep the 3D viewport clean when not comparing sites.
- **Side-by-Side Carousel:** Horizontal scrollable/carousel cards for candidate sites (e.g., Comparing *Peak Near Shackleton* vs. *Connecting Ridge* vs. *Malapert Massif*).
- **Add / Remove Sites:**
  - Add via quick-select dropdown (curated list from `landing_sites.md`).
  - Add by typing manual coordinates (Latitude, Longitude).
  - Add directly by clicking on the 2D map or 3D Moon.
  - Close button ($X$) on each card to dismiss candidate sites.

### B. Landing Site Card Data & Visual Readouts
Each card displays key operational metrics:
- **Header:** Site Name, Coordinates (Lat, Lon), Region Classification (e.g., Artemis III Candidate, CLPS Target, Apollo Baseline).
- **Topography & Terrain:**
  - Surface Elevation (meters relative to lunar mean radius).
  - Terrain slope / incline angle ($< 5^\circ$ safe green badge; $> 10^\circ$ caution badge).
- **Sun & Power Status:**
  - Current Solar Elevation Angle ($^\circ$ above/below horizon).
  - Time remaining until next Sunset / Sunrise countdown.
  - Estimated surface temperature ($^\circ\text{C}$ / $\text{K}$).
- **Earth & Direct Communication Status:**
  - Current Earth Elevation Angle ($^\circ$ above/below horizon).
  - Direct-to-Earth (DTE) line-of-sight status (Green = Visible, Red = Occluded).
  - Time remaining until Earthset / Earthrise.
- **Temporal Mini-Graphs:**
  - Micro-chart showing 24-hour / 14-day illumination percentage and comms window trends across the selected landing date.

---

## 3. Team Member Implementation Responsibilities
- **Assigned Developer:** [Team Member E]
- **Key Files:** `static/js/components/cards.js`, `static/css/cards.css`
- **Events to Listen to:**
  - `site:added`: Create and render a new card with site data.
  - `site:selected`: Highlight the active card in the carousel.
  - `time:changed`: Recalculate countdowns, solar/Earth elevation angles, and illumination states for all active cards.
- **Events to Emit:**
  - `site:selected`: `{ lat, lon, name }` (when user clicks a card, centers 3D Moon and 2D Map).
  - `site:removed`: `{ siteId }`.
