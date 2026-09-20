// @ts-check

/** @import { ReactiveController, LitElement } from 'lit' */
/** @import { Position } from '../types.js' */

/** How far a pointer may travel before the gesture counts as a drag, not a click. */
const SLOP = 4;

/** How close to the viewport edge the dragged thing may come. */
const MARGIN = 8;

/** Arrow-key step, and the bigger step Shift asks for. */
const STEP = 8;
const BIG_STEP = 32;

/**
 * Moves one thing — the launcher or the panel — around the viewport.
 *
 * What a gesture produces is not a position but a displacement: how far the
 * reader has dragged the widget from wherever the theme put it, in screen
 * pixels. The host keeps one such displacement for the whole widget and hands
 * it to both controllers, which is what makes the two states travel together:
 * drag the launcher into a corner and the panel opens in that same corner,
 * because both are the theme's position plus the same shift.
 *
 * Each controller then turns the displacement into the terms its own corner
 * uses — at a right-hand corner, moving right means a smaller offset — and
 * writes it into the two custom properties the stylesheet already reads. The
 * offset lives on the host as an inline property, which outranks the theme's
 * sheet and the page's CSS: a reader who dragged the widget somewhere means
 * it, and until the drag is cleared theirs is the most specific word on where
 * it goes.
 *
 * @implements {ReactiveController}
 */
export class DragController {
  /** @type {LitElement} */
  #host;

  /** @type {DragOptions} */
  #options;

  /**
   * Pointer state, only while a gesture is in flight.
   *
   * @type {{
   *   pointer: { x: number, y: number },
   *   displacement: { x: number, y: number },
   *   size: { width: number, height: number },
   *   corner: Position,
   *   base: { x: number, y: number },
   *   moved: boolean,
   *   pointerId: number,
   *   target: HTMLElement,
   * } | undefined}
   */
  #from;

  /** True once a gesture has passed the slop, until the click that follows it. */
  #dragged = false;

  /**
   * @param {LitElement} host
   * @param {DragOptions} options
   */
  constructor(host, options) {
    this.#host = host;
    this.#options = options;
    host.addController(this);
  }

  hostConnected() {
    // A smaller window can leave the widget hanging off the edge; placing it
    // again runs it back through the clamp.
    this.#onResize = () => {
      const now = this.#options.current();
      if (now) this.#options.onMove(now);
    };
    window.addEventListener('resize', this.#onResize);
  }

