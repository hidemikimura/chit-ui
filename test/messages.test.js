// @ts-check
import { expect, fixture, html, oneEvent, aTimeout } from '@open-wc/testing';
import '../src/index.js';

/** @import { ChitUI } from '../src/chit-ui.js' */
/** @import { Message } from '../src/types.js' */

/**
 * @param {number} count
 * @returns {Message[]}
 */
function conversation(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `m${i}`,
    role: /** @type {'assistant' | 'user'} */ (i % 2 ? 'assistant' : 'user'),
    html: `<p>message ${i} — some text to give the bubble height</p>`,
  }));
}

/**
 * @param {Message[]} [messages]
 * @returns {Promise<ChitUI>}
 */
async function openWith(messages = []) {
  const el = /** @type {ChitUI} */ (await fixture(html`<chit-ui></chit-ui>`));
  el.theme = {
    closed: { animation: { enter: 'none', exit: 'none', duration: 0 } },
    open: { animation: { enter: 'none', exit: 'none', duration: 0 }, height: 300 },
  };
  el.messages = messages;
  await el.open();
  await el.updateComplete;
  return el;
}

/**
 * @param {ChitUI} el
 * @returns {HTMLElement}
 */
function viewport(el) {
  return /** @type {HTMLElement} */ (el.shadowRoot?.querySelector('[part~="messages"]'));
}

describe('message list', () => {
  it('draws one article per message, tagged by role', async () => {
    const el = await openWith([
      { id: 'a', role: 'user', html: '<p>hi</p>' },
      { id: 'b', role: 'assistant', html: '<p>hello</p>' },
      { id: 'c', role: 'system', html: '<p>an operator joined</p>' },
    ]);

    const articles = el.shadowRoot?.querySelectorAll('[part~="message"]') ?? [];
    expect(articles.length).to.equal(3);
    expect(articles[0].getAttribute('part')).to.contain('message-user');
    expect(articles[1].getAttribute('part')).to.contain('message-assistant');
    expect(articles[2].getAttribute('part')).to.contain('message-system');
  });

  it('reuses the DOM of a message that kept its id', async () => {
    const el = await openWith([{ id: 'a', role: 'assistant', html: '<p>one</p>' }]);
    const before = el.getMessageElement('a');

    el.messages = [
      { id: 'a', role: 'assistant', html: '<p>one</p>' },
      { id: 'b', role: 'user', html: '<p>two</p>' },
    ];
    await el.updateComplete;

    expect(el.getMessageElement('a')).to.equal(before);
  });

  it('keeps DOM identity when a message is inserted at the front', async () => {
    const el = await openWith([{ id: 'b', role: 'assistant', html: '<p>b</p>' }]);
    const before = el.getMessageElement('b');

    el.messages = [
      { id: 'a', role: 'assistant', html: '<p>a</p>' },
      { id: 'b', role: 'assistant', html: '<p>b</p>' },
    ];
    await el.updateComplete;

    expect(el.getMessageElement('b')).to.equal(before);
  });

  it('shows name, avatar, time and status when given', async () => {
    const el = await openWith([
      {
        id: 'a',
        role: 'assistant',
        html: '<p>hi</p>',
        name: 'サポート',
        avatar: '/avatar.png',
        time: '2026-09-18T10:00:00+09:00',
      },
      { id: 'b', role: 'user', html: '<p>ok</p>', status: 'error' },
    ]);

    expect(el.shadowRoot?.querySelector('[part~="name"]')?.textContent?.trim()).to.equal('サポート');
    expect(el.shadowRoot?.querySelector('[part~="avatar"]')).to.exist;
    expect(el.shadowRoot?.querySelector('[part~="time"]')?.textContent?.trim()).to.not.equal('');
    expect(el.shadowRoot?.querySelector('[part~="status"]')?.getAttribute('data-status')).to.equal(
      'error',
    );
  });

  it('formats the time in the document language, not the browser one', async () => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = 'ja';
    try {
      const el = await openWith([
        { id: 'a', role: 'assistant', html: '<p>hi</p>', time: '2026-09-18T23:52:00+09:00' },
      ]);
      const shown = el.shadowRoot?.querySelector('[part~="time"]')?.textContent?.trim() ?? '';
      expect(el.resolvedLocale).to.equal('ja');
      expect(shown).to.not.match(/AM|PM/i);
    } finally {
      document.documentElement.lang = previous;
    }
  });

  it('lets formatTime override the default', async () => {
    const el = await openWith([
      { id: 'a', role: 'assistant', html: '<p>hi</p>', time: '2026-09-18T23:52:00+09:00' },
    ]);
    el.formatTime = () => 'たった今';
    el.messages = [...el.messages];
    await el.updateComplete;

    expect(el.shadowRoot?.querySelector('[part~="time"]')?.textContent?.trim()).to.equal('たった今');
  });

  it('shows the empty slot only while there is nothing to show', async () => {
    const el = /** @type {ChitUI} */ (
      await fixture(html`<chit-ui><p slot="empty">ご用件をどうぞ</p></chit-ui>`)
    );
    el.theme = { open: { animation: { enter: 'none', exit: 'none', duration: 0 } } };
    await el.open();
    await el.updateComplete;

    expect(el.shadowRoot?.querySelector('slot[name="empty"]')).to.exist;

    el.messages = [{ id: 'a', role: 'user', html: '<p>hi</p>' }];
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('slot[name="empty"]')).to.not.exist;
  });

  it('shows the typing bubble while typing is set', async () => {
    const el = await openWith();
    expect(el.shadowRoot?.querySelector('[part~="typing"]')).to.not.exist;

    el.typing = true;
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('[part~="typing"]')).to.exist;

    el.typing = { html: '<em class="custom">考えています</em>' };
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('[part~="typing"] .custom')).to.exist;
  });

  it('marks a streaming message and shows a caret', async () => {
    const el = await openWith([
      { id: 'a', role: 'assistant', html: '<p>partial</p>', streaming: true },
    ]);
    const article = el.shadowRoot?.querySelector('[part~="message"]');
    expect(article?.hasAttribute('data-streaming')).to.be.true;
    expect(el.shadowRoot?.querySelector('[part~="cursor"]')).to.exist;
  });
});

