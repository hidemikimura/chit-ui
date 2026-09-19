# Chit UI

Web ページに載せるチャットウィジェットの **UI だけ** を提供する、Lit ベースの
JavaScript ライブラリです。通信も会話ロジックも、発言の中に置いたボタンの挙動も持ちません。
持つのは、見た目・状態・入力・イベント通知の 4 つだけです。

- カスタム要素 1 つ（`<chit-ui>`）。Shadow DOM に閉じているので埋め込み先の CSS と干渉しません
- 閉じた状態（ランチャー）・開いた状態（パネル）・非表示の 3 状態
- 状態ごとのテーマ。閉じた状態は PC とスマホで別々に指定できます
- 発言の中身は HTML 文字列でも Lit テンプレートでも `LitElement` を継承したコンポーネントでも可
- 依存は Lit のみ。単一バンドルは gzip 約 19 KB

## はじめに

### `<script>` 1 本で使う

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@hidemikimura/chit-ui/dist/chit-ui.min.js"></script>

<chit-ui id="chat"></chit-ui>

<script type="module">
  const chat = document.getElementById('chat');

  chat.addEventListener('chat-submit', async (event) => {
    const text = event.detail.text;

    // 発言を積むのはあなたのコード。ライブラリは messages を書き換えません。
    // text は自動でエスケープされ、改行もそのまま表示されます
    chat.messages = [...chat.messages, { id: crypto.randomUUID(), role: 'user', text }];

    chat.busy = true;
    chat.typing = true;

    const reply = await yourBackend(text);           // 通信もあなたのコード

    chat.typing = false;
    chat.messages = [...chat.messages,
      { id: crypto.randomUUID(), role: 'assistant', html: reply }];
    chat.busy = false;
  });
</script>
```

### npm から使う

```sh
npm install @hidemikimura/chit-ui lit
```

```js
import '@hidemikimura/chit-ui';        // <chit-ui> を登録する
```

付属テーマは別のエントリから読み込みます（ウィジェット本体は付いてきません）。

```js
import { greenTheme } from '@hidemikimura/chit-ui/themes.js';
```

タグ名を自分で決めたい場合は、登録しないエントリを使います。

```js
import { ChitUI } from '@hidemikimura/chit-ui/element.js';
customElements.define('my-chat', ChitUI);
```

単一バンドル（`dist/chit-ui.min.js`）は Lit を同梱しています。ESM 版のほかに
`window.ChitUI` を作る IIFE 版（`dist/chit-ui.iife.min.js`）もあります。npm 版と
単一バンドル版を同じページで混ぜると Lit が二重に読み込まれるので、どちらか一方にしてください。

## 発言の中身

1 つの発言には、次の 5 つのうち **ちょうど 1 つ** を指定します。

| 指定 | 型 | 向いている場面 |
| --- | --- | --- |
| `text` | 文字列 | 人が入力した文章。エスケープされ、改行が保たれます |
| `html` | 文字列 | サーバーから返ってきた HTML をそのまま出す |
| `template` | Lit の `TemplateResult` | 利用者側が Lit で書いていて、プロパティやイベントをその場で束縛したい |
| `component` + `props` | `LitElement` 継承クラス、またはタグ名 | テンプレートを書かずにコンポーネントを渡したい |
| `element` | `HTMLElement` | 要素の生成と寿命を自分で完全に管理したい |

```js
import { html } from 'lit';
import { OrderCard } from './order-card.js';   // class OrderCard extends LitElement

