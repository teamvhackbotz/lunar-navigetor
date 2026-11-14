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
   * Site-specific scientific profiles for candidate landing sites.
   * Defines distinctive terrain silhouettes, slope profiles, solar illumination,
   * and line-of-sight communications telemetry.
   */
  const SITE_PROFILES = {
    shackleton: {
      name: "Peak Near Shackleton",
      lat: -89.6,
      lon: 129.2,
      elevation: "+1,240 m",
      nextSunset: "112h 40m",
      daylightPctNum: 88,
      horizon: {
        title: "🌄 360° Panoramic Skyline Mask",
        svgPath: "M0,50 L25,45 L50,38 L75,22 L100,44 L135,48 L170,36 L205,28 L230,18 L255,40 L285,48 L320,38 L345,30 L360,50 L360,80 L0,80 Z",
        sunAz: 162,
        sunEl: 1.4,
        earthAz: 259,
        earthEl: 3.1,
        status: "Sun is <strong>Clear</strong> of eastern rim crest. Earth line-of-sight <strong>Nominal</strong>."
      },
      slope: {
        title: "📈 Local Crater Radial Cross-Section",
        svgPath: "M0,48 Q60,45 100,32 T180,68 T300,76",
        touchdownX: 100,
        touchdownY: 32,
        slopeVal: "4.2°",
        slopeStatus: "Safe",
        slopeColor: "status-safe",
        distIce: "1.8 km",
        maxGradient: "18.4° (PSR Descent)"
      },
      solar: {
        title: "☀️ 14-Day Solar Illumination Window",
        svgPath: "M0,60 Q90,15 180,20 T360,65",
        daylightPct: "88% Daylight",
        peakElevation: "+1.9° (Dec 16)",
        continuousStay: "144 hrs uninterrupted"
      },
      comms: {
        title: "📡 Direct-to-Earth (DTE) Comms Margin",
        earthElev: "+3.1° (Above Horizon)",
        margin: "+6.2 dB (High Gain)",
        dsnLock: "Canberra / Goldstone Active",
        status: "Unblocked line-of-sight during positive libration."
      }
    },

    ridge: {
      name: "Connecting Ridge",
      lat: -89.4,
      lon: 222.6,
      elevation: "+980 m",
      nextSunset: "74h 10m",
      daylightPctNum: 68,
      horizon: {
        title: "🌄 360° Panoramic Skyline Mask",
        svgPath: "M0,45 L35,42 L70,36 L105,32 L140,40 L180,34 L215,26 L245,30 L280,44 L315,36 L340,32 L360,45 L360,80 L0,80 Z",
        sunAz: 138,
        sunEl: 0.8,
        earthAz: 242,
        earthEl: 1.9,
        status: "Sun is <strong>Grazing</strong> ridge crest. Earth line-of-sight <strong>Maintained</strong>."
      },
      slope: {
        title: "📈 Local Crater Radial Cross-Section",
        svgPath: "M0,44 Q60,40 100,36 T180,58 T300,68",
        touchdownX: 100,
        touchdownY: 36,
        slopeVal: "5.8°",
        slopeStatus: "Moderate",
        slopeColor: "status-warning",
        distIce: "2.4 km",
        maxGradient: "11.2° (Saddle Flank)"
      },
      solar: {
        title: "☀️ 14-Day Solar Illumination Window",
        svgPath: "M0,65 Q90,30 180,32 T360,72",
        daylightPct: "68% Daylight",
        peakElevation: "+1.4° (Dec 14)",
        continuousStay: "96 hrs uninterrupted"
      },
      comms: {
        title: "📡 Direct-to-Earth (DTE) Comms Margin",
        earthElev: "+1.9° (Low Angle)",
        margin: "+4.1 dB (Nominal)",
        dsnLock: "Goldstone Active",
        status: "Terrain ridges may cause minor diffraction at azimuth 230°."
      }
    },

    malapert: {
      name: "Malapert Massif",
      lat: -85.9,
      lon: 2.9,
      elevation: "+5,020 m",
      nextSunset: "28h 15m",
      daylightPctNum: 52,
      horizon: {
        title: "🌄 360° Panoramic Skyline Mask",
        svgPath: "M0,58 L40,54 L80,46 L110,20 L135,12 L160,26 L200,42 L240,48 L275,34 L310,24 L340,46 L360,58 L360,80 L0,80 Z",
        sunAz: 210,
        sunEl: -0.2,
        earthAz: 182,
        earthEl: 5.4,
        status: "Sun is in <strong>Shadow</strong>. Earth elevation is <strong>Superior (+5.4°)</strong>."
      },
      slope: {
        title: "📈 Local Crater Radial Cross-Section",
        svgPath: "M0,30 Q60,32 100,44 T180,72 T300,78",
        touchdownX: 100,
        touchdownY: 44,
        slopeVal: "8.1°",
        slopeStatus: "Steep",
        slopeColor: "status-danger",
        distIce: "4.8 km",
        maxGradient: "22.6° (Massif Escarpment)"
      },
      solar: {
        title: "☀️ 14-Day Solar Illumination Window",
        svgPath: "M0,75 Q90,40 180,25 T360,78",
        daylightPct: "52% Daylight",
        peakElevation: "+2.6° (Dec 18)",
        continuousStay: "72 hrs (Shadowed early cycle)"
      },
      comms: {
        title: "📡 Direct-to-Earth (DTE) Comms Margin",
        earthElev: "+5.4° (High Elevation)",
        margin: "+9.8 dB (High SNR)",
        dsnLock: "Canberra / Madrid / Goldstone",
        status: "Outstanding uninterrupted telecommunications vantage point."
      }
    }
  };

  // Undo / Redo stacks
  const undoStack = [];
  const redoStack = [];

  /**
   * Generates a realistic skyline SVG silhouette path based on coordinates seed.
   */
  function generateSkylinePath(lat, lon) {
    const pts = [];
    const base = 48;
    for (let x = 0; x <= 360; x += 25) {
      const y = Math.round(base - Math.sin((x + lon * 2) * 0.05) * 16 - Math.cos((x * 2 + lat * 3) * 0.03) * 12);
      const clampedY = Math.max(12, Math.min(65, y));
      pts.push(`L${x},${clampedY}`);
    }
    pts[0] = pts[0].replace("L0,", "M0,");
    pts.push("L360,80 L0,80 Z");
    return pts.join(" ");
  }

  /**
   * Generates a crater radial slope cross-section SVG path based on coordinates seed.
   */
  function generateSlopePath(lat, lon) {
    const y1 = Math.round(42 + Math.sin(lat * 0.5) * 8);
    const y2 = Math.round(34 + Math.cos(lon * 0.4) * 6);
    const y3 = Math.round(66 + Math.sin(lat + lon) * 8);
    return `M0,${y1} Q60,${y1 - 4} 100,${y2} T180,${y3} T300,76`;
  }

  /**
   * Generates a 14-day solar illumination curve SVG path based on coordinates seed.
   */
  function generateSolarPath(lat, lon) {
    const peak = Math.round(16 + Math.abs(Math.sin(lon * 0.08)) * 24);
    return `M0,66 Q90,${peak} 180,${peak + 4} T360,70`;
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
          svgPath: generateSolarPath(lat, lon),
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

    // Fallback if physics module not loaded
    const elevVal = Math.round(750 + Math.abs(Math.sin(lat * 12.3 + lon * 4.5)) * 3400);
    const slopeNum = parseFloat((3.0 + Math.abs(Math.sin(lat * 5.1 + lon * 2.3)) * 5.5).toFixed(1));
    const slopeStatus = slopeNum < 5.0 ? "Safe" : (slopeNum < 7.5 ? "Moderate" : "Steep");
    const slopeColor = slopeNum < 5.0 ? "status-safe" : (slopeNum < 7.5 ? "status-warning" : "status-danger");

    const sunAz = Math.round(Math.abs(lon * 1.5 + 150) % 360);
    const sunEl = parseFloat((-0.6 + Math.sin(lon * Math.PI / 180) * 2.5).toFixed(1));
    const earthAz = Math.round(Math.abs(lon * 0.9 + 200) % 360);
    const earthEl = parseFloat((1.4 + Math.abs(Math.cos(lon * Math.PI / 180)) * 4.1).toFixed(1));

    const daylightNum = Math.round(45 + Math.abs(Math.cos(lat * Math.PI / 180)) * 48);
    const distIce = (1.2 + Math.abs(Math.cos(lat * 2.5)) * 3.6).toFixed(1) + " km";
    const maxGrad = (12 + Math.abs(Math.sin(lon * 1.3)) * 10).toFixed(1) + "° (Crater Flank)";
    const stayHours = Math.round(60 + Math.abs(Math.sin(lon * 1.1)) * 88);
    const sunsetH = Math.round(40 + Math.abs(Math.sin(lat + lon)) * 75);
    const sunsetM = Math.round(Math.abs(Math.cos(lon)) * 50);

    return {
      name: name,
      lat: lat,
      lon: lon,
      elevation: `+${elevVal.toLocaleString()} m`,
      nextSunset: `${sunsetH}h ${sunsetM}m`,
      daylightPctNum: daylightNum,
      horizon: {
        title: "🌄 360° Panoramic Skyline Mask",
        svgPath: generateSkylinePath(lat, lon),
        sunAz: sunAz,
        sunEl: sunEl,
        earthAz: earthAz,
        earthEl: earthEl,
        status: sunEl > 0
          ? `Sun is <strong>Clear</strong> of regional ridges. Earth line-of-sight <strong>Maintained (+${earthEl}°)</strong>.`
          : `Sun is in <strong>Shadow</strong>. Direct-to-Earth line-of-sight <strong>Clear (+${earthEl}°)</strong>.`
      },
      slope: {
        title: "📈 Local Crater Radial Cross-Section",
        svgPath: generateSlopePath(lat, lon),
        touchdownX: 100,
        touchdownY: 34,
        slopeVal: `${slopeNum}°`,
        slopeStatus: slopeStatus,
        slopeColor: slopeColor,
        distIce: distIce,
        maxGradient: maxGrad
      },
      solar: {
        title: "☀️ 14-Day Solar Illumination Window",
        svgPath: generateSolarPath(lat, lon),
        daylightPct: `${daylightNum}% Daylight`,
        peakElevation: `+${(sunEl + 1.2).toFixed(1)}° (Solar Transit)`,
        continuousStay: `${stayHours} hrs continuous`
      },
      comms: {
        title: "📡 Direct-to-Earth (DTE) Comms Margin",
        earthElev: `+${earthEl}° (Nominal Line)`,
        margin: `+${(4.2 + Math.abs(Math.sin(lat * 0.7)) * 4.8).toFixed(1)} dB`,
        dsnLock: "Canberra / Goldstone Active",
        status: "Stable continuous line-of-sight during positive libration window."
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
      const h = site.horizon;
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
        emptyMsg.style.cssText = "display:flex; align-items:center; justify-content:center; width:100%; padding:20px; pointer-events:auto;";
        emptyMsg.innerHTML = `
          <div style="text-align:center; padding:18px 24px; color:var(--text-muted, #8c867c); font-size:12px; background:rgba(30,32,34,0.7); backdrop-filter:blur(10px); border:1px dashed var(--border-medium, #4e4f52); border-radius:8px; max-width:480px;">
            <p style="margin:0 0 6px; font-weight:600; color:var(--text-secondary, #beb7ac); font-size:13px;">No Candidate Sites in Deck</p>
            <p style="margin:0; line-height:1.5;">Search lunar sites (<kbd class="kbd-badge" style="padding:1px 5px; background:#333; border:1px solid #555; border-radius:3px; font-size:10px;">/</kbd>), click on the 3D Moon or 2D Map, or click <strong style="color:var(--accent-terracotta, #c87d55);">Undo (Ctrl+Z)</strong> to restore dismissed cards.</p>
          </div>
        `;
        track.appendChild(emptyMsg);
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
  function highlightCard(lat, lon) {
    const cards = document.querySelectorAll(".site-card:not(.card-add-new)");
    cards.forEach(c => {
      const cLat = parseFloat(c.dataset.lat);
      const cLon = parseFloat(c.dataset.lon);
      const match = Math.abs(cLat - lat) < 0.25 && Math.abs(cLon - lon) < 2.0;
      c.classList.toggle("active", match);
    });
    renumberCardsAndSync();
  }

  /**
   * Searches the DOM for an existing card matching coordinates or name.
   */
  function findCardByCoordsOrName(lat, lon, name) {
    const columns = document.querySelectorAll(".site-card-column");
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
          <div>
            <div class="card-header-badge-row">
              <span class="site-number-badge">1</span>
              <span class="site-tag ${tagClass}">${tagLabel}</span>
            </div>
            <h3 class="site-name">${p.name}</h3>
            <span class="site-coords">${latStr} · ${lonStr} · ${p.elevation}</span>
          </div>
          <button class="card-dismiss" title="Remove site">×</button>
        </div>

        <!-- 4-Metric Landing Hazard & Celestial Telemetry Grid -->
        <div class="card-metrics-grid">
          <div class="metric-item">
            <span class="metric-label">Touchdown Slope</span>
            <span class="metric-value ${p.slope.slopeColor}">${p.slope.slopeVal} <span class="tag-status">${p.slope.slopeStatus}</span></span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Solar Elevation</span>
            <span class="metric-value ${p.horizon.sunEl > 0 ? "status-safe" : "status-danger"}">${p.horizon.sunEl > 0 ? "+" : ""}${p.horizon.sunEl}° <span class="metric-sub">(${p.horizon.sunEl > 0 ? "Rising" : "Shadow"})</span></span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Next Sunset</span>
            <span class="metric-value">${p.nextSunset || "96h 20m"}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Earth Visibility</span>
            <span class="metric-value status-safe">Clear (+${p.horizon.earthEl}°)</span>
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
          <button class="btn-detail-tab" data-tab="horizon" title="360° Panoramic Skyline Mask">🌄 Horizon</button>
          <button class="btn-detail-tab" data-tab="slope" title="Local Crater Radial Elevation Profile">📈 Slope</button>
          <button class="btn-detail-tab" data-tab="solar" title="14-Day Solar Illumination Curve">☀️ Solar</button>
          <button class="btn-detail-tab" data-tab="comms" title="Direct-to-Earth Line of Sight">📡 Comms</button>
        </div>

        <!-- Card Action Toolbar -->
        <div class="card-actions">
          <button class="btn-card-action btn-focus-site" title="Center 3D Moon camera on this site">Focus 3D</button>
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
        if (existingCol) {
          highlightCard(data.lat, data.lon);
          scrollCardIntoTrackView(existingCol);
        } else {
          // Add dynamically
          addDynamicCard(data);
        }

        // Ensure drawer is open so the user sees their candidate card
        ensureCardsDrawerOpen();
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
            const rawSite = window.LunarPhysics.findSite({ lat: siteProfile.lat, lon: siteProfile.lon });
            if (rawSite) {
              evalData = window.LunarPhysics.evaluateAtHour(rawSite, hourIdx);
            }
          }

          if (evalData) {
            // 1. Move Sun tracker on 360° skyline card
            const sunTracker = document.getElementById(`tracker-sun-${siteKey}`);
            if (sunTracker) {
              const leftPct = Math.round((evalData.sunAz / 360) * 100);
              sunTracker.style.left = `${leftPct}%`;
              sunTracker.title = `Sun: Az ${evalData.sunAz}° · El ${evalData.sunEl > 0 ? '+' : ''}${evalData.sunEl}° (${evalData.isSunVis ? 'Clear' : 'Shadow'})`;
            }

            // 2. Update live metrics on main card face
            const metaValues = card.querySelectorAll(".card-meta-value");
            if (metaValues.length >= 3) {
              // Next sunset / sunrise countdown
              if (evalData.isSunVis) {
                metaValues[1].innerHTML = `☀️ Sunset in <strong>${evalData.nextSunsetHrs}h</strong>`;
              } else {
                metaValues[1].innerHTML = `🌑 Sunrise in <strong>${evalData.nextSunriseHrs}h</strong>`;
              }
              // Solar elevation angle
              metaValues[2].innerHTML = `Solar El: <strong>${evalData.sunEl > 0 ? '+' : ''}${evalData.sunEl}°</strong> (${evalData.isSunVis ? 'Clear' : 'Shadow'})`;
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
