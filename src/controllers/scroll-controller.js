// @ts-check
import { Events, emit } from '../events.js';

/** @import { ReactiveController, LitElement } from 'lit' */
/** @import { Message } from '../types.js' */

/** How close to the end still counts as "at the bottom", in pixels. */
const BOTTOM_SLACK = 24;

/**
 * How long to keep treating the viewport as "ours" after starting a smooth
 * scroll, when the browser has no scrollend event to tell us it finished.
 */
const SMOOTH_GRACE_MS = 700;

/**
 * Keeps the conversation pinned to the newest message while the reader is at
 * the bottom, and gets out of the way the moment they scroll up.
 *
 * Two things follow from that rule. A reply arriving while the reader is up in
 * the history must not yank them down — it raises the "jump to latest" button
 * instead. And their own message always scrolls into view, because they just
 * pressed send and expect to see it.
 *
 * @implements {ReactiveController}
 */
export class ScrollController {
  /** @type {LitElement & { messages: Message[] }} */
  #host;
  /** @type {() => 'smooth' | 'instant'} */
  #preferredBehavior;
  /** @type {HTMLElement | null} */
  #viewport = null;
  /** @type {ResizeObserver | null} */
  #resize = null;

  #atBottom = true;
  #hasUnseen = false;
  #atTop = false;
  #followAfterRender = true;

  /**
   * True while a scroll we started is still animating. Scroll events during
   * that window report positions we caused, not where the reader went.
   */
  #selfScrolling = false;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  #selfScrollTimer;
  /** The first jump after the panel opens has nothing to animate from. */
  #openingJump = true;

  /** @type {string | undefined} */
  #lastId;
  #lastCount = 0;

  /**
   * @param {LitElement & { messages: Message[] }} host
   * @param {{ behavior: () => 'smooth' | 'instant' }} options
   */
  constructor(host, { behavior }) {
    this.#host = host;
    this.#preferredBehavior = behavior;
    host.addController(this);
  }

  /** @returns {boolean} True when newer content arrived while scrolled up. */
  get hasUnseen() {
    return this.#hasUnseen;
  }

  /** @returns {boolean} */
  get atBottom() {
    return this.#atBottom;
  }

  hostDisconnected() {
    this.#unbind();
    clearTimeout(this.#selfScrollTimer);
  }

  /**
   * Runs before the render, so a decision made here lands in the same frame.
   * Whether the conversation grew is knowable from the array alone; only the
   * scrolling itself has to wait for the DOM.
   */
  hostUpdate() {
    const messages = this.#host.messages;
    const last = messages[messages.length - 1];
    const grew = messages.length > this.#lastCount;
    const newTail = last?.id !== this.#lastId;

    this.#lastId = last?.id;
    this.#lastCount = messages.length;

    if (!grew && !newTail) return;

    // Their own message always scrolls into view: they just pressed send.
    if (this.#atBottom || last?.role === 'user') this.#followAfterRender = true;
    else this.#hasUnseen = true;
  }

  hostUpdated() {
    const viewport = /** @type {HTMLElement | null} */ (
      this.#host.renderRoot.querySelector('[part~="messages"]')
    );

    if (viewport !== this.#viewport) {
      this.#unbind();
      this.#viewport = viewport;
      this.#bind();
      // A freshly opened panel starts at the newest message, with no animation
      // to watch: there was nothing on screen to move away from.
      if (viewport) {
        this.#atBottom = true;
        this.#hasUnseen = false;
        this.#followAfterRender = true;
        this.#openingJump = true;
      }
    }

    if (this.#followAfterRender) {
      const behavior = this.#followBehavior;
      this.#followAfterRender = false;
      this.#scrollNow({ behavior });
    }
  }

  #bind() {
    if (!this.#viewport) return;
    this.#viewport.addEventListener('scroll', this.#onScroll, { passive: true });
    // Precise end-of-scroll where it exists (Chrome 114, Firefox 109,
    // Safari 17.4); the timer below covers the rest.
    this.#viewport.addEventListener('scrollend', this.#onScrollEnd);

    // Images finishing and streamed text growing both change the height
    // without a scroll event, so the follow has to react to size too.
    const inner = this.#viewport.firstElementChild;
    if (inner && typeof ResizeObserver !== 'undefined') {
      this.#resize = new ResizeObserver(() => {
        if (!this.#atBottom) return;
        // Content settling (an image loading, a tall block laying out) right
        // after a message arrived must not cut the follow short, so while our
        // own animation is running it is re-aimed rather than replaced. With
        // nothing in flight this is a streamed reply growing, and that is
        // followed instantly: an animation restarted every few tens of
        // milliseconds never lands.
        this.#scrollNow({ behavior: this.#selfScrolling ? 'smooth' : 'instant' });
      });
      this.#resize.observe(inner);
    }
  }

  #unbind() {
    this.#viewport?.removeEventListener('scroll', this.#onScroll);
    this.#viewport?.removeEventListener('scrollend', this.#onScrollEnd);
    this.#resize?.disconnect();
    this.#resize = null;
    this.#viewport = null;
  }

