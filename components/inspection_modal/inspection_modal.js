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
  let currentSliderVal = 50; // 0 - 100

  // Dragging state for Floating HUD mode
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let initialLeft = 0;
  let initialTop = 0;

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
        if (data && data.siteData) {
          activeSiteData = data.siteData;
        }
        openInspector(data.siteKey || data.siteData || "shackleton", data.tab || "horizon", data.siteData);
      });

      // Subscribed to live timeline scrubber
      window.eventBus.on("time:changed", (data) => {
        currentSliderVal = typeof data.sliderValue === "number" ? data.sliderValue : (window.currentSliderVal || 50);
        updateInspectorTelemetry(currentSliderVal);
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
        modeIcon.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>`;
        modeLabel.textContent = "Float HUD";
      } else {
        modeIcon.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="12" cy="12" r="3"/></svg>`;
        modeLabel.textContent = "Dock Center";
      }
    }
  }

  /**
   * Translates azimuth angle into a 16-point compass heading string.
   */
  function getCompassHeading(az) {
    const headings = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    const idx = Math.round((((az % 360) + 360) % 360) / 22.5) % 16;
    return headings[idx];
  }

  /**
   * Builds an authentic high-resolution 360° skyline SVG silhouette path from LOLA horizon mask.
   * Scaled for viewBox="0 0 520 200" with astronomical horizon datum (0°) at y=145 (8 px/deg).
   *
   * @param {Array<number>} horizonMask - 360-element array of elevation angles (degrees)
   * @returns {string} SVG path string
   */
  function buildHighResSkylinePath(horizonMask) {
    if (!Array.isArray(horizonMask) || horizonMask.length === 0) {
      return "M0,145 L520,145 L520,200 L0,200 Z";
    }

    const pts = [];
    const totalBins = horizonMask.length; // 360
    for (let az = 0; az <= 360; az++) {
      const x = ((az / 360) * 520).toFixed(1);
      const el = horizonMask[az % totalBins] !== undefined ? horizonMask[az % totalBins] : 0;
      // y = 145 - (el * 8), clamped to [15, 195]
      const y = Math.max(15, Math.min(195, 145 - el * 8)).toFixed(1);
      pts.push(`${az === 0 ? "M" : "L"}${x},${y}`);
    }
    pts.push("L520,200 L0,200 Z");
    return pts.join(" ");
  }

  /**
   * Builds an authentic 720-hour monthly solar stay elevation SVG curve across November 2026.
   * Scaled for viewBox="0 0 520 200" with astronomical horizon datum (0°) at y=120 (17 px/deg).
   *
   * @param {Object} siteProfile - Authentic NASA site profile containing november_2026_series
   * @returns {string} SVG path string
   */
  function buildHighResSolarPath(siteProfile) {
    if (siteProfile && siteProfile.november_2026_series && Array.isArray(siteProfile.november_2026_series.sun_el)) {
      const sunEl = siteProfile.november_2026_series.sun_el;
      const pts = [];
      const totalHours = sunEl.length; // 720
      for (let h = 0; h < totalHours; h++) {
        const x = ((h / (totalHours - 1)) * 520).toFixed(1);
        const el = sunEl[h] !== undefined ? sunEl[h] : 0;
        // y: zero datum is at y=120, scale 17 px/deg, clamped to [15, 190]
        const y = Math.max(15, Math.min(190, 120 - el * 17)).toFixed(1);
        pts.push(`${h === 0 ? "M" : "L"}${x},${y}`);
      }
      return pts.join(" ");
    }

    // Fallback diurnal curve for synthetic / custom sites
    const lat = siteProfile && siteProfile.coordinates ? siteProfile.coordinates.lat : -89.0;
    const isPolar = Math.abs(lat) >= 80;
    const pts = [];
    for (let x = 0; x <= 520; x += 2) {
      const rad = (x / 520) * Math.PI * 2;
      const el = isPolar ? (1.2 + 0.6 * Math.sin(rad)) : (12.0 * Math.sin(rad));
      const y = Math.max(15, Math.min(190, 120 - el * 17)).toFixed(1);
      pts.push(`${x === 0 ? "M" : "L"}${x},${y}`);
    }
    return pts.join(" ");
  }

  /**
   * Scales a 300x80 slope profile path to the high-resolution 520x200 inspector coordinate space.
   *
   * @param {string} rawPath - 300x80 SVG path string
   * @returns {{scaledPath: string, touchdownX: number, touchdownY: number}}
   */
  function scaleSlopeToHighRes(rawPath) {
    const path = rawPath || "M0,45 Q70,41 120,36 T200,56 T300,68";
    const scaleX = 520 / 300;
    const scaleY = 200 / 80;
    const m = path.match(/Q\s*([0-9.]+)\s*,\s*([0-9.]+)\s+([0-9.]+)\s*,\s*([0-9.]+)/);
    const srcTdX = m ? parseFloat(m[3]) : 110;
    const srcTdY = m ? parseFloat(m[4]) : 34;

    const scaledPath = path.replace(/([0-9.]+)\s*,\s*([0-9.]+)/g, (match, x, y) => {
      return (parseFloat(x) * scaleX).toFixed(1) + "," + (parseFloat(y) * scaleY).toFixed(1);
    });

    return {
      scaledPath,
      touchdownX: +(srcTdX * scaleX).toFixed(1),
      touchdownY: +(srcTdY * scaleY).toFixed(1)
    };
  }

  /**
   * Resolves site dataset using authentic NASA LunarPhysics data when available.
   */
  function getInspectorSite(siteKeyOrData) {
    const input = siteKeyOrData || activeSiteData || activeSiteKey || "shackleton";

    if (window.LunarPhysics) {
      let raw = null;

      // 1. If activeSiteData already has authentic NASA profile attached
      if (activeSiteData && activeSiteData._authentic) {
        raw = activeSiteData._authentic;
      }

      // 2. Direct lookup by input
      if (!raw) {
        raw = window.LunarPhysics.findSite(input);
      }

      // 3. Fallback: if input was a dynamic key (e.g. malapert_massif_1794723...), try stripped slug
      if (!raw && typeof input === "string") {
        const stripped = input.replace(/_\d+$/, "");
        raw = window.LunarPhysics.findSite(stripped) || window.LunarPhysics.findSite(stripped.replace(/_/g, " "));
      }

      // 4. Fallback: lookup by activeSiteData name or coordinates
      if (!raw && activeSiteData) {
        if (activeSiteData.name) {
          raw = window.LunarPhysics.findSite(activeSiteData.name);
        }
        if (!raw && activeSiteData.lat !== undefined && activeSiteData.lon !== undefined) {
          raw = window.LunarPhysics.findSite({ lat: activeSiteData.lat, lon: activeSiteData.lon });
        }
      }

      // 5. Synthesize custom site only if genuinely not a catalog site
      if (!raw) {
        let lat = null;
        let lon = null;
        if (typeof input === "object" && input !== null) {
          lat = typeof input.lat === "number" ? input.lat : parseFloat(input.lat);
          lon = typeof input.lon === "number" ? input.lon : parseFloat(input.lon);
        } else if (activeSiteData) {
          lat = typeof activeSiteData.lat === "number" ? activeSiteData.lat : parseFloat(activeSiteData.lat);
          lon = typeof activeSiteData.lon === "number" ? activeSiteData.lon : parseFloat(activeSiteData.lon);
        }

        if (typeof lat === "number" && !isNaN(lat) && typeof lon === "number" && !isNaN(lon)) {
          raw = window.LunarPhysics.synthesizeCustomSite(lat, lon);
        }
      }

      if (raw) {
        const sliderVal = typeof currentSliderVal === "number" ? currentSliderVal : (window.currentSliderVal || 50);
        const hourIdx = window.LunarPhysics.sliderToHourIndex(sliderVal);
        const evalData = window.LunarPhysics.evaluateAtHour(raw, hourIdx);
        const coords = raw.coordinates || { lat: -89.6, lon: 129.2, elevation_m: 1240 };
        const terrain = raw.terrain || {};
        const metrics = raw.summary_metrics || { daylight_pct: 75, continuous_sunlight_max_hrs: 120, rf_margin_db: 5.0 };

        const crestAtSun = (terrain.horizon_mask_360 && terrain.horizon_mask_360[Math.round(evalData ? evalData.sunAz : 180) % 360]) || 1.0;
        const sunClearanceDelta = evalData ? (evalData.sunEl - crestAtSun).toFixed(1) : "1.0";
        const clearanceDesc = evalData && evalData.isSunVis
          ? `+${sunClearanceDelta}° above regional terrain crest`
          : `${sunClearanceDelta}° below regional crest`;

        const isCustom = raw.name && (raw.name.startsWith("Custom (") || raw.type === "Custom Coordinate");
        const displayName = isCustom ? "Custom Target Site" : (raw.name || "Candidate Site");
        const displayTag = isCustom ? "Custom Coordinate" : (raw.type || "Artemis III Candidate");

        return {
          _raw: raw,
          tag: displayTag,
          name: displayName,
          coords: `${Math.abs(coords.lat).toFixed(2)}° ${coords.lat < 0 ? 'S' : 'N'} · ${coords.lon.toFixed(1)}° E · +${coords.elevation_m.toLocaleString()} m`,
          lat: coords.lat,
          lon: coords.lon,
          elevationMeters: `+${coords.elevation_m.toLocaleString()} m`,
          skyline: {
            svgPath: buildHighResSkylinePath(terrain.horizon_mask_360),
            sunAz: evalData ? evalData.sunAz : 180,
            sunEl: evalData ? evalData.sunEl : 1.2,
            earthAz: evalData ? evalData.earthAz : 240,
            earthEl: evalData ? evalData.earthEl : 3.2,
            clearance: clearanceDesc,
            statusPill: evalData && evalData.isSunVis ? "✓ Line of Sight Maintained" : "✗ Topographic Shadow",
            pillClass: evalData && evalData.isSunVis ? "pill-ok" : "pill-warn"
          },
          slope: {
            svgPath: scaleSlopeToHighRes(terrain.slope_svg_path).scaledPath,
            touchdownX: scaleSlopeToHighRes(terrain.slope_svg_path).touchdownX,
            touchdownY: scaleSlopeToHighRes(terrain.slope_svg_path).touchdownY,
            slopeVal: `${terrain.slope_touchdown_deg || 4.2}°`,
            slopeStatus: `${terrain.slope_status || 'Safe'} (< ${(terrain.slope_touchdown_deg || 4.2) < 5 ? '5°' : '8°'})`,
            distIce: `${terrain.dist_to_psr_km || 1.8} km`,
            hazardDesc: `${terrain.max_gradient_deg || 18.4}° max gradient (${terrain.psr_name || 'PSR Rim'})`
          },
          solar: {
            svgPath: buildHighResSolarPath(raw),
            cursorX: ((hourIdx / 719) * 520).toFixed(1),
            cursorY: evalData ? Math.max(15, Math.min(190, 120 - evalData.sunEl * 17)).toFixed(1) : "120.0",
            liveSunEl: evalData ? `${evalData.sunEl >= 0 ? '+' : ''}${evalData.sunEl}°` : "+1.2°",
            daylightPct: `${Math.round(metrics.daylight_pct)}% Daylight`,
            peakEl: `+${(evalData ? evalData.sunEl + 1.2 : 2.0).toFixed(1)}° (Solar Transit)`,
            continuousStay: `${metrics.continuous_sunlight_max_hrs} hrs continuous`,
            shadowIngress: evalData ? (evalData.isSunVis ? `${evalData.nextSunsetHrs}h until sunset` : `Sunrise in ${evalData.nextSunriseHrs}h`) : "N/A"
          },
          comms: {
            earthElev: `${evalData ? (evalData.earthEl >= 0 ? '+' : '') + evalData.earthEl : '+3.0'}° (${evalData && evalData.isEarthVis ? 'Stable' : 'Occluded'})`,
            rfMargin: `+${evalData ? evalData.rfMargin.toFixed(1) : metrics.rf_margin_db} dB`,
            dsnLock: "Canberra / Goldstone Active",
            librationBox: "±6.7° Lat / ±7.9° Lon"
          }
        };
      }
    }

    // Clean minimal fallback
    return {
      tag: "Lunar Candidate Site",
      name: typeof input === "string" ? input : (input?.name || "Lunar Candidate"),
      coords: "89.6° S · 129.2° E · +1,240 m",
      lat: -89.6,
      lon: 129.2,
      elevationMeters: "+1,240 m",
      skyline: {
        svgPath: "M0,125 L520,125 L520,200 L0,200 Z",
        sunAz: 180,
        sunEl: 1.2,
        earthAz: 240,
        earthEl: 3.2,
        clearance: "Line of sight nominal",
        statusPill: "✓ Line of Sight Maintained",
        pillClass: "pill-ok"
      },
      slope: {
        svgPath: scaleSlopeToHighRes("M0,45 Q70,41 120,36 T200,56 T300,68").scaledPath,
        touchdownX: scaleSlopeToHighRes("M0,45 Q70,41 120,36 T200,56 T300,68").touchdownX,
        touchdownY: scaleSlopeToHighRes("M0,45 Q70,41 120,36 T200,56 T300,68").touchdownY,
        slopeVal: "4.5°",
        slopeStatus: "Safe (< 5°)",
        distIce: "2.0 km",
        hazardDesc: "14.2° max slope"
      },
      solar: {
        svgPath: buildHighResSolarPath(null),
        cursorX: "260.0",
        cursorY: "120.0",
        liveSunEl: "+1.2°",
        daylightPct: "75% Daylight",
        peakEl: "+1.8° (Solar Transit)",
        continuousStay: "120 hrs continuous",
        shadowIngress: "N/A"
      },
      comms: {
        earthElev: "+3.2° (Stable)",
        rfMargin: "+5.0 dB",
        dsnLock: "Canberra / Goldstone Active",
        librationBox: "±6.7° Lat / ±7.9° Lon"
      }
    };
  }

  /**
   * Opens the inspector for a specific site and view tab.
   */
  function openInspector(siteKeyOrData, tab, siteData) {
    if (siteData) {
      activeSiteData = siteData;
    }
    const site = getInspectorSite(siteKeyOrData);
    activeSiteKey = site?._raw?.site_id || (typeof siteKeyOrData === "string" ? siteKeyOrData.replace(/_\d+$/, "") : (siteKeyOrData?.site_id || siteKeyOrData?.name || "shackleton"));
    activeTab = tab || "horizon";

    // Proactively query FastAPI backend /api/sites/{site_id} endpoint
    if (typeof activeSiteKey === "string" && window.LunarPhysics && window.LunarPhysics.fetchSiteDetail) {
      window.LunarPhysics.fetchSiteDetail(activeSiteKey).then(() => {
        renderActiveView();
      });
    }

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
      updateInspectorTelemetry(currentSliderVal);
    } else if (activeTab === "slope") {
      stage.innerHTML = renderSlopeView(site);
      updateInspectorTelemetry(currentSliderVal);
    } else if (activeTab === "solar") {
      stage.innerHTML = renderSolarView(site);
      updateInspectorTelemetry(currentSliderVal);
    } else if (activeTab === "comms") {
      stage.innerHTML = renderCommsView(site);
      updateInspectorTelemetry(currentSliderVal);
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
    // Match tracker positions to the chart axes: 0–360° azimuth and +15° to -5° elevation (8 px/deg).
    const sunLeftPct = (h.sunAz / 360) * 100;
    const earthLeftPct = (h.earthAz / 360) * 100;
    const sunTopPct = Math.max(4, Math.min(96, 72.5 - (h.sunEl * 4.0)));
    const earthTopPct = Math.max(4, Math.min(96, 72.5 - (h.earthEl * 4.0)));
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
          <defs>
            <linearGradient id="skyline-poly-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#3d3832" />
              <stop offset="100%" stop-color="#18191b" />
            </linearGradient>
          </defs>
          <!-- Background Grid Lines -->
          <line x1="0" y1="25" x2="520" y2="25" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2 4" />
          <line x1="0" y1="65" x2="520" y2="65" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2 4" />
          <line x1="0" y1="105" x2="520" y2="105" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2 4" />
          <line x1="0" y1="145" x2="520" y2="145" stroke="rgba(201,158,82,0.3)" stroke-dasharray="4 4" />
          <line x1="0" y1="185" x2="520" y2="185" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2 4" />
          <!-- Topographic Skyline Polygon -->
          <path d="${h.svgPath}" fill="url(#skyline-poly-grad)" stroke="#6b6359" stroke-width="1.8" />
        </svg>

        <!-- Interactive Crosshair Guidelines -->
        <div class="inspector-crosshair-line" id="inspector-crosshair-line"></div>
        <div class="inspector-crosshair-badge" id="inspector-crosshair-badge">Az: 0° | El: 0.0°</div>

        <!-- Dynamic Celestial Trackers -->
        <div class="inspector-celestial-tracker" id="inspector-sun-tracker" style="left: ${sunLeftPct}%; top: ${sunTopPct}%;">
          <span>☀️</span>
          <span class="tracker-tag" id="inspector-sun-tag">Sun (${h.sunEl >= 0 ? '+' : ''}${h.sunEl}°, ${h.sunAz}° Az)</span>
        </div>

        <div class="inspector-celestial-tracker" id="inspector-earth-tracker" style="left: ${earthLeftPct}%; top: ${earthTopPct}%;">
          <span>🌍</span>
          <span class="tracker-tag" id="inspector-earth-tag">Earth (${h.earthEl >= 0 ? '+' : ''}${h.earthEl}°, ${h.earthAz}° Az)</span>
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
          <span class="stat-val status-safe" id="inspector-skyline-sun-val">${h.sunEl >= 0 ? '+' : ''}${h.sunEl}° (${h.sunAz}° Az)</span>
        </div>
        <div class="inspector-stat-box">
          <span class="stat-label">Earth Line-of-Sight</span>
          <span class="stat-val status-safe" id="inspector-skyline-earth-val">${h.earthEl >= 0 ? '+' : ''}${h.earthEl}° (${h.earthAz}° Az)</span>
        </div>
        <div class="inspector-stat-box">
          <span class="stat-label">Horizon Crest Margin</span>
          <span class="stat-val ${h.clearance.includes('Shadow') ? 'status-danger' : 'status-safe'}" id="inspector-skyline-crest-val">${h.clearance}</span>
        </div>
        <div class="inspector-stat-box">
          <span class="stat-label">Continuous Daylight</span>
          <span class="stat-val" id="inspector-skyline-daylight-val">${site.solar.continuousStay}</span>
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
          <defs>
            <linearGradient id="slope-terrain-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#7d967e" stop-opacity="0.25"/>
              <stop offset="100%" stop-color="#7d967e" stop-opacity="0.02"/>
            </linearGradient>
          </defs>
          <g class="inspector-chart-grid">
            <line x1="0" y1="15" x2="520" y2="15" stroke="rgba(255,255,255,0.08)" stroke-dasharray="2 3" />
            <line x1="0" y1="100" x2="520" y2="100" stroke="rgba(255,255,255,0.08)" stroke-dasharray="2 3" />
            <line x1="0" y1="185" x2="520" y2="185" stroke="rgba(255,255,255,0.08)" stroke-dasharray="2 3" />
            <line x1="1" y1="0" x2="1" y2="200" stroke="rgba(255,255,255,0.08)" stroke-dasharray="2 3" />
            <line x1="260" y1="0" x2="260" y2="200" stroke="rgba(255,255,255,0.08)" stroke-dasharray="2 3" />
            <line x1="519" y1="0" x2="519" y2="200" stroke="rgba(255,255,255,0.08)" stroke-dasharray="2 3" />
          </g>
          <!-- Shaded Lunar Regolith Terrain Fill -->
          <path d="${s.svgPath} L520,200 L0,200 Z" fill="url(#slope-terrain-gradient)" />
          <!-- Slope Surface Line -->
          <path d="${s.svgPath}" fill="none" stroke="var(--accent-sage, #7d967e)" stroke-width="2.5" stroke-linecap="round" />

          <!-- HUD Touchdown Target Reticle -->
          <circle cx="${s.touchdownX}" cy="${s.touchdownY}" r="7" fill="none" stroke="rgba(200, 125, 85, 0.45)" stroke-width="1.2" stroke-dasharray="3 2" />
          <circle cx="${s.touchdownX}" cy="${s.touchdownY}" r="3.5" fill="var(--accent-terracotta, #c87d55)" stroke="#fff" stroke-width="1.2" />
          <line x1="${s.touchdownX - 11}" y1="${s.touchdownY}" x2="${s.touchdownX - 5}" y2="${s.touchdownY}" stroke="rgba(200, 125, 85, 0.85)" stroke-width="1.2" />
          <line x1="${s.touchdownX + 5}" y1="${s.touchdownY}" x2="${s.touchdownX + 11}" y2="${s.touchdownY}" stroke="rgba(200, 125, 85, 0.85)" stroke-width="1.2" />
          <line x1="${s.touchdownX}" y1="${s.touchdownY - 11}" x2="${s.touchdownX}" y2="${s.touchdownY - 5}" stroke="rgba(200, 125, 85, 0.85)" stroke-width="1.2" />
          <line x1="${s.touchdownX}" y1="${s.touchdownY + 5}" x2="${s.touchdownX}" y2="${s.touchdownY + 11}" stroke="rgba(200, 125, 85, 0.85)" stroke-width="1.2" />

          <!-- Touchdown Callout Badge -->
          <g transform="translate(${s.touchdownX + 12}, ${Math.max(12, s.touchdownY - 14)})">
            <rect x="0" y="0" width="108" height="18" rx="3" fill="rgba(14, 16, 18, 0.92)" stroke="rgba(200, 125, 85, 0.65)" stroke-width="0.9" />
            <text x="8" y="12.5" fill="#ede8e1" font-size="9" font-weight="600" font-family="var(--font-mono, monospace)">TARGET (${s.slopeVal})</text>
          </g>

          <!-- Permanently Shadowed Region (PSR) Label -->
          <text x="505" y="188" text-anchor="end" fill="var(--accent-cyan, #5bc0be)" font-size="9.5" font-family="var(--font-mono, monospace)">❄ PSR Cold Trap (${s.distIce})</text>
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
          <defs>
            <linearGradient id="inspector-solar-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#c99e52" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="#c99e52" stop-opacity="0.01"/>
            </linearGradient>
          </defs>
          <g class="inspector-chart-grid">
            <line x1="0" y1="15" x2="520" y2="15" />
            <line x1="0" y1="100" x2="520" y2="100" />
            <line x1="0" y1="185" x2="520" y2="185" />
            <line x1="1" y1="0" x2="1" y2="200" />
            <line x1="130" y1="0" x2="130" y2="200" />
            <line x1="260" y1="0" x2="260" y2="200" />
            <line x1="390" y1="0" x2="390" y2="200" />
            <line x1="519" y1="0" x2="519" y2="200" />
          </g>
          <line x1="0" y1="120" x2="520" y2="120" stroke="rgba(201, 158, 82, 0.4)" stroke-dasharray="3 3" />
          <!-- Solar Curve Area Gradient Fill -->
          <path d="${sol.svgPath} L520,200 L0,200 Z" fill="url(#inspector-solar-grad)" />
          <!-- Authentic Solar Elevation Path -->
          <path id="inspector-solar-curve" d="${sol.svgPath}" fill="none" stroke="var(--accent-sand, #c99e52)" stroke-width="2.5" />
          <text x="45" y="112" fill="var(--accent-sand, #c99e52)" font-size="10" font-family="var(--font-mono, monospace)">0° Local Solar Horizon</text>

          <!-- Dynamic Timeline Cursor for Solar Stay Curve -->
          <line id="inspector-solar-cursor-line" x1="${sol.cursorX}" y1="0" x2="${sol.cursorX}" y2="200" stroke="var(--accent-cyan, #5bc0be)" stroke-width="1.5" stroke-dasharray="3 3" />
          <circle id="inspector-solar-cursor-dot" cx="${sol.cursorX}" cy="${sol.cursorY}" r="5" fill="var(--accent-cyan, #5bc0be)" stroke="#fff" stroke-width="1.5" />
        </svg>
      </div>
      <div class="inspector-profile-axis-caption"><span>Solar elevation (°)</span><span>Mission day (Nov 2026)</span></div>
      <div class="inspector-profile-x-ticks" aria-hidden="true"><span>Day 1</span><span>Day 8</span><span>Day 15</span><span>Day 22</span><span>Day 30</span></div>

      <div class="inspector-metrics-panel">
        <div class="inspector-stat-box">
          <span class="stat-label">Illumination Ratio</span>
          <span class="stat-val status-safe" id="inspector-solar-ratio-val">${sol.daylightPct}</span>
        </div>
        <div class="inspector-stat-box">
          <span class="stat-label">Sun Elevation (Live)</span>
          <span class="stat-val" id="inspector-solar-el-val">${sol.liveSunEl}</span>
        </div>
        <div class="inspector-stat-box">
          <span class="stat-label">Unbroken EVA Stay</span>
          <span class="stat-val status-safe" id="inspector-solar-stay-val">${sol.continuousStay}</span>
        </div>
        <div class="inspector-stat-box">
          <span class="stat-label">Current Phase Status</span>
          <span class="stat-val" id="inspector-solar-phase-val">${sol.shadowIngress}</span>
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
          <span class="stat-val status-safe" id="inspector-comms-earth-el">${c.earthElev}</span>
        </div>
        <div class="inspector-stat-box">
          <span class="stat-label">High-Gain RF Link Margin</span>
          <span class="stat-val status-safe" id="inspector-comms-rf-margin">${c.rfMargin}</span>
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
   * Attaches interactive crosshair events to the skyline chart with authentic LOLA crest lookups.
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
      const az = Math.min(359, Math.max(0, Math.round(pct * 360)));

      const site = getInspectorSite(activeSiteKey);
      const horizonMask = site._raw?.terrain?.horizon_mask_360;
      const crestEl = (horizonMask && horizonMask[az] !== undefined)
        ? +(horizonMask[az]).toFixed(1)
        : 1.2;

      const sunAz = site.skyline.sunAz || 180;
      const sunEl = site.skyline.sunEl || 1.2;
      const heading = getCompassHeading(az);

      line.style.display = "block";
      line.style.left = `${x}px`;

      badge.style.display = "block";
      // Position badge safely within view boundaries
      const badgeWidth = 240;
      const badgeLeft = Math.min(rect.width - badgeWidth, Math.max(10, x - (badgeWidth / 2)));
      badge.style.left = `${badgeLeft}px`;

      // Check proximity to sun azimuth
      const azDiff = Math.abs(az - Math.round(sunAz));
      if (azDiff <= 6 || azDiff >= 354) {
        const delta = (sunEl - crestEl).toFixed(1);
        badge.innerHTML = `Az: <strong>${az}° (${heading})</strong> · LOLA: <strong>+${crestEl}°</strong> · Sun: <strong>${delta >= 0 ? '+' + delta + '° (Clear)' : delta + '° (Shadow)'}</strong>`;
      } else {
        badge.innerHTML = `Az: <strong>${az}° (${heading})</strong> · Topographic Crest: <strong>${crestEl >= 0 ? '+' : ''}${crestEl}°</strong>`;
      }
    });

    wrap.addEventListener("mouseleave", () => {
      line.style.display = "none";
      badge.style.display = "none";
    });
  }

  /**
   * Real-time 60 FPS telemetry update across all inspector views when scrubbing timeline.
   */
  function updateInspectorTelemetry(sliderVal) {
    if (!isOpen) return;

    const val = typeof sliderVal === "number" ? sliderVal : (currentSliderVal || 50);
    currentSliderVal = val;

    const site = getInspectorSite(activeSiteKey);
    if (!site || !site._raw || !window.LunarPhysics) return;

    const hourIdx = window.LunarPhysics.sliderToHourIndex(val);
    const live = window.LunarPhysics.evaluateAtHour(site._raw, hourIdx);
    if (!live) return;

    const terrain = site._raw.terrain || {};
    const horizonMask = terrain.horizon_mask_360;
    const crestAtSun = (horizonMask && horizonMask[Math.round(live.sunAz) % 360] !== undefined)
      ? horizonMask[Math.round(live.sunAz) % 360]
      : 1.0;
    const clearanceDelta = +(live.sunEl - crestAtSun).toFixed(1);
    const clearanceDesc = live.isSunVis
      ? `+${clearanceDelta}° above regional terrain crest`
      : `${clearanceDelta}° below regional crest`;
    const statusPill = live.isSunVis ? "✓ Line of Sight Maintained" : "✗ Topographic Shadow";
    const pillClass = live.isSunVis ? "pill-ok" : "pill-warn";

    // 1. Update Persistent Modal Footer Telemetry
    const pill = document.getElementById("inspector-los-pill");
    const detail = document.getElementById("inspector-clearance-detail");
    if (pill) {
      pill.textContent = statusPill;
      pill.className = `telemetry-pill ${pillClass}`;
    }
    if (detail) {
      detail.innerHTML = `Terrain clearance: <strong>${clearanceDesc}</strong>`;
    }

    // 2. Tab-Specific Live Visual Updates
    if (activeTab === "horizon") {
      const sunTracker = document.getElementById("inspector-sun-tracker");
      const sunTag = document.getElementById("inspector-sun-tag");
      const earthTracker = document.getElementById("inspector-earth-tracker");
      const earthTag = document.getElementById("inspector-earth-tag") || (earthTracker ? earthTracker.querySelector(".tracker-tag") : null);

      if (sunTracker) {
        const sunLeftPct = (live.sunAz / 360) * 100;
        const sunTopPct = Math.max(4, Math.min(96, 72.5 - (live.sunEl * 4.0)));
        sunTracker.style.left = `${sunLeftPct}%`;
        sunTracker.style.top = `${sunTopPct}%`;
        if (sunTag) {
          sunTag.textContent = `Sun (${live.sunEl >= 0 ? '+' : ''}${live.sunEl}°, ${live.sunAz}° Az)`;
        }
      }

      if (earthTracker) {
        const earthLeftPct = (live.earthAz / 360) * 100;
        const earthTopPct = Math.max(4, Math.min(96, 72.5 - (live.earthEl * 4.0)));
        earthTracker.style.left = `${earthLeftPct}%`;
        earthTracker.style.top = `${earthTopPct}%`;
        if (earthTag) {
          earthTag.textContent = `Earth (${live.earthEl >= 0 ? '+' : ''}${live.earthEl}°, ${live.earthAz}° Az)`;
        }
      }

      // Skyline 4-Stat Panel
      const sunStat = document.getElementById("inspector-skyline-sun-val");
      const earthStat = document.getElementById("inspector-skyline-earth-val");
      const crestStat = document.getElementById("inspector-skyline-crest-val");
      if (sunStat) sunStat.textContent = `${live.sunEl >= 0 ? '+' : ''}${live.sunEl}° (${live.sunAz}° Az)`;
      if (earthStat) earthStat.textContent = `${live.earthEl >= 0 ? '+' : ''}${live.earthEl}° (${live.earthAz}° Az)`;
      if (crestStat) {
        crestStat.textContent = clearanceDesc;
        crestStat.className = `stat-val ${live.isSunVis ? 'status-safe' : 'status-danger'}`;
      }
    } else if (activeTab === "solar") {
      const cursorLine = document.getElementById("inspector-solar-cursor-line");
      const cursorDot = document.getElementById("inspector-solar-cursor-dot");
      const cursorX = ((hourIdx / 719) * 520).toFixed(1);
      const cursorY = Math.max(15, Math.min(190, 120 - live.sunEl * 17)).toFixed(1);

      if (cursorLine) {
        cursorLine.setAttribute("x1", cursorX);
        cursorLine.setAttribute("x2", cursorX);
      }
      if (cursorDot) {
        cursorDot.setAttribute("cx", cursorX);
        cursorDot.setAttribute("cy", cursorY);
      }

      const elVal = document.getElementById("inspector-solar-el-val");
      const phaseVal = document.getElementById("inspector-solar-phase-val");
      if (elVal) {
        elVal.textContent = `${live.sunEl >= 0 ? '+' : ''}${live.sunEl}° (Hour ${hourIdx})`;
      }
      if (phaseVal) {
        phaseVal.textContent = live.isSunVis ? `${live.nextSunsetHrs}h until sunset` : `Sunrise in ${live.nextSunriseHrs}h`;
        phaseVal.className = `stat-val ${live.isSunVis ? 'status-safe' : 'status-warning'}`;
      }
    } else if (activeTab === "comms") {
      const earthElVal = document.getElementById("inspector-comms-earth-el");
      const rfMarginVal = document.getElementById("inspector-comms-rf-margin");
      if (earthElVal) {
        earthElVal.textContent = `${live.earthEl >= 0 ? '+' : ''}${live.earthEl}° (${live.isEarthVis ? 'Stable' : 'Occluded'})`;
        earthElVal.className = `stat-val ${live.isEarthVis ? 'status-safe' : 'status-danger'}`;
      }
      if (rfMarginVal) {
        rfMarginVal.textContent = `+${live.rfMargin.toFixed(1)} dB (${live.isEarthVis ? 'Nominal Link' : 'No Signal'})`;
        rfMarginVal.className = `stat-val ${live.isEarthVis ? 'status-safe' : 'status-danger'}`;
      }
    }
  }

  // Expose API for verification testing and external control
  window.SiteInspector = {
    openInspector,
    closeInspector,
    getInspectorSite,
    buildHighResSkylinePath,
    buildHighResSolarPath,
    updateInspectorTelemetry
  };

  // Safe DOM ready check
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initInspector);
  } else {
    initInspector();
  }
})();
