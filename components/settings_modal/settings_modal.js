/**
 * ==============================================================================
 * Lunar Landing Site Navigator - Mission Cockpit Settings Modal
 * File: components/settings_modal/settings_modal.js
 * Role: Manages local storage persistence, theme switching (body CSS classes),
 *       3D graphics preferences, and EventBus emission for settings changes.
 * ==============================================================================
 */

(function() {
  // Browser localStorage storage key
  const STORAGE_KEY = "spaceapp_mission_settings";

  // Default flight room cockpit preferences
  const defaultSettings = {
    theme: "earth",           // 'earth' | 'regolith' | 'space'
    terrainExag: "2",         // '1' (1.0x) | '2' (2.0x) | '3' (3.0x)
    shadowQuality: "high",    // 'high' | 'medium' | 'low'
    coordGrid: true,          // Polar latitude/longitude grid wireframe
    librationWobble: true,    // Earth orbital libration calculation
    coordFormat: "decimal",   // 'decimal' | 'dms'
    timeFormat: "utc",        // 'utc' | 'met' | 'lst'
    cardLayout: "dropdown",   // 'dropdown' | 'shelf'
    inspectMode: "modal",     // 'modal' | 'hud'
    map2dMode: "single",      // 'single' | 'tri'
    map2dProjection: "south", // 'south' | 'global' | 'north'
    map2dLeftWing: false,     // Left Wing (Targets): false (collapsed) | true (expanded)
    map2dRightWing: false,    // Right Wing (Telemetry): false (collapsed) | true (expanded)
    map2dHeight: "baseline",  // 'baseline' (390px) | 'maximized' (500px)
    shortcutsEnabled: true    // Global cockpit hotkeys
  };

  // Working state object
  let currentSettings = { ...defaultSettings };

  /**
   * Retrieves previously saved settings from the browser's localStorage.
   * Merges saved preferences with default values as a fallback.
   */
  function loadSavedSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        currentSettings = { ...defaultSettings, ...JSON.parse(saved) };
      }
      if (window.ThemeManager) {
        currentSettings.theme = window.ThemeManager.getCurrentTheme();
      }
    } catch (e) {
      console.warn("Could not read settings from localStorage", e);
    }
  }

  /**
   * Persists current cockpit settings to localStorage as a JSON string.
   */
  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSettings));
    } catch (e) {
      console.warn("Could not save settings to localStorage", e);
    }
  }

  /**
   * Applies the selected operational color theme by delegating to ThemeManager.
   * Updates visual radio card selection states and synchronizes in-memory settings.
   *
   * @param {'earth'|'regolith'|'space'} themeName - Selected theme identifier
   */
  function applyTheme(themeName) {
    currentSettings.theme = themeName;

    // Delegate to decoupled ThemeManager if loaded
    if (window.ThemeManager) {
      window.ThemeManager.setTheme(themeName);
    } else {
      document.body.classList.remove("theme-earth", "theme-regolith", "theme-space", "theme-contrast");
      document.body.classList.add(`theme-${themeName}`);
      if (window.eventBus) {
        window.eventBus.emit("theme:changed", { theme: themeName });
      }
    }

    // Update UI radio cards in settings dialog
    const cards = document.querySelectorAll(".theme-card");
    cards.forEach(card => {
      const radio = card.querySelector('input[type="radio"]');
      if (card.dataset.theme === themeName) {
        card.classList.add("active");
        if (radio) radio.checked = true;
      } else {
        card.classList.remove("active");
        if (radio) radio.checked = false;
      }
    });
  }

  /**
   * Synchronizes the HTML form controls (selects, checkboxes, radio cards)
   * with the current in-memory settings object.
   */
  function syncUIFromSettings() {
    applyTheme(currentSettings.theme);

    const exag = document.getElementById("setting-terrain-exag");
    if (exag) exag.value = currentSettings.terrainExag;

    const shadow = document.getElementById("setting-shadow-quality");
    if (shadow) shadow.value = currentSettings.shadowQuality;

    const grid = document.getElementById("setting-coord-grid");
    if (grid) grid.checked = currentSettings.coordGrid;

    const wobble = document.getElementById("setting-libration-wobble");
    if (wobble) wobble.checked = currentSettings.librationWobble;

    const coordFmt = document.getElementById("setting-coord-format");
    if (coordFmt) coordFmt.value = currentSettings.coordFormat;

    const timeFmt = document.getElementById("setting-time-format");
    if (timeFmt) timeFmt.value = currentSettings.timeFormat;

    const cardLayout = document.getElementById("setting-card-layout");
    if (cardLayout) cardLayout.value = currentSettings.cardLayout || "dropdown";

    const inspectMode = document.getElementById("setting-inspect-mode");
    if (inspectMode) inspectMode.value = currentSettings.inspectMode || "modal";

    const mapMode = document.getElementById("setting-map2d-mode");
    if (mapMode) mapMode.value = currentSettings.map2dMode || "single";

    const mapProj = document.getElementById("setting-map2d-projection");
    if (mapProj) mapProj.value = currentSettings.map2dProjection || "south";

    const mapLeftWing = document.getElementById("setting-map2d-left-wing");
    if (mapLeftWing) mapLeftWing.value = currentSettings.map2dLeftWing ? "expanded" : "collapsed";

    const mapRightWing = document.getElementById("setting-map2d-right-wing");
    if (mapRightWing) mapRightWing.value = currentSettings.map2dRightWing ? "expanded" : "collapsed";

    const mapHeight = document.getElementById("setting-map2d-height");
    if (mapHeight) mapHeight.value = currentSettings.map2dHeight || "baseline";

    const shortcutsCheck = document.getElementById("setting-shortcuts-enabled");
    if (shortcutsCheck) shortcutsCheck.checked = (currentSettings.shortcutsEnabled !== false);
  }

  /**
   * Reads user selections from the modal inputs, persists them to localStorage,
   * and broadcasts updates across the EventBus to update 3D graphics and UI formatting.
   */
  function readSettingsFromUI() {
    const exag = document.getElementById("setting-terrain-exag");
    if (exag) currentSettings.terrainExag = exag.value;

    const shadow = document.getElementById("setting-shadow-quality");
    if (shadow) currentSettings.shadowQuality = shadow.value;

    const grid = document.getElementById("setting-coord-grid");
    if (grid) currentSettings.coordGrid = grid.checked;

    const wobble = document.getElementById("setting-libration-wobble");
    if (wobble) currentSettings.librationWobble = wobble.checked;

    const coordFmt = document.getElementById("setting-coord-format");
    if (coordFmt) currentSettings.coordFormat = coordFmt.value;

    const timeFmt = document.getElementById("setting-time-format");
    if (timeFmt) currentSettings.timeFormat = timeFmt.value;

    const cardLayout = document.getElementById("setting-card-layout");
    if (cardLayout) currentSettings.cardLayout = cardLayout.value;

    const inspectMode = document.getElementById("setting-inspect-mode");
    if (inspectMode) currentSettings.inspectMode = inspectMode.value;

    const mapMode = document.getElementById("setting-map2d-mode");
    if (mapMode) currentSettings.map2dMode = mapMode.value;

    const mapProj = document.getElementById("setting-map2d-projection");
    if (mapProj) currentSettings.map2dProjection = mapProj.value;

    const mapLeftWing = document.getElementById("setting-map2d-left-wing");
    if (mapLeftWing) currentSettings.map2dLeftWing = (mapLeftWing.value === "expanded");

    const mapRightWing = document.getElementById("setting-map2d-right-wing");
    if (mapRightWing) currentSettings.map2dRightWing = (mapRightWing.value === "expanded");

    const mapHeight = document.getElementById("setting-map2d-height");
    if (mapHeight) currentSettings.map2dHeight = mapHeight.value;

    const shortcutsCheck = document.getElementById("setting-shortcuts-enabled");
    if (shortcutsCheck) {
      currentSettings.shortcutsEnabled = shortcutsCheck.checked;
      if (window.CockpitShortcuts) {
        window.CockpitShortcuts.setEnabled(shortcutsCheck.checked);
      }
    }

    // Save preferences
    saveSettings();

    // Broadcast granular events across the EventBus
    if (window.eventBus) {
      window.eventBus.emit("settings:changed", { ...currentSettings });
      window.eventBus.emit("grid:toggle", { enabled: currentSettings.coordGrid });
      window.eventBus.emit("terrain:exaggeration", { factor: parseFloat(currentSettings.terrainExag) });
      window.eventBus.emit("cardlayout:changed", { layout: currentSettings.cardLayout });
      window.eventBus.emit("inspectmode:changed", { mode: currentSettings.inspectMode });
      window.eventBus.emit("map2d:set_layout", {
        mode: currentSettings.map2dMode,
        projection: currentSettings.map2dProjection,
        leftWing: currentSettings.map2dLeftWing,
        rightWing: currentSettings.map2dRightWing,
        maximized: currentSettings.map2dHeight === "maximized"
      });
    }
  }

  /**
   * Component initialization: attaches DOM event listeners, handles modal transitions,
   * and connects to EventBus topics.
   */
  function initSettingsModal() {
    const overlay = document.getElementById("settings-modal-overlay");
    const closeBtn = document.getElementById("settings-close-btn");
    const applyBtn = document.getElementById("settings-apply-btn");
    const resetBtn = document.getElementById("settings-reset-btn");
    const themeCards = document.querySelectorAll(".theme-card");

    // Load initial settings and synchronize form elements
    loadSavedSettings();
    syncUIFromSettings();

    // Opens the modal overlay with a smooth opacity transition
    function openModal() {
      if (overlay) {
        overlay.style.display = "flex";
        // Force browser reflow so CSS transition triggers properly
        void overlay.offsetWidth;
        overlay.classList.add("active");
      }
    }

    // Dismisses the modal dialog
    function closeModal() {
      if (overlay) {
        overlay.classList.remove("active");
        setTimeout(() => {
          overlay.style.display = "none";
        }, 250);
      }
    }

    // Close button click listener
    if (closeBtn) closeBtn.addEventListener("click", closeModal);

    // Apply & Close button listener
    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        readSettingsFromUI();
        closeModal();
      });
    }

    // Reset Defaults button listener
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        currentSettings = { ...defaultSettings };
        syncUIFromSettings();
        saveSettings();
        if (window.eventBus) {
          window.eventBus.emit("settings:changed", { ...currentSettings });
        }
      });
    }

    // Theme preview card clicks (instant preview)
    themeCards.forEach(card => {
      card.addEventListener("click", (e) => {
        const theme = card.dataset.theme;
        if (theme) applyTheme(theme);
      });
    });

    // Category Sidebar Navigation Tab Switching
    const navItems = document.querySelectorAll(".settings-nav-item");
    const panes = document.querySelectorAll(".settings-pane");

    navItems.forEach(item => {
      item.addEventListener("click", () => {
        const tab = item.dataset.tab;
        navItems.forEach(n => n.classList.remove("active"));
        panes.forEach(p => p.classList.remove("active"));

        item.classList.add("active");
        const targetPane = document.getElementById(`pane-${tab}`);
        if (targetPane) targetPane.classList.add("active");
      });
    });

    // Dismiss dialog when clicking on the dimmed outer backdrop
    if (overlay) {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          closeModal();
        }
      });
    }

    // Dismiss dialog when pressing the Escape keyboard key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay && overlay.classList.contains("active")) {
        closeModal();
      }
    });

    // EventBus subscriptions
    if (window.eventBus) {
      window.eventBus.on("settings:open", openModal);
      window.eventBus.on("settings:close", closeModal);
    }
  }

  // Safe DOM ready check: initialize immediately if DOM loaded, or on DOMContentLoaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSettingsModal);
  } else {
    initSettingsModal();
  }
})();
