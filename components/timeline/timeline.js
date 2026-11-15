/**
 * ==============================================================================
 * Lunar Landing Site Navigator - Global Timeline & Playback Controller
 * File: components/timeline/timeline.js
 * Role: Drives mission time progression, handles dynamic timeline editing
 *       (start date, end date, time, interval), equal-spaced interval tick ruler,
 *       and broadcasts time:changed events across EventBus.
 * ==============================================================================
 */

(function() {
  // Default configuration: November 2026 Artemis III landing window with 1.5h default interval
  const DEFAULT_CONFIG = {
    startEpoch: Date.UTC(2026, 10, 1, 0, 0, 0),        // 2026-11-01 00:00:00 UTC
    endEpoch: Date.UTC(2026, 10, 30, 23, 59, 0),       // 2026-11-30 23:59 UTC
    currentEpoch: Date.UTC(2026, 10, 15, 14, 0, 0),    // 2026-11-15 14:00:00 UTC
    intervalHours: 1.5                                  // 1.5 hours default interval
  };

  // Mutable timeline state
  const state = {
    startEpoch: DEFAULT_CONFIG.startEpoch,
    endEpoch: DEFAULT_CONFIG.endEpoch,
    currentEpoch: DEFAULT_CONFIG.currentEpoch,
    intervalHours: DEFAULT_CONFIG.intervalHours,
    isPlaying: false,
    playInterval: null,
    speedMultiplier: 100
  };

  // Cached DOM elements
  let elements = {};

  /**
   * Helper: Formats Date to YYYY-MM-DDTHH:mm string for datetime-local inputs (in UTC)
   */
  function dateToInputVal(epochMs) {
    const d = new Date(epochMs);
    const pad = (n) => String(n).padStart(2, "0");
    const y = d.getUTCFullYear();
    const m = pad(d.getUTCMonth() + 1);
    const day = pad(d.getUTCDate());
    const h = pad(d.getUTCHours());
    const min = pad(d.getUTCMinutes());
    return `${y}-${m}-${day}T${h}:${min}`;
  }

  /**
   * Helper: Parses YYYY-MM-DDTHH:mm string into UTC Epoch timestamp
   */
  function inputValToEpoch(valStr) {
    if (!valStr) return null;
    const parts = valStr.split("T");
    if (parts.length !== 2) return null;
    const [y, m, d] = parts[0].split("-").map(Number);
    const [h, min] = parts[1].split(":").map(Number);
    if (![y, m, d, h, min].every(Number.isFinite) ||
        m < 1 || m > 12 || d < 1 || d > 31 || h < 0 || h > 23 || min < 0 || min > 59) {
      return null;
    }

    const date = new Date(0);
    date.setUTCFullYear(y, m - 1, d);
    date.setUTCHours(h, min, 0, 0);
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 ||
        date.getUTCDate() !== d || date.getUTCHours() !== h || date.getUTCMinutes() !== min) {
      return null;
    }
    return date.getTime();
  }

  /**
   * Helper: Formats Epoch to readable "YYYY-MM-DD HH:mm UTC"
   */
  function formatUTC(epochMs) {
    const d = new Date(epochMs);
    const pad = (n) => String(n).padStart(2, "0");
    const y = d.getUTCFullYear();
    const m = pad(d.getUTCMonth() + 1);
    const day = pad(d.getUTCDate());
    const h = pad(d.getUTCHours());
    const min = pad(d.getUTCMinutes());
    return `${y}-${m}-${day} ${h}:${min} UTC`;
  }

  /**
   * Helper: Formats Epoch to short "YYYY-MM-DD HH:mm"
   */
  function formatShortUTC(epochMs) {
    const d = new Date(epochMs);
    const pad = (n) => String(n).padStart(2, "0");
    const y = d.getUTCFullYear();
    const m = pad(d.getUTCMonth() + 1);
    const day = pad(d.getUTCDate());
    const h = pad(d.getUTCHours());
    const min = pad(d.getUTCMinutes());
    return `${y}-${m}-${day} ${h}:${min}`;
  }

  /**
   * Recomputes and renders SVG graduation ticks maintaining EQUAL SPACING between intervals.
   */
  function renderEqualSpacedRuler() {
    const rulerSvg = elements.rulerSvg;
    if (!rulerSvg) return;

    const totalMs = state.endEpoch - state.startEpoch;
    if (totalMs <= 0) return;

    const intervalMs = state.intervalHours * 3600 * 1000;
    const intervalCount = Math.floor(totalMs / intervalMs + 1e-9);
    // Allow denser ticks (up to ~800) so the precision scale matches the continuous ruler look
    const stride = Math.max(1, Math.ceil(intervalCount / 800));

    const tickIndices = new Set([0, intervalCount]);
    for (let i = stride; i < intervalCount; i += stride) tickIndices.add(i);
    const ticks = Array.from(tickIndices, index => ({
      epoch: state.startEpoch + index * intervalMs,
      index
    })).sort((a, b) => a.epoch - b.epoch);
    if (ticks[ticks.length - 1].epoch !== state.endEpoch) {
      ticks.push({ epoch: state.endEpoch, index: null });
    }

    // Tick positions use elapsed time directly; a partial final interval is not stretched.
    const lines = [];
    ticks.forEach(({ epoch: tickEpoch, index: i }) => {
      const frac = (tickEpoch - state.startEpoch) / totalMs;
      const x = frac * 1000;
      const tickDate = new Date(tickEpoch);

      const isStartOrEnd = tickEpoch === state.startEpoch || tickEpoch === state.endEpoch;
      const isDayBoundary = (tickDate.getUTCHours() === 0 && tickDate.getUTCMinutes() === 0);
      const isMidpoint = Math.abs(frac - 0.5) <= (intervalMs / totalMs / 2);

      // Most ticks short & uniform to match the dense precision scale in the design
      let y1 = 5;
      let stroke = "rgba(255, 255, 255, 0.32)";
      let strokeWidth = "0.7";

      if (isStartOrEnd) {
        y1 = 0;
        stroke = "rgba(237, 232, 225, 0.95)";
        strokeWidth = "1.5";
      } else if (isMidpoint) {
        y1 = 0;
        stroke = "rgba(201, 158, 82, 0.95)"; // Sand gold midpoint marker
        strokeWidth = "1.5";
      } else if (isDayBoundary) {
        y1 = 2;
        stroke = "rgba(200, 125, 85, 0.75)"; // Terracotta daily boundary
        strokeWidth = "1";
      } else if (Math.floor(i / stride) % 2 === 0) {
        y1 = 4;
        stroke = "rgba(255, 255, 255, 0.42)";
        strokeWidth = "0.85";
      }

      lines.push(`<line x1="${x.toFixed(2)}" y1="${y1}" x2="${x.toFixed(2)}" y2="12" stroke="${stroke}" stroke-width="${strokeWidth}" />`);
    });

    rulerSvg.innerHTML = lines.join("");
  }

  /**
   * Updates all timeline labels, dates, timestamps, tick marks, and range slider.
   */
  function syncTimelineUI(shouldBroadcast = true) {
    const totalMs = state.endEpoch - state.startEpoch;
    if (totalMs <= 0) return;

    // 1. Clamp current epoch inside [startEpoch, endEpoch]
    if (state.currentEpoch < state.startEpoch) state.currentEpoch = state.startEpoch;
    if (state.currentEpoch > state.endEpoch) state.currentEpoch = state.endEpoch;

    // 2. Compute normalized progress percentage (0 - 100)
    const progress = ((state.currentEpoch - state.startEpoch) / totalMs) * 100;
    const clampedProgress = Math.max(0, Math.min(100, progress));

    // 3. Update range slider value and attributes
    if (elements.slider) {
      elements.slider.value = clampedProgress.toFixed(4);
    }

    // 4. Update status UTC clock in Tier 1 toolbar
    if (elements.statusClock) {
      const clockValEl = elements.statusClock.querySelector(".clock-value") || elements.statusClock;
      const formatted = formatUTC(state.currentEpoch);
      clockValEl.textContent = formatted;
    }

    // 5. Update Tier 2 date boundary edge labels
    if (elements.startLabel) {
      elements.startLabel.textContent = formatShortUTC(state.startEpoch);
      elements.startLabel.title = `Start: ${formatUTC(state.startEpoch)}`;
    }
    if (elements.endLabel) {
      elements.endLabel.textContent = formatShortUTC(state.endEpoch);
      elements.endLabel.title = `End: ${formatUTC(state.endEpoch)}`;
    }

    // 6. Update interval badges
    const intervalStr = `${state.intervalHours}h`;
    if (elements.intervalLabel) {
      elements.intervalLabel.textContent = `⏱ ${intervalStr} interval`;
    }
    if (elements.activeIntervalPill) {
      elements.activeIntervalPill.textContent = `${intervalStr} intervals`;
    }

    // 7. Update midpoint / mission window label
    if (elements.midLabel) {
      const midEpoch = state.startEpoch + totalMs * 0.5;
      const totalDays = (totalMs / (86400 * 1000)).toFixed(1);
      elements.midLabel.textContent = `🚀 Window (${totalDays}d) · Mid: ${formatShortUTC(midEpoch)}`;
    }

    // 8. Regenerate equal-spaced ruler ticks
    renderEqualSpacedRuler();

    // 9. Sync input fields in the edit popover
    if (elements.inputStart && document.activeElement !== elements.inputStart) {
      elements.inputStart.value = dateToInputVal(state.startEpoch);
    }
    if (elements.inputEnd && document.activeElement !== elements.inputEnd) {
      elements.inputEnd.value = dateToInputVal(state.endEpoch);
    }
    if (elements.inputCurrent && document.activeElement !== elements.inputCurrent) {
      elements.inputCurrent.value = dateToInputVal(state.currentEpoch);
    }
    if (elements.inputInterval && document.activeElement !== elements.inputInterval) {
      elements.inputInterval.value = state.intervalHours;
    }

    // Sync active state on interval preset buttons
    if (elements.intervalPresets) {
      elements.intervalPresets.forEach(btn => {
        const btnVal = parseFloat(btn.dataset.interval);
        btn.classList.toggle("active", Math.abs(btnVal - state.intervalHours) < 0.01);
      });
    }

    // 10. Broadcast time:changed event across EventBus
    if (shouldBroadcast && window.eventBus) {
      const dateObj = new Date(state.currentEpoch);
      window.eventBus.emit("time:changed", {
        sliderValue: clampedProgress,
        isoString: dateObj.toISOString(),
        timestamp: dateObj,
        currentEpoch: state.currentEpoch,
        startEpoch: state.startEpoch,
        endEpoch: state.endEpoch,
        intervalHours: state.intervalHours
      });
    }
  }

  /**
   * Advances or steps current time by N intervals
   */
  function stepInterval(stepCount) {
    const intervalMs = state.intervalHours * 3600 * 1000;
    state.currentEpoch += stepCount * intervalMs;
    syncTimelineUI(true);
  }

  /**
   * Initializes timeline DOM event bindings and controller logic
   */
  function initTimeline() {
    // Cache DOM references
    elements = {
      popover: document.getElementById("timeline-edit-popover"),
      btnEdit: document.getElementById("btn-edit-timeline"),
      btnCloseEdit: document.getElementById("btn-close-timeline-edit"),
      btnApplyEdit: document.getElementById("btn-apply-timeline-edit"),
      btnReset: document.getElementById("btn-reset-timeline"),
      inputStart: document.getElementById("timeline-edit-start"),
      inputEnd: document.getElementById("timeline-edit-end"),
      inputCurrent: document.getElementById("timeline-edit-current"),
      inputInterval: document.getElementById("timeline-edit-interval"),
      intervalPresets: document.querySelectorAll(".btn-interval-preset"),
      activeIntervalPill: document.getElementById("timeline-active-interval-pill"),

      btnPlay: document.getElementById("btn-play-pause"),
      btnStepBack: document.getElementById("btn-step-back"),
      btnStepForward: document.getElementById("btn-step-forward"),
      slider: document.getElementById("timeline-scrubber"),
      speedBtns: document.querySelectorAll(".btn-speed"),
      statusClock: document.getElementById("status-clock"),
      startLabel: document.getElementById("timeline-start-label"),
      endLabel: document.getElementById("timeline-end-label"),
      midLabel: document.getElementById("timeline-mid-label"),
      intervalLabel: document.getElementById("timeline-interval-label"),
      rulerSvg: document.getElementById("ruler-svg")
    };

    // 1. Play / Pause Continuous Simulation Loop
    if (elements.btnPlay && elements.slider) {
      elements.btnPlay.addEventListener("click", () => {
        state.isPlaying = !state.isPlaying;

        // Update play/pause icon
        // Update play/pause icon
elements.btnPlay.innerHTML = state.isPlaying
  ? `<svg class="icon icon-pause icon-sm" viewBox="0 0 24 24">
       <rect x="6" y="4" width="4" height="16"></rect>
       <rect x="14" y="4" width="4" height="16"></rect>
     </svg>`
  : `<svg class="icon icon-play icon-sm" viewBox="0 0 24 24">
       <polygon points="6 4 20 12 6 20 6 4"></polygon>
     </svg>`;
        elements.btnPlay.classList.toggle("playing", state.isPlaying);

        if (state.isPlaying) {
          startPlaybackLoop();
        } else {
          stopPlaybackLoop();
        }
      });
    }

    function startPlaybackLoop() {
      stopPlaybackLoop();
      const tickRate = Math.max(20, Math.floor(10000 / state.speedMultiplier));

      state.playInterval = setInterval(() => {
        const totalMs = state.endEpoch - state.startEpoch;
        const stepMsPerTick = totalMs / 1000;
        state.currentEpoch += stepMsPerTick;
        if (state.currentEpoch >= state.endEpoch) {
          state.currentEpoch = state.startEpoch; // Loop seamlessly
        }
        syncTimelineUI(true);
      }, tickRate);
    }

    function stopPlaybackLoop() {
      if (state.playInterval) {
        clearInterval(state.playInterval);
        state.playInterval = null;
      }
    }

    // 2. Step Backward / Forward by Exactly 1 Interval (Default: 1.5 Hours)
    if (elements.btnStepBack) {
      elements.btnStepBack.addEventListener("click", () => stepInterval(-1));
    }
    if (elements.btnStepForward) {
      elements.btnStepForward.addEventListener("click", () => stepInterval(1));
    }

    // 3. Smooth Slider Drag Listener
    if (elements.slider) {
      elements.slider.addEventListener("input", (e) => {
        const progress = parseFloat(e.target.value);
        const totalMs = state.endEpoch - state.startEpoch;
        state.currentEpoch = state.startEpoch + (progress / 100) * totalMs;
        syncTimelineUI(true);
      });
    }

    // 4. Simulation Speed Multiplier Selectors (100x vs 1000x)
    elements.speedBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        elements.speedBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        state.speedMultiplier = parseInt(btn.dataset.speed, 10);
        if (state.isPlaying) {
          startPlaybackLoop();
        }
      });
    });

    // 5. Timeline Editing Popover Controls
    function openEditPopover() {
      if (!elements.popover) return;
      elements.popover.style.display = "flex";
      elements.popover.setAttribute("aria-hidden", "false");
      if (elements.btnEdit) elements.btnEdit.classList.add("active");
      // Populate latest values
      syncTimelineUI(false);
    }

    function closeEditPopover() {
      if (!elements.popover) return;
      elements.popover.style.display = "none";
      elements.popover.setAttribute("aria-hidden", "true");
      if (elements.btnEdit) elements.btnEdit.classList.remove("active");
    }

    function toggleEditPopover() {
      if (!elements.popover) return;
      if (elements.popover.style.display === "none" || !elements.popover.style.display) {
        openEditPopover();
      } else {
        closeEditPopover();
      }
    }

    if (elements.btnEdit) {
      elements.btnEdit.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleEditPopover();
      });
    }

    if (elements.btnCloseEdit) {
      elements.btnCloseEdit.addEventListener("click", closeEditPopover);
    }

    if (elements.btnApplyEdit) {
      elements.btnApplyEdit.addEventListener("click", closeEditPopover);
    }

    // Clicking status clock or date edges opens the editor conveniently
    if (elements.statusClock) {
      elements.statusClock.addEventListener("click", openEditPopover);
    }
    if (elements.startLabel) {
      elements.startLabel.addEventListener("click", openEditPopover);
    }
    if (elements.endLabel) {
      elements.endLabel.addEventListener("click", openEditPopover);
    }

    // Close on Escape or outside click
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && elements.popover && elements.popover.style.display !== "none") {
        closeEditPopover();
      }
    });

    document.addEventListener("click", (e) => {
      if (elements.popover && elements.popover.style.display !== "none") {
        if (!elements.popover.contains(e.target) &&
            !e.target.closest("#btn-edit-timeline") &&
            !e.target.closest("#status-clock") &&
            !e.target.closest("#timeline-start-label") &&
            !e.target.closest("#timeline-end-label")) {
          closeEditPopover();
        }
      }
    });

    // 6. Reactive Edit Inputs: Start Date, End Date, Current Time, Interval
    function clearInputError(input) {
      input.setCustomValidity("");
      input.removeAttribute("aria-invalid");
    }

    if (elements.inputStart) {
      const handleStartChange = () => {
        const epoch = inputValToEpoch(elements.inputStart.value);
        if (epoch !== null && epoch < state.endEpoch) {
          clearInputError(elements.inputStart);
          state.startEpoch = epoch;
          syncTimelineUI(true);
        } else {
          elements.inputStart.setCustomValidity("Start must be a valid UTC date and time before the end.");
          elements.inputStart.setAttribute("aria-invalid", "true");
        }
      };
      elements.inputStart.addEventListener("input", handleStartChange);
      elements.inputStart.addEventListener("change", handleStartChange);
    }

    if (elements.inputEnd) {
      const handleEndChange = () => {
        const epoch = inputValToEpoch(elements.inputEnd.value);
        if (epoch !== null && epoch > state.startEpoch) {
          clearInputError(elements.inputEnd);
          state.endEpoch = epoch;
          syncTimelineUI(true);
        } else {
          elements.inputEnd.setCustomValidity("End must be a valid UTC date and time after the start.");
          elements.inputEnd.setAttribute("aria-invalid", "true");
        }
      };
      elements.inputEnd.addEventListener("input", handleEndChange);
      elements.inputEnd.addEventListener("change", handleEndChange);
    }

    if (elements.inputCurrent) {
      const handleCurrentChange = () => {
        const epoch = inputValToEpoch(elements.inputCurrent.value);
        if (epoch !== null && epoch >= state.startEpoch && epoch <= state.endEpoch) {
          clearInputError(elements.inputCurrent);
          state.currentEpoch = epoch;
          syncTimelineUI(true);
        } else {
          elements.inputCurrent.setCustomValidity("Current time must be within the timeline's start and end.");
          elements.inputCurrent.setAttribute("aria-invalid", "true");
        }
      };
      elements.inputCurrent.addEventListener("input", handleCurrentChange);
      elements.inputCurrent.addEventListener("change", handleCurrentChange);
    }

    if (elements.inputInterval) {
      const handleIntervalChange = () => {
        const val = elements.inputInterval.valueAsNumber;
        if (Number.isFinite(val) && val >= 0.1 && val <= 168) {
          clearInputError(elements.inputInterval);
          state.intervalHours = val;
          syncTimelineUI(true);
        } else {
          elements.inputInterval.setCustomValidity("Interval must be between 0.1 and 168 hours.");
          elements.inputInterval.setAttribute("aria-invalid", "true");
        }
      };
      elements.inputInterval.addEventListener("input", handleIntervalChange);
      elements.inputInterval.addEventListener("change", handleIntervalChange);
    }

    // Interval preset buttons (1.5h default, 1h, 3h, 6h, 12h, 24h)
    elements.intervalPresets.forEach(btn => {
      btn.addEventListener("click", () => {
        const val = parseFloat(btn.dataset.interval);
        if (!isNaN(val) && val > 0) {
          state.intervalHours = val;
          if (elements.inputInterval) {
            clearInputError(elements.inputInterval);
            elements.inputInterval.value = val;
          }
          syncTimelineUI(true);
        }
      });
    });

    // Reset button
    if (elements.btnReset) {
      elements.btnReset.addEventListener("click", () => {
        [elements.inputStart, elements.inputEnd, elements.inputCurrent, elements.inputInterval].forEach(input => {
          if (input && document.activeElement === input) input.blur();
          if (input) clearInputError(input);
        });
        state.startEpoch = DEFAULT_CONFIG.startEpoch;
        state.endEpoch = DEFAULT_CONFIG.endEpoch;
        state.currentEpoch = DEFAULT_CONFIG.currentEpoch;
        state.intervalHours = DEFAULT_CONFIG.intervalHours;
        syncTimelineUI(true);
      });
    }

    // 7. Tool Selection (Grab vs Mark)
    window.currentCockpitTool = "grab";

    function setTool(toolName) {
      window.currentCockpitTool = toolName;
      const grabBtn = document.getElementById("btn-tool-grab");
      const markBtn = document.getElementById("btn-tool-mark");
      if (grabBtn) grabBtn.classList.toggle("active", toolName === "grab");
      if (markBtn) markBtn.classList.toggle("active", toolName === "mark");
      if (window.eventBus) {
        window.eventBus.emit("tool:changed", { tool: toolName });
      }
    }

    document.addEventListener("click", (e) => {
      if (e.target.closest("#btn-tool-grab")) {
        e.preventDefault();
        setTool("grab");
      } else if (e.target.closest("#btn-tool-mark")) {
        e.preventDefault();
        setTool("mark");
      }
    });

    if (window.eventBus) {
      window.eventBus.on("tool:set", (data) => {
        if (data && data.tool) setTool(data.tool);
      });

      // Dr. Raj AI Assistant toggle
      const btnToolAi = document.getElementById("btn-tool-ai");
      if (btnToolAi) {
        btnToolAi.addEventListener("click", () => {
          window.eventBus.emit("ai:toggle");
        });
      }

      // Selenographic site marked telemetry update
      window.eventBus.on("site:marked", (data) => {
        const coordDisplay = document.getElementById("active-coord-display");
        if (coordDisplay) {
          coordDisplay.innerHTML = `
            <svg class="icon icon-location icon-xs icon-terracotta" viewBox="0 0 24 24"><path d="M12 21C16 17 20 13.42 20 10C20 5.58 16.42 2 12 2C7.58 2 4 5.58 4 10C4 13.42 8 17 12 21Z"/><circle cx="12" cy="10" r="3"/></svg>
            <span><strong>${data.name}</strong> · ${Math.abs(data.lat).toFixed(2)}° ${data.lat < 0 ? 'S' : 'N'} · ${data.lon.toFixed(1)}° E</span>
          `;
        }
      });
    }

    // Initial render
    setTool("grab");
    syncTimelineUI(false);
  }

  // Safe DOM ready check: initialize immediately if DOM loaded, or on DOMContentLoaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTimeline);
  } else {
    initTimeline();
  }
})();