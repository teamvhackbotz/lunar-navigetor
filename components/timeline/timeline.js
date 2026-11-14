/**
 * ==============================================================================
 * Lunar Landing Site Navigator - Global Timeline & Playback Controller
 * File: components/timeline/timeline.js
 * Role: Drives global mission time progression, updates UTC telemetry clocks,
 *       handles simulation play/pause loops, and broadcasts time:changed events.
 * ==============================================================================
 */

(function() {
  // Internal playback state machine variables
  let isPlaying = false;          // Whether the automatic time animation loop is active
  let playInterval = null;        // Active interval handle returned by setInterval
  let speedMultiplier = 100;      // Current simulation speed factor (100x or 1000x real-time)

  /**
   * Initializes event listeners for all timeline controls:
   * Play/pause, step backward/forward, speed toggles, range scrubber, and EventBus hooks.
   */
  function initTimeline() {
    const btnPlay = document.getElementById("btn-play-pause");
    const btnStepBack = document.getElementById("btn-step-back");
    const btnStepForward = document.getElementById("btn-step-forward");
    const slider = document.getElementById("timeline-scrubber");
    const speedBtns = document.querySelectorAll(".btn-speed");

    // 1. Play / Pause Toggle Logic
    if (btnPlay && slider) {
      btnPlay.addEventListener("click", () => {
        isPlaying = !isPlaying;
        btnPlay.textContent = isPlaying ? "⏸" : "▶";
        btnPlay.classList.toggle("playing", isPlaying);

        if (isPlaying) {
          // Compute timer tick rate inversely proportional to selected speed factor
          const tickRate = Math.max(20, Math.floor(10000 / speedMultiplier));
          playInterval = setInterval(() => {
            let val = parseInt(slider.value, 10);
            val = (val + 1) % 100; // Loop seamlessly back to 0 at end of timeline
            slider.value = val;
            emitTimeUpdate(val);
          }, tickRate);
        } else {
          clearInterval(playInterval);
        }
      });
    }

    // 2. Discrete Single-Step Controls (Step Back 1 Hour / Step Forward 1 Hour)
    if (btnStepBack && slider) {
      btnStepBack.addEventListener("click", () => {
        let val = Math.max(0, parseInt(slider.value, 10) - 1);
        slider.value = val;
        emitTimeUpdate(val);
      });
    }

    if (btnStepForward && slider) {
      btnStepForward.addEventListener("click", () => {
        let val = Math.min(100, parseInt(slider.value, 10) + 1);
        slider.value = val;
        emitTimeUpdate(val);
      });
    }

    // 3. Continuous Scrubber Drag Listener
    if (slider) {
      slider.addEventListener("input", (e) => {
        emitTimeUpdate(parseInt(e.target.value, 10));
      });
    }

    // 4. Simulation Speed Multiplier Selectors (100x vs 1000x)
    speedBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        speedBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        speedMultiplier = parseInt(btn.dataset.speed, 10);

        // If currently playing, restart the interval with the updated tick rate
        if (isPlaying && playInterval) {
          clearInterval(playInterval);
          const tickRate = Math.max(20, Math.floor(10000 / speedMultiplier));
          playInterval = setInterval(() => {
            let val = parseInt(slider.value, 10);
            val = (val + 1) % 100;
            slider.value = val;
            emitTimeUpdate(val);
          }, tickRate);
        }
      });
    });

    // 5. Tool Selection: Grab vs. Mark
    window.currentCockpitTool = "grab";

    function setTool(toolName) {
      window.currentCockpitTool = toolName;
      const grabBtn = document.getElementById("btn-tool-grab");
      const markBtn = document.getElementById("btn-tool-mark");

      if (grabBtn) {
        if (toolName === "grab") grabBtn.classList.add("active");
        else grabBtn.classList.remove("active");
      }
      if (markBtn) {
        if (toolName === "mark") markBtn.classList.add("active");
        else markBtn.classList.remove("active");
      }
      if (window.eventBus) {
        window.eventBus.emit("tool:changed", { tool: toolName });
      }
    }

    // Delegated click handling ensures child spans/icons reliably switch tools
    document.addEventListener("click", (e) => {
      const g = e.target.closest("#btn-tool-grab");
      if (g) {
        e.preventDefault();
        setTool("grab");
        return;
      }
      const m = e.target.closest("#btn-tool-mark");
      if (m) {
        e.preventDefault();
        setTool("mark");
        return;
      }
    });

    if (window.eventBus) {
      window.eventBus.on("tool:set", (data) => {
        if (data && data.tool) setTool(data.tool);
      });
    }

    // Initialize default tool to Grab
    setTool("grab");

    // 6. Toggle AI Analyst Assistant Drawer from Mission Toolbar
    const btnToolAi = document.getElementById("btn-tool-ai");
    if (btnToolAi) {
      btnToolAi.addEventListener("click", () => {
        if (window.eventBus) {
          window.eventBus.emit("ai:toggle");
        }
      });
    }

    // 6. Listen for Universal `site:marked` Events to Update Active Coordinate Telemetry
    if (window.eventBus) {
      window.eventBus.on("site:marked", (data) => {
        const coordDisplay = document.getElementById("active-coord-display");
        if (coordDisplay) {
          coordDisplay.innerHTML = `📍 <strong>${data.name}</strong> · ${Math.abs(data.lat).toFixed(2)}° ${data.lat < 0 ? 'S' : 'N'} · ${data.lon.toFixed(1)}° E`;
        }
      });
    }
  }

  /**
   * Translates normalized slider range values (0-100) into UTC date objects spanning
   * November 2026 (Nov 1 to Nov 30). Updates the toolbar clock display and broadcasts
   * the `time:changed` event across the EventBus to update solar illumination on the 3D globe.
   *
   * @param {number} sliderVal - Value between 0 and 100 representing position on timeline
   */
  function emitTimeUpdate(sliderVal) {
    // Base calendar range: November 1, 2026 00:00 UTC to November 30, 2026 23:59 UTC
    const baseEpoch = Date.UTC(2026, 10, 1);
    const totalHours = 30 * 24; // 720 hours in mission calendar window
    const currentEpoch = baseEpoch + (sliderVal / 100) * totalHours * 3600 * 1000;
    const dateObj = new Date(currentEpoch);

    // Update UTC clock element in toolbar
    const clockEl = document.getElementById("status-clock");
    if (clockEl) {
      clockEl.textContent = `🕒 ${dateObj.toISOString().slice(0, 10)} ${dateObj.toISOString().slice(11, 16)} UTC`;
    }

    // Broadcast time change to 3D moon (rotates solar vector) and horizon profilers
    if (window.eventBus) {
      window.eventBus.emit("time:changed", {
        sliderValue: sliderVal,
        isoString: dateObj.toISOString(),
        timestamp: dateObj
      });
    }
  }

  // Safe DOM ready check: initialize immediately if DOM loaded, or on DOMContentLoaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTimeline);
  } else {
    initTimeline();
  }
})();
