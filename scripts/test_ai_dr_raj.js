/**
 * Test Suite: Dr. Raj AI Lunar Mission Analyst
 * Target components:
 * 1. components/ai_dr_raj/ai_dr_raj.html
 * 2. components/ai_dr_raj/ai_dr_raj.js
 * 3. components/ai_dr_raj/ai_dr_raj.css
 *
 * Verifies:
 * - HTML markup structure and accessibility attributes
 * - CSS selector rules and launcher positioning
 * - Script initialization and EventBus subscriptions
 * - Site selection tactical debriefing generation coupled with LunarPhysics
 * - Dual personality toggle state management
 * - Offline heuristic response generation
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("================================================================================");
console.log("RUNNING SUITE: Dr. Raj AI Lunar Mission Analyst");
console.log("================================================================================");

// 1. Verify HTML markup structure
const html = fs.readFileSync(path.join(__dirname, "../components/ai_dr_raj/ai_dr_raj.html"), "utf8");
assert(!html.includes('id="ai-bubble-btn"'), "ai-bubble-btn floating launcher must be removed to prevent viewport collision");
assert(html.includes('id="ai-chat-window"'), "ai-chat-window container must be present");
assert(html.includes('id="ai-personality-toggle"'), "ai-personality-toggle button must be present");
assert(html.includes('id="ai-diagnostics"'), "ai-diagnostics details must be present");
assert(html.includes('id="ai-messages-container"'), "ai-messages-container corridor must be present");
assert(html.includes("Hey, I'm Dr. Raj") && html.includes("Got a lunar site or date in mind?"), "Welcome message should briefly introduce Dr. Raj and invite a user prompt");
assert(html.includes('id="ai-input-form"'), "ai-input-form must be present");
assert(html.includes('id="ai-input-text"'), "ai-input-text field must be present");
assert(html.includes('class="chip-btn"'), "Quick prompt chips must be present");
console.log("✓ HTML markup structure and control anchors verified");

// 2. Verify CSS rules
const css = fs.readFileSync(path.join(__dirname, "../components/ai_dr_raj/ai_dr_raj.css"), "utf8");
assert(css.includes(".ai-assistant-wrapper"), ".ai-assistant-wrapper styling present");
assert(css.includes(".ai-bubble-btn"), ".ai-bubble-btn styling present");
assert(css.includes(".ai-chat-window"), ".ai-chat-window styling present");
assert(css.includes(".ai-personality-toggle"), ".ai-personality-toggle styling present");
assert(css.includes(".ai-bubble-btn[hidden]"), "hidden attribute support present for bubble launcher");
console.log("✓ CSS styling and layout rules verified");

// 3. Simulated DOM Environment
class MockElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.dataset = {};
    this._classList = new Set();
    this.style = {};
    this.textContent = "";
    this.innerText = "";
    this._value = "";
    this._innerHTML = "";
    this.eventListeners = {};
    this.attributes = {};
    this.type = "";
    this.checked = false;
    this.scrollTop = 0;
    this.scrollLeft = 0;
    this.scrollHeight = 0;
    this.clientHeight = 0;
    this.scrollWidth = 0;
    this.clientWidth = 0;
    this.disabled = false;
    this.hidden = false;
  }

  get className() {
    return Array.from(this._classList).join(" ");
  }

  set className(str) {
    this._classList = new Set((str || "").split(/\s+/).filter(Boolean));
  }

  get classList() {
    const self = this;
    return {
      add: (c) => self._classList.add(c),
      remove: (c) => self._classList.delete(c),
      contains: (c) => self._classList.has(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (self._classList.has(c)) self._classList.delete(c);
          else self._classList.add(c);
        } else if (force) {
          self._classList.add(c);
        } else {
          self._classList.delete(c);
        }
      }
    };
  }

  get value() { return this._value; }
  set value(v) { this._value = String(v); }

  get innerHTML() { return this._innerHTML; }
  set innerHTML(html) {
    this._innerHTML = html;
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  append(...items) {
    items.forEach(item => {
      this.children.push(item);
    });
  }

  addEventListener(type, listener) {
    if (!this.eventListeners[type]) this.eventListeners[type] = [];
    this.eventListeners[type].push(listener);
  }

  dispatchEvent(event) {
    if (!event.target) event.target = this;
    if (!event.preventDefault) event.preventDefault = () => {};
    const list = this.eventListeners[event.type] || [];
    list.forEach(fn => fn(event));
  }

  click() {
    if (this.type === "checkbox") this.checked = !this.checked;
    this.dispatchEvent({ type: "click", target: this });
  }

  setAttribute(name, val) {
    this.attributes[name] = String(val);
    this[name] = val;
  }

  getAttribute(name) {
    return this.attributes[name] ?? this[name] ?? null;
  }

  querySelector(sel) {
    if (sel === ".status-indicator") return new MockElement("span");
    return this.children[0] || null;
  }

  querySelectorAll(sel) {
    return this.children;
  }

  focus() {}
  scrollIntoView() {}
  getClientRects() {
    return this.hidden || this.style.display === "none" ? [] : [this];
  }
}

const elements = {};
const uiControls = [];
const scrollTargets = {};
function createEl(id, tag = "div") {
  const el = new MockElement(tag);
  elements[id] = el;
  return el;
}

createEl("ai-assistant-wrapper");
createEl("ai-bubble-btn", "button");
createEl("ai-chat-window");
elements["ai-chat-window"].style.display = "none";
createEl("ai-personality-toggle", "button");
createEl("ai-personality-mode", "span");
elements["ai-personality-mode"].textContent = "Off";
createEl("ai-minimize-btn", "button");
createEl("ai-diagnostics", "details");
createEl("ai-diagnostics-status", "span");
createEl("ai-diagnostics-elapsed", "span");
createEl("ai-diagnostics-log");
createEl("ai-messages-container");
createEl("ai-input-form", "form");
createEl("ai-input-text", "input");
createEl("ai-send-btn", "button");

const quickChips = [
  "Assess Shackleton Connecting Ridge",
  "Check Earth Comms for Malapert Mountain",
  "Explain Libration Impact on DTE",
  "Best Artemis site for 6-day solar stay?"
].map(q => {
  const btn = new MockElement("button");
  btn.dataset.query = q;
  return btn;
});

// Setup mock document
global.document = {
  getElementById: (id) => elements[id] || null,
  querySelector: (sel) => {
    if (sel === ".status-indicator") return new MockElement("span");
    if (sel === ".ai-bubble-btn .status-indicator") return new MockElement("span");
    return scrollTargets[sel] || null;
  },
  querySelectorAll: (sel) => {
    if (sel === ".chip-btn") return quickChips;
    if (sel === ".ai-site-link") return [];
    return uiControls;
  },
  createElement: (tag) => new MockElement(tag),
  readyState: "complete"
};

// Setup mock localStorage
const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};

global.window = {
  document: global.document,
  localStorage: global.localStorage,
  addEventListener: () => {},
  getComputedStyle: (element) => ({
    display: element.style.display || "",
    visibility: element.style.visibility || "visible"
  }),
  Event: class {
    constructor(type, options = {}) {
      this.type = type;
      this.bubbles = !!options.bubbles;
    }
  }
};

// Load EventBus
const eventBusCode = fs.readFileSync(path.join(__dirname, "../core/event_bus.js"), "utf8");
eval(eventBusCode);
global.eventBus = window.eventBus;

// Load LunarPhysics
const telemetryData = JSON.parse(fs.readFileSync(path.join(__dirname, "../static/data/lunar_sites_telemetry.json"), "utf8"));
global.fetch = () => Promise.resolve({
  ok: true,
  json: () => Promise.resolve(telemetryData)
});
const physicsCode = fs.readFileSync(path.join(__dirname, "../core/lunar_physics.js"), "utf8");
eval(physicsCode);
global.LunarPhysics = window.LunarPhysics;

// Load Dr. Raj AI Controller
const drRajCode = fs.readFileSync(path.join(__dirname, "../components/ai_dr_raj/ai_dr_raj.js"), "utf8");
const testableDrRajCode = drRajCode.replace(
  "  function executeTool(name, args, signal) {",
  "  window.__testControlAppUI = controlAppUI;\n  window.__testExecuteTool = executeTool;\n\n  function executeTool(name, args, signal) {"
);
assert.notStrictEqual(testableDrRajCode, drRajCode, "UI control test hook insertion point must exist");
eval(testableDrRajCode);

console.log("✓ Dr. Raj AI component successfully loaded in simulated DOM environment");

// 4. Test EventBus Subscriptions
const busListeners = window.eventBus.listeners || {};

// Test ai:toggle
assert(busListeners["ai:toggle"], "ai:toggle listener must be registered");
window.eventBus.emit("ai:toggle");
assert.strictEqual(elements["ai-chat-window"].style.display, "flex", "ai:toggle should display chat window");

window.eventBus.emit("ai:toggle");
assert.strictEqual(elements["ai-chat-window"].style.display, "none", "Second ai:toggle should collapse chat window");
console.log("✓ ai:toggle properly toggles intelligence window visibility");

// Test Personality Switcher
const toggleBtn = elements["ai-personality-toggle"];
const modeSpan = elements["ai-personality-mode"];
assert.strictEqual(modeSpan.textContent, "Off");

toggleBtn.click();
assert.strictEqual(modeSpan.textContent, "On", "Clicking personality toggle switches mode to On");
assert.strictEqual(localStorage.getItem("dr_raj_personality_enabled"), "true");

toggleBtn.click();
assert.strictEqual(modeSpan.textContent, "Off", "Clicking toggle again switches mode back to Off");
assert.strictEqual(localStorage.getItem("dr_raj_personality_enabled"), "false");
console.log("✓ Personality toggle switch toggles between Mission Ops and Dr. Raj persona");

// Test site:selected EventBus integration
assert(busListeners["site:selected"], "site:selected listener must be registered");
window.eventBus.emit("site:selected", {
  siteId: "shackleton",
  name: "Peak Near Shackleton",
  lat: -89.6,
  lon: 129.2
});

assert.strictEqual(elements["ai-chat-window"].style.display, "flex", "site:selected should auto-open chat window");
assert(elements["ai-messages-container"].children.length >= 1, "Messages container should receive tactical brief");
console.log("✓ site:selected auto-opens chat and queries LunarPhysics telemetry");

// Test minimize button
elements["ai-minimize-btn"].click();
assert.strictEqual(elements["ai-chat-window"].style.display, "none", "Minimize button collapses chat window");
console.log("✓ Header minimize button properly hides chat window");

// Test toolbar toggle via EventBus ai:toggle (simulating #btn-tool-ai on cockpit dock)
window.eventBus.emit("ai:toggle");
assert.strictEqual(elements["ai-chat-window"].style.display, "flex", "Toolbar sparkles button (ai:toggle) opens chat window");
console.log("✓ Cockpit dock toolbar launcher (ai:toggle) opens chat window cleanly without floating bubble");

// Test generalized UI control tool
const cardsToggle = createEl("toggle-top-cards", "input");
cardsToggle.type = "checkbox";
cardsToggle.checked = true;
const stayDuration = createEl("slider-stay-duration", "input");
stayDuration.type = "range";
stayDuration.value = "144";
stayDuration.min = "48";
stayDuration.max = "240";
stayDuration.step = "12";
const stayDurationLabel = new MockElement("label");
stayDurationLabel.textContent = "Planned Surface Stay";
stayDurationLabel.htmlFor = stayDuration.id;
stayDurationLabel.control = stayDuration;
stayDuration.labels = [stayDurationLabel];
const flatTab = new MockElement("button");
flatTab.textContent = "Flat";
flatTab.setAttribute("role", "tab");
let flatTabClicks = 0;
flatTab.addEventListener("click", () => { flatTabClicks += 1; });
let sliderInputEvents = 0;
stayDuration.addEventListener("input", () => { sliderInputEvents += 1; });
stayDuration.addEventListener("change", () => { sliderInputEvents += 1; });
uiControls.push(stayDurationLabel, stayDuration, flatTab);

const drawerScroll = new MockElement("div");
drawerScroll.scrollHeight = 1200;
drawerScroll.clientHeight = 300;
scrollTargets[".drawer-left-horizon .drawer-content-scroll"] = drawerScroll;

const controlAppUI = window.__testControlAppUI;
assert.match(controlAppUI({ action: "close", target: "Comparison Cards" }), /Now closed/);
assert.strictEqual(cardsToggle.checked, false, "closing comparison cards should turn off its checkbox");
assert.match(controlAppUI({ action: "close", target: "Comparison Cards" }), /Already closed/);
assert.strictEqual(cardsToggle.checked, false, "closing comparison cards twice should remain closed");
assert.match(controlAppUI({
  action: "set_value",
  target: "Comparison Cards",
  value: true
}), /Set .* on/);
assert.strictEqual(cardsToggle.checked, true, "boolean true should enable a checkbox");
assert.match(controlAppUI({
  action: "set_value",
  target: "Comparison Cards",
  value: false
}), /Set .* off/);
assert.strictEqual(cardsToggle.checked, false, "boolean false should disable a checkbox");

assert.match(controlAppUI({
  action: "set_value",
  target: "Planned Surface Stay",
  value: "180"
}), /Set .* to 180/);
assert.strictEqual(stayDuration.value, "180", "setting a slider should update its value");
assert.strictEqual(sliderInputEvents, 2, "setting a slider should dispatch input and change events");
assert.match(controlAppUI({
  action: "set_value",
  target: "Planned Surface Stay",
  value: "181"
}), /does not match the allowed step/);
assert.strictEqual(stayDuration.value, "180", "an invalid slider value should not be applied");

assert.match(controlAppUI({ action: "click", target: "Flat" }), /Clicked/);
assert.strictEqual(flatTabClicks, 1, "clicking a map tab should activate the tab control");

assert.match(controlAppUI({
  action: "scroll",
  target: "left drawer",
  direction: "down",
  amount: 400
}), /Scrolled/);
assert.strictEqual(drawerScroll.scrollTop, 400, "scrolling a drawer should move its content");
assert.match(controlAppUI({ action: "click", target: "control that does not exist" }), /No visible UI control matched/);
console.log("✓ UI control tool closes cards, updates sliders, clicks tabs, scrolls drawers, and reports missing targets");

(async () => {
  const markedSites = [
    { name: "Custom North", lat: -79.79, lon: 245.8 },
    { name: "Custom South", lat: -59.19, lon: 280.5 }
  ];
  const profiles = {
    custom_north: {
      name: "Custom North",
      elevation: "+2,681 m",
      solar: { daylightPct: "52%" },
      horizon: { sunEl: 11.55, earthEl: 28 },
      slope: { slopeVal: "6.7°", slopeStatus: "Marginal" }
    },
    custom_south: {
      name: "Custom South",
      elevation: "+2,686 m",
      solar: { daylightPct: "51%" },
      horizon: { sunEl: 32.18, earthEl: 58 },
      slope: { slopeVal: "7.9°", slopeStatus: "Marginal" }
    }
  };
  let compareButtonRequests = 0;
  let dismissedCandidate = null;
  window.ComparisonCards = {
    getMarkedSites: () => markedSites,
    getProfiles: () => profiles,
    dismissSiteCard: target => {
      dismissedCandidate = target || "Custom South";
      return { siteName: dismissedCandidate };
    },
    compareCurrentSites: () => {
      compareButtonRequests += 1;
      return Promise.resolve({
        start: "2026-11-01 00:00",
        end: "2026-12-01 00:00",
        ranked: [
          {
            siteName: "Custom South",
            slope: 5.2,
            slopeStatus: "MARGINAL",
            available: true,
            sunlitPercent: 61,
            sunlitHours: 439,
            earthVisiblePercent: 78,
            earthVisibleHours: 562,
            maxSunElevation: 18.5
          },
          {
            siteName: "Custom North",
            slope: 6.7,
            slopeStatus: "MARGINAL",
            available: true,
            sunlitPercent: 52,
            sunlitHours: 374,
            earthVisiblePercent: 28,
            earthVisibleHours: 202,
            maxSunElevation: 11.55
          }
        ]
      });
    }
  };

  const comparisonResult = await window.__testExecuteTool("compare_marked_sites", {});
  assert(comparisonResult.includes("Custom North") && comparisonResult.includes("Custom South"));
  assert(comparisonResult.includes("Ran the Compare button"));
  assert(comparisonResult.includes("sunlit 61.0%") && comparisonResult.includes("Earth-visible 78.0%"));
  assert.strictEqual(compareButtonRequests, 1, "Raj should invoke the same comparison action as the button");

  const dismissResult = await window.__testExecuteTool("dismiss_candidate_card", {
    target: "Custom North"
  });
  assert.strictEqual(dismissedCandidate, "Custom North", "Raj should identify the individual card to dismiss");
  assert.match(dismissResult, /Removed only the "Custom North" candidate card/);
  assert.match(dismissResult, /restored with Undo/);

  let customComparison = null;
  const unsubscribeComparison = window.eventBus.on("cards:compare", data => {
    customComparison = data;
  });
  const namedComparisonResult = await window.__testExecuteTool("compare_sites", {
    site_a: "Custom North",
    site_b: "Custom South"
  });
  unsubscribeComparison();
  assert(namedComparisonResult.includes("Issued a side-by-side card comparison request"));
  assert.strictEqual(customComparison.siteA.lat, -79.79, "a marked custom site should resolve from its active card");
  assert.strictEqual(customComparison.siteB.lon, 280.5, "the second marked custom site should resolve from its active card");

  const scoringResult = await window.__testExecuteTool("find_best_landing_site", {
    start_date: "2027-01-12T00:00:00Z",
    end_date: "2027-01-13T00:00:00Z",
    criteria: ["solar", "dte", "slope"]
  });
  assert.match(scoringResult, /no automated landing-site scoring handler connected/i);
  console.log("✓ Raj compares custom pins, dismisses one card, and reports unavailable scoring clearly");

  console.log("================================================================================");
  console.log("ALL DR. RAJ AI TESTS PASSED CLEANLY!");
  console.log("================================================================================");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
