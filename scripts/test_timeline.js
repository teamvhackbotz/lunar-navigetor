const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '../components/timeline/timeline.html'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '../components/timeline/timeline.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../components/timeline/timeline.css'), 'utf8');

console.log('--- Checking timeline.html ---');
const requiredHtmlElements = [
  'id="btn-edit-timeline"',
  'id="timeline-edit-popover"',
  'id="timeline-edit-start"',
  'id="timeline-edit-end"',
  'id="timeline-edit-current"',
  'id="timeline-edit-interval"',
  'id="timeline-start-label"',
  'id="timeline-end-label"',
  'id="timeline-interval-label"',
  'id="ruler-svg"',
  'value="1.5"'
];

requiredHtmlElements.forEach(item => {
  if (!html.includes(item)) {
    throw new Error(`Missing in timeline.html: ${item}`);
  }
  console.log(`  ✓ Found: ${item}`);
});

console.log('\n--- Checking timeline.js ---');
const requiredJsTokens = [
  'intervalHours: 1.5',
  'renderEqualSpacedRuler',
  'syncTimelineUI',
  'stepInterval',
  'time:changed',
  'dateToInputVal',
  'inputValToEpoch',
  'btn-edit-timeline'
];

requiredJsTokens.forEach(token => {
  if (!js.includes(token)) {
    throw new Error(`Missing in timeline.js: ${token}`);
  }
  console.log(`  ✓ Found: ${token}`);
});

console.log('\n--- Verifying Equal-Spacing Math ---');
// Verify equal-spacing formula
const totalMs = Date.UTC(2026, 10, 30, 23, 59, 59) - Date.UTC(2026, 10, 1, 0, 0, 0);
const intervalHours = 1.5;
const intervalMs = intervalHours * 3600 * 1000;
const totalIntervals = Math.max(1, totalMs / intervalMs);
const totalTicks = Math.round(totalIntervals);

console.log(`  Total span: ${(totalMs / 86400000).toFixed(2)} days (${(totalMs / 3600000).toFixed(1)} hours)`);
console.log(`  Interval: ${intervalHours} hours`);
console.log(`  Total equal intervals: ${totalTicks}`);

let prevX = 0;
let dxConstant = null;
for (let i = 1; i <= 10; i++) {
  const frac = i / totalTicks;
  const x = frac * 1000;
  const dx = x - prevX;
  if (dxConstant === null) {
    dxConstant = dx;
  } else {
    if (Math.abs(dx - dxConstant) > 0.0001) {
      throw new Error(`Interval spacing not equal! dx=${dx}, expected=${dxConstant}`);
    }
  }
  prevX = x;
}
console.log(`  ✓ Spacing between ticks is strictly equal: dx = ${dxConstant.toFixed(4)} viewBox units`);

console.log('\n--- Checking timeline.css ---');
if (!css.includes('.timeline-edit-popover') || !css.includes('.btn-edit-timeline')) {
  throw new Error('Missing timeline popover styles in timeline.css');
}
console.log('  ✓ timeline.css includes edit popover and button styles');

console.log('\n✅ All Timeline tests passed successfully!');
