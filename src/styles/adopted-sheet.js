// @ts-check

/**
 * Constructable stylesheets landed in Safari 16.4 and we support 16, so the
 * same fallback Lit uses applies here: a <style> element in the shadow root.
 */
const SUPPORTS_ADOPTING =
  typeof ShadowRoot !== 'undefined' &&
  'adoptedStyleSheets' in Document.prototype &&
  'replaceSync' in CSSStyleSheet.prototype;

/**
 * A stylesheet the component owns and rewrites at runtime, appended after the
 * component's static styles so its declarations win over them.
 */
export class AdoptedSheet {
  /** @type {CSSStyleSheet | null} */
  #sheet = null;
  /** @type {HTMLStyleElement | null} */
  #element = null;
  /** @type {string} */
  #written = '';
  /** @type {string} */
  #marker;

  /** @param {string} marker  Identifies the sheet in the DOM when the fallback is used. */
  constructor(marker) {
    this.#marker = marker;
  }

  /** @param {ShadowRoot | HTMLElement | DocumentFragment} root */
  attach(root) {
    if (!(root instanceof ShadowRoot)) return;

    if (SUPPORTS_ADOPTING) {
      if (!this.#sheet) this.#sheet = new CSSStyleSheet();
      if (!root.adoptedStyleSheets.includes(this.#sheet)) {
        root.adoptedStyleSheets = [...root.adoptedStyleSheets, this.#sheet];
      }
      return;
    }

    if (!this.#element) {
      this.#element = document.createElement('style');
      this.#element.setAttribute(this.#marker, '');
    }
    if (this.#element.parentNode !== root) root.append(this.#element);
  }

  /**
   * Replace the sheet's contents. Cheap to call on every update: identical CSS
   * is ignored.
   *
   * @param {string} css
   * @param {ShadowRoot | HTMLElement | DocumentFragment} root
   */
  write(css, root) {
    if (css === this.#written) return;
    this.attach(root);

    if (this.#sheet) this.#sheet.replaceSync(css);
    else if (this.#element) this.#element.textContent = css;
    else return;

    this.#written = css;
  }

  detach() {
    this.#element?.remove();
    this.#element = null;
  }
}
