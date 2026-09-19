// @ts-check
import { expect, fixture, html } from '@open-wc/testing';
import '../src/index.js';
import { greenTheme } from '../src/themes/index.js';
import { resolveTheme } from '../src/theme/merge-theme.js';
import { themeToVariables } from '../src/theme/theme-to-css.js';

/** @import { ChitUI } from '../src/chit-ui.js' */
/** @import { Theme } from '../src/types.js' */

/**
 * @param {Theme} [theme]
 * @returns {Promise<ChitUI>}
 */
async function open(theme) {
  const el = /** @type {ChitUI} */ (await fixture(html`<chit-ui></chit-ui>`));
  if (theme) el.theme = theme;
  el.messages = [
    { id: 'a', role: 'assistant', text: 'いらっしゃいませ。' },
    { id: 'b', role: 'user', text: '領収証がほしいです。' },
  ];
  el.typing = true;
  await el.open();
  await el.updateComplete;
  return el;
}

/**
 * @param {ChitUI} el
 * @param {string} selector
 * @returns {HTMLElement}
 */
function part(el, selector) {
  const found = el.shadowRoot?.querySelector(`[part~="${selector}"]`);
  if (!found) throw new Error(`no [part~="${selector}"]`);
  return /** @type {HTMLElement} */ (found);
}

/**
 * @param {ChitUI} el
 * @param {'assistant' | 'user'} role
 * @returns {Element}
 */
function bubbleOf(el, role) {
  const found = el.shadowRoot?.querySelector(`[part~="message-${role}"] [part~="bubble"]`);
  if (!found) throw new Error(`no ${role} bubble`);
  return found;
}

describe('bubble tail', () => {
  it('is off in the default theme', async () => {
    const el = await open();
    expect(el.dataset.bubbleTail).to.equal('none');

    const bubble = part(el, 'bubble');
    expect(getComputedStyle(bubble, '::after').display).to.equal('none');
    // The squared-off corner is the default cue and stays.
    expect(getComputedStyle(bubble).borderBottomLeftRadius).to.equal('4px');
  });

  it('is published as a host attribute and a radius variable', async () => {
    const el = await open({ open: { bubble: { radius: 20, tail: 'top' } } });
    expect(el.dataset.bubbleTail).to.equal('top');
    expect(getComputedStyle(el).getPropertyValue('--chit-bubble-radius').trim()).to.equal('20px');
  });

  it('draws a tail on each speaker’s own side, in that bubble’s colour', async () => {
    const el = await open({
      open: {
        bubble: { tail: 'top' },
        colors: { assistantBubble: 'rgb(1, 2, 3)', userBubble: 'rgb(4, 5, 6)' },
      },
    });

    const theirs = getComputedStyle(bubbleOf(el, 'assistant'), '::after');
    expect(theirs.display).to.equal('block');
    expect(theirs.backgroundColor).to.equal('rgb(1, 2, 3)');
    expect(theirs.clipPath).to.contain('path');

    const yours = getComputedStyle(bubbleOf(el, 'user'), '::after');
    expect(yours.display).to.equal('block');
    expect(yours.backgroundColor).to.equal('rgb(4, 5, 6)');
    // The same path, mirrored, so the curve is authored once.
    expect(yours.clipPath).to.equal(theirs.clipPath);
    expect(yours.transform).to.contain('matrix(-1');
  });

  it('leaves every corner rounded and drops the default clipped one', async () => {
    const el = await open({ open: { bubble: { radius: 18, tail: 'top' } } });
    const bubble = getComputedStyle(bubbleOf(el, 'assistant'));
    for (const corner of /** @type {const} */ ([
      'borderTopLeftRadius',
      'borderTopRightRadius',
      'borderBottomLeftRadius',
      'borderBottomRightRadius',
    ])) {
      expect(bubble[corner], corner).to.equal('18px');
    }
  });

  it('buries the tail’s root inside the bubble so the join cannot show', async () => {
    const el = await open({ open: { bubble: { radius: 18, tail: 'top' } } });
    for (const role of /** @type {const} */ (['assistant', 'user'])) {
      const bubble = bubbleOf(el, role);
      const after = getComputedStyle(bubble, '::after');
      // The offset is measured from the far side, so a 9px overlap reads as
      // the bubble's width less 9. The bubble's own background then covers
      // the seam, whatever its corner radius is doing.
      const offset = role === 'assistant' ? after.right : after.left;
      expect(parseFloat(offset)).to.be.closeTo(bubble.clientWidth - 9, 0.5);
    }
  });

  it('hangs below the corner, by an amount that follows the radius', async () => {
    const el = await open({ open: { bubble: { radius: 24, tail: 'top' } } });
    const bubble = bubbleOf(el, 'assistant');
    // radius / 4 + 1
    expect(parseFloat(getComputedStyle(bubble, '::after').top)).to.be.closeTo(7, 0.2);

    el.theme = { open: { bubble: { radius: 12, tail: 'top' } } };
    await el.updateComplete;
    expect(parseFloat(getComputedStyle(bubble, '::after').top)).to.be.closeTo(4, 0.2);
  });

  it('sits at the top or the bottom as the theme asks', async () => {
    const el = await open({ open: { bubble: { radius: 18, tail: 'top' } } });
    const bubble = bubbleOf(el, 'assistant');
    expect(parseFloat(getComputedStyle(bubble, '::after').top)).to.be.closeTo(5.5, 0.2);

    el.theme = { open: { bubble: { radius: 18, tail: 'bottom' } } };
    await el.updateComplete;
    const after = getComputedStyle(bubble, '::after');
    expect(parseFloat(after.bottom)).to.be.closeTo(5.5, 0.2);
    expect(after.transform).to.contain('matrix(1, 0, 0, -1');
  });

  it('gives the typing indicator the same tail', async () => {
    const el = await open({
      open: { bubble: { tail: 'top' }, colors: { assistantBubble: 'rgb(7, 8, 9)' } },
    });
    const typing = getComputedStyle(part(el, 'typing'), '::after');
    expect(typing.display).to.equal('block');
    expect(typing.backgroundColor).to.equal('rgb(7, 8, 9)');
  });

  it('stays inside the panel', async () => {
    const el = await open({ open: { bubble: { tail: 'top' } } });
    const panel = part(el, 'panel').getBoundingClientRect();
    for (const bubble of el.shadowRoot?.querySelectorAll('[part~="bubble"]') ?? []) {
      const box = bubble.getBoundingClientRect();
      // The tail hangs 9px outside the bubble; the list padding has to absorb it.
      expect(box.left - 9).to.be.at.least(panel.left);
      expect(box.right + 9).to.be.at.most(panel.right);
    }
  });
});

