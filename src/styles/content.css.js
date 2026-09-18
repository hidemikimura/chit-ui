// @ts-check
import { css } from 'lit';

/**
 * Everything that keeps arbitrary consumer HTML inside its bubble.
 *
 * The widget has no say over what goes in a message, so the containment is
 * structural rather than a list of rules per element: the content box declares
 * its own size, refuses to grow past the bubble, and contains its layout and
 * paint so a stray position or margin cannot escape.
 */
export const contentStyles = css`
  [part~='message-content'] {
    min-width: 0;
    max-width: 100%;
    /* Long URLs and unbroken words wrap instead of widening the bubble. */
    overflow-wrap: anywhere;
    word-break: normal;
    overflow-x: hidden;
    /* Keeps a fixed or hugely-margined child from painting outside. */
    contain: layout paint;
    line-height: 1.5;
  }

  /*
   * Plain text keeps its line breaks. Only this form: applying pre-wrap to
   * html content would turn the newlines and indentation of the markup itself
   * into visible blank lines.
   */
  [part~='message-content'][data-content='text'] {
    white-space: pre-wrap;
  }

  [part~='message-content'] > :first-child {
    margin-top: 0;
  }
  [part~='message-content'] > :last-child {
    margin-bottom: 0;
  }

  /* Only direct children: a tooltip nested deeper still positions normally. */
  [part~='message-content'] > * {
    position: static !important;
  }

  [part~='message-content'] img,
  [part~='message-content'] video,
  [part~='message-content'] iframe,
  [part~='message-content'] svg,
  [part~='message-content'] canvas,
  [part~='message-content'] picture,
  [part~='message-content'] embed,
  [part~='message-content'] object {
    max-width: 100%;
    height: auto;
    display: block;
  }

  /* Wide content scrolls inside itself rather than stretching the bubble. */
  [part~='message-content'] table {
    display: block;
    max-width: 100%;
    overflow-x: auto;
    border-collapse: collapse;
  }

  [part~='message-content'] pre {
    max-width: 100%;
    overflow-x: auto;
    white-space: pre;
  }

  [part~='message-content'] code {
    overflow-wrap: anywhere;
  }

  [part~='message-content'] a {
    color: var(--chit-color-accent);
  }

  [part~='message-content'] button,
  [part~='message-content'] input,
  [part~='message-content'] select,
  [part~='message-content'] textarea {
    font: inherit;
    max-width: 100%;
  }

  [part~='message-content'] h1,
  [part~='message-content'] h2,
  [part~='message-content'] h3,
  [part~='message-content'] h4,
  [part~='message-content'] h5,
  [part~='message-content'] h6 {
    font-size: 1.1em;
    margin: 0.5em 0;
  }

  [part~='message-content'] p {
    margin: 0.5em 0;
  }

  [part~='message-content'] ul,
  [part~='message-content'] ol {
    margin: 0.5em 0;
    padding-inline-start: 1.5em;
  }

  [part~='message-content'] blockquote {
    margin: 0.5em 0;
    padding-inline-start: 0.75em;
    border-inline-start: 3px solid var(--chit-color-border);
  }

  [part~='message-content'] hr {
    border: 0;
    border-top: 1px solid var(--chit-color-border);
  }
`;
