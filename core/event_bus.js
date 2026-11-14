/**
 * ==============================================================================
 * Lunar Landing Site Navigator - Universal Pub/Sub Event Bus
 * File: core/event_bus.js
 * Role: Global decoupled event communication backbone.
 *       Allows micro-frontend components to publish and subscribe to application
 *       state transitions (e.g., site selection, time scrubbing, theme switching)
 *       without any tight coupling or direct component-to-component imports.
 * ==============================================================================
 */

class EventBus {
  /**
   * Initializes an empty dictionary of event topic listeners.
   */
  constructor() {
    this.listeners = {};
  }

  /**
   * Subscribes a callback function to a designated event topic.
   *
   * @param {string} event - Topic identifier (e.g., 'site:marked', 'time:changed')
   * @param {Function} callback - Function invoked when the event is emitted
   * @returns {Function} Unsubscribe closure allowing clean listener removal
   *
   * @example
   * const unsubscribe = window.eventBus.on('site:marked', (data) => {
   *   console.log('Site marked:', data);
   * });
   * // Later: unsubscribe();
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribes a specific callback from an event topic.
   *
   * @param {string} event - Topic identifier
   * @param {Function} callback - The identical callback reference previously registered
   */
  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  /**
   * Broadcasts an event payload to all registered subscriber callbacks.
   * Callbacks are executed within individual try/catch blocks so an unhandled
   * exception in one component listener cannot crash other listeners.
   *
   * @param {string} event - Topic identifier
   * @param {any} data - Event payload passed as the first parameter to callbacks
   */
  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.error(`[EventBus Error] in listener for [${event}]:`, err);
      }
    });
  }
}

// Instantiate global singleton accessible across all windows and components
window.eventBus = new EventBus();
