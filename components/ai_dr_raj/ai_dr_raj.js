/**
 * ==============================================================================
 * Lunar Landing Site Navigator - Dr. Raj AI Lunar Mission Analyst
 * File: components/ai_dr_raj/ai_dr_raj.js
 * Role: Intelligence database, query processor, conversation UI manager,
 *       and EventBus integration for the Dr. Raj lunar analyst assistant.
 * ==============================================================================
 */

(function() {
  /**
   * Curated lunar surface and orbital mechanics knowledge base.
   * Matches operator query keywords to authoritative scientific briefings
   * on illumination windows, direct-to-Earth (DTE) comms, libration, and PSRs.
   */
  const KNOWLEDGE_BASE = [
    {
      keywords: ["shackleton", "connecting ridge"],
      response: "<strong>Shackleton Connecting Ridge (89.54° S, 222.9° E)</strong>: High elevation ridge (~0 km rel to lunar datum) connecting Shackleton and Slater craters. Peak solar illumination reaches ~86% during southern summer. Direct Earth line-of-sight is steady for 14 consecutive days during positive libration cycles. Warning: Slope gradient exceeds 18° descending into the PSR."
    },
    {
      keywords: ["malapert", "mountain", "peak"],
      response: "<strong>Malapert Mountain (86.04° S, 0.0° E)</strong>: Massive 5,000-meter peak above surrounding terrain. Offers near-continuous direct-to-Earth (DTE) radio visibility (~94% of the lunar synodic month) due to high local horizon clearance. Outstanding candidate for primary comms relay and long-duration solar array deployment."
    },
    {
      keywords: ["libration", "wobble", "dte"],
      response: "<strong>Libration Dynamics</strong>: Because the Moon's orbit is elliptical and inclined by 5.14°, the Earth oscillates in the lunar sky within an apparent box of ±7.9° in longitude and ±6.7° in latitude. At the South Pole, Earth hovers close to the horizon (0° to 8° elevation). Terrain ridges can occlude line-of-sight during unfavorable libration phases even when the site has an unblocked view during mid-cycle."
    },
    {
      keywords: ["solar", "stay", "power", "6-day", "window"],
      response: "<strong>Optimal Artemis Solar Stay</strong>: For a 6-day (144 hr) continuous EVA surface stay, <em>Connecting Ridge</em> and <em>Peak Near Shackleton</em> offer continuous solar elevation angles >1.2° between December 12 and December 20. Peak battery reserve margin occurs at Azimuth 180°–210°."
    },
    {
      keywords: ["psr", "shadow", "ice", "water"],
      response: "<strong>Permanently Shadowed Regions (PSRs)</strong>: Temperatures in craters like Faustini, Shoemaker, and Haworth drop below 40 Kelvin (-233°C). Any robotic or crewed traverse into PSR floors requires dedicated RTG or fuel cell power and LiDAR terrain guidance due to complete absence of sunlight."
    }
  ];

  /**
   * Tactical briefings keyed by landing site ID, emitted automatically when
   * a site is selected anywhere in the application.
   */
  const SITE_INTEL = {
    "site-1": "Tactical Brief on <strong>Shackleton Connecting Ridge</strong>: Solar illumination is high, DTE comm margin is nominal (+6.2 dB). Exercise caution on eastern rim slope gradients.",
    "site-2": "Tactical Brief on <strong>Haworth Crater Rim</strong>: Good access to deep PSR cold traps. Earth elevation is 4.1°, stable line-of-sight for next 96 mission hours.",
    "site-3": "Tactical Brief on <strong>Malapert Mountain</strong>: Exceptional telecommunications vantage point. Horizon clearance allows uninterrupted high-gain antenna lock to DSN Canberra/Goldstone.",
    "site-4": "Tactical Brief on <strong>Slater Plain</strong>: Flat touchdown zone (slope < 6°), but lower aggregate illumination (~68%). Auxiliary fuel cell reserves advised for lunar night."
  };

  /**
   * Main component initialization: binds UI events, chat inputs,
   * suggestion chips, and EventBus subscribers.
   */
  function initDrRaj() {
    const bubbleBtn = document.getElementById("ai-bubble-btn");
    const chatWindow = document.getElementById("ai-chat-window");
    const minimizeBtn = document.getElementById("ai-minimize-btn");
    const form = document.getElementById("ai-input-form");
    const inputField = document.getElementById("ai-input-text");
    const msgContainer = document.getElementById("ai-messages-container");
    const chips = document.querySelectorAll(".chip-btn");
    const notifDot = document.getElementById("ai-notification-dot");

    function isChatOpen() {
      if (!chatWindow) return false;
      return chatWindow.style.display !== "none";
    }

    // Opens the chat dialog and focuses the input field
    function openChat() {
      if (chatWindow) {
        chatWindow.style.display = "flex";
        const cb = document.getElementById("toggle-ai-chat");
        if (cb && !cb.checked) cb.checked = true;
        if (inputField) inputField.focus();
      }
    }

    // Hides the chat dialog
    function closeChat() {
      if (chatWindow) {
        chatWindow.style.display = "none";
        const cb = document.getElementById("toggle-ai-chat");
        if (cb && cb.checked) cb.checked = false;
      }
    }

    // Sync state if pure-CSS toggle checkbox is changed externally
    const toggleCheckbox = document.getElementById("toggle-ai-chat");
    if (toggleCheckbox) {
      toggleCheckbox.addEventListener("change", () => {
        if (toggleCheckbox.checked) {
          openChat();
        } else {
          closeChat();
        }
      });
    }

    // Minimize button click listener
    if (minimizeBtn) minimizeBtn.addEventListener("click", closeChat);

    /**
     * Appends a formatted message bubble to the conversation stream.
     * Automatically scrolls to bottom and binds click handlers to embedded site links.
     *
     * @param {'user'|'assistant'} sender - Author of the message
     * @param {string} text - Message HTML content
     */
    function appendMessage(sender, text) {
      if (!msgContainer) return;

      const msgDiv = document.createElement("div");
      msgDiv.className = `ai-msg msg-${sender}`;

      const bubble = document.createElement("div");
      bubble.className = "msg-bubble";
      bubble.innerHTML = text;

      const time = document.createElement("div");
      time.className = "msg-time";
      const now = new Date();
      time.textContent = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} UTC`;

      msgDiv.appendChild(bubble);
      msgDiv.appendChild(time);
      msgContainer.appendChild(msgDiv);

      // Auto-scroll stream to latest entry
      msgContainer.scrollTop = msgContainer.scrollHeight;

      // Handle any embedded clickable site links (e.g. data-site-id)
      bubble.querySelectorAll(".ai-site-link").forEach(link => {
        link.addEventListener("click", () => {
          const siteId = link.dataset.siteId;
          if (siteId && window.eventBus) {
            window.eventBus.emit("site:select", { id: siteId });
          }
        });
      });
    }

    /**
     * Matches the user's natural language query against the knowledge base keywords,
     * returning a domain-specific briefing or a generic ephemeris analysis fallback.
     *
     * @param {string} query - Operator input text
     * @returns {string} Briefing HTML response
     */
    function generateResponse(query) {
      const q = query.toLowerCase();

      // Check keywords across knowledge base entries
      for (const entry of KNOWLEDGE_BASE) {
        if (entry.keywords.some(k => q.includes(k))) {
          return entry.response;
        }
      }

      // Default smart ephemeris fallback
      return `Copy that, Commander. Analyzing <em>"${query}"</em> against south pole ephemeris data. Our terrain models indicate localized shadow crests and dynamic Earth libration must be monitored continuously for this profile.`;
    }

    /**
     * Handles user message submission from the text input field.
     */
    function handleSend() {
      if (!inputField) return;
      const text = inputField.value.trim();
      if (!text) return;

      // Append operator message immediately
      appendMessage("user", text);
      inputField.value = "";

      // Simulate network / inference thinking delay (350ms)
      setTimeout(() => {
        const reply = generateResponse(text);
        appendMessage("assistant", reply);
      }, 350);
    }

    // Submit listener for form input
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        handleSend();
      });
    }

    // Quick-action prompt suggestion chips
    chips.forEach(chip => {
      chip.addEventListener("click", () => {
        const query = chip.dataset.query;
        if (query) {
          appendMessage("user", query);
          setTimeout(() => {
            const reply = generateResponse(query);
            appendMessage("assistant", reply);
          }, 300);
        }
      });
    });

    // ------------------------------------------------------------------------
    // EventBus Integrations
    // ------------------------------------------------------------------------
    if (window.eventBus) {
      // Toggle chat window when mission toolbar "Dr. Raj AI" button is clicked
      window.eventBus.on("ai:toggle", () => {
        if (!chatWindow) return;
        if (!isChatOpen()) {
          openChat();
        } else {
          closeChat();
        }
      });

      // Provide automatic tactical briefing when a site is selected
      window.eventBus.on("site:selected", (data) => {
        const siteId = data.siteId || data.id;
        const intel = SITE_INTEL[siteId] || `Tactical analysis for site ${siteId}: coordinates registered. Reviewing horizon silhouette and line-of-sight comms.`;

        // If chat is open, post message; if closed, pulse notification dot
        if (chatWindow && chatWindow.style.display !== "none") {
          appendMessage("assistant", intel);
        } else {
          if (notifDot) notifDot.style.display = "block";
          appendMessage("assistant", intel);
        }
      });
    }
  }

  // Safe DOM ready check: initialize immediately if DOM loaded, or on DOMContentLoaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDrRaj);
  } else {
    initDrRaj();
  }
})();