describe('chat-message-render', () => {
  it('fires for a new message and when its content changes', async () => {
    const el = await openWith();
    /** @type {string[]} */
    const seen = [];
    el.addEventListener('chat-message-render', (event) => {
      seen.push(/** @type {CustomEvent} */ (event).detail.message.id);
    });

    el.messages = [{ id: 'a', role: 'assistant', html: '<p>one</p>' }];
    await el.updateComplete;
    expect(seen).to.deep.equal(['a']);

    el.messages = [{ id: 'a', role: 'assistant', html: '<p>one two</p>' }];
    await el.updateComplete;
    expect(seen).to.deep.equal(['a', 'a']);
  });

  it('does not fire when only the status or streaming flag changes', async () => {
    const el = await openWith([{ id: 'a', role: 'user', html: '<p>one</p>', status: 'sending' }]);
    let fired = 0;
    el.addEventListener('chat-message-render', () => { fired += 1; });

    el.messages = [{ id: 'a', role: 'user', html: '<p>one</p>', status: 'sent' }];
    await el.updateComplete;

    expect(fired).to.equal(0);
  });

  it('hands over the content element and the component instance', async () => {
    const el = await openWith();
    setTimeout(() => {
      el.messages = [{ id: 'a', role: 'assistant', html: '<p>hi</p>' }];
    });
    const event = await oneEvent(el, 'chat-message-render');

    expect(event.detail.element).to.equal(el.getMessageElement('a'));
    expect(event.detail.instance).to.equal(undefined);
  });
});

/**
 * Wait until the viewport has settled at the bottom. A follow is animated, so
 * "did it follow?" cannot be answered on the next tick.
 *
 * @param {HTMLElement} box
 * @param {number} [timeout]
 * @returns {Promise<number>} The remaining distance to the bottom.
 */
async function settleAtBottom(box, timeout = 1500) {
  const deadline = performance.now() + timeout;
  let distance = Infinity;
  while (performance.now() < deadline) {
    distance = box.scrollHeight - box.scrollTop - box.clientHeight;
    if (distance <= 24) return distance;
    await aTimeout(16);
  }
  return distance;
}

