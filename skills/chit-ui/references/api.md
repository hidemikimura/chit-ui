# Chit UI API リファレンス

`@hidemikimura/chit-ui` 0.3.2 時点。パーツ名・プロパティ名・イベント名・スロット名・
CSS カスタムプロパティ名は公開 API で、変更はメジャーバージョンでのみ行う。

## プロパティ

| プロパティ | 型 | 既定 | 内容 |
| --- | --- | --- | --- |
| `state` | `'closed' \| 'open' \| 'hidden'` | `'closed'` | 現在の状態 |
| `theme` | `Theme` | `{}` | テーマ（部分指定可） |
| `messages` | `Message[]` | `[]` | 描画する発言。必ず新しい配列を代入する |
| `typing` | `boolean \| { html }` | `false` | 相手が入力中の表示。`loading` とは排他 |
| `loading` | `boolean` | `false` | 応答待ちの表示。`typing` とは排他。属性にも反映される |
| `busy` | `boolean` | `false` | 送信中。入力をロックする |
| `inputDisabled` | `boolean` | `false` | 入力欄を見せたままロック |
| `inputHidden` | `boolean` | `false` | 入力欄を消す（`submit(text)` は使える） |
| `value` | `string` | `''` | 入力欄の内容 |
| `placeholder` | `string` | テーマの値 | 入力欄のプレースホルダー |
| `sendOnEnter` | `boolean` | `true` | Enter で送信するか |
| `maxLength` | `number` | なし | 入力の上限（コードポイント単位） |
| `focusOnOpen` | `'auto' \| 'always' \| 'never'` | `'auto'` | 開いたときの自動フォーカス。`auto` は PC のみ |
| `sanitize` | `(html: string) => string` | なし | `html` 発言のサニタイズ |
| `formatTime` | `(time: Date) => string` | `HH:mm` | 時刻表示 |
| `messageStyles` | `string` | `''` | 発言の中に適用する追加 CSS |
| `locale` | `string` | `<html lang>` | ラベルと時刻の言語（`ja` / `en`） |
| `labels` | `Partial<Labels>` | なし | UI 文字列の上書き |
| `dragOffset` | `{ x, y } \| null` | `null` | ドラッグで生じたずれ。読み書きできる |

読み取り専用: `renderedState` `device`（`'pc' \| 'mobile'`）`hasUnseen` `canSend`
`currentTheme` `currentLabels` `resolvedLocale`。

## メソッド

| メソッド | 内容 |
| --- | --- |
| `open()` `close()` `hide()` `show()` `toggle()` | 状態遷移。アニメーション完了で resolve する `Promise<boolean>`（中止なら `false`） |
| `submit(text?)` | `chat-submit` を発火。省略時は入力欄の内容 |
| `focusInput()` `clearInput()` | 入力欄の操作 |
| `scrollToBottom({ smooth })` | 最新へスクロール。省略時はテーマの設定に従う |
| `getMessageElement(id)` | その発言のコンテナ DOM（未描画なら `null`） |
| `home()` | `chat-home` を発火（ホームボタンと同じ） |
| `openAttach()` | 添付のファイル選択を開く |
| `resetPosition()` | ドラッグで動かした位置を忘れる |

## イベント

すべて `CustomEvent`。`bubbles` と `composed` が立っているので `document` でも拾える。

| イベント | タイミング | `detail` | 中止 |
| --- | --- | --- | --- |
| `chat-submit` | 送信された | `{ text }` | ○ |
| `chat-before-open` / `chat-before-close` | 遷移の直前 | `{ from, trigger }` | ○ |
| `chat-open` / `chat-close` | 遷移アニメーション完了 | `{ from, trigger }` | |
| `chat-hide` / `chat-show` | 非表示になった / 戻った | `{ from, to }` | |
| `chat-state-change` | `state` が変わった直後 | `{ from, to, trigger }` | |
| `chat-input` | 入力欄が編集された | `{ value }` | |
| `chat-message-render` | 発言が描画・更新された | `{ message, element, instance }` | |
| `chat-message-click` | 発言の中がクリックされた | `{ message, target, originalEvent }` | ○ |
| `chat-scroll-top` | 一覧が最上部に達した | `{}` | |
| `chat-breakpoint-change` | PC / スマホの判定が変わった | `{ device }` | |
| `chat-home` | ホームボタン、または `home()` | `{ trigger }` | |
| `chat-attach` | 添付ファイルが選ばれた | `{ files: File[] }` | |
| `chat-move` | ドラッグまたは矢印キー | `{ target, position, offset, displacement }` | |

`trigger` は `'user'`（クリックや Esc）か `'api'`（メソッドやプロパティ代入）。

## 発言オブジェクト

```ts
{
  id: string,                       // 必須・安定していること
  role: 'user' | 'assistant' | 'system',
  name?: string | null,             // テーマの既定を打ち消すなら null
  avatar?: string | null,
  time?: Date | string | number,
  status?: 'sending' | 'sent' | 'error',
  streaming?: boolean,              // 末尾にカーソル、aria-busy
  meta?: unknown,                   // 利用者の自由欄。イベントでそのまま返る
  // 以下のいずれか 1 つ
  text?: string,
  html?: string,
  template?: TemplateResult,
  element?: HTMLElement,
  component?: (new () => HTMLElement) | string,
  props?: Record<string, unknown>,  // component のとき
}
```

