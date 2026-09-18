// @ts-check
import { expect, fixture, html, oneEvent, aTimeout } from '@open-wc/testing';
import '../src/index.js';
import { Events } from '../src/events.js';

/** @import { ChitUI } from '../src/chit-ui.js' */

/**
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

describe('event contract', () => {
  it('names every event with the chat- prefix', () => {
    for (const name of Object.values(Events)) {
      expect(name).to.match(/^chat-/);
    }
  });

  it('crosses the shadow boundary and reaches document', async () => {
    const el = await widget();

    setTimeout(() => el.open());
    const event = await oneEvent(document, 'chat-open');

    expect(event.target).to.equal(el);
    expect(event.bubbles).to.be.true;
    expect(event.composed).to.be.true;
  });

  it('marks only the before-events and message clicks cancelable', async () => {
    const el = await widget();
    /** @type {Map<string, boolean>} */
    const seen = new Map();
    for (const name of Object.values(Events)) {
      el.addEventListener(name, (event) => seen.set(name, event.cancelable));
    }

    await el.open();
    await el.close();
    await el.hide();
    await el.show();

    expect(seen.get('chat-before-open')).to.be.true;
    expect(seen.get('chat-before-close')).to.be.true;
    expect(seen.get('chat-open')).to.be.false;
    expect(seen.get('chat-close')).to.be.false;
    expect(seen.get('chat-state-change')).to.be.false;
    expect(seen.get('chat-hide')).to.be.false;
    expect(seen.get('chat-show')).to.be.false;
  });

  it('carries the documented detail on the transition events', async () => {
    const el = await widget();

    setTimeout(() => el.open());
    const opened = await oneEvent(el, 'chat-open');
    expect(Object.keys(opened.detail).sort()).to.deep.equal(['from', 'trigger']);

    setTimeout(() => el.hide());
    const hidden = await oneEvent(el, 'chat-hide');
    expect(Object.keys(hidden.detail).sort()).to.deep.equal(['from', 'to']);
  });

  it('carries the documented detail on chat-submit and chat-input', async () => {
    const el = await widget();
    await el.open();
    await el.updateComplete;

    const box = /** @type {HTMLTextAreaElement} */ (
      el.shadowRoot?.querySelector('[part~="input"]')
    );

    setTimeout(() => {
      box.value = 'x';
      box.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    });
    const typed = await oneEvent(el, 'chat-input');
    expect(Object.keys(typed.detail)).to.deep.equal(['value']);

    setTimeout(() => el.submit());
    const sent = await oneEvent(el, 'chat-submit');
    expect(Object.keys(sent.detail)).to.deep.equal(['text']);
  });

  it('carries the documented detail on the message events', async () => {
    const el = await widget();
    await el.open();

    setTimeout(() => {
      el.messages = [{ id: 'a', role: 'assistant', html: '<button>go</button>' }];
    });
    const rendered = await oneEvent(el, 'chat-message-render');
    expect(Object.keys(rendered.detail).sort()).to.deep.equal(['element', 'instance', 'message']);

    const button = /** @type {HTMLElement} */ (
      el.getMessageElement('a')?.querySelector('button')
    );
    setTimeout(() => button.click());
    const clicked = await oneEvent(el, 'chat-message-click');
    expect(Object.keys(clicked.detail).sort()).to.deep.equal([
      'message',
      'originalEvent',
      'target',
    ]);
    expect(clicked.cancelable).to.be.true;
  });

  it('reports the device on chat-breakpoint-change', async () => {
    const el = await widget();
    // Force a crossing by moving the breakpoint past the current width.
    const wide = window.innerWidth + 200;

    setTimeout(() => {
      el.theme = { ...el.theme, breakpoint: wide };
    });
    const event = await oneEvent(el, 'chat-breakpoint-change');

    expect(event.detail.device).to.equal('mobile');
    expect(el.device).to.equal('mobile');
  });

  it('does not fire anything on a no-op transition', async () => {
    const el = await widget();
    let fired = 0;
    for (const name of Object.values(Events)) {
      el.addEventListener(name, () => { fired += 1; });
    }

    await el.close();
    await el.show();
    await aTimeout(10);

    expect(fired).to.equal(0);
  });
});
