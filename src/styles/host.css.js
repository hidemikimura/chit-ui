// @ts-check
import { css } from 'lit';

/** Host-level layout: fixed positioning, stacking, and the theme fallbacks. */
export const hostStyles = css`
  :host {
    /* Fallbacks only. ThemeController overrides these in an adopted stylesheet,
       and page CSS (chit-ui { --chit-*: ... }) overrides that in turn. */
    --chit-z-index: 2147483000;
    --chit-font-family: system-ui, -apple-system, 'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif;
    --chit-font-size: 14px;
    --chit-launcher-size: 60px;
    --chit-launcher-offset-x: 24px;
    --chit-launcher-offset-y: 24px;
    --chit-launcher-radius: 30px;
    --chit-launcher-bg: #1a73e8;
    --chit-launcher-text: #ffffff;
    --chit-launcher-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    --chit-panel-width: 380px;
    --chit-panel-height: 600px;
    --chit-panel-offset-x: 24px;
    --chit-panel-offset-y: 24px;
    --chit-panel-radius: 16px;
    --chit-panel-shadow: 0 8px 32px rgba(0, 0, 0, 0.24);
    --chit-color-bg: #ffffff;
    --chit-color-text: #1f1f1f;
    --chit-color-accent: #1a73e8;
    --chit-color-border: #e0e0e0;

    position: fixed;
    inset: 0;
    z-index: var(--chit-z-index);
    /* The host itself is only a coordinate space: clicks pass through to the page. */
    pointer-events: none;
    font-family: var(--chit-font-family);
    font-size: var(--chit-font-size);
    color: var(--chit-color-text);
    -webkit-font-smoothing: antialiased;
  }

  :host([state='hidden']) {
    display: none;
  }

  /* Anything the widget actually draws takes pointer events back. */
  :host > * {
    pointer-events: auto;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
`;
