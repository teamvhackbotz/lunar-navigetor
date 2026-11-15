/**
 * Verification test suite for Step 1: Universal Mission Archetype Engine & Header Switcher
 * Tests:
 * 1. MISSION_ARCHETYPES schema integrity for all 4 mission archetypes.
 * 2. DOM manipulation & reactive state switching across Crewed, Rover, Lander, and Base Camp.
 * 3. Dynamic stay slider range and default re-configuration.
 * 4. Adaptive Science Payload roster re-rendering.
 * 5. EventBus emission of 'mission:archetype_change'.
 * 6. Public window.MissionPlanner interface.
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
    const list = this.eventListeners[event.type] || [];
    list.forEach(fn => fn(event));
  }

  click() {
    this.dispatchEvent({ type: "click", target: this });
  }

  querySelector(sel) {
    return this.children[0] || null;
  }

  querySelectorAll(sel) {
    return this.children;
  }
}

// Build synthetic DOM tree from horizon_topography.html
const htmlPath = path.join(__dirname, "../components/horizon_topography/horizon_topography.html");
const html = fs.readFileSync(htmlPath, "utf-8");

const elementsById = {};
const elementsByClass = {};

function registerMock(id, tag = "div") {
  const el = new MockElement(tag);
  el.id = id;
  elementsById[id] = el;
  return el;
}

// Mock elements needed by horizon_topography.js
const tagEl = registerMock("planner-mission-tag");
const titleEl = registerMock("planner-site-name");
const sliderStay = registerMock("slider-stay-duration", "input");
const valStay = registerMock("val-stay-duration");
const valPrimaryPower = registerMock("val-primary-power");
const valDarkness = registerMock("val-darkness-reserve");
const valCrew = registerMock("val-crew-compliment");
const labelBattery = registerMock("label-battery-soc");
const valBatterySoc = registerMock("val-battery-soc");
const barBatterySoc = registerMock("bar-battery-soc");
const valDaylightMargin = registerMock("val-daylight-margin");

const mobilityTag = registerMock("mobility-section-tag");
const mobilityHeading = registerMock("mobility-section-heading");
const mobilityDesc = registerMock("mobility-section-desc");
const valRadius = registerMock("val-operating-radius");
const valSpeed = registerMock("val-nominal-speed");
const labelSafety = registerMock("label-safety-margin");
const valSafety = registerMock("val-walkback-safety");
const valTraverse = registerMock("val-total-traverse");

const payloadHeading = registerMock("payload-section-heading");
const checklistGrid = registerMock("science-payload-checklist");
const waypointList = registerMock("waypoint-route-list");
const hazardBanner = registerMock("traverse-hazard-status");

// Archetype pill buttons
const pills = [
  registerMock("pill-crewed", "button"),
  registerMock("pill-rover", "button"),
  registerMock("pill-lander", "button"),
  registerMock("pill-basecamp", "button")
];
pills[0].dataset.archetype = "crewed";
pills[1].dataset.archetype = "rover";
pills[2].dataset.archetype = "lander";
pills[3].dataset.archetype = "basecamp";
pills.forEach(p => p.classList.add("archetype-pill"));

const emittedEvents = [];
const mockEventBus = {
  events: {},
  on: function(event, callback) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(callback);
  },
  emit: function(event, payload) {
    emittedEvents.push({ event, payload });
    if (this.events[event]) {
      this.events[event].forEach(fn => fn(payload));
    }
  }
};

// Setup global mock environment
global.window = {
  eventBus: mockEventBus,
  LunarPhysics: {
    findSite: () => null
  }
};
global.document = {
  readyState: "complete",
  getElementById: (id) => elementsById[id] || null,
  querySelectorAll: (selector) => {
    if (selector === ".archetype-pill") return pills;
    if (selector === ".basemap-card") return [];
    if (selector === ".waypoint-item") return [];
    return [];
  },
  querySelector: (selector) => null,
  createElement: (tag) => {
    return new MockElement(tag);
  },
  addEventListener: () => {}
};
global.Event = function(type) { this.type = type; };

// Load and execute horizon_topography.js
const jsPath = path.join(__dirname, "../components/horizon_topography/horizon_topography.js");
const jsCode = fs.readFileSync(jsPath, "utf-8");
eval(jsCode);

console.log("--- Testing Step 1: Universal Mission Archetype Engine ---");

// Test 1: Window API exposure
assert(window.MissionPlanner, "window.MissionPlanner must be exported");
assert.strictEqual(typeof window.MissionPlanner.setArchetype, "function", "setArchetype must be a function");
assert.strictEqual(typeof window.MissionPlanner.getArchetype, "function", "getArchetype must be a function");
assert.strictEqual(typeof window.MissionPlanner.getArchetypeConfig, "function", "getArchetypeConfig must be a function");
console.log("  ✓ 1. Public window.MissionPlanner interface exported cleanly");

// Test 2: Schema integrity of all 4 archetypes
const archetypes = ["crewed", "rover", "lander", "basecamp"];
archetypes.forEach(key => {
  const cfg = window.MissionPlanner.getArchetypeConfig(key);
  assert(cfg, `Archetype config for '${key}' must exist`);
  assert(cfg.tag, `Config for '${key}' must have a tag`);
  assert(cfg.primaryPower, `Config for '${key}' must have primaryPower`);
  assert(cfg.darknessReserve, `Config for '${key}' must have darknessReserve`);
  assert(cfg.crewCompliment, `Config for '${key}' must have crewCompliment`);
  assert(cfg.mobilityHeading, `Config for '${key}' must have mobilityHeading`);
  assert(cfg.staySlider, `Config for '${key}' must have staySlider`);
  assert(Array.isArray(cfg.payloads), `Config for '${key}' must have payloads array`);
  assert(cfg.payloads.length >= 3, `Config for '${key}' must have at least 3 payloads`);
});
console.log("  ✓ 2. Schema integrity verified across all 4 mission archetypes");

// Test 3: Default active archetype is 'crewed'
assert.strictEqual(window.MissionPlanner.getArchetype(), "crewed", "Default archetype should be crewed");
assert(pills[0].classList.contains("active"), "Crewed pill should have 'active' class");
assert.strictEqual(valPrimaryPower.textContent, "10.0 kW (VSAT)", "Primary power should reflect VSAT");
assert.strictEqual(valCrew.textContent, "2 Astronauts", "Crew compliment should be 2 Astronauts");
console.log("  ✓ 3. Default state initialized to Crewed Sortie (Artemis)");

// Test 4: Switching to Robotic Rover via pill click
emittedEvents.length = 0;
pills[1].click(); // click rover

assert.strictEqual(window.MissionPlanner.getArchetype(), "rover", "Active archetype should switch to rover");
assert(pills[1].classList.contains("active"), "Rover pill must be active");
assert(!pills[0].classList.contains("active"), "Crewed pill must no longer be active");
assert.strictEqual(tagEl.textContent, "Autonomous / Teleoperated Rover", "Header tag should update");
assert.strictEqual(valPrimaryPower.textContent, "450 W (Solar Mast)", "Primary power should update to 450 W");
assert.strictEqual(valCrew.textContent, "0 (Autonomous)", "Crew should update to 0");
assert.strictEqual(mobilityHeading.textContent, "Autonomous Rover Chassis", "Mobility heading should update");
assert.strictEqual(valRadius.textContent, "3.5 km", "Operating radius should update to 3.5 km");
assert.strictEqual(valSpeed.textContent, "0.2 km/h (50 m/h)", "Speed should update to rover pace");
assert.strictEqual(Number(sliderStay.max), 720, "Stay slider max should expand to 720h for robotic mission");
assert.strictEqual(checklistGrid.children.length, 4, "Rover payload checklist should render 4 instruments");

const roverArchetypeEvent = emittedEvents.find(e => e.event === "mission:archetype_change");
assert(roverArchetypeEvent, "mission:archetype_change event must be emitted");
assert.strictEqual(roverArchetypeEvent.payload.archetype, "rover", "Event payload must identify rover");
console.log("  ✓ 4. Robotic Rover archetype switch verified (Power: 450W, Crew: 0, Max Stay: 720h, Payloads: 4)");

// Test 5: Switching to Stationary Science Lander
emittedEvents.length = 0;
pills[2].click(); // click lander

assert.strictEqual(window.MissionPlanner.getArchetype(), "lander", "Active archetype should switch to lander");
assert.strictEqual(valPrimaryPower.textContent, "1.2 kW (GaAs Array)", "Primary power should update to GaAs array");
assert.strictEqual(valDarkness.textContent, "14 hrs (Twilight Batt)", "Darkness reserve should update");
assert.strictEqual(valSpeed.textContent, "0.0 km/h (Static)", "Stationary speed should be 0.0 km/h");
assert.strictEqual(valRadius.textContent, "1.5 m (Arm Reach)", "Radius should reflect robotic arm reach");
assert.strictEqual(labelSafety.textContent, "Lander Tilt Margin", "Safety margin label should adapt to lander tilt");
assert.strictEqual(checklistGrid.children.length, 4, "Lander payload checklist should render 4 instruments");
console.log("  ✓ 5. Stationary Science Lander archetype switch verified (Static 0 km/h, 1.5m arm reach, Tilt Margin)");

// Test 6: Switching to Extended Base Camp
emittedEvents.length = 0;
pills[3].click(); // click basecamp

assert.strictEqual(window.MissionPlanner.getArchetype(), "basecamp", "Active archetype should switch to basecamp");
assert.strictEqual(valPrimaryPower.textContent, "40.0 kW (Fission Power)", "Primary power should update to Fission");
assert.strictEqual(valDarkness.textContent, "360 hrs (Full Night)", "Darkness reserve should reflect full lunar night");
assert.strictEqual(valCrew.textContent, "4 Astronauts", "Crew compliment should be 4 Astronauts");
assert.strictEqual(mobilityHeading.textContent, "Pressurized Rover (PR)", "Mobility should reflect PR");
assert.strictEqual(valRadius.textContent, "25.0 km", "Radius should update to 25.0 km");
assert.strictEqual(checklistGrid.children.length, 4, "Basecamp payload checklist should render 4 outpost systems");
console.log("  ✓ 6. Extended Base Camp archetype switch verified (Power: 40 kW Fission, 360h night, 4 crew, 25 km)");

// Test 7: Switching back to Crewed
pills[0].click();
assert.strictEqual(window.MissionPlanner.getArchetype(), "crewed", "Should cleanly return to crewed");
assert.strictEqual(valCrew.textContent, "2 Astronauts");
assert.strictEqual(valPrimaryPower.textContent, "10.0 kW (VSAT)");
console.log("  ✓ 7. Round-trip switch back to Crewed confirmed");

console.log("\n✅ All Step 1 Universal Mission Archetype Engine tests passed successfully!");