chat.messages = [
  { id: 'm1', role: 'user',      text: '領収証を再発行したいです\n宛名も変えたいです' },
  { id: 'm2', role: 'assistant', html: '<p>注文履歴から発行できます。</p>' },
  { id: 'm3', role: 'assistant', template: html`<order-card .order=${order} @select=${onSelect}></order-card>` },
  { id: 'm4', role: 'assistant', component: OrderCard, props: { order } },
  { id: 'm5', role: 'assistant', element: myCardElement },
];
```

### 発言オブジェクト

| フィールド | 必須 | 内容 |
| --- | --- | --- |
| `id` | ○ | 差分描画のキー。配列内で一意にしてください |
| `role` | ○ | `user`（右寄せ）/ `assistant`（左寄せ）/ `system`（中央の連絡行） |
| 中身 | ○ | `text` / `html` / `template` / `element` / `component` のいずれか 1 つ |
| `props` | | `component` に渡すプロパティ |
| `time` | | ISO 文字列または `Date`。`formatTime` で表示を差し替えられます |
| `name` / `avatar` | | 発言者名とアイコン画像 URL。テーマの `open.speaker` より優先され、`null` でその発言だけ打ち消せます |
| `status` | | `sending` / `sent` / `error` |
| `streaming` | | `true` の間はカーソルを出し、スクロールを追従させます |
| `meta` | | ライブラリは触りません。イベントでそのまま返ってきます |

### 人が入力した文章は `text` で

`text` はテキストノードとして描画されるので、HTML として解釈されません。エスケープ漏れが
起こりようがなく、`sanitize` も不要です。改行は `white-space: pre-wrap` で保たれるので、
Shift+Enter で入力された複数行がそのまま表示されます。

```js
chat.addEventListener('chat-submit', (event) => {
  chat.messages = [...chat.messages,
    { id: crypto.randomUUID(), role: 'user', text: event.detail.text }];
});
```

`chat-submit` の `text` は入力されたそのままで、前後の空白や改行も削りません。整形が必要なら
利用者側で行ってください。

`html` 形式には `pre-wrap` を当てていません。マークアップ自身の改行やインデントが
空行として見えてしまうためです。HTML の中で改行を見せたい場合は `<br>` を使うか、
その要素に `white-space: pre-wrap` を当ててください。

### コンポーネントを渡すときの注意

`component` にクラスを渡す場合、そのクラスは `customElements.define()` 済みである必要が
あります。ライブラリが勝手にタグ名を付けて登録することはしません（その名前がページ全体で
占有されてしまうため）。未登録のクラスを渡すと例外になります。

コンポーネントは自分の Shadow DOM を持つので、ライブラリの既定スタイルは中まで届きません。
一方でテーマの CSS カスタムプロパティは継承されるので、`var(--chit-color-accent)` などを
参照すればウィジェットと色を揃えられます。

### `template` はひとつの「形」に値を差し込む

Lit がノードを再利用するのは、テンプレートの形（タグ構造）が同じで値だけが変わったときです。
別のテンプレートリテラルは別のテンプレートとして扱われ、DOM が作り直されます。
ストリーミングのように同じ発言を何度も更新する場合は、関数に切り出してください。

```js
const line = (text) => html`<p>${text}</p>`;   // 形はひとつ

