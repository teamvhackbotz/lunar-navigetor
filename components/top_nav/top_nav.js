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
  }

  // Safe DOM ready check: initialize immediately if DOM loaded, or on DOMContentLoaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTopNav);
  } else {
    initTopNav();
  }
})();
