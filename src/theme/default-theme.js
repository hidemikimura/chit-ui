// @ts-check

/** @import { ResolvedClosed } from '../types.js' */

/**
 * Neutral light palette. Every text/background pair here clears WCAG AA
 * (4.5:1); `test/theme.test.js` re-checks the ratios so a future tweak cannot
 * quietly drop below it.
 */
const PALETTE = {
  accent: '#2563eb',
  ink: '#1f2328',
  muted: '#5c6370',
  surface: '#ffffff',
  raised: '#f1f3f5',
  line: '#e4e4e7',
  onAccent: '#ffffff',
};

/** @type {ResolvedClosed} */
const CLOSED_PC = {
  size: 60,
  position: 'bottom-right',
  offset: { x: 24, y: 24 },
  radius: 30,
  image: null,
  label: null,
  component: null,
  props: {},
  colors: {
    background: PALETTE.accent,
    text: PALETTE.onAccent,
    shadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
  },
  animation: { enter: 'scale', exit: 'scale', duration: 200, idle: 'none' },
};

/**
 * What a phone gets when the theme does not say. Only the measurements differ:
 * a thumb needs a slightly smaller target closer to the screen edge.
 *
 * @type {Partial<ResolvedClosed>}
 */
const CLOSED_MOBILE_DIFF = {
  size: 56,
  offset: { x: 16, y: 16 },
  radius: 28,
};

/**
 * The library's own theme. A user theme is merged over this, so everything
 * here is what you get when the user says nothing at all.
 *
 * `closed` carries both device buckets; `mergeTheme` narrows it to one.
 */
export const defaultTheme = {
  breakpoint: 768,
  zIndex: 2147483000,
  font: {
    family:
      "system-ui, -apple-system, 'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif",
    size: 14,
  },
  closed: {
    pc: CLOSED_PC,
    mobile: /** @type {ResolvedClosed} */ ({ ...CLOSED_PC, ...CLOSED_MOBILE_DIFF }),
  },
  open: {
    width: 380,
    height: 600,
    position: /** @type {const} */ ('bottom-right'),
    offset: { x: 24, y: 24 },
    radius: 16,
    launcher: /** @type {const} */ ('hidden'),
    header: { title: null, logo: null, avatar: null },
    background: { image: null },
    colors: {
      background: PALETTE.surface,
      text: PALETTE.ink,
      accent: PALETTE.accent,
      border: PALETTE.line,
      shadow: '0 8px 32px rgba(0, 0, 0, 0.24)',
      headerBackground: PALETTE.surface,
      headerText: PALETTE.ink,
      userBubble: PALETTE.accent,
      userText: PALETTE.onAccent,
      assistantBubble: PALETTE.raised,
      assistantText: PALETTE.ink,
      systemText: PALETTE.muted,
      inputBackground: PALETTE.surface,
      inputText: PALETTE.ink,
      inputPlaceholder: PALETTE.muted,
    },
    animation: {
      enter: /** @type {const} */ ('scale'),
      exit: /** @type {const} */ ('fade'),
      duration: 150,
      // How the conversation follows a new message. Growth within a message
      // (a streamed reply, an image loading) is always instant; see
      // ScrollController for why.
      scroll: /** @type {const} */ ('smooth'),
    },
    input: { maxRows: 5, placeholder: null },
  },
  hidden: {
    animation: { exit: /** @type {const} */ ('fade'), duration: 150 },
  },
};

/** The measurements a phone falls back to when only `closed.pc` was given. */
export const mobileClosedDefaults = CLOSED_MOBILE_DIFF;
