// @ts-check
import { expect, fixture, html, aTimeout } from '@open-wc/testing';
import '../src/index.js';

/** @import { ChitUI } from '../src/chit-ui.js' */

/**
 * @param {Partial<ChitUI>} [props]
 * @returns {Promise<ChitUI>}
 */
async function widget(props = {}) {
  const el = /** @type {ChitUI} */ (await fixture(html`<chit-ui></chit-ui>`));
  el.theme = {
    closed: { animation: { enter: 'none', exit: 'none', duration: 0 } },
    open: { animation: { enter: 'none', exit: 'none', duration: 0 } },
  };
  Object.assign(el, props);
  await el.updateComplete;
  return el;
}

/** Kept for the standalone axe audit, which renders the same states. */
const conversation = [
  { id: 'a', role: /** @type {const} */ ('system'), html: '<p>オペレーターが参加しました</p>' },
  {
    id: 'b',
    role: /** @type {const} */ ('assistant'),
    html: '<p>ご用件をどうぞ。</p>',
    name: 'サポート',
    time: '2026-09-18T10:00:00+09:00',
  },
  {
    id: 'c',
    role: /** @type {const} */ ('user'),
    html: '<p>領収証について</p>',
    status: /** @type {const} */ ('sent'),
  },
];

describe('accessibility', () => {
  it('names the launcher and reports whether the panel is open', async () => {
    const el = await widget();
    const launcher = /** @type {HTMLElement} */ (
      el.shadowRoot?.querySelector('[part~="launcher"]')
    );

    expect(launcher.getAttribute('aria-label')).to.be.a('string').and.not.equal('');
    expect(launcher.getAttribute('aria-expanded')).to.equal('false');
  });

  it('marks the panel as a dialog with a name, and the log as a live region', async () => {
    const el = await widget({ messages: conversation });
    await el.open();

    const panel = /** @type {HTMLElement} */ (el.shadowRoot?.querySelector('[part~="panel"]'));
    expect(panel.getAttribute('role')).to.equal('dialog');
    expect(panel.getAttribute('aria-label')).to.be.a('string').and.not.equal('');

    const log = /** @type {HTMLElement} */ (el.shadowRoot?.querySelector('[part~="messages"]'));
    expect(log.getAttribute('role')).to.equal('log');
    expect(log.getAttribute('aria-live')).to.equal('polite');
  });

  it('marks a streaming message busy so it is not announced word by word', async () => {
    const el = await widget({
      messages: [{ id: 'a', role: 'assistant', html: '<p>部分</p>', streaming: true }],
    });
    await el.open();

    const article = /** @type {HTMLElement} */ (el.shadowRoot?.querySelector('[part~="message"]'));
    expect(article.getAttribute('aria-busy')).to.equal('true');

    el.messages = [{ id: 'a', role: 'assistant', html: '<p>部分ではなく全部</p>' }];
    await el.updateComplete;
    expect(article.getAttribute('aria-busy')).to.equal('false');
  });

  it('says out loud how far past the limit the text is', async () => {
    const el = await widget({ maxLength: 10 });
    await el.open();
    el.value = 'あ'.repeat(12);
    await el.updateComplete;

    const counter = /** @type {HTMLElement} */ (el.shadowRoot?.querySelector('[part~="counter"]'));
    const input = /** @type {HTMLElement} */ (el.shadowRoot?.querySelector('[part~="input"]'));

    expect(counter.textContent).to.equal('-2');
    expect(counter.getAttribute('aria-label')).to.contain('2');
    expect(counter.getAttribute('aria-label')).to.not.equal('-2');
    expect(input.getAttribute('aria-invalid')).to.equal('true');
  });

  it('moves focus into the panel on open and back to the launcher on close', async () => {
    const el = await widget();
    await el.open();
    expect(el.shadowRoot?.activeElement?.getAttribute('part')).to.contain('input');

    await el.close();
    expect(el.shadowRoot?.activeElement?.getAttribute('part')).to.contain('launcher');
  });

  it('leaves focus where it was when focusOnOpen is never', async () => {
    const el = await widget({ focusOnOpen: 'never' });
    const outside = document.createElement('button');
    document.body.append(outside);
    outside.focus();

    try {
      await el.open();
      expect(document.activeElement, 'the widget must not take focus').to.equal(outside);

      await el.close();
      expect(document.activeElement).to.equal(outside);
    } finally {
      outside.remove();
    }
  });

  it('focuses the panel itself when there is no composer to focus', async () => {
    const el = await widget({ inputHidden: true });
    await el.open();
    expect(el.shadowRoot?.activeElement?.getAttribute('part')).to.contain('panel');
  });

  it('keeps Escape from closing when a listener wants to handle it', async () => {
    const el = await widget();
    await el.open();
    const panel = /** @type {HTMLElement} */ (el.shadowRoot?.querySelector('[part~="panel"]'));

    el.addEventListener('chat-before-close', (event) => event.preventDefault());
    panel.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }),
    );
    await aTimeout(10);

    expect(el.state).to.equal('open');
  });
});
