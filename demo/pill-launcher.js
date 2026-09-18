// A launcher a consumer might supply: a pill with a label and an unread count,
// sized by itself rather than by the theme.
import { LitElement, html, css } from 'lit';

export class PillLauncher extends LitElement {
  static properties = { unread: { type: Number }, online: { type: Boolean } };

  static styles = css`
    :host {
      display: block;
      /* The theme has no say here; this is the launcher's own size. */
      width: 168px;
      height: 52px;
    }
    .pill {
      display: flex;
      align-items: center;
      gap: 0.5em;
      width: 100%;
      height: 100%;
      padding: 0 1em;
      border-radius: 26px;
      background: #111827;
      color: #fff;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.28);
      font: inherit;
      font-size: 14px;
      transition: transform 120ms ease;
    }
    :host(:hover) .pill {
      transform: translateY(-2px);
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #6b7280;
      flex: none;
    }
    .dot[data-online] {
      background: #22c55e;
      box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.25);
    }
    .label { flex: 1; text-align: left; white-space: nowrap; }
    .badge {
      min-width: 1.5em;
      padding: 0.1em 0.4em;
      border-radius: 999px;
      background: #ef4444;
      font-size: 0.8em;
      font-weight: 700;
      text-align: center;
    }
  `;

  constructor() {
    super();
    this.unread = 0;
    this.online = false;
  }

  render() {
    return html`
      <div class="pill">
        <span class="dot" ?data-online=${this.online}></span>
        <span class="label">${this.online ? 'サポートに相談' : 'メッセージを送る'}</span>
        ${this.unread ? html`<span class="badge">${this.unread}</span>` : null}
      </div>
    `;
  }
}

customElements.define('pill-launcher', PillLauncher);
