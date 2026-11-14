/**
 * Verification test suite for LunarPhysics.findSite() multi-shape input resolution
 */

const fs = require("fs");
const path = require("path");

console.log("--- Testing LunarPhysics.findSite() Multi-Shape Resolution ---");

const telemetry = JSON.parse(fs.readFileSync(path.join(__dirname, "../static/data/lunar_sites_telemetry.json"), "utf8"));
const physicsJs = fs.readFileSync(path.join(__dirname, "../core/lunar_physics.js"), "utf8");

// Simple Mock EventBus
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

// Mock browser environment for lunar_physics.js
global.window = {
  eventBus: new MockEventBus()
};
global.document = {
  readyState: "complete",
  addEventListener: () => {}
};
global.fetch = () => Promise.resolve({
  ok: true,
  json: () => Promise.resolve(telemetry)
});

// Setup listener for catalog loading
global.window.eventBus.on("telemetry:loaded", () => {
  runTests();
});

// Execute lunar_physics.js
eval(physicsJs);

function runTests() {
  const findSite = global.window.LunarPhysics.findSite;

  if (typeof findSite !== "function") {
    console.error("  ✗ findSite is not exposed on window.LunarPhysics!");
    process.exit(1);
  }

  const testCases = [
    {
      name: "1. Direct slug ID key ('shackleton')",
      input: "shackleton",
      expectedId: "shackleton"
    },
    {
      name: "2. Case-insensitive slug ID ('SHACKLETON')",
      input: "SHACKLETON",
      expectedId: "shackleton"
    },
    {
      name: "3. Full official display name ('Connecting Ridge')",
      input: "Connecting Ridge",
      expectedId: "ridge"
    },
    {
      name: "4. Substring / partial name ('Apollo 11')",
      input: "Apollo 11",
      expectedId: "apollo-11"
    },
    {
      name: "5. Partial acronym ('VIPER')",
      input: "VIPER",
      expectedId: "viper-mouton"
    },
    {
      name: "6. Object with site_id ({ site_id: 'malapert' })",
      input: { site_id: "malapert" },
      expectedId: "malapert"
    },
    {
      name: "7. Object with siteKey ({ siteKey: 'ridge-ext' })",
      input: { siteKey: "ridge-ext" },
      expectedId: "ridge-ext"
    },
    {
      name: "8. Object with name ({ name: 'Faustini Rim A' })",
      input: { name: "Faustini Rim A" },
      expectedId: "faustini"
    },
    {
      name: "9. Numeric coordinates ({ lat: -89.6, lon: 129.2 })",
      input: { lat: -89.6, lon: 129.2 },
      expectedId: "shackleton"
    },
    {
      name: "10. String coordinates ({ lat: '-89.6', lon: '129.2' })",
      input: { lat: "-89.6", lon: "129.2" },
      expectedId: "shackleton"
    },
    {
      name: "11. Distant / uncataloged coordinate ({ lat: 0, lon: 0 }) -> null",
      input: { lat: 0, lon: 0 },
      expectedId: null
    },
    {
      name: "12. Empty / null input -> null",
      input: null,
      expectedId: null
    }
  ];

  let allPassed = true;

  for (const tc of testCases) {
    const result = findSite(tc.input);
    const actualId = result ? result.site_id : null;
    if (actualId === tc.expectedId) {
      console.log(`  ✓ ${tc.name} -> ${actualId || "null"}`);
    } else {
      console.error(`  ✗ ${tc.name} FAILED: expected ${tc.expectedId}, got ${actualId}`);
      allPassed = false;
    }
  }

  if (!allPassed) {
    console.error("\n❌ Some findSite() test cases failed!");
    process.exit(1);
  }

  console.log("\n✅ All 12 findSite() multi-shape resolution tests passed successfully!\n");
}
