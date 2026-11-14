/**
 * ==============================================================================
 * Lunar Landing Site Navigator - Quick Search Command Palette Controller
 * File: components/search_palette/search_palette.js
 * Role: Quick search command palette for instant landing site filtering,
 *       selenographic coordinate queries, and immediate 3D camera navigation.
 * ==============================================================================
 */

(function() {
  let isPaletteOpen = false;
  let selectedIndex = 0;
  let currentResults = [];

  function getSites() {
    if (window.CoordMath && Array.isArray(window.CoordMath.KNOWN_SITES)) {
      return window.CoordMath.KNOWN_SITES;
    }
    return [
      { name: "Peak Near Shackleton", lat: -89.6, lon: 129.2, type: "Artemis III" },
      { name: "Connecting Ridge", lat: -89.4, lon: 222.6, type: "CLPS IM-2" },
      { name: "Faustini Rim A", lat: -87.1, lon: 67.0, type: "Artemis III" },
      { name: "Malapert Massif", lat: -85.9, lon: 2.9, type: "Artemis III" },
      { name: "Nobile Rim 2", lat: -84.2, lon: 60.7, type: "Artemis III" },
      { name: "Amundsen Rim", lat: -84.5, lon: 105.0, type: "Artemis III" },
      { name: "Chandrayaan-3", lat: -69.37, lon: 32.35, type: "ISRO Milestone" },
      { name: "Apollo 11", lat: 0.674, lon: 23.473, type: "Apollo Baseline" },
      { name: "Apollo 17", lat: 20.191, lon: 30.772, type: "Apollo Baseline" },
      { name: "Hermite Crater (North)", lat: 86.0, lon: 270.0, type: "North Cold Trap" }
    ];
  }

  function parseCoordinates(query) {
    // Matches expressions like "-89.4, 222.6" or "89.4S 220E" or "85.2 45"
    const trimmed = query.trim();
    const coordRegex = /^([+-]?\d+(?:\.\d+)?)[,\s]+([+-]?\d+(?:\.\d+)?)$/;
    const match = trimmed.match(coordRegex);
    if (match) {
      const lat = parseFloat(match[1]);
      const lon = parseFloat(match[2]);
      if (lat >= -90 && lat <= 90 && lon >= -360 && lon <= 360) {
        const normLon = (lon % 360 + 360) % 360;
        return {
          name: `Custom Target (${Math.abs(lat).toFixed(2)}° ${lat < 0 ? "S" : "N"}, ${normLon.toFixed(1)}° E)`,
          lat: lat,
          lon: normLon,
          type: "Custom Coordinate",
          isCustom: true
        };
      }
    }
    return null;
  }

  function renderResults() {
    const listEl = document.getElementById("search-results-list");
    const countEl = document.getElementById("search-results-count");
    if (!listEl) return;

    if (currentResults.length === 0) {
      listEl.innerHTML = `<div class="search-empty-state">No matching lunar sites found. Try searching by name or enter coordinates (e.g. -89.4, 222.6).</div>`;
      if (countEl) countEl.textContent = "0 Sites Found";
      return;
    }

    if (countEl) countEl.textContent = `${currentResults.length} Site${currentResults.length === 1 ? "" : "s"} Found`;

    listEl.innerHTML = currentResults.map((site, index) => {
      const isSelected = index === selectedIndex;
      const latStr = `${Math.abs(site.lat).toFixed(2)}° ${site.lat < 0 ? "S" : "N"}`;
      const lonStr = `${site.lon.toFixed(1)}° E`;
      let tagClass = "search-tag";
      if (site.type && site.type.includes("Artemis")) tagClass += " tag-artemis";
      else if (site.type && site.type.includes("CLPS")) tagClass += " tag-clps";

      return `
        <div class="search-result-item ${isSelected ? "selected" : ""}" data-index="${index}">
          <div class="search-item-left">
            <span class="search-item-name">${site.name}</span>
            <span class="search-item-coords">${latStr} · ${lonStr}</span>
          </div>
          <div class="search-item-right">
            <span class="${tagClass}">${site.type || "Landing Zone"}</span>
          </div>
        </div>
      `;
    }).join("");

    // Scroll active item into view
    const selectedEl = listEl.querySelector(".search-result-item.selected");
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: "nearest" });
    }
  }

  function filterSites(query) {
    const allSites = getSites();
    const q = query.trim().toLowerCase();

    const customCoord = parseCoordinates(query);
    let matched = [];

    if (customCoord) {
      matched.push(customCoord);
    }

    if (!q) {
      matched = matched.concat(allSites);
    } else {
      const filtered = allSites.filter(s => 
        s.name.toLowerCase().includes(q) || 
        (s.type && s.type.toLowerCase().includes(q))
      );
      matched = matched.concat(filtered);
    }

    currentResults = matched;
    selectedIndex = 0;
    renderResults();
  }

  function selectCurrentSite() {
    if (currentResults.length > 0 && selectedIndex >= 0 && selectedIndex < currentResults.length) {
      const site = currentResults[selectedIndex];
      if (window.eventBus) {
        window.eventBus.emit("site:marked", {
          lat: site.lat,
          lon: site.lon,
          name: site.name,
          source: "search-palette",
          focus: true
        });
      }
      closePalette();
    }
  }

  function openPalette() {
    const overlay = document.getElementById("search-palette-overlay");
    const input = document.getElementById("site-search-input");
    if (!overlay) return;

    overlay.style.display = "flex";
    isPaletteOpen = true;

    filterSites(input ? input.value : "");
    if (input) {
      input.focus();
      input.select();
    }
  }

  function closePalette() {
    const overlay = document.getElementById("search-palette-overlay");
    if (!overlay) return;
    overlay.style.display = "none";
    isPaletteOpen = false;
  }

  function initSearchPalette() {
    const overlay = document.getElementById("search-palette-overlay");
    const modal = document.getElementById("search-palette-modal");
    const input = document.getElementById("site-search-input");
    const closeBtn = document.getElementById("search-palette-close");
    const listEl = document.getElementById("search-results-list");

    if (input) {
      input.addEventListener("input", (e) => {
        filterSites(e.target.value);
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (currentResults.length > 0) {
            selectedIndex = (selectedIndex + 1) % currentResults.length;
            renderResults();
          }
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          if (currentResults.length > 0) {
            selectedIndex = (selectedIndex - 1 + currentResults.length) % currentResults.length;
            renderResults();
          }
        } else if (e.key === "Enter") {
          e.preventDefault();
          selectCurrentSite();
        } else if (e.key === "Escape") {
          e.preventDefault();
          closePalette();
        }
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        closePalette();
      });
    }

    if (overlay) {
      overlay.addEventListener("click", (e) => {
        if (!e.target.closest("#search-palette-modal")) {
          closePalette();
        }
      });
    }

    if (listEl) {
      listEl.addEventListener("click", (e) => {
        const item = e.target.closest(".search-result-item");
        if (item) {
          const idx = parseInt(item.dataset.index, 10);
          if (!isNaN(idx)) {
            selectedIndex = idx;
            selectCurrentSite();
          }
        }
      });
    }

    // EventBus bindings
    if (window.eventBus) {
      window.eventBus.on("search:open", openPalette);
      window.eventBus.on("search:close", closePalette);
      window.eventBus.on("search:toggle", () => {
        if (isPaletteOpen) closePalette();
        else openPalette();
      });
    }

    // Expose controller globally
    window.SearchPalette = {
      open: openPalette,
      close: closePalette,
      isOpen: () => isPaletteOpen
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSearchPalette);
  } else {
    initSearchPalette();
  }
})();
