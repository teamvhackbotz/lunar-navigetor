/**
 * Coordinate Synchronizer & Universal Projection Math
 * Synchronizes pin-marking across:
 * 1. 3D Moon Surface View
 * 2. 2D Circular South Pole Stereographic Map
 * 3. 2D Global Rectangular Equirectangular Map
 */

const CoordSync = (function() {
  // Canonical current point (defaults to Shackleton vicinity)
  let activeCoord = {
    lat: -89.4,
    lon: 222.6,
    name: "Connecting Ridge"
  };

  // Known curated sites for auto-snapping / naming if clicked nearby
  const knownSites = [
    { name: "Peak Near Shackleton", lat: -89.6, lon: 129.2 },
    { name: "Connecting Ridge", lat: -89.4, lon: 222.6 },
    { name: "Faustini Rim A", lat: -87.1, lon: 67.0 },
    { name: "Malapert Massif", lat: -85.9, lon: 2.9 },
    { name: "Nobile Rim 2", lat: -84.2, lon: 60.7 },
    { name: "Apollo 11", lat: 0.674, lon: 23.473 },
    { name: "Chandrayaan-3", lat: -69.37, lon: 32.35 }
  ];

  function findNearestSiteName(lat, lon) {
    for (const s of knownSites) {
      const dLat = Math.abs(s.lat - lat);
      const dLon = Math.abs((s.lon - lon + 540) % 360 - 180);
      if (dLat < 0.6 && dLon < 5.0) {
        return s.name;
      }
    }
    return `Custom (${lat.toFixed(2)}°, ${lon.toFixed(1)}°)`;
  }

  // ==========================================
  // MATHEMATICAL PROJECTIONS
  // ==========================================

  // 1. Rectangular Equirectangular Map (lon: -180..+180 or 0..360, lat: -90..+90)
  function latLonToRect(lat, lon, width, height) {
    // Normalize lon to -180..+180
    let normLon = ((lon + 180) % 360) - 180;
    if (normLon < -180) normLon += 360;

    const x = ((normLon + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    return { x, y };
  }

  function rectToLatLon(x, y, width, height) {
    const lon = (x / width) * 360 - 180;
    const lat = 90 - (y / height) * 180;
    return { lat, lon: (lon + 360) % 360 };
  }

  // 2. Circular South Pole Stereographic Map (Center cx, cy, Radius R, Bound e.g. -70° S)
  const POLAR_LAT_BOUND = -70.0; // South of 70°S is shown on the polar disc

  function latLonToPolar(lat, lon, cx, cy, radius) {
    if (lat > POLAR_LAT_BOUND) {
      return { x: cx, y: cy, visible: false }; // North of boundary
    }
    // Angular distance from South Pole (-90°)
    const deltaLat = 90 + lat; // at -90 => 0, at -70 => 20
    const maxDelta = 90 + POLAR_LAT_BOUND; // 20
    const r = (deltaLat / maxDelta) * radius;

    const rad = (lon * Math.PI) / 180;
    const x = cx + r * Math.sin(rad);
    const y = cy - r * Math.cos(rad);
    return { x, y, visible: true };
  }

  function polarToLatLon(x, y, cx, cy, radius) {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.sqrt(dx * dx + dy * dy);

    const maxDelta = 90 + POLAR_LAT_BOUND;
    const clampedR = Math.min(r, radius);
    const deltaLat = (clampedR / radius) * maxDelta;
    const lat = -(90 - deltaLat);

    let lonRad = Math.atan2(dx, -dy);
    let lonDeg = (lonRad * 180) / Math.PI;
    if (lonDeg < 0) lonDeg += 360;

    return { lat, lon: lonDeg };
  }

  // 3. 3D Moon Sphere Mock View (Orthographic tilted at South Pole)
  function latLonTo3DMock(lat, lon, cx, cy, radius) {
    // When tilted towards South Pole, South Pole is near bottom-center
    // Simple projection mapping
    const deltaLat = (90 + lat) / 90; // 0 at pole, 1 at equator
    const rad = ((lon - 90) * Math.PI) / 180;
    const r = deltaLat * radius * 0.75;
    
    // Tilted perspective: South pole shifted down
    const x = cx + r * Math.cos(rad);
    const y = (cy + radius * 0.45) - (90 + lat) * 1.5 - r * Math.sin(rad) * 0.5;
    return { x, y };
  }

  function mock3DToLatLon(x, y, cx, cy, radius) {
    // Approximate inverse for interactive mockup
    const dx = x - cx;
    const dy = y - (cy + radius * 0.45);
    const r = Math.sqrt(dx * dx + dy * dy);
    
    const lat = Math.max(-90, -90 + (r / (radius * 0.8)) * 30);
    let lon = (Math.atan2(-dy, dx) * 180 / Math.PI + 90 + 360) % 360;
    return { lat, lon };
  }

  // ==========================================
  // SYNC CONTROLLER
  // ==========================================

  function updateAllViews(coord, sourceView = null) {
    activeCoord = { ...activeCoord, ...coord };
    activeCoord.name = findNearestSiteName(activeCoord.lat, activeCoord.lon);

    // 1. Update status bar readout
    const statusEl = document.getElementById("active-coord-display");
    if (statusEl) {
      statusEl.innerHTML = `📍 <strong>${activeCoord.name}</strong> · ${Math.abs(activeCoord.lat).toFixed(2)}° ${activeCoord.lat < 0 ? 'S' : 'N'} · ${activeCoord.lon.toFixed(1)}° E`;
    }

    // 2. Update 2D Polar Map Marker
    const polarDisc = document.getElementById("polar-map-disc");
    const polarPin = document.getElementById("polar-active-pin");
    if (polarDisc && polarPin) {
      const rect = polarDisc.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const r = (rect.width / 2) - 10;
      const pos = latLonToPolar(activeCoord.lat, activeCoord.lon, cx, cy, r);
      if (pos.visible) {
        polarPin.style.display = "block";
        polarPin.style.left = `${pos.x}px`;
        polarPin.style.top = `${pos.y}px`;
      } else {
        polarPin.style.display = "none";
      }
    }

    // 3. Update 2D Rectangular Map Marker
    const rectMap = document.getElementById("rect-map-canvas-mock");
    const rectPin = document.getElementById("rect-active-pin");
    if (rectMap && rectPin) {
      const rect = rectMap.getBoundingClientRect();
      const pos = latLonToRect(activeCoord.lat, activeCoord.lon, rect.width, rect.height);
      rectPin.style.left = `${pos.x}px`;
      rectPin.style.top = `${pos.y}px`;
    }

    // 4. Update 3D Moon Surface Pin
    const moonSphere = document.getElementById("interactive-moon-sphere");
    const moonPin = document.getElementById("active-moon-pin");
    if (moonSphere && moonPin) {
      const rect = moonSphere.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const r = rect.width / 2;
      const pos = latLonTo3DMock(activeCoord.lat, activeCoord.lon, cx, cy, r);
      moonPin.style.left = `${pos.x}px`;
      moonPin.style.top = `${pos.y}px`;
      const label = moonPin.querySelector(".pin-label");
      if (label) label.textContent = activeCoord.name;
    }

    // Broadcast event
    if (window.eventBus) {
      window.eventBus.emit("site:marked", { ...activeCoord, sourceView });
    }
  }

  // ==========================================
  // ATTACH CLICK LISTENERS
  // ==========================================
  function initListeners() {
    // 1. 2D Polar Map Click
    const polarDisc = document.getElementById("polar-map-disc");
    if (polarDisc) {
      polarDisc.addEventListener("click", (e) => {
        const rect = polarDisc.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const r = (rect.width / 2) - 10;
        const coord = polarToLatLon(x, y, cx, cy, r);
        updateAllViews(coord, "polar-2d");
      });
    }

    // 2. 2D Rectangular Map Click
    const rectMap = document.getElementById("rect-map-canvas-mock");
    if (rectMap) {
      rectMap.addEventListener("click", (e) => {
        const rect = rectMap.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const coord = rectToLatLon(x, y, rect.width, rect.height);
        updateAllViews(coord, "rect-2d");
      });
    }

    // 3. 3D Moon Click
    const moonSphere = document.getElementById("interactive-moon-sphere");
    if (moonSphere) {
      moonSphere.addEventListener("click", (e) => {
        const rect = moonSphere.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const r = rect.width / 2;
        const coord = mock3DToLatLon(x, y, cx, cy, r);
        updateAllViews(coord, "3d-moon");
      });
    }

    // Initial render
    setTimeout(() => updateAllViews(activeCoord), 100);
  }

  return {
    init: initListeners,
    update: updateAllViews,
    getCoord: () => activeCoord
  };
})();

window.CoordSync = CoordSync;
