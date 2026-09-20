/**
 * Runs an axe-core audit over the widget in the states a user actually sees.
 *
 * It lives outside the test suite on purpose: pulling axe-core through the dev
 * server's CommonJS transform stalls the browser test run, so the audit gets
 * its own Playwright page and injects the pre-built bundle instead.
 *
 * Usage: node scripts/audit-a11y.mjs
 *        CHROMIUM_PATH=/path/to/chromium node scripts/audit-a11y.mjs
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { startDevServer } from '@web/dev-server';

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const PORT = 8455;

const STATES = {
  closed: () => {},
  open: (el) => el.open(),
  'open with a conversation': (el) => {
    el.messages = [
      { id: 'a', role: 'system', html: '<p>オペレーターが参加しました</p>' },
      { id: 'b', role: 'assistant', html: '<p>ご用件をどうぞ。</p>', name: 'サポート', time: new Date() },
      { id: 'c', role: 'user', html: '<p>領収証について</p>', status: 'sent' },
    ];
    return el.open();
  },
  'busy and typing': (el) => {
    el.messages = [{ id: 'a', role: 'user', html: '<p>送りました</p>', status: 'sending' }];
    el.busy = true;
    el.typing = true;
    return el.open();
  },
  'over the character limit': async (el) => {
    el.maxLength = 10;
    await el.open();
    el.value = 'あ'.repeat(14);
  },
  'dark theme': (el) => {
    el.theme = {
      open: {
        colors: {
          background: '#16181d', text: '#e8eaed', accent: '#7aa2f7', border: '#2a2e37',
          headerBackground: '#1c1f26', headerText: '#e8eaed',
          userBubble: '#7aa2f7', userText: '#11131a',
          assistantBubble: '#22262f', assistantText: '#e8eaed',
          systemText: '#9aa0ac',
          inputBackground: '#1c1f26', inputText: '#e8eaed', inputPlaceholder: '#9aa0ac',
        },
      },
      closed: { colors: { background: '#7aa2f7', text: '#11131a' } },
    };
    el.messages = [{ id: 'a', role: 'assistant', html: '<p>暗い配色です</p>' }];
    return el.open();
  },
  'without a title bar': async (el) => {
    const { greenTheme } = await import('/src/themes/index.js');
    el.theme = {
      ...greenTheme,
      open: {
        ...greenTheme.open,
        animation: { enter: 'none', exit: 'none', duration: 0 },
        header: { visible: false, title: 'ecx サポート' },
      },
    };
    el.messages = [{ id: 'a', role: 'assistant', html: '<p>ご用件をどうぞ。</p>' }];
    return el.open();
  },
  'waiting for an answer': async (el) => {
    const { greenTheme } = await import('/src/themes/index.js');
    el.theme = {
      ...greenTheme,
      open: {
        ...greenTheme.open,
        animation: { enter: 'none', exit: 'none', duration: 0 },
        loading: { style: 'spinner', text: '回答を作成しています' },
      },
    };
    el.messages = [{ id: 'a', role: 'user', html: '<p>配送について</p>', status: 'sent' }];
    el.loading = true;
    return el.open();
  },
  'draggable': async (el) => {
    el.theme = {
      closed: { draggable: true, animation: { enter: 'none', exit: 'none', duration: 0 } },
      open: {
        draggable: true,
        header: { title: 'ecx サポート' },
        animation: { enter: 'none', exit: 'none', duration: 0 },
      },
    };
    el.messages = [{ id: 'a', role: 'assistant', html: '<p>ご用件をどうぞ。</p>' }];
    return el.open();
  },
  'green preset': async (el) => {
    const { greenTheme } = await import('/src/themes/index.js');
    el.theme = {
      ...greenTheme,
      open: {
        ...greenTheme.open,
        animation: { enter: 'none', exit: 'none', duration: 0 },
        header: { title: 'ecx サポート', logo: '/demo/logo.svg', home: true },
        speaker: { assistant: { name: 'サポート', avatar: '/demo/support.svg' } },
        input: { attach: true },
      },
    };
    el.messages = [
      { id: 'a', role: 'assistant', html: '<p>ご用件をどうぞ。</p>', time: new Date() },
      { id: 'b', role: 'user', html: '<p>領収証について</p>', status: 'sent' },
      { id: 'c', role: 'system', html: '<p>オペレーターが参加しました</p>' },
    ];
    el.typing = true;
    return el.open();
  },
};

const server = await startDevServer({
  config: { rootDir: process.cwd(), nodeResolve: true, port: PORT },
  readCliArgs: false,
  readFileConfig: false,
  logStartMessage: false,
});
// CHROMIUM_PATH lets a sandbox point at a browser Playwright did not install.
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
let failures = 0;

for (const [name, setup] of Object.entries(STATES)) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  // A served page rather than setContent: a module script loaded from the dev
  // server needs a matching origin to run at all.
  await page.goto(`http://localhost:${PORT}/scripts/a11y-harness.html`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction(() => !!customElements.get('chit-ui'));

  // The setup functions cannot cross into the page as functions, so they go
  // over as source and are rebuilt there.
  await page.evaluate(
    async (source) => {
      const el = document.querySelector('chit-ui');
      el.theme = {
        closed: { animation: { enter: 'none', exit: 'none', duration: 0 } },
        open: { animation: { enter: 'none', exit: 'none', duration: 0 } },
      };
      await el.updateComplete;
      await new Function(`return (${source})`)()(el);
      await el.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 60));
    },
    setup.toString(),
  );

  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(async () =>
    window.axe.run(document.body, {
      resultTypes: ['violations'],
      rules: { 'landmark-one-main': { enabled: false }, region: { enabled: false } },
    }),
  );

  const violations = result.violations.filter((v) => v.impact !== 'minor');
  if (violations.length === 0) {
    console.log(`ok    ${name}`);
  } else {
    failures += violations.length;
    console.log(`FAIL  ${name}`);
    for (const violation of violations) {
      console.log(`        [${violation.impact}] ${violation.id}: ${violation.help}`);
      for (const node of violation.nodes.slice(0, 3)) {
        console.log(`          ${node.target.join(' ')}`);
        if (node.failureSummary) {
          console.log(`          ${node.failureSummary.split('\n').join(' / ')}`);
        }
      }
    }
  }
  await page.close();
}

await browser.close();
await server.stop();
console.log(failures === 0 ? '\nno violations' : `\n${failures} violation(s)`);
process.exit(failures === 0 ? 0 : 1);
