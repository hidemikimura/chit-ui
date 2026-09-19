// @ts-check
import { LitElement, html, nothing } from 'lit';

import { unsafeHTML } from 'lit/directives/unsafe-html.js';

import { StateController } from './controllers/state-controller.js';
import { BreakpointController } from './controllers/breakpoint-controller.js';
import { ThemeController } from './controllers/theme-controller.js';
import { ScrollController } from './controllers/scroll-controller.js';
import { ComposerController } from './controllers/composer-controller.js';
import { renderLauncher } from './render/launcher.js';
import { renderPanel } from './render/panel.js';
import { resolveLabels, resolveLocale } from './i18n/labels.js';
import { Events, emit } from './events.js';
import { componentInstance, contentKey, pruneComponents } from './render/content.js';
import { AdoptedSheet } from './styles/adopted-sheet.js';
import { hostStyles } from './styles/host.css.js';
import { launcherStyles } from './styles/launcher.css.js';
import { panelStyles } from './styles/panel.css.js';
import { messageStyles } from './styles/message.css.js';
import { contentStyles } from './styles/content.css.js';
import { composerStyles } from './styles/composer.css.js';

/** @import { Message, Theme, ChatState, Trigger, Effect, Device, ResolvedTheme } from './types.js' */
/** @import { Labels } from './i18n/labels.js' */

/**
 * The chat widget.
 *
 * One custom element, one shadow root. Everything inside is drawn by plain
 * functions in `render/` and driven by the reactive controllers in
 * `controllers/`; no nested custom elements, so `::part()` and the theme's
 * custom properties reach every corner without being forwarded.
 *
 * @element chit-ui
 *
 * @slot launcher - Replaces the whole closed-state button content.
 * @slot header - Replaces the panel header.
 * @slot header-title - Replaces only the title area of the header.
 * @slot header-actions - Extra buttons beside the close button.
 * @slot footer - Below the composer (disclaimers, attribution).
 */
export class ChitUI extends LitElement {
  /** @override */
  static styles = [
    hostStyles,
    launcherStyles,
    panelStyles,
    messageStyles,
    contentStyles,
    composerStyles,
  ];

  /** @override */
  static properties = {
    state: { type: String, reflect: true, noAccessor: true },
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
    labels: { type: Object },
    messageStyles: { type: String },
  };

  /** @type {ChatState} */
  #state = 'closed';

  /**
   * Set by the widget's own event handlers just before they move the state, so
   * the events can say the move came from a person rather than from code.
   *
   * @type {Trigger}
   */
  #trigger = 'api';

  /** @type {StateController} */
  #transitions;

  /** @type {BreakpointController} */
  #breakpoint;

  /** @type {ThemeController} */
  #themes;

  /** @type {ScrollController} */
  #scroll;

  /** @type {ComposerController} */
  #composer;

  /** Consumer CSS for the inside of message bubbles. */
  #messageSheet = new AdoptedSheet('data-chit-message-styles');

  /** What each message's content was built from last render, by id. */
  /** @type {Map<string, unknown>} */
  #renderedContent = new Map();

  /** The in-flight transition, so the methods can hand it back to the caller. */
  /** @type {Promise<boolean> | null} */
  #settled = null;

