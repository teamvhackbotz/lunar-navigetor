/**
 * ==============================================================================
 * Lunar Landing Site Navigator - Micro-Frontend Component Loader
 * File: core/loader.js
 * Role: Dynamically fetches and mounts isolated component HTML templates,
 *       appends component stylesheets into <head>, and executes component scripts.
 *       Enables independent development and modular architecture across teammates.
 * ==============================================================================
 */

const ComponentLoader = (function() {
  /**
   * Registry of application components and their designated DOM mount points.
   * Order reflects the desired initialization sequence.
   */
  const COMPONENTS = [
    { name: "top_nav", mountId: "mount-top-nav" },
    { name: "comparison_cards", mountId: "mount-comparison-cards" },
    { name: "moon_3d", mountId: "mount-moon-3d" },
    { name: "horizon_topography", mountId: "mount-horizon-topography" },
    { name: "map_2d", mountId: "mount-map-2d" },
    { name: "timeline", mountId: "mount-timeline" },
    { name: "settings_modal", mountId: "mount-settings-modal" },
    { name: "ai_dr_raj", mountId: "mount-ai-dr-raj" },
    { name: "inspection_modal", mountId: "mount-inspection-modal" },
    { name: "search_palette", mountId: "mount-search-palette" }
  ];

  /**
   * Asynchronously loads a single micro-frontend component into the master DOM:
   * 1. Fetches HTML template from components/{name}/{name}.html and injects into mount point.
   * 2. Injects component stylesheet (<link rel="stylesheet">) into <head> if not already present.
   * 3. Injects component JavaScript (<script>) into <body> if not already present.
   *
   * @param {string} name - Component folder and file basename
   * @param {string} mountId - Target DOM element ID in index.html
   */
  async function loadComponent(name, mountId) {
    try {
      const mountEl = document.getElementById(mountId);
      if (!mountEl) {
        console.warn(`[Loader] Mount target #${mountId} not found in DOM.`);
        return;
      }

      // 1. Fetch & Inject Component HTML Template (cache: "no-cache" ensures fresh templates)
      const htmlResp = await fetch(`components/${name}/${name}.html`, { cache: "no-cache" });
      if (htmlResp.ok) {
        mountEl.innerHTML = await htmlResp.text();
      } else {
        console.error(`[Loader] Failed to fetch components/${name}/${name}.html (${htmlResp.status})`);
      }

      // 2. Dynamically Inject Component CSS Stylesheet (idempotent check)
      const cssId = `css-component-${name}`;
      if (!document.getElementById(cssId)) {
        const link = document.createElement("link");
        link.id = cssId;
        link.rel = "stylesheet";
        link.href = `components/${name}/${name}.css?t=${Date.now()}`;
        document.head.appendChild(link);
      }

      // 3. Dynamically Inject Component JS Script (idempotent check)
      const scriptId = `js-component-${name}`;
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = `components/${name}/${name}.js?t=${Date.now()}`;
        document.body.appendChild(script);
      }

      console.log(`[Loader] ✓ Loaded component: ${name}`);
    } catch (err) {
      console.error(`[Loader] Error loading component ${name}:`, err);
    }
  }

  /**
   * Iterates through all registered components in order, sequentially loading their
   * markup, styles, and logic. Broadcasts 'app:ready' across EventBus upon completion.
   */
  async function loadAll() {
    console.log("[Loader] Initializing component assembly...");
    for (const comp of COMPONENTS) {
      await loadComponent(comp.name, comp.mountId);
    }
    console.log("[Loader] All components assembled successfully.");
    if (window.eventBus) {
      window.eventBus.emit("app:ready", { timestamp: new Date() });
    }
  }

  return {
    loadAll,
    loadComponent
  };
})();

// Auto-run assembly when master DOM is parsed
document.addEventListener("DOMContentLoaded", () => {
  ComponentLoader.loadAll();
});
