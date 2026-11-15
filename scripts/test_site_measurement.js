const assert = require("assert");
const fs = require("fs");
const path = require("path");

class MockElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.attributes = {};
    this.children = [];
    this.listeners = {};
    this.style = {};
    this.textContent = "";
    this.disabled = false;
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  addEventListener(name, callback) {
    this.listeners[name] = callback;
  }

  appendChild(child) {
    this.children.push(child);
  }

  remove() {
    this.removed = true;
  }

  contains(target) {
    return this === target || this.children.includes(target);
  }

  getBoundingClientRect() {
    return { width: 160, height: 40 };
  }

  focus() {}
}

const documentListeners = {};
global.document = {
  body: new MockElement("body"),
  addEventListener: (name, callback) => {
    documentListeners[name] = callback;
  },
  createElement: tagName => new MockElement(tagName)
};
global.window = { innerWidth: 1024, innerHeight: 768 };

eval(fs.readFileSync(path.join(__dirname, "../core/event_bus.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "../core/coord_math.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "../core/site_measurement.js"), "utf8"));

const siteA = {
  siteId: "connecting-ridge",
  name: "Connecting Ridge",
  lat: -89.4,
  lon: 222.6
};
const siteB = {
  siteId: "apollo-11",
  name: "Apollo 11",
  lat: 0.674,
  lon: 23.473
};
const emittedMeasurements = [];
window.eventBus.on("site-measurement:changed", measurement => {
  emittedMeasurements.push(measurement);
});

function contextEvent(shiftKey, site) {
  return {
    shiftKey,
    clientX: 100,
    clientY: 100,
    site,
    prevented: false,
    stopped: false,
    preventDefault() { this.prevented = true; },
    stopPropagation() { this.stopped = true; }
  };
}

const firstSelection = contextEvent(true, siteA);
window.SiteMeasurement.handleContextMenu(firstSelection, siteA);
assert(firstSelection.prevented && firstSelection.stopped, "Shift + right-click should be handled");
assert.deepStrictEqual(window.SiteMeasurement.getSelectedSites().map(site => site.siteId), [
  "connecting-ridge"
]);

window.SiteMeasurement.handleContextMenu(contextEvent(true, siteB), siteB);
assert.deepStrictEqual(window.SiteMeasurement.getSelectedSites().map(site => site.siteId), [
  "connecting-ridge",
  "apollo-11"
]);

const openMenuEvent = contextEvent(false, siteA);
window.SiteMeasurement.handleContextMenu(openMenuEvent, siteA);
const menu = document.body.children[0];
assert(openMenuEvent.prevented, "Right-click on a selected site should suppress the browser menu");
assert.strictEqual(menu.children.length, 1, "The site menu should contain only one action");
assert.strictEqual(menu.children[0].textContent, "Measure distance");
menu.children[0].listeners.click();

const measurement = window.SiteMeasurement.getMeasurement();
assert(Number.isFinite(measurement.distanceKm), "Measurement should have a finite distance");
assert.strictEqual(
  measurement.distanceKm,
  window.CoordMath.calculateDistanceKm(siteA.lat, siteA.lon, siteB.lat, siteB.lon)
);
assert.strictEqual(measurement.path.length, 97, "Route should include sampled points and endpoints");
assert.strictEqual(measurement.path[0].lat, siteA.lat);
assert.strictEqual(measurement.path[measurement.path.length - 1].lat, siteB.lat);
assert.strictEqual(emittedMeasurements[emittedMeasurements.length - 1], measurement);

window.SiteMeasurement.syncSites([siteA]);
assert.strictEqual(window.SiteMeasurement.getMeasurement(), null, "Removing a selected card should clear the route");
assert.deepStrictEqual(window.SiteMeasurement.getSelectedSites().map(site => site.siteId), [
  "connecting-ridge"
]);

documentListeners.keydown({ key: "Escape", preventDefault() {} });
assert.deepStrictEqual(window.SiteMeasurement.getSelectedSites(), [], "Escape should clear the selection");

assert(Number.isNaN(window.CoordMath.calculateDistanceKm(-91, 0, 0, 0)));
const antipodalPath = window.CoordMath.getGreatCirclePoints(0, 0, 0, 180, 8);
assert.strictEqual(antipodalPath.length, 9);
assert(Number.isFinite(antipodalPath[4].lon), "Antipodal routes should use a stable great-circle path");

console.log("Site selection, context menu, route measurement, and clearing tests passed.");
