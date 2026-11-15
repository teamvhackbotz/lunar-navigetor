/**
 * ==============================================================================
 * Lunar Landing Site Navigator - Mission Constraints & GIS Overlays Controller
 * File: components/horizon_topography/horizon_topography.js
 * Role: Coordinates the Left Drawer (Mission Constraints & EVA Traverse Planner)
 *       and Right Drawer (GIS Remote Sensing & Spatial Overlays), managing
 *       waypoint selections, power budgets, basemap switching, and layer states.
 * ==============================================================================
 */

(function() {
  // Universal Lunar Mission Archetypes
  const MISSION_ARCHETYPES = {
    crewed: {
      id: "crewed",
      name: "Crewed Sortie (Artemis)",
      tag: "Artemis III / IV Surface Operations",
      crewCompliment: "2 Astronauts",
      primaryPower: "10.0 kW (VSAT)",
      darknessReserve: "72 hrs (RFC)",
      darknessReserveHrs: 72,
      staySlider: { min: 48, max: 240, step: 12, default: 144 },
      batteryLabel: "Lander Battery State-of-Charge",
      mobilityTag: "Surface Mobility",
      mobilityHeading: "Lunar Terrain Vehicle (LTV)",
      mobilityDesc: "Traverse boundaries and maximum unassisted walk-back radius.",
      operatingRadius: "12.5 km",
      nominalSpeed: "8.0 km/h",
      speedKmh: 8.0,
      safetyLabel: "Walk-Back Margin",
      safetyVal: "Safe (< 5.0 km)",
      maxSlopeNominal: 8.0,
      maxSlopeHazard: 15.0,
      payloadHeading: "Deployable Instrument Roster",
      payloads: [
        { id: "pcms", name: "Regolith Volatiles Mass Spectrometer (PCMS)", checked: true },
        { id: "drill", name: "Cryogenic Drill & Subsurface Sampler (1.0m)", checked: true },
        { id: "lra", name: "Lunar Retroreflector Array (LRA)", checked: true },
        { id: "lss", name: "Autonomous Seismic Monitoring Station (LSS)", checked: false }
      ]
    },
    rover: {
      id: "rover",
      name: "Robotic Prospecting Rover",
      tag: "Autonomous / Teleoperated Rover",
      crewCompliment: "0 (Autonomous)",
      primaryPower: "450 W (Solar Mast)",
      darknessReserve: "48 hrs (Battery / RHU)",
      darknessReserveHrs: 48,
      staySlider: { min: 24, max: 720, step: 24, default: 168 },
      batteryLabel: "Rover Battery State-of-Charge",
      mobilityTag: "Robotic Mobility",
      mobilityHeading: "Autonomous Rover Chassis",
      mobilityDesc: "Traverse duty cycle, line-of-sight comms envelope, and slip limits.",
      operatingRadius: "3.5 km",
      nominalSpeed: "0.2 km/h (50 m/h)",
      speedKmh: 0.2,
      safetyLabel: "Slip / Stall Margin",
      safetyVal: "Nominal (< 12°)",
      maxSlopeNominal: 5.0,
      maxSlopeHazard: 12.0,
      payloadHeading: "Rover Science Payload Suite",
      payloads: [
        { id: "trident", name: "TRIDENT 1.0m Percussive Regolith Drill", checked: true },
        { id: "nirvss", name: "NIRVSS Near-Infrared Volatiles Spectrometer", checked: true },
        { id: "nss", name: "NSS Neutron Spectrometer (Hydrogen/Ice)", checked: true },
        { id: "msolo", name: "MSolo Mass Spectrometer for Surface Ops", checked: false }
      ]
    },
    lander: {
      id: "lander",
      name: "Stationary Science Lander",
      tag: "CLPS Surface Science Installation",
      crewCompliment: "0 (Stationary Bus)",
      primaryPower: "1.2 kW (GaAs Array)",
      darknessReserve: "14 hrs (Twilight Batt)",
      darknessReserveHrs: 14,
      staySlider: { min: 24, max: 360, step: 12, default: 120 },
      batteryLabel: "Bus Battery State-of-Charge",
      mobilityTag: "Surface Envelope",
      mobilityHeading: "Static Robotic Installation",
      mobilityDesc: "Touchdown footprint, robotic arm reach, and tilt tolerance.",
      operatingRadius: "1.5 m (Arm Reach)",
      nominalSpeed: "0.0 km/h (Static)",
      speedKmh: 0.0,
      safetyLabel: "Lander Tilt Margin",
      safetyVal: "Safe (< 10°)",
      maxSlopeNominal: 4.0,
      maxSlopeHazard: 10.0,
      payloadHeading: "Lander Instrument Field",
      payloads: [
        { id: "stereo", name: "Multi-band Panoramic Stereo Imager", checked: true },
        { id: "retro", name: "Laser Retroreflector for Precision Orbitography", checked: true },
        { id: "dust", name: "Surface Dust Exosphere & Charging Detector", checked: true },
        { id: "heatflow", name: "Subsurface Thermal Conductivity Probe", checked: false }
      ]
    },
    basecamp: {
      id: "basecamp",
      name: "Extended Base Camp / Hab",
      tag: "Permanent Outpost Infrastructure",
      crewCompliment: "4 Astronauts",
      primaryPower: "40.0 kW (Fission Power)",
      darknessReserve: "360 hrs (Full Night)",
      darknessReserveHrs: 360,
      staySlider: { min: 72, max: 720, step: 24, default: 360 },
      batteryLabel: "Microgrid Energy Storage SoC",
      mobilityTag: "Long-Range Sortie",
      mobilityHeading: "Pressurized Rover (PR)",
      mobilityDesc: "Extended multi-day crewed exploration and life-support range.",
      operatingRadius: "25.0 km",
      nominalSpeed: "12.0 km/h",
      speedKmh: 12.0,
      safetyLabel: "Life Support Radius",
      safetyVal: "Safe (< 25.0 km)",
      maxSlopeNominal: 10.0,
      maxSlopeHazard: 18.0,
      payloadHeading: "Outpost Infrastructure Systems",
      payloads: [
        { id: "isru", name: "ISRU Regolith Oxygen Extraction Pilot Plant", checked: true },
        { id: "fsp", name: "Fission Surface Power Radiator & Bus", checked: true },
        { id: "kaband", name: "High-Gain Ka-Band Earth Communications Mast", checked: true },
        { id: "sinter", name: "Regolith Sintering 3D Construction Testbed", checked: false }
      ]
    }
  };

  const LUNAR_RADIUS_KM = 1737.4;

  let activeSiteKey = "shackleton";
  let activeSite = null;
  let activeArchetype = "crewed";

  /**
   * Calculates authentic great-circle geodesic distance between two points on the lunar sphere.
   * @param {number} lat1
   * @param {number} lon1
   * @param {number} lat2
   * @param {number} lon2
   * @returns {number} Distance in kilometers
   */
  function calculateLunarDistanceKm(lat1, lon1, lat2, lon2) {
    if (lat1 === lat2 && lon1 === lon2) return 0;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const dPhi = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(Math.max(0, a)), Math.sqrt(Math.max(0, 1 - a)));
    return +(LUNAR_RADIUS_KM * c).toFixed(2);
  }

  /**
   * Generates physiographically authentic EVA/sortie waypoints for any landing site and archetype.
   * @param {Object|string} siteOrKey - Curated/synthesized site profile or slug
   * @param {string} archetypeKey - Active mission archetype ('crewed', 'rover', 'lander', 'basecamp')
   * @returns {Array<Object>} 3 procedural waypoints
   */
  function generateTraverseWaypoints(siteOrKey, archetypeKey) {
    let site = typeof siteOrKey === "object" && siteOrKey !== null ? siteOrKey : null;
    if (!site && window.LunarPhysics) {
      site = window.LunarPhysics.findSite(siteOrKey);
    }
    if (!site) {
      site = {
        site_id: typeof siteOrKey === "string" ? siteOrKey : "shackleton",
        name: "Peak Near Shackleton",
        coordinates: { lat: -89.6, lon: 129.2 },
        terrain: {
          slope_touchdown_deg: 4.2,
          slope_status: "Nominal",
          slope_color: "status-safe",
          max_gradient_deg: 14.1,
          dist_to_psr_km: 2.4,
          psr_name: "Shackleton Floor Cold Trap"
        },
        summary_metrics: { is_farside: false }
      };
    }

    const lat = site.coordinates ? site.coordinates.lat : 0;
    const lon = site.coordinates ? site.coordinates.lon : 0;
    const normLon = ((((lon + 180) % 360) + 360) % 360) - 180;
    const isPolar = Math.abs(lat) >= 75.0;
    const isFarSide = Math.abs(normLon) >= 100.0;
    const baseSlope = site.terrain ? +(site.terrain.slope_touchdown_deg || 4.2).toFixed(1) : 4.2;
    const maxSlope = site.terrain ? +(site.terrain.max_gradient_deg || (baseSlope * 2.2)).toFixed(1) : +(baseSlope * 2.2).toFixed(1);
    const distToPsr = site.terrain && typeof site.terrain.dist_to_psr_km === "number" ? site.terrain.dist_to_psr_km : null;
    const psrName = site.terrain && site.terrain.psr_name ? site.terrain.psr_name : null;

    // Archetype 1: Stationary Science Lander (Static Micro-Envelope)
    if (archetypeKey === "lander") {
      return [
        {
          id: `${site.site_id}-wp1`,
          num: "WP 1",
          title: "Touchdown Pad Footprint",
          lat: lat,
          lon: lon,
          dist: "0.0 m",
          distKm: 0.0,
          slope: baseSlope,
          status: baseSlope < 5 ? "Nominal" : (baseSlope < 10 ? "Moderate" : "Hazard"),
          tagClass: baseSlope < 5 ? "tag-safe" : (baseSlope < 10 ? "tag-warn" : "tag-danger")
        },
        {
          id: `${site.site_id}-wp2`,
          num: "WP 2",
          title: "Robotic Arm Deployment Sweep",
          lat: +(lat + 0.0001).toFixed(4),
          lon: +(lon + 0.0001).toFixed(4),
          dist: "5.0 m",
          distKm: 0.005,
          slope: +(baseSlope * 1.05).toFixed(1),
          status: "Instrument Reach",
          tagClass: "tag-safe"
        },
        {
          id: `${site.site_id}-wp3`,
          num: "WP 3",
          title: "Surface Sensor / EMI Mast",
          lat: +(lat + 0.0003).toFixed(4),
          lon: +(lon + 0.0003).toFixed(4),
          dist: "15.0 m",
          distKm: 0.015,
          slope: +(baseSlope * 1.1).toFixed(1),
          status: "Perimeter Envelope",
          tagClass: "tag-safe"
        }
      ];
    }

    // Mobile Archetypes (Crewed, Rover, Basecamp)
    const scale = archetypeKey === "basecamp" ? 1.5 : (archetypeKey === "rover" ? 0.6 : 1.0);

    let wp2Title, wp2Lat, wp2Lon, wp2Slope, wp2Status, wp2Tag;
    let wp3Title, wp3Lat, wp3Lon, wp3Slope, wp3Status, wp3Tag;

    if (isPolar && distToPsr !== null && psrName && !psrName.toLowerCase().includes("none")) {
      // Polar Site with Cold Trap
      wp2Title = "Solar Illumination Crest Station";
      wp2Lat = +(lat + (lat < 0 ? 0.035 : -0.035) * scale).toFixed(3);
      wp2Lon = +(lon + 0.3 * scale).toFixed(2);
      wp2Slope = +(baseSlope * 1.3).toFixed(1);
      wp2Status = wp2Slope < 8 ? "Nominal" : "Caution";
      wp2Tag = wp2Slope < 8 ? "tag-safe" : "tag-warn";

      const cleanPsr = psrName.replace("Regional Micro-PSR", "Micro-PSR").replace("Floor Cold Trap", "Cold Trap");
      wp3Title = `${cleanPsr} Perimeter`;
      wp3Lat = +(lat + (lat < 0 ? 0.075 : -0.075) * scale).toFixed(3);
      wp3Lon = +(lon + 0.7 * scale).toFixed(2);
      wp3Slope = maxSlope;
      wp3Status = maxSlope > 18 ? "Severe Hazard" : (maxSlope > 12 ? "Steep Incline" : "Moderate");
      wp3Tag = maxSlope > 18 ? "tag-danger" : (maxSlope > 12 ? "tag-warn" : "tag-safe");
    } else if (isFarSide) {
      // Far Side Site
      wp2Title = "Central Peak Uplift / Mantle Outcrop";
      wp2Lat = +(lat + 0.05 * scale).toFixed(3);
      wp2Lon = +(lon + 0.05 * scale).toFixed(2);
      wp2Slope = +(baseSlope * 1.4).toFixed(1);
      wp2Status = wp2Slope < 8 ? "Nominal" : "Caution";
      wp2Tag = wp2Slope < 8 ? "tag-safe" : "tag-warn";

      wp3Title = "Earth-Moon L2 Relay Sightline Mast";
      wp3Lat = +(lat + 0.11 * scale).toFixed(3);
      wp3Lon = +(lon + 0.11 * scale).toFixed(2);
      wp3Slope = maxSlope;
      wp3Status = maxSlope > 16 ? "Severe Hazard" : (maxSlope > 10 ? "Steep Flank" : "Nominal");
      wp3Tag = maxSlope > 16 ? "tag-danger" : (maxSlope > 10 ? "tag-warn" : "tag-safe");
    } else {
      // Equatorial / Mare Near Side Site
      wp2Title = "Geologic Unit Contact / Basalt Outcrop";
      wp2Lat = +(lat + 0.04 * scale).toFixed(3);
      wp2Lon = +(lon + 0.04 * scale).toFixed(2);
      wp2Slope = +(baseSlope * 1.25).toFixed(1);
      wp2Status = wp2Slope < 8 ? "Nominal" : "Caution";
      wp2Tag = wp2Slope < 8 ? "tag-safe" : "tag-warn";

      wp3Title = "Impact Crater Ejecta Blanket";
      wp3Lat = +(lat + 0.09 * scale).toFixed(3);
      wp3Lon = +(lon + 0.09 * scale).toFixed(2);
      wp3Slope = maxSlope;
      wp3Status = maxSlope > 15 ? "Steep Rim" : (maxSlope > 8 ? "Moderate Incline" : "Nominal");
      wp3Tag = maxSlope > 15 ? "tag-danger" : (maxSlope > 8 ? "tag-warn" : "tag-safe");
    }

    const d1_2 = calculateLunarDistanceKm(lat, lon, wp2Lat, wp2Lon);
    const d1_3 = calculateLunarDistanceKm(lat, lon, wp3Lat, wp3Lon);

    return [
      {
        id: `${site.site_id}-wp1`,
        num: "WP 1",
        title: "Touchdown Landing Zone",
        lat: lat,
        lon: lon,
        dist: "0.0 km",
        distKm: 0.0,
        slope: baseSlope,
        status: site.terrain && site.terrain.slope_status ? site.terrain.slope_status : (baseSlope < 6 ? "Nominal" : "Caution"),
        tagClass: baseSlope < 6 ? "tag-safe" : (baseSlope < 12 ? "tag-warn" : "tag-danger")
      },
      {
        id: `${site.site_id}-wp2`,
        num: "WP 2",
        title: wp2Title,
        lat: wp2Lat,
        lon: wp2Lon,
        dist: `${d1_2.toFixed(1)} km`,
        distKm: d1_2,
        slope: wp2Slope,
        status: wp2Status,
        tagClass: wp2Tag
      },
      {
        id: `${site.site_id}-wp3`,
        num: "WP 3",
        title: wp3Title,
        lat: wp3Lat,
        lon: wp3Lon,
        dist: `${d1_3.toFixed(1)} km`,
        distKm: d1_3,
        slope: wp3Slope,
        status: wp3Status,
        tagClass: wp3Tag
      }
    ];
  }

  /**
   * Initializes event listeners for the Left Mission Planner and Right GIS Overlays.
   */
  function initMissionDrawers() {
    initLeftMissionPlanner();
    initRightGISOverlays();

    // Subscribe to site marking and timeline events across EventBus
    if (window.eventBus) {
      window.eventBus.on("site:marked", (data) => {
        updateActiveSiteContext(data);
      });
      window.eventBus.on("time:changed", () => {
        updatePowerBudgetAndStay();
      });
    }
  }

  /**
   * Initializes Left Drawer: Stay duration slider, waypoints, and hazard monitor.
   */
  function initLeftMissionPlanner() {
    const pills = document.querySelectorAll(".archetype-pill");
    pills.forEach(pill => {
      pill.addEventListener("click", () => {
        const archetypeKey = pill.dataset.archetype;
        if (archetypeKey && archetypeKey !== activeArchetype) {
          setMissionArchetype(archetypeKey);
        }
      });
    });

    const sliderStay = document.getElementById("slider-stay-duration");
    if (sliderStay) {
      sliderStay.addEventListener("input", (e) => {
        const targetVal = e && e.target && e.target.value !== undefined ? e.target.value : sliderStay.value;
        updatePowerBudgetAndStay(targetVal);
      });
    }

    // Hydrate default archetype, power calculations, and initial waypoints
    setMissionArchetype(activeArchetype);
    renderWaypoints(activeSiteKey);
    updatePowerBudgetAndStay();
  }

  /**
   * Evaluates authentic ephemeris daylight margin and battery/RFC discharge state.
   * Couples stay duration to site ephemeris daylight windows and vehicle storage capacity.
   * @param {number|string} [stayHours]
   * @returns {Object} Calculated power and stay telemetry
   */
  function updatePowerBudgetAndStay(stayHours) {
    const sliderStay = document.getElementById("slider-stay-duration");
    const valStay = document.getElementById("val-stay-duration");
    const valMargin = document.getElementById("val-daylight-margin");
    const valBatterySoc = document.getElementById("val-battery-soc");
    const barBatterySoc = document.getElementById("bar-battery-soc");

    const config = MISSION_ARCHETYPES[activeArchetype] || MISSION_ARCHETYPES.crewed;

    // Resolve stay duration
    let hrs = stayHours !== undefined ? parseInt(stayHours, 10) : (sliderStay ? parseInt(sliderStay.value, 10) : config.staySlider.default);
    if (isNaN(hrs)) hrs = config.staySlider.default;

    // Format stay duration readout
    const days = (hrs / 24).toFixed(1);
    if (valStay) valStay.textContent = `${hrs} hrs (${days} days)`;

    // 1. Determine site continuous daylight window from authentic ephemeris profile
    let daylightAvailable = 160; // fallback
    if (activeSite && activeSite.summary_metrics && typeof activeSite.summary_metrics.continuous_sunlight_max_hrs === "number") {
      daylightAvailable = activeSite.summary_metrics.continuous_sunlight_max_hrs;
    } else if (window.LunarPhysics) {
      const s = window.LunarPhysics.findSite(activeSiteKey);
      if (s && s.summary_metrics && typeof s.summary_metrics.continuous_sunlight_max_hrs === "number") {
        daylightAvailable = s.summary_metrics.continuous_sunlight_max_hrs;
      }
    }

    // 2. Physical Daylight Margin and Shadow Transition
    const daylightMargin = daylightAvailable - hrs;
    const shadowHours = Math.max(0, hrs - daylightAvailable);
    const darknessReserveLimit = config.darknessReserveHrs || 72;

    // 3. Battery State-of-Charge (SoC) & Status State
    let socPct = 100;
    let batteryStatus = "nominal"; // 'nominal' | 'discharging' | 'critical'
    let socText = "";

    if (shadowHours === 0) {
      // 100% Sunlit: Primary power actively powers bus & trickles battery
      socPct = Math.min(100, Math.max(94, 98 - Math.round(hrs * 0.02)));
      batteryStatus = "nominal";
      socText = `${socPct}% Nominal (Solar Powered)`;
    } else if (shadowHours <= darknessReserveLimit) {
      // Darkness transition: Discharging against secondary reserve (RFC / Battery)
      const drainRatio = shadowHours / darknessReserveLimit;
      socPct = Math.max(20, Math.round(98 - drainRatio * 75));
      batteryStatus = "discharging";
      socText = `${socPct}% Discharging (${shadowHours}h Shadow)`;
    } else {
      // Darkness exceeds reserve capacity: Critical Depletion
      const overShadow = shadowHours - darknessReserveLimit;
      socPct = Math.max(5, Math.round(20 - overShadow * 0.5));
      batteryStatus = "critical";
      socText = `${socPct}% Critical: Reserve Depleted`;
    }

    // 4. Update Daylight Margin UI
    if (valMargin) {
      if (daylightMargin >= 0) {
        valMargin.textContent = `+${daylightMargin} hrs reserve`;
        valMargin.className = "p-val status-safe";
      } else {
        valMargin.textContent = `${Math.abs(daylightMargin)} hrs in shadow`;
        valMargin.className = batteryStatus === "critical" ? "p-val status-danger" : "p-val status-warning";
      }
    }

    // 5. Update Battery SoC Text and Progress Bar
    if (valBatterySoc) {
      valBatterySoc.textContent = socText;
      valBatterySoc.className = batteryStatus === "critical" ? "status-danger" : (batteryStatus === "discharging" ? "status-warning" : "status-safe");
    }

    if (barBatterySoc) {
      barBatterySoc.style.width = `${socPct}%`;
      const fillClass = batteryStatus === "critical" ? "fill-danger" : (batteryStatus === "discharging" ? "fill-warn" : "fill-sage");
      barBatterySoc.className = `bar-fill ${fillClass}`;
    }

    // 6. Dispatch Event across EventBus
    if (window.eventBus) {
      window.eventBus.emit("mission:constraint_change", {
        stayHours: hrs,
        daylightAvailable: daylightAvailable,
        daylightMargin: daylightMargin,
        shadowHours: shadowHours,
        batterySoc: socPct,
        batteryStatus: batteryStatus,
        primaryPower: config.primaryPower,
        darknessReserve: config.darknessReserve,
        archetype: activeArchetype,
        siteId: activeSiteKey
      });
    }

    return {
      stayHours: hrs,
      daylightAvailable,
      daylightMargin,
      shadowHours,
      batterySoc: socPct,
      batteryStatus
    };
  }

  /**
   * Sets active mission archetype and reconfigures power, mobility, and payload telemetry.
   * @param {string} archetypeKey - 'crewed' | 'rover' | 'lander' | 'basecamp'
   */
  function setMissionArchetype(archetypeKey) {
    if (!MISSION_ARCHETYPES[archetypeKey]) return;
    activeArchetype = archetypeKey;
    const config = MISSION_ARCHETYPES[archetypeKey];

    // 1. Update UI pill states
    const pills = document.querySelectorAll(".archetype-pill");
    pills.forEach(pill => {
      pill.classList.toggle("active", pill.dataset.archetype === archetypeKey);
    });

    // 2. Header and section titles
    const tagEl = document.getElementById("planner-mission-tag");
    if (tagEl) tagEl.textContent = config.tag;

    // 3. Power telemetry
    const valPrimaryPower = document.getElementById("val-primary-power");
    if (valPrimaryPower) valPrimaryPower.textContent = config.primaryPower;

    const valDarkness = document.getElementById("val-darkness-reserve");
    if (valDarkness) valDarkness.textContent = config.darknessReserve;

    const valCrew = document.getElementById("val-crew-compliment");
    if (valCrew) valCrew.textContent = config.crewCompliment;

    const labelBatterySoc = document.getElementById("label-battery-soc");
    if (labelBatterySoc) labelBatterySoc.textContent = config.batteryLabel;

    // 4. Stay duration slider adjustments
    const sliderStay = document.getElementById("slider-stay-duration");
    const valStay = document.getElementById("val-stay-duration");
    if (sliderStay) {
      sliderStay.min = config.staySlider.min;
      sliderStay.max = config.staySlider.max;
      sliderStay.step = config.staySlider.step;

      let currentVal = parseInt(sliderStay.value, 10);
      if (isNaN(currentVal) || currentVal < config.staySlider.min || currentVal > config.staySlider.max) {
        currentVal = config.staySlider.default;
        sliderStay.value = currentVal;
      }
      const days = (currentVal / 24).toFixed(1);
      if (valStay) valStay.textContent = `${currentVal} hrs (${days} days)`;
    }

    // 5. Mobility section
    const mobilityTag = document.getElementById("mobility-section-tag");
    if (mobilityTag) mobilityTag.textContent = config.mobilityTag;

    const mobilityHeading = document.getElementById("mobility-section-heading");
    if (mobilityHeading) mobilityHeading.textContent = config.mobilityHeading;

    const mobilityDesc = document.getElementById("mobility-section-desc");
    if (mobilityDesc) mobilityDesc.textContent = config.mobilityDesc;

    const valRadius = document.getElementById("val-operating-radius");
    if (valRadius) valRadius.textContent = config.operatingRadius;

    const valSpeed = document.getElementById("val-nominal-speed");
    if (valSpeed) valSpeed.textContent = config.nominalSpeed;

    const labelSafety = document.getElementById("label-safety-margin");
    if (labelSafety) labelSafety.textContent = config.safetyLabel;

    const valSafety = document.getElementById("val-walkback-safety");
    if (valSafety) valSafety.textContent = config.safetyVal;

    // 6. Science payload roster
    renderPayloadChecklist(archetypeKey);

    // 7. Re-render waypoints and slope hazard banner for active site under new archetype
    renderWaypoints(activeSite || activeSiteKey);

    // 8. Emit mission archetype change across EventBus
    if (window.eventBus) {
      window.eventBus.emit("mission:archetype_change", {
        archetype: archetypeKey,
        config: config
      });
    }

    // Trigger stay constraint recalculation with new archetype bounds
    updatePowerBudgetAndStay();
  }

  /**
   * Dynamically renders the deployable instrument checklist for the active archetype.
   * @param {string} archetypeKey
   */
  function renderPayloadChecklist(archetypeKey) {
    const config = MISSION_ARCHETYPES[archetypeKey] || MISSION_ARCHETYPES.crewed;
    const headingEl = document.getElementById("payload-section-heading");
    if (headingEl) headingEl.textContent = config.payloadHeading;

    const container = document.getElementById("science-payload-checklist");
    if (!container) return;

    container.innerHTML = "";
    config.payloads.forEach(p => {
      const label = document.createElement("label");
      label.className = "check-item";
      label.innerHTML = `
        <input type="checkbox" id="payload-${p.id}" ${p.checked ? 'checked' : ''}>
        <span>${p.name}</span>
      `;
      container.appendChild(label);
    });
  }

  /**
   * Renders the interactive EVA waypoint route for the active candidate site.
   * Calculates authentic multi-leg traverse distances and vehicle-specific slope hazard alerts.
   * @param {Object|string} [siteOrKey]
   */
  function renderWaypoints(siteOrKey) {
    const container = document.getElementById("waypoint-route-list");
    const hazardBanner = document.getElementById("traverse-hazard-status");
    const valTraverse = document.getElementById("val-total-traverse");

    let site = typeof siteOrKey === "object" && siteOrKey !== null ? siteOrKey : activeSite;
    if (!site && window.LunarPhysics) {
      site = window.LunarPhysics.findSite(siteOrKey || activeSiteKey);
    }
    if (site) {
      activeSite = site;
      activeSiteKey = site.site_id;
    }

    const waypoints = generateTraverseWaypoints(site || activeSiteKey, activeArchetype);
    if (!container) return;

    container.innerHTML = "";

    // 1. Calculate cumulative multi-leg round-trip traverse distance
    let totalDistKm = 0;
    if (activeArchetype === "lander") {
      if (valTraverse) valTraverse.textContent = "30.0 m (Static Envelope)";
    } else if (waypoints.length >= 3) {
      const wp1 = waypoints[0];
      const wp2 = waypoints[1];
      const wp3 = waypoints[2];
      const leg1 = calculateLunarDistanceKm(wp1.lat, wp1.lon, wp2.lat, wp2.lon);
      const leg2 = calculateLunarDistanceKm(wp2.lat, wp2.lon, wp3.lat, wp3.lon);
      const leg3 = calculateLunarDistanceKm(wp3.lat, wp3.lon, wp1.lat, wp1.lon);
      totalDistKm = leg1 + leg2 + leg3;
      if (valTraverse) valTraverse.textContent = `${totalDistKm.toFixed(1)} km (Round-Trip)`;
    }

    // 2. Render waypoint cards
    waypoints.forEach((wp, idx) => {
      const item = document.createElement("div");
      item.className = `waypoint-item ${idx === 0 ? 'active' : ''}`;
      item.dataset.wpId = wp.id;
      item.dataset.lat = wp.lat;
      item.dataset.lon = wp.lon;

      item.innerHTML = `
        <div class="wp-number">${wp.num}</div>
        <div class="wp-info">
          <span class="wp-title">${wp.title}</span>
          <span class="wp-meta">${wp.dist} · Slope: ${wp.slope}° <span class="${wp.tagClass}">${wp.status}</span></span>
        </div>
        <button class="btn-wp-focus" title="Center 3D on Waypoint">📍</button>
      `;

      // Click on waypoint row
      item.addEventListener("click", (e) => {
        container.querySelectorAll(".waypoint-item").forEach(el => el.classList.remove("active"));
        item.classList.add("active");

        if (window.eventBus) {
          window.eventBus.emit("traverse:waypoint_select", {
            waypointId: wp.id,
            lat: wp.lat,
            lon: wp.lon,
            title: wp.title,
            slope: wp.slope,
            dist: wp.dist,
            archetype: activeArchetype
          });

          // If focus button was clicked, center 3D viewport
          if (e.target && e.target.closest && e.target.closest(".btn-wp-focus")) {
            window.eventBus.emit("site:marked", {
              lat: wp.lat,
              lon: wp.lon,
              name: wp.title,
              source: "waypoint-focus",
              focus: true
            });
          }
        }
      });

      container.appendChild(item);
    });

    // 3. Evaluate vehicle-specific slope hazard alert
    if (hazardBanner) {
      const config = MISSION_ARCHETYPES[activeArchetype] || MISSION_ARCHETYPES.crewed;
      const maxRouteSlope = Math.max(...waypoints.map(w => w.slope));
      const touchdownSlope = waypoints[0] ? waypoints[0].slope : 4.0;

      if (activeArchetype === "lander") {
        if (touchdownSlope > config.maxSlopeHazard) {
          hazardBanner.className = "hazard-callout danger";
          hazardBanner.innerHTML = `<span class="hazard-icon" style="color:var(--accent-danger,#b8544f);">⚠️</span><span>Critical Hazard: Touchdown slope of ${touchdownSlope}° exceeds ${config.maxSlopeHazard}.0° limit. Tip-over risk.</span>`;
        } else if (touchdownSlope > config.maxSlopeNominal) {
          hazardBanner.className = "hazard-callout warning";
          hazardBanner.innerHTML = `<span class="hazard-icon" style="color:var(--accent-sand,#c99e52);">⚠️</span><span>Caution: Touchdown slope of ${touchdownSlope}° causes asymmetric landing gear deflection.</span>`;
        } else {
          hazardBanner.className = "hazard-callout ok";
          hazardBanner.innerHTML = `<span class="hazard-icon">✓</span><span>Nominal landing attitude. Strut loads symmetrical (< ${config.maxSlopeNominal}.0°).</span>`;
        }
      } else if (activeArchetype === "rover") {
        if (maxRouteSlope > config.maxSlopeHazard) {
          hazardBanner.className = "hazard-callout danger";
          hazardBanner.innerHTML = `<span class="hazard-icon" style="color:var(--accent-danger,#b8544f);">⚠️</span><span>Warning: Route slope of ${maxRouteSlope}° exceeds ${config.maxSlopeHazard}.0° rover limit. High wheel-stall / entrapment risk.</span>`;
        } else if (maxRouteSlope > config.maxSlopeNominal) {
          hazardBanner.className = "hazard-callout warning";
          hazardBanner.innerHTML = `<span class="hazard-icon" style="color:var(--accent-sand,#c99e52);">⚠️</span><span>Caution: Slope reaches ${maxRouteSlope}°. Exceeds nominal driving grade; slip monitoring active.</span>`;
        } else {
          hazardBanner.className = "hazard-callout ok";
          hazardBanner.innerHTML = `<span class="hazard-icon">✓</span><span>Nominal driving terrain (< ${config.maxSlopeNominal}.0°). Regolith wheel traction optimal.</span>`;
        }
      } else {
        // Crewed or Base Camp
        if (maxRouteSlope > config.maxSlopeHazard) {
          hazardBanner.className = "hazard-callout danger";
          hazardBanner.innerHTML = `<span class="hazard-icon" style="color:var(--accent-danger,#b8544f);">⚠️</span><span>Warning: Traverse route reaches ${maxRouteSlope}° exceeding ${config.maxSlopeHazard}.0° limit. Low-gear traverse advised.</span>`;
        } else if (maxRouteSlope > config.maxSlopeNominal) {
          hazardBanner.className = "hazard-callout warning";
          hazardBanner.innerHTML = `<span class="hazard-icon" style="color:var(--accent-sand,#c99e52);">⚠️</span><span>Caution: Route crosses moderate slopes (up to ${maxRouteSlope}°). Reduced vehicle speed advised.</span>`;
        } else {
          hazardBanner.className = "hazard-callout ok";
          hazardBanner.innerHTML = `<span class="hazard-icon">✓</span><span>Route slope gradient remains within safe operational limits (< ${config.maxSlopeNominal}.0°).</span>`;
        }
      }
    }
  }

  /**
   * Orbital remote sensing basemap registry with authentic NASA / JAXA mission specifications.
   */
  const BASEMAP_CONFIGS = {
    lroc: {
      id: "lroc",
      name: "LROC WAC Albedo Mosaic",
      agency: "NASA",
      mission: "Lunar Reconnaissance Orbiter (LRO)",
      instrument: "Wide Angle Camera (WAC)",
      spectrum: "Visible Monochrome (395–689 nm)",
      resolution: "100 m/px global",
      datum: "IAU 1,737.4 km lunar sphere",
      description: "Photometrically normalized global surface reflectance showing albedo variations."
    },
    lola: {
      id: "lola",
      name: "LOLA Topographic Relief",
      agency: "NASA",
      mission: "Lunar Reconnaissance Orbiter (LRO)",
      instrument: "Lunar Orbiter Laser Altimeter (LOLA)",
      spectrum: "Near-IR Laser Pulse (1064 nm)",
      resolution: "59 m/px polar DEM",
      datum: "IAU 1,737.4 km lunar sphere (±1 m vertical precision)",
      description: "Laser altimeter shaded digital elevation model with synthetic hillshade relief illumination."
    },
    kaguya: {
      id: "kaguya",
      name: "Kaguya TC Ortho Terrain",
      agency: "JAXA",
      mission: "SELENE / Kaguya",
      instrument: "Terrain Camera (TC)",
      spectrum: "Stereoscopic Optical Photometry",
      resolution: "10 m/px high-contrast ortho",
      datum: "SELENE 2007 lunar coordinate system",
      description: "High-contrast stereoscopic imaging optimal for morphological feature tracing."
    }
  };

  let activeBasemap = "lroc";

  /**
   * Switches the active cartographic basemap and synchronizes DOM and global EventBus.
   * @param {string} basemapKey - 'lroc' | 'lola' | 'kaguya'
   * @returns {Object} Active basemap configuration
   */
  function setBasemap(basemapKey) {
    if (!BASEMAP_CONFIGS[basemapKey]) {
      console.warn(`[GISOverlays] Unknown basemap '${basemapKey}'. Defaulting to 'lroc'.`);
      basemapKey = "lroc";
    }

    activeBasemap = basemapKey;
    const config = BASEMAP_CONFIGS[basemapKey];

    // 1. Synchronize DOM cards and radio inputs
    const basemapCards = document.querySelectorAll(".basemap-card");
    basemapCards.forEach(card => {
      const isTarget = card.dataset.basemap === basemapKey;
      card.classList.toggle("active", isTarget);
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = isTarget;
    });

    // 2. Emit layer:basemap_change event across EventBus
    if (window.eventBus) {
      window.eventBus.emit("layer:basemap_change", {
        basemap: basemapKey,
        config: config
      });
    }

    return config;
  }

  /**
   * Initializes Right Drawer: Basemap selector and layer overlay checkboxes.
   */
  function initRightGISOverlays() {
    const basemapCards = document.querySelectorAll(".basemap-card");
    const toggleSlope = document.getElementById("layer-toggle-slope");
    const togglePsr = document.getElementById("layer-toggle-psr");
    const toggleIce = document.getElementById("layer-toggle-ice");
    const toggleDte = document.getElementById("layer-toggle-dte");
    const sliderOpacity = document.getElementById("slider-layer-opacity");
    const valOpacity = document.getElementById("val-layer-opacity");

    // 1. Basemap Selector Radio Cards
    basemapCards.forEach(card => {
      card.addEventListener("click", () => {
        const basemap = card.dataset.basemap;
        setBasemap(basemap);
      });

      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          if (e.preventDefault) e.preventDefault();
          const basemap = card.dataset.basemap;
          setBasemap(basemap);
        }
      });
    });

    // 2. Overlay Checkboxes
    function bindOverlayToggle(el, layerId) {
      if (el) {
        el.addEventListener("change", (e) => {
          if (window.eventBus) {
            window.eventBus.emit("layer:toggle", {
              layerId: layerId,
              enabled: e.target.checked
            });
          }
        });
      }
    }

    bindOverlayToggle(toggleSlope, "slope");
    bindOverlayToggle(togglePsr, "psr");
    bindOverlayToggle(toggleIce, "ice");
    bindOverlayToggle(toggleDte, "dte");

    // 3. Opacity Slider
    if (sliderOpacity) {
      sliderOpacity.addEventListener("input", (e) => {
        const pct = parseInt(e.target.value, 10);
        if (valOpacity) valOpacity.textContent = `${pct}%`;

        if (window.eventBus) {
          window.eventBus.emit("layer:opacity", { opacity: pct / 100 });
        }
      });
    }
  }

  /**
   * Updates active site context when an external site is selected.
   * Resolves site profiles through LunarPhysics.findSite() or synthesizes custom coordinates.
   */
  function updateActiveSiteContext(data) {
    if (!data) return;
    const siteTitleEl = document.getElementById("planner-site-name");

    let site = window.LunarPhysics ? window.LunarPhysics.findSite(data) : null;
    if (!site && window.LunarPhysics && window.LunarPhysics.synthesizeCustomSite) {
      const lat = typeof data.lat === "number" ? data.lat : parseFloat(data.lat);
      const lon = typeof data.lon === "number" ? data.lon : parseFloat(data.lon);
      if (!isNaN(lat) && !isNaN(lon)) {
        site = window.LunarPhysics.synthesizeCustomSite(lat, lon);
      }
    }

    if (site) {
      activeSite = site;
      activeSiteKey = site.site_id;
      if (siteTitleEl) {
        siteTitleEl.textContent = `📍 Active: ${site.name}`;
      }
      renderWaypoints(activeSite);
      updatePowerBudgetAndStay();
    } else if (data.name) {
      if (siteTitleEl) siteTitleEl.textContent = `📍 Active: ${data.name}`;
      const lower = data.name.toLowerCase();
      if (lower.includes("shackleton")) activeSiteKey = "shackleton";
      else if (lower.includes("ridge")) activeSiteKey = "ridge";
      else if (lower.includes("malapert")) activeSiteKey = "malapert";
      renderWaypoints(activeSiteKey);
      updatePowerBudgetAndStay();
    }
  }

  // Export public interface for test suites and cross-component integration
  window.MissionPlanner = {
    setArchetype: setMissionArchetype,
    getArchetype: () => activeArchetype,
    getArchetypeConfig: (key) => MISSION_ARCHETYPES[key || activeArchetype],
    ARCHETYPES: MISSION_ARCHETYPES,
    getActiveSite: () => activeSite,
    getActiveSiteKey: () => activeSiteKey,
    generateTraverseWaypoints: generateTraverseWaypoints,
    renderWaypoints: renderWaypoints,
    calculateLunarDistanceKm: calculateLunarDistanceKm,
    updatePowerBudgetAndStay: updatePowerBudgetAndStay
  };

  // Export public interface for Right Drawer GIS Remote Sensing & Spatial Overlays
  window.GISOverlays = {
    setBasemap: setBasemap,
    getBasemap: () => activeBasemap,
    getBasemapConfig: (key) => BASEMAP_CONFIGS[key || activeBasemap],
    BASEMAPS: BASEMAP_CONFIGS
  };

  // Safe DOM ready check
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMissionDrawers);
  } else {
    initMissionDrawers();
  }
})();
