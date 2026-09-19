// @ts-check

/** @import { ResolvedTheme } from '../types.js' */

/**
 * @param {number} value
 * @returns {string}
 */
const px = (value) => `${value}px`;

/**
 * A CSS `url()` for an image, or `none`. Quotes and backslashes are escaped so
 * a filename with an apostrophe cannot break out of the declaration.
 *
 * @param {string | null | undefined} value
 * @returns {string}
 */
function url(value) {
  if (!value) return 'none';
  return `url("${value.replace(/[\\"]/g, '\\$&')}")`;
}

/**
 * Turn a resolved theme into the custom properties the stylesheets read.
 *
 * Only values CSS can act on are here. Positions, animation effects, text and
 * images that belong in markup are applied as attributes or drawn by the
 * render functions instead.
 *
 * Animation durations are deliberately absent: the transition code has to know
 * when an animation ends, so the theme is the single source of truth for them
 * and it writes the duration onto the element as it starts. A custom property
 * here would look like a knob that does nothing.
 *
 * @param {ResolvedTheme} theme
 * @returns {Record<string, string>}
 */
export function themeToVariables(theme) {
  const { closed, open } = theme;
  const c = open.colors;

  return {
    '--chit-z-index': String(theme.zIndex),
    '--chit-font-family': theme.font.family,
    '--chit-font-size': px(theme.font.size),

    '--chit-launcher-size': closed.size === 'auto' ? 'auto' : px(closed.size),
    '--chit-launcher-offset-x': px(closed.offset.x),
    '--chit-launcher-offset-y': px(closed.offset.y),
    '--chit-launcher-radius': px(closed.radius),
    '--chit-launcher-image': url(closed.image),
    '--chit-launcher-bg': closed.colors.background,
    '--chit-launcher-text': closed.colors.text,
    '--chit-launcher-shadow': closed.colors.shadow,

    '--chit-panel-width': px(open.width),
    '--chit-panel-height': px(open.height),
    '--chit-panel-offset-x': px(open.offset.x),
    '--chit-panel-offset-y': px(open.offset.y),
    '--chit-panel-radius': px(open.radius),
    '--chit-panel-bg-image': url(open.background.image),
    '--chit-panel-shadow': c.shadow,

    '--chit-color-bg': c.background,
    '--chit-color-text': c.text,
    '--chit-color-accent': c.accent,
    '--chit-color-border': c.border,
    '--chit-color-header-bg': c.headerBackground,
    '--chit-color-header-text': c.headerText,
    '--chit-color-user-bg': c.userBubble,
    '--chit-color-user-text': c.userText,
    '--chit-color-assistant-bg': c.assistantBubble,
    '--chit-color-assistant-text': c.assistantText,
    '--chit-color-system-text': c.systemText,
    '--chit-color-input-bg': c.inputBackground,
    '--chit-color-input-text': c.inputText,
    '--chit-color-input-placeholder': c.inputPlaceholder,

    '--chit-bubble-radius': px(open.bubble.radius),

    '--_chit-input-max-rows': String(open.input.maxRows),
    // Internal: the width the speaker's icon takes up, so the typing
    // indicator lines up with the bubbles it belongs to.
    '--_chit-speaker-gutter': open.speaker.assistant.avatar ? '2.5em' : '0px',
  };
}

/**
 * The stylesheet text for a resolved theme.
 *
 * @param {ResolvedTheme} theme
 * @returns {string}
 */
export function themeToCss(theme) {
  const declarations = Object.entries(themeToVariables(theme))
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n');
  return `:host {\n${declarations}\n}\n`;
}
