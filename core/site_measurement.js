/**
 * Coordinates the shared two-site selection, context menu, and lunar distance action.
 */
(function () {
  let selectedSites = [];
  let measurement = null;
  let contextMenu = null;

  function getSiteKey(site) {
    if (site.siteId) return String(site.siteId);
    return `${site.lat.toFixed(5)}:${site.lon.toFixed(5)}`;
  }

  function isValidSite(site) {
    return site &&
      Number.isFinite(site.lat) &&
      Number.isFinite(site.lon) &&
      site.lat >= -90 &&
      site.lat <= 90;
  }

  function emitSelection() {
    if (window.eventBus) {
      window.eventBus.emit("site-measurement:selection-changed", {
        sites: selectedSites.slice()
      });
    }
  }

  function emitMeasurement() {
    if (window.eventBus) {
      window.eventBus.emit("site-measurement:changed", measurement);
    }
  }

  function hideContextMenu() {
    if (contextMenu) {
      contextMenu.remove();
      contextMenu = null;
    }
  }

  function selectSite(site) {
    const key = getSiteKey(site);
    const existingIndex = selectedSites.findIndex(point => getSiteKey(point) === key);
    if (existingIndex >= 0) {
      selectedSites.splice(existingIndex, 1);
    } else if (selectedSites.length === 2) {
      selectedSites = [site];
    } else {
      selectedSites.push(site);
    }

    measurement = null;
    emitSelection();
    emitMeasurement();
  }

  function measureSelectedSites() {
    if (selectedSites.length !== 2) {
      return { error: "Select two marked sites with Shift + right-click first." };
    }
    if (!window.CoordMath ||
        typeof window.CoordMath.calculateDistanceKm !== "function" ||
        typeof window.CoordMath.getGreatCirclePoints !== "function") {
      return { error: "Lunar coordinate calculations are unavailable." };
    }

    const [start, end] = selectedSites;
    const distanceKm = window.CoordMath.calculateDistanceKm(
      start.lat, start.lon, end.lat, end.lon
    );
    const path = window.CoordMath.getGreatCirclePoints(
      start.lat, start.lon, end.lat, end.lon
    );
    if (!Number.isFinite(distanceKm) || path.length < 2) {
      return { error: "Could not calculate a surface route for these sites." };
    }

    measurement = {
      sites: selectedSites.slice(),
      distanceKm,
      path
    };
    emitMeasurement();
    return { measurement };
  }

  function showContextMenu(event) {
    hideContextMenu();

    contextMenu = document.createElement("div");
    contextMenu.className = "site-measure-context-menu";
    contextMenu.setAttribute("role", "menu");
    contextMenu.setAttribute("aria-label", "Site actions");

    const action = document.createElement("button");
    action.type = "button";
    action.className = "site-measure-context-action";
    action.textContent = "Measure distance";
    action.setAttribute("role", "menuitem");
    action.addEventListener("click", () => {
      const result = measureSelectedSites();
      if (result.error) {
        action.textContent = result.error;
        action.disabled = true;
        return;
      }
      hideContextMenu();
    });

    contextMenu.appendChild(action);
    document.body.appendChild(contextMenu);

    const menuRect = contextMenu.getBoundingClientRect();
    const left = Math.max(4, Math.min(event.clientX, window.innerWidth - menuRect.width - 4));
    const top = Math.max(4, Math.min(event.clientY, window.innerHeight - menuRect.height - 4));
    contextMenu.style.left = `${left}px`;
    contextMenu.style.top = `${top}px`;
    action.focus();
  }

  function handleContextMenu(event, site) {
    if (!isValidSite(site)) return false;

    if (event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      hideContextMenu();
      selectSite(site);
      return true;
    }

    const key = getSiteKey(site);
    if (selectedSites.length === 2 &&
        selectedSites.some(point => getSiteKey(point) === key)) {
      event.preventDefault();
      event.stopPropagation();
      showContextMenu(event);
      return true;
    }
    return false;
  }

  function syncSites(sites) {
    if (!Array.isArray(sites)) return;
    const availableSites = new Map(
      sites.filter(isValidSite).map(site => [getSiteKey(site), site])
    );
    const nextSelection = selectedSites
      .map(site => availableSites.get(getSiteKey(site)))
      .filter(Boolean);

    if (nextSelection.length !== selectedSites.length) {
      selectedSites = nextSelection;
      measurement = null;
      hideContextMenu();
      emitSelection();
      emitMeasurement();
    } else {
      selectedSites = nextSelection;
    }
  }

  function clear() {
    hideContextMenu();
    selectedSites = [];
    measurement = null;
    emitSelection();
    emitMeasurement();
  }

  document.addEventListener("pointerdown", event => {
    if (contextMenu && !contextMenu.contains(event.target)) {
      hideContextMenu();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && (contextMenu || selectedSites.length || measurement)) {
      event.preventDefault();
      clear();
    }
  });

  window.SiteMeasurement = {
    clear,
    getMeasurement: () => measurement,
    getSelectedSites: () => selectedSites.slice(),
    handleContextMenu,
    isSelected: site => isValidSite(site) &&
      selectedSites.some(point => getSiteKey(point) === getSiteKey(site)),
    syncSites
  };
})();
