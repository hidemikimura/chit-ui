// @ts-check
import { expect, fixture, html } from '@open-wc/testing';
import '../src/index.js';

/** @import { ChitUI } from '../src/chit-ui.js' */
/** @import { Theme } from '../src/types.js' */

/**
 * @param {Theme} [theme]
 * @returns {Promise<ChitUI>}
 */
async function widget(theme) {
  const el = /** @type {ChitUI} */ (await fixture(html`<chit-ui></chit-ui>`));
  el.theme = {
    closed: { animation: { enter: 'none', exit: 'none', duration: 0 } },
    ...theme,
    open: { animation: { enter: 'none', exit: 'none', duration: 0 }, ...theme?.open },
  };
  await el.updateComplete;
  return el;
}

/**
 * @param {ChitUI} el
 * @param {string} name
 * @returns {HTMLElement}
 */
function part(el, name) {
  const found = el.shadowRoot?.querySelector(`[part~="${name}"]`);
  if (!found) throw new Error(`no [part~="${name}"]`);
  return /** @type {HTMLElement} */ (found);
}

/**
 * Drag a handle the way a pointer would: press, move in steps, let go.
 *
 * @param {HTMLElement} handle
 * @param {number} dx
 * @param {number} dy
 */
function drag(handle, dx, dy) {
  const box = handle.getBoundingClientRect();
  const from = { x: box.left + 10, y: box.top + 10 };
  /**
   * @param {string} type
   * @param {number} x
   * @param {number} y
   */
  const send = (type, x, y) =>
    handle.dispatchEvent(
      new PointerEvent(type, {
        pointerId: 1,
        button: 0,
        buttons: type === 'pointerup' ? 0 : 1,
        clientX: x,
        clientY: y,
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );

  send('pointerdown', from.x, from.y);
  send('pointermove', from.x + dx / 2, from.y + dy / 2);
  send('pointermove', from.x + dx, from.y + dy);
  send('pointerup', from.x + dx, from.y + dy);
}

/**
 * @param {HTMLElement} handle
 * @param {string} key
 * @param {boolean} [shift]
 */
function press(handle, key, shift = false) {
  handle.dispatchEvent(
    new KeyboardEvent('keydown', { key, shiftKey: shift, bubbles: true, composed: true }),
  );
}

describe('dragging the launcher', () => {
  it('stays put until the theme allows it', async () => {
    const el = await widget();
    const launcher = part(el, 'launcher');
    expect(launcher.hasAttribute('data-draggable')).to.be.false;

    const before = launcher.getBoundingClientRect().left;
    drag(launcher, -120, -80);
    expect(launcher.getBoundingClientRect().left).to.equal(before);
  });

  it('moves with the pointer and reports where it landed', async () => {
    const el = await widget({ closed: { draggable: true, offset: { x: 24, y: 24 } } });
    const launcher = part(el, 'launcher');
    expect(launcher.hasAttribute('data-draggable')).to.be.true;
    expect(getComputedStyle(launcher).touchAction).to.equal('none');

    /** @type {CustomEvent[]} */
    const moves = [];
    el.addEventListener('chat-move', (event) => moves.push(/** @type {CustomEvent} */ (event)));

    const before = launcher.getBoundingClientRect();
    drag(launcher, -100, -60);
    const after = launcher.getBoundingClientRect();

    expect(Math.round(before.left - after.left)).to.equal(100);
    expect(Math.round(before.top - after.top)).to.equal(60);

    expect(moves).to.have.length(1);
    expect(moves[0].detail.target).to.equal('launcher');
    expect(moves[0].detail.position).to.equal('bottom-right');
    // Measured from the corner the theme chose: away from the right edge.
    expect(moves[0].detail.offset).to.deep.equal({ x: 124, y: 84 });
    // The same move in screen terms, which is what both shapes share.
    expect(moves[0].detail.displacement).to.deep.equal({ x: -100, y: -60 });
  });

  it('opens on a click, and not on the click that ends a drag', async () => {
    const el = await widget({ closed: { draggable: true } });
    const launcher = part(el, 'launcher');

    // A press that barely moves is a click, not a drag.
    drag(launcher, 2, 1);
    launcher.click();
    await el.updateComplete;
    expect(el.state).to.equal('open');

    await el.close();
    drag(launcher, -80, -40);
    launcher.click();
    await el.updateComplete;
    expect(el.state).to.equal('closed');

    // …and the next plain click works again.
    launcher.click();
    await el.updateComplete;
    expect(el.state).to.equal('open');
  });

  it('moves with the arrow keys, further with Shift', async () => {
    const el = await widget({ closed: { draggable: true, offset: { x: 24, y: 24 } } });
    const launcher = part(el, 'launcher');
    const start = launcher.getBoundingClientRect().left;

    press(launcher, 'ArrowLeft');
    expect(Math.round(start - launcher.getBoundingClientRect().left)).to.equal(8);

    press(launcher, 'ArrowLeft', true);
    expect(Math.round(start - launcher.getBoundingClientRect().left)).to.equal(40);

    press(launcher, 'ArrowRight');
    expect(Math.round(start - launcher.getBoundingClientRect().left)).to.equal(32);
  });

  it('cannot be pushed off the screen', async () => {
    const el = await widget({ closed: { draggable: true } });
    const launcher = part(el, 'launcher');

    drag(launcher, -5000, -5000);
    const box = launcher.getBoundingClientRect();
    expect(Math.round(box.left)).to.equal(8);
    expect(Math.round(box.top)).to.equal(8);
  });

  it('goes back to the theme on resetPosition()', async () => {
    const el = await widget({ closed: { draggable: true } });
    const launcher = part(el, 'launcher');
    const before = launcher.getBoundingClientRect().left;

    drag(launcher, -120, 0);
    expect(launcher.getBoundingClientRect().left).to.not.equal(before);

    el.resetPosition();
    await el.updateComplete;
    expect(launcher.getBoundingClientRect().left).to.equal(before);
  });
});

describe('dragging the panel', () => {
  /**
   * @param {Theme} [theme]
   * @returns {Promise<ChitUI>}
   */
  async function opened(theme) {
    const el = await widget(theme);
    await el.open();
    await el.updateComplete;
    return el;
  }

  it('offers no handle until the theme allows it', async () => {
    const el = await opened();
    const header = part(el, 'header');
    expect(header.hasAttribute('data-draggable')).to.be.false;
    expect(header.hasAttribute('tabindex')).to.be.false;
  });

  it('is grabbed by the title bar, which says so', async () => {
    // Small enough that there is room above it in any test window.
    const el = await opened({ open: { draggable: true, width: 260, height: 240 } });
    const header = part(el, 'header');
    expect(header.getAttribute('tabindex')).to.equal('0');
    expect(header.getAttribute('aria-label')).to.equal(el.currentLabels.move);

    const before = part(el, 'panel').getBoundingClientRect();
    drag(header, -140, -60);
    const after = part(el, 'panel').getBoundingClientRect();

    expect(Math.round(before.left - after.left)).to.equal(140);
    expect(Math.round(before.top - after.top)).to.equal(60);
    // Moving it must not squeeze it.
    expect(Math.round(after.width)).to.equal(Math.round(before.width));
    expect(Math.round(after.height)).to.equal(Math.round(before.height));
  });

  it('leaves the buttons in the bar alone', async () => {
    const el = await opened({ open: { draggable: true, header: { home: true } } });
    const panel = part(el, 'panel');
    const before = panel.getBoundingClientRect().left;

    // A press that starts on a button is that button's, not the bar's.
    drag(part(el, 'close-button'), -120, 0);
    expect(panel.getBoundingClientRect().left).to.equal(before);

    drag(part(el, 'home-button'), -120, 0);
    expect(panel.getBoundingClientRect().left).to.equal(before);
  });

  it('stays where it is on a phone, where it fills the screen', async () => {
    const el = await opened({ breakpoint: 10000, open: { draggable: true } });
    expect(el.device).to.equal('mobile');

    const header = part(el, 'header');
    expect(header.hasAttribute('data-draggable')).to.be.false;

    const before = part(el, 'panel').getBoundingClientRect().left;
    drag(header, -120, -60);
    expect(part(el, 'panel').getBoundingClientRect().left).to.equal(before);
  });
});

describe('the two states travel together', () => {
  /**
   * How far a thing sits from the bottom-right corner of the window.
   *
   * @param {HTMLElement} element
   * @returns {{ x: number, y: number }}
   */
  function fromCorner(element) {
    const box = element.getBoundingClientRect();
    return {
      x: Math.round(window.innerWidth - box.right),
      y: Math.round(window.innerHeight - box.bottom),
    };
  }

  it('opens the panel where the launcher was left', async () => {
    const el = await widget({
      closed: { draggable: true },
      open: { width: 260, height: 240 },
    });

    await el.open();
    await el.updateComplete;
    const panelAtRest = fromCorner(part(el, 'panel'));
    await el.close();
    await el.updateComplete;

    drag(part(el, 'launcher'), -120, -80);
    await el.open();
    await el.updateComplete;

    const panelNow = fromCorner(part(el, 'panel'));
    expect(panelNow.x - panelAtRest.x).to.equal(120);
    expect(panelNow.y - panelAtRest.y).to.equal(80);
  });

  it('closes to where the panel was left', async () => {
    const el = await widget({
      open: { draggable: true, width: 260, height: 240 },
    });

    const launcherAtRest = fromCorner(part(el, 'launcher'));
    await el.open();
    await el.updateComplete;

    drag(part(el, 'header'), -90, -50);
    await el.close();
    await el.updateComplete;

    const launcherNow = fromCorner(part(el, 'launcher'));
    expect(launcherNow.x - launcherAtRest.x).to.equal(90);
    expect(launcherNow.y - launcherAtRest.y).to.equal(50);
  });

  it('keeps the panel its own size wherever it is put', async () => {
    const el = await widget({
      closed: { draggable: true },
      open: { draggable: true, width: 260, height: 240 },
    });

    await el.open();
    await el.updateComplete;
    const atRest = part(el, 'panel').getBoundingClientRect();
    await el.close();
    await el.updateComplete;

    // Shove the launcher to the top-left corner and open there. The panel's
    // own max-height counts from its corner to the far edge, so a position
    // that leaves no room above it used to squeeze it flat instead.
    drag(part(el, 'launcher'), -5000, -5000);
    await el.open();
    await el.updateComplete;

    const moved = part(el, 'panel').getBoundingClientRect();
    expect(Math.round(moved.height)).to.equal(Math.round(atRest.height));
    expect(Math.round(moved.width)).to.equal(Math.round(atRest.width));
    // And it is still whole, inside the window.
    expect(Math.round(moved.top)).to.equal(8);
    expect(Math.round(moved.left)).to.equal(8);
  });

  it('is one displacement, readable and writable', async () => {
    const el = await widget({ closed: { draggable: true } });
    expect(el.dragOffset).to.equal(null);

    drag(part(el, 'launcher'), -60, -40);
    expect(el.dragOffset).to.deep.equal({ x: -60, y: -40 });

    const atRest = fromCorner(part(el, 'launcher'));
    el.resetPosition();
    await el.updateComplete;
    expect(el.dragOffset).to.equal(null);
    expect(fromCorner(part(el, 'launcher')).x).to.equal(atRest.x - 60);

    // Putting a saved displacement back is all a restore takes.
    el.dragOffset = { x: -60, y: -40 };
    await el.updateComplete;
    expect(fromCorner(part(el, 'launcher'))).to.deep.equal(atRest);
  });
});
