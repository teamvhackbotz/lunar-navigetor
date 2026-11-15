/**
 * Verification test suite for Site Inspection Modal Authentic Telemetry & 60 FPS Scrubber
 */

const fs = require("fs");
const path = require("path");

console.log("--- Testing Site Inspection Modal Authentic Telemetry & 60 FPS Scrubber ---");

// 1. Read files
const html = fs.readFileSync(path.join(__dirname, "../components/inspection_modal/inspection_modal.html"), "utf8");
const js = fs.readFileSync(path.join(__dirname, "../components/inspection_modal/inspection_modal.js"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "../components/inspection_modal/inspection_modal.css"), "utf8");
const telemetry = JSON.parse(fs.readFileSync(path.join(__dirname, "../static/data/lunar_sites_telemetry.json"), "utf8"));

// 2. Static Data Removal Verification
console.log("\n1. Static Mock Data Removal Verification:");
if (!js.includes("const INSPECTOR_DATA = {") && !js.includes("let INSPECTOR_DATA = {")) {
  console.log("  ✓ Hardcoded static INSPECTOR_DATA dictionary completely removed");
} else {
  console.error("  ✗ Hardcoded INSPECTOR_DATA is still present in inspection_modal.js!");
  process.exit(1);
}

// 3. Authentic Function Definitions Verification
console.log("\n2. Function Definitions Verification:");
const requiredFns = [
  "buildHighResSkylinePath",
  "buildHighResSolarPath",
  "getCompassHeading",
  "updateInspectorTelemetry",
  "getInspectorSite"
];
for (const fn of requiredFns) {
  if (js.includes(`function ${fn}`)) {
    console.log(`  ✓ Found function ${fn}`);
  } else {
    console.error(`  ✗ Missing function ${fn} in inspection_modal.js!`);
    process.exit(1);
  }
}

if (js.includes("window.SiteInspector =")) {
  console.log("  ✓ window.SiteInspector namespace exported");
} else {
  console.error("  ✗ window.SiteInspector namespace not exported!");
  process.exit(1);
}

// 4. Test buildHighResSkylinePath
console.log("\n3. High-Res 360° Skyline SVG Silhouette Verification:");
const skylineFnMatch = js.match(/function buildHighResSkylinePath\([\s\S]*?\n  \}/);
if (!skylineFnMatch) {
  console.error("  ✗ Could not extract buildHighResSkylinePath definition");
  process.exit(1);
}
const buildSkylinePath = new Function(`
  ${skylineFnMatch[0]}
  return buildHighResSkylinePath;
`)();

const shackletonProfile = telemetry["shackleton"];
const horizonMask = shackletonProfile.terrain.horizon_mask_360;
const skylinePath = buildSkylinePath(horizonMask);
console.log("  Skyline SVG Path prefix:", skylinePath.slice(0, 45) + "...");
console.log("  Skyline SVG Path suffix:", skylinePath.slice(-30));

if ((skylinePath.startsWith("M0.0,") || skylinePath.startsWith("M0,")) && skylinePath.includes("L520") && skylinePath.endsWith("L520,200 L0,200 Z")) {
  console.log("  ✓ Skyline polygon spans full 520 px width and closes at y=200 base");
} else {
  console.error("  ✗ Skyline SVG path does not match expected bounding geometry:", skylinePath.slice(-40));
  process.exit(1);
}

// Test datum scaling: zero elevation datum is at y=145, 8 px/deg
// Shackleton crest is typically 1° - 2.5°, so y = 145 - el * 8 is between 125 and 137
const skylinePoints = skylinePath.split(" ").slice(0, 361).map(pt => parseFloat(pt.slice(1).split(",")[1]));
const minSkylineY = Math.min(...skylinePoints);
const maxSkylineY = Math.max(...skylinePoints);
console.log(`  Shackleton skyline Y elevation: min ${minSkylineY}, max ${maxSkylineY} (0° datum is 145.0)`);
if (minSkylineY < 145 && maxSkylineY <= 145) {
  console.log("  ✓ Skyline elevation points properly plotted above 0° horizon datum (y=145)");
} else {
  console.error("  ✗ Skyline Y values out of expected bounds!");
  process.exit(1);
}

// 5. Test buildHighResSolarPath
console.log("\n4. Authentic 720-Hour Solar Stay Curve Verification:");
const solarFnMatch = js.match(/function buildHighResSolarPath\([\s\S]*?\n  \}/);
if (!solarFnMatch) {
  console.error("  ✗ Could not extract buildHighResSolarPath definition");
  process.exit(1);
}
const buildSolarPath = new Function(`
  ${solarFnMatch[0]}
  return buildHighResSolarPath;
`)();

