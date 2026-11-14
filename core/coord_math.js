/**
 * ==============================================================================
 * Lunar Landing Site Navigator - Selenographic Coordinate & Cartographic Math
 * File: core/coord_math.js
 * Role: Shared cartographic transformations, forward/inverse projections,
 *       geodesic surface distances, and candidate site lookup database.
 * ==============================================================================
 */

const CoordMath = (function() {
  /**
   * Standard IAU mean volumetric radius of the Moon in kilometers.
   * Used for spherical geodesic distance calculations.
   */
  const MOON_RADIUS_KM = 1737.4;

  /**
   * Curated registry of landmark lunar exploration targets and candidate landing sites.
   * Includes Artemis III candidate zones, commercial landers (CLPS), and historical baselines.
   */
  const KNOWN_SITES = [
    { name: "Peak Near Shackleton", lat: -89.6, lon: 129.2, type: "Artemis III" },
    { name: "Connecting Ridge", lat: -89.4, lon: 222.6, type: "CLPS IM-2" },
    { name: "CSA Lunar Rover (LEAP)", lat: -89.2, lon: 218.0, type: "🇨🇦 CSA / Canadensys" },
    { name: "Faustini Rim A", lat: -87.1, lon: 67.0, type: "Artemis III" },
    { name: "Malapert Massif", lat: -85.9, lon: 2.9, type: "Artemis III" },
    { name: "Nobile Rim 2", lat: -84.2, lon: 60.7, type: "Artemis III" },
    { name: "Amundsen Rim", lat: -84.5, lon: 105.0, type: "Artemis III" },
    { name: "Chandrayaan-3", lat: -69.37, lon: 32.35, type: "ISRO Milestone" },
    { name: "Apollo 11", lat: 0.674, lon: 23.473, type: "Apollo Baseline" },
    { name: "Apollo 17", lat: 20.191, lon: 30.772, type: "Apollo Baseline" },
    { name: "Artemis II Flyby", lat: 0.0, lon: 180.0, type: "🇨🇦 Jeremy Hansen Trajectory" },
    { name: "Hermite Crater (North)", lat: 86.0, lon: 270.0, type: "North Cold Trap" }
  ];

  /**
   * Searches the curated site catalog for an entry within a specified angular tolerance.
   * If no known site matches, constructs a formatted custom coordinate object.
   *
   * @param {number} lat - Latitude in degrees (-90 to +90)
   * @param {number} lon - Longitude in degrees (0 to 360)
   * @param {number} maxDistanceDeg - Search threshold radius in degrees
   * @returns {Object} Matching known site object or generated custom site
   */
  function findNearestSite(lat, lon, maxDistanceDeg = 1.0) {
    for (const site of KNOWN_SITES) {
      const dLat = Math.abs(site.lat - lat);
      // Angular difference accounting for 360-degree modular wrap-around
      const dLon = Math.abs((site.lon - lon + 540) % 360 - 180);
      if (dLat < maxDistanceDeg && dLon < (maxDistanceDeg * 5)) {
        return site;
      }
    }
    return {
      name: `Custom (${Math.abs(lat).toFixed(2)}° ${lat < 0 ? 'S' : 'N'}, ${lon.toFixed(1)}° E)`,
      lat,
      lon,
      type: "Custom Coordinate"
    };
  }

  // ==========================================================================
  // 1. Cylindrical Equirectangular Projection (Center Flat Map)
  // Maps standard latitude [-90, +90] and longitude [-180, +180] linearly onto X/Y.
  // ==========================================================================

  /**
   * Converts selenographic (lat, lon) to 2D equirectangular pixel coordinates.
   *
   * @param {number} lat - Latitude (-90 to +90)
   * @param {number} lon - Longitude (0 to 360 or -180 to +180)
   * @param {number} width - Target viewport width in pixels
   * @param {number} height - Target viewport height in pixels
   * @returns {{x: number, y: number}} Pixel coordinates
   */
  function latLonToRect(lat, lon, width, height) {
    // Normalize longitude to [-180, +180] range
    let normLon = ((lon + 180) % 360) - 180;
    if (normLon < -180) normLon += 360;

    const x = ((normLon + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    return { x, y };
  }

  /**
   * Converts 2D equirectangular pixel coordinates back to selenographic (lat, lon).
   *
   * @param {number} x - Pixel X coordinate
   * @param {number} y - Pixel Y coordinate
   * @param {number} width - Viewport width in pixels
   * @param {number} height - Viewport height in pixels
   * @returns {{lat: number, lon: number}} Selenographic coordinates
   */
  function rectToLatLon(x, y, width, height) {
    const lon = (x / width) * 360 - 180;
    const lat = 90 - (y / height) * 180;
    return { lat, lon: (lon + 360) % 360 };
  }

  // ==========================================================================
  // 2. Polar Stereographic Projection - South Pole (Lat <= boundLat, e.g. -70° S)
  // Projects the spherical lunar south cap onto a flat circular disc.
  // Center (cx, cy) corresponds to the South Pole (-90°).
  // ==========================================================================

  /**
   * Converts south polar coordinates (lat, lon) to circular disc pixel coordinates.
   *
   * @param {number} lat - Selenographic latitude (must be <= boundLat)
   * @param {number} lon - Selenographic longitude (0 to 360)
   * @param {number} cx - Center X of circular polar disc
   * @param {number} cy - Center Y of circular polar disc
   * @param {number} radius - Outer radius of polar disc in pixels
   * @param {number} boundLat - Equatorward cutoff latitude (default -70.0°)
   * @returns {{x: number, y: number, visible: boolean}}
   */
  function latLonToPolarSouth(lat, lon, cx, cy, radius, boundLat = -70.0) {
    // Outside the polar viewport boundary
    if (lat > boundLat) {
      return { x: cx, y: cy, visible: false };
    }
    const deltaLat = 90 + lat; // 0 at South Pole (-90°), 20 at -70° boundary
    const maxDelta = 90 + boundLat;
    const r = (deltaLat / maxDelta) * radius;

    // Longitude angle in radians (0° East is up, 90° East is right)
    const rad = (lon * Math.PI) / 180;
    const x = cx + r * Math.sin(rad);
    const y = cy - r * Math.cos(rad);
    return { x, y, visible: true };
  }

  /**
   * Converts circular disc pixel coordinates back to south polar (lat, lon).
   *
   * @param {number} x - Clicked X coordinate
   * @param {number} y - Clicked Y coordinate
   * @param {number} cx - Center X of circular polar disc
   * @param {number} cy - Center Y of circular polar disc
   * @param {number} radius - Outer radius of polar disc
   * @param {number} boundLat - Cutoff latitude (default -70.0°)
   * @returns {{lat: number, lon: number}} Selenographic coordinates
   */
  function polarSouthToLatLon(x, y, cx, cy, radius, boundLat = -70.0) {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    const maxDelta = 90 + boundLat;
    const clampedR = Math.min(r, radius);
    const deltaLat = (clampedR / radius) * maxDelta;
    const lat = -(90 - deltaLat);

    let lonRad = Math.atan2(dx, -dy);
    let lonDeg = (lonRad * 180) / Math.PI;
    if (lonDeg < 0) lonDeg += 360;

    return { lat, lon: lonDeg };
  }

  // ==========================================================================
  // 3. Polar Stereographic Projection - North Pole (Lat >= boundLat, e.g. +70° N)
  // Projects the spherical lunar north cap onto a flat circular disc.
  // Center (cx, cy) corresponds to the North Pole (+90°).
  // ==========================================================================

  /**
   * Converts north polar coordinates (lat, lon) to circular disc pixel coordinates.
   *
   * @param {number} lat - Selenographic latitude (must be >= boundLat)
   * @param {number} lon - Selenographic longitude (0 to 360)
   * @param {number} cx - Center X of circular polar disc
   * @param {number} cy - Center Y of circular polar disc
   * @param {number} radius - Outer radius of polar disc in pixels
   * @param {number} boundLat - Equatorward cutoff latitude (default +70.0°)
   * @returns {{x: number, y: number, visible: boolean}}
   */
  function latLonToPolarNorth(lat, lon, cx, cy, radius, boundLat = 70.0) {
    if (lat < boundLat) {
      return { x: cx, y: cy, visible: false };
    }
    const deltaLat = 90 - lat; // 0 at North Pole (+90°), 20 at +70° boundary
    const maxDelta = 90 - boundLat;
    const r = (deltaLat / maxDelta) * radius;

    const rad = (lon * Math.PI) / 180;
    const x = cx + r * Math.sin(rad);
    const y = cy + r * Math.cos(rad);
    return { x, y, visible: true };
  }

  /**
   * Converts circular disc pixel coordinates back to north polar (lat, lon).
   *
   * @param {number} x - Clicked X coordinate
   * @param {number} y - Clicked Y coordinate
   * @param {number} cx - Center X of circular polar disc
   * @param {number} cy - Center Y of circular polar disc
   * @param {number} radius - Outer radius of polar disc
   * @param {number} boundLat - Cutoff latitude (default +70.0°)
   * @returns {{lat: number, lon: number}} Selenographic coordinates
   */
  function polarNorthToLatLon(x, y, cx, cy, radius, boundLat = 70.0) {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    const maxDelta = 90 - boundLat;
    const clampedR = Math.min(r, radius);
    const deltaLat = (clampedR / radius) * maxDelta;
    const lat = 90 - deltaLat;

    let lonRad = Math.atan2(dx, dy);
    let lonDeg = (lonRad * 180) / Math.PI;
    if (lonDeg < 0) lonDeg += 360;

    return { lat, lon: lonDeg };
  }

  // ==========================================================================
  // 4. Spherical Haversine Geodesic Distance on the Moon
  // Computes shortest surface trajectory distance between two points in km.
  // ==========================================================================

  /**
   * Calculates great-circle surface distance between two selenographic points.
   *
   * @param {number} lat1 - Point 1 latitude
   * @param {number} lon1 - Point 1 longitude
   * @param {number} lat2 - Point 2 latitude
   * @param {number} lon2 - Point 2 longitude
   * @returns {number} Distance along lunar surface in kilometers
   */
  function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const toRad = Math.PI / 180;
    const phi1 = lat1 * toRad;
    const phi2 = lat2 * toRad;
    const deltaPhi = (lat2 - lat1) * toRad;
    const deltaLambda = (lon2 - lon1) * toRad;

    // Haversine formula
    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return MOON_RADIUS_KM * c;
  }

  // Expose cartographic methods in return package
  return {
    MOON_RADIUS_KM,
    KNOWN_SITES,
    findNearestSite,
    latLonToRect,
    rectToLatLon,
    latLonToPolarSouth,
    polarSouthToLatLon,
    latLonToPolarNorth,
    polarNorthToLatLon,
    calculateDistanceKm
  };
})();

// Attach to global window object
window.CoordMath = CoordMath;
