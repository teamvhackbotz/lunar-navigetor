/**
 * ==============================================================================
 * Lunar Landing Site Navigator - Universal Cockpit Keyboard Shortcuts Engine
 * File: core/keyboard_shortcuts.js
 * Role: Global hotkey listeners driving:
 *       1. Raw Arrow Keys (↑, ↓, ←, →): Precision fine-tuning & nudging of active pin.
 *       2. Alt + Arrow Keys: Cockpit window & drawer docking toggles.
 *       3. Ctrl + Arrow Keys: Mission timeline interval stepping.
 *       4. Spacebar: Continuous simulation play/pause.
 *       5. Slash (/): Quick landing site search command palette.
 *       6. Shift + ?: Dr. Raj AI flight analyst assistant.
 *       7. Escape: Universal modal, palette, and drawer dismissal.
 * ==============================================================================
 */

const CockpitShortcuts = (function() {
  const STORAGE_KEY = "spaceapp_cockpit_shortcuts_v2";

  const DEFAULT_BINDINGS = {
    nudgeNorth: { key: "ArrowUp", label: "Nudge Pin North (+0.05°)", description: "Fine-tune latitude toward North Pole" },
    nudgeSouth: { key: "ArrowDown", label: "Nudge Pin South (-0.05°)", description: "Fine-tune latitude toward South Pole" },
    nudgeWest: { key: "ArrowLeft", label: "Nudge Pin West (-0.10°)", description: "Fine-tune longitude Westward" },
    nudgeEast: { key: "ArrowRight", label: "Nudge Pin East (+0.10°)", description: "Fine-tune longitude Eastward" },
    toggleCards: { key: "Alt+ArrowUp", label: "Toggle Comparison Cards", description: "Open/close candidate comparison deck" },
    toggle2DMap: { key: "Alt+ArrowDown", label: "Toggle 2D Map Deck", description: "Open/close 2D cartographic drawer" },
    toggleLeftDrawer: { key: "Alt+ArrowLeft", label: "Toggle Left Drawer (Site A)", description: "Open/close left horizon profile" },
    toggleRightDrawer: { key: "Alt+ArrowRight", label: "Toggle Right Drawer (Site B)", description: "Open/close right horizon profile" },
    playPause: { key: "Space", label: "Play / Pause Time Simulation", description: "Toggle timeline continuous playback" },
    stepBack: { key: "Ctrl+ArrowLeft", label: "Step Time Backward", description: "Step back one configured interval in simulation time" },
    stepForward: { key: "Ctrl+ArrowRight", label: "Step Time Forward", description: "Step forward one configured interval in simulation time" },
    openSearch: { key: "/", label: "Quick Site Search", description: "Open command palette site search" },
    undoCard: { key: "Ctrl+Z", label: "Undo Card Action", description: "Restore closed or removed candidate comparison card" },
    redoCard: { key: "Ctrl+Y", label: "Redo Card Action", description: "Reapply undone comparison card action" },
    toggleAI: { key: "Shift+?", label: "Toggle Dr. Raj AI Assistant", description: "Open/close AI mission analyst window" },
    toolGrab: { key: "G", label: "Grab / Rotate Globe", description: "Default navigation tool to orbit the 3D Moon" },
    toolMark: { key: "M", label: "Mark Landing Site", description: "Pin-dropping tool to mark landing sites" },
    closeAll: { key: "Escape", label: "Close Active Modals / Drawers", description: "Dismiss search, modals, or decks" }
  };

  let config = {
    enabled: true,
    bindings: { ...DEFAULT_BINDINGS }
  };

  // Track currently active pin coordinates for continuous keyboard nudging
  let activePin = {
    lat: -89.4,
    lon: 222.6,
    name: "Connecting Ridge"
  };

  function loadConfig() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        config.enabled = parsed.enabled !== false;
        if (parsed.bindings) {
          config.bindings = { ...DEFAULT_BINDINGS, ...parsed.bindings };
        }
      }
    } catch (e) {
      console.warn("[Shortcuts] Failed to load custom shortcuts config", e);
    }
  }

  function saveConfig() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.warn("[Shortcuts] Failed to persist shortcuts config", e);
    }
  }

  function toggleCheckbox(id) {
    const el = document.getElementById(id);
    if (el) {
      el.checked = !el.checked;
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function triggerClick(id) {
    const el = document.getElementById(id);
    if (el) {
      el.click();
    }
  }

  function isTypingContext(target) {
    if (!target) return false;
    const tag = target.tagName ? target.tagName.toLowerCase() : "";
    return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
  }

  /**
   * Nudges the active landing site pin by delta degrees, checks for nearest landmark,
   * and broadcasts site:marked across the universal EventBus.
   */
  function nudgePin(dLat, dLon) {
    const newLat = Math.round(Math.max(-90, Math.min(90, activePin.lat + dLat)) * 100) / 100;
    const newLon = Math.round(((activePin.lon + dLon + 360) % 360) * 10) / 10;

    let siteName = `Custom (${Math.abs(newLat).toFixed(2)}° ${newLat < 0 ? "S" : "N"}, ${newLon.toFixed(1)}° E)`;
    if (window.CoordMath && typeof window.CoordMath.findNearestSite === "function") {
      const nearest = window.CoordMath.findNearestSite(newLat, newLon, 0.2);
      if (nearest && !nearest.type.includes("Custom")) {
        siteName = nearest.name;
      }
    }

    activePin.lat = newLat;
    activePin.lon = newLon;
    activePin.name = siteName;

    if (window.eventBus) {
      window.eventBus.emit("site:marked", {
        lat: newLat,
        lon: newLon,
        name: siteName,
        source: "keyboard-nudge"
      });
    }
  }

  function handleKeyDown(e) {
    if (!config.enabled) return;

    const inTyping = isTypingContext(e.target);

    // Escape always functions even when typing inside an input (e.g. search input)
    if (e.key === "Escape") {
      // 0a. If in Mark tool mode, revert back to Grab navigation tool
      const markBtn = document.getElementById("btn-tool-mark");
      if (markBtn && markBtn.classList.contains("active")) {
        e.preventDefault();
        if (window.eventBus) window.eventBus.emit("tool:set", { tool: "grab" });
        return;
      }

      // 0b. Close Dr. Raj AI window if open
      const aiChat = document.getElementById("ai-chat-window");
      if (aiChat && aiChat.style.display !== "none") {
        e.preventDefault();
        aiChat.style.display = "none";
        const cb = document.getElementById("toggle-ai-chat");
        if (cb) cb.checked = false;
        return;
      }

      // 1. Close search palette if open
      const searchOverlay = document.getElementById("search-palette-overlay");
      if (searchOverlay && searchOverlay.style.display !== "none") {
        e.preventDefault();
        if (window.SearchPalette) window.SearchPalette.close();
        else searchOverlay.style.display = "none";
        return;
      }

      // 2. Close settings modal if open
      const settingsOverlay = document.getElementById("settings-modal-overlay");
      if (settingsOverlay && settingsOverlay.style.display !== "none") {
        e.preventDefault();
        settingsOverlay.style.display = "none";
        return;
      }

      // 3. Close inspection modal if open
      const inspectModal = document.getElementById("inspection-modal-overlay");
      if (inspectModal && inspectModal.style.display !== "none") {
        e.preventDefault();
        inspectModal.style.display = "none";
        return;
      }

      // 4. Close 2D map deck if open
      const mapCheck = document.getElementById("toggle-bottom-map");
      if (mapCheck && mapCheck.checked) {
        e.preventDefault();
        mapCheck.checked = false;
        mapCheck.dispatchEvent(new Event("change", { bubbles: true }));
        return;
      }

      // 5. Close comparison cards if open
      const cardsCheck = document.getElementById("toggle-top-cards");
      if (cardsCheck && cardsCheck.checked) {
        e.preventDefault();
        cardsCheck.checked = false;
        cardsCheck.dispatchEvent(new Event("change", { bubbles: true }));
        return;
      }
      return;
    }

    // Guard all remaining hotkeys if typing in text input
    if (inTyping) return;

    // 1. Quick Search Trigger: "/" (without Shift or other modifiers)
    if (e.key === "/" && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      if (window.eventBus) {
        window.eventBus.emit("search:open");
      } else if (window.SearchPalette) {
        window.SearchPalette.open();
      }
      return;
    }

    // 2. Timeline Continuous Play / Pause: Spacebar (without modifiers)
    if ((e.code === "Space" || e.key === " ") && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      triggerClick("btn-play-pause");
      return;
    }

    // 3. Timeline Step Controls: Ctrl + ArrowLeft / Ctrl + ArrowRight
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        triggerClick("btn-step-back");
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        triggerClick("btn-step-forward");
        return;
      }
      if (e.key === "z" || e.key === "Z") {
        e.preventDefault();
        if (e.shiftKey) {
          if (window.eventBus) window.eventBus.emit("cards:redo");
          else if (window.ComparisonCards) window.ComparisonCards.redo();
        } else {
          if (window.eventBus) window.eventBus.emit("cards:undo");
          else if (window.ComparisonCards) window.ComparisonCards.undo();
        }
        return;
      }
      if (e.key === "y" || e.key === "Y") {
        e.preventDefault();
        if (window.eventBus) window.eventBus.emit("cards:redo");
        else if (window.ComparisonCards) window.ComparisonCards.redo();
        return;
      }
    }

    // 4. Cockpit Drawer & Deck Toggles: Alt + Arrows
    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        toggleCheckbox("toggle-top-cards");
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        toggleCheckbox("toggle-bottom-map");
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        toggleCheckbox("toggle-left-horizon");
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        toggleCheckbox("toggle-right-horizon");
        return;
      }
    }

    // 5. Toggle Dr. Raj AI Lunar Assistant: Shift + ? or Shift + /
    if (e.shiftKey && (e.key === "?" || e.key === "/" || e.code === "Slash")) {
      e.preventDefault();
      if (window.eventBus) {
        window.eventBus.emit("ai:toggle");
      }
      return;
    }

    // 5b. Tool Switchers: "G" (Grab / Rotate) and "M" (Mark Site)
    if (!e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      if (e.key === "g" || e.key === "G") {
        e.preventDefault();
        if (window.eventBus) window.eventBus.emit("tool:set", { tool: "grab" });
        return;
      }
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        if (window.eventBus) window.eventBus.emit("tool:set", { tool: "mark" });
        return;
      }
    }

    // 6. RAW ARROW KEYS (Without Alt / Ctrl / Meta) -> Fine-tune / Nudge Active Landing Site Pin!
    if (!e.altKey && !e.ctrlKey && !e.metaKey) {
      // Step: 0.05° (~1.5 km) standard, or 0.25° (~7.5 km) if Shift is held
      const latStep = e.shiftKey ? 0.25 : 0.05;
      const lonStep = e.shiftKey ? 0.50 : 0.10;

      if (e.key === "ArrowUp") {
        e.preventDefault();
        nudgePin(latStep, 0);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        nudgePin(-latStep, 0);
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        nudgePin(0, -lonStep);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        nudgePin(0, lonStep);
        return;
      }
    }
  }

  function init() {
    loadConfig();
    window.addEventListener("keydown", handleKeyDown);

    // Keep activePin synced with external mark events
    if (window.eventBus) {
      window.eventBus.on("site:marked", (data) => {
        if (data && typeof data.lat === "number" && typeof data.lon === "number") {
          activePin.lat = data.lat;
          activePin.lon = data.lon;
          if (data.name) activePin.name = data.name;
        }
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return {
    getConfig: () => ({ ...config }),
    getActivePin: () => ({ ...activePin }),
    setEnabled: (val) => { config.enabled = !!val; saveConfig(); },
    resetDefaults: () => {
      config.enabled = true;
      config.bindings = { ...DEFAULT_BINDINGS };
      saveConfig();
    }
  };
})();

window.CockpitShortcuts = CockpitShortcuts;
