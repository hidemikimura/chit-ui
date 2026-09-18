// @ts-check
import { defaultTheme, mobileClosedDefaults } from './default-theme.js';

/** @import { Theme, ClosedTheme, Device, ResolvedTheme } from '../types.js' */

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Merge `override` onto `base`, recursing into plain objects.
 *
 * `undefined` means "say nothing" and leaves the base value alone; `null` means
 * "clear it", so `{ image: null }` removes a default icon rather than being
 * ignored. There are no arrays anywhere in a theme, so a plain recursive merge
 * is enough.
 *
 * @template {Record<string, any>} T
 * @param {T} base
 * @param {Record<string, any> | undefined} override
 * @returns {T}
 */
export function mergeTheme(base, override) {
  if (!isPlainObject(override)) return base;

  /** @type {Record<string, any>} */
  const out = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    const current = out[key];
    out[key] = isPlainObject(value) && isPlainObject(current) ? mergeTheme(current, value) : value;
  }
  return /** @type {T} */ (out);
}

/**
 * Decide which `closed` settings this device gets.
 *
 * Three shapes are allowed, and this is where they collapse into one:
 * no pc/mobile keys at all (the same settings serve both), both given, or only
 * one given. When only `pc` is given the phone inherits it but keeps the
 * default phone measurements, so a custom icon carries over without a
 * desktop-sized button landing on a phone.
 *
 * @param {ClosedTheme | { pc?: ClosedTheme, mobile?: ClosedTheme } | undefined} closed
 * @param {Device} device
 * @returns {ClosedTheme}
 */
function resolveClosed(closed, device) {
  const perDevice = /** @type {{ pc?: ClosedTheme, mobile?: ClosedTheme }} */ (closed ?? {});
  const split = 'pc' in perDevice || 'mobile' in perDevice;

  if (!split) {
    const shared = /** @type {ClosedTheme} */ (closed ?? {});
    return mergeTheme(defaultTheme.closed[device], shared);
  }

  const pc = mergeTheme(defaultTheme.closed.pc, perDevice.pc);
  if (device === 'pc') return pc;

  if (perDevice.mobile) return mergeTheme(defaultTheme.closed.mobile, perDevice.mobile);
  return mergeTheme(pc, mobileClosedDefaults);
}

/**
 * Fill every gap in a user theme and narrow it to one device.
 *
 * @param {Theme | undefined} theme
 * @param {Device} device
 * @returns {ResolvedTheme}
 */
export function resolveTheme(theme, device) {
  const user = theme ?? {};
  const closed = resolveClosed(user.closed, device);

  return /** @type {ResolvedTheme} */ ({
    breakpoint: user.breakpoint ?? defaultTheme.breakpoint,
    zIndex: user.zIndex ?? defaultTheme.zIndex,
    font: mergeTheme(defaultTheme.font, user.font),
    closed: mergeTheme(defaultTheme.closed[device], closed),
    open: mergeTheme(defaultTheme.open, user.open),
    hidden: mergeTheme(defaultTheme.hidden, user.hidden),
    device,
  });
}

/**
 * The breakpoint a theme asks for, readable before the full resolve (the
 * device is not known until the breakpoint is).
 *
 * @param {Theme | undefined} theme
 * @returns {number}
 */
export function breakpointOf(theme) {
  return theme?.breakpoint ?? defaultTheme.breakpoint;
}
