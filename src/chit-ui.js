// @ts-check
import { LitElement, html } from 'lit';
import { hostStyles } from './styles/host.css.js';

/** @import { Message, Theme, ChatState } from './types.js' */

/**
 * The chat widget. One custom element, one shadow root; everything inside is
 * rendered by plain functions and driven by reactive controllers.
 *
 * @element chit-ui
 */
export class ChitUI extends LitElement {
  /** @override */
  static styles = [hostStyles];

  /** @override */
  static properties = {
    state: { type: String, reflect: true },
    theme: { type: Object },
    messages: { type: Array },
    typing: { type: Object },
    busy: { type: Boolean, reflect: true },
    inputDisabled: { type: Boolean, reflect: true, attribute: 'input-disabled' },
    inputHidden: { type: Boolean, reflect: true, attribute: 'input-hidden' },
    placeholder: { type: String, reflect: true },
    sendOnEnter: { type: Boolean, reflect: true, attribute: 'send-on-enter' },
    maxLength: { type: Number, reflect: true, attribute: 'max-length' },
    focusOnOpen: { type: String, reflect: true, attribute: 'focus-on-open' },
    locale: { type: String, reflect: true },
    messageStyles: { type: String },
  };

  constructor() {
    super();

    /** @type {ChatState} Current state. Assigning it triggers the transition. */
    this.state = 'closed';

    /** @type {Theme} Partial theme; unset keys fall back to the default theme. */
    this.theme = {};

    /** @type {Message[]} Rendered as given. The library never mutates this. */
    this.messages = [];

    /** @type {boolean | { html: string }} Show the "typing" bubble. */
    this.typing = false;

    /** @type {boolean} Lock the composer while a reply is in flight. */
    this.busy = false;

    /** @type {boolean} */
    this.inputDisabled = false;

    /** @type {boolean} */
    this.inputHidden = false;

    /** @type {string | undefined} */
    this.placeholder = undefined;

    /** @type {boolean} */
    this.sendOnEnter = true;

    /** @type {number | undefined} */
    this.maxLength = undefined;

    /**
     * Focus the composer once the open transition finishes.
     * 'auto' focuses on PC only, so a phone keyboard never pops up unasked.
     * (Named focusOnOpen rather than autofocus: HTMLElement.autofocus is a
     * standard boolean property and cannot carry a third value.)
     *
     * @type {'auto' | 'always' | 'never'}
     */
    this.focusOnOpen = 'auto';

    /** @type {string | undefined} */
    this.locale = undefined;

    /** @type {string} Extra CSS applied inside message content. */
    this.messageStyles = '';

    /** @type {((html: string) => string) | undefined} Applied to `html` messages only. */
    this.sanitize = undefined;

    /** @type {((time: Date) => string) | undefined} */
    this.formatTime = undefined;
  }

  /** @override */
  render() {
    // Milestone 1 placeholder. Milestone 2 replaces this with the launcher and
    // panel render functions driven by StateController.
    return html`
      <button
        part="launcher"
        style="
          position: absolute;
          right: var(--chit-launcher-offset-x);
          bottom: var(--chit-launcher-offset-y);
          width: var(--chit-launcher-size);
          height: var(--chit-launcher-size);
          border: 0;
          border-radius: var(--chit-launcher-radius);
          background: var(--chit-launcher-bg);
          color: var(--chit-launcher-text);
          box-shadow: var(--chit-launcher-shadow);
          cursor: pointer;
          font: inherit;
        "
        aria-label="chat"
      >
        ...
      </button>
    `;
  }
}
