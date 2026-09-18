// @ts-check
import { resolveTheme, breakpointOf } from '../theme/merge-theme.js';
import { themeToCss } from '../theme/theme-to-css.js';
import { AdoptedSheet } from '../styles/adopted-sheet.js';

/** @import { ReactiveController, LitElement } from 'lit' */
/** @import { Theme, ResolvedTheme, Device } from '../types.js' */

/**
 * Turns the `theme` property into the custom properties everything else reads.
 *
 * The generated sheet is adopted *after* the component's own stylesheets, so a
 * theme value beats the fallback declared alongside the rules that use it.
 * Page CSS still wins over both: a `chit-ui { --chit-color-accent: ... }` rule
 * lives in the outer tree, and the outer tree takes precedence over `:host`.
 *
 * @implements {ReactiveController}
 */
export class ThemeController {
  /** @type {LitElement} */
  #host;
  /** @type {AdoptedSheet} */
  #sheet = new AdoptedSheet('data-chit-theme');
  /** @type {ResolvedTheme} */
  #resolved;

  /**
   * @param {LitElement} host
   * @param {{ device: () => Device }} options
   */
  constructor(host, { device }) {
    this.#host = host;
    this.#resolved = resolveTheme(undefined, device());
  }

  /** @returns {ResolvedTheme} The theme in force, defaults filled in. */
  get current() {
    return this.#resolved;
  }

  hostConnected() {
    this.#write();
  }

  hostDisconnected() {
    this.#sheet.detach();
  }

  /**
   * The breakpoint a theme asks for. Needed before `apply`, because the device
   * cannot be decided until the breakpoint is known.
   *
   * @param {Theme | undefined} theme
   * @returns {number}
   */
  static breakpointOf(theme) {
    return breakpointOf(theme);
  }

  /**
   * Re-resolve for the current theme and device. Cheap to call on every update:
   * the stylesheet is only rewritten when the generated text actually changes.
   *
   * @param {Theme | undefined} theme
   * @param {Device} device
   */
  apply(theme, device) {
    this.#resolved = resolveTheme(theme, device);
    this.#write();
  }

  #write() {
    this.#sheet.write(themeToCss(this.#resolved), this.#host.renderRoot);
  }
}
