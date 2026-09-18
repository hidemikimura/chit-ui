// @ts-check
import { css } from 'lit';

export const messageStyles = css`
  [part~='messages'] {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
  }

  [part~='messages-inner'] {
    display: flex;
    flex-direction: column;
    gap: 0.75em;
    padding: 1em;
  }

  /*
   * The row spans the full width and the bubble is capped inside it. Letting
   * the row shrink to fit instead would make the bubble's percentage cap
   * resolve against a shrink-to-fit parent, and because the content sets
   * overflow-wrap: anywhere its min-content width is one character — so the
   * bubble collapsed to a single column of letters.
   */
  [part~='message'] {
    display: flex;
    align-items: flex-end;
    gap: 0.5em;
    width: 100%;
    max-width: 100%;
  }

  [part~='message'] .body {
    display: flex;
    min-width: 0;
    max-width: 78%;
    flex-direction: column;
    gap: 0.25em;
  }

  /* Reversed row: the bubble sits at the right edge without shrinking the row. */
  [part~='message-user'] {
    flex-direction: row-reverse;
  }

  [part~='message-user'] .body {
    align-items: flex-end;
  }

  [part~='bubble'] {
    position: relative;
    padding: 0.6em 0.85em;
    border-radius: 14px;
    background: var(--chit-color-assistant-bg);
    color: var(--chit-color-assistant-text);
  }

  [part~='message-user'] [part~='bubble'] {
    background: var(--chit-color-user-bg);
    color: var(--chit-color-user-text);
    border-bottom-right-radius: 4px;
  }

  [part~='message-assistant'] [part~='bubble'] {
    border-bottom-left-radius: 4px;
  }

  [part~='avatar'] {
    flex: none;
    width: 2em;
    height: 2em;
    border-radius: 50%;
    object-fit: cover;
  }

  [part~='name'] {
    font-size: 0.8em;
    color: var(--chit-color-system-text);
  }

  [part~='meta'] {
    display: flex;
    gap: 0.5em;
    font-size: 0.75em;
    color: var(--chit-color-system-text);
  }

  [part~='status'][data-status='error'] {
    color: #d93025;
  }

  [part~='message-system'] {
    justify-content: center;
    font-size: 0.8em;
    color: var(--chit-color-system-text);
    text-align: center;
  }

  /* --- streaming and typing --------------------------------------------- */

  [part~='cursor'] {
    display: inline-block;
    width: 0.5em;
    height: 1em;
    margin-inline-start: 0.15em;
    background: currentColor;
    opacity: 0.6;
    vertical-align: text-bottom;
    animation: chit-caret 1s step-end infinite;
  }

  @keyframes chit-caret {
    50% {
      opacity: 0;
    }
  }

  [part~='typing'] {
    align-self: flex-start;
    padding: 0.7em 0.9em;
    border-radius: 14px;
    border-bottom-left-radius: 4px;
    background: var(--chit-color-assistant-bg);
    color: var(--chit-color-assistant-text);
  }

  [part~='typing'] .dots {
    display: inline-flex;
    gap: 0.25em;
  }

  [part~='typing'] .dots i {
    width: 0.4em;
    height: 0.4em;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.4;
    animation: chit-typing 1.2s ease-in-out infinite;
  }

  [part~='typing'] .dots i:nth-child(2) {
    animation-delay: 0.15s;
  }
  [part~='typing'] .dots i:nth-child(3) {
    animation-delay: 0.3s;
  }

  @keyframes chit-typing {
    0%,
    60%,
    100% {
      opacity: 0.35;
      transform: translateY(0);
    }
    30% {
      opacity: 1;
      transform: translateY(-3px);
    }
  }

  /* --- jump to latest ---------------------------------------------------- */

  [part~='to-latest'] {
    position: absolute;
    left: 50%;
    bottom: 5.5em;
    transform: translateX(-50%);
    padding: 0.35em 0.9em;
    border: 1px solid var(--chit-color-border);
    border-radius: 999px;
    background: var(--chit-color-bg);
    color: var(--chit-color-text);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.16);
    font: inherit;
    font-size: 0.8em;
    cursor: pointer;
  }

  [part~='to-latest']:focus-visible {
    outline: 2px solid var(--chit-color-accent);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    [part~='cursor'],
    [part~='typing'] .dots i {
      animation: none;
    }
  }
`;