describe('header', () => {
  const LOGO = '/logo.png';

  it('falls back to the built-in label', async () => {
    const el = await open();
    expect(part(el, 'header-heading').textContent?.trim()).to.equal(el.currentLabels.panel);
    expect(el.shadowRoot?.querySelector('[part~="header-logo"]')).to.equal(null);
  });

  it('takes its text and image from the theme', async () => {
    const el = await open({ open: { header: { title: 'ecx サポート', logo: LOGO } } });
    expect(part(el, 'header-heading').textContent?.trim()).to.equal('ecx サポート');

    const logo = /** @type {HTMLImageElement} */ (part(el, 'header-logo'));
    expect(logo.tagName).to.equal('IMG');
    expect(logo.getAttribute('src')).to.equal(LOGO);
    // Decorative: the title beside it already names the panel.
    expect(logo.getAttribute('alt')).to.equal('');
  });

  it('names the dialog after the title', async () => {
    const el = await open({ open: { header: { title: 'ecx サポート' } } });
    expect(part(el, 'panel').getAttribute('aria-label')).to.equal('ecx サポート');
  });

  it('keeps the image and the title together', async () => {
    const el = await open({ open: { header: { title: 'ecx サポート', logo: LOGO } } });
    const block = part(el, 'header-title');
    expect(block.contains(part(el, 'header-logo'))).to.be.true;
    expect(block.contains(part(el, 'header-heading'))).to.be.true;

    // A slot is display: contents, so without the wrapper the header's
    // space-between would throw these to opposite ends.
    const gap =
      part(el, 'header-heading').getBoundingClientRect().left -
      part(el, 'header-logo').getBoundingClientRect().right;
    expect(gap).to.be.below(12);
  });

  it('truncates a long title instead of pushing the close button out', async () => {
    const el = await open({
      open: { header: { title: 'とても長いタイトル'.repeat(8), logo: LOGO } },
    });
    const header = part(el, 'header').getBoundingClientRect();
    const close = part(el, 'close-button').getBoundingClientRect();
    expect(close.right).to.be.at.most(header.right);
    expect(Math.round(close.width)).to.be.greaterThan(0);
  });

  it('can be left out altogether', async () => {
    const el = await open({ open: { header: { visible: false, title: 'ecx サポート' } } });
    expect(el.shadowRoot?.querySelector('[part~="header"]')).to.equal(null);
    expect(el.shadowRoot?.querySelector('[part~="close-button"]')).to.equal(null);

    // The conversation takes the space the bar had.
    const panel = part(el, 'panel').getBoundingClientRect();
    const list = part(el, 'messages').getBoundingClientRect();
    expect(Math.round(list.top - panel.top)).to.equal(0);

    // The dialog still has a name: that name is read, not seen.
    expect(part(el, 'panel').getAttribute('aria-label')).to.equal('ecx サポート');
  });

  it('still closes on Esc without the bar', async () => {
    const el = await open({ open: { header: { visible: false } } });
    part(el, 'panel').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }),
    );
    await el.updateComplete;
    expect(el.state).to.equal('closed');
  });

  it('comes back when the theme says so', async () => {
    const el = await open({ open: { header: { visible: false } } });
    el.theme = { open: { header: { visible: true, title: 'ecx サポート' } } };
    await el.updateComplete;
    expect(part(el, 'header-heading').textContent?.trim()).to.equal('ecx サポート');
  });

  it('offers no way home until the theme asks for one', async () => {
    const el = await open({ open: { header: { title: 'サポート' } } });
    expect(el.shadowRoot?.querySelector('[part~="home-button"]')).to.equal(null);
  });

  it('adds a home button the theme can turn on and off', async () => {
    const el = await open({ open: { header: { home: true } } });
    const home = part(el, 'home-button');
    expect(home.getAttribute('aria-label')).to.equal(el.currentLabels.home);
    // Before the close button, so closing stays the last thing in the bar.
    expect(home.compareDocumentPosition(part(el, 'close-button')))
      .to.equal(Node.DOCUMENT_POSITION_FOLLOWING);

    el.theme = { open: { header: { home: false } } };
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('[part~="home-button"]')).to.equal(null);
  });

  it('announces the way home and leaves the conversation alone', async () => {
    const el = await open({ open: { header: { home: true } } });
    /** @type {CustomEvent[]} */
    const seen = [];
    el.addEventListener('chat-home', (event) => seen.push(/** @type {CustomEvent} */ (event)));

    part(el, 'home-button').click();
    await el.updateComplete;

    expect(seen).to.have.length(1);
    expect(seen[0].detail.trigger).to.equal('user');
    // The widget does not own the messages, so it clears nothing and stays open.
    expect(el.messages).to.have.length(2);
    expect(el.state).to.equal('open');
  });

  it('can be asked from code', async () => {
    const el = await open({ open: { header: { home: true } } });
    /** @type {CustomEvent[]} */
    const seen = [];
    el.addEventListener('chat-home', (event) => seen.push(/** @type {CustomEvent} */ (event)));
    el.home();
    expect(seen[0].detail.trigger).to.equal('api');
  });

  it('still lets the slot replace the whole title block', async () => {
    const el = /** @type {ChitUI} */ (
      await fixture(html`<chit-ui><span slot="header-title" id="mine">自前</span></chit-ui>`)
    );
    await el.open();
    await el.updateComplete;
    const slot = /** @type {HTMLSlotElement} */ (
      el.shadowRoot?.querySelector('slot[name="header-title"]')
    );
    expect(slot.assignedElements().map((n) => n.id)).to.deep.equal(['mine']);
  });
});

