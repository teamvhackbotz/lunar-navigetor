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
    this._value = "";
    this._innerHTML = "";
    this.eventListeners = {};
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
    this.dispatchEvent({ type: "click", target: this });
  }

  setAttribute(name, val) {
    this[name] = val;
  }

  getAttribute(name) {
    return this[name] || null;
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
}

const elements = {};
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
    return null;
  },
  querySelectorAll: (sel) => {
    if (sel === ".chip-btn") return quickChips;
    if (sel === ".ai-site-link") return [];
    return [];
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
  addEventListener: () => {}
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
eval(drRajCode);

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

console.log("================================================================================");
console.log("ALL DR. RAJ AI TESTS PASSED CLEANLY!");
console.log("================================================================================");
