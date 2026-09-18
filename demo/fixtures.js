// Awkward HTML, for checking that a message can hold anything without the
// widget's own layout giving way.
const svg = (w, h, fill) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
      `<rect width="${w}" height="${h}" fill="${fill}"/></svg>`,
  );

export const fixtures = {
  '巨大画像': `<p>幅 2000px の画像です。</p><img src="${svg(2000, 300, '%232563eb')}" alt="">`,

  '広いテーブル': `<table>
      <tr>${Array.from({ length: 14 }, (_, i) => `<th>列 ${i + 1}</th>`).join('')}</tr>
      <tr>${Array.from({ length: 14 }, (_, i) => `<td>データ ${i + 1}</td>`).join('')}</tr>
    </table>`,

  '長い URL': `<p>参考: https://example.com/${'very-long-path-segment-'.repeat(12)}end</p>`,

  'position: fixed': `<p>下の赤い帯は position: fixed で画面全体を覆おうとしています。</p>
    <div style="position: fixed; inset: 0; background: rgba(220,0,0,.6); color: #fff; padding: 1em;">
      はみ出していなければ封じ込めが効いています
    </div>`,

  '巨大マージン': `<div style="margin: 300px -200px; background: #fde68a; padding: 1em;">
      margin: 300px -200px を持つ要素
    </div>`,

  'コードと引用': `<pre><code>const chat = document.querySelector('chit-ui');
chat.addEventListener('chat-submit', (e) =&gt; console.log(e.detail.text));</code></pre>
    <blockquote>引用のスタイルも既定で当たります。</blockquote>`,

  'ネストしたリスト': `<ol><li>手順 1<ul><li>補足 A</li><li>補足 B</li></ul></li><li>手順 2</li></ol>`,

  'フォーム': `<p>発言の中にフォームを置くこともできます。</p>
    <label>お名前 <input type="text" placeholder="山田太郎"></label>
    <button data-action="submit-name">送信</button>`,
};
