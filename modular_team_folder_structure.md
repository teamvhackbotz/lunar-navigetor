# Modular Component Folder Architecture
*Decoupled Development Blueprint for Git Team Collaboration*

This document defines the **Component Folder Isolation Architecture** for the Lunar Landing Site Navigator. Each window, panel, or widget in the application lives in its own dedicated self-contained directory.

---

## 1. The Core Problem Solved: Zero Git Merge Conflicts

In multi-developer hackathons, monolithic files (`index.html` or a single `app.js`) cause constant Git merge collisions whenever two people touch the same file.

By adopting a **Self-Contained Component Folder Pattern**:
1. **Isolated Workspace:** A team member working on the **2D Map** works **exclusively** inside `/components/map_2d/`.
2. **Zero Collision Commits:** Teammate A pushes `components/map_2d/`, Teammate B pushes `components/moon_3d/`, and Teammate C pushes `components/horizon_topography/`. Git merges them cleanly with $0\%$ conflict.
3. **Standalone Testing:** Each component directory contains a `test.html` so a developer can open and build their component in complete isolation without needing the rest of the application running.
4. **Agile Hand-offs:** Once Developer A finishes the 2D Map, they can jump to another folder (e.g. `horizon_topography`) without learning a new codebase style.

---

## 2. Directory Tree Blueprint

```
SpaceApp/
├── index.html                         # Master Shell (mounts component containers)
├── styles.css                         # Global CSS Variables & Reset
│
├── core/                              # Shared Application Infrastructure
│   ├── event_bus.js                   # Universal Pub/Sub bus (window.eventBus)
│   ├── coord_math.js                  # Shared astronomical & projection algorithms
│   └── loader.js                      # Dynamically mounts component HTML/CSS/JS
│
└── components/                        # Self-Contained Component Folders
    │
    ├── moon_3d/                       # 1. Main 3D Moon Viewport
    │   ├── moon_3d.html               # Viewport DOM & Canvas
    │   ├── moon_3d.css                # 3D Viewport styling
    │   ├── moon_3d.js                 # Three.js globe, lighting, raycasting
    │   ├── test.html                  # Standalone test runner
    │   └── README.md                  # Developer guidelines
    │
    ├── map_2d/                        # 2. 2D Cartographic Maps
    │   ├── map_2d.html                # Rectangular + Polar (South & North) DOM
    │   ├── map_2d.css                 # 2D Map styling & layout
    │   ├── map_2d.js                  # Projections, disc rendering & distance tool
    │   ├── test.html                  # Standalone test runner
    │   └── README.md                  # Developer guidelines
    │
    ├── comparison_cards/              # 3. Top Comparison Carousel Cards
    │   ├── comparison_cards.html      # Carousel cards container & templates
    │   ├── comparison_cards.css       # Floating card styles & scroll-snap
    │   ├── comparison_cards.js        # Card population, trade-off metrics
    │   ├── test.html                  # Standalone test runner
    │   └── README.md                  # Developer guidelines
    │
    ├── horizon_topography/            # 4. Left Topographic Horizon & Shadows
    │   ├── horizon_topography.html    # 360° skyline chart & crater cross-section
    │   ├── horizon_topography.css     # Horizon SVG & terrain slope styles
    │   ├── horizon_topography.js      # LOLA DEM masking & occlusion algorithms
    │   ├── test.html                  # Standalone test runner
    │   └── README.md                  # Developer guidelines
    │
    ├── timeline/                      # 5. Bottom Timeline & Precision Ruler
    │   ├── timeline.html              # Full-width timeline & mission toolbar
    │   ├── timeline.css               # Precision tick marks & scrubber styling
    │   ├── timeline.js                # Play/Pause, speed multipliers, clock
    │   ├── test.html                  # Standalone test runner
    │   └── README.md                  # Developer guidelines
    │
    ├── minimap_triad/                 # 6. Celestial Triad Mini-Map
    │   ├── minimap_triad.html         # Sun-Earth-Moon orbital layout
    │   ├── minimap_triad.css          # Orbit tracks & center-switch styling
    │   ├── minimap_triad.js           # Libration wobble & frame switching logic
    │   ├── test.html                  # Standalone test runner
    │   └── README.md                  # Developer guidelines
    │
    ├── settings_modal/                # 7. Settings Modal & Theme Manager
    │   ├── settings_modal.html        # Dialog DOM & theme swatch cards
    │   ├── settings_modal.css         # Modal overlay & theme CSS definitions
    │   ├── settings_modal.js          # Theme switching (Earth/Regolith/Contrast)
    │   ├── test.html                  # Standalone test runner
    │   └── README.md                  # Developer guidelines
    │
    └── ai_dr_raj/                     # 8. AI Advisor (Dr. Raj, Ph.D.)
        ├── ai_dr_raj.html             # Floating FAB & chat body
        ├── ai_dr_raj.css              # Chat bubble styles & prompt chips
        ├── ai_dr_raj.js               # Chat client & context synchronization
        ├── test.html                  # Standalone test runner
        └── README.md                  # Developer guidelines
```

---

## 3. How Components Communicate (The Universal Event Contract)

Components **NEVER** import or call each other directly. Instead, they broadcast and listen to events on `window.eventBus`:

| Event Name | Emitted By | Payload | Purpose |
| :--- | :--- | :--- | :--- |
| `site:marked` | `map_2d`, `moon_3d`, `comparison_cards` | `{ lat: float, lon: float, name: string, source: string }` | When a user clicks any map or card, all other views update their active pin. |
| `time:changed` | `timeline` | `{ timestamp: ISOString, unixEpoch: int, lunarPhase: string }` | When timeline scrubs, all lighting and celestial trackers update. |
| `theme:changed` | `settings_modal` | `{ theme: 'earth' \| 'regolith' \| 'contrast' }` | Updates color palette across all components. |
| `horizon:request`| `comparison_cards`, `main` | `{ siteId: string, lat: float, lon: float }` | Opens left drawer focused on a specific site's skyline. |
| `tool:activated`| `timeline` (Toolbar) | `{ tool: 'mark' \| 'measure' \| 'horizon' \| '2d_map' }` | Toggles cursor mode or drawer state. |

---

## 4. How the Master Shell Mounts Components (`core/loader.js`)

In `index.html`, the master page only contains semantic placeholder mounting points:
```html
<div id="mount-moon-3d"></div>
<div id="mount-comparison-cards"></div>
<div id="mount-map-2d"></div>
<div id="mount-horizon-topography"></div>
<div id="mount-timeline"></div>
<div id="mount-minimap-triad"></div>
<div id="mount-settings-modal"></div>
<div id="mount-ai-dr-raj"></div>
```

A 20-line loader (`core/loader.js`) fetches each component's HTML, loads its CSS, and executes its JS:
```javascript
async function loadComponent(name, mountId) {
  // 1. Inject HTML
  const html = await fetch(`components/${name}/${name}.html`).then(r => r.text());
  document.getElementById(mountId).innerHTML = html;

  // 2. Inject CSS
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `components/${name}/${name}.css`;
  document.head.appendChild(link);

  // 3. Inject JS
  const script = document.createElement("script");
  script.src = `components/${name}/${name}.js`;
  document.body.appendChild(script);
}
```

This ensures that any team member can edit their HTML, CSS, or JS inside their folder without ever touching `index.html`!
