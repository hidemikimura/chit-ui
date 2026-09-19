// @ts-check
import { expect, fixture, html, oneEvent, aTimeout } from '@open-wc/testing';
import '../src/index.js';

/** @import { ChitUI } from '../src/chit-ui.js' */

/**
 * @param {Partial<ChitUI>} [props]
 * @returns {Promise<ChitUI>}
 */
async function opened(props = {}) {
  const el = /** @type {ChitUI} */ (await fixture(html`<chit-ui></chit-ui>`));
  el.theme = {
    closed: { animation: { enter: 'none', exit: 'none', duration: 0 } },
    open: { animation: { enter: 'none', exit: 'none', duration: 0 } },
  };
  Object.assign(el, props);
  await el.open();
  await el.updateComplete;
  return el;
}

/**
 * @param {ChitUI} el
 * @returns {HTMLTextAreaElement}
 */
function input(el) {
  return /** @type {HTMLTextAreaElement} */ (el.shadowRoot?.querySelector('[part~="input"]'));
}

/**
 * @param {ChitUI} el
 * @returns {HTMLButtonElement}
 */
function sendButton(el) {
  return /** @type {HTMLButtonElement} */ (el.shadowRoot?.querySelector('[part~="send-button"]'));
}

/**
 * Type into the box the way a browser would.
 *
 * @param {ChitUI} el
 * @param {string} text
 */
async function type(el, text) {
  const box = input(el);
  box.value = text;
  box.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  await el.updateComplete;
}

/**
 * @param {ChitUI} el
 * @param {KeyboardEventInit & { keyCode?: number }} [init]
 */
function pressEnter(el, init = {}) {
  const { keyCode, ...rest } = init;
  const event = new KeyboardEvent('keydown', {
    key: 'Enter',
    bubbles: true,
    composed: true,
    cancelable: true,
    ...rest,
  });
  if (keyCode !== undefined) Object.defineProperty(event, 'keyCode', { value: keyCode });
  input(el).dispatchEvent(event);
  return event;
}

describe('composer', () => {
  it('sends on Enter and clears the box', async () => {
    const el = await opened();
    await type(el, 'こんにちは');

    setTimeout(() => pressEnter(el));
    const event = await oneEvent(el, 'chat-submit');

    expect(event.detail.text).to.equal('こんにちは');
    expect(el.value).to.equal('');
    expect(input(el).value).to.equal('');
  });

  it('hands over the line breaks the person typed', async () => {
    const el = await opened();
    await type(el, '一行目\n二行目');

    setTimeout(() => pressEnter(el));
    const event = await oneEvent(el, 'chat-submit');

    expect(event.detail.text).to.equal('一行目\n二行目');
  });

  it('leaves surrounding whitespace as typed', async () => {
    const el = await opened();
    await type(el, '  前後に空白  \n');

    setTimeout(() => pressEnter(el));
    const event = await oneEvent(el, 'chat-submit');

    expect(event.detail.text).to.equal('  前後に空白  \n');
  });

  it('sends on the button too', async () => {
    const el = await opened();
    await type(el, 'ボタンから');

    setTimeout(() => sendButton(el).click());
    const event = await oneEvent(el, 'chat-submit');

    expect(event.detail.text).to.equal('ボタンから');
  });

  it('keeps the text when a listener cancels the send', async () => {
    const el = await opened();
    el.addEventListener('chat-submit', (event) => event.preventDefault());
    await type(el, 'そのまま');

    expect(el.submit()).to.be.false;
    expect(el.value).to.equal('そのまま');
  });

  it('treats Shift+Enter as a newline', async () => {
    const el = await opened();
    await type(el, '一行目');
    let fired = false;
    el.addEventListener('chat-submit', () => { fired = true; });

    const event = pressEnter(el, { shiftKey: true });
    await aTimeout(0);

    expect(fired).to.be.false;
    expect(event.defaultPrevented).to.be.false;
  });

  it('leaves Enter alone when sendOnEnter is off', async () => {
    const el = await opened({ sendOnEnter: false });
    await type(el, 'まだ送らない');
    let fired = false;
    el.addEventListener('chat-submit', () => { fired = true; });

    pressEnter(el);
    await aTimeout(0);

    expect(fired).to.be.false;
  });

  it('refuses an empty or whitespace-only message', async () => {
    const el = await opened();
    let fired = false;
    el.addEventListener('chat-submit', () => { fired = true; });

    pressEnter(el);
    await type(el, '   \n  ');
    pressEnter(el);
    await aTimeout(0);

    expect(fired).to.be.false;
    expect(sendButton(el).disabled).to.be.true;
  });
});

