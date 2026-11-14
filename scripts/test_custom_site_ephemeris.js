/**
 * Verification test suite for LunarPhysics.synthesizeCustomSite() 720-hour ephemeris generation
 */

const fs = require("fs");
const path = require("path");

console.log("--- Testing LunarPhysics.synthesizeCustomSite() 720-Hour Ephemeris Series ---");

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
const evalHour = global.window.LunarPhysics.evaluateAtHour;

if (typeof synth !== "function" || typeof evalHour !== "function") {
  console.error("  ✗ Missing synthesizeCustomSite or evaluateAtHour on window.LunarPhysics!");
  process.exit(1);
}

// 1. Benchmark Execution Speed
console.log("\n1. Performance Benchmark:");
const t0 = performance.now();
const customSite = synth(-85.4, 130.2);
const dt = performance.now() - t0;
console.log(`  ✓ 720-hour ephemeris synthesis generated in ${dt.toFixed(2)} ms (Limit: < 10 ms)`);
if (dt > 10.0) {
  console.error("  ✗ Synthesis too slow!");
  process.exit(1);
}

// 2. Schema and Array Length Verification
console.log("\n2. Series Schema & Length Verification:");
if (!customSite.november_2026_series) {
  console.error("  ✗ Missing november_2026_series on custom site!");
  process.exit(1);
}
const ser = customSite.november_2026_series;
const requiredArrays = ["sun_el", "sun_az", "earth_el", "earth_az", "sun_visible", "earth_visible"];

for (const arrName of requiredArrays) {
  if (Array.isArray(ser[arrName]) && ser[arrName].length === 720) {
    console.log(`  ✓ ${arrName} populated with exactly 720 hourly points`);
  } else {
    console.error(`  ✗ ${arrName} is missing or has invalid length:`, ser[arrName]?.length);
    process.exit(1);
  }
}

// 3. evaluateAtHour Integration Verification
console.log("\n3. evaluateAtHour() Telemetry Readout Verification:");
const evalH0 = evalHour(customSite, 0);
const evalH100 = evalHour(customSite, 100);
const evalH360 = evalHour(customSite, 360);

if (evalH0 && evalH100 && evalH360) {
  console.log(`  ✓ evaluateAtHour(customSite, 0): Sun El=${evalH0.sunEl}°, Az=${evalH0.sunAz}°, Earth El=${evalH0.earthEl}°, Vis=${evalH0.isSunVis}`);
  console.log(`  ✓ evaluateAtHour(customSite, 100): Sun El=${evalH100.sunEl}°, Az=${evalH100.sunAz}°, Earth El=${evalH100.earthEl}°, Vis=${evalH100.isSunVis}`);
  console.log(`  ✓ evaluateAtHour(customSite, 360): Sun El=${evalH360.sunEl}°, Az=${evalH360.sunAz}°, Earth El=${evalH360.earthEl}°, Vis=${evalH360.isSunVis}`);
} else {
  console.error("  ✗ evaluateAtHour() returned null on custom site!");
  process.exit(1);
}

if (typeof evalH100.nextSunsetHrs === "number" && typeof evalH100.nextSunriseHrs === "number") {
  console.log(`  ✓ Dynamic eclipse countdowns functioning: Sunset in ${evalH100.nextSunsetHrs}h, Sunrise in ${evalH100.nextSunriseHrs}h`);
} else {
  console.error("  ✗ Eclipse countdowns missing!");
  process.exit(1);
}

// 4. Verification across Polar vs Equatorial Latitudes
console.log("\n4. Latitude Behavior Verification:");
const equatorialSite = synth(0.0, 45.0);
const eqEval = evalHour(equatorialSite, 48); // Near local noon at lon 45°
console.log(`  ✓ Equatorial Custom Site (lat 0°, lon 45°) at hour 48 -> Sun El=${eqEval.sunEl}° (Expected high diurnal transit)`);
if (eqEval.sunEl > 40.0) {
  console.log("  ✓ Equatorial sun elevation reflects authentic high diurnal arc (> 40°)");
} else {
  console.error("  ✗ Equatorial sun elevation out of expected diurnal range:", eqEval.sunEl);
  process.exit(1);
}

console.log(`  ✓ Custom Site summary metrics: daylight_pct=${customSite.summary_metrics.daylight_pct}%, continuous_sunlight_max_hrs=${customSite.summary_metrics.continuous_sunlight_max_hrs}h`);

console.log("\n✅ All synthesizeCustomSite() 720-hour ephemeris series tests passed successfully!\n");