/**
 * Record how the viewport was asked to scroll.
 *
 * @param {HTMLElement} box
 * @returns {string[]}
 */
function recordScrolls(box) {
  /** @type {string[]} */
  const calls = [];
  const original = box.scrollTo.bind(box);
  Object.defineProperty(box, 'scrollTo', {
    configurable: true,
    value: (/** @type {ScrollToOptions} */ options) => {
      calls.push(String(options?.behavior ?? 'instant'));
      // Jump straight there: a real smooth scroll would still be mid-flight
      // when the assertions run.
      original({ ...options, behavior: 'instant' });
    },
  });
  return calls;
}

describe('scroll animation', () => {
  it('animates the follow when a message arrives', async () => {
    const el = await openWith(conversation(20));
    const box = viewport(el);
    await aTimeout(50);
    const calls = recordScrolls(box);

    el.messages = [...el.messages, { id: 'new', role: 'assistant', html: '<p>返信</p>' }];
    await el.updateComplete;
    await aTimeout(20);

    expect(calls).to.include('smooth');
  });

  it('does not animate growth inside a message', async () => {
    const el = await openWith([
      { id: 'a', role: 'assistant', html: '<p>部分</p>', streaming: true },
    ]);
    await aTimeout(50);
    const box = viewport(el);
    const calls = recordScrolls(box);

    // Same id, longer body: this is a streamed reply growing.
    for (let i = 0; i < 5; i += 1) {
      el.messages = [
        { id: 'a', role: 'assistant', html: `<p>${'文字'.repeat((i + 1) * 40)}</p>`, streaming: true },
      ];
      await el.updateComplete;
    }
    await aTimeout(80);

    expect(calls).to.not.include('smooth');
  });

  it('does not animate the jump taken as the panel opens', async () => {
    const el = /** @type {ChitUI} */ (await fixture(html`<chit-ui></chit-ui>`));
    el.theme = {
      closed: { animation: { enter: 'none', exit: 'none', duration: 0 } },
      open: { animation: { enter: 'none', exit: 'none', duration: 0 }, height: 300 },
    };
    el.messages = conversation(20);
    await el.updateComplete;

    /** @type {string[]} */
    let calls = [];
    const patch = setInterval(() => {
      const box = el.shadowRoot?.querySelector('[part~="messages"]');
      if (box && !calls.length) calls = recordScrolls(/** @type {HTMLElement} */ (box));
    }, 1);

    await el.open();
    await aTimeout(60);
    clearInterval(patch);

    expect(calls).to.not.include('smooth');
  });

  it('honours an instant setting from the theme', async () => {
    const el = await openWith(conversation(20));
    el.theme = { ...el.theme, open: { ...el.theme.open, animation: { scroll: 'instant' } } };
    await el.updateComplete;
    await aTimeout(50);
    const calls = recordScrolls(viewport(el));

    el.messages = [...el.messages, { id: 'new', role: 'assistant', html: '<p>返信</p>' }];
    await el.updateComplete;
    await aTimeout(20);

    expect(calls).to.not.include('smooth');
  });

  it('keeps following while its own animation is mid-flight', async () => {
    const el = await openWith(conversation(20));
    const box = viewport(el);
    await aTimeout(50);

    // Hold the viewport still so the smooth scroll stays "in flight" for the
    // length of the test; a real one finishes in a few frames and the browser
    // would fire scrollend before the assertions run.
    Object.defineProperty(box, 'scrollTo', { configurable: true, value: () => {} });

    el.messages = [...el.messages, { id: 'n1', role: 'assistant', html: '<p>一</p>' }];
    await el.updateComplete;
    await aTimeout(20);

    // Report a position partway up — what the browser does during the
    // animation — without moving the viewport, which would legitimately end
    // the scroll. It must not read as the reader scrolling away.
    Object.defineProperty(box, 'scrollTop', { configurable: true, get: () => 0 });
    box.dispatchEvent(new Event('scroll'));
    await aTimeout(20);
    // @ts-expect-error restoring the prototype's accessor
    delete box.scrollTop;

    el.messages = [...el.messages, { id: 'n2', role: 'assistant', html: '<p>二</p>' }];
    await el.updateComplete;
    await aTimeout(20);

    expect(el.hasUnseen).to.be.false;
    expect(el.shadowRoot?.querySelector('[part~="to-latest"]')).to.not.exist;
  });

  it('gives up following once the animation has settled and the reader moved', async () => {
    const el = await openWith(conversation(20));
    const box = viewport(el);
    await aTimeout(50);

    el.messages = [...el.messages, { id: 'n1', role: 'assistant', html: '<p>一</p>' }];
    await el.updateComplete;
    // Past the grace period, so a scroll away is the reader's doing again.
    await aTimeout(750);

    box.scrollTop = 0;
    box.dispatchEvent(new Event('scroll'));
    await aTimeout(20);

    el.messages = [...el.messages, { id: 'n2', role: 'assistant', html: '<p>二</p>' }];
    await el.updateComplete;
    await aTimeout(20);

    expect(el.hasUnseen).to.be.true;
  });
});

