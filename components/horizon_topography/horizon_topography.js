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
  // Curated EVA traverse waypoints per landing candidate site
  const WAYPOINT_DATA = {
    shackleton: [
      { id: "wp-1", num: "WP 1", title: "Touchdown Landing Zone", lat: -89.6, lon: 129.2, dist: "0.0 km", slope: 4.2, status: "Nominal", tagClass: "tag-safe" },
      { id: "wp-2", num: "WP 2", title: "Eastern Saddle Station", lat: -89.5, lon: 135.4, dist: "1.2 km", slope: 6.8, status: "Caution", tagClass: "tag-warn" },
      { id: "wp-3", num: "WP 3", title: "PSR Cold Trap Perimeter", lat: -89.4, lon: 142.0, dist: "2.4 km", slope: 14.1, status: "Steep Flank", tagClass: "tag-danger" }
    ],
    ridge: [
      { id: "wp-1", num: "WP 1", title: "Connecting Saddle Touchdown", lat: -89.4, lon: 222.6, dist: "0.0 km", slope: 5.8, status: "Moderate", tagClass: "tag-warn" },
      { id: "wp-2", num: "WP 2", title: "Solar Crest Array Site", lat: -89.3, lon: 228.0, dist: "1.8 km", slope: 7.2, status: "Moderate", tagClass: "tag-warn" },
      { id: "wp-3", num: "WP 3", title: "De Gerlache Overlook", lat: -89.1, lon: 235.2, dist: "3.6 km", slope: 11.4, status: "Steep Crest", tagClass: "tag-danger" }
    ],
    malapert: [
      { id: "wp-1", num: "WP 1", title: "Massif Summit Plateau", lat: -85.9, lon: 2.9, dist: "0.0 km", slope: 8.1, status: "Steep Touchdown", tagClass: "tag-danger" },
      { id: "wp-2", num: "WP 2", title: "DSN Telecommunications Mast", lat: -85.8, lon: 3.5, dist: "0.9 km", slope: 9.4, status: "Caution", tagClass: "tag-warn" },
      { id: "wp-3", num: "WP 3", title: "Northern Escarpment Edge", lat: -85.6, lon: 4.2, dist: "2.1 km", slope: 22.6, status: "Severe Hazard", tagClass: "tag-danger" }
    ]
  };

  let activeSiteKey = "shackleton";

  /**
   * Initializes event listeners for the Left Mission Planner and Right GIS Overlays.
   */
  function initMissionDrawers() {
    initLeftMissionPlanner();
    initRightGISOverlays();

    // Subscribe to site marking events across EventBus
    if (window.eventBus) {
      window.eventBus.on("site:marked", (data) => {
        updateActiveSiteContext(data);
      });
    }
  }

  /**
   * Initializes Left Drawer: Stay duration slider, waypoints, and hazard monitor.
   */
  function initLeftMissionPlanner() {
    const sliderStay = document.getElementById("slider-stay-duration");
    const valStay = document.getElementById("val-stay-duration");
    const valMargin = document.getElementById("val-daylight-margin");
    const valBatterySoc = document.getElementById("val-battery-soc");
    const barBatterySoc = document.getElementById("bar-battery-soc");

    if (sliderStay) {
      sliderStay.addEventListener("input", (e) => {
        const hrs = parseInt(e.target.value, 10);
        const days = (hrs / 24).toFixed(1);
        if (valStay) valStay.textContent = `${hrs} hrs (${days} days)`;

        // Calculate daylight and battery margins
        const marginHrs = Math.max(0, 180 - hrs);
        if (valMargin) valMargin.textContent = `+${marginHrs} hrs reserve`;

        const socPct = Math.max(45, Math.min(100, Math.round(100 - (hrs * 0.12))));
        if (valBatterySoc) valBatterySoc.textContent = `${socPct}% Nominal`;
        if (barBatterySoc) barBatterySoc.style.width = `${socPct}%`;

        if (window.eventBus) {
          window.eventBus.emit("mission:constraint_change", {
            stayHours: hrs,
            batterySoc: socPct,
            daylightMargin: marginHrs
          });
        }
      });
    }

    renderWaypoints(activeSiteKey);
  }

  /**
   * Renders the interactive EVA waypoint route for the active candidate site.
   */
  function renderWaypoints(siteKey) {
    const container = document.getElementById("waypoint-route-list");
    const hazardBanner = document.getElementById("traverse-hazard-status");
    const waypoints = WAYPOINT_DATA[siteKey] || WAYPOINT_DATA.shackleton;
    if (!container) return;

    container.innerHTML = "";
    let hasHazard = false;

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

      if (wp.slope > 15) hasHazard = true;

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
            slope: wp.slope
          });

          // If focus button was clicked, center 3D viewport
          if (e.target.closest(".btn-wp-focus")) {
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

    // Update slope hazard alert callout
    if (hazardBanner) {
      if (hasHazard) {
        hazardBanner.className = "hazard-callout warning";
        hazardBanner.innerHTML = `<span class="hazard-icon" style="color:var(--accent-danger,#b8544f);">⚠️</span><span>Warning: Traverse route exceeds 15.0° slope limit on final flank. Low-gear traverse advised.</span>`;
      } else {
        hazardBanner.className = "hazard-callout ok";
        hazardBanner.innerHTML = `<span class="hazard-icon">✓</span><span>Route slope gradient remains within safe operational limits (&lt; 15.0°).</span>`;
      }
    }
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
        basemapCards.forEach(c => c.classList.remove("active"));
        card.classList.add("active");
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;

        const basemap = card.dataset.basemap;
        if (window.eventBus) {
          window.eventBus.emit("layer:basemap_change", { basemap: basemap });
        }
        console.log(`[GISOverlays] Switched optical basemap to: ${basemap}`);
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
   */
  function updateActiveSiteContext(data) {
    const siteTitleEl = document.getElementById("planner-site-name");
    if (siteTitleEl && data.name) {
      siteTitleEl.textContent = `📍 Active: ${data.name}`;
    }

    let site = window.LunarPhysics ? window.LunarPhysics.findSite(data) : null;
    if (site) {
      activeSiteKey = site.site_id;
      // Generate authentic waypoints from NASA dataset
      WAYPOINT_DATA[site.site_id] = [
        {
          id: `${site.site_id}-wp1`,
          num: "WP 1",
          title: "Touchdown Landing Zone",
          lat: site.coordinates.lat,
          lon: site.coordinates.lon,
          dist: "0.0 km",
          slope: site.terrain.slope_touchdown_deg,
          status: site.terrain.slope_status,
          tagClass: site.terrain.slope_color.replace("status-", "tag-")
        },
        {
          id: `${site.site_id}-wp2`,
          num: "WP 2",
          title: "Solar Array Crest Station",
          lat: +(site.coordinates.lat + 0.05).toFixed(2),
          lon: +(site.coordinates.lon + 0.5).toFixed(1),
          dist: "1.2 km",
          slope: +(site.terrain.slope_touchdown_deg * 1.3).toFixed(1),
          status: site.terrain.slope_touchdown_deg < 5 ? "Nominal" : "Caution",
          tagClass: site.terrain.slope_touchdown_deg < 5 ? "tag-safe" : "tag-warn"
        },
        {
          id: `${site.site_id}-wp3`,
          num: "WP 3",
          title: `${site.terrain.psr_name} Perimeter`,
          lat: +(site.coordinates.lat + 0.12).toFixed(2),
          lon: +(site.coordinates.lon + 1.2).toFixed(1),
          dist: `${site.terrain.dist_to_psr_km} km`,
          slope: site.terrain.max_gradient_deg,
          status: site.terrain.max_gradient_deg > 18 ? "Severe Hazard" : "Steep Incline",
          tagClass: site.terrain.max_gradient_deg > 18 ? "tag-danger" : "tag-warn"
        }
      ];
      renderWaypoints(site.site_id);
    } else if (data.name) {
      const lower = data.name.toLowerCase();
      if (lower.includes("shackleton")) activeSiteKey = "shackleton";
      else if (lower.includes("ridge")) activeSiteKey = "ridge";
      else if (lower.includes("malapert")) activeSiteKey = "malapert";
      renderWaypoints(activeSiteKey);
    }
  }

  // Safe DOM ready check
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMissionDrawers);
  } else {
    initMissionDrawers();
  }
})();
