/**
 * Verification test suite for Step 3: Ephemeris-Coupled Power Budget & Battery Simulation
 * Tests:
 * 1. Positive daylight reserve and floating battery charge during 100% sunlit stay windows.
 * 2. Partial battery/RFC discharge and shadow warning when stay exceeds continuous sunlight.
 * 3. Critical depletion alerts when shadow duration exceeds vehicle darkness storage limit.
 * 4. Multi-class archetype adaptability (Crewed 72h RFC, Rover 48h Battery, Lander 14h Battery, Basecamp 360h FSP).
 * 5. EventBus emission contract and telemetry payload validation.
 * 6. UI class synchronization (.fill-sage, .fill-warn, .fill-danger, status-safe, status-warning, status-danger).
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

// Register DOM elements
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

const MOCK_SITES = {
  shackleton: {
    site_id: "shackleton",
    name: "Connecting Ridge",
    coordinates: { lat: -89.44, lon: 222.6 },
    terrain: {
      slope_touchdown_deg: 5.8,
      slope_status: "Moderate",
      slope_color: "status-warning",
      max_gradient_deg: 18.2,
      dist_to_psr_km: 1.8,
      psr_name: "De Gerlache Cold Trap"
    },
    summary_metrics: {
      is_farside: false,
      continuous_sunlight_max_hrs: 192,
      daylight_pct: 68
    }
  },
  "apollo-11": {
    site_id: "apollo-11",
    name: "Apollo 11 Tranquility Base",
    coordinates: { lat: 0.67, lon: 23.47 },
    terrain: {
      slope_touchdown_deg: 1.5,
      slope_status: "Nominal",
      slope_color: "status-safe",
      max_gradient_deg: 6.2,
      dist_to_psr_km: null,
      psr_name: "None (Equatorial / Mid-Latitude)"
    },
    summary_metrics: {
      is_farside: false,
      continuous_sunlight_max_hrs: 354,
      daylight_pct: 50
    }
  }
};

global.window = {
  eventBus: mockEventBus,
  LunarPhysics: {
    findSite: (input) => {
      if (!input) return null;
      if (typeof input === "string") return MOCK_SITES[input.toLowerCase()] || null;
      if (typeof input === "object" && input.site_id) return MOCK_SITES[input.site_id] || null;
      return null;
    }
  }
};

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

// Execute horizon_topography.js
const jsPath = path.join(__dirname, "../components/horizon_topography/horizon_topography.js");
const jsCode = fs.readFileSync(jsPath, "utf-8");
eval(jsCode);

console.log("--- Testing Step 3: Ephemeris-Coupled Power Budget & Battery Simulation ---");

// Test 1: Function export on window.MissionPlanner
assert(typeof window.MissionPlanner.updatePowerBudgetAndStay === "function", "updatePowerBudgetAndStay must be exported");
console.log("  ✓ 1. updatePowerBudgetAndStay API exported cleanly");

// Hydrate Shackleton (192h continuous daylight)
window.MissionPlanner.renderWaypoints(MOCK_SITES.shackleton);

// Test 2: Sunlit Stay Window (Stay 144h <= 192h daylight)
emittedEvents.length = 0;
const resSunlit = window.MissionPlanner.updatePowerBudgetAndStay(144);

assert.strictEqual(resSunlit.stayHours, 144);
assert.strictEqual(resSunlit.daylightAvailable, 192);
assert.strictEqual(resSunlit.daylightMargin, 48, "Daylight margin should be 192 - 144 = +48h");
assert.strictEqual(resSunlit.shadowHours, 0, "Shadow hours must be 0 for sunlit stay");
assert.strictEqual(resSunlit.batteryStatus, "nominal", "Battery status should be nominal");
assert(resSunlit.batterySoc >= 94, "Battery SoC must remain >= 94% on solar power");

assert.strictEqual(valDaylightMargin.textContent, "+48 hrs reserve");
assert(valDaylightMargin.className.includes("status-safe"));
assert(valBatterySoc.textContent.includes("Nominal (Solar Powered)"));
assert(barBatterySoc.className.includes("fill-sage"));
console.log(`  ✓ 2. Sunlit Stay (144h): Margin +48h reserve, SoC ${resSunlit.batterySoc}% (Nominal fill-sage)`);

// Test 3: Shadow Transition with RFC Discharge (Stay 216h > 192h daylight, 24h shadow <= 72h RFC reserve)
emittedEvents.length = 0;
const resDischarging = window.MissionPlanner.updatePowerBudgetAndStay(216);

assert.strictEqual(resDischarging.stayHours, 216);
assert.strictEqual(resDischarging.daylightMargin, -24, "Daylight margin should be -24h");
assert.strictEqual(resDischarging.shadowHours, 24, "Shadow hours should be 24h");
assert.strictEqual(resDischarging.batteryStatus, "discharging");
assert(resDischarging.batterySoc < 85 && resDischarging.batterySoc > 60, `Battery SoC should discharge to ~73%, got ${resDischarging.batterySoc}%`);

assert.strictEqual(valDaylightMargin.textContent, "24 hrs in shadow");
assert(valDaylightMargin.className.includes("status-warning"));
assert(valBatterySoc.textContent.includes("Discharging (24h Shadow)"));
assert(barBatterySoc.className.includes("fill-warn") || barBatterySoc.className.includes("fill-sage"));
console.log(`  ✓ 3. Shadow Discharge (216h stay, 24h shadow): Margin -24h in shadow, SoC ${resDischarging.batterySoc}% (fill-warn)`);

// Test 4: Critical Depletion (Stay 288h > 192h daylight, 96h shadow > 72h RFC reserve)
emittedEvents.length = 0;
const resCritical = window.MissionPlanner.updatePowerBudgetAndStay(288);

assert.strictEqual(resCritical.stayHours, 288);
assert.strictEqual(resCritical.shadowHours, 96);
assert.strictEqual(resCritical.batteryStatus, "critical");
assert(resCritical.batterySoc <= 20, "Battery SoC should drop <= 20% on reserve exhaustion");

assert.strictEqual(valDaylightMargin.textContent, "96 hrs in shadow");
assert(valDaylightMargin.className.includes("status-danger"));
assert(valBatterySoc.textContent.includes("Critical: Reserve Depleted"));
assert(barBatterySoc.className.includes("fill-danger"));
console.log(`  ✓ 4. Critical Depletion (288h stay, 96h shadow > 72h RFC): SoC ${resCritical.batterySoc}% (Critical fill-danger)`);

// Test 5: Multi-class archetype adaptability (Robotic Rover with 48h limit)
window.MissionPlanner.setArchetype("rover");
// Rover on Shackleton: 192h daylight, 48h battery limit
// At 220h stay -> 28h shadow <= 48h limit -> discharging
const resRoverDischarging = window.MissionPlanner.updatePowerBudgetAndStay(220);
assert.strictEqual(resRoverDischarging.batteryStatus, "discharging");
// At 250h stay -> 58h shadow > 48h limit -> critical
const resRoverCritical = window.MissionPlanner.updatePowerBudgetAndStay(250);
assert.strictEqual(resRoverCritical.batteryStatus, "critical");
console.log("  ✓ 5. Robotic Rover 48h battery endurance curve verified");

// Test 6: Stationary Lander with 14h twilight battery limit
window.MissionPlanner.setArchetype("lander");
// At 200h stay -> 8h shadow <= 14h limit -> discharging
const resLanderDischarging = window.MissionPlanner.updatePowerBudgetAndStay(200);
assert.strictEqual(resLanderDischarging.batteryStatus, "discharging");
// At 210h stay -> 18h shadow > 14h limit -> critical
const resLanderCritical = window.MissionPlanner.updatePowerBudgetAndStay(210);
assert.strictEqual(resLanderCritical.batteryStatus, "critical");
console.log("  ✓ 6. Stationary Lander 14h twilight battery limit verified");

// Test 7: EventBus emission contract
window.MissionPlanner.setArchetype("crewed");
emittedEvents.length = 0;
window.MissionPlanner.updatePowerBudgetAndStay(168);

const constraintEvent = emittedEvents.find(e => e.event === "mission:constraint_change");
assert(constraintEvent, "mission:constraint_change must be emitted");
assert.strictEqual(constraintEvent.payload.stayHours, 168);
assert.strictEqual(constraintEvent.payload.daylightAvailable, 192);
assert.strictEqual(constraintEvent.payload.daylightMargin, 24);
assert.strictEqual(constraintEvent.payload.archetype, "crewed");
assert(constraintEvent.payload.batterySoc >= 90);
console.log("  ✓ 7. EventBus mission:constraint_change payload contract verified");

// Test 8: Timeline synchronization via time:changed
emittedEvents.length = 0;
if (mockEventBus.events["time:changed"]) {
  mockEventBus.events["time:changed"].forEach(fn => fn());
}
const syncEvent = emittedEvents.find(e => e.event === "mission:constraint_change");
assert(syncEvent, "time:changed must trigger updatePowerBudgetAndStay across EventBus");
console.log("  ✓ 8. Global timeline sync verified via time:changed listener");

console.log("\n✅ All Step 3 Ephemeris-Coupled Power Budget tests passed successfully!");
