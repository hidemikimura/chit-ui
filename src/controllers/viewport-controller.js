// @ts-check

/** @import { ReactiveController, LitElement } from 'lit' */

/**
 * Past this the reader has pinched to zoom, and the widget stays out of it.
 * A little over 1 because browsers report scales like 1.0000002.
 */
const ZOOMED = 1.01;

/**
 * Keeps the full-screen panel inside the part of the screen the reader can
 * actually see.
 *
 * On a phone the panel is `position: fixed` across the whole viewport, and
 * that viewport is not what is on screen once a keyboard slides up: the
 * layout viewport keeps its full height, so the composer — and with it the
 * last few messages — ends up behind the keyboard. iOS then scrolls the page
 * to chase the focused field, which moves the fixed panel out of frame
 * instead of helping. `dvh` is no use here either; it tracks the browser's
 * own chrome collapsing, not the keyboard.
 *
 * `visualViewport` is the one thing that does report the visible box, so the
 * panel is pinned to it: its top to `offsetTop`, its height to `height`. The
 * composer lands just above the keyboard, and the conversation gets whatever
 * is left.
 *
 * A pinch is left alone. Zooming is how a reader gets a closer look, and a
 * panel that re-fitted itself to the magnified box would take that away by
 * reflowing the text back to the same apparent size.
 *
 * @implements {ReactiveController}
 */
export class ViewportController {
  /** @type {LitElement} */
  #host;

  /** @type {() => boolean} */
  #enabled;

  /** @type {(() => void) | undefined} */
  #onChange;

  /** True while the custom properties are set, to avoid pointless writes. */
  #applied = false;

  /**
   * @param {LitElement} host
   * @param {{ enabled: () => boolean }} options
   */
  constructor(host, { enabled }) {
    this.#host = host;
    this.#enabled = enabled;
    host.addController(this);
  }

  hostConnected() {
    const viewport = window.visualViewport;
    if (!viewport) return;

    this.#onChange = () => this.#apply();
    // Resize is the keyboard arriving and leaving; scroll is iOS shifting the
    // visible box around while it is up.
    viewport.addEventListener('resize', this.#onChange);
    viewport.addEventListener('scroll', this.#onChange);
  }

  hostDisconnected() {
    const viewport = window.visualViewport;
    if (viewport && this.#onChange) {
      viewport.removeEventListener('resize', this.#onChange);
      viewport.removeEventListener('scroll', this.#onChange);
    }
    this.#onChange = undefined;
    this.#clear();
  }

  hostUpdated() {
    this.#apply();
  }

  #apply() {
    const viewport = window.visualViewport;
    const panel = this.#host.renderRoot?.querySelector('[part~="panel"]');

    if (!viewport || !panel || !this.#enabled() || viewport.scale > ZOOMED) {
      this.#clear();
      return;
    }

    this.#host.style.setProperty('--_chit-vv-top', `${Math.round(viewport.offsetTop)}px`);
    this.#host.style.setProperty('--_chit-vv-height', `${Math.round(viewport.height)}px`);
    this.#applied = true;
  }

  #clear() {
    if (!this.#applied) return;
    this.#host.style.removeProperty('--_chit-vv-top');
    this.#host.style.removeProperty('--_chit-vv-height');
    this.#applied = false;
  }
}
