# Lunar Navigator UI Icon Design System

A modern, minimalist, precision-crafted icon system built specifically for the **Lunar Landing Site Navigator** cockpit and mission analysis suite.

---

## 1. Design Principles & Geometry

- **Base Canvas & Grid**: `24 × 24` square viewBox (`viewBox="0 0 24 24"`).
- **Active Safe Zone**: Center-weighted within a 20×20 active zone and 2px perimeter margin.
- **Stroke Width**: Uniform `1.75px` (`stroke-width="1.75"`) with optional tokens for thin (`1.25px`) and bold (`2.25px`).
- **Caps & Corners**: `stroke-linecap="round"` and `stroke-linejoin="round"`.
- **Fill**: `none` (clean geometric outline style).
- **Color Model**: `currentColor` (fully theme-adaptive across Earth, Space, and Regolith palettes).

---

## 2. Directory Structure

```
static/icons/
├── icons.css            # Tokenized stylesheet with size, stroke, color, and animations
├── icons.js             # Client-side helper library and auto-replacer
├── icons.svg            # Single-file SVG sprite sheet (<symbol id="icon-...">)
├── README.md            # Icon suite documentation and usage reference
└── svg/                 # 57 individual standalone SVG files
    ├── navigation.svg
    ├── home.svg
    ├── search.svg
    ├── location.svg
    ├── map.svg
    ├── profile.svg
    ├── settings.svg
    ├── notifications.svg
    ├── menu.svg
    ├── edit.svg
    ├── delete.svg
    ├── add.svg
    └── ...
```

---

## 3. Four Simple Ways to Use

### A. Declarative Auto-Replace (Recommended for HTML Templates)
Add the `data-icon` attribute to any tag; `core/loader.js` and `icons.js` replace it with accessible SVG markup automatically:
```html
<button class="btn-toggle">
  <span data-icon="search" data-icon-size="sm"></span>
  Search Sites
</button>
```

### B. JavaScript Programmatic API
```javascript
// Return raw SVG string
const svgString = Icons.svg('navigation', { 
  size: 'md', 
  color: 'terracotta',
  stroke: 'normal' 
});

// Render as DOM Node
const iconEl = Icons.render('settings', { size: 'sm' });
document.getElementById('header-actions').appendChild(iconEl);
```

### C. SVG Sprite Sheet (<use> tag)
```html
<svg class="icon icon-md icon-sand">
  <use href="static/icons/icons.svg#icon-target"></use>
</svg>
```

### D. Direct SVG File Import
```html
<img src="static/icons/svg/location.svg" alt="Location Marker" class="icon">
```

---

## 4. CSS Classes & Token Modifiers

### Sizes
| Class | Dimensions | Use Case |
|---|---|---|
| `.icon-xs` | 14 × 14 px | Badges, micro-indicators, telemetry labels |
| `.icon-sm` | 16 × 16 px | Buttons, table rows, input prefixes |
| `.icon-md` | 20 × 20 px | **Default**, navigation headers, toolbars |
| `.icon-lg` | 24 × 24 px | Prominent action bars, card headings |
| `.icon-xl` | 32 × 32 px | Hero modals, empty state headers |
| `.icon-2xl` | 48 × 48 px | Splash banners, feature inspection cards |

### Stroke Widths
- `.icon-thin` (`1.25px`)
- `.icon-normal` (`1.75px` - default)
- `.icon-bold` (`2.25px`)

### Theme Color Accents
- `.icon-terracotta` (`#c87d55` - primary action accent)
- `.icon-sand` (`#c99e52` - mission milestones & solar status)
- `.icon-sage` (`#7d967e` - terrain clearance & safe zones)
- `.icon-slate` (`#5f798a` - secondary indicators)
- `.icon-danger` (`#b8544f` - hazard & slope warnings)
- `.icon-muted` (`#8c867c` - subtle labels)

### Animations
- `.icon-spin`: Continuous smooth rotation for loading or synchronizing indicators.
- `.icon-pulse`: Subtle rhythmic breathing effect for active simulation markers.

---

## 5. Complete Icon Catalog (57 Icons)

### Navigation & Topography
- `navigation`: Directional pointer needle
- `home`: Minimalist cockpit home
- `location`: Landing site pin marker
- `map`: Topographic folding map
- `compass`: 4-point cardinal azimuth compass
- `target`: Precision reticle crosshair
- `globe`: Planetary sphere with meridian arcs
- `layers`: Stacked elevation and slope contours
- `route`: Waypoint traverse route

### Core UI Actions & Search
- `search`: Magnifying glass
- `add`: Plus cross
- `add-circle`: Circled plus
- `edit`: Precision pen
- `delete`: Modern trash can
- `close`: Dismiss cross
- `check`: Success checkmark
- `check-circle`: Circled checkmark
- `filter`: Funnel filter
- `refresh`: Dual sync cycle arrows
- `copy`: Overlapping clipboard sheets
- `share`: Telemetry node network
- `download`: Tray downward arrow
- `upload`: Tray upward arrow

### System, Controls & Settings
- `profile`: User astronaut avatar
- `settings`: Mechanical gear
- `sliders`: Dual horizontal calibration sliders
- `notifications`: Bell with clapper
- `menu`: 3 horizontal drawer bars
- `info`: Circled detail indicator
- `alert-triangle`: Caution warning triangle
- `help-circle`: Question mark support
- `lock`: Padlock secured
- `unlock`: Padlock open

### View, Fullscreen & Chevrons
- `eye`: Open inspector view
- `eye-off`: Hidden / masked eye
- `chevron-down`: Down caret
- `chevron-up`: Up caret
- `chevron-left`: Left caret
- `chevron-right`: Right caret
- `maximize`: Expand viewport
- `minimize`: Restore window
- `arrow-up-right`: Outbound external link
- `grab`: Pan/orbit hand cursor

### Media, Timeline & Simulation
- `play`: Simulation run triangle
- `pause`: Dual vertical freeze bars
- `step-forward`: Advance 1 hour (+1h)
- `step-back`: Rewind 1 hour (-1h)
- `clock`: UTC ephemeris chronometer
- `calendar`: Launch window calendar

### Celestial, Mission & AI Telemetry
- `moon`: Crescent selenographic moon
- `sun`: Solar core with 8 illumination rays
- `sparkles`: AI mission analyst constellation
- `rocket`: Artemis spacecraft launch vehicle
- `bookmark`: Saved landing site candidate
- `star`: Recommended primary choice
- `folder`: Mission dossier directory
- `file`: Telemetry data sheet

---

## 6. Interactive Documentation & Explorer

Open [icons_preview.html](../../icons_preview.html) in any browser to:
- Test real-time search and category filtering.
- Dynamically adjust icon size (`16px` to `48px`) and stroke width (`1.0px` to `3.0px`).
- Switch live between Earth, Space, and Regolith theme palettes.
- Copy raw SVG or HTML tags with one click.
