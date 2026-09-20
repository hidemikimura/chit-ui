// @ts-check

/** Every event this library dispatches. Never write the string literals elsewhere. */
export const Events = Object.freeze({
  SUBMIT: 'chat-submit',
  BEFORE_OPEN: 'chat-before-open',
  OPEN: 'chat-open',
  BEFORE_CLOSE: 'chat-before-close',
  CLOSE: 'chat-close',
  HIDE: 'chat-hide',
  SHOW: 'chat-show',
  STATE_CHANGE: 'chat-state-change',
  INPUT: 'chat-input',
  MESSAGE_RENDER: 'chat-message-render',
  MESSAGE_CLICK: 'chat-message-click',
  SCROLL_TOP: 'chat-scroll-top',
  BREAKPOINT_CHANGE: 'chat-breakpoint-change',
  HOME: 'chat-home',
  ATTACH: 'chat-attach',
  MOVE: 'chat-move',
});

/**
 * Dispatch a composed, bubbling CustomEvent from the host.
 *
 * @param {HTMLElement} host
 * @param {string} name
 * @param {unknown} detail
 * @param {{ cancelable?: boolean }} [options]
 * @returns {boolean} false when a listener called preventDefault().
 */
export function emit(host, name, detail, { cancelable = false } = {}) {
  return host.dispatchEvent(
    new CustomEvent(name, { detail, bubbles: true, composed: true, cancelable }),
  );
}
