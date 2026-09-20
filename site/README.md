# ドキュメントサイト

人間向けのドキュメントサイトです。ビルド工程はありません。HTML と CSS と ES モジュールが
1 つずつあるだけで、そのまま配れます。

```
site/
├── index.html        トップ（動くウィジェットつき）
├── guide.html        使い方
├── api.html          リファレンス
├── assets/site.css   唯一のスタイルシート
└── assets/site.js    目次・コピーボタン・ページ上のウィジェット
```

## 手元で見る

```sh
npm run build      # dist/ を作る（サイトはローカルではこれを読む）
npm run dev        # http://localhost:8000/site/
```

ローカル（localhost）で開いたときはリポジトリの `dist/chit-ui.min.js` を読みます。
公開先では jsDelivr の配信を読みます。読み込み先は `assets/site.js` の先頭の `VERSION` と
`CDN` だけで決まるので、版を上げたらそこを直してください。

## 公開する

`.github/workflows/pages.yml` が `site/` をそのまま GitHub Pages へ上げます。
リポジトリの Settings → Pages → Source を「GitHub Actions」にすれば、`main` への push で
公開されます。ビルドは走りません（アップロードするだけです）。

ワークフローのファイルは遠隔のツールからは書けない（保護されている）ので、ここを直すときは
手元で編集してください。

## 書き換えるとき

API を変えたら、README.md・`site/`・`skills/` の 3 つを一緒に更新してください。
`api.html` の冒頭には対象バージョンを書いています。

見出しに `id` を付けると、目次（`assets/site.js` が `h2[id]` / `h3[id]` から組み立てます）と
アンカーリンクが自動で付きます。