  #onScrollEnd = () => {
    this.#endSelfScroll();
  };

  #onScroll = () => {
    const viewport = this.#viewport;
    if (!viewport) return;

    const distance = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    const atBottom = distance <= BOTTOM_SLACK;

    // Our own animation passing through the middle of the list is not the
    // reader scrolling up.
    if (this.#selfScrolling) {
      if (atBottom) this.#endSelfScroll();
      return;
    }

    if (atBottom !== this.#atBottom) {
      this.#atBottom = atBottom;
      if (atBottom && this.#hasUnseen) {
        this.#hasUnseen = false;
        this.#host.requestUpdate();
      }
    }

    // One event per visit to the top, so a consumer loading older messages is
    // not asked again while the reader sits there.
    const atTop = viewport.scrollTop <= 0;
    if (atTop && !this.#atTop) emit(this.#host, Events.SCROLL_TOP, {});
    this.#atTop = atTop;
  };

  /**
   * @param {{ smooth?: boolean }} [options] Defaults to the theme's setting.
   */
  scrollToBottom({ smooth } = {}) {
    const behavior =
      smooth === undefined ? this.#followBehavior : smooth ? 'smooth' : 'instant';
    this.#scrollNow({ behavior });

    if (this.#hasUnseen) {
      this.#hasUnseen = false;
      this.#host.requestUpdate();
    }
  }

  /**
   * What the next follow should look like: the theme's choice, unless the
   * reader asked for less motion, or this is the jump that happens as the
   * panel opens.
   *
   * @returns {'smooth' | 'instant'}
   */
  get #followBehavior() {
    if (this.#openingJump) return 'instant';
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'instant';
    return this.#preferredBehavior();
  }

  /** @param {{ behavior?: 'smooth' | 'instant' }} [options] */
  #scrollNow({ behavior = 'instant' } = {}) {
    const viewport = this.#viewport;
    if (!viewport) return;

    this.#openingJump = false;
    if (behavior === 'smooth') this.#beginSelfScroll();

    viewport.scrollTo({ top: viewport.scrollHeight, behavior });
    this.#atBottom = true;
    this.#atTop = false;
    this.#hasUnseen = false;
  }

  #beginSelfScroll() {
    this.#selfScrolling = true;
    clearTimeout(this.#selfScrollTimer);
    this.#selfScrollTimer = setTimeout(() => this.#endSelfScroll(), SMOOTH_GRACE_MS);
  }

  #endSelfScroll() {
    if (!this.#selfScrolling) return;
    this.#selfScrolling = false;
    clearTimeout(this.#selfScrollTimer);

    // Take a reading now that the viewport has settled.
    const viewport = this.#viewport;
    if (!viewport) return;
    const distance = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    this.#atBottom = distance <= BOTTOM_SLACK;
  }
}
