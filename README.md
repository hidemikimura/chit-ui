# Chit UI

Web ページに載せるチャットウィジェットの **UI だけ** を提供する、Lit ベースの
JavaScript ライブラリです。通信も会話ロジックも発言の中身の振る舞いも持ちません。
持つのは、見た目・状態・入力・イベント通知の 4 つだけです。

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@hidemikimura/chit-ui/dist/chit-ui.min.js"></script>
<chit-ui id="chat"></chit-ui>
<script type="module">
  const chat = document.getElementById('chat');

  chat.addEventListener('chat-submit', async (e) => {
    chat.messages = [...chat.messages, { id: crypto.randomUUID(), role: 'user', html: escapeHtml(e.detail.text) }];
    chat.busy = true;
    chat.typing = true;

    const reply = await yourBackend(e.detail.text);   // 通信はあなたのコード

    chat.messages = [...chat.messages, { id: crypto.randomUUID(), role: 'assistant', html: reply }];
    chat.typing = false;
    chat.busy = false;
  });
</script>
```

## 特徴

- **状態は 3 つだけ** — `closed`（ランチャーのアイコン）、`open`（チャットパネル）、`hidden`（非表示）。
  遷移はプロパティ代入でもメソッドでも行え、アニメーションの完了は Promise とイベントで分かります。
- **状態ごとのテーマ** — 色・画像・アニメーション・大きさを状態別に設定でき、`closed` は PC と
  スマホで別々に指定できます。値は CSS カスタムプロパティになるので、ページの CSS からも上書きできます。
- **発言の中身は自由** — HTML 文字列、Lit テンプレート、DOM 要素、`LitElement` を継承した
  コンポーネントのいずれでも渡せます。どんな HTML を入れてもウィジェット側のレイアウトは崩れません。
- **イベントだけ渡す** — 送信、開閉、入力、発言のクリックなどを DOM イベントで通知します。
  発言 HTML 内のボタンの挙動は、あなたが自由に実装します。

## インストール

```sh
npm install @hidemikimura/chit-ui lit
```

```js
import '@hidemikimura/chit-ui';               // <chit-ui> を登録する
// もしくはタグ名を自分で決める場合:
import { ChitUI } from '@hidemikimura/chit-ui/element.js';
customElements.define('my-chat', ChitUI);
```

ビルド環境がない場合は、Lit を同梱した単一バンドルを `<script>` 1 本で読めます
（`dist/chit-ui.min.js` が ESM 版、`dist/chit-ui.iife.min.js` が `window.ChitUI` を作る IIFE 版）。

## セキュリティ

`html` で渡した文字列は **サニタイズせずにそのまま描画します**。利用者や第三者が書いた内容を
混ぜる場合は、`sanitize` プロパティに DOMPurify などを渡してください。

```js
chat.sanitize = (html) => DOMPurify.sanitize(html);
```

`template` / `element` / `component` で渡したものには `sanitize` は適用されません
（あなたが組み立てたものとして扱います）。

## 開発

```sh
npm install
npm run dev        # demo/ を開いて動作確認
npm run typecheck  # JSDoc の型チェック (tsc --noEmit)
npm test           # Web Test Runner (Chromium / WebKit)
npm run build      # 型定義と単一バンドルを dist/ に出力
```

`npm test` は初回に Playwright のブラウザをダウンロードします。

### リリース前の手動チェック

自動テストでは IME の実挙動を再現しきれないため、リリース前に次を実機で確認します。

- macOS Safari + 日本語 IME: 変換確定の Enter で誤送信しないこと
- iOS Safari: パネルが全画面になり、キーボード表示中も入力欄が隠れないこと
- Android Chrome: 変換中の Enter で誤送信しないこと

## ドキュメント

要件定義と設計ドキュメントは [docs/README.md](docs/README.md) からたどれます。

## ライセンス

MIT
