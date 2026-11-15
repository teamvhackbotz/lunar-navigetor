/**
 * ==============================================================================
 * Lunar Landing Site Navigator - Celestial Triad Mini-Map
 * File: components/minimap_triad/minimap_triad.js
 * Role: Reference frame switching state machine (Moon / Earth / Sun) and
 *       dynamic sinusoidal Earth libration wobble driven by timeline progress.
 * ==============================================================================
 */

(function() {
  /**
   * Orbital configuration presets for cycling the reference center of the triad.
   */
  const MODES = [
    {
      id: "moon",
      label: "Center: Moon ▾",
      subtext: "Visualizing Earth's Libration Wobble",
      centerIcon: "🌕",
      orb1: "🌍",
      orb2: "☀️"
    },
    {
      id: "earth",
      label: "Center: Earth ▾",
      subtext: "Geocentric Lunar Orbit & Phases",
      centerIcon: "🌍",
      orb1: "🌕",
      orb2: "☀️"
    },
    {
      id: "sun",
      label: "Center: Sun ▾",
      subtext: "Heliocentric Earth-Moon Barycenter",
      centerIcon: "☀️",
      orb1: "🌍",
      orb2: "🌕"
    }
  ];

  let modeIndex = 0; // Current reference frame mode index (default: 0 = Moon center)

  /**
   * Initializes click cycling listener and timeline EventBus subscription.
   */
  function initMinimap() {
    const box = document.getElementById("minimap-triad-box");
    const modeLabel = document.getElementById("minimap-mode-label");
    const subtext = document.getElementById("triad-subtext");
    const centerNode = document.getElementById("triad-center-node");
    const earthNode = document.getElementById("triad-earth-node");
    const sunNode = document.getElementById("triad-sun-node");

    // Click on widget to cycle reference frame
    if (box) {
      box.addEventListener("click", () => {
        modeIndex = (modeIndex + 1) % MODES.length;
        const current = MODES[modeIndex];

        // Update labels and emoji icons
        if (modeLabel) modeLabel.textContent = current.label;
        if (subtext) subtext.textContent = current.subtext;
        if (centerNode) centerNode.textContent = current.centerIcon;
        if (earthNode) earthNode.textContent = current.orb1;
        if (sunNode) sunNode.textContent = current.orb2;

        // Broadcast reference frame change across EventBus
        if (window.eventBus) {
          window.eventBus.emit("frame:changed", { mode: current.id });
        }
      });
    }

    // Subscribe to mission time progression to animate realistic libration wobble
    if (window.eventBus) {
      window.eventBus.on("time:changed", (data) => {
        // Compute current orbital phase angle across the 30-day timeline
        const phase = (data.sliderValue / 100) * Math.PI * 2;
        
        // When in Moon-centric mode (mode 0), wobble Earth in its apparent lunar sky box
        if (earthNode && modeIndex === 0) {
          const wobbleX = 24 + Math.sin(phase) * 6;      // Longitude libration wobble (±7.9° amplitude)
          const wobbleY = 16 + Math.cos(phase * 2) * 4;  // Latitude libration wobble (±6.7° amplitude)
          earthNode.style.left = `${wobbleX}px`;
          earthNode.style.top = `${wobbleY}px`;
        }
      });
    }
  }

  // Safe DOM ready check: initialize immediately if DOM loaded, or on DOMContentLoaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMinimap);
  } else {
    initMinimap();
  }
})();


