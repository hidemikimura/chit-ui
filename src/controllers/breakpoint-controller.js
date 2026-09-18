// @ts-check
import { Events, emit } from '../events.js';

/** @import { ReactiveController, LitElement } from 'lit' */
/** @import { Device } from '../types.js' */

/**
 * Tracks whether the viewport is narrow enough to count as a phone.
 *
 * Uses matchMedia rather than a resize listener: it only fires when the
 * boundary is actually crossed, so nothing runs while the user drags a window
 * around inside one bucket.
 *
 * @implements {ReactiveController}
 */
export class BreakpointController {
  /** @type {LitElement} */
  #host;
  /** @type {MediaQueryList | null} */
  #query = null;
  /** @type {number} */
  #breakpoint = 0;
  /** @type {Device} */
  #device = 'pc';
  /** Set once the first measurement is in, so start-up is not a "change". */
  #measured = false;

  /** @param {LitElement} host */
  constructor(host) {
    this.#host = host;
    host.addController(this);
  }

  /** @returns {Device} */
  get device() {
    return this.#device;
  }

  hostDisconnected() {
    this.#query?.removeEventListener('change', this.#onChange);
    this.#query = null;
  }

  /**
   * Point the controller at a breakpoint. Safe to call on every update; the
   * media query is only rebuilt when the value actually changes.
   *
   * @param {number} breakpoint
   */
  observe(breakpoint) {
    if (breakpoint === this.#breakpoint && this.#query) return;
    this.#breakpoint = breakpoint;
    this.#query?.removeEventListener('change', this.#onChange);
    this.#query = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    this.#query.addEventListener('change', this.#onChange);
    this.#apply(this.#query.matches ? 'mobile' : 'pc');
  }

  /** @param {MediaQueryListEvent} event */
  #onChange = (event) => {
    this.#apply(event.matches ? 'mobile' : 'pc');
  };

  /**
   * Record the device and announce it, unless this is the first measurement —
   * start-up is not a change. A later flip is announced whether it came from
   * the viewport resizing or from the theme moving the breakpoint, because
   * either way the answer a consumer asked for is now different.
   *
   * @param {Device} device
   */
  #apply(device) {
    if (device === this.#device && this.#host.dataset.device) return;

    this.#device = device;
    this.#host.dataset.device = device;
    this.#host.requestUpdate();

    if (this.#measured) emit(this.#host, Events.BREAKPOINT_CHANGE, { device });
    this.#measured = true;
  }
}
