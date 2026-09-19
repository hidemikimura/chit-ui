import type { ChitUI } from './chit-ui.js';
import type { Message, ChatState, Trigger, Device } from './types.js';

export interface ChitUIEventMap {
  'chat-submit': CustomEvent<{ text: string }>;
  'chat-before-open': CustomEvent<{ from: ChatState; trigger: Trigger }>;
  'chat-open': CustomEvent<{ from: ChatState; trigger: Trigger }>;
  'chat-before-close': CustomEvent<{ from: ChatState; trigger: Trigger }>;
  'chat-close': CustomEvent<{ from: ChatState; trigger: Trigger }>;
  'chat-hide': CustomEvent<{ from: ChatState; to: 'hidden' }>;
  'chat-show': CustomEvent<{ from: 'hidden'; to: ChatState }>;
  'chat-state-change': CustomEvent<{ from: ChatState; to: ChatState; trigger: Trigger }>;
  'chat-input': CustomEvent<{ value: string }>;
  'chat-message-render': CustomEvent<{ message: Message; element: HTMLElement; instance?: HTMLElement }>;
  'chat-message-click': CustomEvent<{ message: Message; target: Element; originalEvent: MouseEvent }>;
  'chat-scroll-top': CustomEvent<Record<string, never>>;
  'chat-breakpoint-change': CustomEvent<{ device: Device }>;
  'chat-home': CustomEvent<{ trigger: Trigger }>;
  'chat-attach': CustomEvent<{ files: File[] }>;
}

declare global {
  interface HTMLElementTagNameMap {
    'chit-ui': ChitUI;
  }
  interface HTMLElementEventMap extends ChitUIEventMap {}
}
