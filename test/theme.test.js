// @ts-check
import { expect, fixture, html } from '@open-wc/testing';
import '../src/index.js';
import { resolveTheme } from '../src/theme/merge-theme.js';
import { themeToVariables } from '../src/theme/theme-to-css.js';
import { defaultTheme } from '../src/theme/default-theme.js';
import { greenTheme } from '../src/themes/index.js';

/** @import { ChitUI } from '../src/chit-ui.js' */

/**
 * Relative luminance of a #rrggbb colour, per WCAG 2.
 *
 * @param {string} hex
 * @returns {number}
 */
function luminance(hex) {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * @param {ChitUI} el
 * @param {string} name
 * @returns {string}
 */
function cssVar(el, name) {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

describe('theme merge', () => {
  it('fills every gap from the default theme', () => {
    const theme = resolveTheme(undefined, 'pc');
    expect(theme.closed.size).to.equal(60);
    expect(theme.open.width).to.equal(380);
    expect(theme.open.colors.accent).to.be.a('string');
    expect(theme.device).to.equal('pc');
  });

  it('merges deeply rather than replacing whole branches', () => {
    const theme = resolveTheme({ open: { colors: { accent: '#ff0000' } } }, 'pc');
    expect(theme.open.colors.accent).to.equal('#ff0000');
    expect(theme.open.colors.background).to.equal(defaultTheme.open.colors.background);
  });

  it('applies one closed setting to both devices when they are not split', () => {
    expect(resolveTheme({ closed: { size: 70 } }, 'pc').closed.size).to.equal(70);
    expect(resolveTheme({ closed: { size: 70 } }, 'mobile').closed.size).to.equal(70);
  });

  it('carries a pc-only closed theme to mobile but keeps phone measurements', () => {
    const theme = { closed: { pc: { image: '/icon.png', size: 80 } } };
    expect(resolveTheme(theme, 'pc').closed.size).to.equal(80);

    const mobile = resolveTheme(theme, 'mobile').closed;
    expect(mobile.image).to.equal('/icon.png');
    expect(mobile.size).to.equal(defaultTheme.closed.mobile.size);
    expect(mobile.offset).to.deep.equal(defaultTheme.closed.mobile.offset);
  });

  it('honours an explicit mobile block', () => {
    const theme = { closed: { pc: { size: 80 }, mobile: { size: 40 } } };
    expect(resolveTheme(theme, 'mobile').closed.size).to.equal(40);
  });

  it('treats null as "clear the default" and undefined as "say nothing"', () => {
    expect(resolveTheme({ closed: { image: null } }, 'pc').closed.image).to.equal(null);
    expect(resolveTheme({ closed: { size: undefined } }, 'pc').closed.size).to.equal(60);
  });
});

describe('theme to CSS', () => {
  it('turns numbers into px and images into url()', () => {
    const vars = themeToVariables(resolveTheme({ closed: { size: 48, image: '/i.png' } }, 'pc'));
    expect(vars['--chit-launcher-size']).to.equal('48px');
    expect(vars['--chit-launcher-image']).to.equal('url("/i.png")');
    // Durations are not custom properties: the transition code owns them.
    expect(Object.keys(vars).some((name) => name.includes('anim-duration'))).to.be.false;
  });

  it('emits none for a missing image', () => {
    const vars = themeToVariables(resolveTheme(undefined, 'pc'));
    expect(vars['--chit-launcher-image']).to.equal('none');
  });

  it('escapes quotes in an image URL', () => {
    const vars = themeToVariables(resolveTheme({ closed: { image: 'a"b.png' } }, 'pc'));
    expect(vars['--chit-launcher-image']).to.equal('url("a\\"b.png")');
  });
});

describe('theme on the element', () => {
  it('publishes the defaults as custom properties', async () => {
    const el = /** @type {ChitUI} */ (await fixture(html`<chit-ui></chit-ui>`));
    expect(cssVar(el, '--chit-launcher-size')).to.equal('60px');
    expect(cssVar(el, '--chit-color-accent')).to.equal(defaultTheme.open.colors.accent);
  });

  it('updates the custom properties when the theme changes', async () => {
    const el = /** @type {ChitUI} */ (await fixture(html`<chit-ui></chit-ui>`));
    el.theme = { open: { colors: { accent: '#00aa00' } }, closed: { size: 44 } };
    await el.updateComplete;

    expect(cssVar(el, '--chit-color-accent')).to.equal('#00aa00');
    expect(cssVar(el, '--chit-launcher-size')).to.equal('44px');
  });

  it('lets page CSS win over the theme', async () => {
    const style = document.createElement('style');
    style.textContent = 'chit-ui.themed { --chit-color-accent: rgb(1, 2, 3); }';
    document.head.append(style);

    const el = /** @type {ChitUI} */ (await fixture(html`<chit-ui class="themed"></chit-ui>`));
    el.theme = { open: { colors: { accent: '#00aa00' } } };
    await el.updateComplete;

    expect(cssVar(el, '--chit-color-accent')).to.equal('rgb(1, 2, 3)');
    style.remove();
  });

  it('exposes placement and idle motion as attributes', async () => {
    const el = /** @type {ChitUI} */ (await fixture(html`<chit-ui></chit-ui>`));
    el.theme = {
      closed: { position: 'top-left', animation: { idle: 'pulse' } },
      open: { position: 'bottom-left' },
    };
    await el.updateComplete;

    expect(el.dataset.launcherPosition).to.equal('top-left');
    expect(el.dataset.panelPosition).to.equal('bottom-left');
    expect(el.dataset.idle).to.equal('pulse');
  });

  it('places the launcher per the theme position', async () => {
    const el = /** @type {ChitUI} */ (await fixture(html`<chit-ui></chit-ui>`));
    el.theme = { closed: { position: 'top-left', offset: { x: 10, y: 12 } } };
    await el.updateComplete;

    const launcher = /** @type {HTMLElement} */ (el.shadowRoot?.querySelector('[part~="launcher"]'));
    const box = launcher.getBoundingClientRect();
    expect(Math.round(box.left)).to.equal(10);
    expect(Math.round(box.top)).to.equal(12);
  });

  it('uses the theme image as the launcher background', async () => {
    const el = /** @type {ChitUI} */ (await fixture(html`<chit-ui></chit-ui>`));
    el.theme = { closed: { image: '/icon.png' } };
    await el.updateComplete;

    const launcher = /** @type {HTMLElement} */ (el.shadowRoot?.querySelector('[part~="launcher"]'));
    expect(launcher.hasAttribute('data-has-image')).to.be.true;
    expect(getComputedStyle(launcher).backgroundImage).to.contain('/icon.png');
  });
});

describe('shipped palettes', () => {
  /**
   * Every theme the library ships has to clear WCAG AA on the pairs a reader
   * actually has to read. A preset is a resolved theme here, so a preset that
   * leaves a colour out is checked on the default it inherits.
   *
   * @type {[string, import('../src/types.js').Theme | undefined][]}
   */
  const themes = [
    ['default', undefined],
    ['green', greenTheme],
  ];

  for (const [themeName, theme] of themes) {
    const resolved = resolveTheme(theme, 'pc');
    const { colors } = resolved.open;
    /** @type {[string, string, string][]} */
    const pairs = [
      ['body text', colors.text, colors.background],
      ['header text', colors.headerText, colors.headerBackground],
      ['own message', colors.userText, colors.userBubble],
      ['their message', colors.assistantText, colors.assistantBubble],
      ['system line', colors.systemText, colors.background],
      ['input text', colors.inputText, colors.inputBackground],
      ['placeholder', colors.inputPlaceholder, colors.inputBackground],
      ['launcher', resolved.closed.colors.text, resolved.closed.colors.background],
      ['accent on page', colors.accent, colors.background],
      ['send icon', '#ffffff', colors.accent],
    ];

    for (const [name, foreground, background] of pairs) {
      it(`clears WCAG AA for ${name} (${themeName})`, () => {
        expect(contrast(foreground, background)).to.be.at.least(4.5);
      });
    }
  }
});
