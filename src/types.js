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
 * @typedef {MessageBase & { text: string }} TextMessage
 * @typedef {MessageBase & { html: string }} HtmlMessage
 * @typedef {MessageBase & { template: import('lit').TemplateResult }} TemplateMessage
 * @typedef {MessageBase & { element: HTMLElement }} ElementMessage
 * @typedef {MessageBase & { component: (new () => HTMLElement) | string, props?: Record<string, unknown> }} ComponentMessage
 * @typedef {TextMessage | HtmlMessage | TemplateMessage | ElementMessage | ComponentMessage} Message
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
 * @property {number | 'auto'} [size]          Launcher edge length in px, or 'auto' to let its content decide.
 * @property {Position} [position]
 * @property {Offset} [offset]
 * @property {number} [radius]
 * @property {string | null} [image]           Icon image URL; null clears the default.
 * @property {string | null} [label]
 * @property {(new () => HTMLElement) | string | null} [component]  A component that draws the whole launcher.
 * @property {Record<string, unknown>} [props] Properties written to that component.
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
 * @property {Animation & { scroll?: 'smooth' | 'instant' }} [animation]
 * @property {{ maxRows?: number, placeholder?: string | null }} [input]
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
 * A theme with every gap filled in and `closed` narrowed to the device in use.
 * This is what the render functions and the CSS generator read.
 *
 * @typedef {Object} ResolvedClosed
 * @property {number | 'auto'} size
 * @property {Position} position
 * @property {{ x: number, y: number }} offset
 * @property {number} radius
 * @property {string | null} image
 * @property {string | null} label
 * @property {(new () => HTMLElement) | string | null} component
 * @property {Record<string, unknown>} props
 * @property {{ background: string, text: string, shadow: string }} colors
 * @property {{ enter: Effect, exit: Effect, duration: number, idle: 'none' | 'pulse' | 'bounce' }} animation
 *
 * @typedef {Object} ResolvedOpen
 * @property {number} width
 * @property {number} height
 * @property {Position} position
 * @property {{ x: number, y: number }} offset
 * @property {number} radius
 * @property {'hidden' | 'visible'} launcher
 * @property {{ title: string | null, logo: string | null, avatar: string | null }} header
 * @property {{ image: string | null }} background
 * @property {Required<OpenColors>} colors
 * @property {{ enter: Effect, exit: Effect, duration: number, scroll: 'smooth' | 'instant' }} animation
 * @property {{ maxRows: number, placeholder: string | null }} input
 *
 * @typedef {Object} ResolvedTheme
 * @property {number} breakpoint
 * @property {number} zIndex
 * @property {{ family: string, size: number }} font
 * @property {ResolvedClosed} closed
 * @property {ResolvedOpen} open
 * @property {{ animation: { exit: Effect, duration: number } }} hidden
 * @property {Device} device       Which bucket `closed` was narrowed to.
 */

export {};
