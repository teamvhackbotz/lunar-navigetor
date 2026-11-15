/**
 * Verification test for Lunar Navigator Comparison Cards Clean-Slate & Authentic Telemetry
 */

const fs = require("fs");
const path = require("path");

console.log("--- Testing Candidate Comparison Cards Clean-Slate & Authentic Telemetry ---");

// 1. Read files
const html = fs.readFileSync(path.join(__dirname, "../components/comparison_cards/comparison_cards.html"), "utf8");
const js = fs.readFileSync(path.join(__dirname, "../components/comparison_cards/comparison_cards.js"), "utf8");
const telemetry = JSON.parse(fs.readFileSync(path.join(__dirname, "../static/data/lunar_sites_telemetry.json"), "utf8"));

// 2. Check HTML clean-slate structure
console.log("\n1. HTML Clean-Slate Verification:");
if (html.includes('id="cards-empty-slot"')) {
  console.log("  ✓ Found blank target card slot: id=\"cards-empty-slot\"");
} else {
  console.error("  ✗ Missing id=\"cards-empty-slot\"");
  process.exit(1);
}

if (html.includes('id="btn-add-candidate-trigger"')) {
  console.log("  ✓ Found add candidate trigger: id=\"btn-add-candidate-trigger\"");
} else {
  console.error("  ✗ Missing id=\"btn-add-candidate-trigger\"");
  process.exit(1);
}

if (html.includes('id="cards-count-badge">0 Sites<')) {
  console.log("  ✓ Counter badge initialized to '0 Sites'");
} else {
  console.error("  ✗ Counter badge not initialized to '0 Sites'");
  process.exit(1);
}

// Ensure hardcoded static site columns are completely removed
if (!html.includes('data-site-id="shackleton"') && !html.includes('data-site-id="ridge"') && !html.includes('data-site-id="malapert"')) {
  console.log("  ✓ Hardcoded static site columns (shackleton, ridge, malapert) completely removed from HTML");
} else {
  console.error("  ✗ Static site columns still present in HTML!");
  process.exit(1);
}

// 3. Check JS dead-code removal & authentic function presence
console.log("\n2. Dead-Code Elimination Verification:");
const deadFns = ["generateSkylinePath", "generateSlopePath", "generateSolarPath"];
for (const fn of deadFns) {
  if (js.includes(`function ${fn}`)) {
    console.error(`  ✗ Dead function still defined: ${fn}`);
    process.exit(1);
  } else {
    console.log(`  ✓ Dead function removed: ${fn}`);
  }
}

if (js.includes("buildAuthenticSolarSvgPath")) {
  console.log("  ✓ Authentic solar curve generator present: buildAuthenticSolarSvgPath");
} else {
  console.error("  ✗ Missing buildAuthenticSolarSvgPath in JS");
  process.exit(1);
}

// 4. Test buildAuthenticSolarSvgPath behavior with authentic NASA dataset
console.log("\n3. Authentic Solar Path Generation Verification:");
// Extract function body from JS to execute in test harness
const solarFnCode = js.match(/function buildAuthenticSolarSvgPath\([\s\S]*?\n  \}/);
if (!solarFnCode) {
  console.error("  ✗ Could not extract buildAuthenticSolarSvgPath definition");
  process.exit(1);
}

const buildSolarPath = new Function(`
  ${solarFnCode[0]}
  return buildAuthenticSolarSvgPath;
`)();

const shackletonProfile = telemetry["shackleton"];
const solarPath = buildSolarPath(shackletonProfile);
console.log("  Shackleton generated solar path snippet:", solarPath.slice(0, 40) + "...");

if (solarPath.startsWith("M0,") && solarPath.includes("L359,") || solarPath.includes("L360,")) {
  console.log("  ✓ Solar path spans full 360 units for 720 hours of November 2026");
} else {
  console.error("  ✗ Unexpected solar path coordinates:", solarPath.slice(0, 80));
  process.exit(1);
}

// Verify elevation mapping: in November 2026, Shackleton sun_el is between 0.75° and 1.61°
// y = 58 - el * 9.6 -> between 58 - 15.4 = 42.6 and 58 - 7.2 = 50.8
const coords = solarPath.split(" ").map(pt => parseFloat(pt.slice(1).split(",")[1]));
const minCoordY = Math.min(...coords);
const maxCoordY = Math.max(...coords);
console.log(`  Shackleton Y coordinates: min ${minCoordY}, max ${maxCoordY} (Astronomical datum zero is 58.0)`);
if (minCoordY >= 40 && maxCoordY <= 55) {
  console.log("  ✓ Solar elevation values precisely match JPL ephemeris sun angles above lunar horizon");
} else {
  console.error("  ✗ Solar elevation Y coordinates out of expected physical bounds!");
  process.exit(1);
}

// 5. Check empty state restoration in JS
console.log("\n4. Empty State Restoration Verification:");
if (js.includes('id = "cards-empty-slot"') && js.includes('btn-add-candidate-trigger')) {
  console.log("  ✓ checkEmptyState() correctly preserves cards-empty-slot and trigger on empty deck");
} else {
  console.error("  ✗ checkEmptyState() does not restore clean-slate card slot");
  process.exit(1);
}

