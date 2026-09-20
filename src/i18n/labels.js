// @ts-check

/**
 * @typedef {Object} Labels
 * @property {string} launcher      Accessible name of the closed-state button.
 * @property {string} panel         Accessible name of the dialog.
 * @property {string} conversation  Accessible name of the message log.
 * @property {string} close         Close button.
 * @property {string} home          Home button: back to the start of the conversation.
 * @property {string} send          Send button.
 * @property {string} attach        Attach button beside the composer.
 * @property {string} input         Composer textarea.
 * @property {string} typing        Announced while the other side is typing.
 * @property {string} loading       Announced while waiting for an answer.
 * @property {string} move          The panel's drag handle.
 * @property {string} toLatest      "Jump to newest" button.
 * @property {{ sending: string, sent: string, error: string }} status  Delivery state of one's own message.
 * @property {string} charactersLeft  Counter, with {n} for the number remaining.
 * @property {string} overLimit       Counter past the limit, with {n} for the excess.
 */

/** @type {Record<string, Labels>} */
const BUILT_IN = {
  ja: {
    launcher: 'チャットを開く',
    panel: 'チャット',
    conversation: '会話',
    close: 'チャットを閉じる',
    home: '最初に戻る',
    send: '送信',
    attach: '画像や動画を添付',
    input: 'メッセージを入力',
    typing: '入力中',
    loading: '応答を待っています',
    move: 'チャットの位置を移動（矢印キー）',
    toLatest: '最新へ',
    status: { sending: '送信中', sent: '送信済み', error: '送信できませんでした' },
    charactersLeft: '残り {n} 文字',
    overLimit: '{n} 文字超過しています',
  },
  en: {
    launcher: 'Open chat',
    panel: 'Chat',
    conversation: 'Conversation',
    close: 'Close chat',
    home: 'Back to the start',
    send: 'Send',
    attach: 'Attach an image or video',
    input: 'Type a message',
    typing: 'Typing',
    loading: 'Waiting for a reply',
    move: 'Move the chat (arrow keys)',
    toLatest: 'Jump to latest',
    status: { sending: 'Sending', sent: 'Sent', error: 'Not delivered' },
    charactersLeft: '{n} characters left',
    overLimit: '{n} characters over the limit',
  },
};

/**
 * The language the widget speaks: the `locale` property, else the document's,
 * else the browser's. Everything locale-dependent — labels and timestamps
 * alike — goes through this, so they cannot disagree.
 *
 * @param {string | undefined} locale
 * @returns {string | undefined} undefined means "whatever the browser uses".
 */
export function resolveLocale(locale) {
  return locale || document.documentElement.lang || undefined;
}

/**
 * Pick the label set for a locale, falling back to English for anything we do
 * not ship. `overrides` is the host's `labels` property.
 *
 * @param {string | undefined} locale
 * @param {Partial<Labels> | undefined} [overrides]
 * @returns {Labels}
 */
export function resolveLabels(locale, overrides) {
  const lang = (resolveLocale(locale) || 'en').toLowerCase();
  const base = BUILT_IN[lang] ?? BUILT_IN[lang.split('-')[0]] ?? BUILT_IN.en;
  return overrides ? { ...base, ...overrides } : base;
}
