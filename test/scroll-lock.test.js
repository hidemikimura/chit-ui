// @ts-check
import { expect, fixture, html } from '@open-wc/testing';
import '../src/index.js';

/** @import { ChitUI } from '../src/chit-ui.js' */
/** @import { Message, Theme } from '../src/types.js' */

/**
 * @param {{ theme?: Theme, messages?: Message[] }} [options]
 * @returns {Promise<ChitUI>}
 */
async function widget({ theme, messages = [] } = {}) {
  const el = /** @type {ChitUI} */ (await fixture(html`<chit-ui></chit-ui>`));
  el.theme = {
    ...theme,
    closed: { animation: { enter: 'none', exit: 'none', duration: 0 }, ...theme?.closed },
    open: {
      width: 320,
      height: 240,
      animation: { enter: 'none', exit: 'none', duration: 0, scroll: 'instant' },
      ...theme?.open,
    },
  };
  el.messages = messages;
  await el.open();
  await el.updateComplete;
  return el;
}

/**
 * @param {ChitUI} el
 * @param {string} name
 * @returns {HTMLElement}
 */
function part(el, name) {
  const found = el.shadowRoot?.querySelector(`[part~="${name}"]`);
  if (!found) throw new Error(`no [part~="${name}"]`);
  return /** @type {HTMLElement} */ (found);
}

/**
 * @param {number} count
 * @returns {Message[]}
 */
function conversation(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `m${i}`,
    role: /** @type {'assistant' | 'user'} */ (i % 2 ? 'user' : 'assistant'),
    text: `${i}: ${'長い発言。'.repeat(8)}`,
  }));
}

/**
 * Swipe a finger across a target and report whether the browser was allowed
 * to act on the move.
 *
 * The touches are plain objects on an ordinary Event rather than a real
 * TouchEvent: desktop Safari has no touch support at all, so `new Touch()`
 * and `new TouchEvent()` are not there to call, and the suite runs in WebKit
 * too. The controller only ever reads clientX/clientY, the number of
 * touches, and the event's own path, all of which this carries faithfully.
 *
 * @param {HTMLElement} target
 * @param {{ dx?: number, dy?: number, fingers?: number }} [options]
 * @returns {boolean} True when the move was cancelled — the page stays put.
 */
function swipe(target, { dx = 0, dy = 0, fingers = 1 } = {}) {
  const box = target.getBoundingClientRect();
  const start = { x: box.left + box.width / 2, y: box.top + box.height / 2 };

  /**
   * @param {string} type
   * @param {number} shiftX
   * @param {number} shiftY
   * @returns {Event}
   */
  const send = (type, shiftX, shiftY) => {
    const event = new Event(type, { bubbles: true, composed: true, cancelable: true });
    const touches = Array.from({ length: fingers }, (_, id) => ({
      identifier: id,
      target,
      clientX: start.x + id * 20 + shiftX,
      clientY: start.y + shiftY,
    }));
    Object.defineProperty(event, 'touches', { value: touches });
    target.dispatchEvent(event);
    return event;
  };

  send('touchstart', 0, 0);
  const move = send('touchmove', dx, dy);
  send('touchend', dx, dy);
  return move.defaultPrevented;
}

describe('keeping the page behind still', () => {
  it('cancels a swipe over a conversation short enough to fit', async () => {
    const el = await widget({ messages: conversation(1) });
    const list = part(el, 'messages');
    expect(list.scrollHeight).to.be.at.most(list.clientHeight + 1);

    expect(swipe(list, { dy: 60 })).to.be.true;
    expect(swipe(list, { dy: -60 })).to.be.true;
  });

  it('lets a conversation that overflows scroll itself', async () => {
    const el = await widget({ messages: conversation(24) });
    const list = part(el, 'messages');
    expect(list.scrollHeight).to.be.above(list.clientHeight);

    // Pinned to the newest message, so there is history above but nothing
    // below: pulling down scrolls, pushing up has nowhere to go.
    expect(swipe(list, { dy: 60 })).to.be.false;
    expect(swipe(list, { dy: -60 })).to.be.true;
  });

  it('cancels a swipe that starts on the title bar or the composer', async () => {
    const el = await widget({ messages: conversation(24) });

    expect(swipe(part(el, 'header'), { dy: 80 })).to.be.true;
    expect(swipe(part(el, 'composer'), { dy: 80 })).to.be.true;
  });

  it('leaves the text field free to scroll its own overflow', async () => {
    const el = await widget();
    const input = /** @type {HTMLTextAreaElement} */ (part(el, 'input'));
    input.value = '行\n'.repeat(40);
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await el.updateComplete;
    input.scrollTop = input.scrollHeight;

    expect(input.scrollHeight).to.be.above(input.clientHeight);
    expect(swipe(input, { dy: 40 })).to.be.false;
  });

  it('keeps out of a pinch', async () => {
    const el = await widget({ messages: conversation(1) });
    expect(swipe(part(el, 'messages'), { dy: 60, fingers: 2 })).to.be.false;
  });

  it('cancels a sideways swipe with nothing to scroll sideways', async () => {
    const el = await widget({ messages: conversation(1) });
    expect(swipe(part(el, 'messages'), { dx: 80 })).to.be.true;
  });

  it('ignores a touch too small to be a scroll', async () => {
    const el = await widget({ messages: conversation(1) });
    expect(swipe(part(el, 'messages'), { dy: 2 })).to.be.false;
  });

  it('stops listening once the panel is gone', async () => {
    const el = await widget({ messages: conversation(1) });
    const list = part(el, 'messages');
    await el.close();
    await el.updateComplete;

    // Detached: nothing left to cancel, and nothing left holding a listener.
    expect(el.shadowRoot?.querySelector('[part~="panel"]')).to.equal(null);
    expect(swipe(list, { dy: 60 })).to.be.false;
  });
});
