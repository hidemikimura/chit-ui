// @ts-check
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

/** @import { ChitUI } from '../chit-ui.js' */
/** @import { Message } from '../types.js' */

/**
 * @typedef {Object} ComponentEntry
 * @property {(new () => HTMLElement) | string} source  What `component` held when this was built.
 * @property {HTMLElement} element
 * @property {Record<string, unknown>} props           Last props written to the element.
 */

/**
 * Per-host component instances, keyed by a caller-chosen string.
 *
 * Messages key by `msg:<id>`; the launcher has its own key. Keeping one cache
 * means one place decides when an element is rebuilt and when its props are
 * merely re-assigned.
 */
const INSTANCES = new WeakMap();

/**
 * The cache key for a message's component.
 *
 * @param {string} id
 * @returns {string}
 */
const messageKey = (id) => `msg:${id}`;

/** The cache key for the closed-state component. */
export const LAUNCHER_KEY = 'launcher';

/** The five ways a message can carry its content. Exactly one may be present. */
const CONTENT_FIELDS = /** @type {const} */ ([
  'text',
  'html',
  'template',
  'element',
  'component',
]);

/**
 * Which form a message uses. Also drives the `data-content` attribute, because
 * plain text is the one form whose whitespace has to survive.
 *
 * @param {Message} message
 * @returns {'text' | 'html' | 'template' | 'element' | 'component'}
 */
export function contentField(message) {
  const present = CONTENT_FIELDS.filter((field) => field in message);
  if (present.length === 1) return present[0];
  if (present.length === 0) {
    throw new Error(
      `ChitUI: message "${message.id}" has no content. Give it one of html, template, element or component.`,
    );
  }
  throw new Error(
    `ChitUI: message "${message.id}" has ${present.join(' and ')}. Give it exactly one.`,
  );
}

/**
 * The value a message's content is built from. Used to decide whether a
 * message actually changed, so `chat-message-render` does not fire on every
 * unrelated update.
 *
 * @param {Message} message
 * @returns {unknown}
 */
export function contentKey(message) {
  return /** @type {Record<string, unknown>} */ (message)[contentField(message)];
}

/**
 * The registered tag name for a `component`.
 *
 * Registration stays the consumer's job: the library never invents a tag name
 * and calls `customElements.define` behind their back, because that name would
 * then be taken globally for the life of the page.
 *
 * @param {(new () => HTMLElement) | string} source
 * @returns {string}
 */
function tagNameOf(source) {
  if (typeof source === 'string') return source;

  const registry = /** @type {CustomElementRegistry & { getName?: (c: unknown) => string | null }} */ (
    customElements
  );
  const registered = registry.getName?.(source);
  if (registered) return registered;

  const declared = /** @type {{ tagName?: string }} */ (/** @type {unknown} */ (source)).tagName;
  if (typeof declared === 'string' && declared) return declared;

  throw new Error(
    'ChitUI: component is not registered in customElements. ' +
      'Call customElements.define() for it, or pass its tag name as a string.',
  );
}

/**
 * Build (or reuse) an element for a component reference and write its props.
 *
 * The instance is kept across renders so the component keeps its own state; a
 * changed reference replaces it, and changed props are assigned one by one so
 * the component's own setters see each change.
 *
 * @param {ChitUI} host
 * @param {string} key                                       Cache key.
 * @param {(new () => HTMLElement) | string} source
 * @param {Record<string, unknown>} [props]
 * @returns {HTMLElement}
 */
export function resolveComponent(host, key, source, props = {}) {
  let cache = INSTANCES.get(host);
  if (!cache) {
    cache = new Map();
    INSTANCES.set(host, cache);
  }

  const existing = /** @type {ComponentEntry | undefined} */ (cache.get(key));

  if (existing && existing.source === source) {
    for (const [name, value] of Object.entries(props)) {
      if (!Object.is(existing.props[name], value)) {
        /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (existing.element))[name] = value;
      }
    }
    existing.props = { ...props };
    return existing.element;
  }

  const element = document.createElement(tagNameOf(source));
  for (const [name, value] of Object.entries(props)) {
    /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (element))[name] = value;
  }
  cache.set(key, { source, element, props: { ...props } });
  return element;
}

/**
 * Drop cached instances for messages that are gone, so a long conversation
 * does not hold on to elements it will never show again. Non-message entries,
 * such as the launcher's, are left alone.
 *
 * @param {ChitUI} host
 * @param {Set<string>} liveIds
 */
export function pruneComponents(host, liveIds) {
  const cache = INSTANCES.get(host);
  if (!cache) return;
  for (const key of cache.keys()) {
    if (!key.startsWith('msg:')) continue;
    if (!liveIds.has(key.slice(4))) cache.delete(key);
  }
}

/**
 * The component instance backing a message, when it has one.
 *
 * @param {ChitUI} host
 * @param {string} id
 * @returns {HTMLElement | undefined}
 */
export function componentInstance(host, id) {
  return INSTANCES.get(host)?.get(messageKey(id))?.element;
}

/**
 * Turn a message's content into something Lit can render as a child value.
 *
 * All four shapes collapse here: an HTML string becomes an `unsafeHTML`
 * directive, a Lit template passes straight through, and an element or a
 * component becomes a Node, which Lit inserts as-is.
 *
 * @param {ChitUI} host
 * @param {Message} message
 * @returns {unknown}
 */
export function renderContent(host, message) {
  switch (contentField(message)) {
    case 'text':
      // A string child is rendered by Lit as a text node, so the escaping is
      // structural: there is no parse step for markup to sneak through. Line
      // breaks survive because the content box is pre-wrap for this form.
      return /** @type {{ text: string }} */ (/** @type {unknown} */ (message)).text;

    case 'template':
      return /** @type {{ template: unknown }} */ (/** @type {unknown} */ (message)).template;

    case 'element':
      return /** @type {{ element: HTMLElement }} */ (/** @type {unknown} */ (message)).element;

    case 'component': {
      const carrier = /** @type {{ component: (new () => HTMLElement) | string, props?: Record<string, unknown> }} */ (
        /** @type {unknown} */ (message)
      );
      return resolveComponent(host, messageKey(message.id), carrier.component, carrier.props);
    }

    default: {
      // Only the html form goes through `sanitize`: `text` is escaped by
      // construction, and the rest are structures the consumer built
      // themselves rather than markup we could meaningfully clean.
      const raw = /** @type {{ html: string }} */ (/** @type {unknown} */ (message)).html;
      return unsafeHTML(host.sanitize ? host.sanitize(raw) : raw);
    }
  }
}
