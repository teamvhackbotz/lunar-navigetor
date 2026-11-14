const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SVG_DIR = path.join(ROOT_DIR, 'static', 'icons', 'svg');
const SPRITE_FILE = path.join(ROOT_DIR, 'static', 'icons', 'icons.svg');
const CSS_FILE = path.join(ROOT_DIR, 'static', 'icons', 'icons.css');
const JS_FILE = path.join(ROOT_DIR, 'static', 'icons', 'icons.js');
const PREVIEW_FILE = path.join(ROOT_DIR, 'icons_preview.html');

// Complete Icon Catalog with 56 Precision-Crafted Minimalist UI Icons
const ICONS = [
  // --- Category: Navigation, Maps & Location ---
  {
    name: 'navigation',
    category: 'Navigation',
    title: 'Navigation Pointer',
    tags: ['nav', 'direction', 'arrow', 'telemetry', 'pointer'],
    body: '<polygon points="3 11 22 2 13 21 11 13 3 11"/>'
  },
  {
    name: 'home',
    category: 'Navigation',
    title: 'Home',
    tags: ['main', 'dashboard', 'house', 'cockpit'],
    body: '<path d="M3 10.5L12 3L21 10.5V20C21 20.55 20.55 21 20 21H15C14.45 21 14 20.55 14 20V15C14 14.45 13.55 14 13 14H11C10.45 14 10 14.45 10 15V20C10 20.55 9.55 21 9 21H4C3.45 21 3 20.55 3 20V10.5Z"/>'
  },
  {
    name: 'location',
    category: 'Navigation',
    title: 'Location Pin',
    tags: ['pin', 'marker', 'site', 'target', 'place'],
    body: '<path d="M12 21C16 17 20 13.42 20 10C20 5.58 16.42 2 12 2C7.58 2 4 5.58 4 10C4 13.42 8 17 12 21Z"/><circle cx="12" cy="10" r="3"/>'
  },
  {
    name: 'map',
    category: 'Navigation',
    title: 'Terrain Map',
    tags: ['map', 'topography', 'surface', 'cartography'],
    body: '<path d="M3 6L9 3L15 6L21 3V18L15 21L9 18L3 21V6Z"/><path d="M9 3V18"/><path d="M15 6V21"/>'
  },
  {
    name: 'compass',
    category: 'Navigation',
    title: 'Compass',
    tags: ['bearing', 'azimuth', 'orientation', 'cardinal', 'direction'],
    body: '<circle cx="12" cy="12" r="9"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>'
  },
  {
    name: 'target',
    category: 'Navigation',
    title: 'Crosshair / Target',
    tags: ['landing', 'focus', 'coordinates', 'crosshair', 'reticle'],
    body: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>'
  },
  {
    name: 'globe',
    category: 'Navigation',
    title: 'Globe',
    tags: ['sphere', 'world', 'planet', 'lunar-globe', 'coordinates'],
    body: '<circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3A14 14 0 0 1 16 12A14 14 0 0 1 12 21A14 14 0 0 1 8 12A14 14 0 0 1 12 3Z"/>'
  },
  {
    name: 'layers',
    category: 'Navigation',
    title: 'Map Layers',
    tags: ['layers', 'elevation', 'contour', 'overlays', 'slope'],
    body: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/>'
  },
  {
    name: 'route',
    category: 'Navigation',
    title: 'Mission Route',
    tags: ['path', 'traverse', 'waypoints', 'rover'],
    body: '<circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M12 19H8"/><path d="M12 5H16"/><path d="M12 19A7 7 0 0 0 12 5"/>'
  },

  // --- Category: Core Actions & Search ---
  {
    name: 'search',
    category: 'Actions',
    title: 'Search',
    tags: ['find', 'lookup', 'palette', 'query', 'explore'],
    body: '<circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.2" y2="16.2"/>'
  },
  {
    name: 'add',
    category: 'Actions',
    title: 'Add / Plus',
    tags: ['create', 'new', 'insert', 'plus'],
    body: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'
  },
  {
    name: 'add-circle',
    category: 'Actions',
    title: 'Add Circle',
    tags: ['create', 'new', 'button', 'plus-circle'],
    body: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>'
  },
  {
    name: 'edit',
    category: 'Actions',
    title: 'Edit',
    tags: ['pencil', 'modify', 'pen', 'write', 'rename'],
    body: '<path d="M17 3A2.83 2.83 0 1 1 21 7L7.5 20.5L2 22L3.5 16.5L17 3Z"/><path d="M15 5L19 9"/>'
  },
  {
    name: 'delete',
    category: 'Actions',
    title: 'Delete',
    tags: ['trash', 'remove', 'bin', 'discard'],
    body: '<path d="M3 6H21"/><path d="M8 6V4A2 2 0 0 1 10 2H14A2 2 0 0 1 16 4V6"/><path d="M19 6V20A2 2 0 0 1 17 22H7A2 2 0 0 1 5 20V6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>'
  },
  {
    name: 'close',
    category: 'Actions',
    title: 'Close / Dismiss',
    tags: ['x', 'cancel', 'dismiss', 'exit', 'modal'],
    body: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'
  },
  {
    name: 'check',
    category: 'Actions',
    title: 'Checkmark',
    tags: ['confirm', 'done', 'success', 'accept'],
    body: '<polyline points="20 6 9 17 4 12"/>'
  },
  {
    name: 'check-circle',
    category: 'Actions',
    title: 'Check Circle',
    tags: ['success', 'verified', 'approved'],
    body: '<circle cx="12" cy="12" r="9"/><polyline points="16 9 11 14 8 11"/>'
  },
  {
    name: 'filter',
    category: 'Actions',
    title: 'Filter',
    tags: ['funnel', 'sort', 'refine', 'criteria'],
    body: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>'
  },
  {
    name: 'refresh',
    category: 'Actions',
    title: 'Refresh / Sync',
    tags: ['reload', 'sync', 'reset', 'update'],
    body: '<path d="M21.5 2V7H16.5"/><path d="M2.5 22V17H7.5"/><path d="M20.49 15A9 9 0 0 1 5.64 19.36L2.5 17"/><path d="M3.51 9A9 9 0 0 1 18.36 4.64L21.5 7"/>'
  },
  {
    name: 'copy',
    category: 'Actions',
    title: 'Copy',
    tags: ['clipboard', 'duplicate', 'clone'],
    body: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16H3A2 2 0 0 1 1 14V3A2 2 0 0 1 3 1H14A2 2 0 0 1 16 3V4"/>'
  },
  {
    name: 'share',
    category: 'Actions',
    title: 'Share',
    tags: ['send', 'export', 'nodes', 'network'],
    body: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>'
  },
  {
    name: 'download',
    category: 'Actions',
    title: 'Download',
    tags: ['save', 'export', 'arrow-down', 'file'],
    body: '<path d="M21 15V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V15"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>'
  },
  {
    name: 'upload',
    category: 'Actions',
    title: 'Upload',
    tags: ['import', 'load', 'arrow-up'],
    body: '<path d="M21 15V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V15"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>'
  },

  // --- Category: User, Settings & System ---
  {
    name: 'profile',
    category: 'System',
    title: 'User Profile',
    tags: ['user', 'account', 'avatar', 'astronaut', 'person'],
    body: '<circle cx="12" cy="7" r="4"/><path d="M5.5 21C5.5 17.41 8.41 14.5 12 14.5C15.59 14.5 18.5 17.41 18.5 21"/>'
  },
  {
    name: 'settings',
    category: 'System',
    title: 'Settings',
    tags: ['gear', 'cog', 'preferences', 'configuration', 'options'],
    body: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15A1.65 1.65 0 0 0 19.73 16.82L20.1 17.19A2 2 0 1 1 17.27 20.02L16.9 19.65A1.65 1.65 0 0 0 15.08 19.32A1.65 1.65 0 0 0 14 20.88V21.4A2 2 0 1 1 10 21.4V20.88A1.65 1.65 0 0 0 8.92 19.32A1.65 1.65 0 0 0 7.1 19.65L6.73 20.02A2 2 0 1 1 3.9 17.19L4.27 16.82A1.65 1.65 0 0 0 3.94 15A1.65 1.65 0 0 0 2.38 13.92H1.86A2 2 0 1 1 1.86 9.92H2.38A1.65 1.65 0 0 0 3.94 8.84A1.65 1.65 0 0 0 3.61 7.02L3.24 6.65A2 2 0 1 1 6.07 3.82L6.44 4.19A1.65 1.65 0 0 0 8.26 4.52A1.65 1.65 0 0 0 9.34 2.96V2.44A2 2 0 1 1 13.34 2.44V2.96A1.65 1.65 0 0 0 14.42 4.52A1.65 1.65 0 0 0 16.24 4.19L16.61 3.82A2 2 0 1 1 19.44 6.65L19.07 7.02A1.65 1.65 0 0 0 19.4 8.84A1.65 1.65 0 0 0 20.96 9.92H21.48A2 2 0 1 1 21.48 13.92H20.96A1.65 1.65 0 0 0 19.4 15Z"/>'
  },
  {
    name: 'sliders',
    category: 'System',
    title: 'Adjustment Sliders',
    tags: ['controls', 'parameters', 'tuning', 'options', 'filters'],
    body: '<line x1="4" y1="6" x2="14" y2="6"/><line x1="18" y1="6" x2="20" y2="6"/><circle cx="16" cy="6" r="2"/><line x1="4" y1="12" x2="8" y2="12"/><line x1="12" y1="12" x2="20" y2="12"/><circle cx="10" cy="12" r="2"/><line x1="4" y1="18" x2="16" y2="18"/><line x1="20" y1="18" x2="20" y2="18"/><circle cx="18" cy="18" r="2"/>'
  },
  {
    name: 'notifications',
    category: 'System',
    title: 'Notifications / Bell',
    tags: ['alerts', 'bell', 'messages', 'updates'],
    body: '<path d="M18 8A6 6 0 0 0 6 8C6 15 3 17 3 17H21S18 15 18 8"/><path d="M10.3 21A1.94 1.94 0 0 0 13.7 21"/>'
  },
  {
    name: 'menu',
    category: 'System',
    title: 'Menu / Drawer',
    tags: ['hamburger', 'drawer', 'sidebar', 'navigation'],
    body: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>'
  },
  {
    name: 'info',
    category: 'System',
    title: 'Information',
    tags: ['details', 'about', 'help', 'tooltip'],
    body: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="16" x2="12" y2="12"/><circle cx="12" cy="8" r="0.75" fill="currentColor"/>'
  },
  {
    name: 'alert-triangle',
    category: 'System',
    title: 'Warning Alert',
    tags: ['warning', 'caution', 'hazard', 'alert', 'slope-warning'],
    body: '<path d="M10.29 3.86L1.82 18A2 2 0 0 0 3.55 21H20.45A2 2 0 0 0 22.18 18L13.71 3.86A2 2 0 0 0 10.29 3.86Z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="0.75" fill="currentColor"/>'
  },
  {
    name: 'help-circle',
    category: 'System',
    title: 'Help',
    tags: ['question', 'faq', 'support', 'guidance'],
    body: '<circle cx="12" cy="12" r="9"/><path d="M9.09 9A3 3 0 0 1 15 10C15 12 12 13 12 14"/><circle cx="12" cy="17" r="0.75" fill="currentColor"/>'
  },
  {
    name: 'lock',
    category: 'System',
    title: 'Lock / Secured',
    tags: ['security', 'protect', 'private', 'safety'],
    body: '<rect x="4" y="11" width="16" height="11" rx="2"/><path d="M7 11V7A5 5 0 0 1 17 7V11"/>'
  },
  {
    name: 'unlock',
    category: 'System',
    title: 'Unlock',
    tags: ['open', 'unsecured', 'access'],
    body: '<rect x="4" y="11" width="16" height="11" rx="2"/><path d="M7 11V7A5 5 0 0 1 17 7"/>'
  },

  // --- Category: View, Inspection & Chevrons ---
  {
    name: 'eye',
    category: 'View',
    title: 'Eye / Inspector',
    tags: ['view', 'visible', 'inspect', 'preview', 'site-details'],
    body: '<path d="M1 12C3.5 6.5 7.5 4 12 4C16.5 4 20.5 6.5 23 12C20.5 17.5 16.5 20 12 20C7.5 20 3.5 17.5 1 12Z"/><circle cx="12" cy="12" r="3"/>'
  },
  {
    name: 'eye-off',
    category: 'View',
    title: 'Eye Off / Hidden',
    tags: ['hidden', 'invisible', 'hide', 'layer-toggle'],
    body: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C7.5 20 3.5 17.5 1 12C2.26 9.49 4.25 7.55 6.64 6.42"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4C16.5 4 20.5 6.5 23 12C21.84 14.31 20.06 16.14 17.94 17.94"/><line x1="1" y1="1" x2="23" y2="23"/>'
  },
  {
    name: 'chevron-down',
    category: 'View',
    title: 'Chevron Down',
    tags: ['arrow', 'expand', 'dropdown', 'collapse'],
    body: '<polyline points="6 9 12 15 18 9"/>'
  },
  {
    name: 'chevron-up',
    category: 'View',
    title: 'Chevron Up',
    tags: ['arrow', 'collapse', 'accordion'],
    body: '<polyline points="18 15 12 9 6 15"/>'
  },
  {
    name: 'chevron-left',
    category: 'View',
    title: 'Chevron Left',
    tags: ['arrow', 'back', 'previous'],
    body: '<polyline points="15 18 9 12 15 6"/>'
  },
  {
    name: 'chevron-right',
    category: 'View',
    title: 'Chevron Right',
    tags: ['arrow', 'forward', 'next'],
    body: '<polyline points="9 18 15 12 9 6"/>'
  },
  {
    name: 'maximize',
    category: 'View',
    title: 'Maximize / Fullscreen',
    tags: ['expand', 'fullscreen', 'viewport'],
    body: '<path d="M8 3H4A1 1 0 0 0 3 4V8"/><path d="M16 3H20A1 1 0 0 1 21 4V8"/><path d="M8 21H4A1 1 0 0 1 3 20V16"/><path d="M16 21H20A1 1 0 0 0 21 20V16"/>'
  },
  {
    name: 'minimize',
    category: 'View',
    title: 'Minimize / Exit Fullscreen',
    tags: ['collapse', 'window', 'restore'],
    body: '<path d="M4 8H8V4"/><path d="M20 8H16V4"/><path d="M4 16H8V20"/><path d="M20 16H16V20"/>'
  },
  {
    name: 'arrow-up-right',
    category: 'View',
    title: 'External Link',
    tags: ['launch', 'outbound', 'window', 'open'],
    body: '<line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>'
  },
  {
    name: 'grab',
    category: 'View',
    title: 'Grab / Pan Hand',
    tags: ['hand', 'pan', 'drag', 'rotate', 'viewport-tool'],
    body: '<path d="M18 11V6A1.5 1.5 0 0 0 15 6V11"/><path d="M15 9V4.5A1.5 1.5 0 0 0 12 4.5V11"/><path d="M12 9V5.5A1.5 1.5 0 0 0 9 5.5V13"/><path d="M9 11.5V9A1.5 1.5 0 0 0 6 9V15C6 18.3 8.7 21 12 21C15.9 21 19 17.9 19 14V11A1.5 1.5 0 0 0 16 11"/>'
  },

  // --- Category: Media, Time & Ephemeris ---
  {
    name: 'play',
    category: 'Media & Time',
    title: 'Play Simulation',
    tags: ['play', 'start', 'run', 'temporal'],
    body: '<polygon points="6 4 20 12 6 20 6 4"/>'
  },
  {
    name: 'pause',
    category: 'Media & Time',
    title: 'Pause Simulation',
    tags: ['pause', 'stop', 'freeze'],
    body: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>'
  },
  {
    name: 'step-forward',
    category: 'Media & Time',
    title: 'Step Forward (+1h)',
    tags: ['next', 'step', 'advance', 'time-step'],
    body: '<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="4" x2="19" y2="20"/>'
  },
  {
    name: 'step-back',
    category: 'Media & Time',
    title: 'Step Back (-1h)',
    tags: ['prev', 'step', 'rewind', 'time-step'],
    body: '<polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="4" x2="5" y2="20"/>'
  },
  {
    name: 'clock',
    category: 'Media & Time',
    title: 'Mission Clock',
    tags: ['time', 'utc', 'timeline', 'chronometer', 'ephemeris'],
    body: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>'
  },
  {
    name: 'calendar',
    category: 'Media & Time',
    title: 'Calendar Window',
    tags: ['date', 'launch-window', 'schedule', 'mission-day'],
    body: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'
  },

  // --- Category: Celestial, AI & Mission Telemetry ---
  {
    name: 'moon',
    category: 'Mission',
    title: 'Lunar / Night',
    tags: ['moon', 'selenographic', 'lunar-phase', 'night', 'dark-theme'],
    body: '<path d="M21 12.79A9 9 0 1 1 11.21 3A7 7 0 0 0 21 12.79Z"/>'
  },
  {
    name: 'sun',
    category: 'Mission',
    title: 'Solar / Day',
    tags: ['sun', 'illumination', 'solar-vector', 'daylight', 'light-theme'],
    body: '<circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.07" y2="4.93"/>'
  },
  {
    name: 'sparkles',
    category: 'Mission',
    title: 'AI Analyst / Sparkles',
    tags: ['ai', 'assistant', 'dr-raj', 'intelligence', 'analysis', 'magic'],
    body: '<path d="M12 2L14.2 9.8L22 12L14.2 14.2L12 22L9.8 14.2L2 12L9.8 9.8L12 2Z"/><path d="M19 3L19.8 5.2L22 6L19.8 6.8L19 9L18.2 6.8L16 6L18.2 5.2L19 3Z"/>'
  },
  {
    name: 'rocket',
    category: 'Mission',
    title: 'Mission Launch / Rocket',
    tags: ['artemis', 'launch', 'trajectory', 'spacecraft', 'orbit'],
    body: '<path d="M4.5 16.5C3.5 17.5 3 20 3 21C4 21 6.5 20.5 7.5 19.5L9.5 17.5L6.5 14.5L4.5 16.5Z"/><path d="M14.5 4.5C11.5 2.5 8 3.5 6.5 5C5 6.5 4 10 6 13L11 18C14 20 17.5 19 19 17.5C20.5 16 21.5 12.5 19.5 9.5L14.5 4.5Z"/><circle cx="14" cy="10" r="1.5"/>'
  },
  {
    name: 'bookmark',
    category: 'Mission',
    title: 'Bookmark / Candidate',
    tags: ['favorite', 'save', 'candidate-site', 'pinned'],
    body: '<path d="M19 21L12 16L5 21V5A2 2 0 0 1 7 3H17A2 2 0 0 1 19 5V21Z"/>'
  },
  {
    name: 'star',
    category: 'Mission',
    title: 'Star / Primary Choice',
    tags: ['rating', 'primary', 'recommended', 'best'],
    body: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'
  },
  {
    name: 'folder',
    category: 'Mission',
    title: 'Mission Dossier / Folder',
    tags: ['directory', 'files', 'dossier', 'archive'],
    body: '<path d="M22 19A2 2 0 0 1 20 21H4A2 2 0 0 1 2 19V5A2 2 0 0 1 4 3H9L11 6H20A2 2 0 0 1 22 8V19Z"/>'
  },
  {
    name: 'file',
    category: 'Mission',
    title: 'Telemetry File / Document',
    tags: ['report', 'site-data', 'sheet', 'spec'],
    body: '<path d="M14 2H6A2 2 0 0 0 4 4V20A2 2 0 0 0 6 22H18A2 2 0 0 0 20 20V8L14 2Z"/><polyline points="14 2 14 8 20 8"/>'
  }
];

