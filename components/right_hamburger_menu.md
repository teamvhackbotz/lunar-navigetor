# Component: Right Hamburger Menu & Settings Drawer

## 1. Overview & Role
The **Right Hamburger Menu** is a slide-out drawer on the right edge of the screen triggered by an icon button. It acts as the command center for application settings, display toggles, scenario export, and educational documentation.

---

## 2. Key Features & Specifications

### A. View & Layer Toggles
- **3D Celestial Model Toggles:**
  - Checkbox to toggle 3D Earth model on/off (saves GPU/CPU resources).
  - Checkbox to toggle 3D Sun directional indicator.
  - Checkbox for coordinate lat/lon grid lines on the 3D globe.
  - Checkbox for site label pins.
- **Lighting & Visual Realism:**
  - Toggle between "Realistic Lighting" (harsh black shadows, no ambient light, space realism) and "Analytical Mode" (ambient fill light enabled so craters in shadow can still be inspected).

### B. Scenario & Data Management
- **Curated Mission Presets:**
  - One-click loading of complete mission scenarios (e.g., *"Artemis III Launch Window - Nov 2026"*, *"Chandrayaan-3 Landing Replay"*, *"Apollo 11 Baseline"*).
- **Export / Share:**
  - Export active scenario comparison report as JSON or PDF summary.

### C. About & Help
- Explanation of lunar South Pole physics (libration, low solar angles, PSRs).
- Guide for educators, students, and new users on how to use the cockpit controls.

---

## 3. Team Member Implementation Responsibilities
- **Assigned Developer:** [Shared / Team Lead]
- **Key Files:** `static/js/components/menu_right.js`, `static/css/menu_right.css`
- **Events to Listen to:**
  - None required; menu triggers state changes.
- **Events to Emit:**
  - `layer:toggle`: `{ layerName: string, enabled: boolean }`.
  - `scenario:loaded`: `{ sites: Array, timestamp: string }`.