describe('scrolling', () => {
  it('follows new messages while the reader is at the bottom', async () => {
    const el = await openWith(conversation(20));
    const box = viewport(el);
    await aTimeout(50);

    expect(await settleAtBottom(box)).to.be.at.most(24);
    expect(el.hasUnseen).to.be.false;

    el.messages = [...el.messages, { id: 'later', role: 'assistant', html: '<p>あとから</p>' }];
    await el.updateComplete;

    expect(await settleAtBottom(box)).to.be.at.most(24);
    expect(el.hasUnseen).to.be.false;
  });

  it('stops following once the reader scrolls up, and offers to jump back', async () => {
    const el = await openWith(conversation(20));
    const box = viewport(el);
    await aTimeout(50);

    box.scrollTop = 0;
    box.dispatchEvent(new Event('scroll'));
    await aTimeout(20);

    el.messages = [...el.messages, { id: 'new', role: 'assistant', html: '<p>reply</p>' }];
    await el.updateComplete;
    await aTimeout(20);

    expect(el.hasUnseen).to.be.true;
    expect(box.scrollTop).to.be.lessThan(40);
    expect(el.shadowRoot?.querySelector('[part~="to-latest"]')).to.exist;
  });

  it('always follows the reader own message', async () => {
    const el = await openWith(conversation(20));
    const box = viewport(el);
    await aTimeout(50);

    box.scrollTop = 0;
    box.dispatchEvent(new Event('scroll'));
    await aTimeout(20);

    el.messages = [...el.messages, { id: 'mine', role: 'user', html: '<p>mine</p>' }];
    await el.updateComplete;

    expect(el.hasUnseen).to.be.false;
    expect(await settleAtBottom(box)).to.be.at.most(24);
  });

  it('fires chat-scroll-top once per visit to the top', async () => {
    const el = await openWith(conversation(20));
    const box = viewport(el);
    await aTimeout(50);

    let fired = 0;
    el.addEventListener('chat-scroll-top', () => { fired += 1; });

    box.scrollTop = 0;
    box.dispatchEvent(new Event('scroll'));
    box.dispatchEvent(new Event('scroll'));
    await aTimeout(20);
    expect(fired).to.equal(1);

    box.scrollTop = 120;
    box.dispatchEvent(new Event('scroll'));
    box.scrollTop = 0;
    box.dispatchEvent(new Event('scroll'));
    await aTimeout(20);
    expect(fired).to.equal(2);
  });

  it('does not move the reader when older messages are prepended', async () => {
    const el = await openWith(conversation(20));
    const box = viewport(el);
    await aTimeout(50);

    box.scrollTop = 0;
    box.dispatchEvent(new Event('scroll'));
    await aTimeout(20);

    const older = conversation(5).map((m) => ({ ...m, id: `old-${m.id}` }));
    el.messages = [...older, ...el.messages];
    await el.updateComplete;
    await aTimeout(20);

    expect(box.scrollTop).to.be.lessThan(40, 'no correction is applied, by design');
  });
});