describe('composer and the IME', () => {
  it('ignores the Enter that confirms a candidate (isComposing)', async () => {
    const el = await opened();
    await type(el, 'にほんご');
    let fired = false;
    el.addEventListener('chat-submit', () => { fired = true; });

    pressEnter(el, { isComposing: true });
    await aTimeout(0);

    expect(fired).to.be.false;
  });

  it('ignores the Enter that confirms a candidate (keyCode 229)', async () => {
    const el = await opened();
    await type(el, 'にほんご');
    let fired = false;
    el.addEventListener('chat-submit', () => { fired = true; });

    pressEnter(el, { keyCode: 229 });
    await aTimeout(0);

    expect(fired).to.be.false;
  });

  it('ignores Enter while a composition is open, even without the flags', async () => {
    const el = await opened();
    input(el).dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, composed: true }));
    await type(el, 'にほんご');
    let fired = false;
    el.addEventListener('chat-submit', () => { fired = true; });

    pressEnter(el);
    await aTimeout(0);

    expect(fired).to.be.false;
  });

  it('ignores the Enter WebKit delivers right after compositionend', async () => {
    const el = await opened();
    const box = input(el);
    box.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, composed: true }));
    await type(el, '日本語');
    box.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, composed: true }));

    let fired = false;
    el.addEventListener('chat-submit', () => { fired = true; });

    // Same turn of the event loop: this is the keystroke that confirmed the
    // candidate, arriving with isComposing already false.
    pressEnter(el);
    expect(fired).to.be.false;

    // A deliberate Enter a moment later does send.
    await aTimeout(10);
    pressEnter(el);
    expect(fired).to.be.true;
  });
});

describe('composer state', () => {
  it('locks while busy and unlocks after', async () => {
    const el = await opened();
    await type(el, 'まだ送れる');
    expect(sendButton(el).disabled).to.be.false;

    el.busy = true;
    await el.updateComplete;
    expect(input(el).disabled).to.be.true;
    expect(sendButton(el).disabled).to.be.true;
    expect(el.shadowRoot?.querySelector('[part~="spinner"]')).to.exist;

    el.busy = false;
    await el.updateComplete;
    expect(input(el).disabled).to.be.false;
    expect(sendButton(el).disabled).to.be.false;
  });

  it('respects inputDisabled', async () => {
    const el = await opened({ inputDisabled: true });
    await type(el, 'だめ');
    expect(input(el).disabled).to.be.true;
    expect(el.submit()).to.be.false;
  });

  it('drops the whole composer when inputHidden is set', async () => {
    const el = await opened({ inputHidden: true });
    expect(el.shadowRoot?.querySelector('[part~="composer"]')).to.not.exist;
    expect(el.shadowRoot?.querySelector('[part~="input"]')).to.not.exist;
  });

  it('counts by code point and blocks sending past maxLength', async () => {
    const el = await opened({ maxLength: 10 });
    await type(el, '𝒜'.repeat(11));

    expect(el.canSend).to.be.false;
    expect(sendButton(el).disabled).to.be.true;

    const counter = /** @type {HTMLElement} */ (el.shadowRoot?.querySelector('[part~="counter"]'));
    expect(counter.hidden).to.be.false;
    expect(counter.textContent).to.equal('-1');
    expect(counter.hasAttribute('data-over')).to.be.true;

    await type(el, '𝒜'.repeat(9));
    expect(el.canSend).to.be.true;
    expect(counter.hasAttribute('data-over')).to.be.false;
  });

  it('does not put maxlength on the textarea, so an IME can overshoot briefly', async () => {
    const el = await opened({ maxLength: 10 });
    expect(input(el).hasAttribute('maxlength')).to.be.false;
  });

  it('reports every keystroke as chat-input', async () => {
    const el = await opened();
    setTimeout(() => type(el, 'あ'));
    const event = await oneEvent(el, 'chat-input');
    expect(event.detail.value).to.equal('あ');
  });

  it('reads and writes the box through value', async () => {
    const el = await opened();
    el.value = '差し込み';
    await el.updateComplete;

    expect(input(el).value).to.equal('差し込み');
    expect(el.value).to.equal('差し込み');

    el.clearInput();
    expect(el.value).to.equal('');
  });

  it('sends explicit text without touching the box', async () => {
    const el = await opened();
    await type(el, '下書き');

    setTimeout(() => el.submit('別の文'));
    const event = await oneEvent(el, 'chat-submit');

    expect(event.detail.text).to.equal('別の文');
  });

  it('prefers the placeholder property over the theme', async () => {
    const el = await opened();
    el.theme = { ...el.theme, open: { input: { placeholder: 'テーマから' } } };
    await el.updateComplete;
    expect(input(el).placeholder).to.equal('テーマから');

    el.placeholder = 'プロパティから';
    await el.updateComplete;
    expect(input(el).placeholder).to.equal('プロパティから');
  });

  it('focuses the composer when the panel opens on a desktop', async () => {
    const el = await opened();
    expect(el.shadowRoot?.activeElement).to.equal(input(el));
  });

  it('leaves focus alone when focusOnOpen is never', async () => {
    const el = await opened({ focusOnOpen: 'never' });
    expect(el.shadowRoot?.activeElement).to.equal(null);
  });

  it('still focuses the composer when asked directly', async () => {
    const el = await opened({ focusOnOpen: 'never' });
    expect(el.focusInput()).to.be.true;
    expect(el.shadowRoot?.activeElement).to.equal(input(el));
  });
});

