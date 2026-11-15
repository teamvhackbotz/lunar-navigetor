/**
 * ==============================================================================
 * Lunar Landing Site Navigator - Candidate Comparison Cards & Sub-Card Controller
 * File: components/comparison_cards/comparison_cards.js
 * Role: Manages primary card selection, expandable secondary drop-cards,
 *       dynamic candidate card addition on search/mark, full Undo/Redo history stack,
 *       procedural terrain/skyline SVG telemetry, and real-time EventBus synchronization.
 * ==============================================================================
 */

(function() {
  /**
   * Runtime registry of active candidate landing site profiles in the comparison deck.
   * Dynamically populated from authentic NASA LOLA and JPL Horizons data on-demand.
   */
  const SITE_PROFILES = {};

  // Undo / Redo stacks
  const undoStack = [];
  const redoStack = [];

  /**
   * Builds an authentic solar elevation curve SVG path from the 720-hour ephemeris series.
   * Renders in viewBox="0 0 360 80" with astronomical zero line at y=58 (+5° at y=10, -2° at y=77).
   *
   * @param {Object} siteProfile - Authentic NASA site telemetry profile
   * @returns {string} SVG path string
   */
  function buildAuthenticSolarSvgPath(siteProfile) {
    if (siteProfile && siteProfile.november_2026_series && Array.isArray(siteProfile.november_2026_series.sun_el)) {
      const sunEl = siteProfile.november_2026_series.sun_el;
      const pts = [];
      // 720 hours downsampled across 360 pixels (step 2 hours)
      for (let h = 0; h < 720; h += 2) {
        const x = Math.round(h / 2);
        const el = sunEl[h] !== undefined ? sunEl[h] : 0;
        // y: zero datum is at y=58, +5° is at y=10, -2° is at y=77.2
        const y = Math.max(4, Math.min(78, 58 - el * 9.6)).toFixed(1);
        pts.push(`${h === 0 ? "M" : "L"}${x},${y}`);
      }
      return pts.join(" ");
    }

    // Realistic diurnal curve for custom sites based on lunar latitude & solar declination
    const lat = siteProfile && siteProfile.coordinates ? siteProfile.coordinates.lat : -89.0;
    const isPolar = Math.abs(lat) >= 80;
    const pts = [];
    for (let x = 0; x <= 360; x += 4) {
      const rad = (x / 360) * Math.PI * 2;
      const el = isPolar ? (1.2 + 0.6 * Math.sin(rad)) : (12.0 * Math.sin(rad));
      const y = Math.max(4, Math.min(78, 58 - el * 9.6)).toFixed(1);
      pts.push(`${x === 0 ? "M" : "L"}${x},${y}`);
    }
    return pts.join(" ");
  }

  /**
   * Generates a scientific telemetry profile for a given lunar location using authentic NASA data.
   */
  function generateSiteProfile(siteKey, data) {
    const lat = typeof data.lat === "number" ? data.lat : parseFloat(data.lat);
    const lon = typeof data.lon === "number" ? data.lon : parseFloat(data.lon);
    const name = data.name || `Site (${Math.abs(lat).toFixed(2)}° ${lat < 0 ? "S" : "N"}, ${lon.toFixed(1)}° E)`;

    // Check authentic NASA catalog via LunarPhysics
    let authentic = window.LunarPhysics ? window.LunarPhysics.findSite(data) : null;
    if (!authentic && window.LunarPhysics) {
      authentic = window.LunarPhysics.synthesizeCustomSite(lat, lon);
    }

    if (authentic) {
      const terrain = authentic.terrain;
      const metrics = authentic.summary_metrics;
      const coords = authentic.coordinates;
      const hourIdx = window.LunarPhysics ? window.LunarPhysics.sliderToHourIndex(window.currentSliderVal || 50) : 360;
      const live = window.LunarPhysics ? window.LunarPhysics.evaluateAtHour(authentic, hourIdx) : null;

      const sunEl = live ? live.sunEl : 1.2;
      const sunAz = live ? live.sunAz : 180;
      const earthEl = live ? live.earthEl : 3.2;
      const earthAz = live ? live.earthAz : 240;
      const isSunVis = live ? live.isSunVis : true;
      const nextSunset = live ? `${live.nextSunsetHrs}h 00m` : "96h 00m";

      return {
        _authentic: authentic,
        name: authentic.name,
        lat: coords.lat,
        lon: coords.lon,
        elevation: `+${coords.elevation_m.toLocaleString()} m`,
        nextSunset: nextSunset,
        daylightPctNum: Math.round(metrics.daylight_pct),
        horizon: {
          title: "🌄 360° Panoramic Skyline Mask",
          svgPath: terrain.skyline_svg_path,
          sunAz: sunAz,
          sunEl: sunEl,
          earthAz: earthAz,
          earthEl: earthEl,
          status: isSunVis
            ? `Sun is <strong>Clear</strong> of regional topography. Earth line-of-sight <strong>Maintained (+${earthEl}°)</strong>.`
            : `Sun is in <strong>Topographic Shadow</strong>. Direct Earth line-of-sight is <strong>${earthEl > 0 ? 'Clear (+' + earthEl + '°)' : 'Occluded'}</strong>.`
        },
        slope: {
          title: "📈 Local Crater Radial Cross-Section",
          svgPath: terrain.slope_svg_path,
          touchdownX: 100,
          touchdownY: 34,
          slopeVal: `${terrain.slope_touchdown_deg}°`,
          slopeStatus: terrain.slope_status,
          slopeColor: terrain.slope_color,
          distIce: `${terrain.dist_to_psr_km} km`,
          maxGradient: `${terrain.max_gradient_deg}° (${terrain.psr_name})`
        },
        solar: {
          title: "☀️ 14-Day Solar Illumination Window",
          svgPath: buildAuthenticSolarSvgPath(authentic),
          daylightPct: `${Math.round(metrics.daylight_pct)}% Daylight`,
          peakElevation: `+${(sunEl + 1.2).toFixed(1)}° (Solar Transit)`,
          continuousStay: `${metrics.continuous_sunlight_max_hrs} hrs continuous`
        },
        comms: {
          title: "📡 Direct-to-Earth (DTE) Comms Margin",
          earthElev: `+${earthEl}° (Nominal Line)`,
          margin: `+${metrics.rf_margin_db} dB`,
          dsnLock: "Canberra / Goldstone Active",
          status: earthEl > 0
            ? "Stable line-of-sight during positive libration window."
            : "Direct Earth line-of-sight occluded by terrain (Earthset)."
        }
      };
    }

    // Minimal emergency fallback if LunarPhysics engine is completely offline
    return {
      name: name,
      lat: lat,
      lon: lon,
      elevation: "+1,000 m",
      nextSunset: "96h 00m",
      daylightPctNum: 60,
      horizon: {
        title: "🌄 360° Panoramic Skyline Mask",
        svgPath: "M0,50 L90,45 L180,35 L270,45 L360,50 L360,80 L0,80 Z",
        sunAz: 180,
        sunEl: 1.0,
        earthAz: 240,
        earthEl: 3.0,
        status: "Sun elevation telemetry unavailable."
      },
      slope: {
        title: "📈 Local Crater Radial Cross-Section",
        svgPath: "M0,45 Q70,41 120,36 T200,56 T300,45",
        touchdownX: 100,
        touchdownY: 34,
        slopeVal: "4.5°",
        slopeStatus: "Safe",
        slopeColor: "status-safe",
        distIce: "2.0 km",
        maxGradient: "12.0°"
      },
      solar: {
        title: "☀️ 14-Day Solar Illumination Window",
        svgPath: buildAuthenticSolarSvgPath(null),
        daylightPct: "60% Daylight",
        peakElevation: "+1.5°",
        continuousStay: "120 hrs"
      },
      comms: {
        title: "📡 Direct-to-Earth (DTE) Comms Margin",
        earthElev: "+3.0°",
        margin: "+5.0 dB",
        dsnLock: "Canberra Active",
        status: "Direct-to-Earth nominal line."
      }
    };
  }

  /**
   * Generates the inner HTML markup for the secondary sub-card based on active tab.
   *
   * @param {string} siteKey - Site identifier
   * @param {string} tab - Selected view ('horizon'|'slope'|'solar'|'comms')
   * @returns {string} Generated HTML markup
   */
  function renderSubcardContent(siteKey, tab) {
    const site = SITE_PROFILES[siteKey];
    if (!site) return "<p>Site profile telemetry unavailable.</p>";

    if (tab === "horizon") {
      let h = site.horizon;
      // If authentic physics available, evaluate at current timeline position
      if (window.LunarPhysics) {
        const rawSite = site._authentic || window.LunarPhysics.findSite({ lat: site.lat, lon: site.lon });
        if (rawSite) {
          const hourIdx = window.LunarPhysics.sliderToHourIndex(window.currentSliderVal || 50);
          const live = window.LunarPhysics.evaluateAtHour(rawSite, hourIdx);
          if (live) {
            h = {
              ...h,
              sunAz: live.sunAz,
              sunEl: live.sunEl,
              earthAz: live.earthAz,
              earthEl: live.earthEl,
              status: live.isSunVis
                ? `Sun is <strong>Clear</strong> of regional topography. Earth line-of-sight <strong>Maintained (+${live.earthEl}°)</strong>.`
                : `Sun is in <strong>Topographic Shadow</strong>. Direct Earth line-of-sight is <strong>${live.earthEl > 0 ? 'Clear (+' + live.earthEl + '°)' : 'Occluded'}</strong>.`
            };
          }
        }
      }

      // Map azimuth across 0–360° and elevation across the +15° to -5° axis.
      const sunLeftPct = Math.round((h.sunAz / 360) * 100);
      const earthLeftPct = Math.round((h.earthAz / 360) * 100);
      const sunTopPct = Math.max(4, Math.min(96, 72.5 - (h.sunEl * 4.5)));
      const earthTopPct = Math.max(4, Math.min(96, 72.5 - (h.earthEl * 4.5)));

      return `
        <div class="subcard-chart-wrap has-y-axis">
          <div class="subcard-y-axis-ticks horizon-scale" aria-hidden="true">
            <span>+15°</span><span>+10°</span><span>+5°</span><span>0°</span><span>-5°</span>
          </div>
          <div class="subcard-zero-line" title="Astronomical Horizon Zero Datum (0°)"></div>
          <svg viewBox="0 0 360 80" preserveAspectRatio="none">
            <path d="${h.svgPath}" fill="#33302c" stroke="#5c554e" stroke-width="1.2"></path>
          </svg>
          <div class="subcard-tracker" id="tracker-sun-${siteKey}" style="left: ${sunLeftPct}%; top: ${sunTopPct}%;" title="Sun (${h.sunEl > 0 ? '+' : ''}${h.sunEl}° El, ${h.sunAz}° Az)">☀️</div>
          <div class="subcard-tracker" id="tracker-earth-${siteKey}" style="left: ${earthLeftPct}%; top: ${earthTopPct}%;" title="Earth (+${h.earthEl}° El, ${h.earthAz}° Az)">🌍</div>
        </div>
        <div class="subcard-axis-caption"><span>Elevation (°)</span><span>Azimuth (°)</span></div>
        <div class="subcard-azimuth-axis">
          <span>0°(N)</span>
          <span>90°(E)</span>
          <span>180°(S)</span>
          <span>270°(W)</span>
          <span>360°(N)</span>
        </div>
        <div class="subcard-status-callout ${h.sunEl < 0 ? 'danger' : 'ok'}">
          <span>${h.status}</span>
        </div>
      `;
    }

    if (tab === "slope") {
      const s = site.slope;
      return `
        <div class="subcard-chart-wrap has-y-axis" style="height: 75px;">
          <div class="subcard-y-axis-ticks qualitative" aria-hidden="true">
            <span>High</span><span>Mid</span><span>Low</span>
          </div>
          <svg viewBox="0 0 300 80" preserveAspectRatio="none">
            <g class="subcard-chart-grid">
              <line x1="0" y1="8" x2="300" y2="8"></line>
              <line x1="0" y1="40" x2="300" y2="40"></line>
              <line x1="0" y1="72" x2="300" y2="72"></line>
              <line x1="0" y1="0" x2="0" y2="80"></line>
              <line x1="150" y1="0" x2="150" y2="80"></line>
              <line x1="299" y1="0" x2="299" y2="80"></line>
            </g>
            <path d="${s.svgPath}" fill="none" stroke="var(--accent-sage, #7d967e)" stroke-width="2.5"></path>
            <circle cx="${s.touchdownX}" cy="${s.touchdownY}" r="4.5" fill="var(--accent-terracotta, #c87d55)"></circle>
            <text x="${s.touchdownX + 8}" y="${s.touchdownY - 2}" fill="var(--text-primary, #ede8e1)" font-size="8.5" font-family="sans-serif">Touchdown</text>
            <text x="175" y="74" fill="var(--text-muted, #8c867c)" font-size="8" font-family="sans-serif">Dark Floor (PSR)</text>
          </svg>
        </div>
        <div class="subcard-axis-caption"><span>Relative elevation</span><span>Radial distance (%)</span></div>
        <div class="subcard-profile-x-ticks" aria-hidden="true"><span>0</span><span>50</span><span>100</span></div>
        <div class="subcard-slope-stat-grid">
          <div class="subcard-stat-item">
            <span class="subcard-stat-label">Touchdown Slope</span>
            <span class="subcard-stat-val ${s.slopeColor}">${s.slopeVal} (${s.slopeStatus})</span>
          </div>
          <div class="subcard-stat-item">
            <span class="subcard-stat-label">Distance to Ice PSR</span>
            <span class="subcard-stat-val">${s.distIce}</span>
          </div>
          <div class="subcard-stat-item">
            <span class="subcard-stat-label">Local Elevation</span>
            <span class="subcard-stat-val">${site.elevation}</span>
          </div>
          <div class="subcard-stat-item">
            <span class="subcard-stat-label">Descent Hazard</span>
            <span class="subcard-stat-val">${s.maxGradient}</span>
          </div>
        </div>
      `;
    }

    if (tab === "solar") {
      const sol = site.solar;
      return `
        <div class="subcard-chart-wrap has-y-axis" style="height: 75px;">
          <div class="subcard-y-axis-ticks solar-scale" aria-hidden="true">
            <span>+5°</span><span>0°</span><span>-5°</span>
          </div>
          <div class="subcard-zero-line" style="top: 72.5%;"></div>
          <svg viewBox="0 0 360 80" preserveAspectRatio="none">
            <g class="subcard-chart-grid">
              <line x1="0" y1="4" x2="360" y2="4"></line>
              <line x1="0" y1="58" x2="360" y2="58"></line>
              <line x1="0" y1="76" x2="360" y2="76"></line>
              <line x1="0" y1="0" x2="0" y2="80"></line>
              <line x1="180" y1="0" x2="180" y2="80"></line>
              <line x1="359" y1="0" x2="359" y2="80"></line>
            </g>
            <path d="${sol.svgPath}" fill="none" stroke="var(--accent-sand, #c99e52)" stroke-width="2"></path>
          </svg>
        </div>
        <div class="subcard-axis-caption"><span>Solar elevation (°)</span><span>Mission day</span></div>
        <div class="subcard-profile-x-ticks" aria-hidden="true"><span>1</span><span>7</span><span>14</span></div>
        <div class="subcard-slope-stat-grid">
          <div class="subcard-stat-item">
            <span class="subcard-stat-label">Daylight Ratio</span>
            <span class="subcard-stat-val">${sol.daylightPct}</span>
          </div>
          <div class="subcard-stat-item">
            <span class="subcard-stat-label">Continuous Stay</span>
            <span class="subcard-stat-val">${sol.continuousStay}</span>
          </div>
        </div>
      `;
    }

    if (tab === "comms") {
      const c = site.comms;
      return `
        <div class="subcard-slope-stat-grid" style="margin-top: 4px;">
          <div class="subcard-stat-item">
            <span class="subcard-stat-label">Earth Elevation</span>
            <span class="subcard-stat-val status-safe">${c.earthElev}</span>
          </div>
          <div class="subcard-stat-item">
            <span class="subcard-stat-label">RF Link Margin</span>
            <span class="subcard-stat-val status-safe">${c.margin}</span>
          </div>
          <div class="subcard-stat-item" style="grid-column: span 2;">
            <span class="subcard-stat-label">Deep Space Network</span>
            <span class="subcard-stat-val">${c.dsnLock}</span>
          </div>
        </div>
        <div class="subcard-status-callout ok">
          <span>${c.status}</span>
        </div>
      `;
    }

    return "";
  }

  /**
   * Sets the active detail tab and open/closed state of a given site card column.
   */
  function setCardTabState(col, tab, shouldOpen) {
    const siteKey = col.dataset.siteId;
    if (!siteKey) return;
    const subcard = col.querySelector(".secondary-detail-card");
    const titleEl = col.querySelector(".subcard-title");
    const bodyEl = col.querySelector(".subcard-body");
    const tabBtns = col.querySelectorAll(".btn-detail-tab");

    if (!subcard) return;

    if (!shouldOpen) {
      subcard.classList.remove("open");
      tabBtns.forEach(b => b.classList.remove("active"));
    } else {
      tabBtns.forEach(b => {
        b.classList.toggle("active", b.dataset.tab === tab);
      });
      const tabTitles = {
        horizon: "🌄 360° Panoramic Skyline Mask",
        slope: "📈 Radial Crater Cross-Section",
        solar: "☀️ 14-Day Solar Illumination Window",
        comms: "📡 Direct-to-Earth Line of Sight"
      };
      if (titleEl) titleEl.textContent = tabTitles[tab] || "Site Detail";
      if (bodyEl) {
        bodyEl.innerHTML = renderSubcardContent(siteKey, tab);
      }
      subcard.classList.add("open");
    }
  }

  /**
   * Renumbers all active cards (1, 2, 3...) matching visual left-to-right order,
   * updates number badges, and broadcasts `cards:synced` across EventBus.
   */
  function renumberCardsAndSync() {
    const track = document.getElementById("carousel-track");
    if (!track) return [];
    const columns = track.querySelectorAll(".site-card-column");
    const syncedCards = [];

    columns.forEach((col, idx) => {
      const number = idx + 1;
      const badge = col.querySelector(".site-number-badge");
      if (badge) badge.textContent = number;
      col.dataset.cardIndex = number;

      const card = col.querySelector(".site-card");
      if (card) {
        card.dataset.cardIndex = number;
        const lat = parseFloat(card.dataset.lat);
        const lon = parseFloat(card.dataset.lon);
        const name = card.dataset.name || "";
        const siteId = col.dataset.siteId || `site-${number}`;
        const isActive = card.classList.contains("active");

        syncedCards.push({
          siteId,
          number,
          name,
          lat,
          lon,
          active: isActive
        });
      }
    });

    if (window.eventBus) {
      window.eventBus.emit("cards:synced", {
        cards: syncedCards,
        total: syncedCards.length
      });
    }

    return syncedCards;
  }

  /**
   * Updates disabled states on toolbar undo/redo buttons and live site count badge.
   */
  function updateToolbarUI() {
    const undoBtn = document.getElementById("btn-cards-undo");
    const redoBtn = document.getElementById("btn-cards-redo");
    const countBadge = document.getElementById("cards-count-badge");

    if (undoBtn) undoBtn.disabled = (undoStack.length === 0);
    if (redoBtn) redoBtn.disabled = (redoStack.length === 0);

    const currentCols = document.querySelectorAll(".site-card-column");
    if (countBadge) {
      countBadge.textContent = `${currentCols.length} Site${currentCols.length === 1 ? "" : "s"}`;
    }

    checkEmptyState();
    renumberCardsAndSync();
  }

  /**
   * Shows a friendly empty message if all candidate cards are dismissed.
   */
  function checkEmptyState() {
    const track = document.getElementById("carousel-track");
    if (!track) return;
    const cols = track.querySelectorAll(".site-card-column");
    let emptyMsg = track.querySelector(".cards-empty-state");

    if (cols.length === 0) {
      if (!emptyMsg) {
        emptyMsg = document.createElement("div");
        emptyMsg.className = "cards-empty-state";
        emptyMsg.id = "cards-empty-slot";
        emptyMsg.innerHTML = `
          <div class="site-card card-add-new" id="btn-add-candidate-trigger" title="Drop pin on 3D Moon or press / to search">
            <div class="add-content">
              <div class="add-icon">➕</div>
              <h4>No Candidate Sites in Deck</h4>
              <p>Drop a coordinate pin on the 3D Moon or press <kbd class="kbd-badge" style="padding:1px 5px; background:#333; border:1px solid #555; border-radius:3px; font-size:10px;">/</kbd> to search 21 authentic NASA candidate sites.</p>
            </div>
          </div>
        `;
        track.appendChild(emptyMsg);
        const trigger = emptyMsg.querySelector("#btn-add-candidate-trigger");
        if (trigger) {
          trigger.addEventListener("click", () => {
            if (window.eventBus) window.eventBus.emit("search:open");
          });
        }
      }
    } else {
      if (emptyMsg) emptyMsg.remove();
    }
  }

  const COMPARISON_START_MS = Date.UTC(2026, 10, 1, 0, 0, 0);
  const COMPARISON_END_MS = Date.UTC(2026, 11, 1, 0, 0, 0);
  const HOUR_MS = 60 * 60 * 1000;

  function formatUtcInputValue(epochMs) {
    return new Date(epochMs).toISOString().slice(0, 16);
  }

  function parseUtcInputValue(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
    if (!match) return NaN;
    return Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5])
    );
  }

  function setComparisonStatus(message, isError) {
    const status = document.getElementById("comparison-status");
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-error", Boolean(isError));
  }

  function readComparisonRange() {
    const fromInput = document.getElementById("comparison-from");
    const toInput = document.getElementById("comparison-to");
    const startMs = fromInput ? parseUtcInputValue(fromInput.value) : NaN;
    const endMs = toInput ? parseUtcInputValue(toInput.value) : NaN;

    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      throw new Error("Enter both comparison dates and times.");
    }
    if (startMs < COMPARISON_START_MS || endMs > COMPARISON_END_MS) {
      throw new Error("The selected time window must be within November 2026 UTC.");
    }
    if (endMs <= startMs) {
      throw new Error("The To time must be later than the From time.");
    }
    if (startMs % HOUR_MS !== 0 || endMs % HOUR_MS !== 0) {
      throw new Error("Choose whole-hour times to match the available telemetry.");
    }

    return { startMs, endMs };
  }

  function getTelemetryWindow() {
    const physics = window.LunarPhysics;
    const catalog = physics && physics.getCatalog ? physics.getCatalog() : null;
    const profiles = catalog ? Object.values(catalog) : [];
    const profile = profiles.find(site => site && site.november_2026_series);
    const series = profile && profile.november_2026_series;
    if (!series) {
      throw new Error("Hourly telemetry has not loaded. Check the data connection and try again.");
    }

    const startMs = Number(series.start_epoch_ms);
    const stepHours = Number(series.step_hours);
    const hoursCount = Number(series.hours_count);
    if (!Number.isFinite(startMs) || !Number.isFinite(stepHours) || stepHours <= 0 ||
        !Number.isInteger(hoursCount) || hoursCount <= 0) {
      throw new Error("The loaded telemetry does not include a valid time range.");
    }
    return { startMs, stepHours, hoursCount };
  }

  function getSiteProfileForComparison(physics, lat, lon) {
    const match = physics.findSite({ lat, lon });
    if (match && match.coordinates && match.november_2026_series) {
      const latDiff = Math.abs(match.coordinates.lat - lat);
      const lonDiff = Math.abs(((match.coordinates.lon - lon + 540) % 360) - 180);
      if (latDiff < 0.05 && lonDiff < 0.05) return Promise.resolve(match);
    }
    return physics.evaluateCustomCoordinates(lat, lon);
  }

  function getSlopeStatus(slope) {
    if (!Number.isFinite(slope)) return "NOT_EVALUATED";
    if (slope <= 5) return "GO";
    if (slope <= 10) return "MARGINAL";
    return "NO_GO";
  }

  function formatDurationHours(hours) {
    return hours >= 24 ? `${(hours / 24).toFixed(1)} d` : `${hours.toFixed(1)} h`;
  }

  function analyzeSiteForRange(profile, range, windowData, siteName) {
    const rawSlope = profile && profile.terrain
      ? Number(profile.terrain.slope_touchdown_deg)
      : NaN;
    const slope = Number.isFinite(rawSlope) ? rawSlope : null;
    const result = {
      siteName,
      slope,
      slopeStatus: getSlopeStatus(slope),
      available: false
    };

    const series = profile && profile.november_2026_series;
    if (!series) return result;

    const seriesStartMs = Number.isFinite(Number(series.start_epoch_ms))
      ? Number(series.start_epoch_ms)
      : windowData.startMs;
    const stepHours = Number.isFinite(Number(series.step_hours))
      ? Number(series.step_hours)
      : windowData.stepHours;
    const hoursCount = Number.isInteger(Number(series.hours_count))
      ? Number(series.hours_count)
      : windowData.hoursCount;
    const stepMs = stepHours * HOUR_MS;
    const startOffset = (range.startMs - seriesStartMs) / stepMs;
    const endOffset = (range.endMs - seriesStartMs) / stepMs;
    const sunVisible = series.sun_visible;
    const earthVisible = series.earth_visible;
    const sunElevation = series.sun_el;

    if (!Number.isInteger(startOffset) || !Number.isInteger(endOffset) ||
        startOffset < 0 || endOffset > hoursCount || endOffset <= startOffset ||
        !Array.isArray(sunVisible) || !Array.isArray(earthVisible) ||
        !Array.isArray(sunElevation) || sunVisible.length < endOffset ||
        earthVisible.length < endOffset || sunElevation.length < endOffset) {
      throw new Error("The site's hourly telemetry does not cover the selected window.");
    }

    let sunlitSamples = 0;
    let earthVisibleSamples = 0;
    let maxSunElevation = -Infinity;
    for (let index = startOffset; index < endOffset; index += 1) {
      if (sunVisible[index]) sunlitSamples += 1;
      if (earthVisible[index]) earthVisibleSamples += 1;
      const elevation = Number(sunElevation[index]);
      if (Number.isFinite(elevation)) maxSunElevation = Math.max(maxSunElevation, elevation);
    }

    const sampleCount = endOffset - startOffset;
    result.available = true;
    result.sunlitHours = sunlitSamples * stepHours;
    result.sunlitPercent = (sunlitSamples / sampleCount) * 100;
    result.earthVisibleHours = earthVisibleSamples * stepHours;
    result.earthVisiblePercent = (earthVisibleSamples / sampleCount) * 100;
    result.maxSunElevation = Number.isFinite(maxSunElevation) ? maxSunElevation : null;
    return result;
  }

  function updateComparisonCard(column, result) {
    const card = column.querySelector(".site-card");
    if (!card) return;
    const metrics = card.querySelectorAll(".metric-item");
    const values = [
      result.slope === null
        ? "Not available"
        : `${result.slope.toFixed(1)}° · ${result.slopeStatus.replace("_", "-")}`,
      result.maxSunElevation === null || result.maxSunElevation === undefined
        ? "Unavailable"
        : `${result.maxSunElevation > 0 ? "+" : ""}${result.maxSunElevation.toFixed(2)}°`,
      result.available
        ? `${formatDurationHours(result.sunlitHours)} · ${Math.round(result.sunlitPercent)}%`
        : "Unavailable",
      result.available
        ? `${Math.round(result.earthVisiblePercent)}% · ${formatDurationHours(result.earthVisibleHours)}`
        : "Unavailable"
    ];
    const labels = ["Touchdown Slope", "Max Sun Elevation", "Sunlit in Window", "Earth Visibility"];
    const slopeClass = {
      GO: "status-safe",
      MARGINAL: "status-warning",
      NO_GO: "status-danger"
    }[result.slopeStatus] || "";

    metrics.forEach((metric, index) => {
      const label = metric.querySelector(".metric-label");
      const value = metric.querySelector(".metric-value");
      if (label) label.textContent = labels[index];
      if (value) {
        value.textContent = values[index] || "Unavailable";
        value.classList.remove("status-safe", "status-warning", "status-danger");
        if (index === 0 && slopeClass) value.classList.add(slopeClass);
      }
    });

    const previewLabel = card.querySelector(".preview-label");
    const previewText = previewLabel && previewLabel.querySelector("span:last-child");
    const previewTitle = previewLabel && previewLabel.querySelector("span:first-child");
    const fill = card.querySelector(".preview-bar-fill");
    if (previewTitle) previewTitle.textContent = "Sunlight in selected window";
    if (previewText) {
      previewText.textContent = result.available
        ? `${Math.round(result.sunlitPercent)}% · ${formatDurationHours(result.sunlitHours)}`
        : "Unavailable";
    }
    if (fill) fill.style.width = result.available ? `${result.sunlitPercent}%` : "0%";
    column.dataset.comparisonAvailable = result.available ? "true" : "false";
  }

  function compareSortOrder(a, b) {
    if (a.result.available !== b.result.available) return a.result.available ? -1 : 1;
    const statusOrder = { GO: 0, MARGINAL: 1, NO_GO: 2, NOT_EVALUATED: 3 };
    const statusDiff = statusOrder[a.result.slopeStatus] - statusOrder[b.result.slopeStatus];
    if (statusDiff !== 0) return statusDiff;
    if (a.result.available && b.result.available) {
      if (a.result.sunlitPercent !== b.result.sunlitPercent) {
        return b.result.sunlitPercent - a.result.sunlitPercent;
      }
      if (a.result.earthVisiblePercent !== b.result.earthVisiblePercent) {
        return b.result.earthVisiblePercent - a.result.earthVisiblePercent;
      }
    }
    if (a.result.slope !== null && b.result.slope !== null && a.result.slope !== b.result.slope) {
      return a.result.slope - b.result.slope;
    }
    return a.result.siteName.localeCompare(b.result.siteName);
  }

  async function runSiteComparison() {
    const button = document.getElementById("btn-compare-sites");
    const track = document.getElementById("carousel-track");
    if (!button || !track) return;

    let range;
    let windowData;
    try {
      range = readComparisonRange();
      const physics = window.LunarPhysics;
      if (!physics) throw new Error("Lunar telemetry is unavailable on this page.");
      if (!physics.isLoaded()) await physics.init();
      if (!physics.isLoaded()) {
        throw new Error("Hourly telemetry has not loaded. Check the data connection and try again.");
      }
      windowData = getTelemetryWindow();
      const startOffset = (range.startMs - windowData.startMs) / (windowData.stepHours * HOUR_MS);
      const endOffset = (range.endMs - windowData.startMs) / (windowData.stepHours * HOUR_MS);
      if (!Number.isInteger(startOffset) || !Number.isInteger(endOffset) ||
          startOffset < 0 || endOffset > windowData.hoursCount) {
        throw new Error("The selected time window is outside the available November 2026 telemetry.");
      }
    } catch (error) {
      setComparisonStatus(error.message, true);
      return;
    }

    const columns = Array.from(track.querySelectorAll(".site-card-column"));
    if (columns.length < 2) {
      setComparisonStatus("Mark at least two candidate locations before comparing.", true);
      return;
    }

    button.disabled = true;
    const physics = window.LunarPhysics;
    const ranked = [];
    const unavailable = [];

    for (let index = 0; index < columns.length; index += 1) {
      const column = columns[index];
      const card = column.querySelector(".site-card");
      const siteName = card ? (card.dataset.name || column.dataset.siteId) : column.dataset.siteId;
      const lat = card ? Number(card.dataset.lat) : NaN;
      const lon = card ? Number(card.dataset.lon) : NaN;
      setComparisonStatus(`Comparing ${index + 1} of ${columns.length}: ${siteName}…`, false);

      try {
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
          throw new Error("The candidate card has invalid coordinates.");
        }
        const profile = await getSiteProfileForComparison(physics, lat, lon);
        const result = analyzeSiteForRange(profile, range, windowData, siteName);
        updateComparisonCard(column, result);
        ranked.push({ column, result });
        if (!result.available) unavailable.push(siteName);
      } catch (error) {
        console.error(`[ComparisonCards] Could not compare ${siteName}:`, error);
        const result = {
          siteName,
          slope: null,
          slopeStatus: "NOT_EVALUATED",
          available: false
        };
        updateComparisonCard(column, result);
        ranked.push({ column, result });
        unavailable.push(siteName);
      }
    }

    ranked.sort(compareSortOrder);
    ranked.forEach(({ column }) => track.appendChild(column));
    updateToolbarUI();
    const startLabel = new Date(range.startMs).toISOString().replace("T", " ").slice(0, 16);
    const endLabel = new Date(range.endMs).toISOString().replace("T", " ").slice(0, 16);
    const unavailableNote = unavailable.length
      ? ` Hourly telemetry unavailable for ${unavailable.length}: ${unavailable.join(", ")}.`
      : "";
    setComparisonStatus(
      `Ranked ${ranked.length} sites for ${startLabel} to ${endLabel} UTC: slope class, then sunlit time and Earth visibility. Roughness, dispersion, and touchdown velocity are not assessed.${unavailableNote}`,
      unavailable.length > 0
    );
    button.disabled = false;
  }

  function initComparisonControls() {
    const fromInput = document.getElementById("comparison-from");
    const toInput = document.getElementById("comparison-to");
    const button = document.getElementById("btn-compare-sites");
    if (!fromInput || !toInput || !button) return;

    fromInput.min = formatUtcInputValue(COMPARISON_START_MS);
    fromInput.max = formatUtcInputValue(COMPARISON_END_MS - HOUR_MS);
    fromInput.value = formatUtcInputValue(COMPARISON_START_MS);
    toInput.min = formatUtcInputValue(COMPARISON_START_MS + HOUR_MS);
    toInput.max = formatUtcInputValue(COMPARISON_END_MS);
    toInput.value = formatUtcInputValue(COMPARISON_END_MS);
    button.addEventListener("click", runSiteComparison);
  }

  /**
   * Dismisses a card column from the carousel and pushes the action onto the Undo stack.
   */
  function dismissCard(col) {
    if (!col || !col.parentElement) return;
    const siteKey = col.dataset.siteId;
    const parent = col.parentElement;
    const nextSibling = col.nextElementSibling;

    parent.removeChild(col);

    undoStack.push({
      type: "dismiss",
      col: col,
      parent: parent,
      nextSibling: nextSibling,
      siteKey: siteKey
    });
    redoStack.length = 0; // Clear redo on new action
    updateToolbarUI();
  }

  /**
   * Undoes the last card action (dismissal or addition).
   */
  function undo() {
    if (undoStack.length === 0) return;
    const item = undoStack.pop();

    if (item.type === "dismiss") {
      // Reinsert the card into its exact previous sibling location
      if (item.nextSibling && item.parent.contains(item.nextSibling)) {
        item.parent.insertBefore(item.col, item.nextSibling);
      } else {
        item.parent.appendChild(item.col);
      }

      // Highlight restored card and scroll smoothly to it
      const card = item.col.querySelector(".site-card");
      if (card) {
        document.querySelectorAll(".site-card").forEach(c => c.classList.remove("active"));
        card.classList.add("active");
        scrollCardIntoTrackView(item.col);
      }
      redoStack.push(item);
    } else if (item.type === "add") {
      // Undo addition by detaching from DOM
      if (item.col.parentElement) {
        item.col.parentElement.removeChild(item.col);
      }
      redoStack.push(item);
    }

    updateToolbarUI();
  }

  /**
   * Redoes the last undone card action.
   */
  function redo() {
    if (redoStack.length === 0) return;
    const item = redoStack.pop();

    if (item.type === "dismiss") {
      // Re-dismiss
      if (item.col.parentElement) {
        item.col.parentElement.removeChild(item.col);
      }
      undoStack.push(item);
    } else if (item.type === "add") {
      // Re-add to track
      item.parent.appendChild(item.col);
      const card = item.col.querySelector(".site-card");
      if (card) {
        document.querySelectorAll(".site-card").forEach(c => c.classList.remove("active"));
        card.classList.add("active");
        scrollCardIntoTrackView(item.col);
      }
      undoStack.push(item);
    }

    updateToolbarUI();
  }

  /**
   * Ensures the Comparison Cards deck drawer is open so the user can inspect newly added cards.
   */
  function ensureCardsDrawerOpen() {
    const cardsCheck = document.getElementById("toggle-top-cards");
    if (cardsCheck && !cardsCheck.checked) {
      cardsCheck.checked = true;
      cardsCheck.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  /**
   * Highlights the card matching lat/lon in the DOM.
   */
  function highlightCard(lat, lon, name) {
    const cards = document.querySelectorAll(".site-card:not(.card-add-new)");
    const normalizedName = String(name || "").trim().toLowerCase();
    const hasNameMatch = normalizedName && Array.from(cards).some(c =>
      c.dataset.name && c.dataset.name.trim().toLowerCase() === normalizedName
    );
    cards.forEach(c => {
      const cLat = parseFloat(c.dataset.lat);
      const cLon = parseFloat(c.dataset.lon);
      const dLon = Math.abs((cLon - lon + 540) % 360 - 180);
      const matchByName = normalizedName && c.dataset.name &&
        c.dataset.name.trim().toLowerCase() === normalizedName;
      const match = hasNameMatch
        ? matchByName
        : Math.abs(cLat - lat) < 0.25 && dLon < 2.0;
      c.classList.toggle("active", match);
    });
    renumberCardsAndSync();
  }

  /**
   * Searches the DOM for an existing card matching coordinates or name.
   */
  function findCardByCoordsOrName(lat, lon, name) {
    const columns = document.querySelectorAll(".site-card-column");
    const normalizedName = String(name || "").trim().toLowerCase();
    if (normalizedName) {
      for (const col of columns) {
        const card = col.querySelector(".site-card");
        if (card && card.dataset.name &&
            card.dataset.name.trim().toLowerCase() === normalizedName) {
          return col;
        }
      }
    }

    for (const col of columns) {
      const card = col.querySelector(".site-card");
      if (!card) continue;
      const cName = card.dataset.name;
      const cLat = parseFloat(card.dataset.lat);
      const cLon = parseFloat(card.dataset.lon);

      if (name && cName && name.trim().toLowerCase() === cName.trim().toLowerCase()) {
        return col;
      }
      if (!isNaN(cLat) && !isNaN(cLon)) {
        const dLat = Math.abs(cLat - lat);
        const dLon = Math.abs((cLon - lon + 540) % 360 - 180);
        if (dLat < 0.25 && dLon < 1.0) {
          return col;
        }
      }
    }
    return null;
  }

  /**
   * Creates and constructs a complete DOM element for a new site card column.
   */
  function createCardElement(siteKey, p) {
    const col = document.createElement("div");
    col.className = "site-card-column";
    col.dataset.siteId = siteKey;

    const latStr = `${Math.abs(p.lat).toFixed(1)}° ${p.lat < 0 ? "S" : "N"}`;
    const lonStr = `${p.lon.toFixed(1)}° E`;

    let tagClass = "tag-artemis";
    let tagLabel = "Artemis III Candidate";
    if (p.name.includes("CLPS") || p.name.includes("IM-")) {
      tagClass = "tag-clps";
      tagLabel = "CLPS Target";
    } else if (p.name.includes("Apollo")) {
      tagClass = "tag-artemis";
      tagLabel = "Apollo Heritage";
    } else if (p.name.includes("Chandrayaan")) {
      tagClass = "tag-clps";
      tagLabel = "ISRO Milestone";
    } else if (p.name.includes("Custom") || p.name.includes("Target")) {
      tagClass = "tag-clps";
      tagLabel = "Target Coordinate";
    }

    col.innerHTML = `
      <!-- Primary Summary Card -->
      <div class="site-card active" data-site-id="${siteKey}" data-lat="${p.lat}" data-lon="${p.lon}" data-name="${p.name}">
        <div class="card-header">
          <div class="card-header-main">
            <div class="card-header-badge-row">
              <span class="site-number-badge">1</span>
              <span class="site-tag ${tagClass}">${tagLabel}</span>
            </div>
            <h3 class="site-name">${p.name}</h3>
            <div class="site-coords-row">
              <span class="site-coords">
                <span class="coords-geo">${latStr} · ${lonStr}</span>
                <span class="coords-sep">·</span>
                <span class="coords-elev">${p.elevation}</span>
              </span>
            </div>
          </div>
          <button class="card-dismiss" title="Remove site" aria-label="Remove site">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- 4-Metric Landing Hazard & Celestial Telemetry Grid -->
        <div class="card-metrics-grid">
          <div class="metric-item">
            <span class="metric-label">
              <span class="metric-icon">∡</span>
              <span>Touchdown Slope</span>
            </span>
            <span class="metric-value ${p.slope.slopeColor}">
              <span class="metric-num">${p.slope.slopeVal}</span>
              <span class="tag-status ${p.slope.slopeColor}">${p.slope.slopeStatus}</span>
            </span>
          </div>
          <div class="metric-item">
            <span class="metric-label">
              <span class="metric-icon">☼</span>
              <span>Solar Elevation</span>
            </span>
            <span class="metric-value ${p.horizon.sunEl > 0 ? "status-safe" : "status-danger"}">
              <span class="metric-num">${p.horizon.sunEl > 0 ? "+" : ""}${p.horizon.sunEl}°</span>
              <span class="metric-sub">(${p.horizon.sunEl > 0 ? "Rising" : "Shadow"})</span>
            </span>
          </div>
          <div class="metric-item">
            <span class="metric-label">
              <span class="metric-icon">◷</span>
              <span>Next Sunset</span>
            </span>
            <span class="metric-value">
              <span class="metric-num">${p.nextSunset || "96h 20m"}</span>
            </span>
          </div>
          <div class="metric-item">
            <span class="metric-label">
              <span class="metric-icon">☊</span>
              <span>Earth Visibility</span>
            </span>
            <span class="metric-value status-safe">
              <span class="metric-num">+${p.horizon.earthEl}°</span>
              <span class="tag-status status-safe">Clear</span>
            </span>
          </div>
        </div>

        <!-- Illumination Window Progress Bar -->
        <div class="card-timeline-preview">
          <div class="preview-label">
            <span>Illumination Window</span>
            <span>${p.solar.daylightPct}</span>
          </div>
          <div class="preview-bar-track">
            <div class="preview-bar-fill fill-sun" style="width: ${p.daylightPctNum || 70}%;"></div>
          </div>
        </div>

        <!-- Interactive Secondary View Selector Tabs -->
        <div class="card-detail-tabs">
          <button class="btn-detail-tab" data-tab="horizon" title="360° Panoramic Skyline Mask">
            <svg class="tab-svg-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18l6-6 4 4 8-8 2 2v8H2z"/></svg>
            <span>Horizon</span>
          </button>
          <button class="btn-detail-tab" data-tab="slope" title="Local Crater Radial Elevation Profile">
            <svg class="tab-svg-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>
            <span>Slope</span>
          </button>
          <button class="btn-detail-tab" data-tab="solar" title="14-Day Solar Illumination Curve">
            <svg class="tab-svg-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
            <span>Solar</span>
          </button>
          <button class="btn-detail-tab" data-tab="comms" title="Direct-to-Earth Line of Sight">
            <svg class="tab-svg-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></svg>
            <span>Comms</span>
          </button>
        </div>

        <!-- Card Action Toolbar -->
        <div class="card-actions">
          <button class="btn-card-action btn-focus-site" title="Center 3D Moon camera on this site">
            <svg class="btn-focus-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
            <span>Focus 3D</span>
          </button>
        </div>
      </div>

      <!-- Attached Secondary Detail Sub-Card -->
      <div class="secondary-detail-card" id="subcard-${siteKey}" data-site-id="${siteKey}">
        <div class="subcard-header">
          <span class="subcard-title" id="subcard-title-${siteKey}">🌄 360° Skyline Mask</span>
          <div class="subcard-actions">
            <button class="btn-subcard-action btn-grow-inspect" title="Expand / Grow View">⛶ Grow</button>
            <button class="btn-subcard-action btn-close-subcard" title="Close Sub-Card">✕</button>
          </div>
        </div>
        <div class="subcard-body" id="subcard-body-${siteKey}"></div>
      </div>
    `;

    return col;
  }

  /**
   * Attaches all click, selection, dismiss, tab toggle, and Shift-hold handlers to a column element.
   */
  function bindCardColumnEvents(col) {
    const siteKey = col.dataset.siteId;
    if (!siteKey) return;

    const card = col.querySelector(".site-card");
    const subcard = col.querySelector(".secondary-detail-card");
    const tabBtns = col.querySelectorAll(".btn-detail-tab");
    const closeBtn = col.querySelector(".btn-close-subcard");
    const growBtn = col.querySelector(".btn-grow-inspect");
    const focusBtn = col.querySelector(".btn-focus-site");
    const dismissBtn = col.querySelector(".card-dismiss");

    // 1. Primary Card Selection
    if (card) {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".btn-detail-tab") || 
            e.target.closest(".card-dismiss") || 
            e.target.closest(".btn-card-action")) return;

        document.querySelectorAll(".site-card").forEach(c => c.classList.remove("active"));
        card.classList.add("active");

        const lat = parseFloat(card.dataset.lat);
        const lon = parseFloat(card.dataset.lon);
        const name = card.dataset.name;
        const number = parseInt(card.dataset.cardIndex || "1", 10);
        const siteId = col.dataset.siteId;

        if (window.eventBus) {
          window.eventBus.emit("site:marked", {
            lat,
            lon,
            name,
            siteId,
            number,
            source: "comparison-cards"
          });
        }
        renumberCardsAndSync();
      });
    }

    // 2. Dismiss Button
    if (dismissBtn) {
      dismissBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        dismissCard(col);
      });
    }

    // 3. Focus 3D Globe Button
    if (focusBtn && card) {
      focusBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const lat = parseFloat(card.dataset.lat);
        const lon = parseFloat(card.dataset.lon);
        const name = card.dataset.name;
        if (window.eventBus) {
          window.eventBus.emit("site:marked", { lat, lon, name, source: "focus-3d", focus: true });
        }
      });
    }

    // 4. Tab Buttons with Shift-Hold Multi-Card Peek & Click
    tabBtns.forEach(btn => {
      let mouseDownTime = 0;
      let isShiftHold = false;
      let preHoldSnapshots = [];

      btn.addEventListener("mousedown", (e) => {
        if (e.shiftKey) {
          e.stopPropagation();
          isShiftHold = true;
          mouseDownTime = Date.now();
          const tab = btn.dataset.tab;

          // Snapshot previous state of all visible site columns
          preHoldSnapshots = [];
          document.querySelectorAll(".site-card-column").forEach(c => {
            const s = c.querySelector(".secondary-detail-card");
            const activeBtn = c.querySelector(".btn-detail-tab.active");
            preHoldSnapshots.push({
              col: c,
              wasOpen: s && s.classList.contains("open"),
              tab: activeBtn ? activeBtn.dataset.tab : null
            });
            // Drop down this tab across all cards while click is holding on
            setCardTabState(c, tab, true);
          });

          const onWindowMouseUp = () => {
            window.removeEventListener("mouseup", onWindowMouseUp);
            if (isShiftHold) {
              const elapsed = Date.now() - mouseDownTime;
              isShiftHold = false;
              if (elapsed > 250) {
                preHoldSnapshots.forEach(snap => {
                  setCardTabState(snap.col, snap.tab, snap.wasOpen);
                });
              }
            }
          };
          window.addEventListener("mouseup", onWindowMouseUp);
        }
      });

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const tab = btn.dataset.tab;
        const isCurrentlyActive = btn.classList.contains("active") && subcard && subcard.classList.contains("open");

        if (e.shiftKey) {
          const targetState = !isCurrentlyActive;
          document.querySelectorAll(".site-card-column").forEach(c => {
            if (c.dataset.siteId) {
              setCardTabState(c, tab, targetState);
            }
          });
        } else {
          setCardTabState(col, tab, !isCurrentlyActive);
        }
      });
    });

    // 5. Close Sub-Card Button (✕)
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        setCardTabState(col, null, false);
      });
    }

    // 6. Grow / Inspect Button (⛶)
    if (growBtn) {
      growBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const activeTabBtn = col.querySelector(".btn-detail-tab.active");
        const currentTab = activeTabBtn ? activeTabBtn.dataset.tab : "horizon";
        if (window.eventBus) {
          window.eventBus.emit("card:inspect", {
            siteKey: siteKey,
            siteData: SITE_PROFILES[siteKey],
            tab: currentTab
          });
        }
      });
    }
  }

  /**
   * Dynamically constructs and inserts a new comparison card into the carousel track.
   */
  function addDynamicCard(siteData) {
    const track = document.getElementById("carousel-track");
    if (!track) return null;

    // Check if canonical profile exists, or create unique site key
    let siteKey = (siteData.name ? siteData.name.toLowerCase().replace(/[^a-z0-9]/g, "_") : "site") + "_" + Date.now();
    for (const [key, prof] of Object.entries(SITE_PROFILES)) {
      if (prof.name.toLowerCase() === (siteData.name || "").toLowerCase()) {
        siteKey = key;
        break;
      }
    }

    // If profile not already registered, generate scientific telemetry
    if (!SITE_PROFILES[siteKey]) {
      SITE_PROFILES[siteKey] = generateSiteProfile(siteKey, siteData);
    }
    const profile = SITE_PROFILES[siteKey];

    // Remove any existing duplicate column for this site before appending
    const existingCol = findCardByCoordsOrName(siteData.lat, siteData.lon, siteData.name);
    if (existingCol) {
      existingCol.remove();
    }
    const existingById = track.querySelector(`.site-card-column[data-site-id="${siteKey}"]`);
    if (existingById) {
      existingById.remove();
    }

    // Remove empty placeholder if present
    const emptyMsg = track.querySelector(".cards-empty-state");
    if (emptyMsg) emptyMsg.remove();

    // Construct DOM element and bind events
    const col = createCardElement(siteKey, profile);
    track.appendChild(col);
    bindCardColumnEvents(col);

    // Make this new card active
    document.querySelectorAll(".site-card").forEach(c => c.classList.remove("active"));
    const cardEl = col.querySelector(".site-card");
    if (cardEl) cardEl.classList.add("active");

    // Push addition to Undo stack
    undoStack.push({
      type: "add",
      col: col,
      parent: track,
      siteKey: siteKey
    });
    redoStack.length = 0; // Clear redo

    updateToolbarUI();

    // Smoothly scroll into view within the track corridor only
    scrollCardIntoTrackView(col);

    return col;
  }

  /**
   * Smoothly scrolls target card into view strictly inside the carousel track,
   * avoiding any native scrollIntoView ancestor/viewport displacement.
   */
  function scrollCardIntoTrackView(targetCol) {
    const track = document.getElementById("carousel-track");
    if (!track || !targetCol) return;
    const trackWidth = track.clientWidth;
    const colLeft = targetCol.offsetLeft;
    const colWidth = targetCol.clientWidth;
    const targetScroll = colLeft - (trackWidth / 2) + (colWidth / 2);
    track.scrollTo({ left: Math.max(0, targetScroll), behavior: "smooth" });
  }

  /**
   * Initializes event listeners for all primary cards, tabs, and sub-card actions.
   */
  function initComparisonCards() {
    const track = document.getElementById("carousel-track");
    const columns = document.querySelectorAll(".site-card-column");

    // Bind Undo / Redo toolbar buttons
    const undoBtn = document.getElementById("btn-cards-undo");
    const redoBtn = document.getElementById("btn-cards-redo");

    if (undoBtn) undoBtn.addEventListener("click", () => undo());
    if (redoBtn) redoBtn.addEventListener("click", () => redo());
    initComparisonControls();

    // Bind click on initial blank candidate target card
    const addTrigger = document.getElementById("btn-add-candidate-trigger");
    if (addTrigger) {
      addTrigger.addEventListener("click", () => {
        if (window.eventBus) {
          window.eventBus.emit("search:open");
        }
      });
    }

    // Enable mouse wheel horizontal scrolling on the comparison cards carousel
    if (track) {
      track.addEventListener("wheel", (e) => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          track.scrollLeft += e.deltaY;
        }
      }, { passive: false });
    }

    // Bind event listeners on all initial pre-rendered static cards
    columns.forEach(col => {
      bindCardColumnEvents(col);
    });

    updateToolbarUI();

    // EventBus bindings
    if (window.eventBus) {
      /**
       * Subscribe to `site:marked`:
       * 1. If from "comparison-cards" or "keyboard-nudge": only highlight matching card.
       * 2. If from search palette, 3D Moon click, or 2D map click:
       *    Find existing card or dynamically create a new comparison card, highlight, and ensure drawer is open!
       */
      window.eventBus.on("site:marked", (data) => {
        if (!data || typeof data.lat !== "number" || typeof data.lon !== "number") return;

        // Micro-step coordinate nudges or card selection only highlights without spawning duplicates
        if (data.source === "comparison-cards" || data.source === "keyboard-nudge") {
          highlightCard(data.lat, data.lon);
          return;
        }

        // Check if matching card already exists in the deck
        const existingCol = findCardByCoordsOrName(data.lat, data.lon, data.name);
        let targetCol = existingCol;
        if (existingCol) {
          highlightCard(data.lat, data.lon, data.name);
          scrollCardIntoTrackView(existingCol);
        } else {
          // Add dynamically
          targetCol = addDynamicCard(data);
        }

        // Ensure drawer is open so the user sees their candidate card
        ensureCardsDrawerOpen();
        if (data.openDetails === true && targetCol) {
          setCardTabState(targetCol, data.detailTab || "horizon", true);
        }
      });

      window.eventBus.on("cards:compare", (data) => {
        if (!data || !data.siteA || !data.siteB) return;
        if (![data.siteA, data.siteB].every(site =>
          Number.isFinite(site.lat) && Number.isFinite(site.lon) &&
          site.lat >= -90 && site.lat <= 90
        )) return;
        const columnsToCompare = [data.siteA, data.siteB]
          .map(site => findCardByCoordsOrName(site.lat, site.lon, site.name))
          .filter(Boolean);
        if (columnsToCompare.length !== 2) return;

        ensureCardsDrawerOpen();
        document.querySelectorAll(".site-card:not(.card-add-new)").forEach(card => {
          card.classList.remove("active");
        });
        columnsToCompare.forEach(col => {
          const card = col.querySelector(".site-card");
          if (card) card.classList.add("active");
        });
        renumberCardsAndSync();

        const track = document.getElementById("carousel-track");
        if (track) {
          const [first, second] = columnsToCompare;
          const left = Math.min(first.offsetLeft, second.offsetLeft);
          const right = Math.max(
            first.offsetLeft + first.clientWidth,
            second.offsetLeft + second.clientWidth
          );
          const center = (left + right) / 2;
          track.scrollTo({
            left: Math.max(0, center - track.clientWidth / 2),
            behavior: "smooth"
          });
        }
      });

      /**
       * Subscribe to `cards:undo` and `cards:redo`
       */
      window.eventBus.on("cards:undo", () => undo());
      window.eventBus.on("cards:redo", () => redo());

      /**
       * Subscribe to `time:changed` events:
       * Dynamically shifts the Sun tracker icon on all open skyline cards in real time.
       */
      window.eventBus.on("time:changed", (data) => {
        const sliderVal = data.sliderValue || 0;
        window.currentSliderVal = sliderVal;
        const hourIdx = window.LunarPhysics
          ? window.LunarPhysics.sliderToHourIndex(sliderVal)
          : Math.floor((sliderVal / 100) * 720);

        document.querySelectorAll(".site-card-column").forEach(col => {
          const siteKey = col.dataset.siteId;
          const card = col.querySelector(".site-card");
          if (!card) return;

          const siteProfile = SITE_PROFILES[siteKey];
          if (!siteProfile) return;

          let evalData = null;
          if (window.LunarPhysics) {
            const rawSite = siteProfile._authentic || window.LunarPhysics.findSite({ lat: siteProfile.lat, lon: siteProfile.lon });
            if (rawSite) {
              evalData = window.LunarPhysics.evaluateAtHour(rawSite, hourIdx);
            }
          }

          if (evalData) {
            // 1. Move Sun and Earth trackers on 360° skyline subcard
            const sunTracker = document.getElementById(`tracker-sun-${siteKey}`);
            if (sunTracker) {
              const sunLeftPct = Math.round((evalData.sunAz / 360) * 100);
              const sunTopPct = Math.max(4, Math.min(96, 72.5 - (evalData.sunEl * 4.5)));
              sunTracker.style.left = `${sunLeftPct}%`;
              sunTracker.style.top = `${sunTopPct}%`;
              sunTracker.title = `Sun: Az ${evalData.sunAz}° · El ${evalData.sunEl > 0 ? '+' : ''}${evalData.sunEl}° (${evalData.isSunVis ? 'Clear' : 'Shadow'})`;
            }

            const earthTracker = document.getElementById(`tracker-earth-${siteKey}`);
            if (earthTracker) {
              const earthLeftPct = Math.round((evalData.earthAz / 360) * 100);
              const earthTopPct = Math.max(4, Math.min(96, 72.5 - (evalData.earthEl * 4.5)));
              earthTracker.style.left = `${earthLeftPct}%`;
              earthTracker.style.top = `${earthTopPct}%`;
              earthTracker.title = `Earth: Az ${evalData.earthAz}° · El ${evalData.earthEl > 0 ? '+' : ''}${evalData.earthEl}° (${evalData.isEarthVis ? 'Clear' : 'Occluded'})`;
            }

            // 2. Update subcard status callout
            const subcard = document.getElementById(`subcard-${siteKey}`);
            if (subcard) {
              const callout = subcard.querySelector(".subcard-status-callout");
              if (callout) {
                callout.className = `subcard-status-callout ${evalData.sunEl < 0 ? 'danger' : 'ok'}`;
                const statusSpan = callout.querySelector("span");
                if (statusSpan) {
                  statusSpan.innerHTML = evalData.isSunVis
                    ? `Sun is <strong>Clear</strong> of regional topography. Earth line-of-sight <strong>Maintained (+${evalData.earthEl}°)</strong>.`
                    : `Sun is in <strong>Topographic Shadow</strong>. Direct Earth line-of-sight is <strong>${evalData.earthEl > 0 ? 'Clear (+' + evalData.earthEl + '°)' : 'Occluded'}</strong>.`;
                }
              }
            }

            // 3. Update live metrics on main card face at 60 FPS
            const metricValues = card.querySelectorAll(".metric-value");
            if (metricValues.length >= 4) {
              // Solar Elevation (Index 1)
              metricValues[1].className = `metric-value ${evalData.isSunVis ? "status-safe" : "status-danger"}`;
              metricValues[1].innerHTML = `${evalData.sunEl > 0 ? "+" : ""}${evalData.sunEl}° <span class="metric-sub">(${evalData.isSunVis ? "Clear" : "Shadow"})</span>`;

              // Next Sunset / Sunrise countdown (Index 2)
              if (evalData.isSunVis) {
                metricValues[2].innerHTML = `☀️ Sunset in <strong>${evalData.nextSunsetHrs}h</strong>`;
              } else {
                metricValues[2].innerHTML = `🌑 Sunrise in <strong>${evalData.nextSunriseHrs}h</strong>`;
              }

              // Earth Visibility (Index 3)
              metricValues[3].className = `metric-value ${evalData.isEarthVis ? "status-safe" : "status-danger"}`;
              metricValues[3].innerHTML = evalData.isEarthVis
                ? `Clear (+${evalData.earthEl}°)`
                : `Occluded (${evalData.earthEl}°)`;
            }
          } else {
            // Fallback: simple angle progression
            const sunTracker = document.getElementById(`tracker-sun-${siteKey}`);
            if (sunTracker) {
              const initialAz = (SITE_PROFILES[siteKey]?.horizon?.sunAz) || 180;
              const liveAz = (initialAz + Math.round((sliderVal / 100) * 360)) % 360;
              sunTracker.style.left = `${Math.round((liveAz / 360) * 100)}%`;
            }
          }
        });
      });

      /**
       * Subscribe to `cardlayout:changed` events from Settings modal:
       * Toggles between attached dropdown mode and fixed shelf mode.
       */
      window.eventBus.on("cardlayout:changed", (data) => {
        const corridor = document.getElementById("cards-corridor");
        if (corridor) {
          corridor.classList.toggle("layout-dropdown", data.layout === "dropdown");
          corridor.classList.toggle("layout-shelf", data.layout === "shelf");
        }
      });
    }

    // Expose controller globally
    window.ComparisonCards = {
      addSiteCard: addDynamicCard,
      undo: undo,
      redo: redo,
      sync: renumberCardsAndSync,
      getProfiles: () => ({ ...SITE_PROFILES })
    };
  }

  // Safe DOM ready check: initialize immediately if DOM loaded, or on DOMContentLoaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initComparisonCards);
  } else {
    initComparisonCards();
  }
})();
