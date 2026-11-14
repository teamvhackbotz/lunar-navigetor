# Core Application Framework (`core/`)

## Purpose
The `core/` directory provides the shared architectural foundation for the Lunar Landing Site Navigator, decoupling micro-frontend components and supplying universal selenographic cartography algorithms.

## Modules

### 1. Universal EventBus (`core/event_bus.js`)
- **Role:** Pub/Sub event broker exposed globally on `window.eventBus`.
- **Key Methods:**
  - `on(event, callback)`: Subscribes a callback to a topic. Returns an unsubscribe function.
  - `off(event, callback)`: Unsubscribes a callback from a topic.
  - `emit(event, data)`: Dispatches data to all subscribers, isolating listener errors via `try/catch`.
- **Standard Topics:**
  - `site:marked`: Dispatched when any component pins or selects a candidate site (`{ lat, lon, name, source }`).
  - `time:changed`: Dispatched during timeline playback or scrubbing (`{ sliderValue, isoString, timestamp }`).
  - `theme:changed`: Dispatched on theme switch (`{ theme: 'earth' | 'regolith' | 'space' }`).
  - `ai:toggle`: Dispatched to show/hide the Dr. Raj AI mission assistant.
  - `settings:open` / `settings:close`: Dispatched to open/close the settings modal.
  - `app:ready`: Dispatched when all micro-frontends finish loading.

### 2. Selenographic Coordinate & Cartography Math (`core/coord_math.js`)
- **Role:** Pure mathematical coordinate transformations and geodesic distance calculations, exposed on `window.CoordMath`.
- **Constant:** `MOON_RADIUS_KM = 1737.4` (IAU standard mean volumetric radius).
- **Key Functions:**
  - `findNearestSite(lat, lon, maxDistanceDeg)`: Identifies nearest candidate site or outputs custom coordinates.
  - `latLonToRect(lat, lon, w, h)` / `rectToLatLon(x, y, w, h)`: Forward & inverse Equirectangular projection.
  - `latLonToPolarSouth(lat, lon, cx, cy, r, bound)` / `polarSouthToLatLon(...)`: Forward & inverse South Pole Stereographic projection ($\le -70^\circ$).
  - `latLonToPolarNorth(lat, lon, cx, cy, r, bound)` / `polarNorthToLatLon(...)`: Forward & inverse North Pole Stereographic projection ($\ge +70^\circ$).
  - `calculateDistanceKm(lat1, lon1, lat2, lon2)`: Spherical Haversine great-circle distance on the lunar sphere.

### 3. Micro-Frontend Component Loader (`core/loader.js`)
- **Role:** Asynchronously fetches, mounts, and initializes all component modules on `DOMContentLoaded`.
- **Execution Flow:**
  1. Injects component markup into corresponding `#mount-<name>` containers.
  2. Injects component CSS stylesheets into `<head>`.
  3. Injects component JavaScript modules into `<body>`.
  4. Emits `app:ready` upon completion.
