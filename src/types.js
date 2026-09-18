// @ts-check

/**
 * Public types for Chit UI. This module has no runtime value; it exists so that
 * every other file can `@import` from one place and so `tsc` can emit .d.ts.
 *
 * @typedef {'user' | 'assistant' | 'system'} Role
 * @typedef {'sending' | 'sent' | 'error'} MessageStatus
 * @typedef {'closed' | 'open' | 'hidden'} ChatState
 * @typedef {'user' | 'api'} Trigger
 * @typedef {'pc' | 'mobile'} Device
 * @typedef {'fade' | 'scale' | 'slide' | 'none'} Effect
 * @typedef {'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'} Position
 */

/**
 * @typedef {Object} MessageBase
 * @property {string} id                       Unique within the array; used as the diffing key.
 * @property {Role} role
 * @property {string | Date} [time]
 * @property {string} [name]
 * @property {string} [avatar]
 * @property {MessageStatus} [status]
 * @property {boolean} [streaming]
 * @property {unknown} [meta]                  Never touched by the library.
 *
 * @typedef {MessageBase & { html: string }} HtmlMessage
 * @typedef {MessageBase & { template: import('lit').TemplateResult }} TemplateMessage
 * @typedef {MessageBase & { element: HTMLElement }} ElementMessage
 * @typedef {MessageBase & { component: (new () => HTMLElement) | string, props?: Record<string, unknown> }} ComponentMessage
 * @typedef {HtmlMessage | TemplateMessage | ElementMessage | ComponentMessage} Message
 */

/**
 * @typedef {Object} Animation
 * @property {Effect} [enter]
 * @property {Effect} [exit]
 * @property {number} [duration]               ms
 *
 * @typedef {Object} Offset
 * @property {number} [x]
 * @property {number} [y]
 */

/**
 * @typedef {Object} ClosedTheme
 * @property {number} [size]                   Launcher edge length, px.
 * @property {Position} [position]
 * @property {Offset} [offset]
 * @property {number} [radius]
 * @property {string | null} [image]           Icon image URL; null clears the default.
 * @property {string | null} [label]
 * @property {{ background?: string, text?: string, shadow?: string }} [colors]
 * @property {Animation & { idle?: 'none' | 'pulse' | 'bounce' }} [animation]
 */

/**
 * @typedef {Object} OpenColors
 * @property {string} [background]
 * @property {string} [text]
 * @property {string} [accent]
 * @property {string} [border]
 * @property {string} [shadow]
 * @property {string} [headerBackground]
 * @property {string} [headerText]
 * @property {string} [userBubble]
 * @property {string} [userText]
 * @property {string} [assistantBubble]
 * @property {string} [assistantText]
 * @property {string} [systemText]
 * @property {string} [inputBackground]
 * @property {string} [inputText]
 * @property {string} [inputPlaceholder]
 */

/**
 * @typedef {Object} OpenTheme
 * @property {number} [width]                  Ignored on mobile (always full screen).
 * @property {number} [height]                 Ignored on mobile (always full screen).
 * @property {Position} [position]
 * @property {Offset} [offset]
 * @property {number} [radius]
 * @property {'hidden' | 'visible'} [launcher] Keep the launcher visible while open.
 * @property {{ title?: string | null, logo?: string | null, avatar?: string | null }} [header]
 * @property {{ image?: string | null }} [background]
 * @property {OpenColors} [colors]
 * @property {Animation} [animation]
 * @property {{ maxRows?: number, placeholder?: string }} [input]
 */

/**
 * @typedef {Object} Theme
 * @property {number} [breakpoint]             Widths below this are treated as mobile.
 * @property {number} [zIndex]
 * @property {{ family?: string, size?: number }} [font]
 * @property {ClosedTheme | { pc?: ClosedTheme, mobile?: ClosedTheme }} [closed]
 * @property {OpenTheme} [open]
 * @property {{ animation?: { exit?: Effect, duration?: number } }} [hidden]
 */

/**
 * Fully resolved theme: defaults merged in, `closed` split per device.
 *
 * @typedef {Object} ResolvedTheme
 * @property {number} breakpoint
 * @property {number} zIndex
 * @property {{ family: string, size: number }} font
 * @property {{ pc: Required<Omit<ClosedTheme, 'image' | 'label'>> & { image: string | null, label: string | null }, mobile: Required<Omit<ClosedTheme, 'image' | 'label'>> & { image: string | null, label: string | null } }} closed
 * @property {OpenTheme} open
 * @property {{ animation: { exit: Effect, duration: number } }} hidden
 */

export {};
