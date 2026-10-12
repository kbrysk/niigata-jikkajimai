// 登録特典「新潟の実家じまい 完全ガイド」（PDF）の申し込み導線。build.mjs から呼ぶ。
// - /kanzen-guide/          申し込みページ（フォーム）
// - 追従CTA（floatCta）       全ページ右下（PCのみ。スマホは下部の固定バーの左ボタン）
// - /lead/sequence.json     ステップメールの本文（content/lead/sequence.md が元）。Google Apps Script（scripts/gas/lead_mail.gs）が読む
// 申し込みの送り先は site.json の lead.endpoint（Apps Script のウェブアプリ）。空のあいだは、既存の Google フォームに
// 「その他のお問い合わせ」として送る（申し込みを取りこぼさないため）。どちらの場合も、送信後すぐに PDF を開けるようにする。
import fs from "node:fs";
import path from "node:path";
import { icon } from "./icons.mjs";

export const LEAD_PATH = "/kanzen-guide/";
export const LEAD_PDF = "/dl/niigata-jikkajimai-kanzen-guide.pdf";

export function setupLead({ ROOT, SITE, esc, url, abs, cities, prices, roadmap }) {
  const L = SITE.lead || {};
  const pdfFile = path.join(ROOT, "public", LEAD_PDF);
  const hasPdf = fs.existsSync(pdfFile);
  // ページ数は PDF の中身から数える（手で書かない）
  const pages = hasPdf ? (fs.readFileSync(pdfFile, "latin1").match(/\/Type\s*\/Page[^s]/g) || []).length : 0;

  // ---------- ステップメール（sequence.md → JSON） ----------
  const seqSrc = fs.existsSync(path.join(ROOT, "content/lead/sequence.md")) ? fs.readFileSync(path.join(ROOT, "content/lead/sequence.md"), "utf8").replace(/\r\n?/g, "\n") : "";
  const fm = (seqSrc.match(/^---\n([\s\S]*?)\n---\n/) || [])[1] || "";
  const approved = /^approved:\s*true\s*$/m.test(fm);
  const steps = seqSrc.split(/\n## step:\s*/).slice(1).map((blk) => {
    const [head, ...rest] = blk.split("\n");
    const lines = rest.join("\n").replace(/^\n+/, "");
    const offsetDays = Number((lines.match(/^offsetDays:\s*(\d+)/m) || [])[1] || 0);
    const subject = (lines.match(/^subject:\s*(.+)$/m) || [])[1] || "";
    const body = lines.replace(/^offsetDays:.*\n/m, "").replace(/^subject:.*\n/m, "").trim();
    return { step: Number(head.trim()), offsetDays, subject, body };
  });
  const cs = prices.companies || [];
  const minOf = (k) => { const v = cs.map((x) => x[k]).filter(Boolean); return v.length ? `${Math.min(...v).toLocaleString("ja-JP")}円` : ""; };
  const sequence = {
    approved,
    senderName: SITE.name,
    pdfPath: LEAD_PDF,
    pdfName: "新潟の実家じまい_完全ガイド.pdf",
    situations: Object.fromEntries((roadmap.situations || []).map((s) => [s.id, { label: s.label, first: s.first || [] }])),
    cities: Object.fromEntries(cities.map((c) => [c.cityId, { name: c.city }])),
    prices: { count: cs.length, k1: minOf("k1"), ldk3: minOf("ldk3") },
    footer: [
      "────────────",
      `${SITE.name}（運営: ${SITE.operator}）`,
      SITE.operatorAddress ? `所在地: ${SITE.operatorAddress}` : "",
      SITE.contactFormUrl ? `お問い合わせ: ${SITE.contactFormUrl}` : "",
      "このメールは、「新潟の実家じまい 完全ガイド」のお申し込み時に、メールの受け取りに同意いただいた方にお送りしています。",
      "配信の停止（いつでも解除できます）: {{unsubscribe_url}}",
    ].filter(Boolean).join("\n"),
    steps,
  };
  const mailOn = Boolean(L.endpoint) && approved;

  // ---------- 追従CTA ----------
  const miniCover = `<span class="fc-cover" aria-hidden="true"><span></span><span></span><span></span></span>`;
  const floatCta = (pathname) => (!hasPdf || [LEAD_PATH, "/mitsumori/", "/keisai/"].includes(pathname) ? "" : `<aside class="float-cta" aria-label="無料ガイドの案内" data-float-cta>
  <a class="fc-main" href="${url(LEAD_PATH)}" data-cta="float">${miniCover}<span class="fc-t"><small>無料PDF・${pages}ページ</small><strong>新潟の実家じまい 完全ガイド</strong><span class="fc-sub">期限の早見表・30市町村のごみ早見表つき</span><span class="fc-btn">無料で受け取る${icon("arrow", "ic sm")}</span></span></a>
  <button type="button" class="fc-min" aria-label="案内を小さくする" data-fc-min>×</button>
  <a class="fc-tab" href="${url(LEAD_PATH)}" data-cta="float-tab">${icon("book", "ic sm")}無料ガイド</a>
</aside>`);
  const floatScript = `<script>(function(){var d=document,f=d.querySelector('[data-float-cta]');if(!f)return;var K='nj-fc-min',R='nj-guide-registered';
function get(k){try{return localStorage.getItem(k)}catch(e){return null}}function set(k,v){try{localStorage.setItem(k,v)}catch(e){}}
var m=Number(get(K)||0);if(m&&Date.now()-m<3*864e5)f.classList.add('is-min');
if(get(R)){f.querySelectorAll('a').forEach(function(a){a.href=${JSON.stringify(url(LEAD_PDF))};a.target='_blank';});var b=f.querySelector('.fc-btn');if(b)b.firstChild.textContent='ガイドを開く';}
f.querySelector('[data-fc-min]').addEventListener('click',function(){f.classList.add('is-min');set(K,String(Date.now()));});
f.querySelector('.fc-tab').addEventListener('click',function(){set(K,'0');});
f.addEventListener('click',function(e){var a=e.target.closest('a[data-cta]');if(a&&window.gtag)gtag('event','guide_cta_click',{position:a.getAttribute('data-cta'),page_path:location.pathname});});
})();</script>`;
  const mobileBtn = hasPdf ? `<a class="btn ghost" href="${url(LEAD_PATH)}" data-cta="sticky">${icon("book", "ic sm")}無料ガイドPDF</a>` : "";

  // ---------- 申し込みページ ----------
  const stages = roadmap.stages || [];
  const todoCount = stages.reduce((n, st) => n + (st.todo || []).length, 0);
  const STAGE_ICON = ["talk", "doc", "box", "truck", "house"];
  const SIT_ICON = { s1: "people", s2: "building", s3: "calendar", s4: "house" };
  const inside = [
    ["people", "状況別の「最初にやること」", `親が元気なうち・施設に入った・亡くなった・空き家になった、の${(roadmap.situations || []).length}つの状況ごとに。`],
    ["calendar", `期限のある手続きの早見表（${(roadmap.deadlines || []).length}項目）`, "死亡届の7日から、相続登記の3年、空き家の特別控除まで。数え始めと窓口つき。"],
    ["check", `${stages.length}段階のやることチェックリスト（${todoCount}項目）`, "決める・期限のある手続き・仕分け・片付け・家の行き先。印刷して使えます。"],
    ["snow", `新潟では、いつやるか（${(roadmap.season || []).length}か月の目安）`, "雪の前に終えること、年末年始に避けること。"],
    ["trash", "新潟県30市町村 粗大ごみ早見表", "手数料の仕組みと申し込み先を、公式サイトから転記。"],
    ["calc", "業者の料金の目安と、見積もりで確かめる6つのこと", `県内${cs.length}社の公開料金を間取り別に集計。`],
  ];
  const situationOpts = (roadmap.situations || []).map((s) => `<label class="lf-sit"><input type="radio" name="situation" value="${esc(s.id)}"><span class="ic-badge">${icon(SIT_ICON[s.id] || "route")}</span><span>${esc(s.label)}</span></label>`).join("");
  const form = `<form class="guide-form" id="guide-form" novalidate data-endpoint="${esc(L.endpoint || "")}">
  <p class="gf-h">${icon("book")}無料でガイドを受け取る</p>
  <label for="gf-email">メールアドレス<span class="req">必須</span></label>
  <input id="gf-email" name="email" type="email" required autocomplete="email" inputmode="email" placeholder="例: taro@example.com">
  <label for="gf-city">実家のある市町村<span class="opt">任意</span></label>
  <select id="gf-city" name="city"><option value="">選ばない</option>${cities.map((c) => `<option value="${esc(c.cityId)}">${esc(c.city)}</option>`).join("")}</select>
  <fieldset><legend>いまの状況<span class="opt">任意</span></legend><div class="lf-sits">${situationOpts}</div></fieldset>
  <div class="hp" aria-hidden="true"><label>ウェブサイト<input name="website" tabindex="-1" autocomplete="off"></label></div>
  <label class="gf-consent"><input type="checkbox" name="consent" value="yes" required><span>ガイドの送付と、実家じまいのヒントのメール（全${steps.length || 5}回）を受け取ること、および<a href="${url("/privacy/")}" target="_blank" rel="noopener">プライバシーポリシー</a>に同意します。</span></label>
  <p class="gf-err" role="alert" hidden></p>
  <button class="btn gf-submit" type="submit">無料でガイドを受け取る</button>
  <p class="small">メールはいつでも配信を停止できます。メールアドレスは、ガイドの送付とメール配信の管理だけに使います。</p>
</form>
<div class="guide-done" id="guide-done" hidden tabindex="-1">
  <p class="gd-h">${icon("check")}お申し込みありがとうございます</p>
  <p>${mailOn ? "ご登録のメールアドレスに、ガイド（PDF）をお送りしました。届かない場合は、迷惑メールのフォルダもご確認ください。すぐに読むなら、下のボタンから開けます。" : "下のボタンから、ガイド（PDF）を開けます。保存や印刷もできます。"}</p>
  <p><a class="btn" href="${url(LEAD_PDF)}" target="_blank" rel="noopener" data-cta="download">${icon("book", "ic sm")}完全ガイド（PDF）を開く</a></p>
  <p class="small">まず1章で、いまの状況に近いものを選んでください。<a href="${url("/guide/jikkajimai-tejun-niigata/")}">サイトの進め方ページ</a>でも同じ内容を確かめられます。</p>
</div>`;
  const leadScript = `<script>(function(){var f=document.getElementById('guide-form');if(!f)return;var done=document.getElementById('guide-done'),err=f.querySelector('.gf-err');
var ep=f.getAttribute('data-endpoint');var gf=${JSON.stringify(SITE.formEndpoint || "")};var en=${JSON.stringify(SITE.formEntries || {})};
f.addEventListener('submit',function(e){e.preventDefault();var em=(f.email.value||'').trim();err.hidden=true;
if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(em)){err.textContent='メールアドレスを確かめてください。';err.hidden=false;f.email.focus();return;}
if(!f.consent.checked){err.textContent='受け取りとプライバシーポリシーへの同意にチェックを入れてください。';err.hidden=false;return;}
if(f.website.value){return;}
var sit=(f.querySelector('input[name=situation]:checked')||{}).value||'';var city=f.city.value;var cityName=city?f.city.options[f.city.selectedIndex].text:'';
var btn=f.querySelector('.gf-submit');btn.disabled=true;btn.textContent='送信中…';
var p=new URLSearchParams(),req;
if(ep){p.append('email',em);p.append('city',city);p.append('situation',sit);p.append('consent','yes');p.append('page',location.pathname+location.search);req=fetch(ep,{method:'POST',mode:'no-cors',body:p});}
else if(gf&&en.kind){var sl=(f.querySelector('input[name=situation]:checked+span+span')||{}).textContent||'';p.append(en.kind,'その他のお問い合わせ');p.append(en.name,'（完全ガイドPDFの申し込み）');p.append(en.contact,em);p.append(en.message,'【完全ガイドPDFの申し込み】\\n市町村: '+(cityName||'（選ばない）')+'\\n状況: '+(sl||'（選ばない）')+'\\nメールの受け取りとプライバシーポリシーへの同意: あり（'+new Date().toLocaleString('ja-JP')+'）\\n送信元: '+location.href);req=fetch(gf,{method:'POST',mode:'no-cors',body:p});}
else{req=Promise.resolve();}
function fin(){try{localStorage.setItem('nj-guide-registered','1')}catch(_){}try{if(window.gtag)gtag('event','lead_submit',{lead_kind:'kanzen_guide',lead_type:sit,city:city});}catch(_){}
f.hidden=true;done.hidden=false;done.focus();done.scrollIntoView({behavior:'smooth',block:'center'});}
req.then(fin,fin);});})();</script>`;

  const timeline = steps.map((s) => `<li><span class="tl-d">${s.offsetDays === 0 ? "すぐ" : `${s.offsetDays}日後`}</span><span class="tl-s">${esc(s.subject.replace(/^【[^】]+】/, ""))}</span></li>`).join("");
  const landingBody = `<article class="lead-page">
<section class="lead-hero"><div class="inner">
  <div class="lh-text">
    <p class="eyebrow">無料ガイドブック（PDF・${pages}ページ）</p>
    <h1>新潟の実家じまい<br>完全ガイド</h1>
    <p class="lead">親が元気なうちの準備から、亡くなったあとの手続き、片付け、空き家の行き先と冬の管理まで。期限・手順・費用と、新潟県内の窓口を1冊にまとめました。印刷して、家族の話し合いにも使えます。</p>
    <div class="lh-cover" aria-hidden="true"><p class="lc-site">${esc(SITE.name)}</p><p class="lc-t">新潟の実家じまい<br>完全ガイド</p><ul>${stages.map((st, i) => `<li>${icon(STAGE_ICON[i] || "doc")}<span>${esc(st.title)}</span></li>`).join("")}</ul></div>
  </div>
  <div class="lh-form">${form}</div>
</div></section>
<section class="home-section"><h2>${icon("book", "ic")}このガイドでわかること</h2><ul class="qn-grid cols3 lead-inside">${inside.map(([ic, t, d]) => `<li><div class="li-card"><span class="ic-badge">${icon(ic)}</span><span class="qn-t"><strong>${esc(t)}</strong><span>${esc(d)}</span></span></div></li>`).join("")}</ul>
<p class="small">掲載している制度・期限・料金は、国・裁判所・県・市町村などの公式サイトを確認したものだけです。確認日と出典はガイドの中に載せています。</p></section>
${steps.length ? `<section class="home-section"><h2>${icon("talk", "ic")}お申し込みのあとに届くメール（全${steps.length}回）</h2><p class="sub">ガイドのあと、実家じまいで迷いやすいところを、2週間ほどで${steps.length - 1}回に分けてお送りします。いつでも配信を停止できます。</p><ol class="lead-tl">${timeline}</ol></section>` : ""}
<section class="home-section faq"><h2>${icon("qa", "ic")}よくある質問</h2>
<details><summary>本当に無料ですか？</summary><p>無料です。お支払いが発生することはありません。</p></details>
<details><summary>メールアドレス以外の入力は必要ですか？</summary><p>必要なのはメールアドレスだけです。市町村といまの状況は任意で、選ぶと、その状況や市町村に合わせた案内をお送りします。お名前・電話番号・住所はお聞きしません。</p></details>
<details><summary>メールを止めたいときは？</summary><p>すべてのメールの末尾に、配信を停止するリンクがあります。押すとすぐに止まります。</p></details>
<details><summary>業者から営業の連絡が来ますか？</summary><p>来ません。お預かりしたメールアドレスを、業者に渡すことはありません。業者への取り次ぎは、<a href="${url("/mitsumori/")}">見積もり・相談</a>からご本人が申し込んだ場合だけです。</p></details>
</section>
</article>`;

  return { sequence, floatCta, floatScript, mobileBtn, landingBody, leadScript, pages, hasPdf };
}
