// @ts-check
import { css } from 'lit';

export const launcherStyles = css`
  [part~='launcher'] {
    position: absolute;
    display: grid;
    place-items: center;
    width: var(--chit-launcher-size);
    height: var(--chit-launcher-size);
    padding: 0;
    border: 0;
    border-radius: var(--chit-launcher-radius);
    background-color: var(--chit-launcher-bg);
    background-position: center;
    background-size: cover;
    background-repeat: no-repeat;
    color: var(--chit-launcher-text);
    box-shadow: var(--chit-launcher-shadow);
    font: inherit;
    line-height: 1;
    cursor: pointer;
    transition: filter 120ms ease;
  }

  /* The image comes from the theme, so it is a background rather than an <img>. */
  [part~='launcher'][data-has-image] {
    background-image: var(--chit-launcher-image);
  }

  /*
   * A consumer component draws the whole launcher, so the button stops being a
   * visual of its own: no box to squeeze the component into, and none of the
   * widget's own paint behind it. It keeps being a button, which is the part
   * that matters for keyboards and screen readers.
   */
  [part~='launcher'][data-custom] {
    width: auto;
    height: auto;
    padding: 0;
    border-radius: 0;
    background: none;
    box-shadow: none;
    color: inherit;
  }

  [part~='launcher'][data-custom]:hover {
    filter: none;
  }

  [part~='launcher']:hover {
    filter: brightness(1.06);
  }

  [part~='launcher']:focus-visible {
    outline: 2px solid var(--chit-launcher-bg);
    outline-offset: 3px;
  }

  [part~='launcher-icon'] {
    width: 55%;
    height: 55%;
  }

  [part~='launcher-label'] {
    padding: 0 0.75em;
    font-size: 0.95em;
    white-space: nowrap;
  }

  /* --- placement -------------------------------------------------------- */

  :host([data-launcher-position='bottom-right']) [part~='launcher'] {
    right: var(--chit-launcher-offset-x);
    bottom: var(--chit-launcher-offset-y);
    transform-origin: bottom right;
  }
  :host([data-launcher-position='bottom-left']) [part~='launcher'] {
    left: var(--chit-launcher-offset-x);
    bottom: var(--chit-launcher-offset-y);
    transform-origin: bottom left;
  }
  :host([data-launcher-position='top-right']) [part~='launcher'] {
    right: var(--chit-launcher-offset-x);
    top: var(--chit-launcher-offset-y);
    transform-origin: top right;
  }
  :host([data-launcher-position='top-left']) [part~='launcher'] {
    left: var(--chit-launcher-offset-x);
    top: var(--chit-launcher-offset-y);
    transform-origin: top left;
  }

  /* --- idle motion ------------------------------------------------------ */

  /*
   * Only while nothing else is animating: a transition sets data-anim and owns
   * the animation property for as long as it runs.
   */
  :host([data-idle='pulse']) [part~='launcher']:not([data-anim]) {
    animation: chit-idle-pulse 2.4s ease-in-out infinite;
  }
  :host([data-idle='bounce']) [part~='launcher']:not([data-anim]) {
    animation: chit-idle-bounce 2.4s ease-in-out infinite;
  }

  @keyframes chit-idle-pulse {
    0%,
    70%,
    100% {
      box-shadow: var(--chit-launcher-shadow);
    }
    35% {
      box-shadow:
        var(--chit-launcher-shadow),
        0 0 0 10px color-mix(in srgb, var(--chit-launcher-bg) 22%, transparent);
    }
  }

  @keyframes chit-idle-bounce {
    0%,
    62%,
    100% {
      transform: translateY(0);
    }
    72% {
      transform: translateY(-6px);
    }
    86% {
      transform: translateY(-2px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :host([data-idle]) [part~='launcher']:not([data-anim]) {
      animation: none;
    }
  }
`;