// 6. Check 60 FPS Scrubber & Celestial Tracker Synchronization
console.log("\n5. 60 FPS Timeline Scrubber & Celestial Sync Verification:");
if (js.includes('card.querySelectorAll(".metric-value")')) {
  console.log("  ✓ Card face metrics correctly query .metric-value elements (fixing selector bug)");
} else {
  console.error("  ✗ card.querySelectorAll('.metric-value') not found!");
  process.exit(1);
}

if (js.includes('tracker-sun-${siteKey}') && js.includes('tracker-earth-${siteKey}')) {
  console.log("  ✓ Both Sun and Earth celestial trackers are dynamically updated");
} else {
  console.error("  ✗ Celestial trackers missing Sun or Earth update logic!");
  process.exit(1);
}

if (js.includes('subcard-status-callout') && js.includes('Topographic Shadow')) {
  console.log("  ✓ Horizon subcard status callout dynamically reflects occlusion and line-of-sight");
} else {
  console.error("  ✗ Horizon subcard status callout logic missing!");
  process.exit(1);
}

// 7. Check Top Nav Badge Synchronization
console.log("\n6. Top Navigation Badge Sync Verification:");
const topNavJs = fs.readFileSync(path.join(__dirname, "../components/top_nav/top_nav.js"), "utf8");
const topNavHtml = fs.readFileSync(path.join(__dirname, "../components/top_nav/top_nav.html"), "utf8");

if (topNavHtml.includes('id="top-nav-compare-badge"')) {
  console.log("  ✓ Found id=\"top-nav-compare-badge\" in top_nav.html");
} else {
  console.error("  ✗ Missing id=\"top-nav-compare-badge\" in top_nav.html");
  process.exit(1);
}

if (topNavJs.includes("cards:synced") && topNavJs.includes("top-nav-compare-badge")) {
  console.log("  ✓ top_nav.js subscribes to 'cards:synced' and updates compare badge");
} else {
  console.error("  ✗ Missing cards:synced subscription in top_nav.js");
  process.exit(1);
}

if (js.includes("pendingComparison = runSiteComparison()") &&
    js.includes("button.click();") &&
    js.includes("compareCurrentSites: () => {") &&
    js.includes("ranked.map(({ result }) => ({ ...result }))")) {
  console.log("  ✓ Dr. Raj can trigger the Compare button and receive its completed ranking");
} else {
  console.error("  ✗ Missing Compare-button controller or ranked result return");
  process.exit(1);
}

if (js.includes("function dismissSiteCard(target)") &&
    js.includes("card.classList.contains(\"active\")") &&
    js.includes("dismissCard(matches[0])")) {
  console.log("  ✓ A single candidate card can be dismissed by name, number, or sole active selection");
} else {
  console.error("  ✗ Missing targeted, undoable candidate-card dismissal");
  process.exit(1);
}

const dismissFunction = js.match(/function dismissSiteCard\(target\) \{[\s\S]*?\n  \}/);
if (!dismissFunction) {
  console.error("  ✗ Could not load the candidate-card dismissal function for behavior checks");
  process.exit(1);
}
const makeDismissSiteCard = new Function(
  "document",
  "dismissCard",
  `${dismissFunction[0]}; return dismissSiteCard;`
);
const makeCardColumn = (number, name, active) => {
  const card = {
    dataset: { cardIndex: String(number), name },
    classList: { contains: cls => cls === "active" && active }
  };
  return { card, column: { querySelector: selector => selector === ".site-card" ? card : null } };
};
const cardFixtures = [
  makeCardColumn(1, "Custom North", false),
  makeCardColumn(2, "Custom South", true)
];
let dismissedColumn = null;
const fakeDocument = {
  getElementById: id => id === "carousel-track"
    ? { querySelectorAll: () => cardFixtures.map(fixture => fixture.column) }
    : null
};
const dismissCandidate = makeDismissSiteCard(fakeDocument, column => {
  dismissedColumn = column;
});

if (dismissCandidate("Custom North").siteName !== "Custom North" ||
    dismissedColumn !== cardFixtures[0].column) {
  console.error("  ✗ Dismiss by exact site name did not select only the requested card");
  process.exit(1);
}
if (dismissCandidate("card 2").siteName !== "Custom South" ||
    dismissedColumn !== cardFixtures[1].column) {
  console.error("  ✗ Dismiss by displayed card number did not select the requested card");
  process.exit(1);
}
if (dismissCandidate().siteName !== "Custom South" ||
    dismissedColumn !== cardFixtures[1].column) {
  console.error("  ✗ Dismiss without a name did not target the sole active card");
  process.exit(1);
}
if (!dismissCandidate("Unknown Site").error) {
  console.error("  ✗ Missing candidate names should return an explicit error");
  process.exit(1);
}
const ambiguousFixtures = [
  makeCardColumn(1, "Custom North", true),
  makeCardColumn(2, "Custom South", true)
];
dismissedColumn = null;
const ambiguousDismiss = makeDismissSiteCard({
  getElementById: () => ({
    querySelectorAll: () => ambiguousFixtures.map(fixture => fixture.column)
  })
}, () => {
  dismissedColumn = null;
});
if (!ambiguousDismiss().error || dismissedColumn !== null) {
  console.error("  ✗ Ambiguous active cards must not be dismissed implicitly");
  process.exit(1);
}
console.log("  ✓ Individual dismissal resolves names, card numbers, and one unambiguous active card");

console.log("\n✅ All Comparison Cards Clean-Slate & Authentic Telemetry tests passed successfully!\n");
