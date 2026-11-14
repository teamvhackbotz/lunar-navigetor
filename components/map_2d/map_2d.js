/**
 * ============================================================================
 * COMPONENT: 2D Cartographic Synchronizer (components/map_2d/)
 * SCRIPT: map_2d.js
 * 
 * ROLE:
 * Coordinates the 2D lunar inspection deck with dual presentation modes:
 * 1. Single Focused View (Default):
 *    - Symmetrical Tactical Wings Console (Left Wing | Centered Map | Right Wing)
 *    - Left Wing: Dynamic Target Shortcuts (Artemis III / Apollo / Cold Traps)
 *    - Center: Centered High-Resolution Map (Strict 2:1 Flat Map or Polar Disc)
 *    - Right Wing: Live Selenographic Telemetry & DTE link budget
 *    - Collapsed as Default for distraction-free cartographic immersion
 * 2. Tri-Map Panoramic View:
 *    - 3-viewport side-by-side comparison deck (North Disc | Global Flat | South Disc)
 * 
 * DATA FLOW & EVENTBUS INTEGRATION:
 * 📥 DATA IN:
 *    - "site:marked"       -> Synchronizes pin positions and updates telemetry readouts.
 *    - "map2d:set_layout"  -> Triggered by Settings Modal to update layout preferences.
 * 
 * 📤 DATA OUT:
 *    - "site:marked"       -> Fires when clicking on any map or quick target shortcut.
 *    - "map2d:view_change" -> Broadcasts projection or mode switch.
 *    - "map2d:wings_toggle"-> Broadcasts tactical wings expanded state.
 * ============================================================================
 */

