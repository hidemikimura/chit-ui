/*
 * ドキュメントサイトの共通スクリプト。ビルド工程は無いので、素の ES モジュールのまま。
 *
 * やること: 見出しへのアンカー、目次の組み立てと現在地の追従、コードのコピーボタン、
 * そしてページの隅で本物のウィジェットを動かすこと。説明を読みながら、その場で
 * 触れるようにしておきたい。
 */

/** ここだけ直せばサイト全体の読み込み先が変わる。 */
const VERSION = '0.3.2';

const CDN = `https://cdn.jsdelivr.net/npm/@hidemikimura/chit-ui@${VERSION}/dist/chit-ui.min.js`;

/**
 * 版を指定しない配信。サイトを先に公開してしまったときの保険で、上の版がまだ npm に
 * 無くてもページが空にならない。
 */
const CDN_LATEST = 'https://cdn.jsdelivr.net/npm/@hidemikimura/chit-ui/dist/chit-ui.min.js';

/**
 * ローカルで開いているときはリポジトリの dist/ を読む（`npm run dev` のあと
 * /site/ を開けば、公開前の変更をそのまま確認できる）。公開先では CDN。
 */
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]', ''];

async function loadWidget() {
  const local = new URL('../../dist/chit-ui.min.js', import.meta.url).href;
  const sources = LOCAL_HOSTS.includes(location.hostname)
    ? [local, CDN, CDN_LATEST]
    : [CDN, CDN_LATEST];

  for (const source of sources) {
    try {
      return { api: await import(source), source };
    } catch {
      /* 次を試す */
    }
  }
  return null;
}

/* --- 見出しと目次 ------------------------------------------------------- */

function addAnchors(root) {
  for (const heading of root.querySelectorAll('h2[id], h3[id]')) {
    const link = document.createElement('a');
    link.className = 'anchor';
    link.href = `#${heading.id}`;
    link.textContent = '#';
    link.setAttribute('aria-label', `${heading.textContent.trim()} へのリンク`);
    heading.append(link);
  }
}

function buildToc(root, toc) {
  const headings = [...root.querySelectorAll('h2[id], h3[id]')];
  if (!headings.length) return () => {};

  const list = document.createElement('ol');
  for (const heading of headings) {
    const item = document.createElement('li');
    if (heading.tagName === 'H3') item.className = 'sub';
    const link = document.createElement('a');
    link.href = `#${heading.id}`;
    link.textContent = heading.textContent.replace(/#$/, '').trim();
    item.append(link);
    list.append(item);
  }
  toc.append(list);

  // 読んでいる見出しを目次側で光らせる。交差の上端をヘッダーの高さぶん下げておく。
  const links = new Map(
    [...list.querySelectorAll('a')].map((a) => [a.getAttribute('href').slice(1), a]),
  );
  const seen = new Set();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) seen.add(entry.target.id);
        else seen.delete(entry.target.id);
      }
      const current = headings.find((h) => seen.has(h.id));
      for (const [id, link] of links) link.classList.toggle('active', id === current?.id);
    },
    { rootMargin: '-80px 0px -70% 0px' },
  );
  for (const heading of headings) observer.observe(heading);
  return () => observer.disconnect();
}

/* --- コードのコピー ----------------------------------------------------- */

function addCopyButtons(root) {
  for (const pre of root.querySelectorAll('pre')) {
    const button = document.createElement('button');
    button.className = 'copy';
    button.type = 'button';
    button.textContent = 'コピー';
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pre.querySelector('code').textContent);
        button.textContent = 'コピーしました';
      } catch {
        button.textContent = 'コピーできません';
      }
      setTimeout(() => (button.textContent = 'コピー'), 1600);
    });
    pre.append(button);
  }
}

/* --- ページの隅のウィジェット -------------------------------------------- */

const FIRST = [
  {
    id: 'w1',
    role: 'assistant',
    text: 'これは本物の Chit UI です。左の説明を読みながら、ここで試せます。',
  },
  { id: 'w2', role: 'system', text: '返事はこのページの中で作っています（通信はしません）' },
];