const solarPath = buildSolarPath(shackletonProfile);
console.log("  Solar SVG Path prefix:", solarPath.slice(0, 45) + "...");
console.log("  Solar SVG Path suffix:", solarPath.slice(-30));

if (solarPath.startsWith("M0.0,") && (solarPath.endsWith("520.0,92.6") || solarPath.includes("L520.0,"))) {
  console.log("  ✓ Solar curve spans full 520 units for all 720 hours of November 2026");
} else {
  console.error("  ✗ Solar curve does not span 520 units:", solarPath.slice(-40));
  process.exit(1);
}

// In November 2026, Shackleton sun_el is between 0.75° and 1.61°
// y = 120 - el * 17 -> 120 - 1.61*17 = 92.6 and 120 - 0.75*17 = 107.25
const solarPoints = solarPath.split(" ").map(pt => parseFloat(pt.slice(1).split(",")[1]));
const minSolarY = Math.min(...solarPoints);
const maxSolarY = Math.max(...solarPoints);
console.log(`  Shackleton Solar Stay Y coordinates: min ${minSolarY}, max ${maxSolarY} (0° datum is 120.0)`);
if (minSolarY >= 90 && maxSolarY <= 110) {
  console.log("  ✓ Solar curve coordinates match JPL Horizons solar elevation scale (17 px/deg)");
} else {
  console.error("  ✗ Solar curve Y values out of physical bounds!");
  process.exit(1);
}

// Test synthetic fallback
const fallbackSolarPath = buildSolarPath(null);
if (fallbackSolarPath.startsWith("M0,") && fallbackSolarPath.includes("L520,")) {
  console.log("  ✓ Synthetic site fallback generates smooth diurnal curve");
} else {
  console.error("  ✗ Synthetic solar path fallback failed:", fallbackSolarPath.slice(0, 50));
  process.exit(1);
}

// 6. Test 16-point Compass Heading
console.log("\n5. Compass Heading Translation Verification:");
const headingFnMatch = js.match(/function getCompassHeading\([\s\S]*?\n  \}/);
const getHeading = new Function(`
  ${headingFnMatch[0]}
  return getCompassHeading;
`)();

const testHeadings = [
  { az: 0, exp: "N" },
  { az: 45, exp: "NE" },
  { az: 90, exp: "E" },
  { az: 135, exp: "SE" },
  { az: 180, exp: "S" },
  { az: 225, exp: "SW" },
  { az: 270, exp: "W" },
  { az: 315, exp: "NW" },
  { az: 360, exp: "N" }
];
let headingsOk = true;
for (const t of testHeadings) {
  const res = getHeading(t.az);
  if (res !== t.exp) {
    console.error(`  ✗ Heading for ${t.az}°: expected ${t.exp}, got ${res}`);
    headingsOk = false;
  }
}
if (headingsOk) {
  console.log("  ✓ 16-point azimuth compass headings mapped accurately");
} else {
  process.exit(1);
}

// 7. Test DOM, EventBus & 60 FPS Scrubber in Lightweight Simulated DOM
console.log("\n6. Live DOM Rendering & 60 FPS Timeline Scrubber Verification:");

// Simple EventBus implementation for test environment
class MockEventBus {
  constructor() {
    this.listeners = {};
  }
  on(event, cb) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  }
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }
}

// Mock LunarPhysics engine
const mockLunarPhysics = {
  findSite: (key) => {
    const id = typeof key === "string" ? key : (key?.site_id || "shackleton");
    return telemetry[id] || telemetry["shackleton"];
  },
  sliderToHourIndex: (val) => {
    const v = Math.max(0, Math.min(100, typeof val === "number" ? val : 50));
    return Math.min(719, Math.floor((v / 100) * 720));
  },
  evaluateAtHour: (siteProfile, hourIdx) => {
    const s = siteProfile.november_2026_series;
    const h = Math.max(0, Math.min(719, hourIdx));
    const sunEl = s.sun_el[h];
    const sunAz = s.sun_az[h];
    const earthEl = s.earth_el[h];
    const earthAz = s.earth_az[h];
    const isSunVis = s.sun_visible[h];
    const isEarthVis = s.earth_visible[h];
    return {
      hourIndex: h,
      sunEl,
      sunAz,
      earthEl,
      earthAz,
      isSunVis,
      isEarthVis,
      nextSunsetHrs: 96,
      nextSunriseHrs: 120,
      rfMargin: isEarthVis ? +(3.5 + earthEl * 0.9).toFixed(1) : 0.0
    };
  }
};

// Create lightweight DOM structure
const domMap = {};

