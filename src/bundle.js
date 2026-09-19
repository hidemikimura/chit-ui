// @ts-check
// Entry for the single-file builds: the widget plus the Lit API it was built
// against, so consumers of the bundle define their message components with the
// very same Lit instance.
export * from './index.js';
export * from './themes/index.js';
export { LitElement, html, css, svg, nothing, render } from 'lit';
export { repeat } from 'lit/directives/repeat.js';
export { unsafeHTML } from 'lit/directives/unsafe-html.js';
export { classMap } from 'lit/directives/class-map.js';
export { styleMap } from 'lit/directives/style-map.js';
export { live } from 'lit/directives/live.js';
