# Chit UI レシピ

よくある組み方。どれも「発言を持っているのは利用者側」という前提の上に乗っている。

## 送信から返事まで（基本形）

```js
chat.addEventListener('chat-submit', async (event) => {
  const text = event.detail.text.trim();
  if (!text) { event.preventDefault(); return; }

  const mine = { id: crypto.randomUUID(), role: 'user', text, status: 'sending' };
  chat.messages = [...chat.messages, mine];
  chat.busy = true;
  chat.loading = true;

  try {
    const reply = await api.send(text);
    chat.messages = chat.messages
      .map((m) => (m.id === mine.id ? { ...m, status: 'sent' } : m))
      .concat({ id: crypto.randomUUID(), role: 'assistant', text: reply });
  } catch {
    chat.messages = chat.messages.map((m) =>
      m.id === mine.id ? { ...m, status: 'error' } : m,
    );
    chat.messages = [...chat.messages,
      { id: crypto.randomUUID(), role: 'system', text: '送信できませんでした' }];
  } finally {
    chat.loading = false;
    chat.busy = false;
  }
});
```

`open.loading.auto: true` にしておけば `chat.loading` の上げ下げは要らない。送信から
相手側の発言が増えるまで自動で出て、`timeout`（ms）を過ぎれば自分で引っ込む。

## ストリーミング

同じ `id` の発言を書き換えていく。`streaming: true` の間は末尾にカーソルが出て、
`aria-busy` が立つので 1 文字ずつ読み上げられない。

```js
const id = crypto.randomUUID();
chat.messages = [...chat.messages, { id, role: 'assistant', text: '', streaming: true }];

for await (const chunk of stream) {
  chat.messages = chat.messages.map((m) =>
    m.id === id ? { ...m, text: m.text + chunk } : m,
  );
}

chat.messages = chat.messages.map((m) =>
  m.id === id ? { ...m, streaming: false } : m,
);
```

最下部にいる読み手は自動で追従する。上にさかのぼっている読み手は動かされず、
「最新へ」のボタンが出る。

## 履歴の追い読み

```js
chat.addEventListener('chat-scroll-top', async () => {
  if (loadingOlder || !cursor) return;
  loadingOlder = true;
  const older = await api.history(cursor);
  chat.messages = [...older, ...chat.messages];   // 前に足す
  cursor = older.at(0)?.cursor ?? null;
  loadingOlder = false;
});
```

このイベントは最上部に着くたびに 1 回だけ出る（居座っても繰り返さない）。

## シナリオ型（ホームボタンで最初に戻す）

```js
chat.theme = { open: { header: { home: true } } };

chat.addEventListener('chat-home', async (event) => {
  if (event.detail.trigger === 'user' && !confirm('最初からやり直しますか？')) return;
  chat.messages = [firstMessage()];
  scenario.reset();
});
```

ボタンを押してもウィジェットは何も消さない。どこまで戻すかは利用者が決める。

## 発言の中にコンポーネントを置く

```js
class OrderCard extends HTMLElement { /* props を受け取って描く */ }
customElements.define('order-card', OrderCard);

chat.messages = [...chat.messages, {
  id: 'order-1001',
  role: 'assistant',
  component: 'order-card',
  props: { orderId: '1001', total: 4800 },
  meta: { orderId: '1001' },
}];

chat.addEventListener('chat-message-click', (event) => {
  const action = event.detail.target.closest('[data-action]')?.dataset.action;
  if (action === 'detail') showOrder(event.detail.message.meta.orderId);
});
```

同じ `id` の間はインスタンスが再利用され、変わった `props` だけ再代入される。
`chat-message-render` の `detail.instance` でインスタンスを直接触ることもできる。

## 未読バッジ

```html
<chit-ui id="chat">
  <span slot="launcher" class="badge" hidden></span>
</chit-ui>
```

```js
function pushFromServer(message) {
  chat.messages = [...chat.messages, message];
  if (chat.state !== 'open') {
    unread += 1;
    badge.textContent = String(unread);
    badge.hidden = false;
  }
}

chat.addEventListener('chat-open', () => { unread = 0; badge.hidden = true; });
```

パネルの中で上にさかのぼっている読み手に新着が届いたかどうかは `chat.hasUnseen` でわかる。

## 添付ファイル

```js
chat.theme = { open: { input: { attach: true, accept: 'image/*', multiple: false } } };

chat.addEventListener('chat-attach', async (event) => {
  const [file] = event.detail.files;
  const url = await api.upload(file);
  chat.messages = [...chat.messages, {
    id: crypto.randomUUID(), role: 'user',
    html: `<img src="${url}" alt="添付した画像">`,
  }];
});
```

ライブラリはアップロードもプレビューもしない。同じファイルを続けて選んでも毎回発火する。

## LINE LIFF など、外側がタイトルを持つ画面

```js
chat.theme = { open: { header: { visible: false } } };
```

タイトルバーごと消えるので閉じるボタンも消える。Esc とランチャーでは閉じられる。
`title` は描かれなくても `role="dialog"` の読み上げ名には使われる。

## ドラッグで動かす

```js
chat.theme = { closed: { draggable: true }, open: { draggable: true } };

chat.addEventListener('chat-move', (event) => {
  localStorage.setItem('chit-offset', JSON.stringify(event.detail.displacement));
});

const saved = localStorage.getItem('chit-offset');
if (saved) chat.dragOffset = JSON.parse(saved);
```

閉じた状態と開いた状態は同じずれを共有するので、片方を動かせばもう片方も動く。
`resetPosition()` でテーマの位置に戻る。保存するかどうかは利用者の判断。

## ダークモード

```js
const dark = matchMedia('(prefers-color-scheme: dark)');
const apply = () => { chat.theme = dark.matches ? darkTheme : lightTheme; };
dark.addEventListener('change', apply);
apply();
```

テーマは実行中に差し替えても即座に反映される。

## 入力欄を消して選択肢だけで進める

```js
chat.inputHidden = true;
chat.messages = [...chat.messages, {
  id: 'q1', role: 'assistant',
  html: '<p>どちらにしますか？</p><button data-choice="a">A</button><button data-choice="b">B</button>',
}];

chat.addEventListener('chat-message-click', (event) => {
  const choice = event.detail.target.closest('[data-choice]')?.dataset.choice;
  if (choice) chat.submit(choice === 'a' ? 'A' : 'B');
});
```

入力欄を消しても `submit(text)` は使えるので、選択肢からの送信で会話を進められる。
