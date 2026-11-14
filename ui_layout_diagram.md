# UI Layout & Component Interaction Diagram

This document illustrates the screen layout, component positioning, and z-index layering for the **Lunar Landing Site Navigator** web application.

---

## 1. Full-Screen Visual Layout Diagram

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  [TOP BAR]  🌔 Lunar Landing Site Navigator        [▼ Compare Sites (3)]                      [Settings / Menu ☰]       │
├────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ [TOP DRAWER - COLLAPSIBLE CAROUSEL CARDS]                                                                [▲ Close] │ │
│ │ ┌───────────────────────────┐ ┌───────────────────────────┐ ┌───────────────────────────┐ ┌──────────────────────┐ │ │
│ │ │ Peak Near Shackleton      │ │ Connecting Ridge          │ │ Malapert Massif           │ │ [+] Add Landing Site │ │ │
│ │ │ 89.6° S, 129.2° E         │ │ 89.4° S, 222.6° E         │ │ 85.9° S, 2.9° E           │ │ (Curated / Custom)   │ │ │
│ │ │ Slope: 4.2° (Safe)        │ │ Slope: 5.8° (Moderate)    │ │ Slope: 8.1° (Steep)       │ └──────────────────────┘ │ │
│ │ │ Sun Elv: +1.4° (Rising)   │ │ Sun Elv: +0.8°            │ │ Sun Elv: -0.2° (Shadow)   │                          │ │
│ │ │ Next Sunset: 112h 40m     │ │ Next Sunset: 74h 10m      │ │ Next Sunrise: 28h 15m     │                          │ │
│ │ │ Earth: Visible (+3.1°)    │ │ Earth: Visible (+1.9°)    │ │ Earth: High (+5.4°)       │                          │ │
│ │ └───────────────────────────┘ └───────────────────────────┘ └───────────────────────────┘                          │ │
│ └────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                                        │
│ ┌───────────────────────────┐                                                             ┌──────────────────────────┐ │
│ │ [TOP-LEFT MINI-MAP]       │                                                             │ [RIGHT HAMBURGER DRAWER] │ │
│ │ Celestial Triad:          │                                                             │ (Slide-out menu)         │ │
│ │   ☀️ Sun                  │                                                             │                          │ │
│ │  /   \                    │                                                             │ • Toggle 3D Earth        │ │
│ │ 🌍   🌕 [Center: Moon ▾]  │                                                             │ • Toggle Solar Vector    │ │
│ │ (Click cycles:            │                                                             │ • Toggle Lat/Lon Grid    │ │
│ │  Moon / Earth / Sun)      │                                                             │ • Lighting Realism Mode  │ │
│ └───────────────────────────┘                                                             │ • Mission Presets        │ │
│                                                                                           │ • Export Scenario        │ │
│ ┌───────────────────────────┐                      [MAIN VIEWPORT]                        │ • User Documentation     │ │
│ │ [LEFT COLLAPSIBLE DRAWER] │                    3D Interactive Moon                      │                          │ │
│ │ Topography & Shadows:     │                                                             └──────────────────────────┘ │
│ │                           │                                                                                          │
│ │ • 360° Horizon Silhouette │                                                                                          │
│ │   vs Sun/Earth Track      │                                                                                          │
│ │ • Crater Wall Incline     │                                                                                          │
│ │ • Extreme Shadow Alerts   │                                                                                          │
│ │ • PSR Distance            │                                                                                          │
│ └───────────────────────────┘                                                                                          │
│                                                                                                                        │
│                                                                                                                        │
│ ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ [BOTTOM DRAWER - COLLAPSIBLE 2D MAP] (Auto-fits width when side drawers open)                           [▼ Close] │ │
│ │ ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ [ 🌐 Global Flat ]  [ 🎯 South Pole (Stereographic) ]                                                          │ │ │
│ │ │                                                                                                                │ │ │
│ │ │   [Pin A] ─────────────────────────── [Pin B]  Active Tool: Measuring Distance (48.6 km)                       │ │ │
│ │ │                                                                                                                │ │ │
│ │ └────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │ │
│ └────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [TIER 1: MISSION CONTROLS & UNIVERSAL MARKING TOOLBAR]                                                                 │
│ [⏮] [▶ Play] [⏭] [Speed: 100x ▾]  │  🕒 2026-11-15 14:00 UTC · 🌕 Waxing Gibbous  │ [📍 Mark Site] [📏 Measure] [▲ 2D] │
├────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [TIER 2: FULL-WIDTH EDGE-TO-EDGE TIMELINE SCRUBBER]                                                                    │
│ 2026-11-01  ───────────[Artemis III Target Window]─────────○──────────────────────────[Solstice]────────── 2026-11-30    │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Layering (Z-Index Architecture)

To ensure smooth collapsing and expanding without visual clipping:

| Layer Level | Components | Role |
| :--- | :--- | :--- |
| **Layer 0 (Base)** | 3D Moon Canvas (WebGL / Three.js via CDN) | Central interactive globe with dynamic solar shadows & orbital bodies. |
| **Layer 10 (HUD)** | Top-Left Mini-Map, Top Bar, Bottom Timeline | Always accessible Heads-Up Display controls. |
| **Layer 20 (Drawers)**| Top Cards Drawer, Bottom 2D Map Drawer, Left Horizon Drawer | Collapsible drawers sliding over the 3D viewport. |
| **Layer 30 (Side Menu)**| Right Hamburger Menu | Full-height side drawer for settings and presets. |
| **Layer 40 (Floating)**| Dr. Raj AI Widget & Modal Popups | Floating collapsible widget in the corner. |

---

## 3. Drawer Behaviors & Multi-Panel Interaction Rules

1. **Top Drawer (Comparison Cards):**
   - Click `[▼ Compare Sites]` in top bar $\rightarrow$ smoothly slides down from top.
   - Cards scroll horizontally. Click `[▲ Close]` or click outside to collapse.
2. **Bottom Drawer (2D Map):**
   - Click `[▲ 2D Map]` above timeline $\rightarrow$ smoothly slides up.
   - Includes `[ 🌐 Global Flat ]` vs `[ 🎯 South Pole (Stereographic) ]` projection toggle.
   - Two-point distance tool measures surface distance in kilometers.
3. **Left Drawer (Topography & Horizon):**
   - Click `[⛰️ Horizon Profile]` button $\rightarrow$ slides out from left.
   - Shows upper $360^\circ$ panoramic horizon elevation skyline vs Sun/Earth paths, and lower crater radial slope cross-section.
4. **Right Drawer (Settings & Presets):**
   - Click `[☰]` icon $\rightarrow$ slides out from right.
   - Controls 3D Earth visibility, coordinate grids, lighting realism mode, and mission presets.
5. **Bottom-Right Corner (Dr. Raj AI):**
   - Collapsible circular floating avatar button $\rightarrow$ expands into interactive chat window with prompt chips.

