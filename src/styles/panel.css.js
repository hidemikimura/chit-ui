// @ts-check
import { css } from 'lit';

export const panelStyles = css`
  [part~='panel'] {
    position: absolute;
    display: flex;
    flex-direction: column;
    width: var(--chit-panel-width);
    height: var(--chit-panel-height);
    max-width: calc(100vw - var(--chit-panel-offset-x) * 2);
    max-height: calc(100vh - var(--chit-panel-offset-y) * 2);
    overflow: hidden;
    border-radius: var(--chit-panel-radius);
    background-color: var(--chit-color-bg);
    background-image: var(--chit-panel-bg-image);
    background-size: cover;
    background-position: center;
    box-shadow: var(--chit-panel-shadow);
  }

  /* --- placement -------------------------------------------------------- */

  :host([data-panel-position='bottom-right']) [part~='panel'] {
    right: var(--chit-panel-offset-x);
    bottom: var(--chit-panel-offset-y);
    transform-origin: bottom right;
  }
  :host([data-panel-position='bottom-left']) [part~='panel'] {
    left: var(--chit-panel-offset-x);
    bottom: var(--chit-panel-offset-y);
    transform-origin: bottom left;
  }
  :host([data-panel-position='top-right']) [part~='panel'] {
    right: var(--chit-panel-offset-x);
    top: var(--chit-panel-offset-y);
    transform-origin: top right;
  }
  :host([data-panel-position='top-left']) [part~='panel'] {
    left: var(--chit-panel-offset-x);
    top: var(--chit-panel-offset-y);
    transform-origin: top left;
  }

  [part~='panel']:focus {
    outline: none;
  }

  /*
   * A phone gets the whole screen. dvh rather than vh so the browser chrome
   * collapsing does not leave a gap, and the safe-area insets keep the header
   * clear of the notch.
   */
  :host([data-device='mobile']) [part~='panel'],
  :host([data-device='mobile'][data-panel-position]) [part~='panel'] {
    inset: 0;
    width: 100vw;
    height: 100dvh;
    max-width: none;
    max-height: none;
    border-radius: 0;
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
    overscroll-behavior: contain;
  }

  [part~='header'] {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: space-between;
    gap: 0.5em;
    padding: 0.875em 1em;
    border-bottom: 1px solid var(--chit-color-border);
    background: var(--chit-color-header-bg);
    color: var(--chit-color-header-text);
  }

  [part~='header-heading'] {
    font-size: 1.05em;
    font-weight: 600;
  }

  [part~='header-logo'] {
    width: 1.75em;
    height: 1.75em;
    margin-inline-end: 0.5em;
    border-radius: 50%;
    object-fit: cover;
    vertical-align: middle;
  }

  [part~='header-actions'] {
    display: inline-flex;
    align-items: center;
    gap: 0.25em;
  }

  [part~='close-button'] {
    display: grid;
    place-items: center;
    width: 2em;
    height: 2em;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }

  [part~='close-button']:hover {
    background: color-mix(in srgb, currentColor 10%, transparent);
  }

  [part~='close-button']:focus-visible {
    outline: 2px solid var(--chit-color-accent);
    outline-offset: 1px;
  }

  [part~='close-button'] svg {
    width: 1.1em;
    height: 1.1em;
  }

`;
