// @ts-check
import { expect, fixture, html, oneEvent, aTimeout } from '@open-wc/testing';
import '../src/index.js';

/** @import { ChitUI } from '../src/chit-ui.js' */

/**
 * A widget with animations turned off, so transitions settle in one task and
 * the tests are about ordering rather than timing.
 *
 * @returns {Promise<ChitUI>}
 */
async function widget() {
  const el = /** @type {ChitUI} */ (await fixture(html`<chit-ui></chit-ui>`));
  el.theme = {
    closed: { animation: { enter: 'none', exit: 'none', duration: 0 } },
    open: { animation: { enter: 'none', exit: 'none', duration: 0 } },
    hidden: { animation: { exit: 'none', duration: 0 } },
  };
  await el.updateComplete;
  return el;
}

/**
 * Record every chat event the element fires, in order.
 *
 * @param {ChitUI} el
 * @returns {string[]}
 */
function recordEvents(el) {
  /** @type {string[]} */
  const seen = [];
  for (const name of [
    'chat-before-open', 'chat-open', 'chat-before-close', 'chat-close',
    'chat-hide', 'chat-show', 'chat-state-change',
  ]) {
    el.addEventListener(name, () => seen.push(name));
  }
  return seen;
}

describe('state transitions', () => {
  it('starts closed and shows the launcher', async () => {
    const el = await widget();
    expect(el.state).to.equal('closed');
    expect(el.shadowRoot?.querySelector('[part~="launcher"]')).to.exist;
    expect(el.shadowRoot?.querySelector('[part~="panel"]')).to.not.exist;
  });

  it('opens when the launcher is clicked, and reports trigger "user"', async () => {
    const el = await widget();
    const launcher = /** @type {HTMLElement} */ (el.shadowRoot?.querySelector('[part~="launcher"]'));

    setTimeout(() => launcher.click());
    const opened = await oneEvent(el, 'chat-open');

    expect(el.state).to.equal('open');
    expect(opened.detail).to.deep.equal({ from: 'closed', trigger: 'user' });
    expect(el.shadowRoot?.querySelector('[part~="panel"]')).to.exist;
  });

  it('fires the events of an open/close round trip in order', async () => {
    const el = await widget();
    const seen = recordEvents(el);

    await el.open();
    await el.close();

    expect(seen).to.deep.equal([
      'chat-before-open', 'chat-state-change', 'chat-open',
      'chat-before-close', 'chat-state-change', 'chat-close',
    ]);
  });

  it('reports trigger "api" when a method or the property moves it', async () => {
    const el = await widget();

    setTimeout(() => { el.state = 'open'; });
    const opened = await oneEvent(el, 'chat-open');

    expect(opened.detail.trigger).to.equal('api');
  });

  it('closes on Escape from inside the panel', async () => {
    const el = await widget();
    await el.open();
    const panel = /** @type {HTMLElement} */ (el.shadowRoot?.querySelector('[part~="panel"]'));

    setTimeout(() => panel.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }),
    ));
    const closed = await oneEvent(el, 'chat-close');

    expect(el.state).to.equal('closed');
    expect(closed.detail.trigger).to.equal('user');
  });

  it('closes on the close button', async () => {
    const el = await widget();
    await el.open();
    const button = /** @type {HTMLElement} */ (el.shadowRoot?.querySelector('[part~="close-button"]'));

    setTimeout(() => button.click());
    await oneEvent(el, 'chat-close');

    expect(el.state).to.equal('closed');
  });

  it('lets a listener cancel opening', async () => {
    const el = await widget();
    el.addEventListener('chat-before-open', (event) => event.preventDefault());
    const seen = recordEvents(el);

    const settled = await el.open();

    expect(settled).to.be.false;
    expect(el.state).to.equal('closed');
    expect(seen).to.deep.equal(['chat-before-open']);
    expect(el.shadowRoot?.querySelector('[part~="panel"]')).to.not.exist;
  });

  it('lets a listener cancel closing', async () => {
    const el = await widget();
    await el.open();
    el.addEventListener('chat-before-close', (event) => event.preventDefault());

    const settled = await el.close();

    expect(settled).to.be.false;
    expect(el.state).to.equal('open');
    expect(el.shadowRoot?.querySelector('[part~="panel"]')).to.exist;
  });

  it('hides and shows without a before-event', async () => {
    const el = await widget();
    const seen = recordEvents(el);

    await el.hide();
    expect(el.state).to.equal('hidden');
    expect(el.shadowRoot?.querySelector('[part~="launcher"]')).to.not.exist;

    await el.show();
    expect(el.state).to.equal('closed');
    expect(el.shadowRoot?.querySelector('[part~="launcher"]')).to.exist;

    expect(seen).to.deep.equal([
      'chat-state-change', 'chat-hide',
      'chat-state-change', 'chat-show',
    ]);
  });

  it('fires show and open when going straight from hidden to open', async () => {
    const el = await widget();
    await el.hide();
    const seen = recordEvents(el);

    await el.open();

    expect(seen).to.deep.equal([
      'chat-before-open', 'chat-state-change', 'chat-show', 'chat-open',
    ]);
  });

  it('reflects state to an attribute and exposes what is drawn', async () => {
    const el = await widget();
    await el.open();
    await el.updateComplete;

    expect(el.getAttribute('state')).to.equal('open');
    expect(el.renderedState).to.equal('open');
    expect(el.dataset.renderedState).to.equal('open');
  });

  it('keeps the DOM on the old state until the exit animation ends', async () => {
    const el = /** @type {ChitUI} */ (await fixture(html`<chit-ui></chit-ui>`));
    el.theme = { open: { animation: { enter: 'fade', exit: 'fade', duration: 60 } } };
    await el.open();

    const closing = el.close();
    expect(el.state).to.equal('closed');
    expect(el.renderedState).to.equal('open');
    expect(el.shadowRoot?.querySelector('[part~="panel"]')).to.exist;

    await closing;
    expect(el.renderedState).to.equal('closed');
    expect(el.shadowRoot?.querySelector('[part~="panel"]')).to.not.exist;
  });

  it('lets a later transition supersede one still animating', async () => {
    const el = /** @type {ChitUI} */ (await fixture(html`<chit-ui></chit-ui>`));
    el.theme = { open: { animation: { enter: 'fade', exit: 'fade', duration: 200 } } };

    const first = el.open();
    await aTimeout(20);
    const second = el.close();

    expect(await first).to.be.false;
    expect(await second).to.be.true;
    expect(el.state).to.equal('closed');
  });

  it('toggles between closed and open', async () => {
    const el = await widget();

    await el.toggle();
    expect(el.state).to.equal('open');

    await el.toggle();
    expect(el.state).to.equal('closed');
  });

  it('ignores show() unless it is hidden', async () => {
    const el = await widget();
    await el.open();

    await el.show();

    expect(el.state).to.equal('open');
  });
});

describe('breakpoint', () => {
  it('labels the device and exposes it', async () => {
    const el = await widget();
    expect(['pc', 'mobile']).to.include(el.device);
    expect(el.dataset.device).to.equal(el.device);
  });
});