describe('layout containment', () => {
  /**
   * @param {ChitUI} el
   * @returns {number}
   */
  const bubbleWidth = (el) =>
    el.shadowRoot?.querySelector('[part~="bubble"]')?.getBoundingClientRect().width ?? 0;

  it('keeps a very wide image inside the bubble', async () => {
    const plain = await openWith([{ id: 'a', role: 'assistant', html: '<p>short</p>' }]);
    const baseline = bubbleWidth(plain);

    const el = await openWith([
      {
        id: 'a',
        role: 'assistant',
        html: '<img src="data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'2000\' height=\'40\'></svg>">',
      },
    ]);
    await aTimeout(50);

    expect(bubbleWidth(el)).to.be.at.most(Math.max(baseline, 400));
  });

  it('keeps a long unbroken URL inside the bubble', async () => {
    const el = await openWith([
      {
        id: 'a',
        role: 'assistant',
        html: `<p>https://example.com/${'x'.repeat(300)}</p>`,
      },
    ]);
    await aTimeout(20);

    const panel = /** @type {HTMLElement} */ (el.shadowRoot?.querySelector('[part~="panel"]'));
    expect(bubbleWidth(el)).to.be.at.most(panel.getBoundingClientRect().width);
    expect(viewport(el).scrollWidth).to.be.at.most(viewport(el).clientWidth + 1);
  });

  it('keeps a wide table inside the bubble by scrolling it', async () => {
    const cells = Array.from({ length: 20 }, (_, i) => `<td>column ${i}</td>`).join('');
    const el = await openWith([
      { id: 'a', role: 'assistant', html: `<table><tr>${cells}</tr></table>` },
    ]);
    await aTimeout(20);

    const panel = /** @type {HTMLElement} */ (el.shadowRoot?.querySelector('[part~="panel"]'));
    expect(bubbleWidth(el)).to.be.at.most(panel.getBoundingClientRect().width);

    const table = /** @type {HTMLElement} */ (el.getMessageElement('a')?.querySelector('table'));
    expect(table.scrollWidth).to.be.greaterThan(table.clientWidth);
  });

  it('lets a message row span the list, so the bubble cap has something to resolve against', async () => {
    // The bubble is capped at a percentage of its row. If the row is allowed to
    // shrink to fit instead of spanning the list, that percentage resolves
    // against a shrink-to-fit parent — and because the content sets
    // overflow-wrap: anywhere, its min-content width is a single character, so
    // the bubble collapses into a column of letters.
    const el = await openWith([
      {
        id: 'a',
        role: 'assistant',
        html: '<ol><li>手順 1<ul><li>補足 A</li><li>補足 B</li></ul></li><li>手順 2</li></ol>',
      },
    ]);
    await aTimeout(20);

    const article = /** @type {HTMLElement} */ (el.shadowRoot?.querySelector('[part~="message"]'));
    const inner = /** @type {HTMLElement} */ (
      el.shadowRoot?.querySelector('[part~="messages-inner"]')
    );
    const available = inner.getBoundingClientRect().width
      - parseFloat(getComputedStyle(inner).paddingLeft)
      - parseFloat(getComputedStyle(inner).paddingRight);

    expect(article.getBoundingClientRect().width).to.be.closeTo(available, 1);
    // And the bubble still hugs its content rather than filling the row.
    expect(bubbleWidth(el)).to.be.lessThan(available);
  });

  it('neutralises a fixed-position child', async () => {
    const el = await openWith([
      {
        id: 'a',
        role: 'assistant',
        html: '<div class="esc" style="position: fixed; inset: 0; background: red;">escape</div>',
      },
    ]);
    await aTimeout(20);

    const escapee = /** @type {HTMLElement} */ (el.getMessageElement('a')?.querySelector('.esc'));
    expect(getComputedStyle(escapee).position).to.equal('static');
  });

  it('applies messageStyles inside the content, over the defaults', async () => {
    const el = await openWith([{ id: 'a', role: 'assistant', html: '<p class="p">hi</p>' }]);
    el.messageStyles = '[part~="message-content"] p { margin: 0; color: rgb(9, 9, 9); }';
    await el.updateComplete;
    await aTimeout(20);

    const paragraph = /** @type {HTMLElement} */ (el.getMessageElement('a')?.querySelector('.p'));
    expect(getComputedStyle(paragraph).color).to.equal('rgb(9, 9, 9)');
    expect(getComputedStyle(paragraph).marginTop).to.equal('0px');
  });
});
