// @ts-check
import { html, nothing } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { renderMessage } from './message.js';

/** @import { ChitUI } from '../chit-ui.js' */

/**
 * The wait for an answer, at the end of the conversation.
 *
 * It stands where the typing bubble stands and replaces it while it is up:
 * "typing" and "waiting for the server" are the same moment of the
 * conversation, and two indicators for one wait would only ask the reader to
 * work out the difference.
 *
 * @param {ChitUI} host
 * @returns {import('lit').TemplateResult}
 */
function renderLoading(host) {
  const { style, text } = host.currentTheme.open.loading;
  const label = text ?? host.currentLabels.loading;

  return html`
    <div part="loading" data-style=${style} role="status" aria-label=${label}>
      ${style === 'dots'
        ? html`<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>`
        : nothing}
      ${style === 'spinner' ? html`<span part="spinner" aria-hidden="true"></span>` : nothing}
      ${style === 'text' || text
        ? html`<span part="loading-text">${label}</span>`
        : nothing}
    </div>
  `;
}

/**
 * The scrolling conversation.
 *
 * `repeat` keys on the message id so an existing bubble's DOM is reused when
 * the consumer assigns a new array; without it Lit would reorder by position
 * and a component message would lose its state on every insert.
 *
 * Clicks are handled once here and re-published as `chat-message-click`, which
 * is how a consumer reaches a button inside a message without hunting through
 * the shadow root.
 *
 * @param {ChitUI} host
 * @returns {import('lit').TemplateResult}
 */
export function renderMessageList(host) {
  const labels = host.currentLabels;
  const typing = host.typing;
  const empty = host.messages.length === 0 && !typing && !host.loading;

  return html`
    <div
      part="messages"
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
      aria-label=${labels.conversation}
      @click=${(/** @type {MouseEvent} */ event) => host.handleMessageClick(event)}
    >
      <div part="messages-inner" class="inner">
        ${empty ? html`<slot name="empty"></slot>` : nothing}
        ${repeat(
          host.messages,
          (message) => message.id,
          (message) => renderMessage(host, message),
        )}
        ${host.loading
          ? renderLoading(host)
          : typing
            ? html`
                <div part="typing" role="status" aria-label=${labels.typing}>
                  ${typeof typing === 'object' && typing.html
                    ? host.renderTypingHtml(typing.html)
                    : html`<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>`}
                </div>
              `
            : nothing}
      </div>
    </div>

    ${host.hasUnseen
      ? html`
          <button
            part="to-latest"
            type="button"
            @click=${() => host.scrollToBottom({ smooth: true })}
          >
            ${labels.toLatest}
          </button>
        `
      : nothing}
  `;
}
