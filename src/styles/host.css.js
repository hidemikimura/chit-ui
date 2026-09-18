// @ts-check
import { css } from 'lit';

/**
 * Host-level concerns: the coordinate space the widget lives in, the theme
 * fallbacks, and the transition animations.
 *
 * Every custom property here is a fallback only. ThemeController writes the
 * real values into an adopted stylesheet that sits ahead of this one, and page
 * CSS (`chit-ui { --chit-color-accent: ... }`) beats both.
 */
export const hostStyles = css`
  :host {
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
    --chit-color-border: #e4e4e7;
    --chit-color-header-bg: #ffffff;
    --chit-color-header-text: #1f1f1f;

    position: fixed;
    inset: 0;
    z-index: var(--chit-z-index);
    /* The host is only a coordinate space; clicks land on the page behind it. */
    pointer-events: none;
    font-family: var(--chit-font-family);
    font-size: var(--chit-font-size);
    color: var(--chit-color-text);
    -webkit-font-smoothing: antialiased;
  }

  /*
   * Keyed off what the DOM is showing, not off the state property: that flips
   * to 'hidden' the moment it is assigned, while the exit animation still has
   * to play.
   */
  :host([data-rendered-state='hidden']) {
    display: none;
  }

  :host > *,
  [part] {
    pointer-events: auto;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  /* --- transitions ------------------------------------------------------ */

  [data-anim] {
    animation-duration: var(--_chit-anim-duration, 200ms);
    animation-fill-mode: both;
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  [data-anim='enter'][data-effect='fade'] {
    animation-name: chit-fade-in;
  }
  [data-anim='exit'][data-effect='fade'] {
    animation-name: chit-fade-out;
  }
  [data-anim='enter'][data-effect='scale'] {
    animation-name: chit-scale-in;
  }
  [data-anim='exit'][data-effect='scale'] {
    animation-name: chit-scale-out;
  }
  [data-anim='enter'][data-effect='slide'] {
    animation-name: chit-slide-in;
  }
  [data-anim='exit'][data-effect='slide'] {
    animation-name: chit-slide-out;
  }

  @keyframes chit-fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes chit-fade-out {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }
  @keyframes chit-scale-in {
    from {
      opacity: 0;
      transform: scale(0.85);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  @keyframes chit-scale-out {
    from {
      opacity: 1;
      transform: none;
    }
    to {
      opacity: 0;
      transform: scale(0.85);
    }
  }
  @keyframes chit-slide-in {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  @keyframes chit-slide-out {
    from {
      opacity: 1;
      transform: none;
    }
    to {
      opacity: 0;
      transform: translateY(16px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    [data-anim] {
      animation: none !important;
    }
  }
`;
