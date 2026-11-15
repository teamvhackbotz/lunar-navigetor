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
   * Detects if the page is running under local file:// protocol where modern browsers
   * block async template fetching due to CORS security rules.
   */
  function checkProtocol() {
    if (typeof window !== "undefined" && window.location && window.location.protocol === "file:") {
      console.warn(
        "[Loader] ⚠️ Local file:// protocol detected. Modern browsers block component template fetching under file:// CORS rules. Please launch via local server (`node scripts/serve.js` or `python -m http.server 8000`)."
      );
      if (document.body && !document.getElementById("file-protocol-warning")) {
        const banner = document.createElement("div");
        banner.id = "file-protocol-warning";
        banner.style.cssText = "position:fixed;top:10px;left:50%;transform:translateX(-50%);background:rgba(184,84,79,0.96);color:#fff;padding:8px 16px;border-radius:6px;font-family:-apple-system,sans-serif;font-size:12px;font-weight:500;z-index:10000;box-shadow:0 4px 16px rgba(0,0,0,0.5);display:flex;align-items:center;gap:10px;max-width:calc(100vw - 32px);";
        banner.innerHTML = "<span>⚠️ <strong>Local file:// protocol detected:</strong> Browser security blocks component templates. Run <code>node scripts/serve.js</code> or <code>python -m http.server</code> to view Lunar Navigator.</span><button type=\"button\" style=\"background:transparent;border:none;color:#fff;font-size:16px;cursor:pointer;line-height:1;margin-left:8px;\" onclick=\"this.parentElement.remove()\">✕</button>";
        document.body.appendChild(banner);
      }
    }
  }

  /**
   * Iterates through all registered components in order, sequentially loading their
   * markup, styles, and logic. Broadcasts 'app:ready' across EventBus upon completion.
   */
  async function loadAll() {
    checkProtocol();
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