chat.messages = [{ id: 'm2', role: 'assistant', template: line(partial), streaming: true }];
```

### 崩れ防止

どんな HTML を入れてもウィジェット側のレイアウトが崩れないよう、発言の中身には次の制約が
掛かります。

- 画像・動画・iframe・SVG・canvas は吹き出しの幅に収まります
- `table` と `pre` は吹き出しを広げず、内部で横スクロールします
- 長い URL や英単語は折り返されます
- 発言の直下に置かれた `position: fixed` / `absolute` は無効化されます
- `contain: layout paint` により、描画が吹き出しの外へ漏れません

発言の中に独自のスタイルを当てたい場合は、`messageStyles` プロパティに CSS 文字列を渡すか、
`html` の中に `<style>` を含めてください。`messageStyles` は既定スタイルより後に適用されます。

## セキュリティ

`html` で渡した文字列は **サニタイズせずにそのまま描画します**。利用者や第三者が書いた内容が
混ざる場合は、`sanitize` に DOMPurify などを渡してください。

```js
chat.sanitize = (html) => DOMPurify.sanitize(html);
```

`sanitize` は `html` 文字列にのみ適用されます。`text` は構造的にエスケープされているので
不要で、`template` / `element` / `component` はあなたが組み立てたものとして扱い、素通しします。

人が入力した文章をそのまま表示するだけなら、`html` ではなく `text` を使えばこの問題自体が
起きません。

## 状態

```js
chat.state;      // 'closed' | 'open' | 'hidden'
chat.state = 'open';             // 代入でも遷移します
await chat.open();               // アニメーション完了で resolve する Promise
```

| 状態 | 表示 | ユーザー操作 | コード |
| --- | --- | --- | --- |
| `closed` | ランチャー | クリック / Enter / Space → `open` | `open()`, `hide()` |
| `open` | パネル | 閉じるボタン / Esc → `closed` | `close()`, `hide()` |
| `hidden` | 何も描画しない | なし | `show()` → `closed`、`open()` → `open` |

`state` は代入した瞬間に変わりますが、DOM は退場アニメーションが終わるまで前の状態を
表示し続けます。いま描画されている状態は `renderedState`（およびホストの
`data-rendered-state` 属性）で読めます。

遷移は `chat-before-open` / `chat-before-close` を `preventDefault()` すると中止できます。

## テーマ

```js
chat.theme = {
  breakpoint: 768,                    // これ未満の幅をスマホとみなす
  closed: {
    pc:     { size: 64, image: '/icon.png', offset: { x: 24, y: 24 } },
    mobile: { size: 56, offset: { x: 16, y: 16 } },
    // size は px、または 'auto'（中身に決めさせる）
  },
  open: {
    width: 380, height: 600,
    colors: { accent: '#2563eb', userBubble: '#2563eb' },
    bubble: { radius: 14, tail: 'none' },   // 吹き出しの角丸としっぽ
    header: { title: 'サポート' },
  },
};
```

- 部分指定で構いません。指定しなかった項目は既定テーマで埋まります
- `null` を渡すと既定値を消せます（`image: null` で既定アイコンを外す、など）
- `closed` を `pc` / `mobile` に分けなければ両方に同じ設定が使われます。`pc` だけ指定した
  場合、スマホは `pc` を引き継ぎつつサイズとオフセットだけ電話向けの既定値になります
- スマホ幅では `open` は常に全画面です（`width` / `height` は無視されます）
- 実行中に差し替えると即座に反映されます（ダークモードの切り替えなど）

### 付属テーマ

見た目を一から決めたくないときは、ライブラリ同梱のプリセットをそのまま渡せます。

```js
import { greenTheme } from '@hidemikimura/chit-ui/themes.js';

