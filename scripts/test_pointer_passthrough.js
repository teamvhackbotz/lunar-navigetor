/**
 * Test Suite: Touch and Pointer-Events Passthrough on 3D Moon Viewport
 * File: scripts/test_pointer_passthrough.js
 */

const fs = require("fs");
const path = require("path");

function runTests() {
  console.log("--- Testing Touch & Pointer-Events Passthrough over 3D Moon Viewport ---\n");

  const stylesCss = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const cardsCss = fs.readFileSync(path.join(__dirname, "../components/comparison_cards/comparison_cards.css"), "utf8");
  const moon3dJs = fs.readFileSync(path.join(__dirname, "../components/moon_3d/moon_3d.js"), "utf8");

  // 1. Verify styles.css rules
  console.log("1. styles.css Corridor Passthrough Rules:");
  const checkedDrawerRule = stylesCss.match(/#toggle-top-cards:checked\s*~[^{]+{([^}]+)}/);
  if (!checkedDrawerRule || !checkedDrawerRule[1].includes("pointer-events: none")) {
    throw new Error("FAIL: #toggle-top-cards:checked must set pointer-events: none on drawer-top-cards");
  }
  console.log("  ✓ #toggle-top-cards:checked sets pointer-events: none on .drawer-top-cards");

  const carouselStyleRule = stylesCss.match(/\.carousel-container\s*{([^}]+)}/);
  if (!carouselStyleRule || !carouselStyleRule[1].includes("pointer-events: none")) {
    throw new Error("FAIL: styles.css .carousel-container must set pointer-events: none");
  }
  console.log("  ✓ styles.css .carousel-container sets pointer-events: none");

  if (!stylesCss.includes(".site-card-column") || !stylesCss.includes("pointer-events: auto")) {
    throw new Error("FAIL: styles.css must re-enable pointer-events: auto on site-card-column");
  }
  console.log("  ✓ styles.css re-enables pointer-events: auto on cards");

  // 2. Verify comparison_cards.css rules
  console.log("\n2. comparison_cards.css Passthrough Rules:");
  const cardsDrawerRule = cardsCss.match(/\.drawer-top-cards\s*{([^}]+)}/);
  if (!cardsDrawerRule || !cardsDrawerRule[1].includes("pointer-events: none")) {
    throw new Error("FAIL: comparison_cards.css .drawer-top-cards must set pointer-events: none");
  }
  console.log("  ✓ comparison_cards.css .drawer-top-cards sets pointer-events: none");

  const toolbarRule = cardsCss.match(/\.cards-corridor-toolbar\s*{([^}]+)}/);
  if (!toolbarRule || !toolbarRule[1].includes("pointer-events: none")) {
    throw new Error("FAIL: .cards-corridor-toolbar must set pointer-events: none");
  }
  console.log("  ✓ .cards-corridor-toolbar sets pointer-events: none");

  const controlsRule = cardsCss.match(/\.cards-comparison-controls\s*{([^}]+)}/);
  if (!controlsRule || !controlsRule[1].includes("pointer-events: none")) {
    throw new Error("FAIL: .cards-comparison-controls must set pointer-events: none");
  }
  console.log("  ✓ .cards-comparison-controls sets pointer-events: none");

  const cardsCarouselRule = cardsCss.match(/\.carousel-container\s*{([^}]+)}/);
  if (!cardsCarouselRule || !cardsCarouselRule[1].includes("pointer-events: none")) {
    throw new Error("FAIL: comparison_cards.css .carousel-container must set pointer-events: none");
  }
  console.log("  ✓ comparison_cards.css .carousel-container sets pointer-events: none");

  if (!cardsCss.includes(".site-card-column") || !cardsCss.includes("pointer-events: auto")) {
    throw new Error("FAIL: comparison_cards.css must re-enable pointer-events: auto on cards");
  }
  console.log("  ✓ comparison_cards.css re-enables pointer-events: auto on cards");

  // 3. Verify moon_3d.js controls & touch events
  console.log("\n3. moon_3d.js OrbitControls & Touch Handling:");
  if (moon3dJs.includes("controls.enabled = currentTool === \"grab\"")) {
    throw new Error("FAIL: controls.enabled must not be disabled when tool is mark");
  }
  if (!moon3dJs.includes("controls.enabled = true")) {
    throw new Error("FAIL: controls.enabled must remain true");
  }
  console.log("  ✓ controls.enabled remains enabled in both grab and mark modes");

  if (!moon3dJs.includes('renderer.domElement.addEventListener("touchstart"')) {
    throw new Error("FAIL: renderer.domElement must listen for touchstart");
  }
  console.log("  ✓ renderer.domElement records touchstart coordinates for mobile devices");

  if (!moon3dJs.includes('window.eventBus.emit("tool:set", { tool: "grab" })')) {
    throw new Error("FAIL: moon_3d.js must emit tool:set with grab after placing pin");
  }
  console.log("  ✓ moon_3d.js reverts tool to grab upon placing a site pin");

  console.log("\n✅ All Touch & Pointer-Events Passthrough tests passed successfully!");
}

runTests();
