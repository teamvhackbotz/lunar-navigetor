/**
 * ==============================================================================
 * Lunar Landing Site Navigator - Global Timeline & Playback Controller
 * File: components/timeline/timeline.js
 * Role: Drives mission time progression, maintains pause state, and resumes
 *       playback seamlessly from the exact paused epoch.
 * ==============================================================================
 */

(function () {
  const DEFAULT_CONFIG = {
    startEpoch: Date.UTC(2026, 10, 1, 0, 0, 0),
    endEpoch: Date.UTC(2026, 10, 30, 23, 59, 0),
    currentEpoch: Date.UTC(2026, 10, 15, 14, 0, 0),
    intervalHours: 1.5,
  };

  const state = {
    startEpoch: DEFAULT_CONFIG.startEpoch,
    endEpoch: DEFAULT_CONFIG.endEpoch,
    currentEpoch: DEFAULT_CONFIG.currentEpoch,
    intervalHours: DEFAULT_CONFIG.intervalHours,
    isPlaying: false,
    playInterval: null,
    speedMultiplier: 100,
  };

  let elements = {};

  function dateToInputVal(epochMs) {
    const d = new Date(epochMs);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  }

  function inputValToEpoch(valStr) {
    if (!valStr) return null;
    const parts = valStr.split("T");
    if (parts.length !== 2) return null;
    const [y, m, d] = parts[0].split("-").map(Number);
    const [h, min] = parts[1].split(":").map(Number);
    if (![y, m, d, h, min].every(Number.isFinite)) return null;

    const date = new Date(0);
    date.setUTCFullYear(y, m - 1, d);
    date.setUTCHours(h, min, 0, 0);
    return date.getTime();
  }

  function formatUTC(epochMs) {
    const d = new Date(epochMs);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
  }

  function formatShortUTC(epochMs) {
    const d = new Date(epochMs);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  }

  function renderEqualSpacedRuler() {
    const rulerSvg = elements.rulerSvg;
    if (!rulerSvg) return;

    const totalMs = state.endEpoch - state.startEpoch;
    if (totalMs <= 0) return;

    const intervalMs = state.intervalHours * 3600 * 1000;
    const intervalCount = Math.floor(totalMs / intervalMs + 1e-9);
    const stride = Math.max(1, Math.ceil(intervalCount / 500));

    const tickIndices = new Set([0, intervalCount]);
    for (let i = stride; i < intervalCount; i += stride) tickIndices.add(i);
    const ticks = Array.from(tickIndices, (index) => ({
      epoch: state.startEpoch + index * intervalMs,
      index,
    })).sort((a, b) => a.epoch - b.epoch);
    if (ticks[ticks.length - 1].epoch !== state.endEpoch) {
      ticks.push({ epoch: state.endEpoch, index: null });
    }

    const lines = [];
    ticks.forEach(({ epoch: tickEpoch, index: i }) => {
      const frac = (tickEpoch - state.startEpoch) / totalMs;
      const x = frac * 1000;
      const tickDate = new Date(tickEpoch);

      const isStartOrEnd =
        tickEpoch === state.startEpoch || tickEpoch === state.endEpoch;
      const isDayBoundary =
        tickDate.getUTCHours() === 0 && tickDate.getUTCMinutes() === 0;
      const isMidpoint = Math.abs(frac - 0.5) <= intervalMs / totalMs / 2;

      let y1 = 6;
      let stroke = "rgba(255, 255, 255, 0.28)";
      let strokeWidth = "1";

      if (isStartOrEnd) {
        y1 = 0;
        stroke = "rgba(237, 232, 225, 0.9)";
        strokeWidth = "2";
      } else if (isMidpoint) {
        y1 = 0;
        stroke = "rgba(201, 158, 82, 0.95)";
        strokeWidth = "2";
      } else if (isDayBoundary) {
        y1 = 2;
        stroke = "rgba(200, 125, 85, 0.8)";
        strokeWidth = "1.5";
      } else if (Math.floor(i / stride) % 2 === 0) {
        y1 = 4;
        stroke = "rgba(255, 255, 255, 0.4)";
        strokeWidth = "1.25";
      }

      lines.push(
        `<line x1="${x.toFixed(2)}" y1="${y1}" x2="${x.toFixed(2)}" y2="12" stroke="${stroke}" stroke-width="${strokeWidth}" />`,
      );
    });

    rulerSvg.innerHTML = lines.join("");
  }

  function syncTimelineUI(shouldBroadcast = true) {
    const totalMs = state.endEpoch - state.startEpoch;
    if (totalMs <= 0) return;

    if (state.currentEpoch < state.startEpoch)
      state.currentEpoch = state.startEpoch;
    if (state.currentEpoch > state.endEpoch)
      state.currentEpoch = state.endEpoch;

    const progress = ((state.currentEpoch - state.startEpoch) / totalMs) * 100;
    const clampedProgress = Math.max(0, Math.min(100, progress));

    if (elements.slider) {
      elements.slider.value = clampedProgress.toFixed(4);
    }

    if (elements.statusClock) {
      const clockValEl =
        elements.statusClock.querySelector(".clock-value") ||
        elements.statusClock;
      clockValEl.textContent = formatUTC(state.currentEpoch);
    }

    if (elements.endLabel) {
      elements.endLabel.textContent = formatShortUTC(state.endEpoch);
    }

    renderEqualSpacedRuler();

    if (elements.inputStart && document.activeElement !== elements.inputStart) {
      elements.inputStart.value = dateToInputVal(state.startEpoch);
    }
    if (elements.inputEnd && document.activeElement !== elements.inputEnd) {
      elements.inputEnd.value = dateToInputVal(state.endEpoch);
    }
    if (
      elements.inputCurrent &&
      document.activeElement !== elements.inputCurrent
    ) {
      elements.inputCurrent.value = dateToInputVal(state.currentEpoch);
    }
    if (
      elements.inputInterval &&
      document.activeElement !== elements.inputInterval
    ) {
      elements.inputInterval.value = state.intervalHours;
    }

    if (shouldBroadcast && window.eventBus) {
      const dateObj = new Date(state.currentEpoch);
      window.eventBus.emit("time:changed", {
        sliderValue: clampedProgress,
        isoString: dateObj.toISOString(),
        timestamp: dateObj,
        currentEpoch: state.currentEpoch,
        startEpoch: state.startEpoch,
        endEpoch: state.endEpoch,
        intervalHours: state.intervalHours,
      });
    }
  }

  function stepInterval(stepCount) {
    const intervalMs = state.intervalHours * 3600 * 1000;
    state.currentEpoch += stepCount * intervalMs;
    syncTimelineUI(true);
  }

  function initTimeline() {
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
      activeIntervalPill: document.getElementById(
        "timeline-active-interval-pill",
      ),

      btnPlay: document.getElementById("btn-play-pause"),
      btnStepBack: document.getElementById("btn-step-back"),
      btnStepForward: document.getElementById("btn-step-forward"),
      slider: document.getElementById("timeline-scrubber"),
      speedBtns: document.querySelectorAll(".btn-speed"),
      statusClock: document.getElementById("status-clock"),
      endLabel: document.getElementById("timeline-end-label"),
      rulerSvg: document.getElementById("ruler-svg"),
    };

    function updatePlayButtonUI() {
      if (!elements.btnPlay) return;
      elements.btnPlay.classList.toggle("playing", state.isPlaying);
      if (window.Icons && typeof window.Icons.svg === "function") {
        elements.btnPlay.innerHTML = state.isPlaying
          ? window.Icons.svg("pause", { size: "sm" })
          : window.Icons.svg("play", { size: "sm" });
      } else {
        elements.btnPlay.innerHTML = state.isPlaying
          ? '<svg class="icon icon-pause icon-sm" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
          : '<svg class="icon icon-play icon-sm" viewBox="0 0 24 24"><polygon points="6 4 20 12 6 20 6 4"/></svg>';
      }
    }

    function startPlaybackLoop() {
      stopPlaybackLoop();
      const tickRate = Math.max(30, Math.floor(10000 / state.speedMultiplier));

      state.playInterval = setInterval(() => {
        if (!state.isPlaying) {
          stopPlaybackLoop();
          return;
        }
        const totalMs = state.endEpoch - state.startEpoch;
        const stepMsPerTick = totalMs / 1000;
        state.currentEpoch += stepMsPerTick;
        if (state.currentEpoch >= state.endEpoch) {
          state.currentEpoch = state.startEpoch;
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

    // Play/Pause button toggles state and resumes from currentEpoch without resetting
    if (elements.btnPlay && elements.slider) {
      elements.btnPlay.addEventListener("click", () => {
        state.isPlaying = !state.isPlaying;
        updatePlayButtonUI();

        if (state.isPlaying) {
          startPlaybackLoop();
          window.eventBus?.emit("timeline:play", {
            currentEpoch: state.currentEpoch,
          });
        } else {
          stopPlaybackLoop();
          window.eventBus?.emit("timeline:pause", {
            currentEpoch: state.currentEpoch,
          });
        }
      });
    }

    if (elements.btnStepBack) {
      elements.btnStepBack.addEventListener("click", () => {
        if (state.isPlaying) {
          state.isPlaying = false;
          stopPlaybackLoop();
          updatePlayButtonUI();
          window.eventBus?.emit("timeline:pause", {
            currentEpoch: state.currentEpoch,
          });
        }
        stepInterval(-1);
      });
    }

    if (elements.btnStepForward) {
      elements.btnStepForward.addEventListener("click", () => {
        if (state.isPlaying) {
          state.isPlaying = false;
          stopPlaybackLoop();
          updatePlayButtonUI();
          window.eventBus?.emit("timeline:pause", {
            currentEpoch: state.currentEpoch,
          });
        }
        stepInterval(1);
      });
    }

    if (elements.slider) {
      elements.slider.addEventListener("input", (e) => {
        if (state.isPlaying) {
          state.isPlaying = false;
          stopPlaybackLoop();
          updatePlayButtonUI();
          window.eventBus?.emit("timeline:pause", {
            currentEpoch: state.currentEpoch,
          });
        }
        const progress = parseFloat(e.target.value);
        const totalMs = state.endEpoch - state.startEpoch;
        state.currentEpoch = state.startEpoch + (progress / 100) * totalMs;
        syncTimelineUI(true);
      });
    }

    elements.speedBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        elements.speedBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.speedMultiplier = parseInt(btn.dataset.speed, 10);
        if (state.isPlaying) {
          startPlaybackLoop();
        }
      });
    });

    function openEditPopover() {
      if (!elements.popover) return;
      elements.popover.style.display = "flex";
      elements.popover.setAttribute("aria-hidden", "false");
      if (elements.btnEdit) elements.btnEdit.classList.add("active");
      syncTimelineUI(false);
    }

    function closeEditPopover() {
      if (!elements.popover) return;
      elements.popover.style.display = "none";
      elements.popover.setAttribute("aria-hidden", "true");
      if (elements.btnEdit) elements.btnEdit.classList.remove("active");
    }

    if (elements.btnEdit) {
      elements.btnEdit.addEventListener("click", (e) => {
        e.stopPropagation();
        if (
          elements.popover.style.display === "none" ||
          !elements.popover.style.display
        ) {
          openEditPopover();
        } else {
          closeEditPopover();
        }
      });
    }

    if (elements.btnCloseEdit)
      elements.btnCloseEdit.addEventListener("click", closeEditPopover);
    if (elements.btnApplyEdit)
      elements.btnApplyEdit.addEventListener("click", closeEditPopover);
    if (elements.statusClock)
      elements.statusClock.addEventListener("click", openEditPopover);

    if (elements.inputStart) {
      elements.inputStart.addEventListener("input", () => {
        const epoch = inputValToEpoch(elements.inputStart.value);
        if (epoch !== null && epoch < state.endEpoch) {
          state.startEpoch = epoch;
          syncTimelineUI(true);
        }
      });
    }

    if (elements.inputEnd) {
      elements.inputEnd.addEventListener("input", () => {
        const epoch = inputValToEpoch(elements.inputEnd.value);
        if (epoch !== null && epoch > state.startEpoch) {
          state.endEpoch = epoch;
          syncTimelineUI(true);
        }
      });
    }

    if (elements.inputCurrent) {
      elements.inputCurrent.addEventListener("input", () => {
        const epoch = inputValToEpoch(elements.inputCurrent.value);
        if (
          epoch !== null &&
          epoch >= state.startEpoch &&
          epoch <= state.endEpoch
        ) {
          state.currentEpoch = epoch;
          syncTimelineUI(true);
        }
      });
    }

    if (elements.inputInterval) {
      elements.inputInterval.addEventListener("input", () => {
        const val = elements.inputInterval.valueAsNumber;
        if (Number.isFinite(val) && val >= 0.1 && val <= 168) {
          state.intervalHours = val;
          syncTimelineUI(true);
        }
      });
    }

    elements.intervalPresets.forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = parseFloat(btn.dataset.interval);
        if (!isNaN(val) && val > 0) {
          state.intervalHours = val;
          if (elements.inputInterval) elements.inputInterval.value = val;
          syncTimelineUI(true);
        }
      });
    });

    if (elements.btnReset) {
      elements.btnReset.addEventListener("click", () => {
        state.startEpoch = DEFAULT_CONFIG.startEpoch;
        state.endEpoch = DEFAULT_CONFIG.endEpoch;
        state.currentEpoch = DEFAULT_CONFIG.currentEpoch;
        state.intervalHours = DEFAULT_CONFIG.intervalHours;
        syncTimelineUI(true);
      });
    }

    window.currentCockpitTool = "grab";
    function setTool(toolName) {
      window.currentCockpitTool = toolName;
      document
        .getElementById("btn-tool-grab")
        ?.classList.toggle("active", toolName === "grab");
      document
        .getElementById("btn-tool-mark")
        ?.classList.toggle("active", toolName === "mark");
      window.eventBus?.emit("tool:changed", { tool: toolName });
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

    window.eventBus?.on("site:marked", (data) => {
      const coordDisplay = document.getElementById("active-coord-display");
      if (coordDisplay) {
        coordDisplay.innerHTML = `
          <svg class="icon icon-location icon-xs icon-terracotta" viewBox="0 0 24 24"><path d="M12 21C16 17 20 13.42 20 10C20 5.58 16.42 2 12 2C7.58 2 4 5.58 4 10C4 13.42 8 17 12 21Z"/><circle cx="12" cy="10" r="3"/></svg>
          <span><strong>${data.name}</strong> · ${Math.abs(data.lat).toFixed(2)}° ${data.lat < 0 ? "S" : "N"} · ${data.lon.toFixed(1)}° E</span>
        `;
      }
    });

    setTool("grab");
    syncTimelineUI(false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTimeline);
  } else {
    initTimeline();
  }
})();
