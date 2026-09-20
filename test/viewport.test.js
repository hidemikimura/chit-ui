// @ts-check
import { expect, fixture, html } from '@open-wc/testing';
import '../src/index.js';

/** @import { ChitUI } from '../src/chit-ui.js' */

/**
 * Stand in for the browser's visual viewport, so a keyboard can be made to
 * arrive and leave on a desktop test runner.
 */
class FakeViewport extends EventTarget {
  /**
   * @param {{ height: number, offsetTop?: number, scale?: number }} state
   */
  constructor({ height, offsetTop = 0, scale = 1 }) {
    super();
    this.height = height;
    this.width = window.innerWidth;
    this.offsetLeft = 0;
    this.offsetTop = offsetTop;
    this.scale = scale;
  }

  /** @param {{ height?: number, offsetTop?: number, scale?: number }} change */
  change({ height, offsetTop, scale }) {
    if (height !== undefined) this.height = height;
    if (offsetTop !== undefined) this.offsetTop = offsetTop;
    if (scale !== undefined) this.scale = scale;
    this.dispatchEvent(new Event('resize'));
  }
}

/**
 * Whether this browser lets the property be stood in for at all. Every engine
 * the suite runs in puts `visualViewport` on the prototype, so an own
 * property shadows it — but a browser that disagreed would throw here rather
 * than fail the whole file.
 */
const canStub = (() => {
  try {
    Object.defineProperty(window, 'visualViewport', {
      value: window.visualViewport,
      configurable: true,
    });
    Reflect.deleteProperty(window, 'visualViewport');
    return true;
  } catch {
    return false;
  }
})();

/** @type {PropertyDescriptor | undefined} */
let original;

/**
 * @param {FakeViewport} fake
 */
function useViewport(fake) {
  original ??= Object.getOwnPropertyDescriptor(window, 'visualViewport');
  Object.defineProperty(window, 'visualViewport', { value: fake, configurable: true });
}

/**
 * A widget on a phone layout: the breakpoint is put above the test window's
 * width, so the panel is the full-screen one.
 *
 * @returns {Promise<ChitUI>}
 */
async function phone() {
  const el = /** @type {ChitUI} */ (await fixture(html`<chit-ui></chit-ui>`));
  el.theme = {
    breakpoint: window.innerWidth + 400,
    closed: { animation: { enter: 'none', exit: 'none', duration: 0 } },
    open: { animation: { enter: 'none', exit: 'none', duration: 0, scroll: 'instant' } },
  };
  el.messages = [{ id: 'a', role: 'assistant', text: 'ご用件をどうぞ。' }];
  await el.open();
  await el.updateComplete;
  return el;
}

/**
 * @param {ChitUI} el
 * @returns {{ top: string, height: string }}
 */
function vars(el) {
  return {
    top: el.style.getPropertyValue('--_chit-vv-top'),
    height: el.style.getPropertyValue('--_chit-vv-height'),
  };
}

(canStub ? describe : describe.skip)('staying inside what the reader can see', () => {
  afterEach(() => {
    if (original) Object.defineProperty(window, 'visualViewport', original);
    else Reflect.deleteProperty(window, 'visualViewport');
  });

  it('shortens the panel while a keyboard is up, and gives it back after', async () => {
    const fake = new FakeViewport({ height: window.innerHeight });
    useViewport(fake);

    const el = await phone();
    expect(el.device).to.equal('mobile');
    expect(vars(el).height).to.equal(`${Math.round(window.innerHeight)}px`);

    // A keyboard slides up: shorter box, and iOS has pushed the page down.
    fake.change({ height: 400, offsetTop: 60 });
    expect(vars(el)).to.deep.equal({ top: '60px', height: '400px' });

    const panel = /** @type {HTMLElement} */ (
      el.shadowRoot?.querySelector('[part~="panel"]')
    );
    expect(Math.round(panel.getBoundingClientRect().height)).to.equal(400);
    expect(Math.round(panel.getBoundingClientRect().top)).to.equal(60);

    fake.change({ height: window.innerHeight, offsetTop: 0 });
    expect(vars(el).top).to.equal('0px');
  });

  it('keeps out of a pinch', async () => {
    const fake = new FakeViewport({ height: window.innerHeight });
    useViewport(fake);

    const el = await phone();
    expect(vars(el).height).to.not.equal('');

    fake.change({ height: 300, scale: 2.5 });
    expect(vars(el)).to.deep.equal({ top: '', height: '' });

    fake.change({ height: window.innerHeight, scale: 1 });
    expect(vars(el).height).to.equal(`${Math.round(window.innerHeight)}px`);
  });

  it('leaves the floating panel alone', async () => {
    const fake = new FakeViewport({ height: window.innerHeight });
    useViewport(fake);

    const el = /** @type {ChitUI} */ (await fixture(html`<chit-ui></chit-ui>`));
    el.theme = {
      breakpoint: 1,
      closed: { animation: { enter: 'none', exit: 'none', duration: 0 } },
      open: { animation: { enter: 'none', exit: 'none', duration: 0 } },
    };
    await el.open();
    await el.updateComplete;

    expect(el.device).to.equal('pc');
    fake.change({ height: 400 });
    expect(vars(el)).to.deep.equal({ top: '', height: '' });
  });

  it('follows the newest message when the list gets shorter', async () => {
    const fake = new FakeViewport({ height: window.innerHeight });
    useViewport(fake);

    const el = await phone();
    el.messages = Array.from({ length: 30 }, (_, i) => ({
      id: `m${i}`,
      role: /** @type {'assistant' | 'user'} */ (i % 2 ? 'user' : 'assistant'),
      text: `${i}: ${'長い発言。'.repeat(8)}`,
    }));
    await el.updateComplete;

    const list = /** @type {HTMLElement} */ (
      el.shadowRoot?.querySelector('[part~="messages"]')
    );
    const atBottom = () => list.scrollHeight - list.scrollTop - list.clientHeight;
    expect(atBottom()).to.be.at.most(24);

    fake.change({ height: 320 });
    // The ResizeObserver behind this runs on a frame of its own, and how many
    // frames that takes is the engine's business.
    for (let i = 0; i < 30 && atBottom() > 24; i++) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    expect(atBottom()).to.be.at.most(24);
  });

  it('does without a visual viewport', async () => {
    Object.defineProperty(window, 'visualViewport', { value: undefined, configurable: true });
    const el = await phone();
    expect(vars(el)).to.deep.equal({ top: '', height: '' });
  });
});
