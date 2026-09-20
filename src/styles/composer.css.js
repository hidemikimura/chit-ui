// @ts-check
import { css } from 'lit';

export const composerStyles = css`
  [part~='composer'] {
    display: flex;
    flex: none;
    align-items: flex-end;
    gap: 0.5em;
    padding: 0.6em 0.75em;
    border-top: 1px solid var(--chit-color-border);
    background: var(--chit-color-input-bg);
  }

  [part~='input'] {
    flex: 1 1 auto;
    min-width: 0;
    /* One row to start with, growing to the theme's limit. */
    field-sizing: content;
    max-height: calc(1.5em * var(--_chit-input-max-rows, 5) + 1em);
    padding: 0.45em 0.6em;
    border: 1px solid var(--chit-color-border);
    border-radius: 12px;
    background: var(--chit-color-input-bg);
    color: var(--chit-color-input-text);
    font: inherit;
    line-height: 1.5;
    resize: none;
    overflow-y: auto;
  }

  /*
   * iOS Safari zooms the page in whenever a field smaller than 16px takes
   * focus, and it does not zoom back out when the field is done with — the
   * reader is left with a widget wider than the screen and no obvious way
   * back. Nothing in the page can undo that zoom short of pinning the
   * viewport's scale, which would also take pinch-zoom away from everyone.
   * So the field is kept at the size that never triggers it, and larger
   * still if the theme's font is larger.
   *
   * Coarse pointers only: on a desktop the same rule would make the field
   * stand out from the rest of the widget for no reason.
   */
  @media (pointer: coarse) {
    [part~='input'] {
      font-size: max(16px, 1em);
    }
  }

  [part~='input']::placeholder {
    color: var(--chit-color-input-placeholder);
  }

  [part~='input']:focus-visible {
    outline: 2px solid var(--chit-color-accent);
    outline-offset: -1px;
  }

  [part~='input']:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  [part~='counter'] {
    align-self: center;
    font-size: 0.75em;
    color: var(--chit-color-system-text);
    font-variant-numeric: tabular-nums;
  }

  [part~='counter'][data-over] {
    color: #d93025;
    font-weight: 600;
  }

  /* Out of sight, but still clickable from the button beside it. */
  [part~='attach-input'] {
    display: none;
  }

  [part~='attach-button'] {
    display: grid;
    flex: none;
    place-items: center;
    width: 2.4em;
    height: 2.4em;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--chit-color-system-text);
    cursor: pointer;
    transition: opacity 120ms ease;
  }

  [part~='attach-button'] svg {
    width: 1.3em;
    height: 1.3em;
  }

  [part~='attach-button']:hover:not(:disabled) {
    background: color-mix(in srgb, currentColor 10%, transparent);
  }

  [part~='attach-button']:focus-visible {
    outline: 2px solid var(--chit-color-accent);
    outline-offset: 2px;
  }

  [part~='attach-button']:disabled {
    opacity: 0.4;
    cursor: default;
  }

  [part~='send-button'] {
    display: grid;
    flex: none;
    place-items: center;
    width: 2.4em;
    height: 2.4em;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: var(--chit-color-accent);
    color: #fff;
    cursor: pointer;
    transition: opacity 120ms ease;
  }

  [part~='send-button'] svg {
    width: 1.1em;
    height: 1.1em;
  }

  [part~='send-button']:disabled {
    opacity: 0.4;
    cursor: default;
  }

  [part~='send-button']:focus-visible {
    outline: 2px solid var(--chit-color-accent);
    outline-offset: 2px;
  }

  [part~='spinner'] {
    width: 1.1em;
    height: 1.1em;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: chit-spin 0.7s linear infinite;
  }

  @keyframes chit-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    [part~='spinner'] {
      animation-duration: 2s;
    }
  }
`;
