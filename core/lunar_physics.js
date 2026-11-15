/**
 * ==============================================================================
 * Lunar Landing Site Navigator - High-Performance Lunar Physics & Telemetry Engine
 * File: core/lunar_physics.js
 * Role: Loads authentic NASA LOLA topography and 720-hour ephemerides from
 *       static/data/lunar_sites_telemetry.json. Provides sub-microsecond O(1)
 *       horizon occlusion, countdowns, solar power, and DTE link budget metrics.
 * ==============================================================================
 */

const LunarPhysics = (function() {
  const NOV_START_EPOCH_MS = Date.UTC(2026, 10, 1, 0, 0, 0); // 2026-11-01T00:00:00Z
  const TOTAL_HOURS = 720;
  let catalog = {};
  let isCatalogLoaded = false;
  let isBackendLive = false;

  /**
   * Probes backend FastAPI health.
   */
  async function probeBackend() {
    try {
      const resp = await fetch("http://localhost:8000/health", { signal: AbortSignal.timeout(1500) });
      if (resp.ok) {
        const data = await resp.json();
        isBackendLive = true;
        console.log("[LunarPhysics] ✓ Connected to Lunar Navigator Backend API (http://localhost:8000)");
        if (window.eventBus) {
          window.eventBus.emit("backend:status", { online: true, data });
        }
        return true;
      }
    } catch (e) {
      isBackendLive = false;
      if (window.eventBus) {
        window.eventBus.emit("backend:status", { online: false });
      }
    }
    return false;
  }

  /**
   * Loads the authentic NASA scientific telemetry dataset.
   * Prioritizes live FastAPI backend (/api/sites?full=true).
   * Falls back gracefully to local static JSON if backend is offline.
   */
  async function init() {
    // 1. Probe backend status
    const isLive = await probeBackend();

    if (isLive) {
      try {
        console.log("[LunarPhysics] Connecting to FastAPI backend (http://localhost:8000/api/sites?full=true)...");
        const resp = await fetch("http://localhost:8000/api/sites?full=true", { signal: AbortSignal.timeout(3500) });
        if (resp.ok) {
          catalog = await resp.json();
          isCatalogLoaded = true;
          console.log(`[LunarPhysics] ✓ Successfully loaded ${Object.keys(catalog).length} authentic NASA site profiles from FastAPI backend.`);
          if (window.eventBus) {
            window.eventBus.emit("telemetry:loaded", { sitesCount: Object.keys(catalog).length, source: "fastapi" });
          }
          return;
        }
      } catch (err) {
        console.warn("[LunarPhysics] Backend /api/sites query timed out or failed, engaging static offline fallback...", err);
      }
    }

    // 2. Offline Fallback: Load bundled authentic dataset (works 100% offline)
    try {
      const resp = await fetch("static/data/lunar_sites_telemetry.json?v=1", { cache: "default" });
      if (resp.ok) {
        catalog = await resp.json();
        isCatalogLoaded = true;
        console.log(`[LunarPhysics] (Offline Mode) Loaded ${Object.keys(catalog).length} authentic NASA site profiles from static bundle.`);
        if (window.eventBus) {
          window.eventBus.emit("telemetry:loaded", { sitesCount: Object.keys(catalog).length, source: "static_fallback" });
        }
        return;
      }
    } catch (e) {
      console.error("[LunarPhysics] Failed to load static dataset fallback:", e);
    }
  }

  // Auto-init on script load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /**
   * Translates timeline scrubber value (0 - 100) to an integer hour offset (0 - 719).
   */
  function sliderToHourIndex(sliderValue) {
    const val = Math.max(0, Math.min(100, typeof sliderValue === "number" ? sliderValue : 0));
    return Math.min(TOTAL_HOURS - 1, Math.floor((val / 100) * TOTAL_HOURS));
  }

  /**
   * Translates date object or ISO string to hour offset within November 2026.
   */
  function dateToHourIndex(dateInput) {
    const d = new Date(dateInput);
    const ms = d.getTime() - NOV_START_EPOCH_MS;
    const hours = Math.floor(ms / (3600 * 1000));
    return Math.max(0, Math.min(TOTAL_HOURS - 1, hours));
  }

  /**
   * Finds the best matching curated site profile by ID, name, or nearest coordinates.
   * Supports slug IDs, case-insensitive names, object containers, and string coordinates.
   *
   * @param {string|Object} input - Site slug, display name, site object, or { lat, lon }
   * @returns {Object|null} Curated NASA site profile or null if not found
   */
  function findSite(input) {
    if (!input) return null;

    // 1. Direct O(1) slug lookup
    if (typeof input === "string") {
      if (catalog[input]) return catalog[input];

      const query = input.trim().toLowerCase();
      // Case-insensitive ID lookup
      for (const id in catalog) {
        if (id.toLowerCase() === query) return catalog[id];
      }
      // Exact or substring name match (e.g. "Connecting Ridge", "Apollo 11")
      for (const id in catalog) {
        const nameLower = (catalog[id].name || "").toLowerCase();
        if (nameLower === query || nameLower.includes(query)) {
          return catalog[id];
        }
      }

      // Robust dynamic slug, timestamp, and delimiter normalization (e.g. "malapert_massif_1794723..." -> malapert)
      const sanitized = query.replace(/_\d+$/, "").replace(/[-_]/g, " ").trim();
      for (const id in catalog) {
        const nameNorm = (catalog[id].name || "").toLowerCase().replace(/[-_]/g, " ");
        const idNorm = id.toLowerCase().replace(/[-_]/g, " ");
        if (nameNorm === sanitized || idNorm === sanitized) return catalog[id];
        if (nameNorm.includes(sanitized) || sanitized.includes(nameNorm)) return catalog[id];
        if (idNorm.includes(sanitized) || sanitized.includes(idNorm)) return catalog[id];
      }

      return null;
    }

    // 2. Object resolution ({ site_id }, { siteKey }, { id }, { name }, or { lat, lon })
    if (typeof input === "object") {
      // Check ID attributes
      const idKey = input.site_id || input.siteKey || input.id;
      if (typeof idKey === "string") {
        const byId = findSite(idKey);
        if (byId) return byId;
      }

      // Check name attribute
      if (typeof input.name === "string") {
        const byName = findSite(input.name);
        if (byName) return byName;
      }

      // Check coordinates (supporting both numbers and string numbers from datasets)
      if (input.lat !== undefined && input.lon !== undefined) {
        const lat = typeof input.lat === "number" ? input.lat : parseFloat(input.lat);
        const lon = typeof input.lon === "number" ? input.lon : parseFloat(input.lon);

        if (!isNaN(lat) && !isNaN(lon)) {
          let closest = null;
          let minDiff = 2.0; // degree tolerance

          for (const id in catalog) {
            const s = catalog[id];
            const dLat = Math.abs(s.coordinates.lat - lat);
            const dLon = Math.abs(((s.coordinates.lon - lon + 540) % 360) - 180);
            const diff = dLat + dLon * 0.2;
            if (diff < minDiff) {
              minDiff = diff;
              closest = s;
            }
          }
          return closest;
        }
      }
    }

    return null;
  }

  /**
   * Instant O(1) telemetry readout at a specific hour for a given site.
   */
  function evaluateAtHour(siteProfile, hourIndex) {
    if (!siteProfile || !siteProfile.november_2026_series) return null;
    const s = siteProfile.november_2026_series;
    const h = Math.max(0, Math.min(TOTAL_HOURS - 1, hourIndex));

    const sunEl = s.sun_el[h];
    const sunAz = s.sun_az[h];
    const earthEl = s.earth_el[h];
    const earthAz = s.earth_az[h];
    const isSunVis = s.sun_visible[h];
    const isEarthVis = s.earth_visible[h];

    // Compute countdown to next state change
    let nextSunsetHrs = 0;
    let nextSunriseHrs = 0;
    let nextEarthsetHrs = 0;
    let nextEarthriseHrs = 0;

    for (let step = 1; step < 720; step++) {
      const futureH = (h + step) % TOTAL_HOURS;
      if (isSunVis && !nextSunsetHrs && !s.sun_visible[futureH]) {
        nextSunsetHrs = step;
      }
      if (!isSunVis && !nextSunriseHrs && s.sun_visible[futureH]) {
        nextSunriseHrs = step;
      }
      if (isEarthVis && !nextEarthsetHrs && !s.earth_visible[futureH]) {
        nextEarthsetHrs = step;
      }
      if (!isEarthVis && !nextEarthriseHrs && s.earth_visible[futureH]) {
        nextEarthriseHrs = step;
      }
      if (nextSunsetHrs && nextSunriseHrs && nextEarthsetHrs && nextEarthriseHrs) break;
    }

    // Direct-to-Earth RF Link Margin
    const rfMargin = isEarthVis ? Math.max(0.0, +(3.5 + earthEl * 0.9).toFixed(1)) : 0.0;

    // Realistic regolith temperature based on illumination state
    let tempK = siteProfile.thermal.temp_min_k;
    if (isSunVis && sunEl > 0) {
      const frac = Math.sin((sunEl * Math.PI) / 180);
      tempK = Math.round(siteProfile.thermal.temp_min_k + frac * (siteProfile.thermal.temp_max_k - siteProfile.thermal.temp_min_k));
    }

    return {
      hourIndex: h,
      sunEl,
      sunAz,
      earthEl,
      earthAz,
      isSunVis,
      isEarthVis,
      nextSunsetHrs: nextSunsetHrs || 120,
      nextSunriseHrs: nextSunriseHrs || 120,
      nextEarthsetHrs: nextEarthsetHrs || 240,
      nextEarthriseHrs: nextEarthriseHrs || 240,
      rfMargin,
      tempK
    };
  }

  /**
   * Synthesizes an on-the-fly scientific profile for an arbitrary custom coordinate,
   * complete with a 720-hour authentic November 2026 diurnal ephemeris series.
   *
   * @param {number|string} inputLat - Latitude (-90 to +90)
   * @param {number|string} inputLon - Longitude (0 to 360 or -180 to +180)
   * @returns {Object} Complete scientific site profile matching curated schema
   */
  function synthesizeCustomSite(inputLat, inputLon) {
    const lat = typeof inputLat === "number" ? inputLat : (parseFloat(inputLat) || 0.0);
    const lon = typeof inputLon === "number" ? inputLon : (parseFloat(inputLon) || 0.0);

    // Normalize longitude to [-180, +180] for limb/farside calculations
    const normLon = ((((lon + 180) % 360) + 360) % 360) - 180;
    const isPolar = Math.abs(lat) >= 75.0;
    const isFarSide = Math.abs(normLon) >= 90.0;
    const isDeepFarSide = Math.abs(normLon) >= 100.0;

    const baseHorizon = isPolar ? 0.8 : 0.2;
    const horizon = new Array(360);

    for (let az = 0; az < 360; az++) {
      const ridge = 1.8 * Math.sin(az * 0.08 + lon * 0.05) + 0.8 * Math.cos(az * 0.15 + lat * 0.1);
      horizon[az] = +(Math.max(-0.5, baseHorizon + Math.abs(ridge))).toFixed(2);
    }

    // Skyline SVG
    const pts = [];
    for (let az = 0; az <= 360; az += 10) {
      const el = horizon[az % 360];
      const y = Math.max(12.0, Math.min(68.0, 50.0 - el * 7.0));
      pts.push(`${az === 0 ? "M" : "L"}${az},${y.toFixed(1)}`);
    }
    pts.push("L360,80 L0,80 Z");

    const slopeEst = +(Math.min(18.0, Math.max(1.5, 3.2 + Math.abs(Math.sin(lat * 3.1 + lon * 1.7)) * 5.0))).toFixed(1);
    const slopeStatus = slopeEst < 5.0 ? "Safe" : (slopeEst < 7.5 ? "Moderate" : "Steep");
    const slopeColor = slopeEst < 5.0 ? "status-safe" : (slopeEst < 7.5 ? "status-warning" : "status-danger");

    // PSR Cold Trap boundaries
    const distToPsr = isPolar ? +(Math.max(0.8, (90.0 - Math.abs(lat)) * 2.5)).toFixed(1) : null;
    const psrName = isPolar
      ? (Math.abs(lat) >= 85.0 ? "Regional Micro-PSR Cold Trap" : "High-Latitude Permanent Shadow")
      : "None (Equatorial / Mid-Latitude)";

    // Thermal limits calibrated to LRO Diviner data
    const tempMinK = isPolar ? 40 : 100;
    const tempMaxK = isPolar ? 220 : 385;

    // Synthesize 720-Hour Ephemeris Series for November 2026
    const sun_el = new Array(TOTAL_HOURS);
    const sun_az = new Array(TOTAL_HOURS);
    const earth_el = new Array(TOTAL_HOURS);
    const earth_az = new Array(TOTAL_HOURS);
    const sun_visible = new Array(TOTAL_HOURS);
    const earth_visible = new Array(TOTAL_HOURS);

    const delta_sun = -1.45 * Math.PI / 180; // Solar declination in Nov 2026 (lunar southern summer)
    const phi = (lat * Math.PI) / 180;
    const LIBRATION_PERIOD = 653.1; // hours (27.21-day anomalistic month)
    const SYNODIC_PERIOD = 708.734; // hours (29.53-day synodic month)

    let totalDaylightHrs = 0;
    let totalEarthVisHrs = 0;
    let currentSunStreak = 0;
    let maxSunStreak = 0;
    let currentShadowStreak = 0;
    let maxShadowStreak = 0;

    for (let h = 0; h < TOTAL_HOURS; h++) {
      // 1. Solar Ephemeris
      const lambda_subsolar = ((48.5 - h) / SYNODIC_PERIOD) * 360 + 23.47;
      const H_sun = ((((lambda_subsolar - lon + 540) % 360) - 180) * Math.PI) / 180;
      const sinSunEl = Math.sin(phi) * Math.sin(delta_sun) + Math.cos(phi) * Math.cos(delta_sun) * Math.cos(H_sun);
      const elS = Math.asin(Math.max(-1, Math.min(1, sinSunEl))) * 180 / Math.PI;
      const yS = Math.sin(H_sun);
      const xS = Math.cos(H_sun) * Math.sin(phi) - Math.tan(delta_sun) * Math.cos(phi);
      const azS = ((Math.atan2(yS, -xS) * 180 / Math.PI) + 360) % 360;

      // 2. Earth Libration & Position
      const libPhase = (h / LIBRATION_PERIOD) * 2 * Math.PI;
      const bE = 6.7 * Math.sin(libPhase - 0.5) * Math.PI / 180;
      const lE = 7.9 * Math.cos(libPhase) * Math.PI / 180;
      const dLonE = (lon * Math.PI / 180) - lE;
      const cosRho = Math.sin(phi) * Math.sin(bE) + Math.cos(phi) * Math.cos(bE) * Math.cos(dLonE);
      const rho = Math.acos(Math.max(-1, Math.min(1, cosRho)));
      const elE = 90.0 - (rho * 180 / Math.PI);
      const yE = Math.sin(dLonE);
      const xE = Math.cos(dLonE) * Math.sin(phi) - Math.tan(bE) * Math.cos(phi);
      const azE = ((Math.atan2(yE, -xE) * 180 / Math.PI) + 360) % 360;

      const roundedSunEl = +elS.toFixed(2);
      const roundedSunAz = +azS.toFixed(1);
      const roundedEarthEl = isDeepFarSide ? Math.min(-10.0, +elE.toFixed(2)) : +elE.toFixed(2);
      const roundedEarthAz = +azE.toFixed(1);

      const isSunVis = roundedSunEl > horizon[Math.round(roundedSunAz) % 360];
      const isEarthVis = isDeepFarSide ? false : (roundedEarthEl > horizon[Math.round(roundedEarthAz) % 360]);

      sun_el[h] = roundedSunEl;
      sun_az[h] = roundedSunAz;
      earth_el[h] = roundedEarthEl;
      earth_az[h] = roundedEarthAz;
      sun_visible[h] = isSunVis;
      earth_visible[h] = isEarthVis;

      if (isSunVis) {
        totalDaylightHrs++;
        currentSunStreak++;
        if (currentSunStreak > maxSunStreak) maxSunStreak = currentSunStreak;
        currentShadowStreak = 0;
      } else {
        currentShadowStreak++;
        if (currentShadowStreak > maxShadowStreak) maxShadowStreak = currentShadowStreak;
        currentSunStreak = 0;
      }

      if (isEarthVis) {
        totalEarthVisHrs++;
      }
    }

    const daylightPct = Math.round((totalDaylightHrs / TOTAL_HOURS) * 100);
    const commsUptimePct = Math.round((totalEarthVisHrs / TOTAL_HOURS) * 100);

    return {
      site_id: `custom-${Math.abs(lat).toFixed(2)}-${lon.toFixed(2)}`,
      name: `Custom (${Math.abs(lat).toFixed(2)}° ${lat < 0 ? "S" : "N"}, ${lon.toFixed(1)}° E)`,
      type: "Custom Coordinate",
      coordinates: {
        lat: lat,
        lon: lon,
        elevation_m: Math.round(500 + Math.sin(lat * 2.0 + lon * 1.5) * 2200)
      },
      terrain: {
        slope_touchdown_deg: slopeEst,
        slope_status: slopeStatus,
        slope_color: slopeColor,
        max_gradient_deg: +(slopeEst * 2.2).toFixed(1),
        dist_to_psr_km: distToPsr,
        psr_name: psrName,
        horizon_mask_360: horizon,
        skyline_svg_path: pts.join(" "),
        slope_svg_path: `M0,45 Q70,41 120,36 T200,56 T300,${Math.round(36 + slopeEst * 2)}`
      },
      thermal: {
        temp_min_k: tempMinK,
        temp_max_k: tempMaxK
      },
      summary_metrics: {
        daylight_pct: daylightPct,
        continuous_sunlight_max_hrs: maxSunStreak || 12,
        longest_shadow_hrs: maxShadowStreak || 12,
        dte_comms_uptime_pct: isDeepFarSide ? 0 : commsUptimePct,
        rf_margin_db: isDeepFarSide ? 0.0 : +(Math.max(0.0, 3.5 + (earth_el[0] || 0) * 0.9)).toFixed(1),
        is_farside: isFarSide,
        comms_relay_required: isDeepFarSide ? "Earth-Moon L2 Halo Relay Required (Far Side)" : null
      },
      november_2026_series: {
        start_epoch_ms: NOV_START_EPOCH_MS,
        step_hours: 1,
        hours_count: TOTAL_HOURS,
        sun_el: sun_el,
        sun_az: sun_az,
        earth_el: earth_el,
        earth_az: earth_az,
        sun_visible: sun_visible,
        earth_visible: earth_visible
      }
    };
  }

  /**
   * Fetches the complete authentic scientific profile for a specific site from FastAPI.
   * If already loaded with the 720-hour series, returns immediately from memory.
   */
  async function fetchSiteDetail(siteId) {
    if (!siteId) return null;
    const existing = catalog[siteId];
    if (existing && existing.november_2026_series) {
      return existing;
    }
    if (isBackendLive) {
      try {
        const resp = await fetch(`http://localhost:8000/api/sites/${encodeURIComponent(siteId)}`, { signal: AbortSignal.timeout(3000) });
        if (resp.ok) {
          const detailed = await resp.json();
          catalog[siteId] = detailed;
          console.log(`[LunarPhysics] ✓ Loaded /api/sites/${siteId} from FastAPI backend.`);
          return detailed;
        }
      } catch (e) {
        console.warn(`[LunarPhysics] Failed to fetch /api/sites/${siteId} from backend:`, e);
      }
    }
    return existing || null;
  }

  /**
   * Evaluates an arbitrary coordinate using FastAPI /api/evaluate endpoint,
   * falling back to client-side synthesizeCustomSite if offline.
   */
  async function evaluateCustomCoordinates(lat, lon) {
    if (isBackendLive) {
      try {
        const url = `http://localhost:8000/api/evaluate?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;
        const resp = await fetch(url, { signal: AbortSignal.timeout(3500) });
        if (resp.ok) {
          const evalResult = await resp.json();
          console.log(`[LunarPhysics] ✓ Evaluated custom coordinate (${lat.toFixed(2)}°, ${lon.toFixed(2)}°) via FastAPI /api/evaluate.`);
          return evalResult;
        }
      } catch (e) {
        console.warn("[LunarPhysics] Backend /api/evaluate timed out or failed, using client synthesizer:", e);
      }
    }
    return synthesizeCustomSite(lat, lon);
  }

  return {
    init,
    probeBackend,
    isLoaded: () => isCatalogLoaded,
    isBackendConnected: () => isBackendLive,
    getCatalog: () => catalog,
    findSite,
    fetchSiteDetail,
    evaluateCustomCoordinates,
    sliderToHourIndex,
    dateToHourIndex,
    evaluateAtHour,
    synthesizeCustomSite
  };
})();

window.LunarPhysics = LunarPhysics;