chat.theme = greenTheme;
```

`greenTheme` は淡いブルーグレーの会話背景に、相手は白・自分は黄緑の吹き出し、しっぽは
上向き、という緑系メッセンジャーの配色です。特定のサービスのロゴや素材は含みません。
配色は Chit UI 独自のもので、読む必要のある文字と背景の組み合わせはすべて WCAG AA
（4.5:1）を満たしています。テストが全プリセットのコントラストを毎回検証します。

プリセットはただの `Theme` オブジェクトなので、上から重ねて調整できます。

```js
chat.theme = { ...greenTheme, open: { ...greenTheme.open, width: 420 } };
```

`<script>` 1 本で使っている場合は、バンドルから同じ名前で取り出せます。

```js
const { greenTheme } = window.ChitUI;   // IIFE 版
```

### タイトルバー

`open.header` にタイトル文字列とロゴ画像を渡せます。

```js
chat.theme = {
  open: {
    header: { title: 'ecx サポート', logo: '/logo.png' },
  },
};
```

画像とタイトルは左側にひとまとまりで並び、右側に閉じるボタンが残ります。長いタイトルは
省略記号で切り詰められるので、閉じるボタンが押し出されることはありません。`title` は
`role="dialog"` の読み上げ名にも使われます（未指定なら「チャット」/「Chat」）。ロゴは
装飾扱い（`alt=""`）です。隣にタイトルがあり、画像に読み上げ名を重ねても冗長なためです。

バー全体を自分で描くなら `header-title` スロット、ボタンを足すなら `header-actions`
スロット、まるごと差し替えるなら `header` スロットを使ってください。

#### タイトルバーを消す

`header.visible` を `false` にすると、タイトルバーごと出しません。LINE の LIFF のように
外側のアプリが既にタイトルを持っている画面で、タイトルが二重に並ぶのを避けるための設定です。

```js
chat.theme = { open: { header: { visible: false } } };
```

会話はパネルの上端から始まります。`title` を書いておけば、表示はされなくても
`role="dialog"` の読み上げ名としては使われるので、外側のタイトルと別の名前を付けられます。

閉じるボタンもバーごと消える点にご注意ください。Esc とランチャーのクリックでは閉じられますし、
LIFF のように外側が閉じる手段を持っているなら問題になりません。自前の閉じるボタンを置くなら
`footer` スロットか、発言の中のボタンから `chat.close()` を呼んでください。

#### ホームボタン

`header.home` を `true` にすると、閉じるボタンの手前にホームボタンが出ます。シナリオ型の
チャットで、会話を最初からやり直す入口を想定しています。

```js
chat.theme = { open: { header: { title: 'ecx サポート', home: true } } };

chat.addEventListener('chat-home', (event) => {
  chat.messages = scenarioStart;      // 巻き戻すのは利用者側
  chat.typing = false;
});
```

押されても**ウィジェットは何も消しません**。`chat-home`（`detail: { trigger }`）を出すだけです。
`messages` の持ち主は利用者側なので、どこまで巻き戻すか、確認を挟むか、パネルを閉じるかは
そちらで決められます。コードから同じ合図を出すなら `chat.home()` です（`trigger` は `'api'`）。

見た目を変えるなら `::part(home-button)`、別のアイコンにしたいなら `header-actions` スロットに
自前のボタンを置いてください（その場合 `home: false` のままで構いません）。読み上げ名は
ロケールに応じて「最初に戻る」/「Back to the start」になります。

### 添付ボタン

`open.input.attach` を `true` にすると、入力欄の左に添付ボタンが出ます。押すとファイル選択が
開き、選ばれたファイルは `chat-attach` で渡ってきます。

```js
chat.theme = {
  open: {
    input: {
      attach: true,
      accept: 'image/*,video/*',   // 既定。file input にそのまま渡ります
      multiple: false,             // 既定
    },
  },
};

