const fs = require('fs');
const path = require('path');

// Simulate a browser DOM
const html = fs.readFileSync(path.join(__dirname, '../components/timeline/timeline.html'), 'utf8');

// Basic DOM parser mock
const domMap = {};

// Parse all IDs from html
const idRegex = /id="([^"]+)"/g;
let match;
while ((match = idRegex.exec(html)) !== null) {
  const id = match[1];
  domMap[id] = {
    id: id,
    value: '48',
    textContent: '',
    innerHTML: '',
    style: {},
    classList: {
      add: () => {},
      remove: () => {},
      toggle: () => {}
    },
    addEventListener: (evt, fn) => {},
    setAttribute: () => {},
    removeAttribute: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    contains: () => false,
    closest: () => null
  };
}

global.document = {
  readyState: 'complete',
  getElementById: (id) => domMap[id] || null,
  querySelectorAll: (sel) => [],
  addEventListener: () => {},
  activeElement: null
};

global.window = {
  currentCockpitTool: 'grab',
  eventBus: {
    emit: (name, data) => console.log('eventBus.emit:', name, data),
    on: (name, fn) => console.log('eventBus.on:', name)
  }
};

try {
  const code = fs.readFileSync(path.join(__dirname, '../components/timeline/timeline.js'), 'utf8');
  eval(code);
  console.log('✅ timeline.js executed without throwing in simulated DOM!');
} catch (err) {
  console.error('❌ RUNTIME ERROR IN timeline.js:', err);
}