// 1. Generate Individual Standalone SVGs
console.log(`Generating ${ICONS.length} standalone SVGs into ${SVG_DIR}...`);
ICONS.forEach(icon => {
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="icon icon-${icon.name}" aria-hidden="true">
  ${icon.body}
</svg>
`;
  fs.writeFileSync(path.join(SVG_DIR, `${icon.name}.svg`), svgContent, 'utf8');
});

// 2. Generate SVG Sprite Sheet (icons.svg)
console.log(`Compiling SVG Sprite to ${SPRITE_FILE}...`);
const symbols = ICONS.map(icon => `  <symbol id="icon-${icon.name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    ${icon.body}
  </symbol>`).join('\n');

const spriteContent = `<svg xmlns="http://www.w3.org/2000/svg" style="display: none;" aria-hidden="true">
${symbols}
</svg>
`;
fs.writeFileSync(SPRITE_FILE, spriteContent, 'utf8');

// 3. Generate CSS Stylesheet (icons.css)
console.log(`Writing CSS Design System tokens to ${CSS_FILE}...`);
const cssContent = `/**
 * ==============================================================================
 * Lunar Navigator Design System - Modern Minimalist Icon Suite
 * File: static/icons/icons.css
 * ==============================================================================
 */

:root {
  --icon-size-xs: 14px;
  --icon-size-sm: 16px;
  --icon-size-md: 20px;
  --icon-size-lg: 24px;
  --icon-size-xl: 32px;
  --icon-size-2xl: 48px;

  --icon-stroke-thin: 1.25px;
  --icon-stroke-normal: 1.75px;
  --icon-stroke-bold: 2.25px;

  --icon-transition: stroke 0.18s cubic-bezier(0.16, 1, 0.3, 1), 
                      transform 0.18s cubic-bezier(0.16, 1, 0.3, 1),
                      color 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Base Universal Icon Class */
.icon {
  display: inline-block;
  width: var(--icon-size-md);
  height: var(--icon-size-md);
  min-width: var(--icon-size-md);
  min-height: var(--icon-size-md);
  stroke-width: var(--icon-stroke-normal);
  stroke: currentColor;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  vertical-align: -0.125em;
  flex-shrink: 0;
  transition: var(--icon-transition);
  shape-rendering: geometricPrecision;
}

/* Sizing Modifiers */
.icon-xs  { width: var(--icon-size-xs);  height: var(--icon-size-xs);  min-width: var(--icon-size-xs);  min-height: var(--icon-size-xs); }
.icon-sm  { width: var(--icon-size-sm);  height: var(--icon-size-sm);  min-width: var(--icon-size-sm);  min-height: var(--icon-size-sm); }
.icon-md  { width: var(--icon-size-md);  height: var(--icon-size-md);  min-width: var(--icon-size-md);  min-height: var(--icon-size-md); }
.icon-lg  { width: var(--icon-size-lg);  height: var(--icon-size-lg);  min-width: var(--icon-size-lg);  min-height: var(--icon-size-lg); }
.icon-xl  { width: var(--icon-size-xl);  height: var(--icon-size-xl);  min-width: var(--icon-size-xl);  min-height: var(--icon-size-xl); }
.icon-2xl { width: var(--icon-size-2xl); height: var(--icon-size-2xl); min-width: var(--icon-size-2xl); min-height: var(--icon-size-2xl); }

/* Stroke Width Modifiers */
.icon-thin   { stroke-width: var(--icon-stroke-thin); }
.icon-normal { stroke-width: var(--icon-stroke-normal); }
.icon-bold   { stroke-width: var(--icon-stroke-bold); }

/* Palette Accents (Aligned with Lunar Navigator Theme Tokens) */
.icon-terracotta { color: var(--accent-terracotta, #c87d55); }
.icon-sand       { color: var(--accent-sand, #c99e52); }
.icon-sage       { color: var(--accent-sage, #7d967e); }
.icon-slate      { color: var(--accent-slate, #5f798a); }
.icon-danger     { color: var(--accent-danger, #b8544f); }
.icon-muted      { color: var(--text-muted, #8c867c); }
.icon-primary    { color: var(--text-primary, #ede8e1); }
.icon-secondary  { color: var(--text-secondary, #beb7ac); }

/* Interactive Buttons & Micro-Animations */
.btn-icon-tile {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--bg-card, rgba(39, 41, 43, 0.92));
  border: 1px solid var(--border-subtle, #3a3c3f);
  color: var(--text-primary, #ede8e1);
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  user-select: none;
}

.btn-icon-tile:hover {
  background: var(--bg-card-hover, rgba(49, 51, 54, 0.96));
  border-color: var(--accent-terracotta, #c87d55);
  transform: translateY(-1px);
}

.btn-icon-tile:hover .icon {
  color: var(--accent-terracotta, #c87d55);
}

.btn-icon-tile:active {
  transform: translateY(0);
}

.btn-icon-tile.icon-only {
  padding: 8px;
  width: 36px;
  height: 36px;
  border-radius: 8px;
}

/* Animations */
.icon-spin {
  animation: icon-spin-kf 1s linear infinite;
}

@keyframes icon-spin-kf {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.icon-pulse {
  animation: icon-pulse-kf 2s ease-in-out infinite;
}

@keyframes icon-pulse-kf {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.92); }
}
`;
fs.writeFileSync(CSS_FILE, cssContent, 'utf8');

// 4. Generate JavaScript Helper Library (icons.js)
console.log(`Compiling JS Helper Module to ${JS_FILE}...`);
const jsContent = `/**
 * ==============================================================================
 * Lunar Navigator Design System - Icons Helper Utility
 * File: static/icons/icons.js
 * ==============================================================================
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Icons = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  const ICONS_MAP = ${JSON.stringify(
    ICONS.reduce((acc, cur) => {
      acc[cur.name] = {
        title: cur.title,
        category: cur.category,
        tags: cur.tags,
        body: cur.body
      };
      return acc;
    }, {}),
    null,
    2
  )};

  const Icons = {
    /**
     * Get raw SVG string for a given icon name
     */
    svg: function (name, options = {}) {
      const icon = ICONS_MAP[name];
      if (!icon) {
        console.warn('[Icons] Icon not found: ' + name);
        return '';
      }
      const sizeClass = options.size ? 'icon-' + options.size : '';
      const customClass = options.class || '';
      const strokeClass = options.stroke ? 'icon-' + options.stroke : '';
      const colorClass = options.color ? 'icon-' + options.color : '';
      const ariaLabel = options.title || icon.title;
      const combinedClass = ['icon', 'icon-' + name, sizeClass, strokeClass, colorClass, customClass].filter(Boolean).join(' ');

      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="' + combinedClass + '" role="img" aria-label="' + ariaLabel + '">' +
        icon.body +
      '</svg>';
    },

    /**
     * Render SVG element directly into DOM node
     */
    render: function (name, options = {}) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = this.svg(name, options).trim();
      return wrapper.firstElementChild;
    },

    /**
     * Auto-replace elements with [data-icon="icon-name"] attribute
     */
    replace: function (container = document) {
      const elements = container.querySelectorAll('[data-icon]');
      elements.forEach(el => {
        const iconName = el.getAttribute('data-icon');
        const size = el.getAttribute('data-icon-size') || '';
        const color = el.getAttribute('data-icon-color') || '';
        const stroke = el.getAttribute('data-icon-stroke') || '';
        const extraClass = el.getAttribute('data-icon-class') || '';

        const svgMarkup = this.svg(iconName, {
          size: size,
          color: color,
          stroke: stroke,
          class: extraClass
        });

        if (svgMarkup) {
          el.innerHTML = svgMarkup;
          el.removeAttribute('data-icon');
        }
      });
    },

    /**
     * List all available icons with metadata
     */
    list: function () {
      return Object.keys(ICONS_MAP).map(key => ({
        name: key,
        title: ICONS_MAP[key].title,
        category: ICONS_MAP[key].category,
        tags: ICONS_MAP[key].tags
      }));
    },

    /**
     * Retrieve icon definition
     */
    get: function (name) {
      return ICONS_MAP[name] || null;
    }
  };

  // Auto-run replacement if DOM is ready, or hook on DOMContentLoaded
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => Icons.replace());
    } else {
      setTimeout(() => Icons.replace(), 0);
    }
  }

  return Icons;
});
`;
fs.writeFileSync(JS_FILE, jsContent, 'utf8');

// 5. Generate Interactive Icon Explorer & Preview Page (icons_preview.html)
console.log(`Building Icon Explorer Documentation UI to ${PREVIEW_FILE}...`);
const previewHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lunar Navigator - UI Icon Design System</title>
  <link rel="stylesheet" href="themes/theme_earth.css" id="theme-stylesheet">
  <link rel="stylesheet" href="static/icons/icons.css">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg-deep-space, #141618);
      color: var(--text-primary, #ede8e1);
      padding: 32px 48px;
      line-height: 1.5;
      min-height: 100vh;
    }

    header.preview-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border-subtle, #3a3c3f);
    }

    .header-badge {
      display: inline-block;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--accent-terracotta, #c87d55);
      font-weight: 700;
      background: rgba(200, 125, 85, 0.12);
      padding: 4px 10px;
      border-radius: 999px;
      margin-bottom: 8px;
    }

    h1 {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 6px;
    }

    p.subtitle {
      font-size: 14px;
      color: var(--text-secondary, #beb7ac);
      max-width: 640px;
    }

    .controls-panel {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: center;
      background: var(--bg-surface-dark, #1e2022);
      border: 1px solid var(--border-subtle, #3a3c3f);
      padding: 16px 20px;
      border-radius: 12px;
      margin-bottom: 28px;
    }

    .search-box {
      position: relative;
      flex: 1 1 280px;
    }

    .search-box input {
      width: 100%;
      background: var(--bg-cockpit, #17181a);
      border: 1px solid var(--border-subtle, #3a3c3f);
      color: var(--text-primary, #ede8e1);
      padding: 10px 14px 10px 38px;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }

    .search-box input:focus {
      border-color: var(--accent-terracotta, #c87d55);
    }

    .search-box .icon-search {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted, #8c867c);
    }

    .filter-pills {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .pill {
      background: transparent;
      border: 1px solid var(--border-subtle, #3a3c3f);
      color: var(--text-secondary, #beb7ac);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .pill:hover, .pill.active {
      background: var(--accent-terracotta, #c87d55);
      border-color: var(--accent-terracotta, #c87d55);
      color: #fff;
    }

    .control-group {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      color: var(--text-secondary, #beb7ac);
    }

    .control-group input[type="range"] {
      cursor: pointer;
      accent-color: var(--accent-terracotta, #c87d55);
    }

    .theme-select {
      background: var(--bg-cockpit, #17181a);
      color: var(--text-primary, #ede8e1);
      border: 1px solid var(--border-subtle, #3a3c3f);
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13px;
      cursor: pointer;
    }

    /* Icon Grid */
    .icon-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 16px;
      margin-bottom: 48px;
    }

    .icon-card {
      background: var(--bg-card, rgba(39, 41, 43, 0.92));
      border: 1px solid var(--border-subtle, #3a3c3f);
      border-radius: 12px;
      padding: 20px 14px 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }

    .icon-card:hover {
      background: var(--bg-card-hover, rgba(49, 51, 54, 0.96));
      border-color: var(--accent-terracotta, #c87d55);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    }

    .icon-card-preview {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 48px;
      margin-bottom: 12px;
    }

    .icon-card-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-primary, #ede8e1);
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      width: 100%;
    }

    .icon-card-category {
      font-size: 10px;
      color: var(--text-muted, #8c867c);
      margin-top: 2px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .copy-toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: var(--accent-terracotta, #c87d55);
      color: #fff;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
      opacity: 0;
      transform: translateY(12px);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: none;
      z-index: 9999;
    }

    .copy-toast.show {
      opacity: 1;
      transform: translateY(0);
    }

    /* Comparison Section */
    .comparison-section {
      background: var(--bg-surface-dark, #1e2022);
      border: 1px solid var(--border-subtle, #3a3c3f);
      border-radius: 16px;
      padding: 28px;
      margin-top: 48px;
    }

    .comparison-header {
      margin-bottom: 20px;
    }

    .comparison-header h2 {
      font-size: 20px;
      margin-bottom: 6px;
    }

    .comparison-header p {
      font-size: 13px;
      color: var(--text-secondary, #beb7ac);
    }

    .comparison-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .demo-bar {
      background: var(--bg-cockpit, #17181a);
      border: 1px solid var(--border-subtle, #3a3c3f);
      border-radius: 10px;
      padding: 14px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .demo-bar-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 8px;
      color: var(--text-muted, #8c867c);
    }
  </style>
</head>
<body>

  <header class="preview-header">
    <div>
      <span class="header-badge">Design System v2.0</span>
      <h1>Lunar Navigator · Minimalist UI Icon Suite</h1>
      <p class="subtitle">Complete set of ${ICONS.length} production-ready geometric outline icons. Built on a 24×24 precision grid with 1.75px uniform stroke width, round caps, and theme-adaptive currentColor.</p>
    </div>
    <div style="display: flex; gap: 12px; align-items: center;">
      <select class="theme-select" id="theme-selector" onchange="switchTheme(this.value)">
        <option value="themes/theme_earth.css">Earth Palette (Default)</option>
        <option value="themes/theme_space.css">Space Dark Theme</option>
        <option value="themes/theme_regolith.css">Regolith Monolith</option>
      </select>
      <a href="index.html" class="btn-icon-tile" style="text-decoration: none;">
        <span class="icon icon-navigation"></span> Launch Cockpit
      </a>
    </div>
  </header>

  <!-- Interactive Controls Bar -->
  <div class="controls-panel">
    <div class="search-box">
      <svg class="icon icon-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.2" y2="16.2"/></svg>
      <input type="text" id="icon-search" placeholder="Search icons (e.g. navigation, map, search, add, pin...)" oninput="filterIcons()">
    </div>

    <div class="filter-pills" id="category-pills">
      <button class="pill active" onclick="setCategory('All')">All (${ICONS.length})</button>
      <button class="pill" onclick="setCategory('Navigation')">Navigation</button>
      <button class="pill" onclick="setCategory('Actions')">Actions</button>
      <button class="pill" onclick="setCategory('System')">System</button>
      <button class="pill" onclick="setCategory('View')">View & Controls</button>
      <button class="pill" onclick="setCategory('Media & Time')">Media & Time</button>
      <button class="pill" onclick="setCategory('Mission')">Mission Telemetry</button>
    </div>

    <div class="control-group">
      <span>Size:</span>
      <input type="range" id="size-slider" min="16" max="48" value="24" oninput="updateSize(this.value)">
      <span id="size-label">24px</span>
    </div>

    <div class="control-group">
      <span>Stroke:</span>
      <input type="range" id="stroke-slider" min="1.0" max="3.0" step="0.25" value="1.75" oninput="updateStroke(this.value)">
      <span id="stroke-label">1.75px</span>
    </div>
  </div>

  <!-- Icon Grid -->
  <div class="icon-grid" id="icon-grid"></div>

  <!-- Real-world Application Comparison Demo -->
  <section class="comparison-section">
    <div class="comparison-header">
      <h2>Cockpit Interface Comparison: Emojis vs. Modern Minimalist Icons</h2>
      <p>Demonstrating how unified geometric outline icons replace outdated raw emojis with professional cockpit-grade precision.</p>
    </div>

    <div class="comparison-row">
      <!-- Outdated Emoji Style -->
      <div>
        <div class="demo-bar-title">Before: Inconsistent Raw OS Emojis</div>
        <div class="demo-bar" style="opacity: 0.7;">
          <div style="display: flex; gap: 8px; align-items: center;">
            <span>🌔</span>
            <span style="font-weight: 600; font-size: 13px;">Lunar Nav</span>
          </div>
          <div style="display: flex; gap: 12px; font-size: 14px;">
            <span>🔍 Search</span>
            <span>📍 Mark Site</span>
            <span>⚙️ Settings</span>
            <span>👨‍🚀 Dr. Raj</span>
          </div>
        </div>
      </div>

      <!-- Modern Minimalist Icon Suite -->
      <div>
        <div class="demo-bar-title" style="color: var(--accent-terracotta, #c87d55);">After: Clean Minimalist Outline System</div>
        <div class="demo-bar" style="border-color: var(--accent-terracotta, #c87d55);">
          <div style="display: flex; gap: 8px; align-items: center;">
            <svg class="icon icon-navigation icon-terracotta" viewBox="0 0 24 24"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
            <span style="font-weight: 600; font-size: 13px;">Lunar Navigator</span>
          </div>
          <div style="display: flex; gap: 10px; font-size: 13px;">
            <button class="btn-icon-tile" style="padding: 6px 10px;"><svg class="icon icon-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.2" y2="16.2"/></svg> Search</button>
            <button class="btn-icon-tile" style="padding: 6px 10px;"><svg class="icon icon-location" viewBox="0 0 24 24"><path d="M12 21C16 17 20 13.42 20 10C20 5.58 16.42 2 12 2C7.58 2 4 5.58 4 10C4 13.42 8 17 12 21Z"/><circle cx="12" cy="10" r="3"/></svg> Mark Site</button>
            <button class="btn-icon-tile icon-only"><svg class="icon icon-settings" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15A1.65 1.65 0 0 0 19.73 16.82L20.1 17.19A2 2 0 1 1 17.27 20.02L16.9 19.65A1.65 1.65 0 0 0 15.08 19.32A1.65 1.65 0 0 0 14 20.88V21.4A2 2 0 1 1 10 21.4V20.88A1.65 1.65 0 0 0 8.92 19.32A1.65 1.65 0 0 0 7.1 19.65L6.73 20.02A2 2 0 1 1 3.9 17.19L4.27 16.82A1.65 1.65 0 0 0 3.94 15A1.65 1.65 0 0 0 2.38 13.92H1.86A2 2 0 1 1 1.86 9.92H2.38A1.65 1.65 0 0 0 3.94 8.84A1.65 1.65 0 0 0 3.61 7.02L3.24 6.65A2 2 0 1 1 6.07 3.82L6.44 4.19A1.65 1.65 0 0 0 8.26 4.52A1.65 1.65 0 0 0 9.34 2.96V2.44A2 2 0 1 1 13.34 2.44V2.96A1.65 1.65 0 0 0 14.42 4.52A1.65 1.65 0 0 0 16.24 4.19L16.61 3.82A2 2 0 1 1 19.44 6.65L19.07 7.02A1.65 1.65 0 0 0 19.4 8.84A1.65 1.65 0 0 0 20.96 9.92H21.48A2 2 0 1 1 21.48 13.92H20.96A1.65 1.65 0 0 0 19.4 15Z"/></svg></button>
            <button class="btn-icon-tile" style="padding: 6px 10px; border-color: var(--accent-sand, #c99e52);"><svg class="icon icon-sparkles icon-sand" viewBox="0 0 24 24"><path d="M12 2L14.2 9.8L22 12L14.2 14.2L12 22L9.8 14.2L2 12L9.8 9.8L12 2Z"/></svg> Dr. Raj AI</button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <div class="copy-toast" id="copy-toast">SVG copied to clipboard!</div>

  <script src="static/icons/icons.js"></script>
  <script>
    const iconsData = ${JSON.stringify(ICONS)};
    let activeCategory = 'All';
    let currentSize = 24;
    let currentStroke = 1.75;

    function renderIcons() {
      const grid = document.getElementById('icon-grid');
      const query = document.getElementById('icon-search').value.toLowerCase().trim();

      const filtered = iconsData.filter(icon => {
        const matchesCategory = (activeCategory === 'All' || icon.category === activeCategory);
        const matchesQuery = !query || 
          icon.name.toLowerCase().includes(query) || 
          icon.title.toLowerCase().includes(query) || 
          icon.tags.some(t => t.toLowerCase().includes(query));
        return matchesCategory && matchesQuery;
      });

      if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1 / -1; padding: 48px; text-align: center; color: var(--text-muted);">No icons found matching your search.</div>';
        return;
      }

      grid.innerHTML = filtered.map(icon => \`
        <div class="icon-card" onclick="copyIcon('\${icon.name}')" title="Click to copy SVG markup">
          <div class="icon-card-preview">
            <svg class="icon" viewBox="0 0 24 24" style="width: \${currentSize}px; height: \${currentSize}px; stroke-width: \${currentStroke}px;">
              \${icon.body}
            </svg>
          </div>
          <div class="icon-card-name">\${icon.name}</div>
          <div class="icon-card-category">\${icon.category}</div>
        </div>
      \`).join('');
    }

    function setCategory(cat) {
      activeCategory = cat;
      document.querySelectorAll('#category-pills .pill').forEach(pill => {
        pill.classList.toggle('active', pill.innerText.startsWith(cat));
      });
      renderIcons();
    }

    function filterIcons() {
      renderIcons();
    }

    function updateSize(val) {
      currentSize = val;
      document.getElementById('size-label').innerText = val + 'px';
      renderIcons();
    }

    function updateStroke(val) {
      currentStroke = val;
      document.getElementById('stroke-label').innerText = val + 'px';
      renderIcons();
    }

    function switchTheme(url) {
      document.getElementById('theme-stylesheet').setAttribute('href', url);
    }

    function copyIcon(name) {
      const icon = iconsData.find(i => i.name === name);
      if (!icon) return;
      const svgMarkup = \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="icon icon-\${icon.name}">
  \${icon.body}
</svg>\`;
      navigator.clipboard.writeText(svgMarkup).then(() => {
        showToast('Copied <svg> for "' + name + '" to clipboard!');
      });
    }

    function showToast(msg) {
      const toast = document.getElementById('copy-toast');
      toast.innerText = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2200);
    }

    // Initial render
    renderIcons();
  </script>
</body>
</html>
`;
fs.writeFileSync(PREVIEW_FILE, previewHtml, 'utf8');

console.log('✅ UI Icon System built successfully!');