describe('speaker', () => {
  const ICON = '/support.png';

  /**
   * @param {ChitUI} el
   * @param {string} id
   * @returns {HTMLElement}
   */
  function row(el, id) {
    const found = el.shadowRoot?.querySelector(`[data-id="${id}"]`);
    if (!found) throw new Error(`no message ${id}`);
    return /** @type {HTMLElement} */ (found);
  }

  it('shows nothing until the theme says who is talking', async () => {
    const el = await open();
    expect(row(el, 'a').querySelector('[part~="avatar"]')).to.equal(null);
    expect(row(el, 'a').querySelector('[part~="name"]')).to.equal(null);
  });

  it('puts the theme’s name and icon on every message from that side', async () => {
    const el = await open({ open: { speaker: { assistant: { name: 'サポート', avatar: ICON } } } });

    const img = /** @type {HTMLImageElement} */ (row(el, 'a').querySelector('[part~="avatar"]'));
    expect(img.tagName).to.equal('IMG');
    expect(img.getAttribute('src')).to.equal(ICON);
    expect(row(el, 'a').querySelector('[part~="name"]')?.textContent).to.equal('サポート');

    // The other side was not given one.
    expect(row(el, 'b').querySelector('[part~="avatar"]')).to.equal(null);
  });

  it('lets a message speak for itself', async () => {
    const el = await open({ open: { speaker: { assistant: { name: 'サポート', avatar: ICON } } } });
    el.messages = [
      { id: 'a', role: 'assistant', text: 'A', name: '田中', avatar: '/tanaka.png' },
    ];
    await el.updateComplete;

    const img = /** @type {HTMLImageElement} */ (row(el, 'a').querySelector('[part~="avatar"]'));
    expect(img.getAttribute('src')).to.equal('/tanaka.png');
    expect(row(el, 'a').querySelector('[part~="name"]')?.textContent).to.equal('田中');
  });

  it('hides the icon on null but keeps the column, so a run stays in line', async () => {
    const el = await open({ open: { speaker: { assistant: { name: 'サポート', avatar: ICON } } } });
    el.messages = [
      { id: 'a', role: 'assistant', text: 'A' },
      { id: 'b', role: 'assistant', text: 'B', avatar: null, name: null },
    ];
    await el.updateComplete;

    const second = row(el, 'b');
    const spacer = /** @type {HTMLElement} */ (second.querySelector('[part~="avatar"]'));
    expect(spacer.tagName).to.equal('SPAN');
    expect(getComputedStyle(spacer).visibility).to.equal('hidden');
    expect(second.querySelector('[part~="name"]')).to.equal(null);

    // Same left edge as the message that does show the face.
    const first = row(el, 'a').querySelector('[part~="bubble"]');
    const bubbles = [first, second.querySelector('[part~="bubble"]')].map(
      (b) => Math.round(/** @type {Element} */ (b).getBoundingClientRect().left),
    );
    expect(bubbles[1]).to.equal(bubbles[0]);
  });

  it('leaves system lines alone', async () => {
    const el = await open({ open: { speaker: { assistant: { name: 'サポート', avatar: ICON } } } });
    el.messages = [{ id: 's', role: 'system', text: 'オペレーターが参加しました' }];
    await el.updateComplete;
    expect(row(el, 's').querySelector('[part~="avatar"]')).to.equal(null);
    expect(row(el, 's').querySelector('[part~="name"]')).to.equal(null);
  });

  it('lines the typing indicator up with the bubbles', async () => {
    const el = await open({ open: { speaker: { assistant: { avatar: ICON } } } });
    const typing = part(el, 'typing');
    expect(parseFloat(getComputedStyle(typing).marginInlineStart)).to.be.greaterThan(20);

    el.theme = {};
    await el.updateComplete;
    expect(parseFloat(getComputedStyle(typing).marginInlineStart)).to.equal(0);
  });
});

