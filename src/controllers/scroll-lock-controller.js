// @ts-check

/** @import { ReactiveController, LitElement } from 'lit' */

/** How far a finger must travel before the gesture's direction is trusted. */
const THRESHOLD = 3;

/** Slack on the "is there anywhere left to scroll" reading, in pixels. */
const EDGE_SLACK = 1;

/** Overflow values that make an element a scroll container. */
const SCROLLABLE = /^(auto|scroll|overlay)$/;

/**
 * Keeps a touch that lands on the open panel from scrolling the page behind
 * it.
 *
 * `overscroll-behavior: contain` is on the message list already, and it does
 * the job for the case it covers: a list that can scroll, dragged past its
 * own end. It has nothing to say about the cases that actually leak. A short
 * conversation does not overflow, so the list is not a scroll container at
 * all and the touch goes straight through to the document — which is what a
 * reader on an iPhone sees as the page sliding around underneath a chat that
 * looks like it should be holding still. The same happens for a touch that
 * starts on the title bar or beside the input.
 *
 * So the rule is decided here instead: a touch on the panel may scroll
 * something inside the panel, and otherwise it does nothing. On the first
 * move of each gesture the controller looks along the touch's own path —
 * `composedPath`, so a scroller inside a consumer's component counts too —
 * for something that can still travel in the direction the finger is going.
 * Finding one, it stands aside for the rest of the gesture; finding none, it
 * cancels the move, and iOS then takes the whole gesture as "not a scroll".
 *
 * Two touches are left alone: that is a pinch, and zooming is the reader's.
 * A move that is no longer cancelable is left alone too — the browser has
 * already committed to scrolling, and `overscroll-behavior` is what keeps
 * that inside the list.
 *
 * @implements {ReactiveController}
 */
export class ScrollLockController {
  /** @type {LitElement} */
  #host;

  /** @type {HTMLElement | null} */
  #panel = null;

  /**
   * The gesture in flight: where it started, and what was decided about it.
   *
   * @type {{ x: number, y: number, verdict: 'undecided' | 'allow' | 'block' } | undefined}
   */
  #touch;

  /** @param {LitElement} host */
  constructor(host) {
    this.#host = host;
    host.addController(this);
  }

  hostUpdated() {
    const panel = /** @type {HTMLElement | null} */ (
      this.#host.renderRoot?.querySelector('[part~="panel"]') ?? null
    );
    if (panel === this.#panel) return;

    this.#unbind();
    this.#panel = panel;
    this.#bind();
  }

  hostDisconnected() {
    this.#unbind();
  }

  #bind() {
    const panel = this.#panel;
    if (!panel) return;
    panel.addEventListener('touchstart', this.#onStart, { passive: true });
    // Cancelling a move is the whole point, so this one cannot be passive.
    panel.addEventListener('touchmove', this.#onMove, { passive: false });
    panel.addEventListener('touchend', this.#onEnd, { passive: true });
    panel.addEventListener('touchcancel', this.#onEnd, { passive: true });
  }

  #unbind() {
    const panel = this.#panel;
    if (!panel) return;
    panel.removeEventListener('touchstart', this.#onStart);
    panel.removeEventListener('touchmove', this.#onMove);
    panel.removeEventListener('touchend', this.#onEnd);
    panel.removeEventListener('touchcancel', this.#onEnd);
    this.#panel = null;
    this.#touch = undefined;
  }

  /** @param {TouchEvent} event */
  #onStart = (event) => {
    if (event.touches.length !== 1) {
      this.#touch = undefined;
      return;
    }
    const touch = event.touches[0];
    this.#touch = { x: touch.clientX, y: touch.clientY, verdict: 'undecided' };
  };

  #onEnd = () => {
    this.#touch = undefined;
  };

  /** @param {TouchEvent} event */
  #onMove = (event) => {
    const from = this.#touch;
    if (!from) return;

    // A second finger arriving turns this into a pinch. Hands off for the
    // rest of the gesture, zoom included.
    if (event.touches.length > 1) {
      this.#touch = undefined;
      return;
    }

    if (from.verdict === 'block') {
      if (event.cancelable) event.preventDefault();
      return;
    }
    if (from.verdict === 'allow') return;

    const touch = event.touches[0];
    const dx = touch.clientX - from.x;
    const dy = touch.clientY - from.y;
    // Too small to read a direction from, and too small for the browser to
    // have started scrolling either.
    if (Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return;

    const vertical = Math.abs(dy) >= Math.abs(dx);
    const allowed = this.#canScroll(event, vertical, vertical ? dy : dx);
    from.verdict = allowed ? 'allow' : 'block';
    if (!allowed && event.cancelable) event.preventDefault();
  };

  /**
   * Is there something between the touch and the panel that can still scroll
   * the way the finger is going?
   *
   * @param {TouchEvent} event
   * @param {boolean} vertical
   * @param {number} delta Positive when the finger moves down, or right.
   * @returns {boolean}
   */
  #canScroll(event, vertical, delta) {
    const panel = this.#panel;
    if (!panel) return true;

    for (const node of event.composedPath()) {
      if (!(node instanceof HTMLElement)) continue;

      if (this.#hasRoom(node, vertical, delta)) return true;
      if (node === panel) break;
    }
    return false;
  }

  /**
   * @param {HTMLElement} element
   * @param {boolean} vertical
   * @param {number} delta
   * @returns {boolean}
   */
  #hasRoom(element, vertical, delta) {
    const style = getComputedStyle(element);
    const overflow = vertical ? style.overflowY : style.overflowX;
    if (!SCROLLABLE.test(overflow)) return false;

    const position = vertical ? element.scrollTop : element.scrollLeft;
    const size = vertical ? element.clientHeight : element.clientWidth;
    const content = vertical ? element.scrollHeight : element.scrollWidth;
    if (content <= size + EDGE_SLACK) return false;

    // A finger moving down pulls the content down, which means reading from
    // further up: there has to be something above the current position.
    return delta > 0 ? position > EDGE_SLACK : position < content - size - EDGE_SLACK;
  }
}
