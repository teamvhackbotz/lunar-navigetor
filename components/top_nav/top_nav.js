/**
 * ==============================================================================
 * Lunar Landing Site Navigator - Top Navigation Bar
 * File: components/top_nav/top_nav.js
 * Role: Initializes navigation bar click listeners and dispatches modal events.
 * ==============================================================================
 */

(function() {
  /**
   * Binds click event listener to the settings button (#btn-open-settings)
   * to broadcast the 'settings:open' event across the global EventBus.
   */
  function initTopNav() {
    const btnSettings = document.getElementById("btn-open-settings");
    if (btnSettings) {
      btnSettings.addEventListener("click", () => {
        if (window.eventBus) {
          window.eventBus.emit("settings:open");
        }
      });
    }

    const btnSearch = document.getElementById("btn-open-search");
    if (btnSearch) {
      btnSearch.addEventListener("click", () => {
        if (window.eventBus) {
          window.eventBus.emit("search:open");
        }
      });
    }

    // Sync Candidate Sites Count Badge with Comparison Deck
    const compareBadge = document.getElementById("top-nav-compare-badge");
    if (window.eventBus && compareBadge) {
      window.eventBus.on("cards:synced", (payload) => {
        const total = (payload && typeof payload.total === "number") ? payload.total : 0;
        compareBadge.textContent = total;
      });
    }

    // Backend FastAPI Status Pill
    const pill = document.getElementById("backend-status-pill");
    function updateBackendPill(online, detail) {
      if (!pill) return;
      if (online) {
        pill.className = "backend-pill online";
        const count = detail && detail.cached_curated_sites ? detail.cached_curated_sites : 21;
        pill.innerHTML = `<span class="status-dot"></span><span class="status-label">API: LIVE (${count})</span>`;
        pill.title = `FastAPI Telemetry Online at http://localhost:8000\n${count} Curated NASA Profiles Loaded\nJPL Horizons Ephemeris Proxy Active (Click to re-probe)`;
      } else {
        pill.className = "backend-pill offline";
        pill.innerHTML = `<span class="status-dot"></span><span class="status-label">OFFLINE (STATIC)</span>`;
        pill.title = `FastAPI Backend Unreachable.\nOperating in 100% Offline Mode with Bundled NASA Dataset. (Click to retry)`;
      }
    }

    if (window.eventBus) {
      window.eventBus.on("backend:status", (payload) => {
        updateBackendPill(payload && payload.online, payload && payload.data);
      });
      window.eventBus.on("telemetry:loaded", (payload) => {
        if (payload && payload.source === "fastapi") {
          updateBackendPill(true, { cached_curated_sites: payload.sitesCount });
        }
      });
    }

    if (pill) {
      pill.addEventListener("click", async () => {
        pill.className = "backend-pill connecting";
        pill.innerHTML = `<span class="status-dot"></span><span class="status-label">PROBING...</span>`;
        if (window.LunarPhysics && window.LunarPhysics.probeBackend) {
          const live = await window.LunarPhysics.probeBackend();
          updateBackendPill(live);
        }
      });
    }

    if (window.LunarPhysics && window.LunarPhysics.isBackendConnected) {
      updateBackendPill(window.LunarPhysics.isBackendConnected());
    }
  }

  // Safe DOM ready check: initialize immediately if DOM loaded, or on DOMContentLoaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTopNav);
  } else {
    initTopNav();
  }
})();
