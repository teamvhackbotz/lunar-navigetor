/**
 * Verification test suite for Step 2: Dynamic Waypoint Route Generator & Slope Hazard Monitor
 * Tests:
 * 1. calculateLunarDistanceKm mathematical accuracy vs spherical trigonometry.
 * 2. Polar domain waypoint generation (Shackleton PSR targets).
 * 3. Equatorial domain waypoint generation (Apollo 11 basalt & ejecta, eliminating 'None PSR' & 'null km').
 * 4. Far Side domain waypoint generation (Central peak & L2 relay mast).
 * 5. Stationary Lander micro-meter deployment envelope (0m, 5m, 15m).
 * 6. Dynamic cumulative round-trip traverse calculation.
 * 7. Vehicle-specific slope hazard banners (Lander tip-over, Rover wheel-stall, Crewed LTV).
 * 8. Synthesized custom site integration.
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

// Curated NASA sites catalog mock
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
    summary_metrics: { is_farside: false }
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
    summary_metrics: { is_farside: false }
  },
  farside: {
    site_id: "change-4",
    name: "Von Kármán Crater Floor",
    coordinates: { lat: -45.45, lon: 177.58 },
    terrain: {
      slope_touchdown_deg: 3.8,
      slope_status: "Nominal",
      slope_color: "status-safe",
      max_gradient_deg: 17.5,
      dist_to_psr_km: null,
      psr_name: "None (Equatorial / Mid-Latitude)"
    },
    summary_metrics: { is_farside: true }
  }
};

global.window = {
  eventBus: mockEventBus,
  LunarPhysics: {
    findSite: (input) => {
      if (!input) return null;
      if (typeof input === "string") return MOCK_SITES[input.toLowerCase()] || null;
      if (typeof input === "object") {
        if (input.site_id && MOCK_SITES[input.site_id]) return MOCK_SITES[input.site_id];
        if (input.name) {
          const lower = input.name.toLowerCase();
          for (const k in MOCK_SITES) {
            if (MOCK_SITES[k].name.toLowerCase().includes(lower)) return MOCK_SITES[k];
          }
        }
      }
      return null;
    },
    synthesizeCustomSite: (lat, lon) => {
      return {
        site_id: `custom-${Math.abs(lat).toFixed(2)}-${lon.toFixed(2)}`,
        name: `Custom (${Math.abs(lat).toFixed(2)}° ${lat < 0 ? "S" : "N"}, ${lon.toFixed(1)}° E)`,
        coordinates: { lat: lat, lon: lon },
        terrain: {
          slope_touchdown_deg: 4.5,
          slope_status: "Nominal",
          slope_color: "status-safe",
          max_gradient_deg: 13.5,
          dist_to_psr_km: Math.abs(lat) >= 75 ? 2.1 : null,
          psr_name: Math.abs(lat) >= 75 ? "Regional Micro-PSR Cold Trap" : "None (Equatorial / Mid-Latitude)"
        },
        summary_metrics: { is_farside: Math.abs(((((lon + 180) % 360) + 360) % 360) - 180) >= 100 }
      };
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

console.log("--- Testing Step 2: Dynamic Waypoint Route Generator & Slope Hazard Monitor ---");

// Test 1: Lunar distance math
const dOneDegLat = window.MissionPlanner.calculateLunarDistanceKm(0, 0, 1, 0);
assert(Math.abs(dOneDegLat - 30.32) < 0.2, `1 degree of lunar latitude should be ~30.32 km, got ${dOneDegLat}`);
const dZero = window.MissionPlanner.calculateLunarDistanceKm(10, 10, 10, 10);
assert.strictEqual(dZero, 0, "Distance between identical points must be 0");
console.log(`  ✓ 1. Lunar distance formula verified: 1° lat = ${dOneDegLat} km (Expected ~30.32 km)`);

// Test 2: Polar site waypoints (Connecting Ridge)
const polarSite = MOCK_SITES.shackleton;
const polarWps = window.MissionPlanner.generateTraverseWaypoints(polarSite, "crewed");
assert.strictEqual(polarWps.length, 3, "Must generate exactly 3 waypoints");
assert.strictEqual(polarWps[0].title, "Touchdown Landing Zone");
assert.strictEqual(polarWps[0].dist, "0.0 km");
assert.strictEqual(polarWps[1].title, "Solar Illumination Crest Station");
assert(polarWps[2].title.includes("Cold Trap Perimeter"), "WP3 must target Cold Trap perimeter for polar site");
assert(polarWps[2].distKm > 0, "WP3 distance must be positive number");
console.log(`  ✓ 2. Polar Site waypoints verified: ${polarWps[1].title} (${polarWps[1].dist}) & ${polarWps[2].title} (${polarWps[2].dist})`);

// Test 3: Equatorial site waypoints (Apollo 11) - Verifying NO 'None PSR' and NO 'null km'
const eqSite = MOCK_SITES["apollo-11"];
const eqWps = window.MissionPlanner.generateTraverseWaypoints(eqSite, "crewed");
assert.strictEqual(eqWps[0].title, "Touchdown Landing Zone");
assert.strictEqual(eqWps[1].title, "Geologic Unit Contact / Basalt Outcrop");
assert.strictEqual(eqWps[2].title, "Impact Crater Ejecta Blanket");
assert(!eqWps[2].title.includes("None"), "Equatorial WP3 must NOT contain 'None'");
assert(!eqWps[2].dist.includes("null"), "Equatorial WP3 distance must NOT be 'null km'");
assert(eqWps[2].distKm > 0, "Equatorial WP3 distance must be positive");
console.log(`  ✓ 3. Equatorial Site waypoints verified: ${eqWps[1].title} & ${eqWps[2].title} (Zero null/None artifacts)`);

// Test 4: Far Side site waypoints (Chang'e 4)
const farSite = MOCK_SITES.farside;
const farWps = window.MissionPlanner.generateTraverseWaypoints(farSite, "rover");
assert.strictEqual(farWps[1].title, "Central Peak Uplift / Mantle Outcrop");
assert.strictEqual(farWps[2].title, "Earth-Moon L2 Relay Sightline Mast");
console.log(`  ✓ 4. Far Side Site waypoints verified: ${farWps[1].title} & ${farWps[2].title}`);

// Test 5: Stationary Lander micro-meter deployment envelope
const landerWps = window.MissionPlanner.generateTraverseWaypoints(polarSite, "lander");
assert.strictEqual(landerWps[0].title, "Touchdown Pad Footprint");
assert.strictEqual(landerWps[0].dist, "0.0 m");
assert.strictEqual(landerWps[1].title, "Robotic Arm Deployment Sweep");
assert.strictEqual(landerWps[1].dist, "5.0 m");
assert.strictEqual(landerWps[2].title, "Surface Sensor / EMI Mast");
assert.strictEqual(landerWps[2].dist, "15.0 m");
console.log("  ✓ 5. Stationary Lander micro-meter envelope verified (0m, 5m, 15m)");

// Test 6: Dynamic round-trip traverse calculation in DOM
window.MissionPlanner.renderWaypoints(polarSite);
assert(valTraverse.textContent.includes("km (Round-Trip)"), `Total traverse should be calculated round-trip, got ${valTraverse.textContent}`);
console.log(`  ✓ 6. Dynamic cumulative round-trip traverse calculated: ${valTraverse.textContent}`);

// Test 7: Stationary lander traverse envelope in DOM
window.MissionPlanner.setArchetype("lander");
assert.strictEqual(valTraverse.textContent, "30.0 m (Static Envelope)");
console.log(`  ✓ 7. Lander envelope in DOM verified: ${valTraverse.textContent}`);

// Test 8: Vehicle-specific slope hazard banners
// Lander with 5.8° touchdown slope (nominal is <4°, hazard is >10°) -> should warn about asymmetric gear deflection
assert(hazardBanner.className.includes("warning"), "Lander with 5.8° slope should be in warning state");
assert(hazardBanner.innerHTML.includes("asymmetric landing gear deflection"), "Lander banner should mention gear deflection");

// Switch to Rover on polar site (max slope 18.2°, rover hazard threshold is >12°) -> should trigger danger alert
window.MissionPlanner.setArchetype("rover");
assert(hazardBanner.className.includes("danger"), "Rover on 18.2° slope must trigger danger state");
assert(hazardBanner.innerHTML.includes("rover limit"), "Rover banner must mention rover limit");

// Switch to Crewed (max slope 18.2°, crewed hazard threshold is >15°) -> should trigger low-gear warning
window.MissionPlanner.setArchetype("crewed");
assert(hazardBanner.className.includes("danger"), "Crewed on 18.2° slope must trigger danger state");
assert(hazardBanner.innerHTML.includes("Low-gear traverse advised"), "Crewed banner must advise low-gear traverse");

// Switch to Apollo 11 (max slope 6.2° <= 8.0°) -> should be OK
window.MissionPlanner.renderWaypoints(eqSite);
assert(hazardBanner.className.includes("ok"), "Apollo 11 should be in ok state");
assert(hazardBanner.innerHTML.includes("safe operational limits"), "Apollo 11 banner should indicate safe limits");
console.log("  ✓ 8. Vehicle-specific slope hazard thresholds verified across Lander, Rover, and Crewed");

// Test 9: Synthesized Custom Site via updateActiveSiteContext
emittedEvents.length = 0;
// Simulate EventBus site:marked with arbitrary coordinates
const customCoordData = { lat: -15.2, lon: -40.5, name: "Custom Mare Station" };
if (mockEventBus.events["site:marked"]) {
  mockEventBus.events["site:marked"].forEach(fn => fn(customCoordData));
}
assert(titleEl.textContent.includes("Custom Mare Station") || titleEl.textContent.includes("Custom (15.20° S"), "Active site header should update to custom site");
assert.strictEqual(waypointList.children.length, 3, "Custom site should generate exactly 3 waypoints");
console.log("  ✓ 9. Uncataloged custom coordinates synthesized and hydrated cleanly");

console.log("\n✅ All Step 2 Dynamic Waypoint & Slope Hazard tests passed successfully!");
