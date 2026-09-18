// @ts-check
import { Events, emit } from '../events.js';

/** @import { ReactiveController, LitElement } from 'lit' */
/** @import { ChatState, Trigger, Effect } from '../types.js' */

/**
 * @typedef {{ effect: Effect, duration: number }} AnimationSpec
 * @typedef {(from: ChatState, to: ChatState, phase: 'enter' | 'exit') => AnimationSpec} AnimationResolver
 *
 * @typedef {Object} StateControllerOptions
 * @property {AnimationResolver} animation   Which effect and duration to play.
 * @property {() => boolean} keepsLauncher   True when the launcher stays visible behind an open panel.
 * @property {() => void} onOpened           Called once the panel is open and settled.
 */

/** Which `part` carries the visible element of each state. */
const PART_FOR_STATE = /** @type {const} */ ({
  closed: 'launcher',
  open: 'panel',
  hidden: null,
});

/**
 * Owns everything about moving between closed / open / hidden.
 *
 * The host's `state` property changes the instant it is assigned; what the DOM
 * shows lags behind it for as long as the transition animation runs. That
 * lagging value is `renderedState`, and the render functions key off it — so a
 * panel animating out is still in the DOM while `state` already reads 'closed'.
 *
 * @implements {ReactiveController}
 */
export class StateController {
  /** @type {LitElement & { state: ChatState }} */
  #host;
  /** @type {AnimationResolver} */
  #resolveAnimation;
  /** @type {() => boolean} */
  #keepsLauncher;
  /** @type {() => void} */
  #onOpened;

  /** Logical state: the target of the most recent transition. */
  #current = /** @type {ChatState} */ ('closed');
  /** What the DOM is showing right now. */
  #rendered = /** @type {ChatState} */ ('closed');

  /** Guards the host's own `state` setter against re-entering us. */
  #applying = false;
  /** Bumped per transition so a superseded one can bail out after an await. */
  #generation = 0;
  /** @type {((settled: boolean) => void) | null} */
  #settle = null;
  /** @type {(() => void) | null} */
  #stopWaiting = null;
  /** @type {boolean} */
  #restoreFocusToLauncher = false;

  /**
   * @param {LitElement & { state: ChatState }} host
   * @param {StateControllerOptions} options
   */
  constructor(host, { animation, keepsLauncher, onOpened }) {
    this.#host = host;
    this.#resolveAnimation = animation;
    this.#keepsLauncher = keepsLauncher;
    this.#onOpened = onOpened;
    host.addController(this);
  }

  /** @returns {ChatState} What the DOM currently shows. */
  get renderedState() {
    return this.#rendered;
  }

  /** @returns {boolean} True while the host's own setter must not call us back. */
  get applying() {
    return this.#applying;
  }

  hostConnected() {
    this.#current = this.#host.state;
    this.#rendered = this.#host.state;
    this.#host.dataset.renderedState = this.#rendered;
  }

  hostDisconnected() {
    this.#stopWaiting?.();
    this.#stopWaiting = null;
    this.#settle?.(false);
    this.#settle = null;
  }

  hostUpdated() {
    this.#host.dataset.renderedState = this.#rendered;
  }