  constructor() {
    super();

    /** @type {Theme} Partial; unset keys fall back to the default theme. */
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
     * Focus the composer once the open transition finishes. 'auto' focuses on
     * PC only, so a phone keyboard never pops up unasked.
     *
     * Named focusOnOpen rather than autofocus: HTMLElement.autofocus is a
     * standard boolean property and cannot carry a third value.
     *
     * @type {'auto' | 'always' | 'never'}
     */
    this.focusOnOpen = 'auto';

    /** @type {string | undefined} */
    this.locale = undefined;

    /** @type {Partial<Labels> | undefined} Overrides for the built-in UI strings. */
    this.labels = undefined;

    /** @type {string} Extra CSS applied inside message content. */
    this.messageStyles = '';

    /** @type {((html: string) => string) | undefined} Applied to `html` messages only. */
    this.sanitize = undefined;

    /** @type {((time: Date) => string) | undefined} */
    this.formatTime = undefined;

    this.#transitions = new StateController(this, {
      animation: (from, to, phase) => this.#animationFor(from, to, phase),
      keepsLauncher: () => this.currentTheme.open.launcher === 'visible',
      onOpened: () => this.#applyOpenFocus(),
    });

    this.#breakpoint = new BreakpointController(this);
    this.#themes = new ThemeController(this, { device: () => this.#breakpoint.device });
    this.addController(this.#themes);
    this.#scroll = new ScrollController(this, {
      behavior: () => this.currentTheme.open.animation.scroll,
    });
    this.#composer = new ComposerController(this);
  }

  /**
   * Current state. Assigning it starts the transition, exactly as calling the
   * matching method would.
   *
   * @type {ChatState}
   */
  get state() {
    return this.#state;
  }

  set state(value) {
    const previous = this.#state;
    if (value === previous) return;
    this.#state = value;
    this.requestUpdate('state', previous);

    // A transition the controller itself is applying (a revert, or the tail of
    // a method call) must not start another one.
    if (!this.#transitions || this.#transitions.applying) return;
    const trigger = this.#trigger;
    this.#trigger = 'api';

    const settled = this.#transitions.request(value, trigger);
    this.#settled = settled;
    void settled.then(() => {
      if (this.#settled === settled) this.#settled = null;
    });
  }

  /** @returns {Device} Which theme bucket the viewport currently falls in. */
  get device() {
    return this.#breakpoint.device;
  }

  /**
   * The theme in force for this device, every gap filled in.
   *
   * @returns {ResolvedTheme}
   */
  get currentTheme() {
    return this.#themes.current;
  }

  /** @returns {Labels} */
  get currentLabels() {
    return resolveLabels(this.locale, this.labels);
  }

  /**
   * The language in force: the `locale` property, else the document's.
   * Labels and timestamps both read it, so a page in Japanese does not end up
   * with Japanese buttons and American clock times.
   *
   * @returns {string | undefined}
   */
  get resolvedLocale() {
    return resolveLocale(this.locale);
  }

  /** @returns {ChatState} What the DOM is showing, which lags `state` while animating. */
  get renderedState() {
    return this.#transitions.renderedState;
  }

  /** @returns {boolean} True when messages arrived while the reader was scrolled up. */
  get hasUnseen() {
    return this.#scroll.hasUnseen;
  }

  /**
   * What is currently typed in the composer.
   *
   * Not a reactive property on purpose: a keystroke would otherwise re-render
   * the whole shadow tree, every message included.
   *
   * @type {string}
   */
  get value() {
    return this.#composer.value;
  }

  set value(next) {
    this.#composer.value = next;
  }

  /** @returns {boolean} Whether what is typed could be sent right now. */
  get canSend() {
    return this.#composer.canSend;
  }

  // --- public API -------------------------------------------------------

  /** @returns {Promise<boolean>} Resolves once the open animation has finished. */
  open() {
    return this.#go('open', 'api');
  }

  /** @returns {Promise<boolean>} */
  close() {
    return this.#go('closed', 'api');
  }

  /** @returns {Promise<boolean>} */
  hide() {
    return this.#go('hidden', 'api');
  }

  /** @returns {Promise<boolean>} From `hidden` back to the launcher. A no-op otherwise. */
  show() {
    return this.#state === 'hidden' ? this.#go('closed', 'api') : Promise.resolve(true);
  }

  /** @returns {Promise<boolean>} */
  toggle() {
    return this.#go(this.state === 'open' ? 'closed' : 'open', 'api');
  }

  /**
   * Send what is in the composer, or the given text, as `chat-submit`.
   *
   * Adding the message to `messages` stays the consumer's job; the widget only
   * reports that someone pressed send.
   *
   * @param {string} [text]
   * @returns {boolean} False when there was nothing to send.
   */
  submit(text) {
    return this.#composer.submit(text);
  }

  /** Empty the composer and put the caret back in it. */
  clearInput() {
    this.#composer.clear();
  }

  /**
   * Scroll the conversation to the newest message.
   *
   * @param {{ smooth?: boolean }} [options]
   */
  scrollToBottom(options) {
    this.#scroll.scrollToBottom(options);
  }

  /**
   * The content container of one message, once it has been drawn.
   *
   * @param {string} id
   * @returns {HTMLElement | null}
   */
  getMessageElement(id) {
    return /** @type {HTMLElement | null} */ (
      this.renderRoot.querySelector(`[part~="message"][data-id="${CSS.escape(id)}"] [part~="message-content"]`)
    );
  }

  /**
   * Put the caret in the composer.
   *
   * This obeys the caller, not `focusOnOpen`: someone who calls it has asked
   * for focus. `focusOnOpen` only governs what happens by itself on open.
   *
   * @returns {boolean} False when there is no composer to focus.
   */
  focusInput() {
    const input = /** @type {HTMLElement | null} */ (
      this.renderRoot.querySelector('[part~="input"]')
    );
    if (!input) return false;
    input.focus();
    return true;
  }

  /**
   * What the widget does with focus when the panel finishes opening.
   *
   * 'never' means exactly that: focus is left wherever the person had it, so a
   * widget that opens on its own does not steal the caret out of a form on the
   * page. Otherwise the composer takes it, or the panel does when there is no
   * composer, so that Esc and screen-reader navigation start inside the dialog.
   */
  #applyOpenFocus() {
    if (this.focusOnOpen === 'never') return;
    if (this.focusOnOpen === 'auto' && this.device === 'mobile') return;
    if (this.focusInput()) return;

    const panel = /** @type {HTMLElement | null} */ (
      this.renderRoot.querySelector('[part~="panel"]')
    );
    panel?.focus();
  }

  // --- composer plumbing, called by the render functions ------------------

  /** @param {Event} event */
  handleInput(event) {
    this.#composer.onInput(event);
  }

  /** @param {KeyboardEvent} event */
  handleKeydown(event) {
    this.#composer.onKeydown(event);
  }

  /** @param {boolean} started */
  handleComposition(started) {
    if (started) this.#composer.onCompositionStart();
    else this.#composer.onCompositionEnd();
  }

  /**
   * Report files the reader picked with the attach button.
   *
   * Nothing is uploaded, previewed or added to the conversation here: the
   * widget does not own `messages` and has nowhere to send bytes.
   *
   * @param {File[]} files
   * @returns {void}
   */
  handleAttach(files) {
    emit(this, Events.ATTACH, { files });
  }

  /** Open the file picker from code, as the attach button does. */
  openAttach() {
    const field = /** @type {HTMLInputElement | null} */ (
      this.renderRoot.querySelector('[part~="attach-input"]')
    );
    field?.click();
  }

  // --- internal ---------------------------------------------------------

  /**
   * Render a consumer-supplied typing bubble.
   *
   * @param {string} markup
   * @returns {unknown}
   */
  renderTypingHtml(markup) {
    return unsafeHTML(this.sanitize ? this.sanitize(markup) : markup);
  }

  /**
   * Re-publish a click inside a message as `chat-message-click`.
   *
   * `composedPath()[0]` rather than `event.target`: the target is retargeted to
   * the message container once the event leaves a component's shadow root, and
   * the consumer wants the element actually clicked.
   *
   * @param {MouseEvent} event
   */
  handleMessageClick(event) {
    const path = event.composedPath();
    const article = /** @type {HTMLElement | undefined} */ (
      path.find(
        (node) =>
          node instanceof HTMLElement && node.getAttribute('part')?.split(/\s+/).includes('message'),
      )
    );
    if (!article) return;

    const id = article.dataset.id;
    const message = this.messages.find((candidate) => candidate.id === id);
    if (!message) return;

    const target = /** @type {Element} */ (path[0]);
    const allowed = emit(
      this,
      Events.MESSAGE_CLICK,
      { message, target, originalEvent: event },
      { cancelable: true },
    );
    if (!allowed) event.preventDefault();
  }

  /** Called by the launcher; the resulting events report `trigger: 'user'`. */
  toggleFromUser() {
    return this.#go(this.state === 'open' ? 'closed' : 'open', 'user');
  }

  /** Called by the close button and by Esc. */
  closeFromUser() {
    return this.#go('closed', 'user');
  }

  /**
   * Ask to start the conversation over.
   *
   * The widget only announces it: `messages` belongs to the consumer, so
   * clearing it, replaying a scenario or asking for confirmation first are all
   * theirs to do. Cancelling the event is not offered for the same reason —
   * there is nothing here to cancel.
   *
   * @param {Trigger} [trigger='api']
   * @returns {void}
   */
  home(trigger = 'api') {
    emit(this, Events.HOME, { trigger });
  }

  /**
   * @param {ChatState} to
   * @param {Trigger} trigger
   * @returns {Promise<boolean>}
   */
  #go(to, trigger) {
    if (to !== this.#state) {
      this.#trigger = trigger;
      this.state = to;
    }
    return this.#settled ?? Promise.resolve(true);
  }

  /**
   * Which effect and how long, for one leg of a transition.
   *
   * Leaving for `hidden` uses the hidden theme's exit; every other leg uses the
   * theme of the state being left or entered.
   *
   * @param {ChatState} from
   * @param {ChatState} to
   * @param {'enter' | 'exit'} phase
   * @returns {{ effect: Effect, duration: number }}
   */
  #animationFor(from, to, phase) {
    const theme = this.currentTheme;

    if (phase === 'exit' && to === 'hidden') {
      return { effect: theme.hidden.animation.exit, duration: theme.hidden.animation.duration };
    }

    const source = (phase === 'exit' ? from : to) === 'open' ? theme.open : theme.closed;
    return {
      effect: phase === 'exit' ? source.animation.exit : source.animation.enter,
      duration: source.animation.duration,
    };
  }

  /** @override */
  willUpdate() {
    // Order matters: the breakpoint decides the device, and the device decides
    // which `closed` settings the theme resolves to.
    this.#breakpoint.observe(ThemeController.breakpointOf(this.theme));
    this.#themes.apply(this.theme, this.#breakpoint.device);

    this.#messageSheet.write(this.messageStyles ?? '', this.renderRoot);

    const theme = this.currentTheme;
    this.dataset.launcherPosition = theme.closed.position;
    this.dataset.panelPosition = theme.open.position;
    this.dataset.idle = theme.closed.animation.idle;
    this.dataset.bubbleTail = theme.open.bubble.tail;
  }

  /** @override */
  updated() {
    const live = new Set(this.messages.map((message) => message.id));
    pruneComponents(this, live);
    this.#announceRenders(live);
  }

  /**
   * Fire `chat-message-render` for messages that were drawn for the first time
   * or whose content changed.
   *
   * Only the content matters here: a status or streaming flag flipping redraws
   * the bubble but leaves the consumer's markup alone, and firing then would
   * make listeners re-bind on every token of a streamed reply.
   *
   * @param {Set<string>} live
   */
  #announceRenders(live) {
    for (const id of this.#renderedContent.keys()) {
      if (!live.has(id)) this.#renderedContent.delete(id);
    }

    for (const message of this.messages) {
      const key = contentKey(message);
      if (this.#renderedContent.has(message.id) && Object.is(this.#renderedContent.get(message.id), key)) {
        continue;
      }
      this.#renderedContent.set(message.id, key);

      const element = this.getMessageElement(message.id);
      if (!element) continue;
      emit(this, Events.MESSAGE_RENDER, {
        message,
        element,
        instance: componentInstance(this, message.id),
      });
    }
  }

  /** @override */
  render() {
    const shown = this.renderedState;
    const showLauncher =
      shown === 'closed' || (shown === 'open' && this.currentTheme.open.launcher === 'visible');
    const showPanel = shown === 'open';

    return html`
      ${showLauncher ? renderLauncher(this) : nothing} ${showPanel ? renderPanel(this) : nothing}
    `;
  }
}