describe('green preset', () => {
  it('is a plain theme object, not a resolved one', () => {
    expect(greenTheme.open?.colors?.userBubble).to.be.a('string');
    expect(greenTheme).to.not.have.property('device');
    expect(greenTheme.open).to.not.have.property('width');
  });

  it('asks for tails', () => {
    expect(resolveTheme(greenTheme, 'pc').open.bubble.tail).to.equal('top');
  });

  it('keeps the phone measurements of the default launcher', () => {
    const mobile = resolveTheme(greenTheme, 'mobile');
    expect(mobile.closed.size).to.equal(56);
    const closed = /** @type {import('../src/types.js').ClosedTheme} */ (greenTheme.closed);
    expect(mobile.closed.colors.background).to.equal(closed.colors?.background);
  });

  it('can be customised by spreading over it', () => {
    /** @type {Theme} */
    const mine = { ...greenTheme, open: { ...greenTheme.open, width: 420 } };
    const resolved = resolveTheme(mine, 'pc');
    expect(resolved.open.width).to.equal(420);
    expect(resolved.open.bubble.tail).to.equal('top');
  });

  it('reaches the element as custom properties', async () => {
    const el = await open(greenTheme);
    const vars = themeToVariables(resolveTheme(greenTheme, 'pc'));
    expect(getComputedStyle(el).getPropertyValue('--chit-color-user-bg').trim())
      .to.equal(vars['--chit-color-user-bg']);
    expect(el.dataset.bubbleTail).to.equal('top');
  });
});