  /**
   * Move to `to`, running the before-event, the animations and the completion
   * events in order.
   *
   * @param {ChatState} to
   * @param {Trigger} trigger
   * @returns {Promise<boolean>} false when a listener cancelled it, or when a
   *   later transition superseded this one.
   */
  request(to, trigger) {
    const from = this.#current;
    if (to === from) return Promise.resolve(true);

    if (!this.#announceIntent(from, to, trigger)) {
      this.#assign(from);
      return Promise.resolve(false);
    }

    // A transition already in flight loses: snap the DOM to where it was
    // heading, tell its caller it did not finish, and start over from there.
    this.#interrupt();

    this.#current = to;
    this.#assign(to);
    emit(this.#host, Events.STATE_CHANGE, { from, to, trigger });

    return this.#run(from, to, trigger);
  }

  /**
   * Fire the cancelable before-event for this transition, if it has one.
   *
   * @param {ChatState} from
   * @param {ChatState} to
   * @param {Trigger} trigger
   * @returns {boolean} false when a listener called preventDefault().
   */
  #announceIntent(from, to, trigger) {
    if (to === 'open') {
      return emit(this.#host, Events.BEFORE_OPEN, { from, trigger }, { cancelable: true });
    }
    if (to === 'closed' && from === 'open') {
      return emit(this.#host, Events.BEFORE_CLOSE, { from, trigger }, { cancelable: true });
    }
    return true;
  }

  #interrupt() {
    this.#generation += 1;
    this.#stopWaiting?.();
    this.#stopWaiting = null;
    this.#settle?.(false);
    this.#settle = null;
    if (this.#rendered !== this.#current) {
      this.#rendered = this.#current;
      this.#host.requestUpdate();
    }
  }

  /**
   * @param {ChatState} from
   * @param {ChatState} to
   * @param {Trigger} trigger
   * @returns {Promise<boolean>}
   */
  #run(from, to, trigger) {
    const generation = this.#generation;
    /** @type {Promise<boolean>} */
    const settled = new Promise((resolve) => {
      this.#settle = resolve;
    });

    void (async () => {
      this.#restoreFocusToLauncher = this.#focusIsInsidePanel();
      await this.#host.updateComplete;
      if (generation !== this.#generation) return;

      const leaving = this.#elementFor(from);
      if (leaving && !this.#launcherSurvives(from, to)) {
        await this.#animate(leaving, 'exit', this.#resolveAnimation(from, to, 'exit'));
        if (generation !== this.#generation) return;
      }

      this.#rendered = to;
      this.#host.requestUpdate();
      await this.#host.updateComplete;
      if (generation !== this.#generation) return;

      const arriving = this.#elementFor(to);
      if (arriving) {
        await this.#animate(arriving, 'enter', this.#resolveAnimation(from, to, 'enter'));
        if (generation !== this.#generation) return;
      }

      this.#announceArrival(from, to, trigger);
      this.#manageFocus(to);

      this.#settle?.(true);
      this.#settle = null;
    })();

    return settled;
  }

  /**
   * Whether the element of `from` survives the transition and so must not play
   * an exit animation. Only the launcher can, and only when the theme asks to
   * keep it visible behind an open panel.
   *
   * @param {ChatState} from
   * @param {ChatState} to
   * @returns {boolean}
   */
  #launcherSurvives(from, to) {
    return from === 'closed' && to === 'open' && this.#keepsLauncher();
  }

  /**
   * @param {ChatState} from
   * @param {ChatState} to
   * @param {Trigger} trigger
   */
  #announceArrival(from, to, trigger) {
    if (from === 'hidden') emit(this.#host, Events.SHOW, { from, to });
    if (to === 'hidden') {
      emit(this.#host, Events.HIDE, { from, to });
      return;
    }
    if (to === 'open') emit(this.#host, Events.OPEN, { from, trigger });
    else if (to === 'closed' && from === 'open') emit(this.#host, Events.CLOSE, { from, trigger });
  }

  /** @param {ChatState} to */
  #manageFocus(to) {
    if (to === 'open') {
      this.#onOpened();
      return;
    }
    if (to === 'closed' && this.#restoreFocusToLauncher) {
      this.#elementFor('closed')?.focus();
    }
    this.#restoreFocusToLauncher = false;
  }

  #focusIsInsidePanel() {
    const active = this.#host.renderRoot instanceof ShadowRoot
      ? this.#host.renderRoot.activeElement
      : null;
    const panel = this.#elementFor('open');
    return !!(active && panel && (active === panel || panel.contains(active)));
  }

  /**
   * @param {ChatState} state
   * @returns {HTMLElement | null}
   */
  #elementFor(state) {
    const part = PART_FOR_STATE[state];
    if (!part) return null;
    return /** @type {HTMLElement | null} */ (
      this.#host.renderRoot.querySelector(`[part~="${part}"]`)
    );
  }

  /**
   * Assign the host's `state` without the setter calling us back.
   *
   * @param {ChatState} state
   */
  #assign(state) {
    if (this.#host.state === state) return;
    this.#applying = true;
    this.#host.state = state;
    this.#applying = false;
  }

  /**
   * Play one CSS animation and resolve when it ends. Resolves immediately when
   * there is nothing to play; falls back to a timer in case `animationend`
   * never arrives (a backgrounded tab, a display:none ancestor).
   *
   * @param {HTMLElement} element
   * @param {'enter' | 'exit'} phase
   * @param {AnimationSpec} spec
   * @returns {Promise<void>}
   */
  #animate(element, phase, spec) {
    const { effect, duration } = spec;
    const skip =
      effect === 'none' ||
      duration <= 0 ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (skip) return Promise.resolve();

    return new Promise((resolve) => {
      let finished = false;
      /** @param {Event} [event] */
      const finish = (event) => {
        if (event && event.target !== element) return;
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        element.removeEventListener('animationend', finish);
        element.removeAttribute('data-anim');
        element.style.removeProperty('--_chit-anim-duration');
        if (this.#stopWaiting === finish) this.#stopWaiting = null;
        resolve();
      };

      element.dataset.effect = effect;
      element.dataset.anim = phase;
      element.style.setProperty('--_chit-anim-duration', `${duration}ms`);
      element.addEventListener('animationend', finish);
      const timer = setTimeout(finish, duration + 50);
      this.#stopWaiting = finish;
    });
  }
}
