// @ts-check
import { ChitUI } from './chit-ui.js';

if (!customElements.get('chit-ui')) {
  customElements.define('chit-ui', ChitUI);
}

export { ChitUI };
export { Events } from './events.js';

/**
 * The public types, re-exported so a consumer can write
 * `import type { Message } from '@hidemikimura/chit-ui'` instead of reaching
 * into `dist/types/` for them.
 *
 * @typedef {import('./types.js').Role} Role
 * @typedef {import('./types.js').MessageStatus} MessageStatus
 * @typedef {import('./types.js').ChatState} ChatState
 * @typedef {import('./types.js').Trigger} Trigger
 * @typedef {import('./types.js').Device} Device
 * @typedef {import('./types.js').Effect} Effect
 * @typedef {import('./types.js').Position} Position
 * @typedef {import('./types.js').BubbleTail} BubbleTail
 * @typedef {import('./types.js').LoadingStyle} LoadingStyle
 * @typedef {import('./types.js').MessageBase} MessageBase
 * @typedef {import('./types.js').TextMessage} TextMessage
 * @typedef {import('./types.js').HtmlMessage} HtmlMessage
 * @typedef {import('./types.js').TemplateMessage} TemplateMessage
 * @typedef {import('./types.js').ElementMessage} ElementMessage
 * @typedef {import('./types.js').ComponentMessage} ComponentMessage
 * @typedef {import('./types.js').Message} Message
 * @typedef {import('./types.js').Animation} Animation
 * @typedef {import('./types.js').Offset} Offset
 * @typedef {import('./types.js').ClosedTheme} ClosedTheme
 * @typedef {import('./types.js').OpenColors} OpenColors
 * @typedef {import('./types.js').SpeakerTheme} SpeakerTheme
 * @typedef {import('./types.js').LoadingTheme} LoadingTheme
 * @typedef {import('./types.js').OpenTheme} OpenTheme
 * @typedef {import('./types.js').Theme} Theme
 * @typedef {import('./types.js').ResolvedClosed} ResolvedClosed
 * @typedef {import('./types.js').ResolvedOpen} ResolvedOpen
 * @typedef {import('./types.js').ResolvedTheme} ResolvedTheme
 */