/** ごく素朴な返事。何をしても会話が続いて見えればいい。 */
function replyTo(text) {
  if (/テーマ|色|theme/i.test(text)) return 'テーマは theme プロパティにオブジェクトを渡して差し替えます。上のボタンでも切り替えられます。';
  if (/しっぽ|tail/i.test(text)) return 'しっぽは open.bubble.tail に top か bottom を指定すると出ます。';
  if (/ドラッグ|drag|移動/i.test(text)) return 'ドラッグは closed.draggable と open.draggable で有効になります。このページでも動かせます。';
  if (/ローディング|loading|待/i.test(text)) return '応答待ちは loading プロパティ、または open.loading.auto で自動になります。';
  return `「${text}」を受け取りました。発言を積むのは利用者側のコードです — この返事もそうやって足しています。`;
}

async function startWidget({ api, source }) {
  const chat = document.querySelector('chit-ui');
  if (!chat || !api) return;

  const green = api.greenTheme;
  const base = {
    closed: { draggable: true },
    open: {
      draggable: true,
      width: 360,
      height: 520,
      header: { title: 'Chit UI を試す' },
      input: { placeholder: '何か入力してみてください' },
      loading: { style: 'spinner', text: '考えています' },
    },
  };

  const themes = {
    default: base,
    green: {
      ...green,
      closed: { ...green.closed, draggable: true },
      open: { ...green.open, ...base.open, bubble: green.open.bubble },
    },
  };

  let current = 'default';
  chat.theme = themes.default;
  chat.messages = FIRST;

  let count = 0;
  chat.addEventListener('chat-submit', async (event) => {
    const text = event.detail.text;
    chat.messages = [...chat.messages, { id: `u${++count}`, role: 'user', text }];
    chat.busy = true;
    chat.loading = true;

    await new Promise((resolve) => setTimeout(resolve, 700));

    chat.loading = false;
    chat.busy = false;
    chat.messages = [...chat.messages, { id: `a${count}`, role: 'assistant', text: replyTo(text) }];
  });

  const controls = document.querySelector('[data-controls]');
  if (!controls) return;

  const buttons = [...controls.querySelectorAll('button[data-action]')];
  const sync = () => {
    for (const button of buttons) {
      const action = button.dataset.action;
      if (action === 'theme') {
        button.setAttribute('aria-pressed', String(current === 'green'));
      } else if (action === 'loading') {
        button.setAttribute('aria-pressed', String(chat.loading));
      } else if (action === 'typing') {
        button.setAttribute('aria-pressed', String(chat.typing === true));
      }
    }
  };

  controls.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    switch (button.dataset.action) {
      case 'open':
        await chat.toggle();
        break;
      case 'theme':
        current = current === 'green' ? 'default' : 'green';
        chat.theme = themes[current];
        break;
      case 'loading':
        chat.loading = !chat.loading;
        break;
      case 'typing':
        chat.typing = chat.typing !== true;
        break;
      case 'reset':
        chat.messages = FIRST;
        chat.resetPosition();
        chat.loading = false;
        chat.typing = false;
        break;
    }
    sync();
  });

  // ボタンの押下状態は、ウィジェット側の排他（loading と typing）にも追従させる。
  for (const name of ['chat-state-change', 'chat-message-render']) {
    chat.addEventListener(name, sync);
  }
  sync();

  const status = document.querySelector('[data-widget-status]');
  if (status) {
    if (source === CDN) status.textContent = `読み込んだ版: ${VERSION}（jsDelivr）`;
    else if (source === CDN_LATEST) status.textContent = '読み込んだ版: 最新（jsDelivr）';
    else status.textContent = '読み込み先: このリポジトリの dist/（ローカル表示）';
  }
}

/* --- 起動 --------------------------------------------------------------- */

const article = document.querySelector('main article');
if (article) {
  addAnchors(article);
  addCopyButtons(article);
  const toc = document.querySelector('.toc');
  if (toc) buildToc(article, toc);
}

const loaded = await loadWidget();
if (loaded) {
  await startWidget(loaded);
} else {
  const status = document.querySelector('[data-widget-status]');
  if (status) status.textContent = 'ウィジェットを読み込めませんでした（ネットワークを確認してください）。';
}
