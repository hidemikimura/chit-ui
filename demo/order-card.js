// A consumer-side component, of the kind a message can carry.
// It has its own shadow root and its own state, and it reads the widget's
// theme variables so it sits inside the bubble without clashing.
import { LitElement, html, css } from 'lit';

export class OrderCard extends LitElement {
  static properties = { order: { type: Object }, expanded: { state: true } };

  static styles = css`
    :host {
      display: block;
      min-width: 14em;
    }
    .card {
      border: 1px solid var(--chit-color-border, #ddd);
      border-radius: 10px;
      overflow: hidden;
      background: var(--chit-color-bg, #fff);
      color: var(--chit-color-text, #222);
    }
    header {
      display: flex;
      justify-content: space-between;
      gap: 1em;
      white-space: nowrap;
      padding: 0.5em 0.75em;
      background: color-mix(in srgb, var(--chit-color-accent, #2563eb) 12%, transparent);
      font-weight: 600;
    }
    dl {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.2em 0.75em;
      margin: 0;
      padding: 0.6em 0.75em;
      font-size: 0.9em;
    }
    dt { color: var(--chit-color-system-text, #666); }
    dd { margin: 0; text-align: right; }
    button {
      width: 100%;
      padding: 0.5em;
      border: 0;
      border-top: 1px solid var(--chit-color-border, #ddd);
      background: transparent;
      color: var(--chit-color-accent, #2563eb);
      font: inherit;
      cursor: pointer;
    }
  `;

  constructor() {
    super();
    this.order = { id: '', total: 0, items: [] };
    this.expanded = false;
  }

  render() {
    return html`
      <div class="card">
        <header>
          <span>注文 ${this.order.id}</span>
          <span>¥${this.order.total.toLocaleString('ja-JP')}</span>
        </header>
        ${this.expanded
          ? html`<dl>
              ${this.order.items.map(
                (item) => html`<dt>${item.name}</dt>
                  <dd>¥${item.price.toLocaleString('ja-JP')}</dd>`,
              )}
            </dl>`
          : null}
        <button
          @click=${() => {
            this.expanded = !this.expanded;
            this.dispatchEvent(
              new CustomEvent('toggle-details', {
                detail: { id: this.order.id, expanded: this.expanded },
                bubbles: true,
                composed: true,
              }),
            );
          }}
        >
          ${this.expanded ? '明細を隠す' : '明細を見る'}
        </button>
      </div>
    `;
  }
}

customElements.define('order-card', OrderCard);
