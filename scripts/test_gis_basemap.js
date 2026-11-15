/**
 * Verification test suite for Step 1: Universal GIS Basemap & Optical Remote Sensing Engine
 * Tests:
 * 1. BASEMAP_CONFIGS registry integrity for lroc, lola, and kaguya.
 * 2. Default active basemap initialization ('lroc').
 * 3. setBasemap() state switching and DOM synchronization (.active and radio input).
 * 4. layer:basemap_change EventBus emission with authentic orbital sensor telemetry.
 * 5. Keyboard accessibility and DOM click event triggering.
 * 6. Fallback handling for unknown basemap identifiers.
 * 7. Public window.GISOverlays interface contract.
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

// Minimal DOM simulation
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
    this.checked = false;
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
    this.children = [];
  }

  appendChild(child) {
    this.children.push(child);
    return child;
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

  querySelector(sel) {
    if (sel.includes('input[type="radio"]')) {
      return this.children.find(c => c.tagName === "INPUT") || null;
    }
    return this.children[0] || null;
  }

  querySelectorAll(sel) {
    return this.children;
  }
}

// Global window and document simulation
const elementsById = {};
const elementsByClass = {};

function registerClass(cls, el) {
  if (!elementsByClass[cls]) elementsByClass[cls] = [];
  elementsByClass[cls].push(el);
}

// Build cards for basemap selection
const cardLroc = new MockElement("label");
cardLroc.dataset.basemap = "lroc";
cardLroc.classList.add("basemap-card");
cardLroc.classList.add("active");
const radioLroc = new MockElement("input");
radioLroc.checked = true;
cardLroc.appendChild(radioLroc);
registerClass("basemap-card", cardLroc);

const cardLola = new MockElement("label");
cardLola.dataset.basemap = "lola";
cardLola.classList.add("basemap-card");
const radioLola = new MockElement("input");
radioLola.checked = false;
cardLola.appendChild(radioLola);
registerClass("basemap-card", cardLola);

const cardKaguya = new MockElement("label");
cardKaguya.dataset.basemap = "kaguya";
cardKaguya.classList.add("basemap-card");
const radioKaguya = new MockElement("input");
radioKaguya.checked = false;
cardKaguya.appendChild(radioKaguya);
registerClass("basemap-card", cardKaguya);

// Setup other right drawer elements
elementsById["layer-toggle-slope"] = new MockElement("input");
elementsById["layer-toggle-psr"] = new MockElement("input");
elementsById["layer-toggle-ice"] = new MockElement("input");
elementsById["layer-toggle-dte"] = new MockElement("input");
elementsById["slider-layer-opacity"] = new MockElement("input");
elementsById["val-layer-opacity"] = new MockElement("span");

global.document = {
  readyState: "complete",
  getElementById: (id) => elementsById[id] || null,
  querySelectorAll: (selector) => {
    if (selector === ".basemap-card") return elementsByClass["basemap-card"] || [];
    if (selector === ".archetype-pill") return [];
    if (selector === ".waypoint-item") return [];
    return [];
  },
  querySelector: () => null,
  addEventListener: () => {}
};

// EventBus simulation
const dispatchedEvents = [];
global.window = {
  eventBus: {
    emit: (event, data) => dispatchedEvents.push({ event, data }),
    on: () => {}
  }
};

// Execute component script
const componentJsPath = path.resolve(__dirname, "../components/horizon_topography/horizon_topography.js");
const componentCode = fs.readFileSync(componentJsPath, "utf-8");
eval(componentCode);

console.log("================================================================================");
console.log("RUNNING SUITE: Step 1 GIS Basemap & Optical Remote Sensing Engine");
console.log("================================================================================");

// 1. Verify window.GISOverlays public API exists
assert(window.GISOverlays, "window.GISOverlays should be exported");
assert.strictEqual(typeof window.GISOverlays.setBasemap, "function", "setBasemap should be a function");
assert.strictEqual(typeof window.GISOverlays.getBasemap, "function", "getBasemap should be a function");
assert.strictEqual(typeof window.GISOverlays.getBasemapConfig, "function", "getBasemapConfig should be a function");
assert(window.GISOverlays.BASEMAPS, "BASEMAPS registry should be exported");
console.log("✓ window.GISOverlays public interface properly exposed");

// 2. Verify BASEMAP_CONFIGS registry integrity
const configs = window.GISOverlays.BASEMAPS;
["lroc", "lola", "kaguya"].forEach(key => {
  assert(configs[key], `Configuration for ${key} must exist`);
  assert(configs[key].name, `${key} must have a name`);
  assert(configs[key].agency, `${key} must have an agency`);
  assert(configs[key].instrument, `${key} must have an instrument`);
  assert(configs[key].spectrum, `${key} must have a spectrum description`);
  assert(configs[key].resolution, `${key} must have a resolution`);
  assert(configs[key].datum, `${key} must have a datum reference`);
});
assert.strictEqual(configs.lroc.agency, "NASA", "LROC agency must be NASA");
assert.strictEqual(configs.lola.resolution, "59 m/px polar DEM", "LOLA resolution must be 59 m/px polar DEM");
assert.strictEqual(configs.kaguya.agency, "JAXA", "Kaguya agency must be JAXA");
console.log("✓ BASEMAP_CONFIGS metadata contains authentic NASA and JAXA sensor parameters");

// 3. Verify initial state
assert.strictEqual(window.GISOverlays.getBasemap(), "lroc", "Default basemap must be 'lroc'");
console.log("✓ Default basemap initialized to 'lroc'");

// 4. Test programmatic setBasemap('lola')
dispatchedEvents.length = 0;
const lolaResult = window.GISOverlays.setBasemap("lola");
assert.strictEqual(window.GISOverlays.getBasemap(), "lola", "Active basemap should be 'lola'");
assert.strictEqual(lolaResult.name, "LOLA Topographic Relief");
assert(cardLola.classList.contains("active"), "LOLA card must have 'active' class");
assert(!cardLroc.classList.contains("active"), "LROC card must not have 'active' class");
assert.strictEqual(radioLola.checked, true, "LOLA radio input must be checked");
assert.strictEqual(radioLroc.checked, false, "LROC radio input must be unchecked");

// Verify EventBus emission
assert.strictEqual(dispatchedEvents.length, 1, "Exactly one event should have been dispatched");
assert.strictEqual(dispatchedEvents[0].event, "layer:basemap_change");
assert.strictEqual(dispatchedEvents[0].data.basemap, "lola");
assert.strictEqual(dispatchedEvents[0].data.config.instrument, "Lunar Orbiter Laser Altimeter (LOLA)");
console.log("✓ Programmatic setBasemap('lola') updates DOM, radio states, and emits layer:basemap_change");

// 5. Test setBasemap('kaguya')
dispatchedEvents.length = 0;
const kaguyaResult = window.GISOverlays.setBasemap("kaguya");
assert.strictEqual(window.GISOverlays.getBasemap(), "kaguya", "Active basemap should be 'kaguya'");
assert(cardKaguya.classList.contains("active"), "Kaguya card must have 'active' class");
assert(!cardLola.classList.contains("active"), "LOLA card must not have 'active' class");
assert.strictEqual(radioKaguya.checked, true, "Kaguya radio input must be checked");

assert.strictEqual(dispatchedEvents.length, 1);
assert.strictEqual(dispatchedEvents[0].event, "layer:basemap_change");
assert.strictEqual(dispatchedEvents[0].data.basemap, "kaguya");
assert.strictEqual(dispatchedEvents[0].data.config.agency, "JAXA");
console.log("✓ Programmatic setBasemap('kaguya') successfully dispatches JAXA SELENE telemetry");

// 6. Test fallback on invalid basemap key
dispatchedEvents.length = 0;
const fallbackResult = window.GISOverlays.setBasemap("non_existent_basemap");
assert.strictEqual(window.GISOverlays.getBasemap(), "lroc", "Invalid basemap must safely fallback to 'lroc'");
assert.strictEqual(fallbackResult.id, "lroc");
assert(cardLroc.classList.contains("active"), "LROC card must be active on fallback");
console.log("✓ Fallback on invalid basemap key gracefully defaults to 'lroc'");

// 7. Test DOM click event triggering
dispatchedEvents.length = 0;
cardLola.click();
assert.strictEqual(window.GISOverlays.getBasemap(), "lola", "Clicking LOLA card should switch basemap to 'lola'");
assert.strictEqual(dispatchedEvents.length, 1);
assert.strictEqual(dispatchedEvents[0].data.basemap, "lola");
console.log("✓ DOM click on basemap card successfully triggers setBasemap");

// 8. Test Keyboard navigation (Enter key)
dispatchedEvents.length = 0;
cardKaguya.dispatchEvent({ type: "keydown", key: "Enter" });
assert.strictEqual(window.GISOverlays.getBasemap(), "kaguya", "Pressing Enter on Kaguya card should switch basemap");
assert.strictEqual(dispatchedEvents.length, 1);
assert.strictEqual(dispatchedEvents[0].data.basemap, "kaguya");
console.log("✓ Keyboard accessibility (Enter key) triggers basemap switch");

console.log("================================================================================");
console.log("ALL 8 STEP 1 GIS BASEMAP TESTS PASSED CLEANLY!");
console.log("================================================================================");
