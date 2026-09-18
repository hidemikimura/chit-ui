// @ts-check
import { expect, fixture, html as fhtml, oneEvent } from '@open-wc/testing';
import { LitElement, html } from 'lit';
import '../src/index.js';

/** @import { ChitUI } from '../src/chit-ui.js' */
/** @import { Message } from '../src/types.js' */

/** A component a consumer might put in a message. */
class OrderCard extends LitElement {
  /** @override */
  static properties = { order: { type: Object }, tone: { type: String } };
  constructor() {
    super();
    this.order = { id: '' };
    this.tone = 'plain';
    this.builtAt = performance.now();
  }
  /** @override */
  render() {
    return html`<p class="order">${this.order.id} / ${this.tone}</p>
      <button class="pick">choose</button>`;
  }
}
customElements.define('order-card', OrderCard);

/** Registered under a different name than the class, on purpose. */
class PlainCard extends LitElement {
  /** @override */
  render() {
    return html`<span>plain</span>`;
  }
}
customElements.define('plain-card', PlainCard);

/** Never registered. */
class MissingCard extends LitElement {}

/**
 * @param {Message[]} messages
 * @returns {Promise<ChitUI>}
 */
async function openWith(messages) {
  const el = /** @type {ChitUI} */ (await fixture(fhtml`<chit-ui></chit-ui>`));
  el.theme = {
    closed: { animation: { enter: 'none', exit: 'none', duration: 0 } },
    open: { animation: { enter: 'none', exit: 'none', duration: 0 } },
  };
  el.messages = messages;
  await el.open();
  await el.updateComplete;
  return el;
}