describe('attach button', () => {
  /**
   * @param {ChitUI} el
   * @returns {HTMLInputElement | null}
   */
  const field = (el) =>
    /** @type {HTMLInputElement | null} */ (el.shadowRoot?.querySelector('[part~="attach-input"]'));

  /**
   * @param {ChitUI} el
   * @returns {HTMLButtonElement | null}
   */
  const button = (el) =>
    /** @type {HTMLButtonElement | null} */ (
      el.shadowRoot?.querySelector('[part~="attach-button"]')
    );

  /**
   * Pick files the way a file dialog would.
   *
   * @param {HTMLInputElement} target
   * @param {File[]} files
   */
  function pick(target, files) {
    const data = new DataTransfer();
    for (const file of files) data.items.add(file);
    target.files = data.files;
    target.dispatchEvent(new Event('change'));
  }

  it('is off until the theme asks for it', async () => {
    const el = await opened();
    expect(button(el)).to.equal(null);
    expect(field(el)).to.equal(null);
  });

  it('accepts images and video by default', async () => {
    const el = await opened();
    el.theme = { open: { input: { attach: true } } };
    await el.updateComplete;

    expect(button(el)?.getAttribute('aria-label')).to.equal(el.currentLabels.attach);
    const target = /** @type {HTMLInputElement} */ (field(el));
    expect(target.getAttribute('accept')).to.equal('image/*,video/*');
    expect(target.multiple).to.be.false;
    // The button is the control; the field itself is out of the way.
    expect(getComputedStyle(target).display).to.equal('none');
    expect(target.getAttribute('tabindex')).to.equal('-1');
  });

  it('takes accept and multiple from the theme', async () => {
    const el = await opened();
    el.theme = { open: { input: { attach: true, accept: 'image/png', multiple: true } } };
    await el.updateComplete;

    const target = /** @type {HTMLInputElement} */ (field(el));
    expect(target.getAttribute('accept')).to.equal('image/png');
    expect(target.multiple).to.be.true;
  });

  it('reports what was picked and keeps nothing', async () => {
    const el = await opened();
    el.theme = { open: { input: { attach: true, multiple: true } } };
    await el.updateComplete;

    /** @type {File[][]} */
    const seen = [];
    el.addEventListener('chat-attach', (event) =>
      seen.push(/** @type {CustomEvent} */ (event).detail.files),
    );

    const target = /** @type {HTMLInputElement} */ (field(el));
    pick(target, [
      new File(['x'], 'photo.png', { type: 'image/png' }),
      new File(['y'], 'clip.mp4', { type: 'video/mp4' }),
    ]);
    await el.updateComplete;

    expect(seen).to.have.length(1);
    expect(seen[0].map((f) => f.name)).to.deep.equal(['photo.png', 'clip.mp4']);
    // The widget adds nothing to the conversation: those files are not its to keep.
    expect(el.messages).to.have.length(0);
    // Cleared, so picking the same file again still reports it.
    expect(target.value).to.equal('');
  });

  it('says nothing when the dialog is dismissed', async () => {
    const el = await opened();
    el.theme = { open: { input: { attach: true } } };
    await el.updateComplete;

    let fired = 0;
    el.addEventListener('chat-attach', () => (fired += 1));
    pick(/** @type {HTMLInputElement} */ (field(el)), []);
    expect(fired).to.equal(0);
  });

  it('goes quiet while the widget is busy or locked', async () => {
    const el = await opened({ busy: true });
    el.theme = { open: { input: { attach: true } } };
    await el.updateComplete;
    expect(button(el)?.disabled).to.be.true;

    el.busy = false;
    el.inputDisabled = true;
    await el.updateComplete;
    expect(button(el)?.disabled).to.be.true;

    el.inputDisabled = false;
    await el.updateComplete;
    expect(button(el)?.disabled).to.be.false;
  });

  it('can be opened from code', async () => {
    const el = await opened();
    el.theme = { open: { input: { attach: true } } };
    await el.updateComplete;

    const target = /** @type {HTMLInputElement} */ (field(el));
    let opens = 0;
    target.addEventListener('click', (event) => {
      event.preventDefault();
      opens += 1;
    });

    /** @type {HTMLButtonElement} */ (button(el)).click();
    el.openAttach();
    expect(opens).to.equal(2);
  });
});
