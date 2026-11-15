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
      title: "Artemis & Polar Targets",
      badge: "70°S – 90°S",
      targets: [
        { name: "Connecting Ridge", lat: -89.4, lon: 222.6, badge: "4.2° Safe" },
        { name: "CSA Lunar Rover (LEAP)", lat: -89.2, lon: 218.0, badge: "🇨🇦 CSA / Canadensys" },
        { name: "Peak Near Shackleton", lat: -89.6, lon: 129.2, badge: "6.8° Safe" },
        { name: "Malapert Massif", lat: -85.9, lon: 2.9, badge: "8.1° Steep" },
        { name: "Amundsen Rim", lat: -84.5, lon: 105.0, badge: "6.4° Mod" }
      ]
    },
    global: {
      title: "Historical & Modern Missions",
      badge: "Global Baselines",
      targets: [
        { name: "Apollo 11", lat: 0.67, lon: 23.47, badge: "Mare Tranquillitatis" },
        { name: "Apollo 17", lat: 20.19, lon: 30.77, badge: "Taurus-Littrow" },
        { name: "Chandrayaan-3", lat: -69.37, lon: 32.35, badge: "Shiv Shakti Point" },
        { name: "Artemis II Flyby", lat: 0.0, lon: 180.0, badge: "🇨🇦 Jeremy Hansen" },
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

  let candidateSites = [];
  const measurementSvgs = new Map();

  // Cached active landing site (defaults to Artemis target: Connecting Ridge)
  let lastMarkedSite = { lat: -89.4, lon: 222.6, name: "Connecting Ridge" };

  // ==========================================================================
  // 2B. 2D ZOOM & PAN SUBSYSTEM (1.0x to 5.0x per projection)
  // ==========================================================================
  const MIN_ZOOM = 1.0;
  const MAX_ZOOM = 5.0;
  const ZOOM_STEP = 0.5;

  const zoomStates = {
    south: { zoom: 1.0, panX: 0, panY: 0 },
    global: { zoom: 1.0, panX: 0, panY: 0 },
    north: { zoom: 1.0, panX: 0, panY: 0 }
  };

  let isPanning = false;
  let hasMoved = false;
  let panStartX = 0;
  let panStartY = 0;
  let initialPanX = 0;
  let initialPanY = 0;

  function applyZoomTransform(projection, isDragging = false) {
    const proj = projection || activeProjection;
    const state = zoomStates[proj];
    if (!state) return;

    let el = null;
    if (proj === "south") el = document.getElementById("south-polar-map-disc");
    else if (proj === "global") el = document.getElementById("rect-map-canvas-mock");
    else if (proj === "north") el = document.getElementById("north-polar-map-disc");

    if (el) {
      if (state.zoom <= 1.001) {
        state.zoom = 1.0;
        state.panX = 0;
        state.panY = 0;
        el.style.transform = "";
        el.classList.remove("is-zoomed", "is-dragging");
      } else {
        // Clamp panning so the map remains anchored
        const baseW = el.offsetWidth || 300;
        const baseH = el.offsetHeight || 300;
        const maxPanX = (baseW * (state.zoom - 1)) / 2 + 60;
        const maxPanY = (baseH * (state.zoom - 1)) / 2 + 60;
        state.panX = Math.max(-maxPanX, Math.min(maxPanX, state.panX));
        state.panY = Math.max(-maxPanY, Math.min(maxPanY, state.panY));

        el.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
        el.classList.add("is-zoomed");
        el.classList.toggle("is-dragging", isDragging);
      }
    }

    // Update Header Zoom Controls UI
    const badge = document.getElementById("map-zoom-display");
    const btnIn = document.getElementById("btn-map-zoom-in");
    const btnOut = document.getElementById("btn-map-zoom-out");

    if (badge) badge.textContent = `${state.zoom.toFixed(1)}×`;
    if (btnOut) btnOut.disabled = (state.zoom <= MIN_ZOOM);
    if (btnIn) btnIn.disabled = (state.zoom >= MAX_ZOOM);
  }

  function zoomIn() {
    const state = zoomStates[activeProjection];
    if (state && state.zoom < MAX_ZOOM) {
      state.zoom = Math.min(MAX_ZOOM, Math.round((state.zoom + ZOOM_STEP) * 10) / 10);
      applyZoomTransform(activeProjection);
    }
  }

  function zoomOut() {
    const state = zoomStates[activeProjection];
    if (state && state.zoom > MIN_ZOOM) {
      state.zoom = Math.max(MIN_ZOOM, Math.round((state.zoom - ZOOM_STEP) * 10) / 10);
      if (state.zoom <= 1.001) {
        state.panX = 0;
        state.panY = 0;
      }
      applyZoomTransform(activeProjection);
    }
  }

  function resetZoom() {
    const state = zoomStates[activeProjection];
    if (state) {
      state.zoom = 1.0;
      state.panX = 0;
      state.panY = 0;
      applyZoomTransform(activeProjection);
    }
  }

  function initMapPanEvents() {
    const mapCenterStage = document.getElementById("map-center-stage");
    if (!mapCenterStage) return;

    mapCenterStage.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return; // Only drag with left mouse button
      const state = zoomStates[activeProjection];
      if (!state || state.zoom <= 1.0) return;

      isPanning = true;
      hasMoved = false;
      panStartX = e.clientX;
      panStartY = e.clientY;
      initialPanX = state.panX;
      initialPanY = state.panY;
    });

    window.addEventListener("mousemove", (e) => {
      if (!isPanning) return;
      const state = zoomStates[activeProjection];
      if (!state) return;

      const dx = e.clientX - panStartX;
      const dy = e.clientY - panStartY;
      if (Math.hypot(dx, dy) > 4) {
        hasMoved = true;
        state.panX = initialPanX + dx;
        state.panY = initialPanY + dy;
        applyZoomTransform(activeProjection, true);
      }
    });

    window.addEventListener("mouseup", () => {
      if (isPanning) {
        isPanning = false;
        applyZoomTransform(activeProjection, false);
      }
    });

    // Mouse Wheel Zooming on 2D map viewport
    mapCenterStage.addEventListener("wheel", (e) => {
      e.preventDefault();
      const state = zoomStates[activeProjection];
      if (!state) return;

      const wheelStep = 0.25;
      if (e.deltaY < 0) {
        state.zoom = Math.min(MAX_ZOOM, Math.round((state.zoom + wheelStep) * 100) / 100);
      } else {
        state.zoom = Math.max(MIN_ZOOM, Math.round((state.zoom - wheelStep) * 100) / 100);
      }
      applyZoomTransform(activeProjection);
    }, { passive: false });

    // Keyboard Shortcuts: + to zoom in, - to zoom out, 0 / R to reset
    window.addEventListener("keydown", (e) => {
      const drawerToggle = document.getElementById("toggle-bottom-map");
      if (!drawerToggle || !drawerToggle.checked) return;
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable)) return;

      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomIn();
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomOut();
      } else if (e.key === "0" || e.key === "r" || e.key === "R") {
        e.preventDefault();
        resetZoom();
      }
    });
  }

  // ==========================================================================
  // 3. INITIALIZATION
  // ==========================================================================
  function initMap2D() {
    bindHeaderControls();
    initMapPanEvents();
    bindViewportClickListeners();
    loadPreferences();
    initMeasurementOverlays();

    // EventBus Subscription: External site:marked events
    if (window.eventBus) {
      window.eventBus.on("site:marked", (data) => {
        lastMarkedSite = data;
        renderMarkers(data);
        updateTelemetryRightWing(data);
      });

      window.eventBus.on("cards:synced", data => {
        if (!data || !Array.isArray(data.cards)) return;
        candidateSites = data.cards.filter(site =>
          Number.isFinite(site.lat) && Number.isFinite(site.lon)
        );
        if (window.SiteMeasurement) {
          window.SiteMeasurement.syncSites(candidateSites);
        }
        renderCandidateMarkers();
      });

      window.eventBus.on("site-measurement:selection-changed", data => {
        renderCandidateMarkers();
        updateDistanceBadge(
          data && Array.isArray(data.sites) ? data.sites : [],
          window.SiteMeasurement ? window.SiteMeasurement.getMeasurement() : null
        );
      });

      window.eventBus.on("site-measurement:changed", measurement => {
        renderMeasurementOverlays(measurement);
        updateDistanceBadge(
          window.SiteMeasurement ? window.SiteMeasurement.getSelectedSites() : [],
          measurement
        );
      });

      // Texture resolution synchronizer (updates 2D basemap sharpness & header pill)
      window.eventBus.on("texture:resolution", (data) => {
        if (data && data.resolution) {
          const flatCanvas = document.getElementById("rect-map-canvas-mock");
          const clarityBadge = document.getElementById("map-clarity-badge");
          if (flatCanvas) {
            flatCanvas.classList.toggle("res-4k", data.resolution === "4k");
          }
          if (clarityBadge) {
            clarityBadge.innerHTML = `✨ <strong>${data.resolution.toUpperCase()} ${data.resolution === "8k" ? "UHD" : "HD"}</strong>`;
          }
        }
      });
    }

    if (window.ComparisonCards) {
      candidateSites = window.ComparisonCards.getMarkedSites();
      if (window.SiteMeasurement) {
        window.SiteMeasurement.syncSites(candidateSites);
      }
    }

    // Initial render
    applyPresentationState();
    updateTelemetryRightWing(lastMarkedSite);
    renderMarkers(lastMarkedSite);
    renderMeasurementOverlays(
      window.SiteMeasurement ? window.SiteMeasurement.getMeasurement() : null
    );
    updateDistanceBadge(
      window.SiteMeasurement ? window.SiteMeasurement.getSelectedSites() : [],
      window.SiteMeasurement ? window.SiteMeasurement.getMeasurement() : null
    );
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

    // Zoom In, Zoom Out, Reset Controls
    const btnZoomIn = document.getElementById("btn-map-zoom-in");
    if (btnZoomIn) btnZoomIn.addEventListener("click", zoomIn);

    const btnZoomOut = document.getElementById("btn-map-zoom-out");
    if (btnZoomOut) btnZoomOut.addEventListener("click", zoomOut);

    const btnZoomReset = document.getElementById("btn-map-zoom-reset");
    if (btnZoomReset) btnZoomReset.addEventListener("click", resetZoom);
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
    applyZoomTransform(activeProjection);

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
      btnMaximize.innerHTML = isMaximized
        ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="10" y1="14" x2="3" y2="21"/></svg>'
        : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
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
        if (hasMoved) {
          hasMoved = false;
          return;
        }
        const rect = northDisc.getBoundingClientRect();
        const u = (e.clientX - rect.left) / rect.width;
        const v = (e.clientY - rect.top) / rect.height;
        const baseSize = northDisc.offsetWidth || 290;
        const x = u * baseSize;
        const y = v * baseSize;
        const cx = baseSize / 2;
        const cy = baseSize / 2;
        const r = (baseSize / 2) - 8;

        const coord = window.CoordMath.polarNorthToLatLon(x, y, cx, cy, r, 70.0);
        if (coord) {
          handlePointSelected(coord, "map-2d-north-polar");
        }
      });
    }

    // South Polar Disc (70°S – 90°S)
    if (southDisc) {
      southDisc.addEventListener("click", (e) => {
        if (hasMoved) {
          hasMoved = false;
          return;
        }
        const rect = southDisc.getBoundingClientRect();
        const u = (e.clientX - rect.left) / rect.width;
        const v = (e.clientY - rect.top) / rect.height;
        const baseSize = southDisc.offsetWidth || 290;
        const x = u * baseSize;
        const y = v * baseSize;
        const cx = baseSize / 2;
        const cy = baseSize / 2;
        const r = (baseSize / 2) - 8;

        const coord = window.CoordMath.polarSouthToLatLon(x, y, cx, cy, r, -70.0);
        if (coord) {
          handlePointSelected(coord, "map-2d-south-polar");
        }
      });
    }

    // Center Global Equirectangular Flat Map
    if (rectMap) {
      rectMap.addEventListener("click", (e) => {
        if (hasMoved) {
          hasMoved = false;
          return;
        }
        const rect = rectMap.getBoundingClientRect();
        const u = (e.clientX - rect.left) / rect.width;
        const v = (e.clientY - rect.top) / rect.height;
        if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
          const lon = u * 360 - 180;
          const lat = 90 - v * 180;
          const normLon = (lon + 360) % 360;
          handlePointSelected({ lat, lon: normLon }, "map-2d-rect");
        }
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

    lastMarkedSite = siteData;
    renderMarkers(siteData);
    updateTelemetryRightWing(siteData);

    if (window.eventBus) {
      window.eventBus.emit("site:marked", siteData);
    }
  }

  function updateDistanceBadge(sites, measurement) {
    const distEl = document.getElementById("map-distance-display");
    if (!distEl) return;

    if (measurement) {
      distEl.textContent = `📏 ${measurement.distanceKm.toFixed(1)} km`;
      distEl.title = `Surface distance: ${measurement.sites[0].name} to ${measurement.sites[1].name}`;
    } else if (sites.length === 2) {
      distEl.textContent = "📏 Pair ready";
      distEl.title = "Right-click either selected site and choose Measure distance.";
    } else if (sites.length === 1) {
      distEl.textContent = "📏 1/2 selected";
      distEl.title = "Shift + right-click another marked site to complete the pair.";
    } else {
      distEl.textContent = "📏 Select 2 sites";
      distEl.title = "Shift + right-click two marked sites, then right-click either and choose Measure distance.";
    }
  }

  // ==========================================================================
  // 9. MULTI-PROJECTION MARKER RENDERER
  // ==========================================================================
  function renderMarkers(data) {
    if (data) {
      // 1. Render on North Pole Disc (lat >= 70°N)
      const northDisc = document.getElementById("north-polar-map-disc");
      const northPin = document.getElementById("north-polar-active-pin");
      if (northDisc && northPin) {
        const baseW = northDisc.offsetWidth || 290;
        const cx = baseW / 2;
        const cy = baseW / 2;
        const r = (baseW / 2) - 8;

        const numLabel = data.number ? `#${data.number} ` : "";
        if (data.lat >= 70.0) {
          const pos = window.CoordMath.latLonToPolarNorth(data.lat, data.lon, cx, cy, r, 70.0);
          northPin.style.display = "block";
          northPin.style.left = `${pos.x}px`;
          northPin.style.top = `${pos.y}px`;
          northPin.innerHTML = `<span class="marker-beacon"></span><span class="marker-text">${numLabel}${data.name}</span>`;
        } else {
          northPin.style.display = "none";
        }
      }

      // 2. Render on South Pole Disc (lat <= -70°S)
      const southDisc = document.getElementById("south-polar-map-disc");
      const southPin = document.getElementById("south-polar-active-pin");
      if (southDisc && southPin) {
        const baseW = southDisc.offsetWidth || 290;
        const cx = baseW / 2;
        const cy = baseW / 2;
        const r = (baseW / 2) - 8;

        const numLabel = data.number ? `#${data.number} ` : "";
        if (data.lat <= -70.0) {
          const pos = window.CoordMath.latLonToPolarSouth(data.lat, data.lon, cx, cy, r, -70.0);
          southPin.style.display = "block";
          southPin.style.left = `${pos.x}px`;
          southPin.style.top = `${pos.y}px`;
          southPin.innerHTML = `<span class="marker-beacon"></span><span class="marker-text">${numLabel}${data.name}</span>`;
        } else {
          southPin.style.display = "none";
        }
      }

      // 3. Render on Global Flat Map
      const rectMap = document.getElementById("rect-map-canvas-mock");
      const rectPin = document.getElementById("rect-active-pin");
      if (rectMap && rectPin) {
        const pos = window.CoordMath.latLonToRect(
          data.lat, data.lon, rectMap.offsetWidth || 580, rectMap.offsetHeight || 290
        );
        rectPin.style.left = `${(pos.x / (rectMap.offsetWidth || 580) * 100).toFixed(2)}%`;
        rectPin.style.top = `${(pos.y / (rectMap.offsetHeight || 290) * 100).toFixed(2)}%`;
      }
    }

    renderCandidateMarkers();
    renderMeasurementOverlays(
      window.SiteMeasurement ? window.SiteMeasurement.getMeasurement() : null
    );
  }

  function initMeasurementOverlays() {
    const surfaces = [
      ["north", "north-polar-map-disc"],
      ["global", "rect-map-canvas-mock"],
      ["south", "south-polar-map-disc"]
    ];

    surfaces.forEach(([projection, id]) => {
      const surface = document.getElementById(id);
      if (!surface) return;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.classList.add("site-measurement-svg");
      svg.setAttribute("aria-hidden", "true");
      surface.appendChild(svg);
      measurementSvgs.set(projection, { surface, svg });
    });
  }

  function renderCandidateMarkers() {
    const surfaces = [
      ["north", "north-polar-map-disc"],
      ["global", "rect-map-canvas-mock"],
      ["south", "south-polar-map-disc"]
    ];
    const selectedSites = window.SiteMeasurement
      ? window.SiteMeasurement.getSelectedSites()
      : [];

    surfaces.forEach(([projection, id]) => {
      const surface = document.getElementById(id);
      if (!surface) return;
      surface.querySelectorAll(".site-measure-point").forEach(marker => marker.remove());

      const width = surface.offsetWidth || (projection === "global" ? 580 : 290);
      const height = surface.offsetHeight || (projection === "global" ? 290 : width);
      const radius = width / 2 - 8;
      const center = width / 2;

      candidateSites.forEach((site, index) => {
        const point = projection === "global"
          ? window.CoordMath.latLonToRect(site.lat, site.lon, width, height)
          : projection === "north"
            ? window.CoordMath.latLonToPolarNorth(site.lat, site.lon, center, center, radius, 70)
            : window.CoordMath.latLonToPolarSouth(site.lat, site.lon, center, center, radius, -70);
        if (point.visible === false) return;

        const marker = document.createElement("button");
        marker.type = "button";
        marker.className = "site-measure-point";
        marker.dataset.siteId = site.siteId || `${site.lat.toFixed(5)}:${site.lon.toFixed(5)}`;
        marker.textContent = String(site.number || index + 1);
        marker.title = site.name || `Site ${index + 1}`;
        marker.setAttribute("aria-label", marker.title);
        marker.style.left = `${point.x}px`;
        marker.style.top = `${point.y}px`;
        if (window.SiteMeasurement && window.SiteMeasurement.isSelected(site)) {
          marker.classList.add("is-measure-selected");
        }
        if (lastMarkedSite &&
            Math.abs(lastMarkedSite.lat - site.lat) < 0.02 &&
            Math.abs((lastMarkedSite.lon - site.lon + 540) % 360 - 180) < 0.02) {
          marker.classList.add("is-active");
        }
        marker.addEventListener("click", event => event.stopPropagation());
        marker.addEventListener("contextmenu", event => {
          if (window.SiteMeasurement) {
            window.SiteMeasurement.handleContextMenu(event, site);
          }
        });
        surface.appendChild(marker);
      });
    });
  }

  function projectMeasurementPoint(projection, point, width, height) {
    if (projection === "global") {
      return window.CoordMath.latLonToRect(point.lat, point.lon, width, height);
    }
    const center = width / 2;
    const radius = width / 2 - 8;
    const projected = projection === "north"
      ? window.CoordMath.latLonToPolarNorth(point.lat, point.lon, center, center, radius, 70)
      : window.CoordMath.latLonToPolarSouth(point.lat, point.lon, center, center, radius, -70);
    return projected.visible ? projected : null;
  }

  function createMeasurementSegments(projection, path, width, height) {
    const segments = [];
    let current = [];

    path.forEach(point => {
      const projected = projectMeasurementPoint(projection, point, width, height);
      if (!projected) {
        if (current.length > 1) segments.push(current);
        current = [];
        return;
      }

      if (projection === "global" && current.length) {
        const previous = current[current.length - 1];
        if (Math.abs(projected.x - previous.x) > width / 2) {
          const wrapsRight = previous.x > projected.x;
          const unwrappedX = projected.x + (wrapsRight ? width : -width);
          const edgeX = wrapsRight ? width : 0;
          const fraction = (edgeX - previous.x) / (unwrappedX - previous.x);
          const edgeY = previous.y + (projected.y - previous.y) * fraction;
          current.push({ x: edgeX, y: edgeY });
          if (current.length > 1) segments.push(current);
          current = [{ x: wrapsRight ? 0 : width, y: edgeY }, projected];
          return;
        }
      }

      current.push(projected);
    });

    if (current.length > 1) segments.push(current);
    return segments;
  }

  function renderMeasurementOverlays(measurement) {
    measurementSvgs.forEach(({ surface, svg }, projection) => {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      if (!measurement) return;

      const width = surface.offsetWidth || (projection === "global" ? 580 : 290);
      const height = surface.offsetHeight || (projection === "global" ? 290 : width);
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      const namespace = "http://www.w3.org/2000/svg";
      const segments = createMeasurementSegments(projection, measurement.path, width, height);

      segments.forEach(segment => {
        const line = document.createElementNS(namespace, "path");
        const pathData = segment.map((point, index) =>
          `${index ? "L" : "M"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
        ).join(" ");
        line.setAttribute("d", pathData);
        line.setAttribute("fill", "none");
        line.setAttribute("stroke", "#299cff");
        line.setAttribute("stroke-width", "2.5");
        line.setAttribute("stroke-linecap", "round");
        line.setAttribute("stroke-linejoin", "round");
        line.setAttribute("vector-effect", "non-scaling-stroke");
        svg.appendChild(line);
      });

      const midpoint = measurement.path[Math.floor(measurement.path.length / 2)];
      const labelPoint = projectMeasurementPoint(projection, midpoint, width, height);
      if (labelPoint) {
        const label = `${measurement.distanceKm.toFixed(1)} km`;
        const labelWidth = label.length * 7 + 14;
        const labelY = labelPoint.y < 27 ? labelPoint.y + 26 : labelPoint.y - 12;
        const group = document.createElementNS(namespace, "g");
        const background = document.createElementNS(namespace, "rect");
        background.setAttribute("x", String(labelPoint.x - labelWidth / 2));
        background.setAttribute("y", String(labelY - 14));
        background.setAttribute("width", String(labelWidth));
        background.setAttribute("height", "19");
        background.setAttribute("rx", "4");
        background.setAttribute("fill", "rgba(8, 24, 42, 0.92)");
        background.setAttribute("stroke", "#299cff");
        const text = document.createElementNS(namespace, "text");
        text.setAttribute("x", String(labelPoint.x));
        text.setAttribute("y", String(labelY));
        text.setAttribute("fill", "#58adff");
        text.setAttribute("font-size", "12");
        text.setAttribute("font-family", "monospace");
        text.setAttribute("font-weight", "700");
        text.setAttribute("text-anchor", "middle");
        text.textContent = label;
        group.append(background, text);
        svg.appendChild(group);
      }
    });
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
