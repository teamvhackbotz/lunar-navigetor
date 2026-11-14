/**
 * Main Application Orchestrator
 * Coordinates component events, theme switching, and settings dialog.
 */

document.addEventListener("DOMContentLoaded", () => {
  console.log("🌔 Lunar Landing Site Navigator Initialized.");

  // 1. Initialize Coordinate Synchronizer across 3D, 2D Polar, and 2D Rectangular views
  if (window.CoordSync) {
    window.CoordSync.init();
  }

  // 2. Settings Modal Open / Close Logic
  const settingsModal = document.getElementById("settings-modal");
  const btnOpenSettings = document.getElementById("btn-open-settings");
  const btnCloseSettings = document.getElementById("btn-close-settings");

  if (btnOpenSettings && settingsModal) {
    btnOpenSettings.addEventListener("click", () => {
      settingsModal.classList.add("active");
    });
  }

  if (btnCloseSettings && settingsModal) {
    btnCloseSettings.addEventListener("click", () => {
      settingsModal.classList.remove("active");
    });
  }

  // Close modal when clicking on overlay background
  if (settingsModal) {
    settingsModal.addEventListener("click", (e) => {
      if (e.target === settingsModal) {
        settingsModal.classList.remove("active");
      }
    });
  }

  // 3. Theme Switcher Logic
  const themeRadios = document.querySelectorAll('input[name="app-theme"]');
  themeRadios.forEach(radio => {
    radio.addEventListener("change", (e) => {
      const theme = e.target.value;
      document.body.classList.remove("theme-earth", "theme-regolith", "theme-contrast");
      document.body.classList.add(`theme-${theme}`);
      localStorage.setItem("lunar_app_theme", theme);
      console.log(`Switched to theme: ${theme}`);
    });
  });

  // Restore saved theme
  const savedTheme = localStorage.getItem("lunar_app_theme");
  if (savedTheme) {
    const targetRadio = document.querySelector(`input[name="app-theme"][value="${savedTheme}"]`);
    if (targetRadio) {
      targetRadio.checked = true;
      document.body.classList.add(`theme-${savedTheme}`);
    }
  }

  // 4. Comparison Cards: Click to Focus / Sync
  const siteCards = document.querySelectorAll(".site-card:not(.card-add-new)");
  siteCards.forEach(card => {
    card.addEventListener("click", (e) => {
      // Don't trigger if clicking dismiss or horizon button
      if (e.target.closest(".card-dismiss") || e.target.closest(".label-btn")) return;
      
      siteCards.forEach(c => c.classList.remove("active"));
      card.classList.add("active");

      const siteName = card.querySelector(".site-name")?.textContent;
      const coordsText = card.querySelector(".site-coords")?.textContent;
      
      if (coordsText) {
        // Parse "89.6° S · 129.2° E"
        const parts = coordsText.split("·");
        const latVal = parseFloat(parts[0]);
        const lonVal = parseFloat(parts[1]);
        const lat = parts[0].includes("S") ? -latVal : latVal;
        const lon = parts[1].includes("W") ? (360 - lonVal) % 360 : lonVal;

        if (window.CoordSync) {
          window.CoordSync.update({ lat, lon, name: siteName }, "card-click");
        }
      }
    });
  });

  // 5. Timeline Play/Pause & Speed Simulation
  const btnPlay = document.querySelector(".btn-play");
  const timelineSlider = document.querySelector(".full-width-slider");
  let isPlaying = false;
  let playInterval = null;
  let playbackSpeed = 100;

  if (btnPlay && timelineSlider) {
    btnPlay.addEventListener("click", () => {
      isPlaying = !isPlaying;
      btnPlay.textContent = isPlaying ? "⏸" : "▶";
      btnPlay.classList.toggle("playing", isPlaying);

      if (isPlaying) {
        playInterval = setInterval(() => {
          let val = parseInt(timelineSlider.value, 10);
          val = (val + 1) % 100;
          timelineSlider.value = val;
          // Update timestamp text
          updateTimelineStatus(val);
        }, 100);
      } else {
        clearInterval(playInterval);
      }
    });
  }

  function updateTimelineStatus(val) {
    const statusClock = document.querySelector(".status-clock");
    if (statusClock) {
      const baseDate = new Date(Date.UTC(2026, 10, 1 + Math.floor(val * 0.3)));
      const hour = Math.floor((val * 24 * 0.3) % 24);
      statusClock.textContent = `🕒 ${baseDate.toISOString().slice(0, 10)} ${hour.toString().padStart(2, '0')}:00 UTC`;
    }
  }

  // Speed buttons
  const speedBtns = document.querySelectorAll(".btn-speed");
  speedBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      speedBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      playbackSpeed = parseInt(btn.textContent, 10);
    });
  });
});
