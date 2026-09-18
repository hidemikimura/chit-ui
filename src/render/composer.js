// @ts-check
import { html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';

/** @import { ChitUI } from '../chit-ui.js' */

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
