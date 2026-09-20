# AI 向けの skill

`chit-ui/` は、Chit UI を組み込む人の AI コーディング支援（Claude Code、Cursor、
その他 skill を読めるツール）向けの説明書です。npm パッケージにも同梱しているので、
`node_modules/@hidemikimura/chit-ui/skills/chit-ui/` からそのまま参照できます。

```
chit-ui/
├── SKILL.md              境界・最小の組み込み・間違えやすいところ
└── references/
    ├── api.md            全プロパティ・イベント・スロット・パーツ・CSS 変数・テーマ
    └── recipes.md        用途別の書き方（ストリーミング、シナリオ型、添付、LIFF ほか）
```

## 使い方

Claude Code なら、プロジェクトの `.claude/skills/` に置くか、シンボリックリンクを張ります。

```sh
mkdir -p .claude/skills
ln -s ../../node_modules/@hidemikimura/chit-ui/skills/chit-ui .claude/skills/chit-ui
```

skill を読み込まないツールでも、`SKILL.md` と `references/` を渡せばそのまま使えます。

## 書くときの約束

人間向けの説明は README.md とドキュメントサイト
（https://hidemikimura.github.io/chit-ui/ ・中身は `site/`）が正本で、ここはその要約では
ありません。**AI が間違えやすいところ**を優先して書きます。`messages` の所有者が利用者側で
あること、`push` では描画されないこと、`text` と `html` の使い分け、`typing` と `loading`
が排他であること、といった「知らないと自然に踏む地雷」が中心です。

API を変えたら、README.md・`site/`・`skills/` の 3 つを一緒に更新してください。
`references/api.md` の冒頭には対象バージョンを書いています。