chat.addEventListener('chat-attach', (event) => {
  for (const file of event.detail.files) upload(file);   // 送るのは利用者側
});
```

ウィジェットがやるのは選ばせるところまでです。アップロードもプレビューも発言の追加もしません。
`messages` の持ち主は利用者側で、バイト列の送り先もライブラリは知らないためです。選択後は
file input を空に戻すので、同じファイルを続けて選んでも毎回イベントが出ます。ダイアログを
閉じただけのときは何も起きません。

`busy` と `inputDisabled` の間はボタンも無効になります。コードから開くなら
`chat.openAttach()`、見た目を変えるなら `::part(attach-button)` です。自前の添付フローが
あるなら `attach: false` のまま `input-before` スロットに自分のボタンを置いてください。

### 発言者の名前とアイコン

`open.speaker` に書いておくと、その側の発言すべてに名前とアイコンが出ます。発言ごとに
書く必要はありません。

```js
chat.theme = {
  open: {
    speaker: {
      assistant: { name: 'サポート', avatar: '/support.png' },
      user:      { name: null,       avatar: null },          // 既定（何も出さない）
    },
  },
};
```

発言側の指定が勝ちます。担当者ごとに顔を変えるなら発言に書いてください。

```js
chat.messages = [
  { id: 'a', role: 'assistant', text: 'お待たせしました', name: '田中', avatar: '/tanaka.png' },
];
```

`null` を渡すとその発言だけテーマの指定を打ち消せます。同じ人が続けて話すときに、
2 件目以降のアイコンを省く使い方ができます。このときアイコンの場所は空けたまま残るので、
吹き出しの左端は揃います。

```js
chat.messages = [
  { id: 'a', role: 'assistant', text: '承知しました' },
  { id: 'b', role: 'assistant', text: '少々お待ちください', avatar: null, name: null },
];
```

`system` の発言は中央寄せの連絡行なので、名前もアイコンも出ません。会話の参加者ではなく
ウィジェットが会話について述べている行、という位置づけのためです。

### 吹き出しのしっぽ

`open.bubble` で吹き出しの角丸としっぽを決めます。

```js
chat.theme = { open: { bubble: { radius: 18, tail: 'top' } } };
```

| 値 | 意味 |
| --- | --- |
| `tail: 'none'`（既定） | しっぽなし。話し手側の角だけ小さく落とした形になります |
| `tail: 'top'` | 吹き出しの上寄りに三角のしっぽを付けます |
| `tail: 'bottom'` | 下寄りに付けます |

しっぽは話し手の側（相手は左、自分は右）に、その吹き出しと同じ色の葉のような形で描かれます。
根元は吹き出しの内側に潜り込ませてあるので、継ぎ目は吹き出しの地色に隠れます。角丸はどの角も
そのままで、角丸の値をいくつにしても隙間は出ません。付く高さは角丸に合わせて少し下げてあり、
縁がまっすぐになったところに根元が乗ります。入力中インジケーターにも同じしっぽが付きます。

しっぽを出すと、話し手側の角を落とす既定の形はなくなります。ひとつの吹き出しに話し手を示す印が
ふたつあると読みにくいためです。

しっぽの形は `clip-path: path()` で描いています。これに対応していないブラウザでは、変な形が
はみ出すよりはと考えて、しっぽを出さず既定の吹き出しのままにしています。

### 閉じた状態を自分で描く

`closed.component` に `LitElement` を継承したコンポーネント（またはタグ名）を渡すと、
閉じた状態の見た目をまるごと差し替えられます。**大きさはコンポーネント側が決めます。**

```js
import { PillLauncher } from './pill-launcher.js';   // class PillLauncher extends LitElement