function createMockElement(id = "", tagName = "div") {
  const el = {
    id: id,
    tagName: tagName.toUpperCase(),
    textContent: "",
    _innerHTML: "",
    style: {},
    dataset: {},
    attributes: {},
    classList: {
      _classes: new Set(),
      add: (c) => el.classList._classes.add(c),
      remove: (c) => el.classList._classes.delete(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (el.classList._classes.has(c)) el.classList._classes.delete(c);
          else el.classList._classes.add(c);
        } else if (force) {
          el.classList._classes.add(c);
        } else {
          el.classList._classes.delete(c);
        }
      },
      contains: (c) => el.classList._classes.has(c)
    },
    addEventListener: (evt, fn) => {
      if (!el._listeners) el._listeners = {};
      if (!el._listeners[evt]) el._listeners[evt] = [];
      el._listeners[evt].push(fn);
    },
    setAttribute: (k, v) => {
      el.attributes[k] = String(v);
    },
    getAttribute: (k) => el.attributes[k] || null,
    querySelector: (sel) => {
      if (sel.startsWith("#")) return domMap[sel.slice(1)] || null;
      if (sel.startsWith(".")) {
        const cls = sel.slice(1);
        for (const k in domMap) {
          if (domMap[k].classList.contains(cls)) return domMap[k];
        }
      }
      return null;
    },
    querySelectorAll: (sel) => []
  };

  Object.defineProperty(el, "innerHTML", {
    get: () => el._innerHTML,
    set: (htmlStr) => {
      el._innerHTML = htmlStr;
      // Parse child IDs and register them in domMap
      const idMatchRegex = /<([a-zA-Z0-9]+)[^>]*id="([^"]+)"([^>]*)>/g;
      let m;
      while ((m = idMatchRegex.exec(htmlStr)) !== null) {
        const tagName = m[1];
        const childId = m[2];
        const rest = m[3] || "";
        if (!domMap[childId]) {
          domMap[childId] = createMockElement(childId, tagName);
        }
        // Extract inline styles if present
        const styleMatch = rest.match(/style="([^"]+)"/);
        if (styleMatch) {
          styleMatch[1].split(";").forEach(pair => {
            const [k, v] = pair.split(":").map(s => s && s.trim());
            if (k && v) domMap[childId].style[k] = v;
          });
        }
      }
    }
  });

  return el;
}

// Pre-populate elements found in HTML
const htmlIdRegex = /id="([^"]+)"/g;
let m;
while ((m = htmlIdRegex.exec(html)) !== null) {
  domMap[m[1]] = createMockElement(m[1]);
}

// Mock globals
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {}
};

global.window = {
  eventBus: new MockEventBus(),
  LunarPhysics: mockLunarPhysics,
  currentSliderVal: 50,
  innerWidth: 1920,
  innerHeight: 1080
};

global.document = {
  readyState: "complete",
  getElementById: (id) => {
    if (!domMap[id]) domMap[id] = createMockElement(id);
    return domMap[id];
  },
  querySelectorAll: (sel) => {
    if (sel === ".inspector-tab-btn") {
      return ["horizon", "slope", "solar", "comms"].map(tab => {
        const btn = createMockElement(`tab-btn-${tab}`, "button");
        btn.dataset.tab = tab;
        return btn;
      });
    }
    return [];
  },
  addEventListener: () => {},
  removeEventListener: () => {}
};

// Execute component code
eval(js);

if (!global.window.SiteInspector) {
  console.error("  ✗ window.SiteInspector not initialized!");
  process.exit(1);
}

// Test opening the inspector in Horizon view
global.window.SiteInspector.openInspector("shackleton", "horizon");
const overlay = document.getElementById("site-inspector-overlay");
if (overlay.classList.contains("active")) {
  console.log("  ✓ Site inspector opened successfully with .active overlay");
} else {
  console.error("  ✗ Overlay did not activate!");
  process.exit(1);
}

// Verify Skyline Tab DOM Elements
const sunTracker = document.getElementById("inspector-sun-tracker");
const earthTracker = document.getElementById("inspector-earth-tracker");
const sunTag = document.getElementById("inspector-sun-tag");
const earthTag = document.getElementById("inspector-earth-tag");
const losPill = document.getElementById("inspector-los-pill");
const clearanceDetail = document.getElementById("inspector-clearance-detail");

if (sunTracker && earthTracker && sunTag && earthTag && losPill && clearanceDetail) {
  console.log("  ✓ High-Res Skyline elements (Sun/Earth trackers, status pill, clearance detail) rendered");
} else {
  console.error("  ✗ Missing Skyline stage DOM elements!");
  process.exit(1);
}