describe('message content', () => {
  it('renders plain text as text, keeping its line breaks', async () => {
    const el = await openWith([
      { id: 'a', role: 'user', text: '一行目\n二行目\n\n空行のあと' },
    ]);
    const content = /** @type {HTMLElement} */ (el.getMessageElement('a'));

    expect(content.textContent).to.equal('一行目\n二行目\n\n空行のあと');
    expect(getComputedStyle(content).whiteSpace).to.equal('pre-wrap');
    expect(content.dataset.content).to.equal('text');
  });

  it('does not let markup through the text form', async () => {
    const el = await openWith([
      { id: 'a', role: 'user', text: '<img src=x onerror="window.__xss = 1"> & <b>bold</b>' },
    ]);
    const content = /** @type {HTMLElement} */ (el.getMessageElement('a'));

    expect(content.querySelector('img')).to.not.exist;
    expect(content.querySelector('b')).to.not.exist;
    expect(content.textContent).to.contain('<b>bold</b>');
  });

  it('leaves html content free of pre-wrap, so markup indentation stays invisible', async () => {
    const el = await openWith([
      { id: 'a', role: 'assistant', html: '<p>\n  indented\n</p>\n<p>second</p>' },
    ]);
    const content = /** @type {HTMLElement} */ (el.getMessageElement('a'));

    expect(getComputedStyle(content).whiteSpace).to.equal('normal');
    expect(content.dataset.content).to.equal('html');
  });

  it('does not run sanitize over the text form', async () => {
    const el = /** @type {ChitUI} */ (await fixture(fhtml`<chit-ui></chit-ui>`));
    let called = 0;
    el.sanitize = (markup) => { called += 1; return markup; };
    el.messages = [{ id: 'a', role: 'user', text: 'そのまま' }];
    await el.open();
    await el.updateComplete;

    expect(called).to.equal(0);
    expect(el.getMessageElement('a')?.textContent).to.equal('そのまま');
  });

  it('renders an HTML string as markup', async () => {
    const el = await openWith([{ id: 'a', role: 'assistant', html: '<p><b>hi</b></p>' }]);
    const content = el.getMessageElement('a');
    expect(content?.querySelector('b')?.textContent).to.equal('hi');
  });

  it('renders a Lit template', async () => {
    const el = await openWith([
      { id: 'a', role: 'assistant', template: html`<p class="t">one</p>` },
    ]);
    expect(el.getMessageElement('a')?.querySelector('.t')?.textContent).to.equal('one');
  });

  it('updates a template in place when only its values change', async () => {
    const line = (/** @type {string} */ text) => html`<p class="t">${text}</p>`;
    const el = await openWith([{ id: 'a', role: 'assistant', template: line('one') }]);
    const first = el.getMessageElement('a')?.querySelector('.t');

    el.messages = [{ id: 'a', role: 'assistant', template: line('one two') }];
    await el.updateComplete;

    const second = el.getMessageElement('a')?.querySelector('.t');
    expect(second?.textContent).to.equal('one two');
    expect(second).to.equal(first, 'same template shape, so the node is reused');
  });

  it('replaces the node when the template shape changes', async () => {
    const el = await openWith([
      { id: 'a', role: 'assistant', template: html`<p class="t">one</p>` },
    ]);
    const first = el.getMessageElement('a')?.querySelector('.t');

    el.messages = [{ id: 'a', role: 'assistant', template: html`<div class="t">two</div>` }];
    await el.updateComplete;

    const second = el.getMessageElement('a')?.querySelector('.t');
    expect(second?.textContent).to.equal('two');
    expect(second).to.not.equal(first);
  });

  it('renders a DOM element as given', async () => {
    const node = document.createElement('div');
    node.className = 'given';
    const el = await openWith([{ id: 'a', role: 'assistant', element: node }]);
    expect(el.getMessageElement('a')?.querySelector('.given')).to.equal(node);
  });

  it('builds a component and writes its props', async () => {
    const el = await openWith([
      { id: 'a', role: 'assistant', component: OrderCard, props: { order: { id: 'A-1' } } },
    ]);
    const card = /** @type {OrderCard} */ (el.getMessageElement('a')?.querySelector('order-card'));
    expect(card).to.exist;
    await card.updateComplete;
    expect(card.shadowRoot?.querySelector('.order')?.textContent).to.contain('A-1');
  });

  it('keeps the component instance and only re-assigns changed props', async () => {
    const order = { id: 'A-1' };
    const el = await openWith([
      { id: 'a', role: 'assistant', component: OrderCard, props: { order, tone: 'plain' } },
    ]);
    const card = /** @type {OrderCard} */ (el.getMessageElement('a')?.querySelector('order-card'));
    const builtAt = card.builtAt;

    el.messages = [
      { id: 'a', role: 'assistant', component: OrderCard, props: { order, tone: 'loud' } },
    ];
    await el.updateComplete;
    await card.updateComplete;

    const again = el.getMessageElement('a')?.querySelector('order-card');
    expect(again).to.equal(card, 'the instance should survive');
    expect(card.builtAt).to.equal(builtAt);
    expect(card.tone).to.equal('loud');
  });

  it('accepts a tag name string for a component', async () => {
    const el = await openWith([{ id: 'a', role: 'assistant', component: 'plain-card' }]);
    expect(el.getMessageElement('a')?.querySelector('plain-card')).to.exist;
  });

  /**
   * @param {ChitUI} el
   * @returns {Promise<string>}
   */
  async function failedUpdate(el) {
    try {
      await el.updateComplete;
      return '';
    } catch (error) {
      return String(error);
    }
  }

  it('throws for a component that was never registered', async () => {
    const el = await openWith([{ id: 'ok', role: 'assistant', html: '<p>ok</p>' }]);
    el.messages = [{ id: 'a', role: 'assistant', component: MissingCard }];
    expect(await failedUpdate(el)).to.contain('not registered');
  });

  it('rejects a message carrying two content fields', async () => {
    const el = await openWith([{ id: 'ok', role: 'assistant', html: '<p>ok</p>' }]);
    el.messages = [
      /** @type {any} */ ({ id: 'a', role: 'assistant', html: '<p>x</p>', component: 'plain-card' }),
    ];
    expect(await failedUpdate(el)).to.contain('exactly one');
  });

  it('rejects a message with no content at all', async () => {
    const el = await openWith([{ id: 'ok', role: 'assistant', html: '<p>ok</p>' }]);
    el.messages = [/** @type {any} */ ({ id: 'a', role: 'assistant' })];
    expect(await failedUpdate(el)).to.contain('no content');
  });

  it('applies sanitize to html only', async () => {
    const el = /** @type {ChitUI} */ (await fixture(fhtml`<chit-ui></chit-ui>`));
    el.sanitize = (markup) => markup.replace(/<script[\s\S]*?<\/script>/g, '');
    el.messages = [
      { id: 'a', role: 'assistant', html: '<p>ok</p><script>window.x = 1;</script>' },
      { id: 'b', role: 'assistant', template: html`<p class="kept">kept</p>` },
    ];
    await el.open();
    await el.updateComplete;

    expect(el.getMessageElement('a')?.querySelector('script')).to.not.exist;
    expect(el.getMessageElement('a')?.textContent).to.contain('ok');
    expect(el.getMessageElement('b')?.querySelector('.kept')).to.exist;
  });

  it('reports clicks inside a message, including through a component shadow root', async () => {
    const el = await openWith([
      { id: 'a', role: 'assistant', html: '<button data-action="go">go</button>' },
      { id: 'b', role: 'assistant', component: OrderCard, props: { order: { id: 'A-2' } } },
    ]);

    const button = /** @type {HTMLElement} */ (
      el.getMessageElement('a')?.querySelector('[data-action="go"]')
    );
    setTimeout(() => button.click());
    const first = await oneEvent(el, 'chat-message-click');
    expect(first.detail.message.id).to.equal('a');
    expect(/** @type {HTMLElement} */ (first.detail.target).dataset.action).to.equal('go');

    const card = /** @type {OrderCard} */ (el.getMessageElement('b')?.querySelector('order-card'));
    await card.updateComplete;
    const inner = /** @type {HTMLElement} */ (card.shadowRoot?.querySelector('.pick'));
    setTimeout(() => inner.click());
    const second = await oneEvent(el, 'chat-message-click');
    expect(second.detail.message.id).to.equal('b');
    expect(second.detail.target).to.equal(inner, 'the element inside the component, not the host');
  });
});
