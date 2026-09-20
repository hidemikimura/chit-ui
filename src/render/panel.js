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
  const title = open.header.title ?? labels.panel;

  return html`
    <section
      part="panel"
      role="dialog"
      aria-modal="false"
      aria-label=${title}
      tabindex="-1"
      @keydown=${(/** @type {KeyboardEvent} */ event) => onKeydown(host, event)}
    >
      ${open.header.visible ? renderHeader(host, title) : nothing}

      ${renderMessageList(host)} ${renderComposer(host)}

      <slot name="footer"></slot>
    </section>
  `;
}

/**
 * The title bar.
 *
 * It can be left out entirely (`open.header.visible = false`), which is what a
 * widget embedded in a host that already draws its own title bar wants — LINE
 * LIFF, for one — rather than two stacked titles. The dialog keeps its
 * accessible name either way: that name is read, not seen.
 *
 * Note that hiding it takes the close button with it. Esc and the launcher
 * still close the panel, and the host's own chrome usually supplies the rest.
 *
 * @param {ChitUI} host
 * @param {string} title
 * @returns {import('lit').TemplateResult}
 */
function renderHeader(host, title) {
  const open = host.currentTheme.open;
  const labels = host.currentLabels;
  const draggable = open.draggable && host.device === 'pc';

  return html`
      <header
        part="header"
        ?data-draggable=${draggable}
        tabindex=${draggable ? '0' : nothing}
        aria-label=${draggable ? labels.move : nothing}
        @pointerdown=${(/** @type {PointerEvent} */ event) => {
          // Only the bar itself is a handle: a drag that starts on the close
          // button would swallow the click that closes the panel.
          if (/** @type {HTMLElement} */ (event.target).closest('button')) return;
          host.panelDrag.start(event);
        }}
        @keydown=${(/** @type {KeyboardEvent} */ event) => {
          if (event.target !== event.currentTarget) return;
          host.panelDrag.nudge(event);
        }}
      >
        <slot name="header">
          <slot name="header-title">
            <span part="header-title">
              ${open.header.logo
                ? html`<img part="header-logo" src=${open.header.logo} alt="" />`
                : nothing}
              <span part="header-heading">${title}</span>
            </span>
          </slot>
          <span part="header-actions">
            <slot name="header-actions"></slot>
            ${open.header.home
              ? html`<button
                  part="home-button"
                  type="button"
                  aria-label=${labels.home}
                  title=${labels.home}
                  @click=${() => host.home('user')}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linejoin="round"
                      stroke-linecap="round"
                      d="M4 11.2 12 4l8 7.2M6.5 9.8V19h11V9.8M10 19v-4.6h4V19"
                    />
                  </svg>
                </button>`
              : nothing}
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
