// @ts-check
import { html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';

/** @import { ChitUI } from '../chit-ui.js' */

/**
 * The attach button and the file input it opens.
 *
 * The widget owns the picking and nothing else: it hands the chosen files to
 * the consumer through `chat-attach` and forgets them. Uploading them, showing
 * a preview and adding a message are all things only the consumer can do, and
 * a half-done version here would be in the way of the real one.
 *
 * The input is reset after every pick so that choosing the same file twice in
 * a row still reports the second time.
 *
 * @param {ChitUI} host
 * @param {boolean} disabled
 * @returns {import('lit').TemplateResult}
 */
function renderAttach(host, disabled) {
  const labels = host.currentLabels;
  const input = host.currentTheme.open.input;

  return html`
    <button
      part="attach-button"
      type="button"
      aria-label=${labels.attach}
      title=${labels.attach}
      ?disabled=${disabled}
      @click=${() => host.openAttach()}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M20 11.5 12.2 19.3a4.6 4.6 0 0 1-6.5-6.5l7.8-7.8a3 3 0 0 1 4.3 4.3l-7.8 7.8a1.5 1.5 0 0 1-2.1-2.1l7.1-7.1"
        />
      </svg>
    </button>
    <input
      part="attach-input"
      type="file"
      tabindex="-1"
      aria-hidden="true"
      accept=${input.accept}
      ?multiple=${input.multiple}
      @change=${(/** @type {Event} */ event) => {
        const field = /** @type {HTMLInputElement} */ (event.target);
        const files = Array.from(field.files ?? []);
        field.value = '';
        if (files.length) host.handleAttach(files);
      }}
    />
  `;
}

/**
 * The composer: a textarea that grows with its content, and a send button.
 *
 * The whole thing can be replaced through the `composer` slot; a consumer who
 * does that calls `host.submit(text)` themselves. `input-before` and
 * `input-after` are the lighter option, for an attach or emoji button beside
 * the box the library still owns.
 *
 * @param {ChitUI} host
 * @returns {import('lit').TemplateResult | typeof nothing}
 */
export function renderComposer(host) {
  if (host.inputHidden) return nothing;

  const labels = host.currentLabels;
  const theme = host.currentTheme.open;
  const disabled = host.busy || host.inputDisabled;
  const placeholder = host.placeholder ?? theme.input.placeholder ?? labels.input;

  return html`
    <form
      part="composer"
      @submit=${(/** @type {SubmitEvent} */ event) => {
        event.preventDefault();
        host.submit();
      }}
    >
      <slot name="composer">
        ${theme.input.attach ? renderAttach(host, disabled) : nothing}

        <slot name="input-before"></slot>

        <textarea
          part="input"
          rows="1"
          .value=${live(host.value)}
          placeholder=${placeholder}
          aria-label=${labels.input}
          ?disabled=${disabled}
          aria-describedby=${host.maxLength === undefined ? nothing : 'chit-counter'}
          @input=${(/** @type {Event} */ event) => host.handleInput(event)}
          @keydown=${(/** @type {KeyboardEvent} */ event) => host.handleKeydown(event)}
          @compositionstart=${() => host.handleComposition(true)}
          @compositionend=${() => host.handleComposition(false)}
        ></textarea>

        <slot name="input-after"></slot>

        ${host.maxLength === undefined
          ? nothing
          : html`<span part="counter" id="chit-counter" aria-live="polite" hidden></span>`}

        <button
          part="send-button"
          type="submit"
          aria-label=${labels.send}
          ?disabled=${!host.canSend}
        >
          ${host.busy
            ? html`<span part="spinner" aria-hidden="true"></span>`
            : html`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path fill="currentColor" d="M3.4 20.4 21 12 3.4 3.6 3.39 10.2 15.6 12 3.39 13.8z" />
              </svg>`}
        </button>
      </slot>
    </form>
  `;
}
