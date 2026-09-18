// @ts-check
import { ChitUI } from './chit-ui.js';

if (!customElements.get('chit-ui')) {
  customElements.define('chit-ui', ChitUI);
}

export { ChitUI };
export { Events } from './events.js';