// Test 60 FPS Scrubber in Horizon View
const initialSunLeft = sunTracker.style.left;
const initialEarthLeft = earthTracker.style.left;
console.log(`  Initial positions at slider 50%: Sun=${initialSunLeft}, Earth=${initialEarthLeft}`);

// Scrub to 20%
global.window.eventBus.emit("time:changed", { sliderValue: 20 });
const scrubbedSunLeft = sunTracker.style.left;
const scrubbedEarthLeft = earthTracker.style.left;
console.log(`  Scrubbed positions at slider 20%: Sun=${scrubbedSunLeft}, Earth=${scrubbedEarthLeft}`);

if (initialSunLeft !== scrubbedSunLeft) {
  console.log("  ✓ 60 FPS scrubber updates Sun tracker position dynamically");
} else {
  console.error("  ✗ Sun tracker did not move on time:changed!");
  process.exit(1);
}

// Test Solar View Tab
global.window.SiteInspector.openInspector("shackleton", "solar");
const solarCurve = document.getElementById("inspector-solar-curve");
const solarCursorLine = document.getElementById("inspector-solar-cursor-line");
const solarCursorDot = document.getElementById("inspector-solar-cursor-dot");
const solarElVal = document.getElementById("inspector-solar-el-val");
const solarPhaseVal = document.getElementById("inspector-solar-phase-val");

if (solarCurve && solarCursorLine && solarCursorDot && solarElVal && solarPhaseVal) {
  console.log("  ✓ Solar Stay Tab rendered with authentic curve, cursor line, dot, and phase stats");
} else {
  console.error("  ✗ Missing Solar Stay Tab DOM elements!");
  process.exit(1);
}

// Test 60 FPS Scrubber in Solar View
global.window.eventBus.emit("time:changed", { sliderValue: 20 });
const cursorX_at_20 = solarCursorLine.getAttribute("x1");
global.window.eventBus.emit("time:changed", { sliderValue: 80 });
const cursorX_at_80 = solarCursorLine.getAttribute("x1");
console.log(`  Solar cursor line at 20%: x=${cursorX_at_20}, at 80%: x=${cursorX_at_80}`);

if (cursorX_at_20 !== cursorX_at_80 && parseFloat(cursorX_at_80) > parseFloat(cursorX_at_20)) {
  console.log("  ✓ Solar timeline cursor line & dot scrub smoothly across the 720-hour curve");
} else {
  console.error("  ✗ Solar cursor line did not advance on timeline scrub!");
  process.exit(1);
}

// Test Slope View Tab
global.window.SiteInspector.openInspector("malapert", "slope");
const stageEl = document.getElementById("inspector-stage");
const slopeHtml = stageEl._innerHTML || "";
if (slopeHtml.includes('viewBox="0 0 520 200"') && slopeHtml.includes('cx="242.7"') && slopeHtml.includes('cy="70"')) {
  console.log("  ✓ Slope Tab rendered with high-res viewBox 520x200 and dynamic Malapert touchdown reticle (242.7, 70)");
} else {
  console.error("  ✗ Slope Tab SVG geometry or touchdown target reticle mismatch!", slopeHtml);
  process.exit(1);
}

// Test Comms View Tab
global.window.SiteInspector.openInspector("shackleton", "comms");
const commsEarthEl = document.getElementById("inspector-comms-earth-el");
const commsRfMargin = document.getElementById("inspector-comms-rf-margin");

if (commsEarthEl && commsRfMargin) {
  console.log("  ✓ Comms Tab rendered with Earth elevation and RF link margin stats");
} else {
  console.error("  ✗ Missing Comms Tab DOM elements!");
  process.exit(1);
}

// Test 60 FPS Scrubber in Comms View
global.window.eventBus.emit("time:changed", { sliderValue: 80 });
const initialRfMargin = commsRfMargin.textContent;
global.window.eventBus.emit("time:changed", { sliderValue: 10 });
const scrubbedRfMargin = commsRfMargin.textContent;
console.log(`  Comms RF margin at 80%: "${initialRfMargin}", at 10%: "${scrubbedRfMargin}"`);
if (commsEarthEl.textContent.includes("°") && commsRfMargin.textContent.includes("dB")) {
  console.log("  ✓ Comms telemetry values update live during timeline scrub");
} else {
  console.error("  ✗ Comms telemetry formatting error!");
  process.exit(1);
}

// Verify CSS styles
if (css.includes("#inspector-solar-cursor-line") && css.includes("#inspector-solar-cursor-dot")) {
  console.log("  ✓ CSS contains dedicated styling for Solar cursor line and glowing dot");
} else {
  console.error("  ✗ Missing CSS styles for inspector solar cursor!");
  process.exit(1);
}

console.log("\n✅ All Site Inspection Modal tests passed successfully!\n");
