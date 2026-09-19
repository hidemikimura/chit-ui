// @ts-check

/** @import { Theme } from '../types.js' */

/**
 * A green messenger look: a pale blue-grey conversation background, white
 * bubbles for them, bright green for you, tails on the top corner.
 *
 * This is Chit UI's own palette in that familiar shape. It carries no other
 * product's logo, wordmark or artwork, and the greens are Chit UI's own: the
 * deep green is dark enough that white text and the send icon clear WCAG AA
 * on it, which the bright green of the bubbles could not do.
 * `test/theme.test.js` re-checks every pair here, so a later tweak cannot
 * quietly drop below AA.
 *
 * @type {Theme}
 */
export const greenTheme = {
  closed: {
    colors: {
      background: '#0a6b36',
      text: '#ffffff',
      shadow: '0 4px 12px rgba(16, 42, 26, 0.32)',
    },
  },
  open: {
    radius: 12,
    colors: {
      background: '#d3ddea',
      text: '#16212c',
      accent: '#0a6b36',
      border: '#b6c5d6',
      shadow: '0 8px 32px rgba(16, 32, 48, 0.28)',
      headerBackground: '#ffffff',
      headerText: '#16212c',
      userBubble: '#9ce26c',
      userText: '#14240c',
      assistantBubble: '#ffffff',
      assistantText: '#16212c',
      systemText: '#37475a',
      inputBackground: '#ffffff',
      inputText: '#16212c',
      inputPlaceholder: '#5c6370',
    },
    bubble: { radius: 18, tail: 'top' },
  },
};
