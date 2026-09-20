// @ts-check
import { expect, fixture, html, aTimeout } from '@open-wc/testing';
import '../src/index.js';

/** @import { ChitUI } from '../src/chit-ui.js' */
/** @import { Theme } from '../src/types.js' */

/**
 * @param {Theme} [theme]
 * @returns {Promise<ChitUI>}
 */
async function opened(theme) {
  const el = /** @type {ChitUI} */ (await fixture(html`<chit-ui></chit-ui>`));
  el.theme = {
    closed: { animation: { enter: 'none', exit: 'none', duration: 0 } },
    ...theme,
    open: { animation: { enter: 'none', exit: 'none', duration: 0 }, ...theme?.open },
  };
  await el.open();
  await el.updateComplete;
  return el;
}

/**
 * @param {ChitUI} el
 * @returns {HTMLElement | null}
 */
const box = (el) => /** @type {HTMLElement | null} */ (
  el.shadowRoot?.querySelector('[part~="loading"]')
);

describe('loading', () => {
  it('shows nothing until asked', async () => {
    const el = await opened();
    expect(el.loading).to.be.false;
    expect(box(el)).to.equal(null);
  });

  it('is a spinner by default, not the typing dots', async () => {
    const el = await opened();
    el.loading = true;
    await el.updateComplete;

    const indicator = /** @type {HTMLElement} */ (box(el));
    expect(indicator.dataset.style).to.equal('spinner');
    expect(indicator.querySelector('[part~="spinner"]')).to.not.equal(null);
    // The three dots say "someone is writing"; a wait on a server is not that.
    expect(indicator.querySelector('.dots')).to.equal(null);
  });

  it('turns the typing bubble off, and is turned off by it', async () => {
    const el = await opened();

    el.typing = true;
    el.loading = true;
    await el.updateComplete;
    expect(el.typing).to.be.false;
    expect(box(el)).to.not.equal(null);
    expect(el.shadowRoot?.querySelector('[part~="typing"]')).to.equal(null);

    el.typing = true;
    await el.updateComplete;
    expect(el.loading).to.be.false;
    expect(box(el)).to.equal(null);
    expect(el.shadowRoot?.querySelector('[part~="typing"]')).to.not.equal(null);

    // `{ html }` counts as on, too.
    el.loading = true;
    await el.updateComplete;
    el.typing = { html: '<b>考えています</b>' };
    await el.updateComplete;
    expect(el.loading).to.be.false;
  });

  it('leaves the other alone when it is turned off', async () => {
    const el = await opened();
    el.typing = true;
    await el.updateComplete;

    el.loading = false;
    await el.updateComplete;
    expect(el.typing).to.be.true;
    expect(el.shadowRoot?.querySelector('[part~="typing"]')).to.not.equal(null);
  });

  it('reflects to an attribute, so page CSS can see the wait', async () => {
    const el = await opened();
    el.loading = true;
    await el.updateComplete;
    expect(el.hasAttribute('loading')).to.be.true;

    el.typing = true;
    await el.updateComplete;
    expect(el.hasAttribute('loading')).to.be.false;
  });

  it('is the same bubble as the typing one, whatever is inside it', async () => {
    const el = await opened();

    el.typing = true;
    await el.updateComplete;
    const typing = /** @type {HTMLElement} */ (
      el.shadowRoot?.querySelector('[part~="typing"]')
    ).getBoundingClientRect();

    el.typing = false;
    el.loading = true;
    el.theme = { open: { loading: { style: 'dots' } } };
    await el.updateComplete;
    const dots = /** @type {HTMLElement} */ (box(el)).getBoundingClientRect();
    expect(Math.round(dots.height)).to.equal(Math.round(typing.height));
    expect(Math.round(dots.width)).to.equal(Math.round(typing.width));

    // A spinner or a line of text must not change the bubble's height either.
    el.theme = { open: { loading: { style: 'spinner', text: '回答を作成しています' } } };
    await el.updateComplete;
    const spinner = /** @type {HTMLElement} */ (box(el)).getBoundingClientRect();
    expect(Math.round(spinner.height)).to.equal(Math.round(typing.height));
  });

  it('grows a tail only where the theme asked for one', async () => {
    const el = await opened();
    el.loading = true;
    await el.updateComplete;
    expect(getComputedStyle(/** @type {HTMLElement} */ (box(el)), '::after').display)
      .to.equal('none');

    el.theme = { open: { bubble: { tail: 'top' } } };
    await el.updateComplete;
    expect(getComputedStyle(/** @type {HTMLElement} */ (box(el)), '::after').display)
      .to.equal('block');
  });

  it('takes its look and wording from the theme', async () => {
    const el = await opened({ open: { loading: { style: 'spinner', text: '回答を作成しています' } } });
    el.loading = true;
    await el.updateComplete;

    const indicator = /** @type {HTMLElement} */ (box(el));
    expect(indicator.dataset.style).to.equal('spinner');
    expect(indicator.getAttribute('role')).to.equal('status');
    expect(indicator.getAttribute('aria-label')).to.equal('回答を作成しています');
    expect(indicator.querySelector('[part~="spinner"]')).to.not.equal(null);
    expect(indicator.querySelector('[part~="loading-text"]')?.textContent?.trim())
      .to.equal('回答を作成しています');
  });

  it('falls back to the locale label', async () => {
    const el = await opened({ open: { loading: { style: 'text' } } });
    el.loading = true;
    await el.updateComplete;
    expect(box(el)?.getAttribute('aria-label')).to.equal(el.currentLabels.loading);
  });

  describe('automatic', () => {
    it('stays out of the way unless the theme asks', async () => {
      const el = await opened();
      el.submit('配送について');
      await el.updateComplete;
      expect(el.loading).to.be.false;
    });

    it('starts on submit and ends when the other side answers', async () => {
      const el = await opened({ open: { loading: { auto: true } } });

      el.submit('配送について');
      await el.updateComplete;
      expect(el.loading).to.be.true;

      // The consumer's echo of what the reader just sent is not an answer.
      el.messages = [{ id: 'u1', role: 'user', text: '配送について' }];
      await el.updateComplete;
      expect(el.loading).to.be.true;

      el.messages = [...el.messages, { id: 'a1', role: 'assistant', text: '承知しました' }];
      await el.updateComplete;
      expect(el.loading).to.be.false;
    });

    it('ends on a streamed reply as soon as its bubble appears', async () => {
      const el = await opened({ open: { loading: { auto: true } } });
      el.submit('配送について');
      await el.updateComplete;

      el.messages = [{ id: 'a1', role: 'assistant', text: '', streaming: true }];
      await el.updateComplete;
      expect(el.loading).to.be.false;
    });

    it('does not start when a listener cancels the submit', async () => {
      const el = await opened({ open: { loading: { auto: true } } });
      el.addEventListener('chat-submit', (event) => event.preventDefault());
      el.submit('配送について');
      await el.updateComplete;
      expect(el.loading).to.be.false;
    });

    it('gives up after the timeout', async () => {
      const el = await opened({ open: { loading: { auto: true, timeout: 60 } } });
      el.submit('配送について');
      await el.updateComplete;
      expect(el.loading).to.be.true;

      await aTimeout(120);
      await el.updateComplete;
      expect(el.loading).to.be.false;
    });

    it('lets the consumer end it by hand', async () => {
      const el = await opened({ open: { loading: { auto: true, timeout: 5000 } } });
      el.submit('配送について');
      await el.updateComplete;

      el.loading = false;
      await el.updateComplete;
      expect(box(el)).to.equal(null);

      // The next answer must not revive it.
      el.messages = [{ id: 'a1', role: 'assistant', text: '承知しました' }];
      await el.updateComplete;
      expect(el.loading).to.be.false;
    });

    it('keeps the empty slot out of the way while it waits', async () => {
      const el = await opened({ open: { loading: { auto: true } } });
      el.submit('配送について');
      await el.updateComplete;
      expect(el.shadowRoot?.querySelector('slot[name="empty"]')).to.equal(null);
    });
  });
});
