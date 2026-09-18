// @ts-check
import { html, nothing } from 'lit';
import { renderMessageList } from './message-list.js';
import { renderComposer } from './composer.js';

/** @import { ChitUI } from '../chit-ui.js' */

/**
 * The open state. Header and footer are slots; the message list and the
 * composer arrive in later milestones and are placeholders for now.
 *
 * @param {ChitUI} host
 * @returns {import('lit').TemplateResult}
 */
export function renderPanel(host) {
  const open = host.currentTheme.open;
  const labels = host.currentLabels;
  const title = open.header?.title ?? labels.panel;

  return html`
    <section
      part="panel"
      role="dialog"
      aria-modal="false"
      aria-label=${title}
      tabindex="-1"
      @keydown=${(/** @type {KeyboardEvent} */ event) => onKeydown(host, event)}
    >
      <header part="header">
        <slot name="header">
          <slot name="header-title">
            ${open.header?.logo
              ? html`<img part="header-logo" src=${open.header.logo} alt="" />`
              : nothing}
            <span part="header-heading">${title}</span>
          </slot>
          <span part="header-actions">
            <slot name="header-actions"></slot>
            <button
              part="close-button"
              type="button"
              aria-label=${labels.close}
              @click=${() => host.closeFromUser()}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  d="M6 6l12 12M18 6L6 18"
                />
              </svg>
            </button>
          </span>
        </slot>
      </header>

      ${renderMessageList(host)} ${renderComposer(host)}

      <slot name="footer"></slot>
    </section>
  `;
}

/**
 * Esc closes the panel. It is handled here rather than on the host so that it
 * only applies while the panel has focus inside it.
 *
 * @param {ChitUI} host
 * @param {KeyboardEvent} event
 */
function onKeydown(host, event) {
  if (event.key !== 'Escape' || event.defaultPrevented) return;
  event.preventDefault();
  host.closeFromUser();
}
