/**
 * Verification test suite for Step 3: Adaptive Multi-Spectral Calibration Legends & Opacity Blend Mixer
 * Tests:
 * 1. CALIBRATION_SPECS schema and scientific integrity (slope, psr, ice, dte).
 * 2. Default initial calibration legend ('slope').
 * 3. updateCalibrationLegend() dynamic switching of gradient, ticks, and sensor citations.
 * 4. Automatic legend adaptation when enabling layers or clicking overlay rows.
 * 5. Opacity mixer controller (setOpacity, getOpacity) and EventBus emission of 'layer:opacity'.
 * 6. Quick blend preset pills synchronization (30%, 60%, 75%, 90%).
 * 7. Out-of-bounds opacity clamping (10% to 100%).
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
    this.disabled = false;
  }

  get className() {
    return Array.from(this._classList).join(" ");
  }

  set className(str) {
    this._classList = new Set((str || "").split(" ").filter(Boolean));
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

// Build basemap cards
["lroc", "lola", "kaguya"].forEach(key => {
  const card = new MockElement("label");
  card.dataset.basemap = key;
  card.classList.add("basemap-card");
  if (key === "lroc") card.classList.add("active");
  const radio = new MockElement("input");
  radio.checked = key === "lroc";
  card.appendChild(radio);
  registerClass("basemap-card", card);
});

// Setup overlay items and checkboxes
const toggleSlope = new MockElement("input");
toggleSlope.checked = true;
elementsById["layer-toggle-slope"] = toggleSlope;
const itemSlope = new MockElement("label");
itemSlope.id = "overlay-item-slope";
elementsById["overlay-item-slope"] = itemSlope;
registerClass("overlay-toggle-item", itemSlope);

const togglePsr = new MockElement("input");
togglePsr.checked = true;
elementsById["layer-toggle-psr"] = togglePsr;
const itemPsr = new MockElement("label");
itemPsr.id = "overlay-item-psr";
elementsById["overlay-item-psr"] = itemPsr;
registerClass("overlay-toggle-item", itemPsr);
elementsById["badge-psr-context"] = new MockElement("span");

const toggleIce = new MockElement("input");
toggleIce.checked = false;
elementsById["layer-toggle-ice"] = toggleIce;
const itemIce = new MockElement("label");
itemIce.id = "overlay-item-ice";
elementsById["overlay-item-ice"] = itemIce;
registerClass("overlay-toggle-item", itemIce);

const toggleDte = new MockElement("input");
toggleDte.checked = false;
elementsById["layer-toggle-dte"] = toggleDte;
const itemDte = new MockElement("label");
itemDte.id = "overlay-item-dte";
elementsById["overlay-item-dte"] = itemDte;
registerClass("overlay-toggle-item", itemDte);
elementsById["badge-dte-context"] = new MockElement("span");

// Opacity controls
const sliderOpacity = new MockElement("input");
sliderOpacity.value = "75";
elementsById["slider-layer-opacity"] = sliderOpacity;
const valOpacity = new MockElement("span");
valOpacity.textContent = "75%";
elementsById["val-layer-opacity"] = valOpacity;

// Preset pills
[30, 60, 75, 90].forEach(pct => {
  const pill = new MockElement("button");
  pill.dataset.opacity = String(pct);
  pill.classList.add("preset-pill");
  if (pct === 75) pill.classList.add("active");
  registerClass("preset-pill", pill);
});

// Legend DOM nodes
elementsById["legend-instrument-title"] = new MockElement("span");
elementsById["legend-active-layer-tag"] = new MockElement("span");
elementsById["legend-gradient-bar"] = new MockElement("div");
elementsById["legend-tick-low"] = new MockElement("span");
elementsById["legend-tick-mid"] = new MockElement("span");
elementsById["legend-tick-high"] = new MockElement("span");
elementsById["legend-citation-text"] = new MockElement("div");
elementsById["planner-site-name"] = new MockElement("span");

global.document = {
  readyState: "complete",
  getElementById: (id) => elementsById[id] || null,
  querySelectorAll: (selector) => {
    if (selector === ".basemap-card") return elementsByClass["basemap-card"] || [];
    if (selector === ".preset-pill") return elementsByClass["preset-pill"] || [];
    if (selector === ".overlay-toggle-item") return elementsByClass["overlay-toggle-item"] || [];
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
console.log("RUNNING SUITE: Step 3 Calibration Legends & Opacity Blend Mixer");
console.log("================================================================================");

// 1. Verify CALIBRATION_SPECS registry
assert(window.GISOverlays.CALIBRATION_SPECS, "CALIBRATION_SPECS must be exported");
const specs = window.GISOverlays.CALIBRATION_SPECS;
["slope", "psr", "ice", "dte"].forEach(id => {
  assert(specs[id], `Specification for '${id}' must exist`);
  assert(specs[id].tag, `${id} must have a tag`);
  assert(specs[id].title, `${id} must have a title`);
  assert(specs[id].gradient, `${id} must have a gradient string`);
  assert(Array.isArray(specs[id].ticks) && specs[id].ticks.length === 3, `${id} must have 3 calibration ticks`);
  assert(specs[id].citation, `${id} must have a citation`);
});
console.log("✓ CALIBRATION_SPECS schema and NASA/JAXA sensor references verified");

// 2. Verify Initial Default Legend state ('slope')
assert.strictEqual(window.GISOverlays.getLegend(), "slope", "Initial legend should default to 'slope'");
assert.strictEqual(elementsById["legend-active-layer-tag"].textContent, "[LOLA DEM]");
assert(elementsById["legend-gradient-bar"].style.background.includes("#7d967e"));
assert.strictEqual(elementsById["legend-tick-low"].textContent, "0° (Flat / Safe)");
assert.strictEqual(elementsById["legend-tick-mid"].textContent, "8° (Moderate)");
assert.strictEqual(elementsById["legend-tick-high"].textContent, "20°+ (Steep Hazard)");
assert(elementsById["legend-citation-text"].textContent.includes("LOLA"));
console.log("✓ Default slope calibration legend initialized correctly in DOM");

// 3. Test updateCalibrationLegend('psr')
const psrSpec = window.GISOverlays.setLegend("psr");
assert.strictEqual(window.GISOverlays.getLegend(), "psr");
assert.strictEqual(psrSpec.tag, "[Diviner DLRE]");
assert.strictEqual(elementsById["legend-active-layer-tag"].textContent, "[Diviner DLRE]");
assert.strictEqual(elementsById["legend-tick-low"].textContent, "25 K (-248°C)");
assert.strictEqual(elementsById["legend-tick-mid"].textContent, "40 K (Volatiles Trap)");
assert.strictEqual(elementsById["legend-tick-high"].textContent, "100 K (Sublimation)");
assert(elementsById["legend-citation-text"].textContent.includes("Diviner"));
console.log("✓ Switching legend to 'psr' dynamically updates Diviner cryogenic scale");

// 4. Test updateCalibrationLegend('ice') (LEND WEH wt%)
const iceSpec = window.GISOverlays.setLegend("ice");
assert.strictEqual(window.GISOverlays.getLegend(), "ice");
assert.strictEqual(elementsById["legend-active-layer-tag"].textContent, "[LEND Neutrons]");
assert(elementsById["legend-tick-low"].textContent.includes("0.0 wt%"));
assert(elementsById["legend-tick-high"].textContent.includes("1.5+ wt%"));
assert(elementsById["legend-citation-text"].textContent.includes("LEND"));
console.log("✓ Switching legend to 'ice' dynamically updates LEND neutron flux scale");

// 5. Test updateCalibrationLegend('dte') (DSN X-band clearance)
const dteSpec = window.GISOverlays.setLegend("dte");
assert.strictEqual(window.GISOverlays.getLegend(), "dte");
assert.strictEqual(elementsById["legend-active-layer-tag"].textContent, "[DSN 8.4 GHz]");
assert(elementsById["legend-tick-low"].textContent.includes("-5°"));
assert(elementsById["legend-tick-high"].textContent.includes("+45°"));
assert(elementsById["legend-citation-text"].textContent.includes("Deep Space Network"));
console.log("✓ Switching legend to 'dte' dynamically updates Earth sightline clearance scale");

// 6. Test Automatic Legend Adaptation on Layer Activation
window.GISOverlays.setLayer("ice", true);
assert.strictEqual(window.GISOverlays.getLegend(), "ice", "Activating ice layer should automatically focus ice legend");
console.log("✓ Activating a layer automatically adapts the calibration legend");

// 7. Test Opacity Controller (setOpacity, getOpacity)
dispatchedEvents.length = 0;
const op30 = window.GISOverlays.setOpacity(30);
assert.strictEqual(op30, 0.3);
assert.strictEqual(window.GISOverlays.getOpacity(), 0.3);
assert.strictEqual(sliderOpacity.value, "30");
assert.strictEqual(valOpacity.textContent, "30%");

const pill30 = elementsByClass["preset-pill"].find(p => p.dataset.opacity === "30");
assert(pill30.classList.contains("active"), "30% preset pill must have active class");
const pill75 = elementsByClass["preset-pill"].find(p => p.dataset.opacity === "75");
assert(!pill75.classList.contains("active"), "75% preset pill must no longer be active");

assert.strictEqual(dispatchedEvents.length, 1);
assert.strictEqual(dispatchedEvents[0].event, "layer:opacity");
assert.strictEqual(dispatchedEvents[0].data.opacity, 0.3);
console.log("✓ setOpacity(30) synchronizes slider, readout, preset pills, and emits layer:opacity");

// 8. Test Preset Pill DOM click
dispatchedEvents.length = 0;
const pill90 = elementsByClass["preset-pill"].find(p => p.dataset.opacity === "90");
pill90.click();
assert.strictEqual(window.GISOverlays.getOpacity(), 0.9);
assert.strictEqual(valOpacity.textContent, "90%");
assert(pill90.classList.contains("active"), "90% preset pill must now be active");
assert.strictEqual(dispatchedEvents[0].data.opacity, 0.9);
console.log("✓ Clicking preset pill triggers setOpacity and EventBus emission");

// 9. Test Opacity Out-of-Bounds Clamping
window.GISOverlays.setOpacity(150);
assert.strictEqual(window.GISOverlays.getOpacity(), 1.0, "Opacity > 100% must clamp to 1.0");

window.GISOverlays.setOpacity(2);
assert.strictEqual(window.GISOverlays.getOpacity(), 0.1, "Opacity < 10% must clamp to 0.10");
console.log("✓ Opacity boundary clamping (10% to 100%) enforced safely");

console.log("================================================================================");
console.log("ALL 9 STEP 3 CALIBRATION & OPACITY TESTS PASSED CLEANLY!");
console.log("================================================================================");
