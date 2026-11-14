/**
 * ==============================================================================
 * Lunar Landing Site Navigator - Global Theme Manager
 * File: themes/theme_manager.js
 * Role: Manages theme registry, dynamic CSS stylesheet swapping, localStorage
 *       persistence, and EventBus broadcasting for cockpit color schemes.
 * ==============================================================================
 */

const ThemeManager = (function() {
  const STORAGE_KEY = "spaceapp_active_theme";
  const SETTINGS_STORAGE_KEY = "spaceapp_mission_settings";

  /**
   * Registry of available cockpit operational themes.
   * New themes can be added here and in a corresponding theme_*.css file.
   */
  const THEMES = [
    {
      id: "earth",
      name: "Muted Earth",
      subtitle: "Basalt, Sandstone, Terracotta",
      file: "themes/theme_earth.css",
      swatch: "linear-gradient(135deg, #141618 0%, #212325 50%, #c87d55 100%)",
      accent: "#c87d55"
    },
    {
      id: "regolith",
      name: "Lunar Regolith",
      subtitle: "Monochrome Titanium & Basalt",
      file: "themes/theme_regolith.css",
      swatch: "linear-gradient(135deg, #0f1012 0%, #1c1e22 50%, #8ea8c3 100%)",
      accent: "#8ea8c3"
    },
    {
      id: "space",
      name: "High-Contrast Space",
      subtitle: "OLED Black & Mission Amber",
      file: "themes/theme_space.css",
      swatch: "linear-gradient(135deg, #000000 0%, #0d0d0d 50%, #ffb300 100%)",
      accent: "#ffb300"
    }
  ];

  let currentThemeId = "earth";

  /**
   * Resolves the stored theme from localStorage or returns the default ('earth').
   */
  function getStoredThemeId() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && THEMES.some(t => t.id === stored)) {
        return stored;
      }
      // Fallback check in mission settings
      const settingsRaw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (settingsRaw) {
        const parsed = JSON.parse(settingsRaw);
        if (parsed.theme && THEMES.some(t => t.id === parsed.theme)) {
          return parsed.theme;
        }
      }
    } catch (e) {
      console.warn("[ThemeManager] Could not read localStorage:", e);
    }
    return "earth";
  }

  /**
   * Applies the theme by dynamically updating the <link id="theme-stylesheet"> href,
   * switching <body> CSS classes, saving to localStorage, and broadcasting an event.
   *
   * @param {string} themeId - Identifier of theme to activate ('earth'|'regolith'|'space')
   */
  function setTheme(themeId) {
    const theme = THEMES.find(t => t.id === themeId);
    if (!theme) {
      console.warn(`[ThemeManager] Unknown theme: '${themeId}', falling back to 'earth'`);
      return setTheme("earth");
    }

    currentThemeId = themeId;

    // 1. Update or inject dynamic theme <link> stylesheet
    let link = document.getElementById("theme-stylesheet");
    if (!link) {
      link = document.createElement("link");
      link.id = "theme-stylesheet";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    if (link.getAttribute("href") !== theme.file) {
      link.href = theme.file;
    }

    // 2. Synchronize <body> CSS class for backward-compatibility
    if (document.body) {
      THEMES.forEach(t => {
        document.body.classList.remove(`theme-${t.id}`);
      });
      document.body.classList.remove("theme-contrast");
      document.body.classList.add(`theme-${themeId}`);
      if (themeId === "space") {
        document.body.classList.add("theme-contrast");
      }
    }

    // 3. Persist to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, themeId);

      // Keep settings_modal in-sync
      const settingsRaw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      let settings = settingsRaw ? JSON.parse(settingsRaw) : {};
      settings.theme = themeId;
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn("[ThemeManager] Could not save to localStorage:", e);
    }

    // 4. Broadcast event across EventBus
    if (window.eventBus) {
      window.eventBus.emit("theme:changed", {
        theme: themeId,
        themeData: theme
      });
    }

    console.log(`[ThemeManager] Switched active theme to: ${theme.name} (${theme.file})`);
  }

  /**
   * Initializes active theme immediately upon script load.
   */
  function init() {
    const initialTheme = getStoredThemeId();
    setTheme(initialTheme);
  }

  // Pre-boot theme immediately
  init();

  return {
    getThemes: () => [...THEMES],
    getCurrentTheme: () => currentThemeId,
    setTheme: setTheme,
    init: init
  };
})();

// Attach to window for global access
window.ThemeManager = ThemeManager;
