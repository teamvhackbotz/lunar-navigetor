/**
 * Verification test suite for Step 2: Geographic Context-Sensitive Spatial Overlays & Multi-Layer Controller
 * Tests:
 * 1. window.GISOverlays multi-layer state management (setLayer, getLayers, isLayerActive).
 * 2. Equatorial latitude rule (|lat| < 75°): Automatic PSR disabling, class addition, and info badge injection.
 * 3. Rejection of PSR layer activation at equatorial coordinates.
 * 4. Polar latitude restoration (|lat| >= 75°): Re-enabling PSR toggle and clearing badge.
 * 5. Far Side longitude rule (|normLon| >= 100°): Automatic DTE occlusion alert badge injection and activation.
 * 6. Near Side longitude restoration: Clearing DTE alert badge.
 * 7. Reactive synchronization with incoming EventBus 'site:marked' events.
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
elementsById["overlay-item-slope"] = new MockElement("label");

const togglePsr = new MockElement("input");
togglePsr.checked = true;
elementsById["layer-toggle-psr"] = togglePsr;
const itemPsr = new MockElement("label");
elementsById["overlay-item-psr"] = itemPsr;
const badgePsr = new MockElement("span");
elementsById["badge-psr-context"] = badgePsr;

const toggleIce = new MockElement("input");
toggleIce.checked = false;
elementsById["layer-toggle-ice"] = toggleIce;
elementsById["overlay-item-ice"] = new MockElement("label");

const toggleDte = new MockElement("input");
toggleDte.checked = false;
elementsById["layer-toggle-dte"] = toggleDte;
const itemDte = new MockElement("label");
elementsById["overlay-item-dte"] = itemDte;
const badgeDte = new MockElement("span");
elementsById["badge-dte-context"] = badgeDte;

elementsById["slider-layer-opacity"] = new MockElement("input");
elementsById["val-layer-opacity"] = new MockElement("span");
elementsById["planner-site-name"] = new MockElement("span");

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
const eventListeners = {};
global.window = {
  eventBus: {
    emit: (event, data) => dispatchedEvents.push({ event, data }),
    on: (event, fn) => {
      if (!eventListeners[event]) eventListeners[event] = [];
      eventListeners[event].push(fn);
    }
  }
};

// Execute component script
const componentJsPath = path.resolve(__dirname, "../components/horizon_topography/horizon_topography.js");
const componentCode = fs.readFileSync(componentJsPath, "utf-8");
eval(componentCode);

console.log("================================================================================");
console.log("RUNNING SUITE: Step 2 Geographic-Sensitive Overlays & Multi-Layer Controller");
console.log("================================================================================");

// 1. Verify multi-layer API contracts
assert(window.GISOverlays, "window.GISOverlays must exist");
assert.strictEqual(typeof window.GISOverlays.setLayer, "function", "setLayer must be a function");
assert.strictEqual(typeof window.GISOverlays.getLayers, "function", "getLayers must be a function");
assert.strictEqual(typeof window.GISOverlays.isLayerActive, "function", "isLayerActive must be a function");
assert.strictEqual(typeof window.GISOverlays.updateGeographicContext, "function", "updateGeographicContext must be a function");

const initialLayers = window.GISOverlays.getLayers();
assert.strictEqual(initialLayers.slope, true, "Initial slope layer must be true");
assert.strictEqual(initialLayers.psr, true, "Initial psr layer must be true");
assert.strictEqual(initialLayers.ice, false, "Initial ice layer must be false");
assert.strictEqual(initialLayers.dte, false, "Initial dte layer must be false");
console.log("✓ Layer state engine initialized with correct defaults");

// 2. Test programmatic layer toggling (e.g. ice layer)
dispatchedEvents.length = 0;
const iceSetRes = window.GISOverlays.setLayer("ice", true);
assert.strictEqual(iceSetRes, true, "setLayer('ice', true) should succeed");
assert.strictEqual(window.GISOverlays.isLayerActive("ice"), true, "isLayerActive('ice') should be true");
assert.strictEqual(toggleIce.checked, true, "DOM checkbox for ice must be synchronized to checked");
assert.strictEqual(dispatchedEvents.length, 1, "Exactly one event should be emitted");
assert.strictEqual(dispatchedEvents[0].event, "layer:toggle");
assert.strictEqual(dispatchedEvents[0].data.layerId, "ice");
assert.strictEqual(dispatchedEvents[0].data.enabled, true);
console.log("✓ Programmatic setLayer('ice', true) updates state, DOM, and emits layer:toggle");

// 3. Test Equatorial Site Boundary Rule (|lat| < 75°, e.g. Apollo 11 at 0.67° N, 23.47° E)
dispatchedEvents.length = 0;
window.GISOverlays.updateGeographicContext(0.67, 23.47);

assert.strictEqual(togglePsr.disabled, true, "PSR toggle must be disabled at equatorial latitude");
assert.strictEqual(togglePsr.checked, false, "PSR toggle must be unchecked at equatorial latitude");
assert(itemPsr.classList.contains("disabled"), "PSR label container must have 'disabled' class");
assert.strictEqual(badgePsr.style.display, "inline-block", "PSR badge must be displayed");
assert(badgePsr.textContent.includes("absent at equatorial latitudes"), "PSR badge must inform that PSRs are absent");
assert.strictEqual(window.GISOverlays.isLayerActive("psr"), false, "PSR layer state must be false");

// Verify suppression event emission
const psrSuppressedEvent = dispatchedEvents.find(e => e.event === "layer:toggle" && e.data.layerId === "psr");
assert(psrSuppressedEvent, "Suppression event for PSR must be emitted");
assert.strictEqual(psrSuppressedEvent.data.enabled, false);
assert.strictEqual(psrSuppressedEvent.data.suppressedByLatitude, true);
console.log("✓ Equatorial latitude (0.67°) automatically disables and suppresses PSR with context badge");

// 4. Test Rejection of PSR Layer Activation at Equatorial Site
dispatchedEvents.length = 0;
const rejectedSet = window.GISOverlays.setLayer("psr", true);
assert.strictEqual(rejectedSet, false, "setLayer('psr', true) must be rejected while equatorial");
assert.strictEqual(window.GISOverlays.isLayerActive("psr"), false, "PSR layer state must remain false");
assert.strictEqual(dispatchedEvents.length, 0, "No event should be emitted for rejected operation");
console.log("✓ Rejection of PSR layer activation at equatorial coordinates enforced cleanly");

// 5. Test Polar Site Boundary Rule (|lat| >= 75°, e.g. Malapert Mountain at -86.04° S, 2.7° E)
dispatchedEvents.length = 0;
window.GISOverlays.updateGeographicContext(-86.04, 2.7);

assert.strictEqual(togglePsr.disabled, false, "PSR toggle must be re-enabled at polar latitude");
assert(!itemPsr.classList.contains("disabled"), "PSR label container must not have 'disabled' class");
assert.strictEqual(badgePsr.style.display, "none", "PSR badge must be hidden at polar latitude");

// Now activating PSR should succeed
const polarSetRes = window.GISOverlays.setLayer("psr", true);
assert.strictEqual(polarSetRes, true, "setLayer('psr', true) must succeed at polar latitude");
assert.strictEqual(window.GISOverlays.isLayerActive("psr"), true, "PSR layer state must be true");
console.log("✓ Polar latitude (-86.04°) restores PSR toggle functionality and clears warning badge");

// 6. Test Far Side Longitude Rule (|normLon| >= 100°, e.g. Chang'e 4 at -45.45° S, 177.58° E)
dispatchedEvents.length = 0;
window.GISOverlays.updateGeographicContext(-45.45, 177.58);

assert.strictEqual(badgeDte.style.display, "inline-block", "Far Side DTE alert badge must be displayed");
assert(badgeDte.textContent.includes("Far Side Radio Shadow"), "DTE badge must display Far Side Radio Shadow alert");
assert.strictEqual(toggleDte.checked, true, "DTE radio occlusion toggle must be activated on Far Side");
assert.strictEqual(window.GISOverlays.isLayerActive("dte"), true, "DTE layer state must be active");

const dteEnforcedEvent = dispatchedEvents.find(e => e.event === "layer:toggle" && e.data.layerId === "dte");
assert(dteEnforcedEvent, "DTE enforcement event must be emitted");
assert.strictEqual(dteEnforcedEvent.data.enforcedByFarSide, true);
console.log("✓ Far Side longitude (177.58°) triggers permanent radio shadow alert and auto-activates DTE mask");

// 7. Test Near Side Longitude Restoration (e.g. Apollo 11 at 23.47° E)
dispatchedEvents.length = 0;
window.GISOverlays.updateGeographicContext(0.67, 23.47);
assert.strictEqual(badgeDte.style.display, "none", "DTE Far Side alert badge must be cleared on Near Side");
console.log("✓ Near Side longitude (23.47°) clears Far Side radio shadow alert badge");

// 8. Test Reactive Synchronization via incoming 'site:marked' event
dispatchedEvents.length = 0;
const siteMarkedListeners = eventListeners["site:marked"] || [];
assert(siteMarkedListeners.length > 0, "'site:marked' listener must be registered");

// Fire site:marked with Far Side coordinates
siteMarkedListeners.forEach(fn => fn({
  name: "Von Kármán Basin (Far Side)",
  lat: -45.45,
  lon: 177.58
}));

assert.strictEqual(badgeDte.style.display, "inline-block", "DTE alert badge should be triggered via site:marked");
assert.strictEqual(togglePsr.disabled, true, "PSR toggle should be disabled via site:marked (|lat| < 75°)");
console.log("✓ Incoming 'site:marked' EventBus event automatically synchronizes geographic overlays");

console.log("================================================================================");
console.log("ALL 8 STEP 2 GIS OVERLAYS TESTS PASSED CLEANLY!");
console.log("================================================================================");
