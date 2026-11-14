/**
 * ==============================================================================
 * Lunar Landing Site Navigator - High-Resolution Site Inspector Controller
 * File: components/inspection_modal/inspection_modal.js
 * Role: Manages high-resolution analytical viewports, interactive crosshair
 *       cursor telemetry, draggable HUD window kinematics, and EventBus hooks.
 * ==============================================================================
 */

(function() {
  // Component State
  let isOpen = false;
  let presentationMode = "modal"; // 'modal' (centered) | 'hud' (draggable window)
  let activeSiteKey = "shackleton";
  let activeTab = "horizon";
  let activeSiteData = null;
  let timelineProgress = 0; // 0 - 100%

  // Dragging state for Floating HUD mode
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  /**
   * Reference datasets for candidate sites in high-resolution mode.
   */
  const INSPECTOR_DATA = {
    shackleton: {
      tag: "Artemis III Candidate",
      name: "Peak Near Shackleton",
      coords: "89.6° S · 129.2° E · +1,240 m",
      lat: -89.6,
      lon: 129.2,
      elevationMeters: "+1,240 m",
      skyline: {
        svgPath: "M0,125 L35,115 L70,95 L110,60 L145,118 L195,128 L245,95 L295,75 L330,50 L365,110 L410,128 L460,105 L500,82 L520,125 L520,200 L0,200 Z",
        sunAz: 162,
        sunEl: 1.4,
        earthAz: 259,
        earthEl: 3.1,
        clearance: "+2.4° above eastern rim peaks",
        statusPill: "✓ Line of Sight Maintained",
        pillClass: "pill-ok"
      },
      slope: {
        svgPath: "M0,110 Q140,105 240,75 T420,165 T520,185",
        touchdownX: 240,
        touchdownY: 75,
        slopeVal: "4.2°",
        slopeStatus: "Safe (< 5°)",
        distIce: "1.8 km",
        hazardDesc: "18.4° maximum gradient on PSR descent flank"
      },
      solar: {
        daylightPct: "88% Daylight (304 hrs)",
        peakEl: "+1.9° (Dec 16, 2026)",
        continuousStay: "144 hrs uninterrupted",
        shadowIngress: "112h 40m remaining"
      },
      comms: {
        earthElev: "+3.1° (Stable)",
        rfMargin: "+6.2 dB (High Gain Antenna)",
        dsnLock: "Canberra / Goldstone Active",
        librationBox: "±6.7° Lat / ±7.9° Lon"
      }
    },

    ridge: {
      tag: "CLPS IM-2 Target",
      name: "Connecting Ridge",
      coords: "89.4° S · 222.6° E · +980 m",
      lat: -89.4,
      lon: 222.6,
      elevationMeters: "+980 m",
      skyline: {
        svgPath: "M0,118 L50,110 L100,95 L150,85 L200,105 L260,90 L310,70 L355,80 L405,115 L455,95 L490,85 L520,118 L520,200 L0,200 Z",
        sunAz: 138,
        sunEl: 0.8,
        earthAz: 242,
        earthEl: 1.9,
        clearance: "+0.6° grazing over southern saddle",
        statusPill: "✓ Grazing Line of Sight",
        pillClass: "pill-warn"
      },
      slope: {
        svgPath: "M0,105 Q140,95 240,85 T420,140 T520,165",
        touchdownX: 240,
        touchdownY: 85,
        slopeVal: "5.8°",
        slopeStatus: "Moderate (5° - 8°)",
        distIce: "2.4 km",
        hazardDesc: "11.2° flank slope near de Gerlache rim"
      },
      solar: {
        daylightPct: "68% Daylight (235 hrs)",
        peakEl: "+1.4° (Dec 14, 2026)",
        continuousStay: "96 hrs uninterrupted",
        shadowIngress: "74h 10m remaining"
      },
      comms: {
        earthElev: "+1.9° (Low Grazing)",
        rfMargin: "+4.1 dB (Nominal)",
        dsnLock: "Goldstone Active",
        librationBox: "Diffraction risk when libration < -5.0°"
      }
    },

    malapert: {
      tag: "Artemis III Candidate",
      name: "Malapert Massif",
      coords: "85.9° S · 2.9° E · +5,020 m",
      lat: -85.9,
      lon: 2.9,
      elevationMeters: "+5,020 m",
      skyline: {
        svgPath: "M0,145 L60,135 L120,115 L160,50 L200,30 L235,65 L290,105 L350,120 L400,85 L450,60 L490,115 L520,145 L520,200 L0,200 Z",
        sunAz: 210,
        sunEl: -0.2,
        earthAz: 182,
        earthEl: 5.4,
        clearance: "+4.8° superior horizon clearance",
        statusPill: "✓ Superior Earth Comms Vantage",
        pillClass: "pill-ok"
      },
      slope: {
        svgPath: "M0,70 Q140,75 240,105 T420,170 T520,185",
        touchdownX: 240,
        touchdownY: 105,
        slopeVal: "8.1°",
        slopeStatus: "Steep / Hazardous (> 8°)",
        distIce: "4.8 km",
        hazardDesc: "22.6° massif escarpment to north"
      },
      solar: {
        daylightPct: "52% Daylight (180 hrs)",
        peakEl: "+2.6° (Dec 18, 2026)",
        continuousStay: "72 hrs (Early cycle shadow)",
        shadowIngress: "Sunrise in 28h 15m"
      },
      comms: {
        earthElev: "+5.4° (High Elevation)",
        rfMargin: "+9.8 dB (High SNR)",
        dsnLock: "Canberra / Madrid / Goldstone",
        librationBox: "Continuous line-of-sight across 100% of cycle"
      }
    }
  };

  /**
   * Main component initialization.
   */
  function initInspector() {
    const overlay = document.getElementById("site-inspector-overlay");
    const dialog = document.getElementById("site-inspector-dialog");
    const dragHandle = document.getElementById("inspector-drag-handle");
    const closeBtn = document.getElementById("btn-inspector-close");
    const modeToggleBtn = document.getElementById("btn-inspector-mode-toggle");
    const tabBtns = document.querySelectorAll(".inspector-tab-btn");
    const copyCoordsBtn = document.getElementById("btn-inspector-copy-coords");
    const focus3dBtn = document.getElementById("btn-inspector-focus-3d");

    // Read stored inspect mode preference if set
    try {
      const savedSettings = localStorage.getItem("spaceapp_mission_settings");
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.inspectMode) {
          presentationMode = parsed.inspectMode;
        }
      }
    } catch (e) {
      console.warn("[SiteInspector] Could not read settings:", e);
    }

    applyPresentationMode(presentationMode);

    // 1. Close Button Listener
    if (closeBtn) {
      closeBtn.addEventListener("click", closeInspector);
    }

    // 2. Click on dim backdrop to close (only in modal mode)
    if (overlay) {
      overlay.addEventListener("click", (e) => {
        if (presentationMode === "modal" && e.target === overlay) {
          closeInspector();
        }
      });
    }

    // 3. Mode Toggle Button (Modal vs Floating HUD)
    if (modeToggleBtn) {
      modeToggleBtn.addEventListener("click", () => {
        const nextMode = presentationMode === "modal" ? "hud" : "modal";
        applyPresentationMode(nextMode);

        // Update settings in localStorage
        try {
          const raw = localStorage.getItem("spaceapp_mission_settings");
          let settings = raw ? JSON.parse(raw) : {};
          settings.inspectMode = nextMode;
          localStorage.setItem("spaceapp_mission_settings", JSON.stringify(settings));
        } catch (e) {}

        // Broadcast change
        if (window.eventBus) {
          window.eventBus.emit("inspectmode:changed", { mode: nextMode });
        }
      });
    }

    // 4. View Switcher Tabs Listener
    tabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        tabBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        activeTab = btn.dataset.tab;
        renderActiveView();
      });
    });

    // 5. Copy Coordinates Button
    if (copyCoordsBtn) {
      copyCoordsBtn.addEventListener("click", () => {
        const site = getInspectorSite(activeSiteKey);
        if (site && navigator.clipboard) {
          navigator.clipboard.writeText(`${site.lat}, ${site.lon}`).then(() => {
            const originalText = copyCoordsBtn.textContent;
            copyCoordsBtn.textContent = "✓ Copied!";
            setTimeout(() => { copyCoordsBtn.textContent = originalText; }, 1800);
          });
        }
      });
    }

    // 6. Focus 3D Viewport Button
    if (focus3dBtn) {
      focus3dBtn.addEventListener("click", () => {
        const site = getInspectorSite(activeSiteKey);
        if (site && window.eventBus) {
          window.eventBus.emit("site:marked", {
            lat: site.lat,
            lon: site.lon,
            name: site.name,
            source: "inspector-focus",
            focus: true
          });
        }
      });
    }

    // 7. Draggable Header Mechanics (for Floating HUD mode)
    if (dragHandle && dialog) {
      dragHandle.addEventListener("mousedown", (e) => {
        if (presentationMode !== "hud") return;
        if (e.target.closest("button")) return; // Don't drag when clicking buttons

        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;

        const rect = dialog.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;

        document.addEventListener("mousemove", onDragMove);
        document.addEventListener("mouseup", onDragEnd);
      });
    }

    function onDragMove(e) {
      if (!isDragging || !dialog) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;

      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      // Clamping to screen boundaries
      const maxLeft = window.innerWidth - dialog.offsetWidth - 10;
      const maxTop = window.innerHeight - dialog.offsetHeight - 10;
      newLeft = Math.max(10, Math.min(maxLeft, newLeft));
      newTop = Math.max(50, Math.min(maxTop, newTop));

      dialog.style.left = `${newLeft}px`;
      dialog.style.top = `${newTop}px`;
    }

    function onDragEnd() {
      isDragging = false;
      document.removeEventListener("mousemove", onDragMove);
      document.removeEventListener("mouseup", onDragEnd);
    }

    // 8. EventBus Subscriptions
    if (window.eventBus) {
      // Subscribed to card grow/inspect trigger
      window.eventBus.on("card:inspect", (data) => {
        openInspector(data.siteKey || "shackleton", data.tab || "horizon");
      });

      // Subscribed to live timeline scrubber
      window.eventBus.on("time:changed", (data) => {
        timelineProgress = (data.sliderValue || 0) / 100;
        updateLiveSunTracker();
      });

      // Subscribed to settings modal inspect mode changes
      window.eventBus.on("inspectmode:changed", (data) => {
        if (data && data.mode) {
          applyPresentationMode(data.mode);
        }
      });
    }
  }

  /**
   * Applies the presentation mode ('modal' vs 'hud').
   */
  function applyPresentationMode(mode) {
    presentationMode = mode;
    const overlay = document.getElementById("site-inspector-overlay");
    const dialog = document.getElementById("site-inspector-dialog");
    const modeLabel = document.getElementById("inspector-mode-label");
    const modeIcon = document.getElementById("inspector-mode-icon");

    if (overlay) {
      overlay.classList.remove("mode-modal", "mode-hud");
      overlay.classList.add(`mode-${mode}`);
    }

    if (dialog && mode === "modal") {
      // Reset inline drag positions when returning to centered modal
      dialog.style.left = "";
      dialog.style.top = "";
    }

    if (modeLabel && modeIcon) {
      if (mode === "modal") {
        modeIcon.textContent = "◰";
        modeLabel.textContent = "Float HUD";
      } else {
        modeIcon.textContent = "▣";
        modeLabel.textContent = "Dock Center";
      }
    }
  }

  /**
   * Resolves site dataset using authentic NASA LunarPhysics data when available.
   */
  function getInspectorSite(siteKey) {
    if (window.LunarPhysics) {
      const raw = window.LunarPhysics.findSite(siteKey);
      if (raw) {
        const hourIdx = window.LunarPhysics.sliderToHourIndex(timelineProgress);
        const evalData = window.LunarPhysics.evaluateAtHour(raw, hourIdx);
        return {
          tag: raw.type,
          name: raw.name,
          coords: `${Math.abs(raw.coordinates.lat).toFixed(2)}° ${raw.coordinates.lat < 0 ? 'S' : 'N'} · ${raw.coordinates.lon.toFixed(1)}° E · +${raw.coordinates.elevation_m.toLocaleString()} m`,
          lat: raw.coordinates.lat,
          lon: raw.coordinates.lon,
          elevationMeters: `+${raw.coordinates.elevation_m.toLocaleString()} m`,
          skyline: {
            svgPath: raw.terrain.skyline_svg_path,
            sunAz: evalData ? evalData.sunAz : 180,
            sunEl: evalData ? evalData.sunEl : 1.2,
            earthAz: evalData ? evalData.earthAz : 240,
            earthEl: evalData ? evalData.earthEl : 3.2,
            clearance: evalData && evalData.isSunVis ? `+${evalData.sunEl}° above terrain horizon` : "Below terrain silhouette (Shadow)",
            statusPill: evalData && evalData.isSunVis ? "✓ Line of Sight Maintained" : "✗ Topographic Shadow",
            pillClass: evalData && evalData.isSunVis ? "pill-ok" : "pill-warn"
          },
          slope: {
            svgPath: raw.terrain.slope_svg_path,
            touchdownX: 240,
            touchdownY: 75,
            slopeVal: `${raw.terrain.slope_touchdown_deg}°`,
            slopeStatus: `${raw.terrain.slope_status} (< ${raw.terrain.slope_touchdown_deg < 5 ? '5°' : '8°'})`,
            distIce: `${raw.terrain.dist_to_psr_km} km`,
            hazardDesc: `${raw.terrain.max_gradient_deg}° max gradient (${raw.terrain.psr_name})`
          },
          solar: {
            daylightPct: `${Math.round(raw.summary_metrics.daylight_pct)}% Daylight`,
            peakEl: `+${(evalData ? evalData.sunEl + 1.2 : 2.0).toFixed(1)}° (Solar Transit)`,
            continuousStay: `${raw.summary_metrics.continuous_sunlight_max_hrs} hrs continuous`,
            shadowIngress: evalData ? `${evalData.nextSunsetHrs}h remaining` : "N/A"
          },
          comms: {
            earthElev: `+${evalData ? evalData.earthEl : 3.0}° (${evalData && evalData.isEarthVis ? 'Stable' : 'Occluded'})`,
            rfMargin: `+${raw.summary_metrics.rf_margin_db} dB`,
            dsnLock: "Canberra / Goldstone Active",
            librationBox: "±6.7° Lat / ±7.9° Lon"
          }
        };
      }
    }
    return INSPECTOR_DATA[siteKey] || INSPECTOR_DATA.shackleton;
  }

  /**
   * Opens the inspector for a specific site and view tab.
   */
  function openInspector(siteKey, tab) {
    activeSiteKey = siteKey || "shackleton";
    activeTab = tab || "horizon";

    // Proactively query FastAPI backend /api/sites/{site_id} endpoint
    if (window.LunarPhysics && window.LunarPhysics.fetchSiteDetail) {
      window.LunarPhysics.fetchSiteDetail(activeSiteKey).then(() => {
        renderActiveView();
      });
    }

    const site = getInspectorSite(activeSiteKey);

    // Update header fields
    const tagEl = document.getElementById("inspector-site-tag");
    const nameEl = document.getElementById("inspector-site-name");
    const coordsEl = document.getElementById("inspector-site-coords");

    if (tagEl) tagEl.textContent = site.tag;
    if (nameEl) nameEl.textContent = site.name;
    if (coordsEl) coordsEl.textContent = site.coords;

    // Synchronize active tab button
    const tabBtns = document.querySelectorAll(".inspector-tab-btn");
    tabBtns.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === activeTab);
    });

    // Render active visualization
    renderActiveView();

    // Show dialog
    const overlay = document.getElementById("site-inspector-overlay");
    if (overlay) {
      overlay.style.display = presentationMode === "modal" ? "flex" : "block";
      void overlay.offsetWidth; // Force reflow
      overlay.classList.add("active");
    }

    isOpen = true;
    console.log(`[SiteInspector] Opened inspection workspace for ${site.name} (${activeTab})`);
  }

  /**
   * Closes the inspector.
   */
  function closeInspector() {
    const overlay = document.getElementById("site-inspector-overlay");
    if (overlay) {
      overlay.classList.remove("active");
      setTimeout(() => {
        overlay.style.display = "none";
      }, 250);
    }
    isOpen = false;
  }

  /**
   * Renders the stage content based on `activeTab`.
   */
  function renderActiveView() {
    const stage = document.getElementById("inspector-stage");
    const site = getInspectorSite(activeSiteKey);
    if (!stage || !site) return;

    if (activeTab === "horizon") {
      stage.innerHTML = renderSkylineView(site);
      attachCrosshairEvents();
      updateLiveSunTracker();
    } else if (activeTab === "slope") {
      stage.innerHTML = renderSlopeView(site);
    } else if (activeTab === "solar") {
      stage.innerHTML = renderSolarView(site);
    } else if (activeTab === "comms") {
      stage.innerHTML = renderCommsView(site);
    }

    // Update footer telemetry
    const pill = document.getElementById("inspector-los-pill");
    const detail = document.getElementById("inspector-clearance-detail");
    if (pill) {
      pill.textContent = site.skyline.statusPill;
      pill.className = `telemetry-pill ${site.skyline.pillClass}`;
    }
    if (detail) {
      detail.innerHTML = `Terrain clearance: <strong>${site.skyline.clearance}</strong>`;
    }
  }

  /**
   * Generates High-Resolution 360° Skyline HTML.
   */
  function renderSkylineView(site) {
    const h = site.skyline;
    // Match tracker positions to the chart axes: 0–360° azimuth and +15° to -5° elevation.
    const sunLeftPct = (h.sunAz / 360) * 100;
    const earthLeftPct = (h.earthAz / 360) * 100;
    const sunTopPct = Math.max(4, Math.min(96, 72.5 - (h.sunEl * 4.5)));
    const earthTopPct = Math.max(4, Math.min(96, 72.5 - (h.earthEl * 4.5)));
    return `
      <div class="inspector-axis-title-y">Elevation (°)</div>
      <div class="inspector-skyline-wrap" id="inspector-skyline-wrap">
        <!-- Vertical Elevation Y-Axis -->
        <div class="inspector-y-axis">
          <span>+15°</span>
          <span>+10°</span>
          <span>+5°</span>
          <span style="color:var(--accent-sand,#c99e52);">0° (Horizon)</span>
          <span>-5°</span>
        </div>

        <!-- SVG Skyline Silhouette + Zero Line -->
        <svg viewBox="0 0 520 200" preserveAspectRatio="none">
          <!-- Background Grid Lines -->
          <line x1="0" y1="25" x2="520" y2="25" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2 4" />
          <line x1="0" y1="65" x2="520" y2="65" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2 4" />
          <line x1="0" y1="105" x2="520" y2="105" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2 4" />
          <line x1="0" y1="145" x2="520" y2="145" stroke="rgba(201,158,82,0.3)" stroke-dasharray="4 4" />
          <line x1="0" y1="185" x2="520" y2="185" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2 4" />
          <!-- Topographic Skyline Polygon -->
          <path d="${h.svgPath}" fill="#2e2b27" stroke="#6b6359" stroke-width="2" />
        </svg>

        <!-- Interactive Crosshair Guidelines -->
        <div class="inspector-crosshair-line" id="inspector-crosshair-line"></div>
        <div class="inspector-crosshair-badge" id="inspector-crosshair-badge">Az: 0° | El: 0.0°</div>

        <!-- Dynamic Celestial Trackers -->
        <div class="inspector-celestial-tracker" id="inspector-sun-tracker" style="left: ${sunLeftPct}%; top: ${sunTopPct}%;">
          <span>☀️</span>
          <span class="tracker-tag" id="inspector-sun-tag">Sun (+${h.sunEl}°)</span>
        </div>

        <div class="inspector-celestial-tracker" id="inspector-earth-tracker" style="left: ${earthLeftPct}%; top: ${earthTopPct}%;">
          <span>🌍</span>
          <span class="tracker-tag">Earth (+${h.earthEl}°)</span>
        </div>
      </div>

      <!-- Azimuth X-Axis (15° increments) -->
      <div class="inspector-axis-title-x">Azimuth (°)</div>
      <div class="inspector-azimuth-axis">
        <span>0° (N)</span>
        <span>45° (NE)</span>
        <span>90° (E)</span>
        <span>135° (SE)</span>
        <span>180° (S)</span>
        <span>225° (SW)</span>
        <span>270° (W)</span>
        <span>315° (NW)</span>
        <span>360° (N)</span>
      </div>

      <!-- 4-Stat Telemetry Strip -->
      <div class="inspector-metrics-panel">
        <div class="inspector-stat-box">
          <span class="stat-label">Solar Elevation</span>
          <span class="stat-val status-safe">+${h.sunEl}° (${h.sunAz}° Az)</span>
        </div>
        <div class="inspector-stat-box">
          <span class="stat-label">Earth Line-of-Sight</span>
          <span class="stat-val status-safe">+${h.earthEl}° (${h.earthAz}° Az)</span>
        </div>
        <div class="inspector-stat-box">
          <span class="stat-label">Horizon Crest Margin</span>
          <span class="stat-val status-safe">+2.4° Clear</span>
        </div>
        <div class="inspector-stat-box">
          <span class="stat-label">Continuous Daylight</span>
          <span class="stat-val">${site.solar.continuousStay}</span>
        </div>
      </div>
    `;
  }

  /**
   * Generates High-Resolution Slope Profile HTML.
   */
  function renderSlopeView(site) {
    const s = site.slope;
    return `
      <div class="inspector-skyline-wrap inspector-profile-wrap" style="height: 180px;">
        <div class="inspector-profile-y-ticks qualitative" aria-hidden="true">
          <span>High</span><span>Mid</span><span>Low</span>
        </div>
        <svg viewBox="0 0 520 200" preserveAspectRatio="none">
          <g class="inspector-chart-grid">
            <line x1="0" y1="15" x2="520" y2="15" />
            <line x1="0" y1="100" x2="520" y2="100" />
            <line x1="0" y1="185" x2="520" y2="185" />
            <line x1="1" y1="0" x2="1" y2="200" />
            <line x1="260" y1="0" x2="260" y2="200" />
            <line x1="519" y1="0" x2="519" y2="200" />
          </g>
          <path d="${s.svgPath}" fill="none" stroke="var(--accent-sage, #7d967e)" stroke-width="3.5" />
          <circle cx="${s.touchdownX}" cy="${s.touchdownY}" r="7" fill="var(--accent-terracotta, #c87d55)" stroke="#fff" stroke-width="1.5" />
          <text x="${s.touchdownX + 12}" y="${s.touchdownY - 8}" fill="#ede8e1" font-size="12" font-weight="600" font-family="sans-serif">Touchdown Target (${s.slopeVal})</text>
          <text x="350" y="180" fill="var(--text-muted, #8c867c)" font-size="11" font-family="sans-serif">Permanently Shadowed Cold Trap (PSR)</text>
        </svg>
      </div>
      <div class="inspector-profile-axis-caption"><span>Relative elevation</span><span>Radial distance (%)</span></div>
      <div class="inspector-profile-x-ticks" aria-hidden="true"><span>0</span><span>50</span><span>100</span></div>

      <div class="inspector-metrics-panel">
        <div class="inspector-stat-box">
          <span class="stat-label">Touchdown Slope</span>
          <span class="stat-val ${s.slopeVal.startsWith('4') ? 'status-safe' : 'status-warning'}">${s.slopeVal}</span>
        </div>
        <div class="inspector-stat-box">
          <span class="stat-label">Descent Safety Status</span>
          <span class="stat-val status-safe">${s.slopeStatus}</span>
        </div>
        <div class="inspector-stat-box">
          <span class="stat-label">Distance to PSR Ice</span>
          <span class="stat-val">${s.distIce}</span>
        </div>
        <div class="inspector-stat-box">
          <span class="stat-label">Escarpment Hazard</span>
          <span class="stat-val status-warning">${s.hazardDesc}</span>
        </div>
      </div>
    `;
  }

  /**
   * Generates High-Resolution Solar Illumination HTML.
   */
  function renderSolarView(site) {
    const sol = site.solar;
    return `
      <div class="inspector-skyline-wrap inspector-profile-wrap" style="height: 180px;">
        <div class="inspector-profile-y-ticks solar-scale" aria-hidden="true">
          <span>+5°</span><span>0°</span><span>-5°</span>
        </div>
        <svg viewBox="0 0 520 200" preserveAspectRatio="none">
          <g class="inspector-chart-grid">
            <line x1="0" y1="15" x2="520" y2="15" />
            <line x1="0" y1="100" x2="520" y2="100" />
            <line x1="0" y1="185" x2="520" y2="185" />
            <line x1="1" y1="0" x2="1" y2="200" />
            <line x1="260" y1="0" x2="260" y2="200" />
            <line x1="519" y1="0" x2="519" y2="200" />
          </g>
          <line x1="0" y1="120" x2="520" y2="120" stroke="var(--accent-sand, #c99e52)" stroke-dasharray="3 3" />
          <path d="M0,140 Q130,40 260,50 T520,150" fill="none" stroke="var(--accent-sand, #c99e52)" stroke-width="3" />
          <text x="45" y="112" fill="var(--accent-sand, #c99e52)" font-size="10" font-family="sans-serif">0° Local Solar Horizon</text>
        </svg>
      </div>
      <div class="inspector-profile-axis-caption"><span>Solar elevation (°)</span><span>Mission day</span></div>
      <div class="inspector-profile-x-ticks" aria-hidden="true"><span>1</span><span>7</span><span>14</span></div>

      <div class="inspector-metrics-panel">
        <div class="inspector-stat-box">
          <span class="stat-label">Illumination Ratio</span>
          <span class="stat-val status-safe">${sol.daylightPct}</span>
        </div>
        <div class="inspector-stat-box">
          <span class="stat-label">Peak Sun Elevation</span>
          <span class="stat-val">${sol.peakEl}</span>
        </div>
        <div class="inspector-stat-box">
          <span class="stat-label">Unbroken EVA Stay</span>
          <span class="stat-val status-safe">${sol.continuousStay}</span>
        </div>
        <div class="inspector-stat-box">
          <span class="stat-label">Current Phase Status</span>
          <span class="stat-val">${sol.shadowIngress}</span>
        </div>
      </div>
    `;
  }

  /**
   * Generates High-Resolution RF Comms HTML.
   */
  function renderCommsView(site) {
    const c = site.comms;
    return `
      <div class="inspector-metrics-panel" style="grid-template-columns: repeat(2, 1fr); margin-top: 8px;">
        <div class="inspector-stat-box">
          <span class="stat-label">Direct Earth Elevation</span>
          <span class="stat-val status-safe">${c.earthElev}</span>
        </div>
        <div class="inspector-stat-box">
          <span class="stat-label">High-Gain RF Link Margin</span>
          <span class="stat-val status-safe">${c.rfMargin}</span>
        </div>
        <div class="inspector-stat-box">
          <span class="stat-label">Deep Space Network Ground Stations</span>
          <span class="stat-val">${c.dsnLock}</span>
        </div>
        <div class="inspector-stat-box">
          <span class="stat-label">Orbital Libration Box Window</span>
          <span class="stat-val">${c.librationBox}</span>
        </div>
      </div>
    `;
  }

  /**
   * Attaches interactive crosshair events to the skyline chart.
   */
  function attachCrosshairEvents() {
    const wrap = document.getElementById("inspector-skyline-wrap");
    const line = document.getElementById("inspector-crosshair-line");
    const badge = document.getElementById("inspector-crosshair-badge");
    if (!wrap || !line || !badge) return;

    wrap.addEventListener("mousemove", (e) => {
      const rect = wrap.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      // Convert the crosshair's horizontal fraction into the chart's 0–360° azimuth.
      const pct = x / rect.width;
      const az = Math.round(pct * 360);

      // Approximate terrain crest elevation at this azimuth
      const simulatedEl = (Math.sin(pct * Math.PI * 4) * 2.8 + 1.2).toFixed(1);
      const isClear = simulatedEl < 4.0;

      line.style.display = "block";
      line.style.left = `${x}px`;

      badge.style.display = "block";
      badge.style.left = `${x}px`;
      badge.textContent = `Az: ${az}° · Terrain: +${simulatedEl}° · ${isClear ? 'Clear' : 'Occluded'}`;
    });

    wrap.addEventListener("mouseleave", () => {
      line.style.display = "none";
      badge.style.display = "none";
    });
  }

  /**
   * Real-time Sun tracker update across the high-res skyline.
   */
  function updateLiveSunTracker() {
    const sunTracker = document.getElementById("inspector-sun-tracker");
    const sunTag = document.getElementById("inspector-sun-tag");
    const site = getInspectorSite(activeSiteKey);
    if (!sunTracker || !site) return;

    const initialAz = site.skyline.sunAz || 180;
    const liveAz = (initialAz + Math.round(timelineProgress * 360)) % 360;
    const leftPct = (liveAz / 360) * 100;
    sunTracker.style.left = `${leftPct}%`;

    if (sunTag) {
      sunTag.textContent = `Sun (+${site.skyline.sunEl}°, ${liveAz}° Az)`;
    }
  }

  // Safe DOM ready check
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initInspector);
  } else {
    initInspector();
  }
})();
