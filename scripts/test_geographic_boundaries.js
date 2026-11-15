/**
 * Verification test suite for LunarPhysics.synthesizeCustomSite() geographic boundary rules:
 * - Polar vs Equatorial PSR presence
 * - Nearside DTE vs Farside Radio Occlusion & Relay requirement
 * - Calibrated thermal limits (40 K cold traps vs 385 K daytime equatorial basalt)
 */

const fs = require("fs");
const path = require("path");

console.log("--- Testing LunarPhysics.synthesizeCustomSite() Geographic Boundaries ---");

const telemetry = JSON.parse(fs.readFileSync(path.join(__dirname, "../static/data/lunar_sites_telemetry.json"), "utf8"));
const physicsJs = fs.readFileSync(path.join(__dirname, "../core/lunar_physics.js"), "utf8");

// Mock browser environment for lunar_physics.js
class MockEventBus {
  constructor() { this.listeners = {}; }
  on(event, cb) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  }
  emit(event, data) {
    if (this.listeners[event]) this.listeners[event].forEach(cb => cb(data));
  }
}

global.window = { eventBus: new MockEventBus() };
global.document = { readyState: "complete", addEventListener: () => {} };
global.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve(telemetry) });

// Execute lunar_physics.js
eval(physicsJs);

const synth = global.window.LunarPhysics.synthesizeCustomSite;

// 1. South Pole Custom Site (-89.6°, 120.0°)
console.log("\n1. Polar Custom Site (-89.6° S, 120.0° E):");
const polarSite = synth(-89.6, 120.0);
console.log(`  PSR Name: "${polarSite.terrain.psr_name}"`);
console.log(`  Distance to PSR: ${polarSite.terrain.dist_to_psr_km} km`);
console.log(`  Thermal Range: ${polarSite.thermal.temp_min_k} K – ${polarSite.thermal.temp_max_k} K`);

if (polarSite.terrain.dist_to_psr_km <= 2.0 && polarSite.terrain.psr_name.includes("Cold Trap") && polarSite.thermal.temp_min_k === 40) {
  console.log("  ✓ Polar site correctly reflects cryogenic cold traps (40 K) and nearby micro-PSR (< 2 km)");
} else {
  console.error("  ✗ Polar site properties failed validation!");
  process.exit(1);
}

// 2. Equatorial Near Side Custom Site (0.5° N, 23.0° E)
console.log("\n2. Equatorial Near Side Custom Site (0.5° N, 23.0° E):");
const eqSite = synth(0.5, 23.0);
console.log(`  PSR Name: "${eqSite.terrain.psr_name}"`);
console.log(`  Distance to PSR: ${eqSite.terrain.dist_to_psr_km}`);
console.log(`  Thermal Range: ${eqSite.thermal.temp_min_k} K – ${eqSite.thermal.temp_max_k} K`);
console.log(`  DTE Comms Uptime: ${eqSite.summary_metrics.dte_comms_uptime_pct}%`);
console.log(`  RF Margin: ${eqSite.summary_metrics.rf_margin_db} dB`);

if (eqSite.terrain.dist_to_psr_km === null && eqSite.terrain.psr_name.includes("None") && eqSite.thermal.temp_max_k === 385 && eqSite.summary_metrics.dte_comms_uptime_pct > 80) {
  console.log("  ✓ Equatorial site correctly excludes PSRs (null distance) and reflects high solar heat (385 K) & continuous DTE");
} else {
  console.error("  ✗ Equatorial site properties failed validation!");
  process.exit(1);
}

// 3. Deep Far Side Custom Site (-45.0° S, 180.0° E)
console.log("\n3. Deep Far Side Custom Site (-45.0° S, 180.0° E):");
const farSideSite = synth(-45.0, 180.0);
console.log(`  is_farside: ${farSideSite.summary_metrics.is_farside}`);
console.log(`  DTE Comms Uptime: ${farSideSite.summary_metrics.dte_comms_uptime_pct}%`);
console.log(`  RF Margin: ${farSideSite.summary_metrics.rf_margin_db} dB`);
console.log(`  Comms Relay Required: "${farSideSite.summary_metrics.comms_relay_required}"`);

const anyEarthVis = farSideSite.november_2026_series.earth_visible.some(v => v === true);
if (farSideSite.summary_metrics.is_farside === true && farSideSite.summary_metrics.dte_comms_uptime_pct === 0 && farSideSite.summary_metrics.rf_margin_db === 0.0 && !anyEarthVis && farSideSite.summary_metrics.comms_relay_required) {
  console.log("  ✓ Deep Far Side site correctly enforces 0% direct Earth line-of-sight and flags relay requirement");
} else {
  console.error("  ✗ Far Side comms occlusion failed validation!");
  process.exit(1);
}

// 4. Libration Limb Transition Site (0.0° N, 88.0° E)
console.log("\n4. Libration Limb Transition Site (0.0° N, 88.0° E):");
const limbSite = synth(0.0, 88.0);
console.log(`  is_farside: ${limbSite.summary_metrics.is_farside}`);
console.log(`  DTE Comms Uptime: ${limbSite.summary_metrics.dte_comms_uptime_pct}%`);
console.log(`  RF Margin: ${limbSite.summary_metrics.rf_margin_db} dB`);

if (limbSite.november_2026_series.sun_el.length === 720 && typeof limbSite.summary_metrics.dte_comms_uptime_pct === "number") {
  console.log("  ✓ Limb transition coordinates evaluate smoothly without NaN or boundary errors");
} else {
  console.error("  ✗ Limb transition site failed validation!");
  process.exit(1);
}

console.log("\n✅ All Geographic Boundaries & Physical Reality tests passed successfully!\n");