(function() {
  // ==========================================================================
  // 1. TARGET CATALOGS FOR LEFT TACTICAL WING
  // ==========================================================================
  const TARGET_CATALOGS = {
    south: {
      title: "Artemis Candidates",
      badge: "70°S – 90°S",
      targets: [
        { name: "Connecting Ridge", lat: -89.4, lon: 222.6, badge: "4.2° Safe" },
        { name: "Peak Near Shackleton", lat: -89.6, lon: 129.2, badge: "6.8° Safe" },
        { name: "Malapert Massif", lat: -85.9, lon: 2.9, badge: "8.1° Steep" },
        { name: "Amundsen Rim", lat: -84.5, lon: 105.0, badge: "6.4° Mod" }
      ]
    },
    global: {
      title: "Historical Missions",
      badge: "Global Baselines",
      targets: [
        { name: "Apollo 11", lat: 0.67, lon: 23.47, badge: "Mare Tranquillitatis" },
        { name: "Apollo 17", lat: 20.19, lon: 30.77, badge: "Taurus-Littrow" },
        { name: "Chandrayaan-3", lat: -69.37, lon: 32.35, badge: "Shiv Shakti Point" },
        { name: "Surveyor 1", lat: -2.47, lon: 316.66, badge: "Oceanus Procellarum" }
      ]
    },
    north: {
      title: "Cold Trap Targets",
      badge: "70°N – 90°N",
      targets: [
        { name: "Hermite Crater", lat: 86.0, lon: 270.0, badge: "26 K Coldest" },
        { name: "Peary Crater Rim", lat: 88.6, lon: 30.0, badge: "Solar Crest" },
        { name: "Byrd Crater", lat: 85.3, lon: 10.0, badge: "Subsurface Ice" },
        { name: "Whipple Rim", lat: 89.1, lon: 120.0, badge: "Quasi-Daylight" }
      ]
    }
  };

  // ==========================================================================
  // 2. MODULE STATE
  // ==========================================================================
  let viewMode = "single"; // 'single' | 'tri'
  let activeProjection = "south"; // 'south' | 'global' | 'north'
  let leftWingExpanded = false; // Left wing: Target shortcuts (Collapsed as Default)
  let rightWingExpanded = false; // Right wing: Live Telemetry (Collapsed as Default)
  let isMaximized = false; // Default: 390px baseline height

  // Two-point geodesic distance state
  let measurePointA = null;

  // Cached active landing site (defaults to Artemis target: Connecting Ridge)
  let lastMarkedSite = { lat: -89.4, lon: 222.6, name: "Connecting Ridge" };

  // ==========================================================================
  // 3. INITIALIZATION
  // ==========================================================================
  function initMap2D() {
    bindHeaderControls();
    bindViewportClickListeners();
    loadPreferences();

    // EventBus Subscription: External site:marked events
    if (window.eventBus) {
      window.eventBus.on("site:marked", (data) => {
        lastMarkedSite = data;
        renderMarkers(data);
        updateTelemetryRightWing(data);
      });

      // Settings Modal layout changes
      window.eventBus.on("map2d:set_layout", (layout) => {
        if (layout.mode) viewMode = layout.mode;
        if (layout.projection) activeProjection = layout.projection;
        if (typeof layout.leftWing === "boolean") leftWingExpanded = layout.leftWing;
        if (typeof layout.rightWing === "boolean") rightWingExpanded = layout.rightWing;
        if (typeof layout.wings === "boolean") {
          leftWingExpanded = layout.wings;
          rightWingExpanded = layout.wings;
        }
        if (typeof layout.maximized === "boolean") isMaximized = layout.maximized;

        applyPresentationState();
      });
    }

    // Initial render
    applyPresentationState();
    updateTelemetryRightWing(lastMarkedSite);
  }

  // ==========================================================================
  // 4. HEADER CONTROLS (Switcher Tabs, Wings & Maximize Toggles)
  // ==========================================================================
  function bindHeaderControls() {
    // Segmented View Switcher Pills
    const viewPills = document.querySelectorAll(".map-view-pill");
    viewPills.forEach(pill => {
      pill.addEventListener("click", () => {
        const targetView = pill.dataset.view;
        if (targetView === "tri") {
          viewMode = "tri";
        } else {
          viewMode = "single";
          activeProjection = targetView;
        }
        applyPresentationState();
        savePreferences();
      });
    });

    // Left Wing (Targets) Flank Tab Handle
    const tabLeftWing = document.getElementById("tab-wing-left");
    if (tabLeftWing) {
      tabLeftWing.addEventListener("click", () => {
        leftWingExpanded = !leftWingExpanded;
        applyWingsState();
        savePreferences();
      });
    }

    // Right Wing (Telemetry) Flank Tab Handle
    const tabRightWing = document.getElementById("tab-wing-right");
    if (tabRightWing) {
      tabRightWing.addEventListener("click", () => {
        rightWingExpanded = !rightWingExpanded;
        applyWingsState();
        savePreferences();
      });
    }

    // Direct Close Buttons inside Wing Headers
    const btnCloseLeft = document.getElementById("btn-close-left-wing");
    if (btnCloseLeft) {
      btnCloseLeft.addEventListener("click", () => {
        leftWingExpanded = false;
        applyWingsState();
        savePreferences();
      });
    }

    const btnCloseRight = document.getElementById("btn-close-right-wing");
    if (btnCloseRight) {
      btnCloseRight.addEventListener("click", () => {
        rightWingExpanded = false;
        applyWingsState();
        savePreferences();
      });
    }

    // Height Maximize / Restore Button
    const btnMaximize = document.getElementById("btn-toggle-maximize");
    if (btnMaximize) {
      btnMaximize.addEventListener("click", () => {
        isMaximized = !isMaximized;
        applyMaximizeState();
        savePreferences();
      });
    }
  }

  // ==========================================================================
  // 5. PRESENTATION STATE CONTROLLER
  // ==========================================================================
  function applyPresentationState() {
    const stage = document.getElementById("map-deck-stage");
    const subLabel = document.getElementById("map-active-projection-label");
    const viewPills = document.querySelectorAll(".map-view-pill");

    // 1. Update Switcher Pill Active Classes
    viewPills.forEach(pill => {
      const pView = pill.dataset.view;
      if (viewMode === "tri") {
        pill.classList.toggle("active", pView === "tri");
        pill.setAttribute("aria-selected", pView === "tri" ? "true" : "false");
      } else {
        pill.classList.toggle("active", pView === activeProjection);
        pill.setAttribute("aria-selected", pView === activeProjection ? "true" : "false");
      }
    });

    // 2. Stage Mode Class
    if (stage) {
      stage.classList.remove("mode-single", "mode-tri");
      stage.classList.add(viewMode === "tri" ? "mode-tri" : "mode-single");
    }

    // 3. Update Panels & Header Label
    const northPanel = document.getElementById("north-polar-panel");
    const rectPanel = document.getElementById("rect-map-panel");
    const southPanel = document.getElementById("south-polar-panel");

    if (viewMode === "tri") {
      if (subLabel) subLabel.textContent = "◫ Tri-Map: North · Global · South";
      if (northPanel) northPanel.classList.remove("single-active");
      if (rectPanel) rectPanel.classList.remove("single-active");
      if (southPanel) southPanel.classList.remove("single-active");
    } else {
      // Single Mode
      if (northPanel) northPanel.classList.toggle("single-active", activeProjection === "north");
      if (rectPanel) rectPanel.classList.toggle("single-active", activeProjection === "global");
      if (southPanel) southPanel.classList.toggle("single-active", activeProjection === "south");

      if (subLabel) {
        if (activeProjection === "south") subLabel.textContent = "🎯 South Pole (70°S – 90°S) · Artemis III";
        else if (activeProjection === "global") subLabel.textContent = "🌐 Global Flat (180°W – 180°E) · 2:1 Ratio";
        else if (activeProjection === "north") subLabel.textContent = "❄️ North Pole (70°N – 90°N) · Cold Traps";
      }
    }

    // 4. Populate Left Wing Targets for Current Projection
    renderLeftWingTargets();

    // 5. Apply Wings and Maximize States
    applyWingsState();
    applyMaximizeState();

    // 6. Broadcast view change
    if (window.eventBus) {
      window.eventBus.emit("map2d:view_change", {
        mode: viewMode,
        projection: activeProjection
      });
    }

    // Re-render markers with updated geometry
    setTimeout(() => {
      renderMarkers(lastMarkedSite);
    }, 60);
  }

  function applyWingsState() {
    const leftWing = document.getElementById("wing-left");
    const rightWing = document.getElementById("wing-right");
    const tabLeft = document.getElementById("tab-wing-left");
    const tabRight = document.getElementById("tab-wing-right");
    const btnLeftWing = document.getElementById("btn-toggle-left-wing");
    const btnRightWing = document.getElementById("btn-toggle-right-wing");

    const isTri = (viewMode === "tri");

    if (leftWing) {
      leftWing.classList.toggle("collapsed", !leftWingExpanded || isTri);
    }
    if (rightWing) {
      rightWing.classList.toggle("collapsed", !rightWingExpanded || isTri);
    }

    // Update Left Flank Grab Tab
    if (tabLeft) {
      tabLeft.classList.toggle("active", leftWingExpanded && !isTri);
      tabLeft.setAttribute("aria-expanded", (leftWingExpanded && !isTri) ? "true" : "false");
      tabLeft.title = leftWingExpanded ? "Collapse Target Shortcuts Wing" : "Expand Target Shortcuts Wing";
    }

    // Update Right Flank Grab Tab
    if (tabRight) {
      tabRight.classList.toggle("active", rightWingExpanded && !isTri);
      tabRight.setAttribute("aria-expanded", (rightWingExpanded && !isTri) ? "true" : "false");
      tabRight.title = rightWingExpanded ? "Collapse Telemetry Wing" : "Expand Telemetry Wing";
    }

    // Backward compatibility for toolbar buttons if present
    if (btnLeftWing) {
      btnLeftWing.classList.toggle("active", leftWingExpanded && !isTri);
      btnLeftWing.style.display = isTri ? "none" : "inline-block";
    }
    if (btnRightWing) {
      btnRightWing.classList.toggle("active", rightWingExpanded && !isTri);
      btnRightWing.style.display = isTri ? "none" : "inline-block";
    }

    if (window.eventBus) {
      window.eventBus.emit("map2d:wings_toggle", {
        left: leftWingExpanded,
        right: rightWingExpanded,
        any: (leftWingExpanded || rightWingExpanded)
      });
    }

    // Allow CSS transition to finish before recalculating pin coordinates
    setTimeout(() => {
      renderMarkers(lastMarkedSite);
    }, 290);
  }

  function applyMaximizeState() {
    const drawer = document.getElementById("drawer-bottom-map");
    const btnMaximize = document.getElementById("btn-toggle-maximize");

    if (drawer) {
      drawer.classList.toggle("is-maximized", isMaximized);
    }
    if (btnMaximize) {
      btnMaximize.textContent = isMaximized ? "◰" : "⛶";
      btnMaximize.classList.toggle("active", isMaximized);
      btnMaximize.title = isMaximized ? "Restore Compact Deck Height (390px)" : "Maximize Tactical Deck Height (500px)";
      btnMaximize.setAttribute("aria-label", isMaximized ? "Restore Deck Height" : "Maximize Deck Height");
    }

    setTimeout(() => {
      renderMarkers(lastMarkedSite);
    }, 320);
  }

  // ==========================================================================
  // 6. DYNAMIC LEFT WING: TARGET SHORTCUTS RENDERER
  // ==========================================================================
  function renderLeftWingTargets() {
    const container = document.getElementById("quick-targets-container");
    const titleEl = document.getElementById("wing-left-title");
    const badgeEl = document.getElementById("wing-left-badge");
    if (!container) return;

    const catalog = TARGET_CATALOGS[activeProjection] || TARGET_CATALOGS.south;
    if (titleEl) titleEl.textContent = catalog.title;
    if (badgeEl) badgeEl.textContent = catalog.badge;

    container.innerHTML = "";

    catalog.targets.forEach(tgt => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-quick-target";
      btn.dataset.site = tgt.name;
      btn.dataset.lat = tgt.lat;
      btn.dataset.lon = tgt.lon;

      const isCurrent = (lastMarkedSite.name || "").toLowerCase().includes(tgt.name.toLowerCase());
      if (isCurrent) btn.classList.add("active");

      btn.innerHTML = `
        <span>${tgt.name}</span>
        <span class="target-badge">${tgt.badge}</span>
      `;

      btn.addEventListener("click", () => {
        container.querySelectorAll(".btn-quick-target").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const siteData = {
          lat: tgt.lat,
          lon: tgt.lon,
          name: tgt.name,
          source: "quick-target",
          focus: true
        };

        lastMarkedSite = siteData;
        renderMarkers(siteData);
        updateTelemetryRightWing(siteData);

        if (window.eventBus) {
          window.eventBus.emit("site:marked", siteData);
        }
      });

      container.appendChild(btn);
    });
  }

  // ==========================================================================
  // 7. DYNAMIC RIGHT WING: TELEMETRY & ENVIRONMENTAL READOUTS
  // ==========================================================================
  function updateTelemetryRightWing(site) {
    const siteNameEl = document.getElementById("tel-site-name");
    const coordEl = document.getElementById("tel-coord-readout");
    const distEl = document.getElementById("tel-pole-dist");
    const slopeEl = document.getElementById("tel-slope");
    const sunEl = document.getElementById("tel-sun-elev");
    const quickBtns = document.querySelectorAll(".btn-quick-target");

    if (siteNameEl) siteNameEl.textContent = site.name || "Custom Target";
    if (coordEl) {
      const latStr = `${Math.abs(site.lat).toFixed(2)}° ${site.lat < 0 ? 'S' : 'N'}`;
      const lonStr = `${site.lon.toFixed(1)}° E`;
      coordEl.textContent = `${latStr}, ${lonStr}`;
    }

    if (distEl) {
      const degFromPole = Math.abs(site.lat - (-90.0));
      const kmFromPole = (degFromPole * 30.3).toFixed(1);
      distEl.textContent = `${kmFromPole} km to South Pole`;
    }

    // Dynamic slope and solar telemetry
    if (slopeEl && sunEl) {
      const nameLower = (site.name || "").toLowerCase();
      if (nameLower.includes("shackleton")) {
        slopeEl.textContent = "4.2° (Safe)";
        slopeEl.className = "t-m-val status-safe";
        sunEl.textContent = "+1.8° (Crest)";
      } else if (nameLower.includes("ridge")) {
        slopeEl.textContent = "5.8° (Moderate)";
        slopeEl.className = "t-m-val status-safe";
        sunEl.textContent = "+1.4° (Day)";
      } else if (nameLower.includes("malapert")) {
        slopeEl.textContent = "8.1° (Caution)";
        slopeEl.className = "t-m-val";
        sunEl.textContent = "+2.3° (Peak)";
      } else if (nameLower.includes("amundsen")) {
        slopeEl.textContent = "6.4° (Moderate)";
        slopeEl.className = "t-m-val";
        sunEl.textContent = "+0.9° (Low)";
      } else if (nameLower.includes("apollo 11")) {
        slopeEl.textContent = "1.2° (Mare Flat)";
        slopeEl.className = "t-m-val status-safe";
        sunEl.textContent = "+45.0° (Zenith)";
      } else {
        slopeEl.textContent = "4.5° (Nominal)";
        slopeEl.className = "t-m-val status-safe";
        sunEl.textContent = "+1.2° (Day)";
      }
    }

    // Highlight matching candidate button in Left Wing
    quickBtns.forEach(b => {
      const bSite = b.dataset.site.toLowerCase();
      const currSite = (site.name || "").toLowerCase();
      b.classList.toggle("active", currSite.includes(bSite) || bSite.includes(currSite));
    });
  }

  // ==========================================================================
  // 8. VIEWPORT CLICK LISTENERS & SELECTION HANDLERS
  // ==========================================================================
  function bindViewportClickListeners() {
    const northDisc = document.getElementById("north-polar-map-disc");
    const southDisc = document.getElementById("south-polar-map-disc");
    const rectMap = document.getElementById("rect-map-canvas-mock");

    // North Polar Disc (70°N – 90°N)
    if (northDisc) {
      northDisc.addEventListener("click", (e) => {
        const rect = northDisc.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const r = (rect.width / 2) - 8;

        const coord = window.CoordMath.polarNorthToLatLon(x, y, cx, cy, r, 70.0);
        handlePointSelected(coord, "map-2d-north-polar");
      });
    }

    // South Polar Disc (70°S – 90°S)
    if (southDisc) {
      southDisc.addEventListener("click", (e) => {
        const rect = southDisc.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const r = (rect.width / 2) - 8;

        const coord = window.CoordMath.polarSouthToLatLon(x, y, cx, cy, r, -70.0);
        handlePointSelected(coord, "map-2d-south-polar");
      });
    }

    // Center Global Equirectangular Flat Map
    if (rectMap) {
      rectMap.addEventListener("click", (e) => {
        const rect = rectMap.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const coord = window.CoordMath.rectToLatLon(x, y, rect.width, rect.height);
        handlePointSelected(coord, "map-2d-rect");
      });
    }
  }

  function handlePointSelected(coord, source) {
    const nearest = window.CoordMath.findNearestSite(coord.lat, coord.lon);
    const siteData = {
      lat: coord.lat,
      lon: coord.lon,
      name: nearest.name,
      source
    };

    // Two-point geodesic distance state machine
    if (!measurePointA) {
      measurePointA = siteData;
      updateDistanceBadge(0, `Pt A: ${siteData.name}`);
    } else {
      const dist = window.CoordMath.calculateDistanceKm(
        measurePointA.lat, measurePointA.lon,
        siteData.lat, siteData.lon
      );
      updateDistanceBadge(dist, `A ➔ B: ${dist.toFixed(1)} km`);
      measurePointA = null;
    }

    lastMarkedSite = siteData;
    renderMarkers(siteData);
    updateTelemetryRightWing(siteData);

    if (window.eventBus) {
      window.eventBus.emit("site:marked", siteData);
    }
  }

  function updateDistanceBadge(distKm, label) {
    const distEl = document.getElementById("map-distance-display");
    if (distEl) {
      distEl.innerHTML = `📏 <strong>${distKm.toFixed(1)} km</strong>`;
      distEl.title = `Geodesic distance: ${distKm.toFixed(1)} km (${label})`;
    }
  }

  // ==========================================================================
  // 9. MULTI-PROJECTION MARKER RENDERER
  // ==========================================================================
  function renderMarkers(data) {
    if (!data) return;

    // 1. Render on North Pole Disc (lat >= 70°N)
    const northDisc = document.getElementById("north-polar-map-disc");
    const northPin = document.getElementById("north-polar-active-pin");
    if (northDisc && northPin) {
      const rect = northDisc.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const r = (rect.width / 2) - 8;

      const numLabel = data.number ? `#${data.number} ` : "";
      if (data.lat >= 70.0) {
        const pos = window.CoordMath.latLonToPolarNorth(data.lat, data.lon, cx, cy, r, 70.0);
        northPin.style.display = "block";
        northPin.style.left = `${pos.x}px`;
        northPin.style.top = `${pos.y}px`;
        northPin.textContent = `📍 ${numLabel}${data.name}`;
      } else {
        northPin.style.display = "none";
      }
    }

    // 2. Render on South Pole Disc (lat <= -70°S)
    const southDisc = document.getElementById("south-polar-map-disc");
    const southPin = document.getElementById("south-polar-active-pin");
    if (southDisc && southPin) {
      const rect = southDisc.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const r = (rect.width / 2) - 8;

      const numLabel = data.number ? `#${data.number} ` : "";
      if (data.lat <= -70.0) {
        const pos = window.CoordMath.latLonToPolarSouth(data.lat, data.lon, cx, cy, r, -70.0);
        southPin.style.display = "block";
        southPin.style.left = `${pos.x}px`;
        southPin.style.top = `${pos.y}px`;
        southPin.textContent = `📍 ${numLabel}${data.name}`;
      } else {
        southPin.style.display = "none";
      }
    }

    // 3. Render on Global Flat Map
    const rectMap = document.getElementById("rect-map-canvas-mock");
    const rectPin = document.getElementById("rect-active-pin");
    if (rectMap && rectPin) {
      const rect = rectMap.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const pos = window.CoordMath.latLonToRect(data.lat, data.lon, rect.width, rect.height);
        rectPin.style.left = `${pos.x}px`;
        rectPin.style.top = `${pos.y}px`;
      }
    }
  }

  // ==========================================================================
  // 10. PREFERENCE PERSISTENCE
  // ==========================================================================
  function savePreferences() {
    try {
      const prefs = {
        viewMode,
        activeProjection,
        leftWingExpanded,
        rightWingExpanded,
        isMaximized
      };
      localStorage.setItem("spaceapp_map2d_prefs", JSON.stringify(prefs));
    } catch (e) {
      console.warn("[Map2D] Failed to save preferences to localStorage:", e);
    }
  }

  function loadPreferences() {
    try {
      const saved = localStorage.getItem("spaceapp_map2d_prefs");
      if (saved) {
        const prefs = JSON.parse(saved);
        if (prefs.viewMode) viewMode = prefs.viewMode;
        if (prefs.activeProjection) activeProjection = prefs.activeProjection;
        if (typeof prefs.leftWingExpanded === "boolean") {
          leftWingExpanded = prefs.leftWingExpanded;
        } else if (typeof prefs.wingsExpanded === "boolean") {
          leftWingExpanded = prefs.wingsExpanded;
        }
        if (typeof prefs.rightWingExpanded === "boolean") {
          rightWingExpanded = prefs.rightWingExpanded;
        } else if (typeof prefs.wingsExpanded === "boolean") {
          rightWingExpanded = prefs.wingsExpanded;
        }
        if (typeof prefs.isMaximized === "boolean") isMaximized = prefs.isMaximized;
      }
    } catch (e) {
      console.warn("[Map2D] Failed to load preferences from localStorage:", e);
    }
  }

  // ==========================================================================
  // 11. DOM LIFECYCLE BOOTSTRAP
  // ==========================================================================
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMap2D);
  } else {
    initMap2D();
  }
})();
