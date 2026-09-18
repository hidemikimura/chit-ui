// @ts-check
import { expect, fixture, html } from '@open-wc/testing';
import '../src/index.js';

describe('<chit-ui>', () => {
  it('registers the custom element', () => {
    expect(customElements.get('chit-ui')).to.be.a('function');
  });

  it('renders with the documented defaults', async () => {
    const el = /** @type {import('../src/chit-ui.js').ChitUI} */ (
      await fixture(html`<chit-ui></chit-ui>`)
    );
    expect(el.state).to.equal('closed');
    expect(el.messages).to.deep.equal([]);
    expect(el.sendOnEnter).to.be.true;
    expect(el.shadowRoot?.querySelector('[part~="launcher"]')).to.exist;
  });

  it('reflects state to an attribute', async () => {
    const el = /** @type {import('../src/chit-ui.js').ChitUI} */ (
      await fixture(html`<chit-ui></chit-ui>`)
    );
    el.state = 'hidden';
    await el.updateComplete;
    expect(el.getAttribute('state')).to.equal('hidden');
  });
});
