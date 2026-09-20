// @ts-check
import { Events, emit } from '../events.js';

/** @import { ReactiveController, LitElement } from 'lit' */

/** Browsers that size a textarea to its content need no JS help. */
const SUPPORTS_FIELD_SIZING =
  typeof CSS !== 'undefined' && CSS.supports?.('field-sizing', 'content');

/**
 * Owns the composer: what has been typed, whether an IME is mid-composition,
 * and when a keystroke counts as "send".
 *
 * The typed text is deliberately not a reactive property. A keystroke would
 * otherwise re-render the whole shadow tree, `repeat` over every message
 * included; instead the two things that depend on it — the send button's
 * enabled state and the character counter — are updated in place.
 *
 * @implements {ReactiveController}
 */
export class ComposerController {
  /** @type {LitElement & ComposerHost} */
  #host;

  #value = '';

  /** True between compositionstart and compositionend. */
  #composing = false;

  /**
   * True for one turn of the event loop after a composition ends.
   *
   * WebKit dispatches the Enter that confirmed an IME candidate as a plain
   * keydown *after* compositionend, with `isComposing` already false — so
   * without this flag, confirming a Japanese candidate would send the message.
   */
  #justComposed = false;

  /** @type {ReturnType<typeof setTimeout> | undefined} */
  #composedTimer;

  /** @param {LitElement & ComposerHost} host */
  constructor(host) {
    this.#host = host;
    host.addController(this);
  }

  /** @returns {string} */
  get value() {
    return this.#value;
  }

  set value(next) {
    this.#value = next ?? '';
    const input = this.#input;
    if (input && input.value !== this.#value) input.value = this.#value;
    this.#grow();
    this.#syncDerived();
  }

  /** @returns {boolean} True while an IME candidate window is open. */
  get composing() {
    return this.#composing;
  }

  /** @returns {number} Characters typed, counted by code point. */
  get length() {
    return Array.from(this.#value).length;
  }

  /** @returns {boolean} Whether the current text could be sent right now. */
  get canSend() {
    if (this.#host.busy || this.#host.inputDisabled) return false;
    if (this.#value.trim() === '') return false;
    const limit = this.#host.maxLength;
    return limit === undefined || this.length <= limit;
  }

  hostDisconnected() {
    clearTimeout(this.#composedTimer);
  }

  hostUpdated() {
    const input = this.#input;
    if (input && input.value !== this.#value) input.value = this.#value;
    this.#grow();
    this.#syncDerived();
  }

  /** @returns {HTMLTextAreaElement | null} */
  get #input() {
    return /** @type {HTMLTextAreaElement | null} */ (
      this.#host.renderRoot.querySelector('[part~="input"]')
    );
  }

  /** @param {Event} event */
  onInput(event) {
    this.#value = /** @type {HTMLTextAreaElement} */ (event.target).value;
    this.#grow();
    this.#syncDerived();
    emit(this.#host, Events.INPUT, { value: this.#value });
  }

  onCompositionStart() {
    this.#composing = true;
  }

  onCompositionEnd() {
    this.#composing = false;
    this.#justComposed = true;
    clearTimeout(this.#composedTimer);
    this.#composedTimer = setTimeout(() => {
      this.#justComposed = false;
    }, 0);
  }

  /** @param {KeyboardEvent} event */
  onKeydown(event) {
    if (event.key !== 'Enter') return;
    if (!this.#host.sendOnEnter) return;
    // Shift+Enter is a newline; the others are the browser's or the page's.
    if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;

    // Chrome, Edge and Firefox mark the confirming Enter on the event itself.
    // Older engines only set keyCode 229.
    if (event.isComposing || event.keyCode === 229) return;
    // Safari's post-compositionend Enter, and Android soft keyboards that send
    // Enter while a composition is still open.
    if (this.#composing || this.#justComposed) return;

    event.preventDefault();
    this.submit();
  }

  /**
   * Hand the text to the consumer and clear the box.
   *
   * The text is passed as typed: leading and trailing newlines are theirs to
   * keep or strip, since only they know whether the message is prose or code.
   *
   * @param {string} [text]  Defaults to what is in the box.
   * @returns {boolean} False when there was nothing to send.
   */
  submit(text) {
    const value = text ?? this.#value;
    if (text === undefined && !this.canSend) return false;
    if (text !== undefined && (this.#host.busy || this.#host.inputDisabled)) return false;
    if (value.trim() === '') return false;

    const allowed = emit(this.#host, Events.SUBMIT, { text: value }, { cancelable: true });
    if (!allowed) return false;

    this.clear();
    this.#host.handleSubmitted();
    return true;
  }

  clear() {
    this.value = '';
    this.focus();
  }

  focus() {
    this.#input?.focus();
  }

  /** Grow the box with its content, up to the theme's row limit. */
  #grow() {
    if (SUPPORTS_FIELD_SIZING) return;
    const input = this.#input;
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = `${input.scrollHeight}px`;
  }

  /**
   * Update the parts that depend on the typed text without a re-render.
   */
  #syncDerived() {
    const root = this.#host.renderRoot;

    const send = /** @type {HTMLButtonElement | null} */ (
      root.querySelector('[part~="send-button"]')
    );
    if (send) send.disabled = !this.canSend;

    const input = this.#input;
    const counter = /** @type {HTMLElement | null} */ (root.querySelector('[part~="counter"]'));
    const limit = this.#host.maxLength;
    if (limit === undefined) return;

    const remaining = limit - this.length;
    const over = remaining < 0;
    input?.setAttribute('aria-invalid', over ? 'true' : 'false');

    if (!counter) return;
    counter.textContent = String(remaining);
    counter.toggleAttribute('data-over', over);
    // The digits alone ("-14") say nothing out loud, so the counter carries a
    // sentence for assistive tech while showing just the number.
    const labels = this.#host.currentLabels;
    const template = over ? labels.overLimit : labels.charactersLeft;
    counter.setAttribute('aria-label', template.replace('{n}', String(Math.abs(remaining))));
    counter.hidden = this.length <= limit * 0.8;
  }
}

/**
 * @typedef {Object} ComposerHost
 * @property {boolean} busy
 * @property {boolean} inputDisabled
 * @property {boolean} sendOnEnter
 * @property {number | undefined} maxLength
 * @property {import('../i18n/labels.js').Labels} currentLabels
 * @property {() => void} handleSubmitted  Called after a submit that no listener cancelled.
 */