## テーマ

```ts
{
  breakpoint?: number,              // 既定 768。これ未満をスマホとみなす
  closed?: {
    // pc / mobile に分けて書ける。分けなければ両方に同じ設定
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left',
    offset?: { x: number, y: number },
    size?: number | 'auto',
    radius?: number,
    image?: string | null,
    label?: string | null,
    component?: (new () => HTMLElement) | string,
    props?: Record<string, unknown>,
    colors?: { bg?, text?, shadow? },
    draggable?: boolean,            // 既定 false
    animation?: { enter?, exit?, duration? },
  },
  open?: {
    width?: number, height?: number,         // スマホでは無視（常に全画面）
    position?: Position, offset?: { x, y },
    radius?: number,
    launcher?: 'hidden' | 'visible',
    draggable?: boolean,                     // 取っ手はタイトルバー。スマホでは無効
    header?: { visible?: boolean, title?: string | null, logo?: string | null, home?: boolean },
    bubble?: { radius?: number, tail?: 'none' | 'top' | 'bottom' },
    speaker?: { assistant?: { name?, avatar? }, user?: { name?, avatar? } },
    loading?: { auto?: boolean, style?: 'dots' | 'spinner' | 'text', text?: string | null, timeout?: number },
    input?: { maxRows?: number, placeholder?: string | null, attach?: boolean, accept?: string, multiple?: boolean },
    colors?: { bg?, text?, accent?, border?, userBubble?, userText?, assistantBubble?,
               assistantText?, systemText?, headerBg?, headerText?, inputBg?, inputText?,
               inputPlaceholder? },
    bgImage?: string | null,
    animation?: { enter?, exit?, duration?, scroll?: 'smooth' | 'instant' },
  },
  hidden?: { animation?: { exit?, duration? } },
}
```

`animation` の `enter` / `exit` は `'fade' | 'scale' | 'slide' | 'none'`。

## スロット

| スロット | 差し替え対象 |
| --- | --- |
| `launcher` | 閉じた状態のアイコンの中身 |
| `header` | パネルヘッダー全体（`header-title` / `header-actions` で部分差し替えも可） |
| `empty` | 発言が 1 件もないときの表示 |
| `input-before` / `input-after` | 入力欄の前後 |
| `composer` | 入力欄全体。差し替えたら `submit(text)` を自分で呼ぶ |
| `footer` | 入力欄の下（免責事項など） |

## CSS パーツ

`launcher` `launcher-icon` `launcher-label` `panel` `header` `header-title`
`header-heading` `header-logo` `header-actions` `home-button` `close-button`
`messages` `messages-inner` `message` `message-user` `message-assistant`
`message-system` `bubble` `message-content` `avatar` `name` `meta` `time` `status`
`cursor` `typing` `loading` `loading-text` `to-latest` `composer` `input`
`attach-button` `attach-input` `counter` `send-button` `spinner`

## CSS カスタムプロパティ（33）

色: `--chit-color-bg` `--chit-color-text` `--chit-color-accent` `--chit-color-border`
`--chit-color-user-bg` `--chit-color-user-text` `--chit-color-assistant-bg`
`--chit-color-assistant-text` `--chit-color-system-text` `--chit-color-header-bg`
`--chit-color-header-text` `--chit-color-input-bg` `--chit-color-input-text`
`--chit-color-input-placeholder`

ランチャー: `--chit-launcher-size` `--chit-launcher-radius` `--chit-launcher-offset-x`
`--chit-launcher-offset-y` `--chit-launcher-bg` `--chit-launcher-text`
`--chit-launcher-shadow` `--chit-launcher-image`

吹き出し: `--chit-bubble-radius`

パネル: `--chit-panel-width` `--chit-panel-height` `--chit-panel-radius`
`--chit-panel-offset-x` `--chit-panel-offset-y` `--chit-panel-shadow`
`--chit-panel-bg-image`

全体: `--chit-font-family` `--chit-font-size` `--chit-z-index`

アニメーションの長さは CSS 変数にしていない（遷移の完了を JavaScript 側が知る必要が
あるため、テーマの `animation.duration` が唯一の設定箇所）。

## エントリポイント

| 指定 | 中身 |
| --- | --- |
| `@hidemikimura/chit-ui` | `<chit-ui>` を登録する。型もここから読める |
| `@hidemikimura/chit-ui/element.js` | 登録しない。`ChitUI` クラスだけ |
| `@hidemikimura/chit-ui/themes.js` | 付属テーマ（`greenTheme`） |
| `dist/chit-ui.min.js` | Lit 同梱の ESM 単一バンドル |
| `dist/chit-ui.iife.min.js` | 同上の IIFE 版。`window.ChitUI` |

## 対応ブラウザ

Chrome / Edge / Firefox / Safari の最新 2 バージョンと iOS Safari 16 以降。
吹き出しのしっぽだけ `clip-path: path()` を使っていて、非対応の環境ではしっぽが出ない
（他の機能には影響しない）。
