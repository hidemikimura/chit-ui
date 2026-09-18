// @ts-check
import { expect, fixture, html, oneEvent, aTimeout } from '@open-wc/testing';
import { LitElement, html as lit, css } from 'lit';
import '../src/index.js';

/** @import { ChitUI } from '../src/chit-ui.js' */

/** A launcher a consumer might supply: its own size, its own paint. */
class FabLauncher extends LitElement {
  /** @override */
  static properties = { unread: { type: Number } };

  /** @override */
  static styles = css`
    :host {
      display: block;
      width: 128px;
      height: 44px;
    }
    .pill {
      display: grid;
      place-items: center;
      width: 100%;
      height: 100%;
      border-radius: 22px;
      background: #111;
      color: #fff;
    }
  `;

  constructor() {
    super();
    this.unread = 0;
    this.builtAt = performance.now();
  }

  /** @override */
  render() {
    return lit`<div class="pill">相談する${this.unread ? lit` (${this.unread})` : ''}</div>`;
  }
}
customElements.define('fab-launcher', FabLauncher);

/**
 * @param {import('../src/types.js').Theme} [theme]
 * @returns {Promise<ChitUI>}
 */
async function widget(theme) {
  const el = /** @type {ChitUI} */ (await fixture(html`<chit-ui></chit-ui>`));
  el.theme = {
    closed: { animation: { enter: 'none', exit: 'none', duration: 0 } },
    open: { animation: { enter: 'none', exit: 'none', duration: 0 } },
    ...theme,
  };
  await el.updateComplete;
  return el;
}

/**
 * @param {ChitUI} el
 * @returns {HTMLElement}
 */
function launcher(el) {
  return /** @type {HTMLElement} */ (el.shadowRoot?.querySelector('[part~="launcher"]'));
}

describe('launcher component', () => {
  it('draws the component inside the button', async () => {
    const el = await widget({ closed: { component: FabLauncher } });
    const custom = launcher(el).querySelector('fab-launcher');

    expect(custom).to.exist;
    expect(launcher(el).tagName).to.equal('BUTTON');
    expect(launcher(el).hasAttribute('data-custom')).to.be.true;
  });

  it('lets the component decide the size', async () => {
    const plain = await widget();
    expect(Math.round(launcher(plain).getBoundingClientRect().width)).to.equal(60);

    const el = await widget({ closed: { component: FabLauncher } });
    await aTimeout(20);
    const box = launcher(el).getBoundingClientRect();

    expect(Math.round(box.width)).to.equal(128);
    expect(Math.round(box.height)).to.equal(44);
  });

  it('drops the widget own paint so the two do not fight', async () => {
    const el = await widget({ closed: { component: FabLauncher } });
    const style = getComputedStyle(launcher(el));

    expect(style.backgroundImage).to.equal('none');
    expect(style.boxShadow).to.equal('none');
    expect(style.borderRadius).to.equal('0px');
    expect(style.padding).to.equal('0px');
  });

  it('accepts a tag name as well as a class', async () => {
    const el = await widget({ closed: { component: 'fab-launcher' } });
    expect(launcher(el).querySelector('fab-launcher')).to.exist;
  });

  it('writes props and keeps the instance across updates', async () => {
    const el = await widget({ closed: { component: FabLauncher, props: { unread: 2 } } });
    const custom = /** @type {FabLauncher} */ (launcher(el).querySelector('fab-launcher'));
    await custom.updateComplete;

    expect(custom.unread).to.equal(2);
    const builtAt = custom.builtAt;

    el.theme = { ...el.theme, closed: { component: FabLauncher, props: { unread: 5 } } };
    await el.updateComplete;
    await custom.updateComplete;

    expect(launcher(el).querySelector('fab-launcher')).to.equal(custom, 'same instance');
    expect(custom.builtAt).to.equal(builtAt);
    expect(custom.unread).to.equal(5);
    expect(custom.shadowRoot?.textContent).to.contain('5');
  });

  it('survives a trip through the open state', async () => {
    const el = await widget({ closed: { component: FabLauncher, props: { unread: 1 } } });
    const custom = launcher(el).querySelector('fab-launcher');

    await el.open();
    await el.close();

    expect(launcher(el).querySelector('fab-launcher')).to.equal(custom);
  });

  it('is not pruned when the conversation changes', async () => {
    const el = await widget({ closed: { component: FabLauncher } });
    const custom = launcher(el).querySelector('fab-launcher');

    el.messages = [{ id: 'a', role: 'user', text: 'hi' }];
    await el.updateComplete;
    el.messages = [];
    await el.updateComplete;

    expect(launcher(el).querySelector('fab-launcher')).to.equal(custom);
  });

  it('still opens the panel when clicked', async () => {
    const el = await widget({ closed: { component: FabLauncher } });

    setTimeout(() => launcher(el).click());
    const event = await oneEvent(el, 'chat-open');

    expect(event.detail.trigger).to.equal('user');
    expect(el.state).to.equal('open');
  });

  it('keeps an accessible name from the theme label', async () => {
    const el = await widget({ closed: { component: FabLauncher, label: '相談する' } });
    expect(launcher(el).getAttribute('aria-label')).to.equal('相談する');
    expect(launcher(el).getAttribute('aria-expanded')).to.equal('false');
  });

  it('throws for a component that was never registered', async () => {
    class Unregistered extends LitElement {}
    const el = await widget();
    el.theme = { ...el.theme, closed: { component: Unregistered } };

    let message = '';
    try {
      await el.updateComplete;
    } catch (error) {
      message = String(error);
    }
    expect(message).to.contain('not registered');
  });
});

describe('launcher auto size', () => {
  it('lets slotted content size the button when the theme asks', async () => {
    const el = /** @type {ChitUI} */ (
      await fixture(html`
        <chit-ui>
          <span slot="launcher" style="display: block; width: 150px; height: 40px"></span>
        </chit-ui>
      `)
    );
    el.theme = { closed: { size: 'auto' } };
    await el.updateComplete;
    await aTimeout(20);

    expect(Math.round(launcher(el).getBoundingClientRect().width)).to.be.greaterThan(140);
  });

  it('keeps the fixed size by default', async () => {
    const el = /** @type {ChitUI} */ (
      await fixture(html`
        <chit-ui>
          <span slot="launcher" style="display: block; width: 150px; height: 40px"></span>
        </chit-ui>
      `)
    );
    await el.updateComplete;
    await aTimeout(20);

    expect(Math.round(launcher(el).getBoundingClientRect().width)).to.equal(60);
  });
});