chat.theme = {
  closed: {
    component: PillLauncher,
    props: { unread: 3, online: true },
    label: 'サポートに相談',      // ボタンの読み上げ名に使われます
  },
};
```

このとき外側のボタンは、幅・高さ・背景・影・角丸・余白をすべて手放します。ひとつの箱を
2 者がスタイルすると、はみ出しや切り取りが起きるためです。ボタンであること自体は残るので、
キーボード操作とスクリーンリーダーからの見え方は変わりません。読み上げ名は `closed.label`、
なければ既定の文言になります。

`props` を差し替えると、同じコンポーネントインスタンスに書き込まれます（作り直されません）。
未読バッジのように状態を持つランチャーは、この経路で更新してください。

```js
chat.theme = { ...chat.theme, closed: { ...chat.theme.closed, props: { unread: 4 } } };
```

`launcher` スロットとの使い分けは、ウィジェットの丸いボタンを残すかどうかです。スロットは
既定の円の**中に**あなたの中身を置き、`component` は円ごと置き換えます。スロットを使いつつ
大きさだけ中身に決めさせたい場合は `closed.size` に `'auto'` を指定します。

### スクロールの追従

新しい発言が届いたとき、最下部にいる読み手の画面はアニメーションで追従します。
`open.animation.scroll` に `'instant'` を指定すると即座に移動します。

```js
chat.theme = { open: { animation: { scroll: 'instant' } } };
```

ひとつの発言が伸びていく場合（ストリーミング、画像の読み込み）は設定によらず即時です。
数十ミリ秒ごとにアニメーションをやり直すと表示が文字に追いつかないうえ、アニメーション中の
スクロール位置が「最下部にいない」と読めてしまい、追従そのものが止まるためです。
`prefers-reduced-motion` が有効な環境でも即時になります。

テーマの値は CSS カスタムプロパティになるので、ページ側の CSS からも上書きできます。
こちらが優先されます。

```css
chit-ui {
  --chit-color-accent: #d81b60;
  --chit-launcher-size: 72px;
}
```

公開しているカスタムプロパティは次の 33 個です。

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

アニメーションの長さは CSS 変数にしていません。遷移の完了を JavaScript 側が知る必要があり、
テーマの `animation.duration` が唯一の設定箇所になるためです。

`--_chit-` で始まる変数は内部用なので、変更しないでください。

## プロパティ

| プロパティ | 型 | 既定 | 内容 |
| --- | --- | --- | --- |
| `state` | `'closed' \| 'open' \| 'hidden'` | `'closed'` | 現在の状態 |
| `theme` | `Theme` | `{}` | テーマ（部分指定可） |
| `messages` | `Message[]` | `[]` | 描画する発言 |
| `typing` | `boolean \| { html }` | `false` | 相手が入力中の表示 |
| `busy` | `boolean` | `false` | 送信中。入力をロックします |
| `inputDisabled` / `inputHidden` | `boolean` | `false` | 入力欄の無効化 / 非表示 |
| `value` | `string` | `''` | 入力欄の内容 |
| `placeholder` | `string` | テーマの値 | 入力欄のプレースホルダー |
| `sendOnEnter` | `boolean` | `true` | Enter で送信するか |
| `maxLength` | `number` | なし | 入力文字数の上限（コードポイント単位） |
| `focusOnOpen` | `'auto' \| 'always' \| 'never'` | `'auto'` | 開いたときの自動フォーカス。`auto` は PC のみ |
| `sanitize` | `(html) => string` | なし | `html` 発言のサニタイズ |
| `formatTime` | `(time: Date) => string` | `HH:mm` | 時刻表示 |
| `messageStyles` | `string` | `''` | 発言の中に適用する追加 CSS |
| `locale` | `string` | `<html lang>` | ラベルと時刻の言語 |
| `labels` | `Partial<Labels>` | なし | UI 文字列の上書き |

読み取り専用: `renderedState`、`device`（`'pc' \| 'mobile'`）、`hasUnseen`、`canSend`、
`currentTheme`、`currentLabels`、`resolvedLocale`。

## メソッド

| メソッド | 内容 |
| --- | --- |
| `open()` / `close()` / `hide()` / `show()` / `toggle()` | 状態遷移。アニメーション完了で resolve する Promise を返します（中止された場合は `false`） |
| `submit(text?)` | `chat-submit` を発火します。省略時は入力欄の内容 |
| `focusInput()` / `clearInput()` | 入力欄の操作 |
| `scrollToBottom({ smooth })` | 最新の発言までスクロール。`smooth` 省略時はテーマの設定に従う |
| `getMessageElement(id)` | その発言のコンテナ DOM（未描画なら `null`） |
| `home()` | `chat-home` を発火します（ホームボタンと同じ合図） |
| `openAttach()` | 添付のファイル選択を開きます（添付ボタンと同じ） |

## イベント

すべて `chat-` プレフィックス付きの `CustomEvent` で、`bubbles` と `composed` が立っている
ので `document` でも拾えます。

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
| `chat-home` | ホームボタンが押された（または `home()`） | `{ trigger }` | |
| `chat-attach` | 添付ファイルが選ばれた | `{ files }`（`File[]`） | |

`trigger` は `'user'`（クリックや Esc）か `'api'`（メソッドやプロパティ代入）です。

### 発言の中のボタンを動かす

発言 HTML の中のボタンは、`chat-message-click` で一括して受けるのが簡単です。
`target` はコンポーネントの Shadow DOM 内でクリックされた要素まで辿って返ります。

```js
chat.addEventListener('chat-message-click', (event) => {
  const action = event.detail.target.closest('[data-action]')?.dataset.action;
  if (action === 'open-orders') showOrders(event.detail.message.meta);
});
```

描画のたびに個別のリスナーを付けたい場合は `chat-message-render` を使います。

## スロット

| スロット | 差し替え対象 |
| --- | --- |
| `launcher` | 閉じた状態のアイコンの中身（未読バッジなどもここで） |
| `header` | パネルヘッダー全体。`header-title` / `header-actions` で部分差し替えも可 |
| `empty` | 発言が 1 件もないときの表示 |
| `input-before` / `input-after` | 入力欄の前後（添付ボタンなど） |
| `composer` | 入力欄全体。差し替えた場合は `submit(text)` を自分で呼びます |
| `footer` | 入力欄の下（免責事項など） |

## CSS パーツ

`::part()` で外部からスタイルを当てられます。

`launcher` `launcher-icon` `launcher-label` `panel` `header` `header-title` `header-heading` `header-logo`
`home-button` `attach-button` `attach-input`
`header-actions` `close-button` `messages` `messages-inner` `message` `message-user`
`message-assistant` `message-system` `bubble` `message-content` `avatar` `name` `meta` `time`
`status` `cursor` `typing` `to-latest` `composer` `input` `counter` `send-button` `spinner`

パーツ名・プロパティ名・イベント名・スロット名・CSS カスタムプロパティ名は公開 API として
扱い、変更はメジャーバージョンでのみ行います。

## アクセシビリティ

- ランチャーは `button`、パネルは `role="dialog"`、メッセージ一覧は `role="log"` +
  `aria-live="polite"`
- Esc で閉じ、開閉に合わせてフォーカスをランチャーとパネルの間で移します
- ストリーミング中の発言は `aria-busy="true"` なので、1 文字ずつ読み上げられません
- `prefers-reduced-motion` を尊重します
- 既定テーマの文字色と背景色の組み合わせはすべて WCAG AA（4.5:1）以上です
- `npm run audit:a11y` で axe-core による監査を実行できます（6 状態、違反 0 を維持）

## ブラウザ

Chrome / Edge / Firefox / Safari の最新 2 バージョンと iOS Safari 16 以降。IE は非対応です。

吹き出しのしっぽだけは `clip-path: path()` を使っています。対応していないブラウザでは
しっぽを出さず、通常の吹き出しとして表示します（他の機能には影響しません）。

## 開発

```sh
npm install
npm run dev          # demo/ を開いて動作確認
npm run typecheck    # JSDoc の型チェック
npm test             # Web Test Runner（Chromium / WebKit）
npm run audit:a11y   # axe-core による監査
npm run build        # 型定義と単一バンドルを dist/ に出力
npm run check        # 上記をまとめて
```

### リリース前の手動チェック

IME の実挙動は合成イベントでは再現しきれないため、リリース前に実機で確認します。

- macOS Safari + 日本語 IME: 変換確定の Enter で誤送信しないこと
- iOS Safari: パネルが全画面になり、キーボード表示中も入力欄が隠れないこと
- Android Chrome: 変換中の Enter で誤送信しないこと
- iOS Safari / Android Chrome: 添付ボタンからカメラとフォトライブラリが開けること
  （`accept` はブラウザによって扱いが違うため）

### 公開

```sh
npm login
npm run check      # typecheck + test + axe 監査
npm publish        # prepublishOnly がビルドとテストを流し直します
```

`publishConfig` に `access: public` を入れてあるので `--access public` は不要です。
公開したら `git tag v0.2.0 && git push --tags` を忘れずに。変更点は
[CHANGELOG.md](./CHANGELOG.md) にまとめています。

## ライセンス

MIT
