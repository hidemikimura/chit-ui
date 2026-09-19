// @ts-check

/**
 * Themes the library ships with.
 *
 * A preset is an ordinary `Theme` object, so it is assigned like any other
 * theme and customised by spreading over it:
 *
 *     import { greenTheme } from '@hidemikimura/chit-ui/themes.js';
 *     el.theme = { ...greenTheme, open: { ...greenTheme.open, width: 420 } };
 *
 * Importing this module does not register the element or pull the widget in;
 * it is data only.
 */
export { greenTheme } from './green.js';
