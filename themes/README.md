# Lunar Landing Site Navigator — Theme Architecture & Design System

The `/themes/` directory contains decoupled, hot-swappable color stylesheets for the Lunar Landing Site Navigator cockpit. 

---

## 1. Architecture Overview

Themes are completely decoupled from application layout logic:
- **`styles.css`**: Defines layout geometry (flexbox grids, drawer dimensions, transitions, typography sizing, component resets).
- **`themes/theme_*.css`**: Defines color tokens, contrast boundaries, border treatments, surface tones, and glow accents.
- **`themes/theme_manager.js`**: Dynamically updates the active `<link id="theme-stylesheet">` in `<head>`, switches `<body>` classes, saves to `localStorage`, and broadcasts the `theme:changed` event over `window.eventBus`.

---

## 2. Standard Design Token Contract

Every theme must define the following standard CSS Custom Properties under `:root, body, body.theme-<id>`:

| Token Name | Role / Description |
| :--- | :--- |
| `--bg-deep-space` | Main application background (cislunar vacuum). |
| `--bg-surface-dark` | Header, drawer backgrounds, and primary structural panels. |
| `--bg-cockpit` | Bottom toolbar and docked flight controls background. |
| `--bg-card` | Floating comparison cards and popups (semi-transparent frosted glass). |
| `--bg-card-hover` | Card background on mouse hover. |
| `--bg-drawer` | Slide-out horizon and tools drawer backdrop. |
| `--bg-overlay` | Modal backdrops and dimming filters. |
| `--border-subtle` | Dividers, card borders, and unselected UI boundaries. |
| `--border-medium` | Hover borders and active frame edges. |
| `--border-active` | Selected card outline, active tab indicator, and focus states. |
| `--text-primary` | Main readable headings, card titles, and high-contrast numbers. |
| `--text-secondary` | Subheadings, data labels, and active coordinates. |
| `--text-muted` | Inactive controls, telemetry timestamps, and unit symbols. |
| `--accent-terracotta` | Primary operational accent (action buttons, active pins, drawer handles). |
| `--accent-sand` | Secondary accent (section titles, timeline markers, sun indicators). |
| `--accent-sage` | Positive status indicator (safe landing slopes $<8^\circ$, nominal comms). |
| `--accent-slate` | Auxiliary telemetry indicators (Earth azimuth, neutral metrics). |
| `--accent-danger` | Hazard alerts (steep slopes $>15^\circ$, shadow entry warnings). |
| `--theme-swatch-gradient` | CSS gradient preview rendered in the Settings modal theme picker. |

---

## 3. How to Add a New Theme in 3 Steps

To add a new theme (for example, an *Apollo Retro* or *Artemis Gold* palette):

### Step 1: Create the Theme Stylesheet
Create `themes/theme_artemis_gold.css`:
```css
:root, body, body.theme-artemis-gold {
  --bg-deep-space: #0b0f19;
  --bg-surface-dark: #111726;
  --bg-cockpit: #0e1320;
  --bg-card: rgba(19, 26, 42, 0.94);
  --bg-card-hover: rgba(27, 36, 58, 0.98);
  --bg-drawer: #141b2b;
  --bg-overlay: rgba(8, 11, 18, 0.85);

  --border-subtle: #243048;
  --border-medium: #3b4d70;
  --border-active: #e6b800;

  --text-primary: #f5f7fa;
  --text-secondary: #c2cde0;
  --text-muted: #7e8ea6;

  --accent-terracotta: #e6b800;
  --accent-sand: #ffd13b;
  --accent-sage: #00e5a3;
  --accent-slate: #4da6ff;
  --accent-danger: #ff4d6d;

  --theme-swatch-gradient: linear-gradient(135deg, #0b0f19 0%, #141b2b 50%, #e6b800 100%);
}
```

### Step 2: Register in `themes/theme_manager.js`
Add an entry to the `THEMES` array in [`themes/theme_manager.js`](file:///home/battlescar26/SpaceApp/themes/theme_manager.js):
```javascript
{
  id: "artemis-gold",
  name: "Artemis Gold",
  subtitle: "Apollo Gold Foil & Deep Navy",
  file: "themes/theme_artemis_gold.css",
  swatch: "linear-gradient(135deg, #0b0f19 0%, #141b2b 50%, #e6b800 100%)",
  accent: "#e6b800"
}
```

### Step 3: Done!
The new theme will automatically appear inside the **Settings Modal**, can be selected by the user, and will persist in `localStorage`.
