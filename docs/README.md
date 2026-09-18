# ドキュメント

要件定義と設計は Claude Docs 上の生きたドキュメントが正本です。変更はそちらに入れ、
このリポジトリには写しを置きません（二重管理を避けるため）。

- 要件定義: https://claude.ai/code/artifact/b1b2b667-8bd8-45d4-b247-53e02bddb68c
- 設計ドキュメント: https://claude.ai/code/artifact/18b3f4b3-b877-447c-ba8b-a24113871aff

Markdown / PDF が必要なときは、各ドキュメントの画面からエクスポートしてください。

## このリポジトリで完結している決めごと

コードから読み取れる範囲の決定は、それぞれの場所にコメントとして残しています。

| 決定 | 場所 |
| --- | --- |
| 公開プロパティとその既定値 | `src/chit-ui.js` の `static properties` とコンストラクタ |
| イベント名 | `src/events.js` の `Events` |
| 公開する型 | `src/types.js`（JSDoc typedef）と `src/global.d.ts` |
| CSS カスタムプロパティのフォールバック値 | `src/styles/host.css.js` |
| バンドルサイズの上限 | `scripts/check-size.js` |
