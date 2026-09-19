// @ts-check
import { css } from 'lit';

export const messageStyles = css`
  :host {
    /* Internal: the box the tail's path is drawn in. The path is written in
       these units, so the two move together. */
    --_chit-tail-w: 18px;
    --_chit-tail-h: 20px;
    /* How deep the tail's root sits inside the bubble. Less than the
       bubble's own padding, so it never reaches the text. */
    --_chit-tail-root: 9px;
    /* Far enough down that the bubble's edge has straightened out under it. */
    --_chit-tail-offset: calc(var(--chit-bubble-radius) / 4 + 1px);
  }

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
    /*
     * The icon sits level with the top of the speaker's block — beside the
     * name when there is one, beside the bubble's first line otherwise. At
     * the bottom it would end up next to the timestamp, away from everything
     * it identifies.
     */
    align-items: flex-start;
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
    border-radius: var(--chit-bubble-radius);
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

  /* --- tails -------------------------------------------------------------
   *
   * A tail is one pseudo-element: a box in the bubble's colour, clipped to a
   * leaf whose point sits outside the bubble and whose root is buried inside
   * it. Burying the root is what makes the join disappear — the bubble's own
   * background covers the seam, so every corner keeps its radius and the two
   * read as one shape at any radius.
   *
   * It hangs a little below the corner, where the bubble's edge has
   * straightened out, so the root has something flat to sit against. The
   * offset follows the radius for that reason.
   *
   * The other side and the downward version are the same path mirrored, so
   * the curve is written once.
   */

  [part~='bubble']::after,
  [part~='typing']::after {
    content: '';
    display: none;
    position: absolute;
    width: var(--_chit-tail-w);
    height: var(--_chit-tail-h);
    clip-path: path('M 18 0.5 Q 8 0.8 0.5 3.5 Q 0 5.2 2 7 Q 10 9.5 18 19 Z');
  }

  /*
   * Everything below needs clip-path: path() to draw the leaf. Where that is
   * missing the tail stays hidden and the bubble keeps its default shape,
   * rather than a bare rectangle poking out of its side.
   */
  @supports (clip-path: path('M 0 0 Z')) {
    :host([data-bubble-tail='top']) [part~='bubble']::after,
    :host([data-bubble-tail='bottom']) [part~='bubble']::after,
    :host([data-bubble-tail='top']) [part~='typing']::after,
    :host([data-bubble-tail='bottom']) [part~='typing']::after {
      display: block;
    }

    /*
     * With a tail there is no need to clip the speaker's corner as well: one
     * bubble carries one cue about who is talking, not two.
     */
    :host([data-bubble-tail='top']) [part~='bubble'],
    :host([data-bubble-tail='bottom']) [part~='bubble'],
    :host([data-bubble-tail='top']) [part~='typing'],
    :host([data-bubble-tail='bottom']) [part~='typing'] {
      border-radius: var(--chit-bubble-radius);
    }

    /* Their side: the leaf points left, its root inside the bubble. */
    :host([data-bubble-tail]) [part~='message-assistant'] [part~='bubble']::after,
    :host([data-bubble-tail]) [part~='typing']::after {
      right: calc(100% - var(--_chit-tail-root));
      background: var(--chit-color-assistant-bg);
    }

    /* Your side: the same leaf, mirrored. */
    :host([data-bubble-tail]) [part~='message-user'] [part~='bubble']::after {
      left: calc(100% - var(--_chit-tail-root));
      background: var(--chit-color-user-bg);
      transform: scaleX(-1);
    }

    :host([data-bubble-tail='top']) [part~='bubble']::after,
    :host([data-bubble-tail='top']) [part~='typing']::after {
      top: var(--_chit-tail-offset);
    }

    :host([data-bubble-tail='bottom']) [part~='bubble']::after,
    :host([data-bubble-tail='bottom']) [part~='typing']::after {
      bottom: var(--_chit-tail-offset);
    }

    :host([data-bubble-tail='bottom']) [part~='message-assistant'] [part~='bubble']::after,
    :host([data-bubble-tail='bottom']) [part~='typing']::after {
      transform: scaleY(-1);
    }

    :host([data-bubble-tail='bottom']) [part~='message-user'] [part~='bubble']::after {
      transform: scale(-1, -1);
    }
  }

  [part~='avatar'] {
    flex: none;
    width: 2em;
    height: 2em;
    border-radius: 50%;
    object-fit: cover;
  }

  /*
   * A message that hides the theme's icon (avatar: null, for the second and
   * later messages in a run) keeps its place in the row, so the bubbles below
   * stay in line with the one that shows the face.
   */
  [part~='avatar'][data-placeholder] {
    visibility: hidden;
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
    position: relative;
    align-self: flex-start;
    /* Indented past the speaker's icon, when the theme gives them one. */
    margin-inline-start: var(--_chit-speaker-gutter, 0px);
    padding: 0.7em 0.9em;
    border-radius: var(--chit-bubble-radius);
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
