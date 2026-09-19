// @ts-check
import { html, nothing } from 'lit';
import { contentField, renderContent } from './content.js';

/** @import { ChitUI } from '../chit-ui.js' */
/** @import { Message } from '../types.js' */

/**
 * Format a timestamp. The consumer's `formatTime` wins; otherwise a plain
 * locale-aware hour:minute, which is what a chat bubble wants.
 *
 * @param {ChitUI} host
 * @param {string | Date} time
 * @returns {string}
 */
function formatTime(host, time) {
  const date = time instanceof Date ? time : new Date(time);
  if (Number.isNaN(date.getTime())) return '';
  if (host.formatTime) return host.formatTime(date);
  return new Intl.DateTimeFormat(host.resolvedLocale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * One message.
 *
 * `system` messages are a centred line rather than a bubble: they are the
 * widget talking about the conversation ("an operator joined"), not a party to
 * it, so they get no avatar, no name and no timestamp.
 *
 * @param {ChitUI} host
 * @param {Message} message
 * @returns {import('lit').TemplateResult}
 */
export function renderMessage(host, message) {
  if (message.role === 'system') {
    return html`
      <article part="message message-system" data-role="system" data-id=${message.id}>
        <div part="message-content" data-content=${contentField(message)}>${renderContent(host, message)}</div>
      </article>
    `;
  }

  const meta = message.time || message.status;

  // The theme says who is talking; a message overrides either half. `null` on
  // the message hides what the theme set, which is how a run of replies shows
  // the icon only on the first of them.
  const speaker = host.currentTheme.open.speaker[message.role];
  const avatar = message.avatar === undefined ? speaker.avatar : message.avatar;
  const name = message.name === undefined ? speaker.name : message.name;

  return html`
    <article
      part="message message-${message.role}"
      data-role=${message.role}
      data-id=${message.id}
      ?data-streaming=${!!message.streaming}
      aria-busy=${message.streaming ? 'true' : 'false'}
    >
      ${avatar
        ? html`<img part="avatar" src=${avatar} alt="" loading="lazy" />`
        : speaker.avatar
          ? html`<span part="avatar" data-placeholder aria-hidden="true"></span>`
          : nothing}
      <div class="body">
        ${name ? html`<span part="name">${name}</span>` : nothing}
        <div part="bubble">
          <div part="message-content" data-content=${contentField(message)}>${renderContent(host, message)}</div>
          ${message.streaming ? html`<span part="cursor" aria-hidden="true"></span>` : nothing}
        </div>
        ${meta
          ? html`
              <div part="meta" class="meta">
                ${message.time
                  ? html`<time part="time">${formatTime(host, message.time)}</time>`
                  : nothing}
                ${message.status
                  ? html`<span part="status" data-status=${message.status}>
                      ${host.currentLabels.status[message.status]}
                    </span>`
                  : nothing}
              </div>
            `
          : nothing}
      </div>
    </article>
  `;
}