  hostDisconnected() {
    if (this.#onResize) window.removeEventListener('resize', this.#onResize);
    this.#onResize = undefined;
  }

  /** @type {(() => void) | undefined} */
  #onResize;

  /**
   * True when the gesture that just ended was a drag. Reading it clears it, so
   * the click a pointer-up fires can be skipped exactly once.
   *
   * @returns {boolean}
   */
  consumeDrag() {
    const dragged = this.#dragged;
    this.#dragged = false;
    return dragged;
  }

  /**
   * Put this thing where the displacement says, within the viewport.
   *
   * @param {{ x: number, y: number } | null} displacement
   * @returns {{ x: number, y: number } | undefined} Where it ended up, when it is on screen.
   */
  place(displacement) {
    if (!displacement) {
      for (const name of [this.#options.vars.x, this.#options.vars.y]) {
        this.#host.style.removeProperty(name);
      }
      return undefined;
    }

    const element = this.#options.element();
    const offset = this.#toOffset(displacement);
    // Nothing on screen yet: write it anyway, so the thing is already in
    // place the moment it is rendered, and let the next pass clamp it.
    const placed = element ? this.#clamp(offset, this.#options.size()) : offset;

    this.#host.style.setProperty(this.#options.vars.x, `${placed.x}px`);
    this.#host.style.setProperty(this.#options.vars.y, `${placed.y}px`);
    return element ? placed : undefined;
  }

  /**
   * Begin a drag.
   *
   * @param {PointerEvent} event
   * @returns {void}
   */
  start(event) {
    if (!this.#options.enabled() || event.button !== 0) return;
    const element = this.#options.element();
    if (!element) return;

    this.#from = {
      pointer: { x: event.clientX, y: event.clientY },
      displacement: this.#options.current() ?? { x: 0, y: 0 },
      size: this.#options.size(),
      corner: this.#options.corner(),
      base: this.#options.base(),
      moved: false,
      pointerId: event.pointerId,
      target: /** @type {HTMLElement} */ (event.currentTarget),
    };

    // Capture keeps the moves coming even when the pointer leaves the handle.
    // It throws if the pointer has already gone; the drag still works without
    // it, so there is nothing to do about that but carry on.
    try {
      this.#from.target.setPointerCapture(event.pointerId);
    } catch {
      /* no capture available */
    }

    this.#from.target.addEventListener('pointermove', this.#onPointerMove);
    this.#from.target.addEventListener('pointerup', this.#onPointerEnd);
    this.#from.target.addEventListener('pointercancel', this.#onPointerEnd);
  }

  /** @param {PointerEvent} event */
  #onPointerMove = (event) => {
    const from = this.#from;
    if (!from || event.pointerId !== from.pointerId) return;

    const dx = event.clientX - from.pointer.x;
    const dy = event.clientY - from.pointer.y;
    if (!from.moved && Math.hypot(dx, dy) < SLOP) return;

    from.moved = true;
    // A drag must not also select text or scroll the page under the finger.
    event.preventDefault();
    this.#options.onMove(
      this.#limit(
        { x: from.displacement.x + dx, y: from.displacement.y + dy },
        from.base,
        from.corner,
        from.size,
      ),
    );
  };

  /** @param {PointerEvent} event */
  #onPointerEnd = (event) => {
    const from = this.#from;
    if (!from || event.pointerId !== from.pointerId) return;

    from.target.removeEventListener('pointermove', this.#onPointerMove);
    from.target.removeEventListener('pointerup', this.#onPointerEnd);
    from.target.removeEventListener('pointercancel', this.#onPointerEnd);
    try {
      if (from.target.hasPointerCapture(event.pointerId)) {
        from.target.releasePointerCapture(event.pointerId);
      }
    } catch {
      /* never had it */
    }

    this.#from = undefined;
    if (!from.moved) return;
    this.#dragged = true;
    this.#options.onSettle(this.#options.name);
  };

  /**
   * Move with the arrow keys, so the same thing can be done without a pointer.
   *
   * @param {KeyboardEvent} event
   * @returns {boolean} True when the key was used.
   */
  nudge(event) {
    if (!this.#options.enabled()) return false;
    if (event.altKey || event.ctrlKey || event.metaKey) return false;

    /** @type {Record<string, [number, number]>} */
    const directions = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const direction = directions[event.key];
    if (!direction) return false;

    const element = this.#options.element();
    if (!element) return false;

    const step = event.shiftKey ? BIG_STEP : STEP;
    const now = this.#options.current() ?? { x: 0, y: 0 };
    event.preventDefault();
    this.#options.onMove(
      this.#limit(
        { x: now.x + direction[0] * step, y: now.y + direction[1] * step },
        this.#options.base(),
        this.#options.corner(),
        this.#options.size(),
      ),
    );
    this.#options.onSettle(this.#options.name);
    return true;
  }

  /**
   * The displacement in the terms this corner counts in.
   *
   * @param {{ x: number, y: number }} displacement
   * @param {{ x: number, y: number }} [base]
   * @param {Position} [corner]
   * @returns {{ x: number, y: number }}
   */
  #toOffset(displacement, base = this.#options.base(), corner = this.#options.corner()) {
    return {
      x: base.x + (corner.endsWith('right') ? -displacement.x : displacement.x),
      y: base.y + (corner.startsWith('bottom') ? -displacement.y : displacement.y),
    };
  }

  /**
   * As much of a displacement as this thing can take without leaving the
   * viewport. The dragged thing sets the shared displacement, so the limit
   * has to be expressed there rather than only in the offset it writes.
   *
   * The size is the size the thing means to be, not the one it happens to
   * have: the panel's own stylesheet caps it against the space between its
   * corner and the far edge, so measuring it while it is being pushed into
   * that corner would read back a smaller box and let it be pushed further,
   * squeezing it flat instead of stopping it.
   *
   * @param {{ x: number, y: number }} displacement
   * @param {{ x: number, y: number }} base
   * @param {Position} corner
   * @param {{ width: number, height: number }} size
   * @returns {{ x: number, y: number }}
   */
  #limit(displacement, base, corner, size) {
    const offset = this.#clamp(this.#toOffset(displacement, base, corner), size);
    return {
      x: corner.endsWith('right') ? base.x - offset.x : offset.x - base.x,
      y: corner.startsWith('bottom') ? base.y - offset.y : offset.y - base.y,
    };
  }

  /**
   * @param {{ x: number, y: number }} offset
   * @param {{ width: number, height: number }} size
   * @returns {{ x: number, y: number }}
   */
  #clamp(offset, size) {
    return {
      x: clamp(offset.x, window.innerWidth - size.width),
      y: clamp(offset.y, window.innerHeight - size.height),
    };
  }
}

/**
 * @param {number} value
 * @param {number} max  The offset at which the far edge touches the viewport.
 * @returns {number}
 */
function clamp(value, max) {
  return Math.round(Math.min(Math.max(value, MARGIN), Math.max(MARGIN, max - MARGIN)));
}

/**
 * @typedef {Object} DragOptions
 * @property {'launcher' | 'panel'} name
 * @property {() => boolean} enabled
 * @property {() => HTMLElement | null} element     What moves.
 * @property {() => { width: number, height: number }} size  How big it means to be.
 * @property {() => Position} corner                Which corner the offset counts from.
 * @property {() => { x: number, y: number }} base  The theme's offset, before any drag.
 * @property {() => { x: number, y: number } | null} current  The widget's displacement now.
 * @property {(displacement: { x: number, y: number }) => void} onMove   A new displacement.
 * @property {(name: 'launcher' | 'panel') => void} onSettle  The gesture ended here.
 * @property {{ x: string, y: string }} vars        The custom properties to write.
 */
