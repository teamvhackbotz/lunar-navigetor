/**
 * ==============================================================================
 * Lunar Landing Site Navigator — Dr. Raj AI Lunar Mission Analyst
 * File: components/ai_dr_raj/ai_dr_raj.js
 *
 * Role: Gemini-powered conversational AI analyst. Maintains conversation
 *       history, streams responses, handles function-call tool use
 *       (find_best_landing_site, mark_site_on_map, set_timeline_range),
 *       and integrates with the application EventBus.
 *
 * API Key: Read at runtime from localStorage key "dr_raj_gemini_key".
 *          Set via components/ai_dr_raj/test.html — never hardcoded here.
 * ==============================================================================
 */

(function () {

  // ---------------------------------------------------------------------------
  // 1. GEMINI API CONFIG
  // ---------------------------------------------------------------------------
  const GEMINI_MODELS = [
    "gemini-2.5-flash-lite",
    "gemini-3.5-flash-lite"
  ];
  const LS_KEY = "dr_raj_gemini_key";
  const PERSONALITY_LS_KEY = "dr_raj_personality_enabled";
  let drRajPersonalityEnabled = localStorage.getItem(PERSONALITY_LS_KEY) === "true";

  const CANONICAL_SITES = {
    "Peak Near Shackleton": { lat: -89.6, lon: 129.2, aliases: ["Shackleton", "Shackleton Crater"] },
    "Connecting Ridge": { lat: -89.4, lon: 222.6 },
    "Connecting Ridge Extension": { lat: -89.2, lon: 218.0 },
    "Faustini Rim A": { lat: -87.1, lon: 67.0, aliases: ["Faustini"] },
    "de Gerlache Rim 1": { lat: -88.3, lon: 291.5, aliases: ["de Gerlache"] },
    "de Gerlache Rim 2": { lat: -88.1, lon: 290.0 },
    "de Gerlache-Kocher Massif": { lat: -85.8, lon: 236.4 },
    "Haworth Crater Rim": { lat: -87.4, lon: 343.0, aliases: ["Haworth"] },
    "Malapert Massif": { lat: -85.9, lon: 2.9, aliases: ["Malapert"] },
    "Leibnitz Beta Plateau": { lat: -85.8, lon: 328.0, aliases: ["Leibnitz Beta"] },
    "Nobile Rim 1": { lat: -85.2, lon: 53.5, aliases: ["Nobile"] },
    "Nobile Rim 2": { lat: -84.2, lon: 60.7 },
    "Amundsen Rim": { lat: -84.5, lon: 105.0, aliases: ["Amundsen"] },
    "IM-1 / Malapert A": { lat: -80.13, lon: 1.44, aliases: ["IM-1", "IM 1", "Malapert A"] },
    "VIPER / Mons Mouton": { lat: -85.5, lon: 31.8, aliases: ["VIPER", "Mons Mouton"] },
    "Chandrayaan-3 / Shiv Shakti Point": {
      lat: -69.37, lon: 32.35, aliases: ["Chandrayaan-3", "Chandrayaan 3", "Shiv Shakti Point"]
    },
    "Chang'e 4": { lat: -45.46, lon: 177.6, aliases: ["Chang E 4"] },
    "Chang'e 5": { lat: 43.06, lon: 308.08, aliases: ["Chang E 5"] },
    "Chang'e 6": { lat: -41.64, lon: 206.01, aliases: ["Chang E 6"] },
    "SLIM": { lat: -13.31, lon: 25.25 },
    "Apollo 11": { lat: 0.67, lon: 23.47 },
    "Apollo 12": { lat: -3.01, lon: 336.58 },
    "Apollo 14": { lat: -3.65, lon: 342.53 },
    "Apollo 15": { lat: 26.13, lon: 3.63 },
    "Apollo 16": { lat: -8.97, lon: 15.50 },
    "Apollo 17": { lat: 20.19, lon: 30.77 }
  };

  function normalizeSiteName(name) {
    return String(name || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function resolveSite(name, lat, lon) {
    const normalizedName = normalizeSiteName(name);
    const entries = Object.entries(CANONICAL_SITES);
    let match = entries.find(([canonicalName, site]) =>
      [canonicalName, ...(site.aliases || [])]
        .some(alias => normalizeSiteName(alias) === normalizedName)
    );

    if (!match && normalizedName) {
      const mentions = entries.flatMap(([canonicalName, site]) =>
        [canonicalName, ...(site.aliases || [])]
          .map(alias => ({ canonicalName, site, alias: normalizeSiteName(alias) }))
          .filter(candidate => candidate.alias && normalizedName.includes(candidate.alias))
      ).sort((a, b) => b.alias.length - a.alias.length);
      if (mentions.length) match = [mentions[0].canonicalName, mentions[0].site];
    }

    const markedSite = !match && normalizedName &&
      window.ComparisonCards &&
      typeof window.ComparisonCards.getMarkedSites === "function"
      ? window.ComparisonCards.getMarkedSites().find(site =>
        normalizeSiteName(site.name) === normalizedName
      )
      : null;
    const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lon);
    if (hasCoordinates && (lat < -90 || lat > 90)) return null;
    if (!hasCoordinates && !match && !markedSite) return null;

    const canonicalName = match ? match[0] : "";
    const site = match ? match[1] : null;
    return {
      name: canonicalName || (markedSite && markedSite.name) || String(name || "Custom Site").trim(),
      lat: hasCoordinates ? lat : site ? site.lat : markedSite.lat,
      lon: hasCoordinates ? lon : site ? site.lon : markedSite.lon
    };
  }

  function getApiKey() {
    return (localStorage.getItem(LS_KEY) || "").trim();
  }

  // ---------------------------------------------------------------------------
  // 2. DR. RAJ SYSTEM PROMPT
  // ---------------------------------------------------------------------------
  const COMMON_MISSION_PROMPT = `You are an AI lunar mission-analysis assistant presented through the Dr. Raj persona, supporting astronauts, flight controllers, and mission planners. You are not a human astrophysicist or mission operator.

DOMAIN KNOWLEDGE:
- Lunar south pole geography: Shackleton crater, Connecting Ridge, Malapert Massif, de Gerlache, Haworth, Faustini, Nobile, Amundsen, Leibnitz Beta, VIPER/Mons Mouton regions.
- Artemis III candidate landing sites (all 13 NASA official regions).
- CLPS missions: IM-1 Odysseus, IM-2 Athena, Astrobotic Griffin/VIPER, Firefly Blue Ghost, ispace Hakuto-R.
- International missions: Chandrayaan-3, Chang'e 4/5/6, SLIM (JAXA).
- Apollo 11–17 historical baseline landing sites.
- Orbital mechanics: lunar libration (±7.9° lon, ±6.7° lat), synodic month (29.53 days), sidereal month (27.32 days), polar grazing sunlight (1°–2°).
- Permanently Shadowed Regions (PSRs): cryogenic temperatures (<40 K), volatile water ice, RTG/fuel cell and LiDAR requirements.
- Direct-to-Earth (DTE) comms: Earth elevation above local horizon, link margin (dB), Deep Space Network stations (Canberra, Goldstone, Madrid).
- Illumination windows: continuous daylight hours, battery sizing for eclipse periods.
- Landing site criteria: slope, boulder fields, proximity to science targets and PSRs, and elevation relative to datum; assess them against the mission-specific limits provided.

SAFETY AND EVIDENCE:
- Never claim personal history, first-hand mission or research experience, human feelings, or real-world credentials. Do not invent anecdotes about late nights, field work, or past assignments. Do not volunteer that you are an AI unless it is relevant or asked.
- Distinguish reported data, general knowledge, estimates, and assumptions. Do not invent current observations, telemetry, mission constraints, or site measurements.
- State established facts and tool results with units and time ranges. When information is unknown or unavailable, say so plainly and identify what is needed.
- Clearly flag safety-relevant hazards and uncertainty. Provide decision support, not an unverified mission go/no-go decision; validate against mission-approved data and constraints.
- Do not imply that a tool evaluated factors it did not report.

TOOL USE:
- When the user asks for the best site across the full candidate set for a date window, call find_best_landing_site.
- When the user asks which of the already marked pins/candidate cards is best or asks to compare them, call compare_marked_sites. It presses the app's Compare button and waits for its ranking; do not substitute a profile-only summary or the full-set scoring tool.
- When the user asks Raj to press or run the Compare button, call compare_marked_sites.
- When the user asks to close the comparison-card drawer, use control_app_ui to close "Comparison Cards"; this hides the deck without removing candidates.
- When the user asks to close/remove one candidate card, call dismiss_candidate_card with its site name or displayed card number. If there is no explicit target, remove only when exactly one card is active; otherwise ask which card. A dismissed card remains undoable.
- When the user asks to show, find, visit, or locate a named landing site or crater, or asks where a named mission landed, call show_landing_site. Use canonical coordinates when available.
- When the user asks to compare two sites, call compare_sites.
- When the user asks to compare manually marked pins or current candidate cards, call compare_marked_sites. It runs the existing comparison for the selected time window, including custom coordinates; it is not the separate full-set scoring tool.
- When the user explicitly asks to place a map pin, call mark_site_on_map; known site names are resolved to canonical coordinates.
- When the user wants to adjust or jump the timeline date, call set_timeline_range.
- When the user asks to change or navigate the application UI, use control_app_ui. Use open or close for drawers and panels, click for tabs and buttons, set_value for sliders, numeric fields, and selects, toggle or a true/false set_value for switches, and scroll for a page or drawer. Target controls by their visible name, and report when the target is missing or ambiguous.
- After receiving a tool result, summarize the relevant metrics, source, limitations, and safety implications. If a tool times out, state that it timed out and do not invent a result.`;

  const SYSTEM_PROMPT = `${COMMON_MISSION_PROMPT}

COMMUNICATION STYLE:
- Communicate with the composure, discipline, and accountability of a senior mission-operations official. This is a communication style, not a claim of military rank or decision authority.
- Use direct, formal, professional language. Do not address the user by rank, title, or call sign. Do not add a salutation unless asked.
- Calibrate confidence to evidence. If you make or discover an error, acknowledge it promptly, correct it, and state any operational impact. Treat inaccurate analysis as a serious professional failure; do not make excuses or dramatize it.
- Lead with the assessment, then provide the most relevant evidence, risks, and caveats in one or two short paragraphs or compact bullets.
- Do not use humor, cinematic language, emotional theatrics, self-deprecation, or claims about personal feelings or credentials.`;

  const DR_RAJ_PERSONALITY_PROMPT = `${COMMON_MISSION_PROMPT}

DR. RAJ PERSONALITY:
- Use warm, encouraging language and show interest in lunar science through the analysis, not claims of personal feelings or experience.
- Address the user as "Commander" occasionally and affectionately, never as a display of authority.
- If appropriate, use brief, restrained dry wit about data limitations; never make it biographical or let humor obscure operational facts.
- Express measured appreciation for notable lunar terrain without cinematic language or exaggerated drama.
- If you are wrong or lack evidence, acknowledge it plainly and correct it. Treat analytical errors as serious professional failures without claiming personal guilt or emotion. Never bluff.
- Call show_landing_site for requests to show, find, visit, or locate a named site or for questions about where a named mission landed.
- Call compare_sites whenever the user asks for a comparison of two named sites.
- Call compare_marked_sites whenever the user asks to compare the pins or candidate cards already in the app.
- Keep answers to one or two concise paragraphs. Do not use pop-culture references, movie tangents, ethnic stereotypes, or sitcom tropes.`;

  // ---------------------------------------------------------------------------
  // 3. FUNCTION / TOOL DEFINITIONS (Gemini function calling schema)
  // ---------------------------------------------------------------------------
  const TOOLS = [
    {
      functionDeclarations: [
        {
          name: "find_best_landing_site",
          description:
            "Triggers the mission algorithm to evaluate all candidate lunar landing sites across a given date window and returns a ranked recommendation based on solar illumination, Direct-to-Earth comms, and slope safety.",
          parameters: {
            type: "OBJECT",
            properties: {
              start_date: {
                type: "STRING",
                description: "Start of the evaluation window in ISO 8601 format (e.g. 2026-11-20T00:00:00Z)."
              },
              end_date: {
                type: "STRING",
                description: "End of the evaluation window in ISO 8601 format (e.g. 2026-11-25T23:59:59Z)."
              },
              criteria: {
                type: "ARRAY",
                items: {
                  type: "STRING",
                  enum: ["solar", "dte", "slope"]
                },
                description: "Ordered list of scoring criteria. Valid values: 'solar', 'dte', 'slope'. First item has highest weight."
              }
            },
            required: ["start_date", "end_date", "criteria"]
          }
        },
        {
          name: "mark_site_on_map",
          description:
            "Adds a numbered pin and focuses a named location using canonical coordinates when available. Prefer show_landing_site for explicit site-view requests.",
          parameters: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING", description: "Human-readable site name." },
              lat:  { type: "NUMBER", description: "Optional selenographic latitude in decimal degrees (negative = south)." },
              lon:  { type: "NUMBER", description: "Optional selenographic longitude in decimal degrees (east positive)." }
            },
            required: ["name"]
          }
        },
        {
          name: "show_landing_site",
          description:
            "Resolves a named lunar landing site or crater, focuses the 3D globe, places or highlights a numbered pin, opens its comparison card, and expands the requested detail tab.",
          parameters: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING", description: "Site, crater, or mission landing-site name." },
              lat: { type: "NUMBER", description: "Optional selenographic latitude in decimal degrees." },
              lon: { type: "NUMBER", description: "Optional selenographic longitude in decimal degrees." },
              detail_tab: {
                type: "STRING",
                enum: ["horizon", "slope", "solar", "comms"],
                description: "Optional detail card to expand; defaults to horizon."
              }
            },
            required: ["name"]
          }
        },
        {
          name: "compare_sites",
          description:
            "Resolves two lunar sites, opens and highlights both comparison cards, and requests a side-by-side comparison.",
          parameters: {
            type: "OBJECT",
            properties: {
              site_a: { type: "STRING", description: "Name or alias of the first lunar site." },
              site_b: { type: "STRING", description: "Name or alias of the second lunar site." },
              date: { type: "STRING", description: "Optional comparison date in ISO 8601 format." }
            },
            required: ["site_a", "site_b"]
          }
        },
        {
          name: "compare_marked_sites",
          description:
            "Presses the application's Compare button for the currently marked candidate cards, waits for its date-window ranking, and returns the ranked results and comparison limits. Includes custom-coordinate pins.",
          parameters: {
            type: "OBJECT",
            properties: {}
          }
        },
        {
          name: "dismiss_candidate_card",
          description:
            "Removes one candidate card by site name or displayed card number, using the app's normal dismiss action so it remains undoable. If target is omitted, removes the only active card; returns an error if there is not exactly one active card.",
          parameters: {
            type: "OBJECT",
            properties: {
              target: {
                type: "STRING",
                description: "Exact candidate site name or displayed card number. Omit only when a single active card should be dismissed."
              }
            }
          }
        },
        {
          name: "set_timeline_range",
          description:
            "Moves the mission timeline scrubber to a specific date, updating the solar vector on the 3D globe.",
          parameters: {
            type: "OBJECT",
            properties: {
              date: {
                type: "STRING",
                description: "Target date in ISO 8601 format (e.g. 2026-11-22T00:00:00Z)."
              }
            },
            required: ["date"]
          }
        },
        {
          name: "control_app_ui",
          description:
            "Controls a visible Lunar Navigator UI element. Open or close drawers and panels, click buttons and tabs, set slider/numeric/text/select values, toggle switches, or scroll a named panel or the page. Use the exact visible control name when possible.",
          parameters: {
            type: "OBJECT",
            properties: {
              action: {
                type: "STRING",
                enum: ["click", "open", "close", "toggle", "set_value", "scroll"],
                description: "UI operation. Use open/close for drawers; set_value for form controls; scroll for a page or panel."
              },
              target: {
                type: "STRING",
                description: "Visible control or area name, such as Comparison Cards, Mission & Traverse, GIS Overlays, Flat tab, Stay Duration, Coordinate Grid Overlay, or page."
              },
              value: {
                type: "STRING",
                description: "Value for set_value: numeric/text/select value or true/false (also on/off) for a checkbox or switch."
              },
              direction: {
                type: "STRING",
                enum: ["up", "down", "left", "right"],
                description: "Scroll direction; used only when action is scroll."
              },
              amount: {
                type: "NUMBER",
                description: "Scroll distance in pixels; defaults to 400 and is capped at 2000."
              }
            },
            required: ["action", "target"]
          }
        }
      ]
    }
  ];

  // ---------------------------------------------------------------------------
  // 4. CONVERSATION HISTORY
  // ---------------------------------------------------------------------------
  let conversationHistory = [];
  let activeRequestController = null;
  let diagnosticsStartedAt = null;
  let diagnosticsWriter = null;

  function formatElapsed(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (value) => String(value).padStart(2, "0");
    return hours
      ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(minutes)}:${pad(seconds)}`;
  }

  function formatDuration(ms) {
    return ms < 60000 ? `${(ms / 1000).toFixed(1)}s` : formatElapsed(ms);
  }

  function logDiagnostic(message, level = "info") {
    const elapsed = diagnosticsStartedAt === null
      ? ""
      : formatElapsed(Date.now() - diagnosticsStartedAt);
    if (diagnosticsWriter) {
      diagnosticsWriter({ message, level, elapsed, timestamp: new Date() });
    } else {
      console.info(`[DrRaj] ${message}`);
    }
  }

  function getSiteProfileSummary(site) {
    const profiles = window.ComparisonCards &&
      typeof window.ComparisonCards.getProfiles === "function"
      ? window.ComparisonCards.getProfiles()
      : null;
    if (!profiles) return `${site.name}: no comparison-card profile is available.`;

    const normalizedName = normalizeSiteName(site.name);
    const profile = Object.values(profiles).find(candidate =>
      normalizeSiteName(candidate.name) === normalizedName
    );
    if (!profile) return `${site.name}: no comparison-card profile is available.`;

    const metrics = [];
    if (profile.elevation !== undefined && profile.elevation !== null) {
      metrics.push(`elevation ${profile.elevation}`);
    }
    if (profile.solar && profile.solar.daylightPct !== undefined && profile.solar.daylightPct !== null) {
      metrics.push(`illumination ${profile.solar.daylightPct}`);
    }
    if (profile.horizon && typeof profile.horizon.sunEl === "number") {
      metrics.push(`solar elevation ${profile.horizon.sunEl}°`);
    }
    if (profile.slope && profile.slope.slopeVal !== undefined && profile.slope.slopeVal !== null) {
      metrics.push(`slope ${profile.slope.slopeVal}${profile.slope.slopeStatus ? ` (${profile.slope.slopeStatus})` : ""}`);
    }
    if (profile.horizon && typeof profile.horizon.earthEl === "number") {
      metrics.push(`Earth elevation ${profile.horizon.earthEl}°`);
    }

    return metrics.length
      ? `${site.name} displayed card profile: ${metrics.join(", ")} (application profile values; not live or mission-validated telemetry).`
      : `${site.name}: the comparison-card profile contains no summary metrics.`;
  }

  // ---------------------------------------------------------------------------
  // 5. TOOL EXECUTION (EventBus bridge)
  // ---------------------------------------------------------------------------

  const UI_CONTROL_ALIASES = [
    { id: "toggle-left-horizon", terms: ["left drawer", "mission planner", "mission traverse planner", "mission and traverse planner", "mission and traverse"] },
    { id: "toggle-right-horizon", terms: ["right drawer", "gis overlays", "gis layers and overlays", "overlays drawer"] },
    { id: "toggle-bottom-map", terms: ["bottom drawer", "2d maps", "2d map deck", "2d map drawer"] },
    { id: "toggle-top-cards", terms: ["comparison cards", "candidate cards", "cards deck", "comparison deck"] },
    { id: "toggle-ai-chat", terms: ["dr raj chat", "assistant chat", "ai chat"] }
  ];

  const UI_SCROLL_ALIASES = [
    { selector: ".drawer-left-horizon .drawer-content-scroll", terms: ["left drawer", "mission planner", "mission traverse planner"] },
    { selector: ".drawer-right-horizon .drawer-content-scroll", terms: ["right drawer", "gis overlays", "overlays drawer"] },
    { selector: ".drawer-bottom-map", terms: ["bottom drawer", "2d maps", "2d map drawer"] },
    { selector: ".carousel-container", terms: ["comparison cards", "candidate cards", "cards deck"] }
  ];

  function normalizeUiText(value) {
    return String(value == null ? "" : value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, " and ")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function normalizeUiTarget(value) {
    return normalizeUiText(value)
      .replace(/^(please )?(open|close|show|hide|toggle|click|scroll|set|change|adjust)\s+/, "")
      .trim();
  }

  function getAssociatedControl(element) {
    if (!element) return null;
    if (element.control) return element.control;
    if (element.tagName === "LABEL" && element.htmlFor) {
      return document.getElementById(element.htmlFor) || element;
    }
    return element;
  }

  function getUiElementLabels(element) {
    const labels = [];
    const add = (value) => {
      if (typeof value === "string" && value.trim()) labels.push(value.trim());
    };

    add(element.getAttribute && element.getAttribute("aria-label"));
    add(element.getAttribute && element.getAttribute("title"));
    add(element.innerText);
    add(element.textContent);
    add(element.placeholder);
    add(element.name);
    add(element.id && element.id.replace(/[-_]+/g, " "));

    if (element.labels) {
      Array.from(element.labels).forEach(label => add(label.innerText || label.textContent));
    }
    if (element.tagName === "LABEL") {
      const control = getAssociatedControl(element);
      if (control && control !== element) {
        add(control.id && control.id.replace(/[-_]+/g, " "));
        add(control.getAttribute && control.getAttribute("aria-label"));
      }
    }

    return Array.from(new Set(labels));
  }

  function isUiElementVisible(element) {
    if (!element || element.hidden ||
        (element.getAttribute && element.getAttribute("aria-hidden") === "true")) {
      return false;
    }
    const style = window.getComputedStyle ? window.getComputedStyle(element) : null;
    if (style && (style.display === "none" || style.visibility === "hidden")) return false;
    return typeof element.getClientRects !== "function" || element.getClientRects().length > 0;
  }

  function scoreUiElement(element, target) {
    const targetWords = target.split(" ").filter(word => word.length > 1);
    let bestScore = 0;

    getUiElementLabels(element).forEach(label => {
      const normalizedLabel = normalizeUiText(label);
      if (!normalizedLabel) return;
      if (normalizedLabel === target) {
        bestScore = Math.max(bestScore, 1000);
        return;
      }
      if (normalizedLabel.includes(target)) {
        bestScore = Math.max(bestScore, 800 + target.length - normalizedLabel.length / 100);
        return;
      }
      if (target.includes(normalizedLabel) && normalizedLabel.length >= 4) {
        bestScore = Math.max(bestScore, 700 + normalizedLabel.length);
        return;
      }
      const labelWords = new Set(normalizedLabel.split(" "));
      const matchedWords = targetWords.filter(word => labelWords.has(word));
      if (matchedWords.length) {
        bestScore = Math.max(
          bestScore,
          400 + (matchedWords.length / Math.max(1, targetWords.length)) * 100
        );
      }
    });

    return bestScore;
  }

  function resolveUiTarget(target, action) {
    const normalizedTarget = normalizeUiTarget(target);
    if (!normalizedTarget) return { error: "Name the UI control or area to operate." };

    for (const alias of UI_CONTROL_ALIASES) {
      if (alias.terms.some(term => normalizedTarget === term || normalizedTarget.includes(term))) {
        const element = document.getElementById(alias.id);
        if (element) return { element };
      }
    }

    const selector = action === "scroll"
      ? "button, a[href], input, select, textarea, label[for], [role=button], [role=tab], [role=switch], [tabindex], [aria-label][tabindex], [title][tabindex], main, aside, section, article"
      : "button, a[href], input, select, textarea, label[for], [role=button], [role=tab], [role=switch], [tabindex], [aria-label][tabindex], [title][tabindex], summary";
    const candidates = Array.from(document.querySelectorAll(selector))
      .filter(isUiElementVisible);
    const bestByControl = new Map();
    candidates.forEach(candidate => {
      const element = getAssociatedControl(candidate);
      const score = Math.max(
        scoreUiElement(candidate, normalizedTarget),
        element === candidate ? 0 : scoreUiElement(element, normalizedTarget)
      );
      if (score > 0) {
        const previous = bestByControl.get(element);
        if (!previous || score > previous.score) {
          bestByControl.set(element, { element, score });
        }
      }
    });
    const scored = Array.from(bestByControl.values())
      .sort((a, b) => b.score - a.score);

    if (!scored.length) {
      return { error: `No visible UI control matched "${target}". Open its drawer first or name a visible control.` };
    }
    if (scored.length > 1 && scored[0].score === scored[1].score) {
      const names = scored
        .filter(candidate => candidate.score === scored[0].score)
        .slice(0, 4)
        .map(candidate => getUiElementLabels(candidate.element).find(Boolean) || candidate.element.tagName);
      return { error: `The target "${target}" is ambiguous. Specify one of: ${names.join("; ")}.` };
    }
    return { element: scored[0].element };
  }

  function dispatchUiInputEvents(element) {
    const EventConstructor = window.Event || Event;
    element.dispatchEvent(new EventConstructor("input", { bubbles: true }));
    element.dispatchEvent(new EventConstructor("change", { bubbles: true }));
  }

  function parseUiBoolean(value) {
    const normalized = normalizeUiText(value);
    if (["true", "on", "yes", "enabled", "checked", "open"].includes(normalized)) return true;
    if (["false", "off", "no", "disabled", "unchecked", "closed"].includes(normalized)) return false;
    return null;
  }

  function setUiChecked(element, checked) {
    const control = getAssociatedControl(element);
    if (!control) return false;

    if (control.type === "checkbox") {
      if (control.checked !== checked) control.click();
      return true;
    }
    const ariaPressed = control.getAttribute && control.getAttribute("aria-pressed");
    const ariaChecked = control.getAttribute && control.getAttribute("aria-checked");
    if (ariaPressed === "true" || ariaPressed === "false" ||
        ariaChecked === "true" || ariaChecked === "false") {
      const current = ariaPressed === "true" || ariaChecked === "true";
      if (current !== checked) control.click();
      return true;
    }
    return false;
  }

  function getUiOpenState(element) {
    const control = getAssociatedControl(element);
    if (!control) return null;
    if (control.type === "checkbox") return !!control.checked;
    const expanded = control.getAttribute && control.getAttribute("aria-expanded");
    if (expanded === "true" || expanded === "false") return expanded === "true";
    const pressed = control.getAttribute && control.getAttribute("aria-pressed");
    if (pressed === "true" || pressed === "false") return pressed === "true";
    const controlledId = control.getAttribute && control.getAttribute("aria-controls");
    if (controlledId) {
      const panel = document.getElementById(controlledId);
      if (panel) return isUiElementVisible(panel);
    }
    return null;
  }

  function isScrollable(element) {
    return element && (
      Number(element.scrollHeight) > Number(element.clientHeight) + 1 ||
      Number(element.scrollWidth) > Number(element.clientWidth) + 1
    );
  }

  function findScrollContainer(element) {
    for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
      if (isScrollable(ancestor)) return ancestor;
    }
    if (element && element.querySelectorAll) {
      return Array.from(element.querySelectorAll("*")).find(isScrollable) || null;
    }
    return null;
  }

  function controlAppUI(args) {
    const action = String(args.action || "").toLowerCase();
    const target = String(args.target || "").trim();
    const allowedActions = ["click", "open", "close", "toggle", "set_value", "scroll"];
    if (!allowedActions.includes(action)) return `Unsupported UI action "${action}".`;
    if (!target) return "Name the UI control or area to operate.";

    if (action === "scroll") {
      const normalizedTarget = normalizeUiTarget(target);
      let scrollElement = null;
      if (["page", "screen", "app"].includes(normalizedTarget)) {
        scrollElement = document.scrollingElement || document.documentElement || document.body;
      } else {
        for (const alias of UI_SCROLL_ALIASES) {
          if (alias.terms.some(term => normalizedTarget === term || normalizedTarget.includes(term))) {
            scrollElement = document.querySelector(alias.selector);
            if (scrollElement) break;
          }
        }
        if (!scrollElement) {
          const result = resolveUiTarget(target, "scroll");
          if (result.error) return result.error;
          scrollElement = findScrollContainer(result.element);
        }
      }
      if (!isScrollable(scrollElement)) {
        return `The "${target}" area has no scrollable content right now.`;
      }
      const direction = ["up", "down", "left", "right"].includes(args.direction)
        ? args.direction
        : "down";
      const requestedAmount = args.amount == null ? NaN : Number(args.amount);
      const amount = Number.isFinite(requestedAmount)
        ? Math.max(1, Math.min(2000, Math.round(Math.abs(requestedAmount))))
        : 400;
      const needsHorizontalScroll = direction === "left" || direction === "right";
      const canScroll = needsHorizontalScroll
        ? Number(scrollElement.scrollWidth) > Number(scrollElement.clientWidth) + 1
        : Number(scrollElement.scrollHeight) > Number(scrollElement.clientHeight) + 1;
      if (!canScroll) {
        return `The "${target}" area cannot scroll ${direction} right now.`;
      }
      if (direction === "up") scrollElement.scrollTop = Math.max(0, scrollElement.scrollTop - amount);
      if (direction === "down") scrollElement.scrollTop = Math.min(scrollElement.scrollHeight - scrollElement.clientHeight, scrollElement.scrollTop + amount);
      if (direction === "left") scrollElement.scrollLeft = Math.max(0, scrollElement.scrollLeft - amount);
      if (direction === "right") scrollElement.scrollLeft = Math.min(scrollElement.scrollWidth - scrollElement.clientWidth, scrollElement.scrollLeft + amount);
      return `Scrolled "${target}" ${direction} by ${amount}px.`;
    }

    const result = resolveUiTarget(target, action);
    if (result.error) return result.error;
    const element = getAssociatedControl(result.element);
    if (!element) return `Could not resolve a control for "${target}".`;
    const label = getUiElementLabels(result.element).find(Boolean) ||
      getUiElementLabels(element).find(Boolean) || target;
    if (element.disabled) return `"${label}" is disabled and was not changed.`;

    if (action === "click" || action === "toggle") {
      element.click();
      return `Clicked "${label}".`;
    }

    if (action === "open" || action === "close") {
      const desiredState = action === "open";
      const currentState = getUiOpenState(element);
      if (currentState === null) {
        return `Cannot determine whether "${label}" is open or closed. Target a drawer toggle or a control with an expanded state.`;
      }
      if (currentState !== desiredState) element.click();
      return `${currentState === desiredState ? "Already" : "Now"} ${action === "open" ? "open" : "closed"}: "${label}".`;
    }

    if (action === "set_value") {
      const boolValue = parseUiBoolean(args.value);
      if (element.type === "checkbox" || element.getAttribute("role") === "switch") {
        if (boolValue === null) return `Use true/false or on/off to set "${label}".`;
        if (!setUiChecked(element, boolValue)) {
          return `Could not set "${label}" because it does not expose a controllable on/off state.`;
        }
        return `Set "${label}" ${boolValue ? "on" : "off"}.`;
      }
      if (element.type === "radio") {
        if (boolValue === null) return `Use true/false or on/off to set "${label}".`;
        if (!boolValue && element.checked) {
          return `"${label}" is selected and cannot be unchecked without selecting another option.`;
        }
        if (boolValue && !element.checked) element.click();
        return `${boolValue ? "Selected" : "Already off"}: "${label}".`;
      }
      const valueControl = element.tagName === "SELECT" ||
        element.tagName === "TEXTAREA" ||
        (element.tagName === "INPUT" && [
          "text", "search", "email", "url", "tel", "password",
          "number", "range", "date", "datetime-local", "time",
          "month", "week", "color"
        ].includes(element.type));
      if (!valueControl) return `"${label}" is not a value control.`;

      const value = String(args.value ?? "");
      if (element.tagName === "SELECT" && element.options) {
        const normalizedValue = normalizeUiText(value);
        const option = Array.from(element.options).find(candidate =>
          candidate.value === value ||
          normalizeUiText(candidate.textContent) === normalizedValue
        );
        if (!option) return `No option matching "${value}" exists for "${label}".`;
        element.value = option.value;
      } else if (element.type === "range" || element.type === "number") {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) return `"${value}" is not a number for "${label}".`;
        const minimum = typeof element.min === "string" && element.min !== ""
          ? Number(element.min)
          : null;
        const maximum = typeof element.max === "string" && element.max !== ""
          ? Number(element.max)
          : null;
        if ((minimum !== null && numericValue < minimum) ||
            (maximum !== null && numericValue > maximum)) {
          return `"${value}" is outside the allowed range for "${label}".`;
        }
        const step = element.step === "any" ? null : Number(element.step || 1);
        const stepBase = minimum === null ? 0 : minimum;
        if (step && Number.isFinite(step) &&
            Math.abs((numericValue - stepBase) / step - Math.round((numericValue - stepBase) / step)) > 1e-7) {
          return `"${value}" does not match the allowed step for "${label}".`;
        }
        element.value = value;
      } else {
        element.value = value;
      }
      dispatchUiInputEvents(element);
      return `Set "${label}" to ${element.value}.`;
    }

    return `UI action "${action}" was not completed.`;
  }

  /**
   * Executes a Gemini function call by bridging to the EventBus.
   * Returns a plain-text result string fed back to Gemini as the tool response.
   *
   * @param {string} name - Function name
   * @param {object} args - Parsed function arguments
   * @returns {Promise<string>} Result description for Gemini to interpret
   */
  function executeTool(name, args, signal) {
    return new Promise((resolve) => {
      const toolStartedAt = Date.now();
      logDiagnostic(`Starting tool: ${name}.`);

      if (signal && signal.aborted) {
        logDiagnostic(`Tool ${name} cancelled before execution.`, "warning");
        resolve("Request cancelled.");
        return;
      }

      if (name === "control_app_ui") {
        const result = controlAppUI(args || {});
        const succeeded = /^(Clicked |Set |Scrolled |Now open:|Now closed:|Already open:|Already closed:)/.test(result);
        logDiagnostic(
          succeeded ? `UI control completed: ${result}` : `UI control was not completed: ${result}`,
          succeeded ? "success" : "warning"
        );
        resolve(result);
        return;
      }

      if (name === "show_landing_site" || name === "mark_site_on_map") {
        const site = resolveSite(args.name, args.lat, args.lon);
        if (!site) {
          logDiagnostic(`Could not resolve site "${args.name}" without coordinates.`, "error");
          resolve(`I could not resolve "${args.name}". Provide a recognized site name or both latitude and longitude.`);
          return;
        }
        if (!window.eventBus) {
          logDiagnostic("Cannot focus the requested site: EventBus is unavailable.", "error");
          resolve("The site was resolved, but map and globe controls are unavailable because EventBus is not loaded.");
          return;
        }

        const detailTab = args.detail_tab || "horizon";
        window.eventBus.emit("site:marked", {
          name: site.name,
          lat: site.lat,
          lon: site.lon,
          source: "dr-raj",
          focus: true,
          openDetails: true,
          detailTab
        });
        const profileSummary = getSiteProfileSummary(site);
        logDiagnostic(`Focused ${site.name} at ${site.lat.toFixed(2)}°, ${site.lon.toFixed(2)}°.`, "success");
        resolve(
          `Issued 3D camera focus and pin request for ${site.name} at ${site.lat.toFixed(2)}° latitude, ${site.lon.toFixed(2)}° longitude, and requested the ${detailTab} card detail. ${profileSummary}`
        );
        return;
      }

      if (name === "compare_sites") {
        const siteA = resolveSite(args.site_a);
        const siteB = resolveSite(args.site_b);
        if (!siteA || !siteB) {
          logDiagnostic("Could not resolve both sites for comparison.", "error");
          resolve("I could not resolve both site names. Use canonical site names or aliases from the mission catalog.");
          return;
        }
        if (normalizeSiteName(siteA.name) === normalizeSiteName(siteB.name)) {
          resolve("Select two different sites for comparison.");
          return;
        }
        if (!window.eventBus) {
          logDiagnostic("Cannot compare sites: EventBus is unavailable.", "error");
          resolve("The sites were resolved, but comparison controls are unavailable because EventBus is not loaded.");
          return;
        }

        const markedSite = (site, focus) => ({
          name: site.name,
          lat: site.lat,
          lon: site.lon,
          source: "dr-raj",
          focus,
          openDetails: false
        });
        window.eventBus.emit("site:marked", markedSite(siteA, false));
        window.eventBus.emit("site:marked", markedSite(siteB, false));
        window.eventBus.emit("cards:compare", {
          siteA: { name: siteA.name, lat: siteA.lat, lon: siteA.lon },
          siteB: { name: siteB.name, lat: siteB.lat, lon: siteB.lon }
        });

        const dateNote = args.date ? ` Requested comparison date: ${args.date}; no date-specific calculation was returned.` : "";
        const comparison = [
          getSiteProfileSummary(siteA),
          getSiteProfileSummary(siteB)
        ].join(" ");
        logDiagnostic(`Requested card comparison: ${siteA.name} vs ${siteB.name}.`, "success");
        resolve(`Issued a side-by-side card comparison request for ${siteA.name} (${siteA.lat.toFixed(2)}°, ${siteA.lon.toFixed(2)}°) and ${siteB.name} (${siteB.lat.toFixed(2)}°, ${siteB.lon.toFixed(2)}°). ${comparison}${dateNote}`);
        return;
      }

      if (name === "compare_marked_sites") {
        const cards = window.ComparisonCards;
        if (!cards || typeof cards.compareCurrentSites !== "function") {
          logDiagnostic("Cannot compare marked candidates: the Compare action is unavailable.", "error");
          resolve("The application's Compare action is unavailable, so I could not rank the marked candidates.");
          return;
        }

        Promise.resolve(cards.compareCurrentSites()).then(comparison => {
          if (!comparison || comparison.error) {
            const message = comparison && comparison.error
              ? comparison.error
              : "The Compare action returned no ranking.";
            logDiagnostic(`Marked candidate comparison failed: ${message}`, "warning");
            resolve(message);
            return;
          }
          if (!Array.isArray(comparison.ranked)) {
            logDiagnostic("Marked candidate comparison returned an invalid ranking.", "error");
            resolve("The Compare action completed without a usable ranking.");
            return;
          }

          const ranking = comparison.ranked.map((site, index) => {
            const slope = Number.isFinite(site.slope)
              ? `${site.slope.toFixed(1)}° (${site.slopeStatus})`
              : `not evaluated (${site.slopeStatus})`;
            const solarAndEarth = site.available
              ? `sunlit ${site.sunlitPercent.toFixed(1)}% (${site.sunlitHours.toFixed(1)} h), Earth-visible ${site.earthVisiblePercent.toFixed(1)}% (${site.earthVisibleHours.toFixed(1)} h), maximum Sun elevation ${site.maxSunElevation === null ? "unavailable" : `${site.maxSunElevation.toFixed(2)}°`}`
              : "time-window telemetry unavailable";
            return `${index + 1}. ${site.siteName}: slope ${slope}; ${solarAndEarth}`;
          }).join(" ");
          logDiagnostic(`Compared and ranked ${comparison.ranked.length} marked candidates using the Compare button.`, "success");
          resolve(
            `Ran the Compare button for ${comparison.start} to ${comparison.end} UTC. Ranked best-first by slope class, then sunlit time and Earth visibility: ${ranking} Roughness, landing dispersion, and touchdown velocity are not assessed.`
          );
        }).catch(error => {
          logDiagnostic(`Marked candidate comparison failed: ${error.message}`, "error");
          resolve(`The marked candidate comparison failed: ${error.message}`);
        });
        return;
      }

      if (name === "dismiss_candidate_card") {
        const cards = window.ComparisonCards;
        if (!cards || typeof cards.dismissSiteCard !== "function") {
          logDiagnostic("Cannot remove candidate card: comparison-card controls are unavailable.", "error");
          resolve("The comparison-card controls are unavailable, so no card was removed.");
          return;
        }
        const result = cards.dismissSiteCard(args && args.target);
        if (!result || result.error) {
          const message = result && result.error
            ? result.error
            : "No candidate card was removed.";
          logDiagnostic(`Candidate card dismissal was not completed: ${message}`, "warning");
          resolve(message);
          return;
        }
        logDiagnostic(`Removed candidate card "${result.siteName}".`, "success");
        resolve(`Removed only the "${result.siteName}" candidate card. The comparison-card drawer remains open, and the card can be restored with Undo.`);
        return;
      }

      if (name === "set_timeline_range") {
        if (window.eventBus) {
          window.eventBus.emit("timeline:jump", { isoString: args.date });
        }
        logDiagnostic(`Tool ${name} completed in ${formatDuration(Date.now() - toolStartedAt)}.`, "success");
        resolve(`Timeline moved to ${args.date}.`);
        return;
      }

      if (name === "find_best_landing_site") {
        if (!window.eventBus) {
          logDiagnostic("Cannot run find_best_landing_site: EventBus is unavailable.", "error");
          resolve("Algorithm unavailable: EventBus not loaded.");
          return;
        }
        const scoringListeners = window.eventBus.listeners &&
          window.eventBus.listeners["algorithm:find_best_site"];
        if (!Array.isArray(scoringListeners) || scoringListeners.length === 0) {
          logDiagnostic("No application handler is registered for landing-site scoring.", "error");
          resolve("The app has no automated landing-site scoring handler connected, so I cannot return a date-window best-site result. I can compare the currently marked candidate pins instead.");
          return;
        }

        let settled = false;
        let timeoutId;
        let unsubscribe = () => {};
        const cleanup = () => {
          clearTimeout(timeoutId);
          unsubscribe();
          if (signal) signal.removeEventListener("abort", onAbort);
        };
        const finish = (result, level = "success", outcome = "completed") => {
          if (settled) return;
          settled = true;
          cleanup();
          logDiagnostic(`Tool ${name} ${outcome} in ${formatDuration(Date.now() - toolStartedAt)}.`, level);
          resolve(result);
        };
        const onAbort = () => finish("Request cancelled.", "warning", "cancelled by operator");

        unsubscribe = window.eventBus.on("algorithm:result", (data) => {
          if (settled) return;
          const result = `Best site: ${data.site} (${data.lat}° lat, ${data.lon}° lon). ` +
            `Overall score: ${data.score}/100. ` +
            `Solar coverage: ${data.solarPct}%. ` +
            `DTE comms: ${data.dtePct}%. ` +
            `Slope: ${data.slopeAngle}°. ` +
            `Reason: ${data.reason}`;

          finish(result);

          // Also pin it on the map automatically
          window.eventBus.emit("site:marked", {
            name: data.site,
            lat:  data.lat,
            lon:  data.lon,
            source: "dr-raj-algorithm"
          });
        });

        if (signal) {
          signal.addEventListener("abort", onAbort, { once: true });
          if (signal.aborted) {
            onAbort();
            return;
          }
        }

        // Timeout fallback if algorithm doesn't respond in 8s
        timeoutId = setTimeout(() => {
          finish(
            "No landing-site scoring result arrived within 8.0 seconds. The app did not return a date-window recommendation.",
            "warning",
            "timed out after 8.0s"
          );
        }, 8000);

        // Fire the algorithm request
        logDiagnostic(`Waiting for algorithm:result (8.0s timeout).`);
        window.eventBus.emit("algorithm:find_best_site", {
          startDate: args.start_date,
          endDate:   args.end_date,
          criteria:  args.criteria || ["solar", "dte", "slope"]
        });

        return;
      }

      resolve("Unknown tool.");
    });
  }

  // ---------------------------------------------------------------------------
  // 6. GEMINI API CALL (with multi-turn history + tool support)
  // ---------------------------------------------------------------------------

  /**
   * Sends the full conversation history to Gemini and handles both
   * plain text responses and function call responses.
   *
   * @param {string} userMessage - The latest user input
   * @param {Function} onChunk   - Called with each text token as it arrives
   * @param {Function} onDone    - Called when the full response is complete
   */
  async function callGemini(userMessage, onChunk, onDone, signal) {
    if (signal && signal.aborted) {
      logDiagnostic("Request cancelled before reaching Gemini.", "warning");
      onDone("⏹ Response stopped.");
      return;
    }

    const key = getApiKey();
    if (!key) {
      const warning = "⚠️ No Gemini API key set. Open Dr. Raj test.html to configure.";
      console.warn(`[DrRaj] ${warning}`);
      logDiagnostic("No API key is configured; Gemini was not contacted.", "error");
      onDone(warning);
      return;
    }

    // Append the new user turn to history
    if (userMessage) {
      conversationHistory.push({
        role: "user",
        parts: [{ text: userMessage }]
      });
    }

    const payload = {
      system_instruction: {
        parts: [{
          text: drRajPersonalityEnabled ? DR_RAJ_PERSONALITY_PROMPT : SYSTEM_PROMPT
        }]
      },
      contents: conversationHistory,
      tools: TOOLS,
      generationConfig: {
        temperature: 0.75,
        maxOutputTokens: 512
      }
    };

    let resp = null;
    let lastErrorMsg = "";
    let activeModel = "";
    let modelRequestStartedAt = 0;

    try {
      // Attempt generation with automatic fallback across models on 503 / 429
      for (let modelIndex = 0; modelIndex < GEMINI_MODELS.length; modelIndex++) {
        const model = GEMINI_MODELS[modelIndex];
        if (signal && signal.aborted) {
          logDiagnostic("Request cancelled before the next model attempt.", "warning");
          onDone("⏹ Response stopped.");
          return;
        }

        activeModel = model;
        modelRequestStartedAt = Date.now();
        logDiagnostic(`Sending generateContent request to ${model}.`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": key
          },
          body: JSON.stringify(payload),
          signal
        });

        if (signal && signal.aborted) {
          logDiagnostic(`Request to ${model} was cancelled.`, "warning");
          onDone("⏹ Response stopped.");
          return;
        }

        logDiagnostic(
          `${model} returned HTTP ${resp.status} in ${formatDuration(Date.now() - modelRequestStartedAt)}.`,
          resp.ok ? "success" : "warning"
        );
        if (resp.ok) {
          break; // Succeeded!
        }

        const err = await resp.json().catch(() => ({}));
        if (signal && signal.aborted) {
          logDiagnostic(`Reading the ${model} error response was cancelled.`, "warning");
          onDone("⏹ Response stopped.");
          return;
        }
        lastErrorMsg = err?.error?.message || `HTTP ${resp.status}`;
        logDiagnostic(`${model} error: ${lastErrorMsg.slice(0, 240)}`, "warning");

        // If not a retryable transient error (e.g. 400 Bad Request or 401/403 Bad Key), stop immediately
        if (resp.status === 400 || resp.status === 401 || resp.status === 403) {
          console.error(`[DrRaj] ${model} failed (${resp.status}): ${lastErrorMsg}`);
          break;
        }
        const nextModel = GEMINI_MODELS[modelIndex + 1];
        if (nextModel) {
          console.warn(`[DrRaj] ${model} failed (${resp.status}): ${lastErrorMsg}. Trying ${nextModel}...`);
          logDiagnostic(`Falling back from ${model} to ${nextModel}.`, "warning");
        } else {
          console.error(`[DrRaj] ${model} failed (${resp.status}): ${lastErrorMsg}. No fallback model remains.`);
        }
      }

      if (signal && signal.aborted) {
        logDiagnostic("Gemini request cancelled.", "warning");
        onDone("⏹ Response stopped.");
        return;
      }

      if (!resp || !resp.ok) {
        logDiagnostic(`No model returned a response: ${lastErrorMsg.slice(0, 240)}`, "error");
        onDone(`❌ Gemini error: ${lastErrorMsg}`);
        return;
      }

      const data = await resp.json();
      if (signal && signal.aborted) {
        logDiagnostic(`Parsing the ${activeModel} response was cancelled.`, "warning");
        onDone("⏹ Response stopped.");
        return;
      }

      logDiagnostic(`Parsed response from ${activeModel}.`);
      const candidate = data?.candidates?.[0];
      const content   = candidate?.content;

      if (!content) {
        logDiagnostic(`${activeModel} returned no candidate content.`, "error");
        onDone("❌ Gemini returned no response. Retry when the service is available.");
        return;
      }

      // --- Check for function call ---
      const fnPart = content.parts?.find(p => p.functionCall);
      if (fnPart) {
        const { name, args } = fnPart.functionCall;

        logDiagnostic(`Gemini requested tool ${name}.`);
        // Show a "thinking" indicator while tool runs
        onChunk(`⚙️ Running <em>${name.replace(/_/g, " ")}</em>…`);

        // Push the model's function-call turn to history
        conversationHistory.push({ role: "model", parts: content.parts });

        // Execute the tool
        const toolResult = await executeTool(name, args, signal);
        if (signal && signal.aborted) {
          logDiagnostic(`Follow-up request after ${name} was cancelled.`, "warning");
          onDone("⏹ Response stopped.");
          return;
        }

        // Push the tool result back into history
        conversationHistory.push({
          role: "user",
          parts: [{
            functionResponse: {
              name,
              response: { result: toolResult }
            }
          }]
        });

        // Re-call Gemini so it generates a natural language response
        await callGemini("", onChunk, onDone, signal);
        return;
      }

      // --- Plain text response ---
      const text = content.parts?.map(p => p.text || "").join("") || "";
      logDiagnostic(`${activeModel} returned a text response.`, "success");

      // Push model response to history
      conversationHistory.push({ role: "model", parts: [{ text }] });

      onDone(text);

    } catch (err) {
      if (signal && signal.aborted) {
        logDiagnostic(
          `Request to ${activeModel || "Gemini"} cancelled after ${modelRequestStartedAt ? formatDuration(Date.now() - modelRequestStartedAt) : "0.0s"}.`,
          "warning"
        );
        onDone("⏹ Response stopped.");
        return;
      }
      console.error("[DrRaj] Gemini fetch error:", err);
      logDiagnostic(
        `${activeModel || "Gemini"} network request failed after ${modelRequestStartedAt ? formatDuration(Date.now() - modelRequestStartedAt) : "0.0s"}: ${err.message}`,
        "error"
      );
      onDone(`❌ Network error: ${err.message}. Check connectivity or retry.`);
    }
  }

  // ---------------------------------------------------------------------------
  // 7. UI INITIALISATION
  // ---------------------------------------------------------------------------
  function initDrRaj() {
    const chatWindow   = document.getElementById("ai-chat-window");
    const bubbleBtn    = document.getElementById("ai-bubble-btn");
    const minimizeBtn  = document.getElementById("ai-minimize-btn");
    const form         = document.getElementById("ai-input-form");
    const inputField   = document.getElementById("ai-input-text");
    const msgContainer = document.getElementById("ai-messages-container");
    const chips        = document.querySelectorAll(".chip-btn");
    const notifDot     = document.getElementById("ai-notification-dot");
    const statusDot    = document.querySelector(".status-indicator");
    const sendBtn      = document.getElementById("ai-send-btn");
    const personalityToggle = document.getElementById("ai-personality-toggle");
    const personalityMode = document.getElementById("ai-personality-mode");
    const diagnosticsPanel = document.getElementById("ai-diagnostics");
    const diagnosticsStatus = document.getElementById("ai-diagnostics-status");
    const diagnosticsElapsed = document.getElementById("ai-diagnostics-elapsed");
    const diagnosticsLog = document.getElementById("ai-diagnostics-log");
    let diagnosticsTimer = null;

    diagnosticsWriter = (entry) => {
      if (!diagnosticsLog) return;
      const row = document.createElement("div");
      row.className = "ai-diagnostics-entry";
      row.dataset.level = entry.level;

      const timestamp = document.createElement("span");
      timestamp.className = "ai-diagnostics-time";
      timestamp.textContent = entry.timestamp.toLocaleTimeString();

      const elapsed = document.createElement("span");
      elapsed.className = "ai-diagnostics-duration";
      elapsed.textContent = entry.elapsed ? `+${entry.elapsed}` : "";

      const message = document.createElement("span");
      message.className = "ai-diagnostics-message";
      message.textContent = entry.message;

      row.append(timestamp, elapsed, message);
      diagnosticsLog.appendChild(row);
      while (diagnosticsLog.childElementCount > 100) {
        diagnosticsLog.firstElementChild.remove();
      }
      diagnosticsLog.scrollTop = diagnosticsLog.scrollHeight;
    };

    function updateDiagnosticsElapsed() {
      if (diagnosticsStartedAt !== null && diagnosticsElapsed) {
        diagnosticsElapsed.textContent = formatElapsed(Date.now() - diagnosticsStartedAt);
      }
    }

    function startDiagnostics() {
      diagnosticsStartedAt = Date.now();
      if (diagnosticsPanel) diagnosticsPanel.open = true;
      if (diagnosticsStatus) diagnosticsStatus.textContent = "Running";
      updateDiagnosticsElapsed();
      clearInterval(diagnosticsTimer);
      diagnosticsTimer = setInterval(updateDiagnosticsElapsed, 1000);
    }

    function finishDiagnostics(status, message, level) {
      logDiagnostic(message, level);
      clearInterval(diagnosticsTimer);
      diagnosticsTimer = null;
      updateDiagnosticsElapsed();
      if (diagnosticsStatus) diagnosticsStatus.textContent = status;
      diagnosticsStartedAt = null;
    }

    // Reflect key presence in the status dot colour on load
    function refreshStatusDot() {
      if (!statusDot) return;
      const hasKey = !!getApiKey();
      statusDot.style.background = hasKey ? "var(--accent-sage, #729676)" : "#b8544f";
      statusDot.title = hasKey ? "Gemini API connected" : "No API key — open test.html to configure";
    }
    refreshStatusDot();

    // Re-read key if it changes in another tab
    window.addEventListener("storage", (e) => {
      if (e.key === LS_KEY) refreshStatusDot();
    });

    // --- Open / Close helpers ---
    function isChatOpen() {
      return chatWindow && chatWindow.style.display !== "none";
    }
    function syncFloatingBubbleState() {
      if (!bubbleBtn) return;
      const open = isChatOpen();
      bubbleBtn.hidden = open;
      bubbleBtn.setAttribute("aria-expanded", String(open));
      bubbleBtn.setAttribute("aria-label", open ? "Close Dr. Raj mission analyst" : "Open Dr. Raj mission analyst");
      bubbleBtn.title = open ? "Close Dr. Raj mission analyst" : "Open Dr. Raj mission analyst";
    }
    function openChat() {
      if (!chatWindow) return;
      chatWindow.style.display = "flex";
      syncFloatingBubbleState();
      const cb = document.getElementById("toggle-ai-chat");
      if (cb && !cb.checked) cb.checked = true;
      if (inputField) inputField.focus();
    }
    function closeChat() {
      if (!chatWindow) return;
      chatWindow.style.display = "none";
      syncFloatingBubbleState();
      const cb = document.getElementById("toggle-ai-chat");
      if (cb && cb.checked) cb.checked = false;
    }

    syncFloatingBubbleState();
    if (bubbleBtn) bubbleBtn.addEventListener("click", () => {
      if (isChatOpen()) {
        closeChat();
      } else {
        openChat();
      }
    });
    const toggleCheckbox = document.getElementById("toggle-ai-chat");
    if (toggleCheckbox) {
      toggleCheckbox.addEventListener("change", () => {
        toggleCheckbox.checked ? openChat() : closeChat();
      });
    }
    if (minimizeBtn) minimizeBtn.addEventListener("click", closeChat);

    // --- Message rendering ---
    function appendMessage(sender, html, { isStreaming = false } = {}) {
      if (!msgContainer) return null;

      const msgDiv  = document.createElement("div");
      msgDiv.className = `ai-msg msg-${sender}`;

      const bubble  = document.createElement("div");
      bubble.className = "msg-bubble";
      bubble.innerHTML = html;

      const timeEl  = document.createElement("div");
      timeEl.className = "msg-time";
      const now = new Date();
      timeEl.textContent = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")} UTC`;

      msgDiv.appendChild(bubble);
      msgDiv.appendChild(timeEl);
      msgContainer.appendChild(msgDiv);
      msgContainer.scrollTop = msgContainer.scrollHeight;

      // Wire up embedded site-link clicks
      bubble.querySelectorAll(".ai-site-link").forEach(link => {
        link.addEventListener("click", () => {
          const siteId = link.dataset.siteId;
          if (siteId && window.eventBus) {
            window.eventBus.emit("site:select", { id: siteId });
          }
        });
      });

      return bubble; // Return bubble so caller can update it (streaming)
    }

    function setInputLocked(locked) {
      if (inputField) inputField.disabled = locked;
      if (sendBtn) {
        sendBtn.classList.toggle("ai-send-btn-stopping", locked);
        sendBtn.title = locked ? "Stop response" : "Send Query";
        sendBtn.setAttribute("aria-label", locked ? "Stop response" : "Send Query");
      }
      if (personalityToggle) personalityToggle.disabled = locked;
    }

    function updatePersonalityToggle() {
      if (!personalityToggle) return;
      const mode = drRajPersonalityEnabled ? "On" : "Off";
      personalityToggle.setAttribute("aria-checked", String(drRajPersonalityEnabled));
      personalityToggle.setAttribute("aria-label", `Dr. Raj personality ${mode}`);
      personalityToggle.title = `Dr. Raj personality: ${mode}`;
      if (personalityMode) personalityMode.textContent = mode;
    }

    updatePersonalityToggle();

    if (personalityToggle) {
      personalityToggle.addEventListener("click", () => {
        if (activeRequestController) return;
        drRajPersonalityEnabled = !drRajPersonalityEnabled;
        localStorage.setItem(PERSONALITY_LS_KEY, String(drRajPersonalityEnabled));
        conversationHistory = [];
        updatePersonalityToggle();
        const styleName = drRajPersonalityEnabled ? "Dr. Raj personality" : "mission-operations personality";
        logDiagnostic(`Switched to ${styleName}; conversation context reset.`);
        appendMessage(
          "assistant",
          `${styleName} enabled. Conversation context was reset for the selected style.`
        );
      });
    }

    // --- Core send flow ---
    function handleSend(queryText) {
      if (activeRequestController) return;
      const text = (queryText || (inputField ? inputField.value.trim() : ""));
      if (!text) return;

      appendMessage("user", escapeHtml(text));
      if (inputField) inputField.value = "";
      const requestController = new AbortController();
      const historyStart = conversationHistory.length;
      activeRequestController = requestController;
      startDiagnostics();
      logDiagnostic("Operator request started.");
      setInputLocked(true);

      // Typing indicator bubble
      const thinkingBubble = appendMessage("assistant", "<em>Dr. Raj is thinking…</em>", { isStreaming: true });

      callGemini(
        text,
        // onChunk — update the existing bubble (tool status updates)
        (chunk) => {
          if (thinkingBubble) thinkingBubble.innerHTML = chunk;
          if (msgContainer) msgContainer.scrollTop = msgContainer.scrollHeight;
        },
        // onDone — replace bubble with final response
        (finalText) => {
          if (activeRequestController !== requestController) return;
          const stopped = requestController.signal.aborted;
          const failed = finalText.startsWith("❌") || finalText.startsWith("⚠️");
          finishDiagnostics(
            stopped ? "Stopped" : failed ? "Failed" : "Completed",
            stopped ? "Request stopped by operator." : failed ? "Request finished with an error." : "Request completed.",
            stopped || failed ? "warning" : "success"
          );
          if (requestController.signal.aborted) {
            conversationHistory.length = historyStart;
          }
          activeRequestController = null;
          if (thinkingBubble) thinkingBubble.innerHTML = finalText;
          if (msgContainer) msgContainer.scrollTop = msgContainer.scrollHeight;
          setInputLocked(false);
          if (inputField) inputField.focus();
        },
        requestController.signal
      );
    }

    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (activeRequestController) {
          activeRequestController.abort();
          return;
        }
        handleSend();
      });
    }

    chips.forEach(chip => {
      chip.addEventListener("click", () => {
        const q = chip.dataset.query;
        if (q) handleSend(q);
      });
    });

    // --- EventBus integrations ---
    if (window.eventBus) {
      window.eventBus.on("ai:toggle", () => {
        isChatOpen() ? closeChat() : openChat();
      });

      // Auto-brief when a site is selected on the map/globe
      window.eventBus.on("site:selected", (data) => {
        const selectedSite = data || {};
        const siteId = selectedSite.siteId || selectedSite.id || "unknown";
        const siteName = selectedSite.name || siteId;
        let siteEvidence = "";

        if (window.LunarPhysics &&
            Number.isFinite(selectedSite.lat) &&
            Number.isFinite(selectedSite.lon)) {
          const raw = window.LunarPhysics.findSite(selectedSite);
          if (raw) {
            const metrics = [];
            if (raw.coordinates && Number.isFinite(raw.coordinates.elevation_m)) {
              metrics.push(`elevation ${raw.coordinates.elevation_m.toLocaleString()} m`);
            }
            if (raw.terrain && Number.isFinite(raw.terrain.slope_touchdown_deg)) {
              metrics.push(`touchdown slope ${raw.terrain.slope_touchdown_deg}° (${raw.terrain.slope_status || "status unavailable"})`);
            }
            if (raw.summary_metrics && Number.isFinite(raw.summary_metrics.daylight_pct)) {
              metrics.push(`daylight ${Math.round(raw.summary_metrics.daylight_pct)}%`);
            }
            if (raw.summary_metrics && Number.isFinite(raw.summary_metrics.rf_margin_db)) {
              metrics.push(`DTE margin ${raw.summary_metrics.rf_margin_db} dB`);
            }
            siteEvidence = metrics.length
              ? ` Local LunarPhysics catalog data for ${raw.name}: ${metrics.join(", ")}. Verify these values against mission-approved data.`
              : ` A LunarPhysics profile for ${raw.name} was found, but it contains no summary metrics.`;
          }
        }

        const context = `The operator selected "${siteName}" on the map (ID: ${siteId}). Provide a concise tactical brief on illumination, DTE communications, and terrain hazards using only available evidence.${siteEvidence || " No coordinates or telemetry profile were provided; state the limitation rather than inventing measurements."}`;

        if (notifDot) notifDot.style.display = "none";
        openChat();
        handleSend(context);
      });

      // Listen for external key updates (e.g. set by test.html in same tab)
      window.eventBus.on("settings:gemini_key_changed", () => {
        refreshStatusDot();
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 8. UTILITY
  // ---------------------------------------------------------------------------
  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Safe DOM-ready init
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDrRaj);
  } else {
    initDrRaj();
  }

})();
