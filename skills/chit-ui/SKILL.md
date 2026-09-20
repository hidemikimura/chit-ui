---
name: chit-ui
description: Chit UI（@hidemikimura/chit-ui）でチャットウィジェットを組み込む・直すときに必ず使う。Lit 製のチャット UI を Web ページやアプリに載せる、吹き出しやランチャーの見た目を変える、発言にカスタムコンポーネントを差し込む、送信イベントをバックエンドにつなぐ、`<chit-ui>` というタグや chat-submit / chat-attach / chat-move といったイベントがコードに出てきた、といった場面で参照する。チャットウィジェット・チャット UI・問い合わせウィジェットを新しく作る相談にも使う。
---

# Chit UI

Lit で書かれたチャットウィジェットのカスタム要素。ページの隅に丸いランチャーを置き、
押すとパネルが開く。スマホ幅では全画面になる。

**このライブラリが持たないもの**: 通信、状態管理、発言の保存。`messages` 配列の所有者は
利用者側で、ライブラリはそれを読んで描くだけ。書き換えることは一度もない。送信も
「送信された」というイベントを出すところまでで、そこから先は利用者のコードが決める。
この境界を踏み外した設計（ライブラリが勝手に発言を足す、通信を始める）にしないこと。

## 最小の組み込み

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@hidemikimura/chit-ui/dist/chit-ui.min.js"></script>
<chit-ui id="chat"></chit-ui>

<script type="module">
  const chat = document.getElementById('chat');

  chat.addEventListener('chat-submit', async (event) => {
    const text = event.detail.text;

    chat.messages = [...chat.messages, { id: crypto.randomUUID(), role: 'user', text }];
    chat.busy = true;
    chat.typing = true;

    const reply = await yourBackend(text);

    chat.typing = false;
    chat.busy = false;
    chat.messages = [...chat.messages,
      { id: crypto.randomUUID(), role: 'assistant', text: reply }];
  });
</script>
```

npm から使うときは `npm install @hidemikimura/chit-ui lit` して `import '@hidemikimura/chit-ui';`。
タグ名を自分で決めるなら `import { ChitUI } from '@hidemikimura/chit-ui/element.js';` を
使って `customElements.define()` する。型は
`import type { Message, Theme } from '@hidemikimura/chit-ui';`。

**npm 版と単一バンドル（dist/chit-ui.min.js）を同じページで混ぜない。** Lit が二重に
読み込まれる。`window.ChitUI` を作る IIFE 版（`dist/chit-ui.iife.min.js`）もある。

## 間違えやすいところ

**`messages` は必ず新しい配列を代入する。** `chat.messages.push(...)` は描画されない
（Lit が同一参照を変更なしとみなす）。`[...chat.messages, next]` の形で代入する。

**`id` は必須で、安定していること。** 差分描画のキーになる。毎回採番し直すと全部の
吹き出しが作り直され、コンポーネント発言のインスタンスも捨てられる。

**人が書いた文章は `text`、自分で組み立てた HTML だけ `html`。** `text` は Lit が
テキストノードとして描くのでエスケープが構造的に保証され、改行もそのまま出る。
`html` を使うなら `chat.sanitize = (html) => DOMPurify.sanitize(html)` を必ず設定する。
バックエンドや LLM の出力をそのまま `html` に入れるのは事故のもと。

**`typing` と `loading` は排他。** 一方を `true` にすると他方が `false` になる。
相手が機械なら「入力中」より `loading`（スピナーや文言）が正しい。

**`chat-submit` は中止できる。** `event.preventDefault()` すると入力欄は空にならず、
`open.loading.auto` の自動ローディングも始まらない。

**スマホ幅では `open.width` / `open.height` は無視される**（常に全画面）。
`open.draggable` もスマホでは効かない。

**`open.header.visible: false` にすると閉じるボタンも消える。** LINE LIFF のように
外側がタイトルを持つ画面向け。Esc とランチャーでは閉じられる。

## 発言の 5 形式

`text` / `html` / `template`（Lit の `TemplateResult`）/ `element`（`HTMLElement`）/
`component`（コンストラクタかタグ名 + `props`）のいずれか 1 つを持たせる。

```js
{ id: 'x', role: 'assistant', component: 'order-card', props: { orderId: '1001' } }
```

`component` は同じ `id` である限りインスタンスが再利用され、変わった `props` だけが
再代入される。発言の中のボタンは個別にリスナーを付けるより
`chat-message-click`（`detail: { message, target, originalEvent }`）で一括して受けるほうが楽。
`target` はコンポーネントの Shadow DOM 内まで辿れている。

`role` は `'user'` / `'assistant'` / `'system'`。`system` は中央寄せの連絡行で、
名前もアイコンも出ない。

## テーマ

部分指定でよく、指定しなかった項目は既定値で埋まる。`null` を渡すと既定値を消せる。
実行中に差し替えれば即反映される（ダークモードの切り替えなど）。

```js
chat.theme = {
  breakpoint: 768,
  closed: { pc: { size: 64, image: '/icon.png' }, mobile: { size: 56 }, draggable: true },
  open: {
    width: 380, height: 600,
    colors: { accent: '#2563eb' },
    bubble: { radius: 18, tail: 'top' },
    header: { title: 'サポート', logo: '/logo.png', home: true },
    loading: { auto: true, style: 'spinner' },
    input: { attach: true, placeholder: 'ご質問をどうぞ' },
  },
};
```

付属テーマは `import { greenTheme } from '@hidemikimura/chit-ui/themes.js'`
（単一バンドルなら `window.ChitUI.greenTheme`）。重ねて調整できる。

細かい色だけ変えたいなら CSS のほうが早い。テーマの値は CSS カスタムプロパティになり、
ページ側の指定が勝つ。

```css
chit-ui { --chit-color-accent: #d81b60; --chit-launcher-size: 72px; }
chit-ui::part(bubble) { font-size: 15px; }
```

`--_chit-` で始まる変数は内部用。触らない。

## よく使う API

| 種類 | もの |
| --- | --- |
| プロパティ | `messages` `state` `theme` `typing` `loading` `busy` `value` `inputDisabled` `inputHidden` `maxLength` `sanitize` `locale` `labels` `dragOffset` |
| メソッド | `open()` `close()` `toggle()` `submit(text?)` `focusInput()` `scrollToBottom()` `getMessageElement(id)` `home()` `openAttach()` `resetPosition()` |
| イベント | `chat-submit` `chat-open` `chat-close` `chat-state-change` `chat-input` `chat-message-click` `chat-message-render` `chat-scroll-top` `chat-home` `chat-attach` `chat-move` `chat-breakpoint-change` |

状態遷移のメソッドはアニメーション完了で resolve する Promise を返す（中止されたら `false`）。
すべてのイベントは `bubbles` と `composed` が立っているので `document` でも拾える。

網羅した表（全プロパティ・全イベントの `detail`・スロット・CSS パーツ・CSS 変数・
テーマの全項目）は `references/api.md`。用途別の書き方（ストリーミング、シナリオ型、
未読バッジ、LIFF、添付の送信）は `references/recipes.md`。

## 作るときの順序

1. `chat-submit` を受けて自分の発言を積み、返事を積むところまで作る。ここが本体。
2. 待っている間の表示を決める（`busy` + `loading`、または `open.loading.auto`）。
3. 見た目はテーマ、細部は CSS カスタムプロパティと `::part()`。
4. 必要なら発言の中身を `component` にして、操作は `chat-message-click` で受ける。

会話の保存・復元、未読管理、ログインの有無といった判断はすべて利用者側のコードに置く。
ライブラリに寄せようとしないこと。
