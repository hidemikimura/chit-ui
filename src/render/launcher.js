// @ts-check
import { html, nothing } from 'lit';
import { LAUNCHER_KEY, resolveComponent } from './content.js';

/** @import { ChitUI } from '../chit-ui.js' */

/**
 * The closed state: one button.
 *
 * What goes inside it has three routes, in order of how much the consumer
 * takes over:
 *
 * - the theme's image or label, drawn inside the themed circle;
 * - the `launcher` slot, their markup inside that same circle;
 * - `closed.component`, a component that draws the whole launcher — the button
 *   then keeps only its role, and gives up its size, background, shadow and
 *   radius, because two parties styling one box is how things end up clipped.
 *
 * @param {ChitUI} host
 * @returns {import('lit').TemplateResult}
 */
export function renderLauncher(host) {
  const closed = host.currentTheme.closed;
  const labels = host.currentLabels;
  const custom = closed.component
    ? resolveComponent(host, LAUNCHER_KEY, closed.component, closed.props)
    : null;

  return html`
    <button
      part="launcher"
      type="button"
      aria-label=${closed.label || labels.launcher}
      aria-expanded=${host.state === 'open'}
      ?data-has-image=${!custom && !!closed.image}
      ?data-custom=${!!custom}
      ?data-draggable=${closed.draggable}
      @pointerdown=${(/** @type {PointerEvent} */ event) => host.launcherDrag.start(event)}
      @keydown=${(/** @type {KeyboardEvent} */ event) => host.launcherDrag.nudge(event)}
      @click=${() => {
        // The pointer-up that ends a drag is followed by a click; opening the
        // panel then would punish the reader for having moved the button.
        if (host.launcherDrag.consumeDrag()) return;
        host.toggleFromUser();
      }}
    >
      ${custom ?? html`<slot name="launcher">${defaultContent(closed)}</slot>`}
    </button>
  `;
}

/**
 * @param {import('../types.js').ResolvedClosed} closed
 * @returns {unknown}
 */
function defaultContent(closed) {
  if (closed.image) return nothing;
  if (closed.label) return html`<span part="launcher-label">${closed.label}</span>`;
  return defaultIcon();
}

/** A plain speech bubble, so the widget looks like something before theming. */
function defaultIcon() {
  return html`
    <svg part="launcher-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 3c-4.97 0-9 3.36-9 7.5 0 2.3 1.25 4.36 3.2 5.73-.13 1.2-.6 2.3-1.36 3.2a.5.5 0 0 0 .5.82 8.2 8.2 0 0 0 3.87-1.86c.88.26 1.82.41 2.79.41 4.97 0 9-3.36 9-7.5S16.97 3 12 3Z"
      />
    </svg>
  `;
}
