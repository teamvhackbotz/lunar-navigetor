/**
 * End-to-End Integration Test Suite for Universal Mission Constraints & EVA Traverse Planner
 * Components under test:
 * 1. components/horizon_topography/horizon_topography.html
 * 2. components/horizon_topography/horizon_topography.js
 * 3. core/lunar_physics.js (Authentic NASA Telemetry & custom synthesis)
 *
 * Verifies end-to-end workflows across all 4 archetypes and diverse lunar geographies.
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

// Minimal simulated DOM environment
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

  get className() {
    return Array.from(this._classList).join(" ");
  }

  set className(cn) {
    this._classList.clear();
    if (cn) {
      cn.split(/\s+/).filter(Boolean).forEach(c => this._classList.add(c));
    }
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

const elementsById = {};
function registerMock(id, tag = "div") {
  const el = new MockElement(tag);
  el.id = id;
  elementsById[id] = el;
  return el;
}

// Register DOM elements expected by horizon_topography.html
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

// Global Mock Environment
const telemetryPath = path.join(__dirname, "../static/data/lunar_sites_telemetry.json");
const telemetryData = JSON.parse(fs.readFileSync(telemetryPath, "utf-8"));

global.window = {
  eventBus: mockEventBus
};

global.fetch = () => Promise.resolve({
  ok: true,
  json: () => Promise.resolve(telemetryData)
});

global.document = {
  readyState: "complete",
  getElementById: (id) => elementsById[id] || null,
  querySelectorAll: (selector) => {
    if (selector === ".archetype-pill") return pills;
    if (selector === ".waypoint-item") return waypointList.children;
    if (selector === ".basemap-card") return [];
    return [];
  },
  querySelector: () => null,
  createElement: (tag) => new MockElement(tag),
  addEventListener: () => {}
};
global.Event = function(type) { this.type = type; };

// Setup listener for catalog loading
window.eventBus.on("telemetry:loaded", () => {
  runIntegrationTests();
});

// 1. Load authentic LunarPhysics engine
const physicsPath = path.join(__dirname, "../core/lunar_physics.js");
const physicsCode = fs.readFileSync(physicsPath, "utf-8");
eval(physicsCode);
assert(window.LunarPhysics, "LunarPhysics must initialize on window");

// 2. Load Mission Planner controller
const jsPath = path.join(__dirname, "../components/horizon_topography/horizon_topography.js");
const jsCode = fs.readFileSync(jsPath, "utf-8");
eval(jsCode);
assert(window.MissionPlanner, "MissionPlanner must initialize on window");

function runIntegrationTests() {
  console.log("--- Testing End-to-End Universal Mission Planner Integration ---");

  // Workflow 1: Initial Default State (Polar Site: Shackleton, Crewed Archetype)
  assert.strictEqual(window.MissionPlanner.getArchetype(), "crewed");
  assert.strictEqual(tagEl.textContent, "Artemis III / IV Surface Operations");
  assert.strictEqual(valPrimaryPower.textContent, "10.0 kW (VSAT)");
  assert.strictEqual(valCrew.textContent, "2 Astronauts");
  assert.strictEqual(waypointList.children.length, 3, "Must render exactly 3 waypoints");
  assert(valTraverse.textContent.includes("km (Round-Trip)"), `Traverse must be calculated round-trip, got: ${valTraverse.textContent}`);
  console.log(`  ✓ 1. Initial State verified: ${tagEl.textContent} | Power: ${valPrimaryPower.textContent} | Total Traverse: ${valTraverse.textContent}`);

  // Workflow 2: Switch Archetype to Robotic Rover
  emittedEvents.length = 0;
  pills[1].click(); // switch to rover

  assert.strictEqual(window.MissionPlanner.getArchetype(), "rover");
  assert.strictEqual(tagEl.textContent, "Autonomous / Teleoperated Rover");
  assert.strictEqual(valPrimaryPower.textContent, "450 W (Solar Mast)");
  assert.strictEqual(valDarkness.textContent, "48 hrs (Battery / RHU)");
  assert.strictEqual(valCrew.textContent, "0 (Autonomous)");
  assert.strictEqual(mobilityHeading.textContent, "Autonomous Rover Chassis");
  assert.strictEqual(Number(sliderStay.max), 720);
  assert.strictEqual(checklistGrid.children.length, 4, "Must render 4 rover instruments");

  const roverEvent = emittedEvents.find(e => e.event === "mission:archetype_change");
  assert(roverEvent && roverEvent.payload.archetype === "rover");
  console.log("  ✓ 2. Robotic Rover Archetype transition verified (450W Solar Mast, 0 Crew, 720h Slider, 4 Instruments)");

  // Workflow 3: Switch Archetype to Stationary Science Lander
  emittedEvents.length = 0;
  pills[2].click(); // switch to lander

  assert.strictEqual(window.MissionPlanner.getArchetype(), "lander");
  assert.strictEqual(valPrimaryPower.textContent, "1.2 kW (GaAs Array)");
  assert.strictEqual(valSpeed.textContent, "0.0 km/h (Static)");
  assert.strictEqual(valTraverse.textContent, "30.0 m (Static Envelope)");
  assert.strictEqual(labelSafety.textContent, "Lander Tilt Margin");
  assert.strictEqual(waypointList.children[0].dataset.wpId.includes("wp1"), true);
  console.log("  ✓ 3. Stationary Lander Archetype transition verified (Static 0 km/h, 30.0m Envelope, Tilt Margin)");

  // Workflow 4: Select Equatorial Mare Site (Apollo 11 Tranquility Base)
  emittedEvents.length = 0;
  // Simulate EventBus site selection for Apollo 11
  mockEventBus.emit("site:marked", { site_id: "apollo-11", name: "Apollo 11 Tranquility Base", lat: 0.67, lon: 23.47 });

  assert(titleEl.textContent.includes("Apollo 11"), `Title should include Apollo 11, got ${titleEl.textContent}`);
  // Switch to Crewed Sortie to inspect equatorial traverse waypoints
  window.MissionPlanner.setArchetype("crewed");

  const currentSite = window.MissionPlanner.getActiveSite();
  assert(currentSite, "Active site profile must be resolved");
  const eqWaypoints = window.MissionPlanner.generateTraverseWaypoints(currentSite, "crewed");

  assert.strictEqual(eqWaypoints[0].title, "Touchdown Landing Zone");
  assert.strictEqual(eqWaypoints[1].title, "Geologic Unit Contact / Basalt Outcrop");
  assert.strictEqual(eqWaypoints[2].title, "Impact Crater Ejecta Blanket");
  assert(!eqWaypoints[2].title.includes("None"), "Equatorial WP3 must not contain 'None'");
  assert(!eqWaypoints[2].dist.includes("null"), "Equatorial WP3 distance must not be 'null km'");
  assert(eqWaypoints[1].distKm > 0 && eqWaypoints[2].distKm > 0, "Waypoints must have genuine distances");
  console.log(`  ✓ 4. Equatorial Site (Apollo 11) verified: ${eqWaypoints[1].title} (${eqWaypoints[1].dist}) & ${eqWaypoints[2].title} (${eqWaypoints[2].dist})`);

  // Workflow 5: Select Deep Far Side Site (Chang'e 4)
  emittedEvents.length = 0;
  mockEventBus.emit("site:marked", { site_id: "change-4", name: "Von Kármán Basin (Far Side)", lat: -45.45, lon: 177.58 });

  const farSite = window.MissionPlanner.getActiveSite();
  assert(farSite, "Far side site profile must be resolved");
  const farWaypoints = window.MissionPlanner.generateTraverseWaypoints(farSite, "rover");
  assert.strictEqual(farWaypoints[1].title, "Central Peak Uplift / Mantle Outcrop");
  assert.strictEqual(farWaypoints[2].title, "Earth-Moon L2 Relay Sightline Mast");
  console.log(`  ✓ 5. Deep Far Side Site verified: ${farWaypoints[1].title} & ${farWaypoints[2].title}`);

  // Workflow 6: On-the-fly Custom Coordinate Synthesis
  emittedEvents.length = 0;
  mockEventBus.emit("site:marked", { lat: -15.2, lon: 40.5, name: "Custom Mare Outpost" });

  const customSite = window.MissionPlanner.getActiveSite();
  assert(customSite, "Custom site must be synthesized");
  assert(customSite.site_id.startsWith("custom-"), "Site ID should follow custom- schema");
  assert(customSite.november_2026_series, "Custom site must have 720h ephemeris series synthesized");
  assert.strictEqual(customSite.november_2026_series.sun_el.length, 720);
  assert.strictEqual(waypointList.children.length, 3, "Custom site must render 3 waypoints");
  console.log(`  ✓ 6. Custom site on-the-fly synthesis verified: ${customSite.name} (720h series present)`);

  // Workflow 7: Power Budget & Stay Simulation on Custom Site
  emittedEvents.length = 0;
  // Test within daylight
  const pwrSunlit = window.MissionPlanner.updatePowerBudgetAndStay(100);
  assert.strictEqual(pwrSunlit.batteryStatus, "nominal");
  assert(pwrSunlit.batterySoc >= 94);

  // Test beyond daylight into shadow
  const pwrShadow = window.MissionPlanner.updatePowerBudgetAndStay(360);
  assert(pwrShadow.shadowHours > 0);
  assert(pwrShadow.batteryStatus === "discharging" || pwrShadow.batteryStatus === "critical");
  console.log(`  ✓ 7. Power budget on custom site verified: Sunlit SoC=${pwrSunlit.batterySoc}%, Shadow=${pwrShadow.shadowHours}h (Status: ${pwrShadow.batteryStatus})`);

  // Workflow 8: EventBus contract verification
  assert(emittedEvents.some(e => e.event === "mission:constraint_change"), "Must emit mission:constraint_change");
  console.log("  ✓ 8. EventBus mission:constraint_change event contract verified");

  console.log("\n✅ All End-to-End Universal Mission Planner Integration tests passed successfully!");
}
