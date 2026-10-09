// にいがた実家じまい帖 — 静的サイト生成（依存: marked のみ）
// 使い方: node build.mjs  → dist/ に出力。BASE_PATH 環境変数でサブパス配信（例: /niigata-jikkajimai）。
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";
import { fileURLToPath } from "node:url";
import { renderRoadmap, ROADMAP_SLUG } from "./roadmap.mjs";
import { loadQa, faqLd as qaFaqLd, extractGuideFaq, renderQaPages } from "./qa.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, "dist");
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, "site.json"), "utf8"));
const BASE = (process.env.BASE_PATH ?? SITE.basePath ?? "").replace(/\/$/, "");
const ORIGIN = SITE.origin.replace(/\/$/, "");
const TODAY = new Date().toISOString().slice(0, 10);

const readJSON = (p, fallback) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : fallback);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const url = (p) => `${BASE}${p}`;
const abs = (p) => `${ORIGIN}${BASE}${p}`;
const yen = (n) => (n == null ? "—" : `${Number(n).toLocaleString("ja-JP")}円`);

// ---------- データ ----------
const base = readJSON(path.join(ROOT, "data/municipalities_base.json"), []);
const core9 = readJSON(path.join(ROOT, "data/sodai_core9.json"), []);
const other21 = readJSON(path.join(ROOT, "data/sodai_other21.json"), []);
const akiyaYuki = readJSON(path.join(ROOT, "data/akiya_yuki_core9.json"), []);
const prices = readJSON(path.join(ROOT, "data/price_list_minnano.json"), { companies: [] });
const partners = readJSON(path.join(ROOT, "data/partners.json"), []);
// 掲載業者は status: "published" のものだけ出す（型と記入ルールは data/partners.json の _comment）
const published = partners.filter((p) => p.status === "published" && p.id && p.name);
const permitLabel = (p) => (p.permit?.type === "own" ? `一般廃棄物収集運搬の許可あり（${(p.permit.municipalities || []).join("・") || "市町村名は見積書で確認"}）` : p.permit?.type === "partner" ? "許可業者と提携（提携先の許可を確認）" : "許可の形態は確認中");
const partnerRow = (p, cityId) => `<li class="partner"><div class="pn"><a href="${url(`/gyosha/${p.id}/`)}"><strong>${esc(p.name)}</strong></a>${p.pr ? ' <span class="pr">PR</span>' : ""}<span class="pb">${esc(p.base)}拠点${p.met_date ? `・運営者確認 ${esc(p.met_date)}` : ""}</span></div><p class="pd">${esc(permitLabel(p))}。${(p.services || []).slice(0, 4).map(esc).join("・")}${p.remote?.key_handover ? "。鍵の受け渡し対応" : ""}${p.remote?.photo_report ? "・作業後の写真報告" : ""}</p>${cityId && !(p.cities || []).includes(cityId) ? "" : ""}</li>`;

const byId = (arr) => Object.fromEntries((arr || []).map((x) => [x.cityId, x]));
const sodai = { ...byId(other21), ...byId(core9) };
const ay = byId(akiyaYuki);
const CORE = ["nagaoka", "niigata", "joetsu", "sanjo", "tsubame", "kashiwazaki", "mitsuke", "ojiya", "tokamachi"];
const AREA = {
  中越: ["nagaoka", "sanjo", "kashiwazaki", "ojiya", "kamo", "tokamachi", "mitsuke", "uonuma", "minamiuonuma", "tsubame", "yahiko", "tagami", "izumozaki", "yuzawa", "tsunan", "kariwa"],
  下越: ["niigata", "shibata", "murakami", "gosen", "agano", "tainai", "seiro", "aga", "sekikawa", "awashimaura"],
  上越: ["joetsu", "itoigawa", "myoko"],
  佐渡: ["sado"],
};
const areaOf = (id) => Object.entries(AREA).find(([, ids]) => ids.includes(id))?.[0] ?? "その他";

const cities = base.map((m) => ({ ...m, sodai: sodai[m.cityId] || null, ay: ay[m.cityId] || null, core: CORE.includes(m.cityId), area: areaOf(m.cityId) }));
const cityById = Object.fromEntries(cities.map((c) => [c.cityId, c]));
// 運営者（人感はAI画像や作った声ではなく、実在の運営者本人で出す）
// 顔写真は一切使わない（2026-10-04 大久保さん指示）。氏名と一言の文字だけ
const PERSON = { name: "大久保 亮佑", role: "運営者・株式会社Kogera代表（新潟県長岡市在住）" };
const personSmall = (say) => `<div class="person sm"><p><strong>${esc(PERSON.name)}</strong><span>${esc(PERSON.role)}</span>${say ? `<span class="say">${esc(say)}</span>` : ""}</p></div>`;
// ガイドの分類。front matter に category が無いため slug で判定する（上から順、最初に当たった分類）
const GUIDE_CATS = [
  { id: "yuki", name: "雪と冬の実家じまい", lead: "積雪期の搬出、雪下ろしの費用と補助。", test: (x) => /yuki|fuyu/.test(x) },
  { id: "gomi", name: "粗大ごみ・ごみの出し方（市別）", lead: "市ごとの料金表、申し込み、持ち込み施設、分別に迷う物。", test: (x) => /sodaigomi|gomi|kaden|futon|sofa|recycle/.test(x) },
  { id: "gyosha", name: "業者に頼む・遺品整理", lead: "許可業者の見分け方、料金の目安、仏壇や相続放棄との関係。", test: (x) => /gyosha|gyousha|ihinseiri|butsudan/.test(x) },
  { id: "akiya", name: "空き家・相続・税金", lead: "売る・貸す・壊すの比べ方、空き家バンク、固定資産税、売却の税金。", test: (x) => /akiya|souzoku|zeikin/.test(x) },
  { id: "susume", name: "進め方と費用", lead: "何から始めるか、いくらかかるか、県外からの段取り、親との話し方。", test: () => true },
];
const guideCat = (g) => GUIDE_CATS.find((c) => c.test(g.slug));
// 版画風イメージ（藍と生成りの2色）。ファイルがあるときだけ出す。キャプションは付けない（2026-10-05 大久保さん指示）
const CAT_IMG_ALT = { susume: "秋の田のあぜ道に並ぶ並木", gomi: "片付けの途中の実家の座敷", gyosha: "農家の前に止まった小型トラック", akiya: "田んぼの中の古い農家と土蔵", yuki: "雪に覆われた田と農家" };
const catImg = (id, cls = "") => fs.existsSync(path.join(ROOT, `public/assets/cat-${id}.jpg`)) ? `<figure class="photo cat ${cls}"><img src="${url(`/assets/cat-${id}.jpg`)}" alt="${esc(CAT_IMG_ALT[id] || "")}" loading="lazy" decoding="async"></figure>` : "";
const guideItem = (g, withDesc = true) => `<li><a href="${url(`/guide/${g.slug}/`)}"><strong>${esc(g.meta.title)}</strong>${withDesc ? `<span>${esc(g.meta.description || "")}</span>` : ""}</a></li>`;
const latestCheck = () => cities.map((c) => c.sodai?.checked_date).filter(Boolean).sort().pop() || TODAY;
// 確認印: 朱の角印。サイト全体の署名として、市町村・比較・ガイドの各ページの決まった位置に押す
const seal = (date, label = "公式サイトで確認") => `<span class="seal" role="img" aria-label="${esc(label)} ${esc(date)}"><span class="seal-l">${esc(label)}</span><span class="seal-d">${esc(date)}</span></span>`;

// ---------- front matter ----------
function parseFM(src) {
  src = src.replace(/\r\n?/g, "\n");
  const m = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  for (const line of m[1].split("\n")) {
    const mm = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!mm) continue;
    let v = mm[2].trim();
    if (v.startsWith("[")) v = v.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    else v = v.replace(/^["']|["']$/g, "");
    meta[mm[1]] = v;
  }
  return { meta, body: m[2] };
}
const guides = fs.existsSync(path.join(ROOT, "content/guides"))
  ? fs.readdirSync(path.join(ROOT, "content/guides")).filter((f) => f.endsWith(".md")).map((f) => {
      const { meta, body: raw } = parseFM(fs.readFileSync(path.join(ROOT, "content/guides", f), "utf8"));
      const slug = meta.slug || f.replace(/\.md$/, "");
      const body = cleanBody(raw);
      return { slug, meta, body, html: marked.parse(body) };
    })
  : [];
// 市ごとの「粗大ごみ」専用ガイド（slug: <cityId>-shi-sodaigomi / <cityA>-<cityB>-sodaigomi）がある市は、
// 市町村ページと同じ検索語を取り合わないよう、市町村ページ側の名乗りを「実家じまいガイド」に寄せる（2026-10-02 カニバリ対策）
const sodaiGuideFor = {};
for (const g of guides) {
  if (!/-sodaigomi$/.test(g.slug)) continue;
  for (const part of g.slug.replace(/-sodaigomi$/, "").split("-")) if (part && part !== "shi") sodaiGuideFor[part] = g;
}
// 編集用マーカーを読者向け表記に変換し、先頭のH1（レイアウト側で出す）を除く
function cleanBody(src) {
  return src
    .replace(/^\s*#\s+[^\n]+\n+/, "")
    .replace(/\[要確認[:：]\s*([^\]]+)\]/g, '<span class="chk">※確認中: $1</span>')
    .replace(/\[要確認\]/g, '<span class="chk">※確認中</span>');
}
const pages = fs.existsSync(path.join(ROOT, "content/pages"))
  ? fs.readdirSync(path.join(ROOT, "content/pages")).filter((f) => f.endsWith(".md")).map((f) => {
      const { meta, body } = parseFM(fs.readFileSync(path.join(ROOT, "content/pages", f), "utf8"));
      return { slug: meta.slug || f.replace(/\.md$/, ""), meta, html: marked.parse(body) };
    })
  : [];

// ---------- レイアウト ----------
const css = fs.readFileSync(path.join(ROOT, "public/assets/site.css"), "utf8");
function layout({ title, description, pathname, body, breadcrumbs = [], jsonld = [], noindex = false, updated, stickyCta = true }) {
  // <title> は検索結果で切れないよう「｜」より前の主題だけを使う（H1 は本文側で全文を出す）
  const shortTitle = String(title).split(/[｜|]/)[0].trim();
  const fullTitle = pathname === "/" ? `${SITE.name}｜${SITE.tagline}` : `${shortTitle}｜${SITE.name}`;
  const crumbs = [{ name: "ホーム", path: "/" }, ...breadcrumbs];
  const crumbLd = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: abs(c.path) })) };
  const ld = [crumbLd, ...jsonld].map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join("\n");
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex,nofollow">' : ""}
<link rel="canonical" href="${abs(pathname)}">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="${pathname === "/" ? "website" : "article"}">
<meta property="og:url" content="${abs(pathname)}">
<meta property="og:locale" content="ja_JP">
<meta property="og:image" content="${abs("/assets/og.png")}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${url("/assets/favicon.svg")}" type="image/svg+xml">
${SITE.googleSiteVerification ? `<meta name="google-site-verification" content="${esc(SITE.googleSiteVerification)}">` : ""}
${SITE.bingSiteVerification ? `<meta name="msvalidate.01" content="${esc(SITE.bingSiteVerification)}">` : ""}
${SITE.gaMeasurementId ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(SITE.gaMeasurementId)}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${esc(SITE.gaMeasurementId)}',{anonymize_ip:true});
document.addEventListener('click',function(e){var a=e.target.closest('a');if(!a)return;var h=a.getAttribute('href')||'';if(/px\\.a8\\.net|mitsumori|mailto:/.test(h)){gtag('event',h.indexOf('mitsumori')>-1||h.indexOf('mailto:')===0?'lead_click':'affiliate_click',{link_url:h,page_path:location.pathname});}});</script>` : ""}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=BIZ+UDPGothic:wght@400;700&display=swap" rel="stylesheet">
<link rel="alternate" type="application/rss+xml" title="${esc(SITE.name)}" href="${abs("/feed.xml")}">
<style>${css}</style>
${ld}
</head>
<body>
<a class="skip" href="#main">本文へ</a>
<header class="site-header">
  <div class="wrap">
    <p class="mast-top"><span>新潟県30市町村の粗大ごみ・実家の片付け・空き家の案内</span><span>発行 ${esc(SITE.operator)}（新潟県長岡市）</span><span>最終確認 ${esc(latestCheck())}</span></p>
    <div class="mast">
    <a class="brand" href="${url("/")}"><span class="brand-mark" aria-hidden="true">帖</span><span class="brand-name">${esc(SITE.name)}</span></a>
    <nav class="nav" aria-label="主要メニュー">
      <a href="${url("/city/")}">市町村別ガイド</a>
      <a href="${url("/guide/jikkajimai-tejun-niigata/")}">実家じまいの進め方</a>
      <a href="${url("/gyosha/")}">業者の料金と選び方</a>
      <a href="${url("/qa/")}">疑問Q&amp;A</a>
      <a href="${url("/search/")}">検索</a>
      <a class="cta" href="${url("/mitsumori/")}">無料で見積もり相談</a>
    </nav>
    </div>
  </div>
</header>
${pathname === "/" ? "" : `<nav class="crumbs wrap" aria-label="パンくず"><ol>${crumbs.map((c, i) => (i === crumbs.length - 1 ? `<li aria-current="page">${esc(c.name)}</li>` : `<li><a href="${url(c.path)}">${esc(c.name)}</a></li>`)).join("")}</ol></nav>`}
<main id="main" class="wrap">
${body}
</main>
${body.includes('class="lead-form"') ? formScript : ""}
${stickyCta && pathname !== "/mitsumori/" ? `<div class="sticky-cta" aria-label="相談"><a class="btn ghost" href="${url("/city/")}">市町村を選ぶ</a><a class="btn" href="${url("/mitsumori/")}">無料で見積もり相談</a></div>` : ""}
<footer class="site-footer">
  <div class="wrap">
    <div class="cols">
      <div>
        <h2>${esc(SITE.name)}</h2>
        ${personSmall()}
        <p class="foot-lead">長岡市在住の運営者が、新潟県30市町村の公式情報と地元の許可業者を確かめて載せる、実家じまいの案内サイトです。掲載情報は各市町村の公式サイトを出典とし、ページごとに確認日を記載しています。制度や料金は変わることがあるため、申し込み前に公式サイトでご確認ください。</p>
      </div>
      <div>
        <h2>読む</h2>
        <ul><li><a href="${url("/city/")}">市町村別ガイド（30市町村）</a></li><li><a href="${url("/data/sodai-hikaku/")}">30市町村 粗大ごみ手数料・持ち込み比較</a></li><li><a href="${url("/guide/")}">実家じまいの進め方と費用</a></li><li><a href="${url("/gyosha/")}">業者の料金と選び方</a></li><li><a href="${url("/mitsumori/")}">無料で見積もり相談</a></li></ul>
      </div>
      <div>
        <h2>運営</h2>
        <ul><li><a href="${url("/about/")}">運営者情報・編集方針</a></li><li><a href="${url("/keisai/")}">業者の方へ（掲載について）</a></li><li><a href="${url("/ad-policy/")}">広告について</a></li><li><a href="${url("/privacy/")}">プライバシーポリシー</a></li><li><a href="${url("/tokusho/")}">特定商取引法に基づく表記</a></li></ul>
        <p class="small" style="color:rgba(255,255,255,.6);margin-top:12px">姉妹サイト: <a href="https://www.fureaino-oka.com/" rel="noopener">ふれあいの丘</a>（空き家解体の補助金・全国）／ <a href="https://hakarau.jp/" rel="noopener">ハカラウ</a>（墓じまい・改葬）</p>
      </div>
    </div>
    <p class="copy">© ${new Date().getFullYear()} ${esc(SITE.operator)}${updated ? ` ・ このページの情報の確認日: ${esc(updated)}` : ""}</p>
  </div>
</footer>
</body>
</html>`;
}

// 相談・掲載フォーム。送信時に件名と本文を組み立て、formEndpoint があれば POST、無ければメールソフトを開く。
// 開かない環境のために、組み立てた本文をその場に表示してコピーできるようにする（内容は外部に送らない）
const formScript = `<script>(function(){var ep=${JSON.stringify(SITE.formEndpoint || "")};var to=${JSON.stringify(SITE.contactEmail)};
document.querySelectorAll('form.lead-form').forEach(function(f){f.addEventListener('submit',function(e){e.preventDefault();
var lines=[];f.querySelectorAll('input[name],select[name],textarea[name]').forEach(function(el){if(el.type==='checkbox')return;var v=(el.value||'').trim();lines.push(el.name+': '+(v||'（未記入）'));});
var kind=f.getAttribute('data-subject')||'お問い合わせ';var city=(f.querySelector('[name=市町村]')||{}).value||'';var name=(f.querySelector('[name=お名前],[name=会社名]')||{}).value||'';
var subject='【${SITE.name}】'+kind+(city?' '+city:'')+(name?' '+name:'');var text=lines.join('\\n')+'\\n\\n送信元: '+location.href;
var done=f.nextElementSibling&&f.nextElementSibling.classList.contains('form-done')?f.nextElementSibling:null;
if(!done){done=document.createElement('div');done.className='form-done';f.parentNode.insertBefore(done,f.nextSibling);}
function show(ok){done.innerHTML=(ok?'<p><strong>送信しました。</strong>原則2営業日以内にご連絡します。</p>':'<p><strong>メールソフトが開かない場合</strong>は、下の内容をコピーして <a href="mailto:'+to+'">'+to+'</a> 宛てに送ってください。</p>')+'<p class="small">件名: '+subject.replace(/</g,'&lt;')+'</p><textarea readonly rows="8">'+text.replace(/</g,'&lt;')+'</textarea><p><button type="button" class="btn ghost copy">内容をコピー</button></p>';
var b=done.querySelector('.copy');if(b)b.addEventListener('click',function(){var ta=done.querySelector('textarea');ta.select();try{navigator.clipboard.writeText('件名: '+subject+'\\n\\n'+text);}catch(_){document.execCommand('copy');}b.textContent='コピーしました';});done.scrollIntoView({behavior:'smooth',block:'nearest'});}
if(ep){var btn=f.querySelector('button[type=submit]');if(btn){btn.disabled=true;btn.textContent='送信中…';}
fetch(ep,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({subject:subject,message:text,_subject:subject})}).then(function(r){if(!r.ok)throw 0;show(true);f.reset();}).catch(function(){show(false);location.href='mailto:'+to+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(text);}).finally(function(){if(btn){btn.disabled=false;btn.textContent='送る';}});}
else{show(false);location.href='mailto:'+to+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(text);}
});});})();</script>`;

// 本文以外（市ページのデータ値・固定ページ・JSON-LD）に残った [要確認] も「※確認中」に揃える。
// タグ属性と script の中では span を入れず、素の文字にする。
const chkText = (t, plain) => t
  .replace(/\[要確認[:：]\s*([^\]]+)\]/g, plain ? "※確認中（$1）" : '<span class="chk">※確認中: $1</span>')
  .replace(/\[要確認\]/g, plain ? "※確認中" : '<span class="chk">※確認中</span>');
const fixChk = (html) => html.includes("[要確認") ? html.split(/(<script[\s\S]*?<\/script>|<[^>]*>)/g).map((seg, i) => chkText(seg, i % 2 === 1)).join("") : html;

function write(pathname, html) {
  const file = pathname.endsWith("/") ? path.join(OUT, pathname, "index.html") : path.join(OUT, pathname);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, pathname.endsWith(".html") || pathname.endsWith("/") ? fixChk(html) : html);
}

const ctaBox = (city) => `
<aside class="cta-box">
  <h2>${city ? `${esc(city)}の実家の片付けを、まとめて頼みたい方へ` : "自分で出すのが難しいときは、地元の許可業者に"}</h2>
  <p>量が多い、遠方で何度も帰れない、積雪期で搬出が難しい。そんなときは、新潟県内で一般廃棄物の収集運搬許可を持つ地元業者に見積もりを依頼できます。</p>
  <ul class="cta-points"><li>相談・訪問見積もりは無料</li><li>運営者（長岡市在住）が内容を見て1〜2社を選ぶ</li><li>原則2営業日以内に連絡</li><li>断っても費用はかからない</li></ul>
  ${personSmall("内容は私が確認してから、地元の業者1〜2社に取り次ぎます。")}
  <p class="cta-actions"><a class="btn" href="${url("/mitsumori/")}">無料で見積もり相談する</a> <a class="btn ghost" href="${url("/gyosha/")}">料金の目安と選び方を見る</a></p>
  <p class="cta-note">※ 依頼が成立した場合、業者から紹介料・掲載料を受け取ることがあります。利用者の料金に上乗せはありません（<a href="${url("/ad-policy/")}">広告について</a>）。</p>
</aside>
${fs.existsSync(path.join(ROOT, "content/pages/tools.md")) ? `<p class="tools-line small">自分で進める方へ: <a href="${url("/tools/")}">実家じまいチェックリスト・業者見積もり比較シート・粗大ごみ早見表（無料・登録不要）</a></p>` : ""}`;

const sourceList = (urls, checked) => (urls && urls.length ? `<section class="sources"><h2>出典</h2><ul>${urls.map((u) => `<li><a href="${esc(u)}" rel="noopener nofollow">${esc(u)}</a></li>`).join("")}</ul><p class="small">確認日: ${esc(checked || TODAY)}。制度・料金は変更されることがあります。必ず公式サイトの最新情報をご確認ください。</p></section>` : "");

// ---------- 市町村ページ ----------
function cityPage(c) {
  const s = c.sodai || {};
  const a = c.ay || {};
  const feeRows = (s.fee_examples || []).filter((f) => (f.fee ?? f.price ?? f[1])).map((f) => `<tr><td>${esc(f.item ?? f.name ?? f[0])}</td><td class="n">${esc(f.fee ?? f.price ?? f[1])}</td></tr>`).join("");
  const bring = s.bring_in;
  const sodaiGuide = sodaiGuideFor[c.cityId] || null;
  // 即答カード用の値。公式の記載から機械的に拾えるものだけを使い、無いものは「—」にする
  const feeNums = (s.fee_examples || []).flatMap((f) => [...String(f.fee || "").matchAll(/([\d,]+)円/g)].map((m) => Number(m[1].replace(/,/g, "")))).filter((n) => n > 0);
  const feeMin = feeNums.length ? Math.min(...feeNums) : null;
  const feeMax = feeNums.length ? Math.max(...feeNums) : null;
  const phone = (String(s.apply_method || "").match(/0\d{1,4}-\d{1,4}-\d{3,4}/) || [])[0] || c.garbage?.phone || null;
  const applyKinds = ["インターネット", "LINE", "電話", "FAX", "窓口", "チャットボット", "アプリ"].filter((k) => String(s.apply_method || "").includes(k));
  const cs = prices.companies || [];
  const minOf = (k) => { const v = cs.map((x) => x[k]).filter(Boolean); return v.length ? Math.min(...v) : null; };
  const proK1 = minOf("k1"), proLdk3 = minOf("ldk3");
  const bringHtml = bring
    ? typeof bring === "string"
      ? `<p>${esc(bring)}</p>`
      : `<dl class="kv">${Object.entries(bring).filter(([, v]) => v).map(([k, v]) => `<dt>${esc({ facility: "施設", name: "施設", address: "所在地", hours: "受付時間", fee: "料金", reservation: "予約", not_accepted: "持ち込めない物", notes: "備考", url: "案内ページ" }[k] || k)}</dt><dd>${k === "url" ? `<a href="${esc(v)}" rel="noopener nofollow">${esc(v)}</a>` : esc(Array.isArray(v) ? v.join("、") : v)}</dd>`).join("")}</dl>`
    : `<p>公式サイトで持ち込みの案内を確認できませんでした。市の環境担当課にお問い合わせください。</p>`;
  const subsidy = c.subsidy || {};
  // 出典欄: 粗大ごみの公式URLが確認済みなら、municipalities_base の garbage.officialUrl（粗い入口URL）は重ねて出さない
  const srcs = [...new Set([...(s.source_urls || []), ...(a.source_urls || []), subsidy.officialUrl, s.sodai_official_url ? null : c.garbage?.officialUrl].filter(Boolean))];
  const faq = [
    { q: `${c.city}で粗大ごみを出すには、どこに申し込みますか？`, a: s.apply_method || `${c.city}の公式サイト（粗大ごみの案内ページ）で申込方法をご確認ください。` },
    { q: `${c.city}の粗大ごみの料金はいくらですか？`, a: s.fee_system || "公式の料金表をご確認ください。" },
    { q: `実家の片付けをまとめて業者に頼むといくらかかりますか？`, a: "新潟県内の業者が公開している料金の目安は、1Kで2.5万〜5万円から、3LDKで15.8万〜23万円からです（みんなの遺品整理 新潟県ページの掲載料金、2026年10月1日確認）。量や搬出条件で変わるため、2〜3社の見積もりを比べることをおすすめします。" },
  ];
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
  const body = `
<article class="city">
<header class="band"><div class="inner">${seal(s.checked_date || TODAY)}
  <p class="eyebrow">${esc(c.area)}エリア${c.core ? "・詳しいガイド" : ""}</p>
  <h1>${sodaiGuide ? `${esc(c.city)}の実家じまいガイド｜粗大ごみ・解体補助金・空き家バンク` : `${esc(c.city)}の粗大ごみ｜料金・申し込み方法・持ち込み先と、実家じまいに使える制度`}</h1>
  <p class="lead">${esc(c.city)}の粗大ごみの出し方と料金、ごみを自分で持ち込む方法、家電リサイクル、空き家の解体補助金と空き家バンクを、${esc(c.city)}の公式サイトを出典にまとめました。実家の片付けで量が多いときの頼み先も案内します。</p>
  <div class="meta-row">
    ${s.sodai_official_url ? `<a class="chip" href="${esc(s.sodai_official_url)}" rel="noopener nofollow">出典: ${esc(c.city)}公式サイト ↗</a>` : ""}
    <a class="chip" href="${url("/data/sodai-hikaku/")}">30市町村の比較表</a>
  </div>
  <div class="answer">
    <div class="tile"><p class="k">粗大ごみの手数料</p><p class="v big">${feeMin != null ? `${feeMin.toLocaleString("ja-JP")}<small>円〜${feeMax && feeMax !== feeMin ? feeMax.toLocaleString("ja-JP") + "円／点" : ""}</small>` : "—"}</p><p class="small" style="margin:4px 0 0">${feeMin != null ? "公式料金表の品目例から" : "公式サイトで料金表を確認"}</p></div>
    <div class="tile"><p class="k">申し込み</p><p class="v">${applyKinds.length ? esc(applyKinds.join("・")) : s.apply_method ? "事前申込制" : "公式サイトで確認"}</p>${phone ? `<p class="small" style="margin:4px 0 0">受付電話 ${esc(phone)}</p>` : ""}</div>
    <div class="tile"><p class="k">自分で持ち込む</p><p class="v">${bring ? "できる（処理施設へ直接搬入）" : "公式に案内なし"}</p><p class="small" style="margin:4px 0 0"><a href="#bring">施設・受付時間を見る</a></p></div>
    <div class="tile"><p class="k">空き家の解体補助金</p><p class="v">${a.demolition_subsidy?.individual === false ? "個人向けは確認できず" : (a.demolition_subsidy?.name || subsidy.has) ? "あり" : "個人向けは確認できず"}</p><p class="small" style="margin:4px 0 0"><a href="#akiya">制度の内容を見る</a></p></div>
  </div>
</div></header>
<nav class="tabs" aria-label="このページの節"><a href="#sodai">粗大ごみ</a><a href="#bring">持ち込み</a><a href="#appliance">家電</a><a href="#akiya">空き家・補助金</a><a href="#gyosha">業者に頼む</a><a href="#faq">質問</a></nav>

<nav class="toc" aria-label="目次"><ol>
<li><a href="#sodai">粗大ごみの出し方と料金</a></li><li><a href="#bring">ごみの持ち込み</a></li><li><a href="#appliance">家電リサイクル・市で出せない物</a></li><li><a href="#akiya">空き家・解体の補助金・雪の支援</a></li><li><a href="#gyosha">まとめて頼む場合</a></li><li><a href="#faq">よくある質問</a></li></ol></nav>

<section id="sodai">
<h2>${esc(c.city)}の粗大ごみの出し方と料金</h2>
${sodaiGuide ? `<p class="note">詳しい出し方・品目別の料金一覧・持ち込み施設の手順は、専用ガイド「<a href="${url(`/guide/${sodaiGuide.slug}/`)}">${esc(sodaiGuide.meta.title.split(/[｜|]/)[0])}</a>」にまとめています。このページは要点と、解体補助金・空き家バンクまでの全体像です。</p>` : ""}
${s.apply_method ? `<h3>申し込み方法</h3><p>${esc(s.apply_method)}</p>` : `<p>申し込み方法は<a href="${esc(c.garbage?.officialUrl || "#")}" rel="noopener nofollow">${esc(c.city)}の公式サイト</a>でご確認ください。${c.garbage?.phone ? `問い合わせ先: ${esc(c.garbage.phone)}` : ""}</p>`}
${s.fee_system ? `<h3>料金の仕組み</h3><p>${esc(s.fee_system)}</p>` : ""}
${feeRows ? `<h3>主な品目の料金（公式料金表より）</h3><table class="fee"><thead><tr><th>品目</th><th class="n">料金</th></tr></thead><tbody>${feeRows}</tbody></table>` : ""}
${s.collection_frequency ? `<h3>収集の頻度</h3><p>${esc(s.collection_frequency)}</p>` : ""}
${s.special_notes ? `<p class="note">${esc(s.special_notes)}</p>` : ""}
<p class="small">県内30市町村の手数料と持ち込みルールの違いは<a href="${url("/data/sodai-hikaku/")}">新潟県30市町村 粗大ごみ手数料・持ち込み比較</a>にまとめています。</p>
</section>

<section id="bring">
<h2>${esc(c.city)}でごみを自分で持ち込むには</h2>
<p>実家じまいでは、収集を待つより持ち込んだ方が早く片付くことがあります。車で運べる量なら、処理施設への直接搬入が使えます。</p>
${bringHtml}
</section>

<section id="appliance">
<h2>家電リサイクル対象品と、市で出せない物</h2>
${s.appliance_recycle ? `<p>${esc(typeof s.appliance_recycle === "string" ? s.appliance_recycle : JSON.stringify(s.appliance_recycle))}</p>` : `<p>エアコン・テレビ・冷蔵庫（冷凍庫）・洗濯機（衣類乾燥機）は家電リサイクル法の対象で、市の粗大ごみでは出せません。購入した店か、指定引取場所、または収集運搬の許可業者に依頼します。</p>`}
${s.not_accepted ? `<p><strong>市で収集できない物の例:</strong> ${esc(Array.isArray(s.not_accepted) ? s.not_accepted.join("、") : s.not_accepted)}</p>` : ""}
</section>

<section id="akiya">
<h2>空き家になる実家の補助金・空き家バンク・雪の支援</h2>
<h3>空き家の解体に使える補助金</h3>
${a.demolition_subsidy?.name
  ? `${a.demolition_subsidy.individual === false ? `<p>${esc(c.city)}では、個人の所有者向けの空き家解体補助金を公式サイトで確認できませんでした。公式に載っている関連制度は次のとおりです（対象が限られます）。</p>` : ""}<p><strong>${esc(a.demolition_subsidy.name)}</strong>${a.demolition_subsidy.max_amount ? `：${esc(a.demolition_subsidy.max_amount)}` : ""}。${a.demolition_subsidy.url ? `<a href="${esc(a.demolition_subsidy.url)}" rel="noopener nofollow">公式ページ</a>` : ""}</p><p class="small">受付期間や対象は年度ごとに変わります。申請は着工前が原則です。確認日: ${esc(a.checked_date || TODAY)}</p>`
  : subsidy.has
    ? `<p><strong>${esc(subsidy.name)}</strong>${subsidy.maxAmount ? `（${esc(subsidy.maxAmount)}）` : ""}。${subsidy.conditions ? `対象: ${esc(Array.isArray(subsidy.conditions) ? subsidy.conditions.join("／") : subsidy.conditions)}` : ""} ${subsidy.officialUrl ? `<a href="${esc(subsidy.officialUrl)}" rel="noopener nofollow">公式ページ</a>` : ""}</p><p class="small">制度は年度で変わります。最新の受付状況は公式ページでご確認ください。</p>`
    : `<p>${esc(c.city)}では、個人向けの空き家解体補助金を公式サイトで確認できませんでした${subsidy.window ? `（担当: ${esc(subsidy.window)}${subsidy.phone ? ` ${esc(subsidy.phone)}` : ""}）` : ""}。制度は年度で変わるため、市の窓口にご確認ください。</p>`}
${a.akiya_bank_url ? `<h3>空き家バンク</h3><p>${esc(c.city)}の空き家バンク: <a href="${esc(a.akiya_bank_url)}" rel="noopener nofollow">${esc(a.akiya_bank_url)}</a>${a.akiya_bank_operator ? `（運営: ${esc(a.akiya_bank_operator)}）` : ""}。売る・貸すを考えるなら、解体の前に登録できるか確認する価値があります。</p>` : ""}
${a.snow_support?.name ? `<h3>雪下ろし・除雪の支援</h3><p><strong>${esc(a.snow_support.name)}</strong>${a.snow_support.target ? `：対象は${esc(a.snow_support.target)}` : ""}${a.snow_support.amount ? `、${esc(a.snow_support.amount)}` : ""}。${a.snow_support.url ? `<a href="${esc(a.snow_support.url)}" rel="noopener nofollow">公式ページ</a>` : ""}</p>` : ""}
${a.akiya_consult?.section ? `<p>空き家の相談窓口: ${esc(a.akiya_consult.section)}${a.akiya_consult.url ? `（<a href="${esc(a.akiya_consult.url)}" rel="noopener nofollow">案内ページ</a>）` : ""}</p>` : ""}
<p class="small">空き家を売る・買い取ってもらう選択肢は<a href="${url("/guide/akiya-uru-kasu-kowasu/")}">売る・貸す・壊すの比べ方</a>で、墓じまいや仏壇の処分は姉妹サイト<a href="https://hakarau.jp/" rel="noopener">ハカラウ</a>で扱っています。</p>
</section>

<section class="decide" id="decide">
<h2>自分で出す？ 業者に頼む？ 3つの質問で分かれ目を確認</h2>
<p class="small">${esc(c.city)}の市の手数料で出すのが得か、まとめて頼む方が現実的かは、量・搬出条件・通える回数で決まります。当てはまる方を選んでください。</p>
<div class="q"><p>1. 片付ける物の量は？</p><div class="opts"><label><input type="radio" name="q1" value="0"> 軽トラック1台分くらいまで。粗大ごみは数点</label><label><input type="radio" name="q1" value="1"> 部屋がいくつも家具・家電ごと残っている</label></div></div>
<div class="q"><p>2. 搬出の条件は？</p><div class="opts"><label><input type="radio" name="q2" value="0"> 1階中心で、車を横付けでき、積雪期ではない</label><label><input type="radio" name="q2" value="1"> 2階以上・階段がある・12〜3月の積雪期に作業する</label></div></div>
<div class="q"><p>3. 現地に通える回数は？</p><div class="opts"><label><input type="radio" name="q3" value="0"> 近くに住んでいて、何度も通える</label><label><input type="radio" name="q3" value="1"> 県外在住で、帰省は1〜2回しか取れない</label></div></div>
<div class="result" id="decide-result" data-side="">
  <p class="verdict">選ぶと、この場で目安が出ます</p>
  <p class="hint">「自分で出す」寄りなら市のルール（上の表）と<a href="${url("/data/sodai-hikaku/")}">30市町村の比較表</a>へ。「頼む」寄りなら下の料金の目安と相談フォームへ進んでください。</p>
</div>
<div class="compare">
  <div class="col"><h3>市の粗大ごみで出す</h3><p class="num">${feeMin != null ? `${feeMin.toLocaleString("ja-JP")}<small>円〜／点</small>` : "公式料金表"}</p><p>安いが、申し込み・搬出・立ち会いはすべて自分で行う。収集日は申し込みから数日〜2週間。</p></div>
  <div class="col"><h3>許可業者にまとめて頼む</h3><p class="num">${proK1 ? `${(proK1 / 10000).toFixed(1).replace(/\.0$/, "")}<small>万円〜（1K）</small>` : "見積もり"}${proLdk3 ? `<small>／3LDK ${(proLdk3 / 10000).toFixed(1).replace(/\.0$/, "")}万円〜</small>` : ""}</p><p>県内${cs.length}社の公開料金の下限。搬出・分別・運搬まで任せられ、帰省1回で終えられることが多い。</p></div>
</div>
<p class="cta-actions"><a class="btn" href="${url("/mitsumori/")}">無料で見積もり相談する</a> <a class="btn ghost" href="${url("/guide/jibun-de-dasu-ka-gyousha-ka/")}">分かれ目の5つの基準を読む</a></p>
<script>(function(){var r=document.getElementById('decide-result');if(!r)return;var box=r.parentNode;box.addEventListener('change',function(){var qs=['q1','q2','q3'],n=0,done=0;qs.forEach(function(q){var el=box.querySelector('input[name='+q+']:checked');if(el){done++;n+=Number(el.value);}});if(done<3)return;var v=r.querySelector('.verdict'),h=r.querySelector('.hint');if(n>=2){r.setAttribute('data-side','pro');v.textContent='業者にまとめて頼む方が現実的です（'+n+'/3項目が「頼む」側）';h.innerHTML='搬出条件か通える回数のどちらかで詰まりやすい状態です。相談は無料で、運営者が内容を見て地元の許可業者1〜2社を選びます。<a href="${url("/mitsumori/")}">無料で見積もり相談する</a>';}else{r.setAttribute('data-side','self');v.textContent='市の粗大ごみで自分で出せる範囲です（'+n+'/3項目が「頼む」側）';h.innerHTML='上の料金表と申し込み方法のとおり進めれば大丈夫です。持ち込みが使えるなら収集を待たずに片付きます。大型家電は<a href="#appliance">家電リサイクル</a>を確認してください。';}});})();</script>
</section>

<section id="gyosha">
<h2>${esc(c.city)}の実家をまとめて片付けてもらうには</h2>
<p>自分で出せる量を超えるとき、遠方で日程が取れないとき、積雪期で搬出が難しいときは、業者に頼む選択肢があります。家庭のごみを運ぶには市町村の「一般廃棄物収集運搬」の許可が必要です。許可のない業者が回収した物は不法投棄につながることがあるため、見積もりの際に許可の有無を確認してください。</p>
${published.filter((p) => (p.cities || []).includes(c.cityId)).length ? `<h3>${esc(c.city)}に対応する、運営者が会って確かめた業者</h3><ul class="partner-list">${published.filter((p) => (p.cities || []).includes(c.cityId)).map((p) => partnerRow(p, c.cityId)).join("")}</ul><p class="small">PR の業者からは掲載料または紹介料を受け取ることがあります。利用者の料金に上乗せはありません（<a href="${url("/ad-policy/")}">広告について</a>）。</p>` : ""}
${ctaBox(c.city)}
</section>

<section id="faq" class="faq">
<h2>よくある質問</h2>
${faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}
</section>

<section class="next-read"><h2>同じ${esc(c.area)}エリアの市町村</h2><ul class="city-grid">${(AREA[c.area] || []).filter((id) => id !== c.cityId).map((id) => cityById[id]).filter(Boolean).map((n) => `<li><a href="${url(`/city/${n.cityId}/`)}">${esc(n.city)}</a>${n.core ? '<span class="badge">詳細</span>' : ""}</li>`).join("")}</ul></section>
${(() => { const own = guides.filter((g) => String(g.meta.title || "").includes(c.city) || String(g.meta.description || "").startsWith(c.city) || [].concat(g.meta.targetKeywords || []).some((k) => String(k).startsWith(c.city) || String(k).startsWith(c.city.replace(/[市町村]$/, "") + " ")) || (/[町村]$/.test(c.city) && g.slug === "chouson-akiya-bank-niigata")); return own.length ? `<section class="next-read"><h2>${esc(c.city)}について書いた記事</h2><ul class="guide-list compact">${own.map((g) => `<li><a href="${url(`/guide/${g.slug}/`)}"><strong>${esc(g.meta.title)}</strong></a></li>`).join("")}</ul></section>` : ""; })()}
<section class="next-read"><h2>${esc(c.city)}の実家じまいで、次に読む</h2><ul class="guide-list compact">${guides.filter((g) => ["jikkajimai-hiyou-niigata", "jikkajimai-tejun-niigata", "jibun-de-dasu-ka-gyousha-ka", "enpou-kara-jikkajimai"].includes(g.slug)).map((g) => `<li><a href="${url(`/guide/${g.slug}/`)}"><strong>${esc(g.meta.title)}</strong></a></li>`).join("")}</ul></section>

${sourceList(srcs, s.checked_date)}
${(s.notes || "").toString().includes("要確認") ? `<p class="small">※ 一部に公式サイトで確認できなかった項目があります。該当箇所は記載を控えています。</p>` : ""}
</article>
<script>(function(){var t=document.querySelectorAll('.tabs a');if(!t.length||!('IntersectionObserver' in window))return;var m={};t.forEach(function(a){m[a.getAttribute('href').slice(1)]=a});var o=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){t.forEach(function(a){a.classList.remove('on')});var a=m[e.target.id];if(a)a.classList.add('on')}})},{rootMargin:'-15% 0px -70% 0px'});Object.keys(m).forEach(function(id){var el=document.getElementById(id);if(el)o.observe(el)})})();</script>`;
  const feeHint = (s.fee_examples || []).length ? `料金は${esc(((s.fee_examples || [])[0] || {}).fee || "").replace(/（.*$/, "")}から。` : "";
  const cityDescFull = `${c.city}の粗大ごみの出し方・料金・申込み・持ち込み先を公式サイトから整理。${feeHint}家電リサイクル、解体補助金、空き家バンクもまとめ、片付けを頼める地元の許可業者につなぎます。`;
  const cityDesc = cityDescFull.length > 120 ? cityDescFull.replace(feeHint, "") : cityDescFull;
  write(`/city/${c.cityId}/`, layout({ title: sodaiGuide ? `${c.city}の実家じまいガイド｜粗大ごみ・解体補助金・空き家バンク` : `${c.city}の粗大ごみ 料金・申込み・持ち込み先`, description: cityDesc, pathname: `/city/${c.cityId}/`, body, breadcrumbs: [{ name: "市町村別ガイド", path: "/city/" }, { name: c.city, path: `/city/${c.cityId}/` }], jsonld: [faqLd], updated: s.checked_date || TODAY }));
}

function cityIndex() {
  const groups = Object.entries(AREA).map(([area, ids]) => `<section><h2>${esc(area)}</h2><ul class="city-grid">${ids.map((id) => cityById[id]).filter(Boolean).map((c) => `<li><a href="${url(`/city/${c.cityId}/`)}">${esc(c.city)}</a>${c.core ? '<span class="badge">詳細</span>' : ""}${c.subsidy?.has ? '<span class="badge sub">解体補助金</span>' : ""}</li>`).join("")}</ul></section>`).join("");
  const body = `<header class="page-head"><h1>新潟県 市町村別の粗大ごみ・実家じまいガイド</h1><p class="lead">30市町村ごとに、粗大ごみの出し方・料金・持ち込み先、空き家の解体補助金、空き家バンク、雪の支援をまとめています。「詳細」のある市は、料金表や持ち込み施設まで掲載しています。手数料の違いを一覧で見るなら<a href="${url("/data/sodai-hikaku/")}">30市町村の比較表</a>へ。</p></header>${fs.existsSync(path.join(ROOT, "public/assets/photo-city.jpg")) ? `<figure class="photo cat lead"><img src="${url("/assets/photo-city.jpg")}" alt="雪の越後平野を流れる川と田" loading="lazy" decoding="async"></figure>` : ""}${searchBox("市町村名や品目で探す")}${groups}${ctaBox()}`;
  write("/city/", layout({ title: "市町村別ガイド｜新潟県30市町村の粗大ごみ・空き家", description: "新潟県30市町村の粗大ごみの出し方・料金・持ち込み先、空き家の解体補助金、空き家バンク、雪下ろし支援を市町村ごとに一覧。各市町村の公式サイトを出典に、確認日を明記しています。", pathname: "/city/", body, breadcrumbs: [{ name: "市町村別ガイド", path: "/city/" }] }));
}

// ---------- 調査レポート: 30市町村 粗大ごみ手数料・持ち込み比較 ----------
function comparePage() {
  const checkedDates = cities.map((c) => c.sodai?.checked_date).filter(Boolean).sort();
  const latest = checkedDates[checkedDates.length - 1] || TODAY;
  const withFee = cities.filter((c) => c.sodai?.fee_system);
  const withBring = cities.filter((c) => c.sodai?.bring_in);
  const feeRow = (c) => {
    const s = c.sodai || {};
    const ex = (s.fee_examples || []).filter((f) => f.fee).slice(0, 3).map((f) => `${esc(f.item)}: ${esc(f.fee)}`).join("<br>");
    return `<tr><td><a href="${url(`/city/${c.cityId}/`)}">${esc(c.city)}</a><br><span class="small">${esc(c.area)}</span></td><td>${esc(s.fee_system || "公式サイトで確認できず")}</td><td class="small">${ex || "—"}</td><td>${s.sodai_official_url ? `<a href="${esc(s.sodai_official_url)}" rel="noopener nofollow">公式</a>` : "—"}</td></tr>`;
  };
  const bringRow = (c) => {
    const s = c.sodai || {};
    const b = s.bring_in;
    const text = !b ? "公式サイトで持ち込みの案内を確認できず" : typeof b === "string" ? b : Object.entries(b).filter(([, v]) => v && typeof v !== "object").map(([k, v]) => `${esc(k)}: ${esc(v)}`).join(" ／ ");
    return `<tr><td><a href="${url(`/city/${c.cityId}/`)}">${esc(c.city)}</a><br><span class="small">${esc(c.area)}</span></td><td>${typeof b === "string" ? esc(text) : text}</td></tr>`;
  };
  const areaSections = (rowFn, head) => Object.entries(AREA).map(([area, ids]) => {
    const list = ids.map((id) => cityById[id]).filter(Boolean);
    return `<h3>${esc(area)}（${list.length}市町村）</h3><div class="table-wrap"><table class="fee"><thead>${head}</thead><tbody>${list.map(rowFn).join("")}</tbody></table></div>`;
  }).join("");
  const feeHead = `<tr><th>市町村</th><th>手数料の仕組み（公式の記載）</th><th>主な品目の例</th><th>出典</th></tr>`;
  const bringHead = `<tr><th>市町村</th><th>自分で持ち込む場合（施設・受付・料金・事前連絡）</th></tr>`;
  const datasetLd = { "@context": "https://schema.org", "@type": "Dataset", name: "新潟県30市町村 粗大ごみ手数料・持ち込みルール比較", description: "新潟県内30市町村の粗大ごみ手数料の仕組み、主な品目の料金、処理施設への持ち込みルールを、各市町村の公式サイトから転記して比較した一覧。", url: abs("/data/sodai-hikaku/"), creator: { "@type": "Organization", name: SITE.operator }, dateModified: latest, license: "https://creativecommons.org/licenses/by/4.0/", spatialCoverage: "新潟県" };
  const allFees = cities.flatMap((c) => (c.sodai?.fee_examples || []).flatMap((f) => [...String(f.fee || "").matchAll(/([\d,]+)円/g)].map((m) => Number(m[1].replace(/,/g, ""))))).filter((n) => n > 0);
  const body = `<article class="data"><header class="band"><div class="inner">${seal(latest)}<p class="eyebrow">調査レポート</p><h1>新潟県30市町村 粗大ごみ手数料・持ち込みルール比較（${latest.slice(0, 4)}年）</h1><p class="lead">新潟県の30市町村について、粗大ごみの手数料の決まり方と、処理施設へ自分で持ち込む場合のルールを、各市町村の公式サイトから転記して並べました。実家の片付けで「自分で出すか、業者に頼むか」を決めるときの材料にしてください。</p>
<div class="meta-row"><span class="chip">確認期間 ${esc(checkedDates[0] || TODAY)}〜${esc(latest)}</span><span class="chip">出典は各市町村の公式ページ（表内にリンク）</span><span class="chip">CC BY 4.0 で引用可</span></div>
<div class="report-stats">
  <div class="stat"><p class="n">${withFee.length}<small>／30市町村</small></p><p class="l">手数料の仕組みを公式サイトで確認できた市町村</p></div>
  <div class="stat"><p class="n">${withBring.length}<small>／30市町村</small></p><p class="l">処理施設への持ち込み（自己搬入）の案内がある市町村</p></div>
  <div class="stat"><p class="n">${allFees.length ? `${Math.min(...allFees).toLocaleString("ja-JP")}<small>〜${Math.max(...allFees).toLocaleString("ja-JP")}円</small>` : "—"}</p><p class="l">公式サイトに載る手数料の数字の幅（品目ごとの券額・重量単価を含む）</p></div>
</div>
<p class="small" style="margin-top:14px">公式サイトに記載が無い項目は「確認できず」と書き、推測で埋めていません。料金は改定されることがあるため、申し込み前に公式サイトでご確認ください。</p></div></header>
<section><h2>この表の読み方</h2><ul><li>手数料は「処理券（シール）を品目ごとに貼る」方式が多く、券の単位（200円券のみ、100〜500円の4種類など）と品目ごとの段階の数が市町村で異なります。</li><li>持ち込み（自己搬入）は、収集を待たずに片付けられる一方、受け入れ施設・曜日・事前連絡の要否・10kgあたりの料金が市町村ごとに違います。</li><li>市町村名のリンク先に、申し込み方法・料金表・家電リサイクル・空き家の補助金まで載せています。</li></ul></section>
<section id="fee"><h2>粗大ごみ手数料の仕組み（30市町村）</h2>${areaSections(feeRow, feeHead)}</section>
<section id="bring"><h2>ごみの持ち込み（自己搬入）のルール（30市町村）</h2>${areaSections(bringRow, bringHead)}</section>
<section><h2>データの利用について</h2><p>この比較表は、各市町村の公式サイトの記載を確認日時点で転記したものです。報道・調査・自治体の資料などで、出典（${esc(SITE.name)}、${esc(abs("/data/sodai-hikaku/"))}）を明記のうえ自由にご利用いただけます（CC BY 4.0）。転記誤りや改定にお気づきの場合は<a href="${url("/about/")}">運営者情報</a>のメールまでお知らせください。</p></section>
${ctaBox()}
</article>`;
  write("/data/sodai-hikaku/", layout({ title: `新潟県30市町村 粗大ごみ手数料・持ち込み比較`, description: `新潟県30市町村の粗大ごみ手数料の仕組みと、処理施設への持ち込み（自己搬入）ルールを公式サイトから転記して比較。処理券の単位、品目ごとの料金例、受け入れ施設と事前連絡の要否を一覧に。`, pathname: "/data/sodai-hikaku/", body, breadcrumbs: [{ name: "市町村別ガイド", path: "/city/" }, { name: "30市町村 粗大ごみ比較", path: "/data/sodai-hikaku/" }], jsonld: [datasetLd], updated: latest }));
}

// ---------- ガイド ----------
function guidePages() {
  for (const g of guides) {
    const m = g.meta;
    const artLd = { "@context": "https://schema.org", "@type": "Article", headline: m.title, description: m.description, dateModified: m.updated || TODAY, author: { "@type": "Organization", name: SITE.operator }, publisher: { "@type": "Organization", name: SITE.name }, mainEntityOfPage: abs(`/guide/${g.slug}/`) };
    const cityBox = `<section class="next-read"><h2>市町村ごとの粗大ごみの料金・申し込み・持ち込み先</h2><p class="small">実家のある市町村を選ぶと、粗大ごみの料金表、持ち込み施設、空き家の解体補助金を確認できます。</p><ul class="city-grid">${CORE.map((id) => cityById[id]).filter(Boolean).map((c) => `<li><a href="${url(`/city/${c.cityId}/`)}">${esc(c.city)}</a></li>`).join("")}</ul><p><a href="${url("/city/")}">30市町村すべてを見る →</a> ／ <a href="${url("/data/sodai-hikaku/")}">30市町村の手数料・持ち込み比較表 →</a></p></section>`;
    const roadmapData = g.slug === ROADMAP_SLUG ? readJSON(path.join(ROOT, "content/roadmap/roadmap.json"), null) : null;
    const body = roadmapData ? renderRoadmap(roadmapData, { esc, url, cities }) + cityBox : `<article class="guide"><header class="page-head">${seal(m.updated || TODAY, "更新")}<p class="eyebrow">実家じまいの進め方</p><h1>${esc(m.title)}</h1><p class="lead">${esc(m.description || "")}</p><p class="small">更新日: ${esc(m.updated || TODAY)}</p></header>${catImg(guideCat(g).id, "lead")}<div class="prose">${g.html}</div>${cityBox}${ctaBox()}</article>`;
    write(`/guide/${g.slug}/`, layout({ title: m.title, description: m.description || "", pathname: `/guide/${g.slug}/`, body, breadcrumbs: [{ name: "実家じまいの進め方", path: "/guide/" }, { name: m.title, path: `/guide/${g.slug}/` }], jsonld: [artLd, ...(() => { const f = roadmapData ? [...(roadmapData.stages || []).flatMap((st) => (st.questions || []).map((q) => ({ q: q.q, a: Array.isArray(q.a) ? q.a.join(" ") : q.a }))), ...(roadmapData.faq || [])] : extractGuideFaq(g.body); return f.length >= 2 ? [qaFaqLd(f)] : []; })()], updated: m.updated }));
  }
  const catOrder = ["susume", "gomi", "gyosha", "akiya", "yuki"];
  const sections = catOrder.map((id) => GUIDE_CATS.find((c) => c.id === id)).map((cat) => {
    const items = guides.filter((g) => guideCat(g).id === cat.id);
    return items.length ? `<section id="${cat.id}"><h2>${esc(cat.name)}<small class="cnt">${items.length}本</small></h2><p class="sub">${esc(cat.lead)}</p>${catImg(cat.id, "sec")}<ul class="guide-list">${items.map((g) => guideItem(g)).join("")}</ul></section>` : "";
  }).join("");
  const catNav = `<nav class="toc" aria-label="分類"><ol>${catOrder.map((id) => GUIDE_CATS.find((c) => c.id === id)).map((cat) => `<li><a href="#${cat.id}">${esc(cat.name)}（${guides.filter((g) => guideCat(g).id === cat.id).length}）</a></li>`).join("")}</ol></nav>`;
  write("/guide/", layout({ title: "実家じまいの進め方（新潟版）", description: "新潟の実家を片付ける手順と費用、県外からの段取り、冬の雪対策、品目別のごみの出し方、空き家の税金と売却、業者に頼む基準をまとめたガイド一覧。公式サイトを出典に確認日を明記。", pathname: "/guide/", body: `<header class="page-head"><h1>実家じまいの進め方（新潟版）<small class="cnt">${guides.length}本</small></h1><p class="lead">何から始めるか、いくらかかるか、県外からどう進めるか、冬はどうするか。新潟の事情に合わせて書いています。</p></header>${searchBox("ガイドの中を探す")}${catNav}${sections}${ctaBox()}`, breadcrumbs: [{ name: "実家じまいの進め方", path: "/guide/" }] }));
}

// ---------- 業者・料金 ----------
function gyoshaPage() {
  const cs = prices.companies || [];
  const stat = (k) => { const v = cs.map((c) => c[k]).filter((x) => x); v.sort((a, b) => a - b); return v.length ? { n: v.length, min: v[0], max: v[v.length - 1], med: v[Math.floor(v.length / 2)] } : null; };
  const rows = [["1K", stat("k1")], ["1LDK", stat("ldk1")], ["2LDK", stat("ldk2")], ["3LDK", stat("ldk3")]].map(([l, s]) => s ? `<tr><td>${l}</td><td class="n">${yen(s.min)}〜</td><td class="n">${yen(s.med)}〜</td><td class="n">${yen(s.max)}〜</td><td class="n">${s.n}社</td></tr>` : "").join("");
  const list = cs.map((c) => `<tr><td>${esc(c.name)}${c.badge ? `<br><span class="small">${esc(c.badge)}</span>` : ""}</td><td>${esc(c.area)}</td><td class="n">${c.k1 ? yen(c.k1) + "〜" : "—"}</td><td class="n">${c.ldk1 ? yen(c.ldk1) + "〜" : "—"}</td><td class="n">${c.ldk2 ? yen(c.ldk2) + "〜" : "—"}</td><td class="n">${c.ldk3 ? yen(c.ldk3) + "〜" : "—"}</td></tr>`).join("");
  const body = `<article class="gyosha"><header class="page-head"><h1>新潟の遺品整理・実家片付け業者の料金と選び方</h1><p class="lead">新潟県内の業者が公開している間取り別の料金を集計し、見積もりで確認すべき点と、許可のある業者の見分け方をまとめました。</p><p class="small">料金の出典: ${esc(prices.source || "")}（確認日 ${esc(prices.checked || TODAY)}）。各社の「〜円」表記を転記しています。最新の料金は各社にご確認ください。</p></header>${catImg("gyosha", "lead")}
<section><h2>間取り別の料金の目安（新潟県内${cs.length}社の公開料金）</h2><table class="fee"><thead><tr><th>間取り</th><th class="n">最安</th><th class="n">中央値</th><th class="n">最高</th><th class="n">公開社数</th></tr></thead><tbody>${rows}</tbody></table><p>「〜円」は最低料金です。実際の見積もりは、物の量、階段の有無、トラックを停められるか、買取できる物があるか、積雪期かどうかで変わります。</p></section>
<section><h2>見積もりで確認する6つのこと</h2><ol class="checks"><li><strong>一般廃棄物収集運搬の許可</strong>（市町村ごとの許可。許可業者の一覧は各市の公式サイトにあります）か、許可業者と提携しているか</li><li><strong>見積もりが訪問か写真か</strong>。一軒家は訪問見積もりが基本です</li><li><strong>追加料金の条件</strong>（量が増えた場合、エアコンの取り外し、仏壇や神棚の供養）</li><li><strong>買取の有無と、買取額を作業費から差し引けるか</strong></li><li><strong>作業日と立ち会い</strong>。遠方の場合、鍵の受け渡しと作業後の写真報告ができるか</li><li><strong>積雪期の対応</strong>。12〜3月は搬出経路の除雪が必要になることがあります</li></ol></section>
<section><h2>新潟県内の業者と公開料金の一覧</h2><div class="table-wrap"><table class="fee"><thead><tr><th>業者</th><th>所在地</th><th class="n">1K</th><th class="n">1LDK</th><th class="n">2LDK</th><th class="n">3LDK</th></tr></thead><tbody>${list}</tbody></table></div><p class="small">掲載順は出典サイトの表示順です。当サイトは特定の業者を推薦するものではありません。所在地が「新潟」とだけ表記されている業者は、県内のどの地域に対応するかを個別にご確認ください。</p></section>
${published.length ? `<section><h2>長岡の運営者が直接確かめた業者 <span class="pr">PR</span></h2><ul class="partners">${published.map((p) => `<li><strong><a href="${url(`/gyosha/${p.id}/`)}">${esc(p.name)}</a></strong>（${esc(p.base)}）対応: ${esc((p.cities || []).map((id) => cityById[id]?.city).filter(Boolean).join("・"))}${p.note ? ` — ${esc(p.note)}` : ""}</li>`).join("")}</ul><p class="small">掲載業者からは掲載料または紹介料を受け取っています。掲載の条件は<a href="${url("/keisai/")}">業者の掲載について</a>をご覧ください。</p></section>` : ""}
${ctaBox()}
<section class="sources"><h2>出典・参考</h2><ul><li><a href="https://m-ihinseiri.jp/partners/pref-15/" rel="noopener nofollow">みんなの遺品整理 新潟県の遺品整理業者</a>（公開料金の転記元）</li><li><a href="https://www.env.go.jp/recycle/waste/ippan/" rel="noopener nofollow">環境省 一般廃棄物の処理（無許可の回収業者に関する注意喚起）</a></li></ul></section>
</article>`;
  write("/gyosha/", layout({ title: "新潟の遺品整理・実家片付け業者の料金と選び方", description: `新潟県内${cs.length}社の公開料金を間取り別に集計。1Kは2.5万円〜、3LDKは15.8万円〜。見積もりで確認する6点と、一般廃棄物収集運搬許可の見分け方。`, pathname: "/gyosha/", body, breadcrumbs: [{ name: "業者の料金と選び方", path: "/gyosha/" }] }));
}

// ---------- 掲載業者の詳細ページ（/gyosha/<id>/） ----------
function partnerPages() {
  for (const p of published) {
    const cityNames = (p.cities || []).map((id) => cityById[id]).filter(Boolean);
    const ld = { "@context": "https://schema.org", "@type": "LocalBusiness", name: p.name, address: { "@type": "PostalAddress", addressLocality: p.base, addressRegion: "新潟県", addressCountry: "JP" }, areaServed: cityNames.map((c) => c.city), url: p.contact?.url || undefined, telephone: p.contact?.tel || undefined };
    const body = `<article class="partner-page"><header class="page-head">${p.met_date ? seal(p.met_date, "運営者が訪問して確認") : ""}<p class="eyebrow">掲載業者${p.pr ? ' <span class="pr">PR</span>' : ""}</p><h1>${esc(p.name)}</h1><p class="lead">${esc(p.base)}を拠点に、${cityNames.map((c) => esc(c.city)).join("・")}の実家の片付け・遺品整理に対応。${esc(permitLabel(p))}。</p>${p.pr ? `<p class="small">この業者からは掲載料または紹介料を受け取ることがあります。利用者の料金に上乗せはありません（<a href="${url("/ad-policy/")}">広告について</a>）。</p>` : ""}</header>
<section><h2>運営者が確認したこと</h2><p>${esc(p.intro || "")}</p>
<dl class="kv"><dt>拠点</dt><dd>${esc(p.base)}</dd><dt>対応市町村</dt><dd>${cityNames.map((c) => `<a href="${url(`/city/${c.cityId}/`)}">${esc(c.city)}</a>`).join("・")}</dd><dt>許可</dt><dd>${esc(permitLabel(p))}${p.permit?.note ? `。${esc(p.permit.note)}` : ""}</dd><dt>できること</dt><dd>${(p.services || []).map(esc).join("、")}</dd><dt>遠方からの依頼</dt><dd>${p.remote?.key_handover ? "鍵の受け渡しに対応" : "鍵の受け渡しは要相談"}${p.remote?.photo_report ? "。作業前後の写真報告あり" : ""}${p.remote?.note ? `。${esc(p.remote.note)}` : ""}</dd><dt>見積もり</dt><dd>${esc(p.estimate || "要確認")}</dd>${p.price_note ? `<dt>料金の目安</dt><dd>${esc(p.price_note)}</dd>` : ""}${p.met_date ? `<dt>確認日</dt><dd>${esc(p.met_date)}（運営者が訪問）</dd>` : ""}</dl>
<p class="small">この欄は運営者が直接会って確認した事実だけを書いています。口コミ・体験談は載せません。料金は見積もりで確定します。</p></section>
<section><h2>この業者に見積もりを依頼する</h2><p>下の相談フォームから送っていただくと、運営者が内容を確認してこの業者に取り次ぎます。相談・訪問見積もりは無料で、断っても費用はかかりません。</p><p class="cta-actions"><a class="btn" href="${url("/mitsumori/")}?gyosha=${encodeURIComponent(p.id)}">無料で見積もり相談する</a> <a class="btn ghost" href="${url("/gyosha/")}">料金の目安と選び方を見る</a></p></section>
</article>`;
    write(`/gyosha/${p.id}/`, layout({ title: `${p.name}（${p.base}）｜実家の片付け・遺品整理`, description: `${p.name}は${p.base}を拠点に${cityNames.map((c) => c.city).join("・")}に対応。${permitLabel(p)}。運営者が訪問して確認した内容を掲載。`, pathname: `/gyosha/${p.id}/`, body, breadcrumbs: [{ name: "業者の料金と選び方", path: "/gyosha/" }, { name: p.name, path: `/gyosha/${p.id}/` }], jsonld: [ld], updated: p.met_date }));
  }
}

// ---------- サイト内検索（/search/ + search.json） ----------
function searchPage() {
  const index = [
    ...cities.map((c) => ({ t: `${c.city}の粗大ごみ・実家じまい`, d: `${c.area}エリア。粗大ごみの料金・申し込み・持ち込み先、解体補助金、空き家バンク`, k: `${c.city} ${c.area} 粗大ごみ 持ち込み 補助金 空き家`, u: url(`/city/${c.cityId}/`), y: "市町村" })),
    ...guides.map((g) => ({ t: g.meta.title, d: g.meta.description || "", k: (g.meta.targetKeywords || []).join(" "), u: url(`/guide/${g.slug}/`), y: "ガイド" })),
    { t: "新潟県30市町村 粗大ごみ手数料・持ち込みルール比較", d: "手数料の仕組みと自己搬入のルールを一覧で", k: "比較 一覧 手数料 持ち込み 自己搬入", u: url("/data/sodai-hikaku/"), y: "比較表" },
    { t: "新潟の遺品整理・実家片付け業者の料金と選び方", d: "県内業者の公開料金の集計と、許可業者の見分け方", k: "業者 料金 遺品整理 許可 見積もり", u: url("/gyosha/"), y: "ページ" },
    { t: "見積もり相談（無料）", d: "地元の許可業者に無料で見積もりを依頼", k: "相談 見積もり 無料 業者", u: url("/mitsumori/"), y: "ページ" },
    ...published.map((p) => ({ t: p.name, d: `${p.base}拠点の掲載業者`, k: (p.cities || []).map((id) => cityById[id]?.city).filter(Boolean).join(" ") + " 業者", u: url(`/gyosha/${p.id}/`), y: "業者" })),
  ];
  write("/search.json", JSON.stringify(index));
  const body = `<header class="page-head"><h1>サイト内を検索</h1><p class="lead">市町村名、品目（たんす、仏壇、ストーブなど）、知りたいこと（補助金、持ち込み、費用）で探せます。</p></header>
<form class="search-box" action="${url("/search/")}" method="get" role="search"><label for="q" class="small">検索語（複数語は空白で区切る）</label><div class="row"><input id="q" name="q" type="search" placeholder="例: 長岡市 持ち込み／仏壇／雪下ろし 補助" autocomplete="off"><button class="btn" type="submit">検索</button></div></form>
<p class="small" id="search-status">読み込み中…</p>
<ol class="search-results" id="search-results"></ol>
<section class="next-read"><h2>検索せずに探す</h2><ul class="guide-list compact"><li><a href="${url("/city/")}"><strong>市町村別ガイド（30市町村）</strong></a></li><li><a href="${url("/guide/")}"><strong>実家じまいの進め方（分類つき）</strong></a></li><li><a href="${url("/data/sodai-hikaku/")}"><strong>30市町村の手数料・持ち込み比較</strong></a></li><li><a href="${url("/gyosha/")}"><strong>業者の料金と選び方</strong></a></li></ul></section>
<script>(function(){var ix=null,inp=document.getElementById('q'),out=document.getElementById('search-results'),st=document.getElementById('search-status');
function norm(x){return (x||'').normalize('NFKC').toLowerCase().replace(/\\s+/g,' ').trim();}
function esc(x){return x.replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function run(){if(!ix)return;var q=norm(inp.value);history.replaceState(null,'',q?'?q='+encodeURIComponent(inp.value):location.pathname);if(!q){out.innerHTML='';st.textContent=ix.length+'件のページから探せます。';return;}
var toks=q.split(' ').filter(Boolean);var res=[];ix.forEach(function(it){var t=norm(it.t),d=norm(it.d),k=norm(it.k);var sc=0;for(var i=0;i<toks.length;i++){var w=toks[i];if(t.indexOf(w)>=0)sc+=3;else if(k.indexOf(w)>=0)sc+=2;else if(d.indexOf(w)>=0)sc+=1;else{sc=0;break;}}if(sc>0)res.push([sc,it]);});
res.sort(function(a,b){return b[0]-a[0];});st.textContent=res.length?res.length+'件':'見つかりませんでした。語を短くするか、市町村名だけで試してください。';
out.textContent='';res.slice(0,60).forEach(function(r){var it=r[1],li=document.createElement('li'),ty=document.createElement('span'),a=document.createElement('a'),st=document.createElement('strong'),sd=document.createElement('span');ty.className='ty';ty.textContent=it.y;a.setAttribute('href',it.u);st.textContent=it.t;a.appendChild(st);sd.className='sd';sd.textContent=it.d;li.appendChild(ty);li.appendChild(a);li.appendChild(sd);out.appendChild(li);});}
fetch('${url("/search.json")}').then(function(r){return r.json();}).then(function(j){ix=j;var m=location.search.match(/[?&]q=([^&]*)/);if(m){inp.value=decodeURIComponent(m[1].replace(/\\+/g,' '));}run();}).catch(function(){st.textContent='検索の読み込みに失敗しました。上の一覧からお探しください。';});
inp.addEventListener('input',run);document.querySelector('.search-box').addEventListener('submit',function(e){e.preventDefault();run();});})();</script>`;
  write("/search/", layout({ title: "サイト内を検索", description: "にいがた実家じまい帖のサイト内検索。市町村名や品目、知りたいことで探せます。", pathname: "/search/", body, breadcrumbs: [{ name: "検索", path: "/search/" }], noindex: true }));
}
const searchBox = (label = "このサイトの中を探す") => `<form class="search-box inline" action="${url("/search/")}" method="get" role="search"><label for="q-inline" class="small">${esc(label)}</label><div class="row"><input id="q-inline" name="q" type="search" placeholder="例: 長岡市 持ち込み／仏壇／雪下ろし 補助" autocomplete="off"><button class="btn ghost" type="submit">検索</button></div></form>`;

// ---------- 固定ページ（content/pages/*.md） ----------
function staticPages() {
  for (const p of pages) {
    const m = p.meta;
    // 意図別の補助ブロック: 相談ページには「無料・2営業日・運営者が選別」を先に、業者向けページには読者と需要の根拠を先に出す
    const trust = p.slug === "mitsumori"
      ? `<div class="trust-strip"><div><strong>相談・訪問見積もりは無料</strong>断っても費用はかかりません</div><div><strong>原則2営業日以内に連絡</strong>運営者（長岡市在住）が内容を確認します</div><div><strong>許可業者だけを紹介</strong>一般廃棄物収集運搬の許可、または許可業者との提携を確認した先のみ</div></div>`
      : p.slug === "keisai"
        ? `<div class="b2b-panel"><h2>読者は「新潟の実家を片付けたい子世代」です</h2><p>県内の「粗大ごみ・ごみ持ち込み」の検索は月およそ8,200回（ラッコキーワード、2026年9月時点の直近3か月平均）。当サイトはこの入口で読者を集め、自分で出しきれない方だけを地元の許可業者に取り次ぎます。</p><div class="grid"><div><p class="n">30<small>市町村</small></p><p class="l">全市町村の粗大ごみ・補助金ページから相談導線</p></div><div><p class="n">${cities.filter((c) => c.core).length}<small>市</small></p><p class="l">料金表・持ち込み施設まで掲載する中核市（長岡・新潟・上越ほか）</p></div><div><p class="n">0<small>社</small></p><p class="l">みんなの遺品整理に載る長岡市の業者数（県内27社中）。中越の業者はまだネットに出ていません</p></div></div></div>`
        : "";
    const person = p.slug === "mitsumori"
      ? personSmall("送っていただいた内容は、私が読んでから業者に渡します。業者に直接届く仕組みではありません。")
      : p.slug === "about"
        ? `<div class="person lg"><div><p><strong>${esc(PERSON.name)}</strong></p><p class="small">${esc(PERSON.role)}</p><p>墓じまいの「ハカラウ」、空き家解体補助金の「ふれあいの丘」を運営する中で、「親の家をどう片付けるか」の相談が多いことから、住んでいる新潟に絞ってこのサイトを始めました。</p></div></div>`
        : "";
    const body = `<article class="page"><header class="page-head"><h1>${esc(m.title)}</h1>${m.description ? `<p class="lead">${esc(m.description)}</p>` : ""}</header>${p.slug === "mitsumori" ? catImg("gomi", "lead") : p.slug === "keisai" ? catImg("gyosha", "lead") : ""}${trust}${person}<div class="prose">${p.html}</div>${m.cta === "true" ? ctaBox() : ""}</article>`;
    write(`/${p.slug}/`, layout({ title: m.title, description: m.description || m.title, pathname: `/${p.slug}/`, body, breadcrumbs: [{ name: m.title, path: `/${p.slug}/` }], noindex: m.noindex === "true", stickyCta: p.slug !== "mitsumori" && p.slug !== "keisai" }));
  }
}

// ---------- トップ ----------
function home() {
  const coreCards = CORE.map((id) => cityById[id]).filter(Boolean).map((c) => `<li><a href="${url(`/city/${c.cityId}/`)}"><strong>${esc(c.city)}</strong><span>粗大ごみ・持ち込み・補助金</span></a></li>`).join("");
  // ヒーロー右の実データ抜粋。数値は fee_examples から算出し、手で書かない
  const heroRows = CORE.map((id) => cityById[id]).filter(Boolean).map((c) => {
    const s = c.sodai || {};
    const nums = (s.fee_examples || []).flatMap((f) => [...String(f.fee || "").matchAll(/([\d,]+)円/g)].map((m) => Number(m[1].replace(/,/g, "")))).filter((n) => n > 0);
    // 品目別の料金表（3品目以上）が無い市は「—」。重量単価しか無い市を「〜円」の幅として見せない
    const hasTable = nums.length >= 3;
    const kinds = ["ネット", "LINE", "電話", "FAX", "窓口"].filter((k) => String(s.apply_method || "").includes(k === "ネット" ? "インターネット" : k));
    const lo = Math.min(...nums), hi = Math.max(...nums);
    return `<tr><td><a href="${url(`/city/${c.cityId}/`)}">${esc(c.city)}</a></td><td class="n">${!hasTable ? "—" : lo === hi ? `${lo.toLocaleString("ja-JP")}円` : `${lo.toLocaleString("ja-JP")}〜${hi.toLocaleString("ja-JP")}円`}</td><td>${esc(kinds.join("・") || "—")}</td><td class="n">${esc((s.checked_date || "").slice(5).replace("-", "/"))}</td></tr>`;
  }).filter(Boolean).join("");
  // 写真枠: public/assets/photo-home.jpg を置くと表示される（運営者の実写のみ。AI生成画像は使わない）。説明文は photo-home.txt
  const photoFile = path.join(ROOT, "public/assets/photo-home.jpg");
  const photoCap = fs.existsSync(path.join(ROOT, "public/assets/photo-home.txt")) ? fs.readFileSync(path.join(ROOT, "public/assets/photo-home.txt"), "utf8").trim() : "";
  const photo = fs.existsSync(photoFile) ? `<figure class="photo top"><img src="${url("/assets/photo-home.jpg")}" alt="信濃川と越後平野の田園" fetchpriority="high" decoding="async"></figure>` : "";
  const dirCols = Object.entries(AREA).map(([area, ids]) => `<div class="dir-col"><h3>${esc(area)}<small>${ids.length}市町村</small></h3><ul>${ids.map((id) => cityById[id]).filter(Boolean).map((c) => `<li><a href="${url(`/city/${c.cityId}/`)}"${c.core ? ' class="core"' : ""}>${esc(c.city)}</a>${c.subsidy?.has ? '<span class="badge sub">解体補助金</span>' : ""}</li>`).join("")}</ul></div>`).join("");
  const recentRows = [...cities].filter((c) => c.sodai?.checked_date).sort((a, b) => (b.sodai.checked_date > a.sodai.checked_date ? 1 : b.sodai.checked_date < a.sodai.checked_date ? -1 : a.city.localeCompare(b.city, "ja"))).slice(0, 12).map((c) => `<tr><td><a href="${url(`/city/${c.cityId}/`)}">${esc(c.city)}</a></td><td>${(c.sodai.fee_examples || []).length >= 3 ? "料金表あり" : "重量制・公式で確認"}</td><td>${c.sodai.bring_in ? "案内あり" : "—"}</td><td>${c.ay?.demolition_subsidy?.name || c.subsidy?.has ? "あり" : "—"}</td><td class="n">${esc(c.sodai.checked_date)}</td></tr>`).join("");
  // トップの分類カードは、ラッコの月間検索数（research/24）が大きい記事から並べる。リストに無い記事は後ろ。
  const HOME_PRIORITY = ["niigata-shi-sodaigomi", "nagaoka-shi-sodaigomi", "nagaoka-gomi-bunbetsu-mayou", "niigata-shi-gomi-mochikomi", "nagaoka-recycle-shop", "niigata-shi-recycle-shop", "nagaoka-akiya-bank", "joetsu-niigata-akiya-bank", "akiya-koteishisanzei-6bai", "yukioroshi-gyosha-ryokin-niigata", "akiya-yukioroshi-hiyou-gyosha-niigata", "yukioroshi-shien-niigata-30", "jikkajimai-tejun-niigata", "jikkajimai-hiyou-niigata", "jikkajimai-hojokin-niigata", "niigata-shi-kyoka-gyosha", "nagaoka-shi-kyoka-gyosha", "ihinseiri-niigata-shi-gyosha-erabikata", "jikkajimai-gyosha-hiyou-niigata"];
  const prio = (g) => { const i = HOME_PRIORITY.indexOf(g.slug); return i < 0 ? 999 : i; };
  const guideCards = ["susume", "gomi", "gyosha", "akiya", "yuki"].map((id) => GUIDE_CATS.find((c) => c.id === id)).map((cat) => {
    const items = guides.filter((g) => guideCat(g).id === cat.id).sort((a, b) => prio(a) - prio(b));
    return items.length ? `<li class="cat">${catImg(cat.id, "thumb")}<h3><a href="${url("/guide/#" + cat.id)}">${esc(cat.name)}</a><small>${items.length}本</small></h3><ul>${items.slice(0, 3).map((g) => guideItem(g, false)).join("")}</ul></li>` : "";
  }).join("");
  const body = `
${photo}
<section class="hero"><div class="inner">
  <div>
    <p class="eyebrow">新潟県30市町村の公式情報と、長岡の運営者が会って確かめた業者</p>
    <h1>新潟の実家を、遠くからでも、雪の季節でも、片付けられるように。</h1>
    <p class="lead">粗大ごみの料金と申し込み先、ごみの持ち込み施設、空き家の解体補助金、雪下ろしの支援。市町村ごとの公式情報を1ページにまとめ、自分では出しきれないときは地元の許可業者に無料でつなぎます。</p>
    <form class="city-jump" action="${url("/city/")}" method="get" onsubmit="var v=this.c.value;if(v){location.href='${url("/city/")}'+v+'/';return false;}">
      <label for="c">実家のある市町村を選ぶ</label>
      <select id="c" name="c">${cities.map((c) => `<option value="${c.cityId}"${c.cityId === "nagaoka" ? " selected" : ""}>${esc(c.city)}</option>`).join("")}</select>
      <button class="btn paper" type="submit">粗大ごみの料金と出し方を見る</button>
    </form>
    <p class="small">県外にお住まいで帰省の回数が限られる方は、<a href="${url("/guide/enpou-kara-jikkajimai/")}">帰省2回で終わらせる段取り</a>から。</p>
    <div class="person hero-person"><div><p class="say">長岡に住んでいます。市町村の制度は公式サイトを一つずつ読んで載せ、業者は直接会って確かめた先だけを紹介します。相談はまず私が目を通してから、地元の許可業者につなぎます。</p><p class="who"><strong>${esc(PERSON.name)}</strong>${esc(PERSON.role)} ／ <a href="${url("/about/")}">運営者情報</a></p></div></div>
  </div>
  <aside class="hero-aside" aria-label="粗大ごみ手数料の抜粋">
    <p class="cap">粗大ごみ手数料の幅（公式料金表の品目例から・1点あたり）</p>
    <table><thead><tr><th>市</th><th class="n">手数料</th><th>申し込み</th><th class="n">確認日</th></tr></thead><tbody>${heroRows}</tbody></table>
    <p class="more">— は品目別の料金表が無い市（重量制など）。<a href="${url("/data/sodai-hikaku/")}">30市町村の手数料・持ち込みルールを比べる →</a></p>
  </aside>
</div></section>
<p class="data-note"><span><b>30</b>市町村の公式サイトを出典に掲載</span><span>県内<b>${(prices.companies || []).length}</b>社の公開料金を集計（1K <b>${yen(Math.min(...(prices.companies || []).map((x) => x.k1).filter(Boolean)))}</b>〜）</span><span>相談・訪問見積もりは<b>無料</b>。運営者が確認してから地元の許可業者へ</span></p>
<section class="home-section start-here"><h2>いまの状況から、進め方を見る</h2><p class="sub">状況を選ぶと、その状況で最初にやること・期限のある手続き・新潟の窓口だけを順番に表示します。</p><ul class="start-sits"><li><a href="${url("/guide/jikkajimai-tejun-niigata/")}?sit=s1"><strong>親が元気なうちに準備する</strong><span>話の切り出し方、生前整理、認知症の前に決めること</span></a></li><li><a href="${url("/guide/jikkajimai-tejun-niigata/")}?sit=s2"><strong>親が施設に入る・入った</strong><span>住民票、実家を残すか売るか、親のお金の管理</span></a></li><li><a href="${url("/guide/jikkajimai-tejun-niigata/")}?sit=s3"><strong>親が亡くなった</strong><span>7日・3か月・10か月・3年の期限と、まだ捨てない物</span></a></li><li><a href="${url("/guide/jikkajimai-tejun-niigata/")}?sit=s4"><strong>すでに空き家になっている</strong><span>税金・相続登記・冬の管理・売る／壊すの判断</span></a></li></ul><p class="small"><a href="${url("/guide/jikkajimai-tejun-niigata/")}">状況を選ばずに全体の流れを見る →</a>　<a href="${url("/qa/")}">疑問Q&amp;Aから探す →</a></p><style>.start-sits{list-style:none;padding:0;margin:12px 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}.start-sits a{display:block;height:100%;padding:14px 16px;border:1px solid var(--line-strong,#ccc);text-decoration:none;color:inherit;background:var(--paper,#fff)}.start-sits a:hover{border-color:var(--navy,#1d3557)}.start-sits strong{display:block;font-size:16px;margin-bottom:4px}.start-sits span{display:block;font-size:13.5px;color:var(--mute,#666)}</style></section>
<ol class="steps">
  <li><h2>市のルールを知る</h2><p>粗大ごみは申し込み制で、品目ごとに料金が決まっています。持ち込めば早く安く済むこともあります。</p><a href="${url("/city/")}">市町村別ガイドへ</a></li>
  <li><h2>進め方と費用を把握する</h2><p>何から手を付けるか、帰省2回で終わらせる段取り、冬の雪対策、業者に頼む分かれ目。</p><a href="${url("/guide/")}">実家じまいの進め方へ</a></li>
  <li><h2>頼むなら許可のある業者に</h2><p>県内${(prices.companies || []).length}社の公開料金を集計。許可の確認方法と、見積もりで聞くべきこと。</p><a href="${url("/gyosha/")}">業者の料金と選び方へ</a></li>
</ol>
<section class="home-section dir"><h2>市町村から探す（新潟県30市町村）</h2><p class="sub">太字の9市は、品目別の料金表・持ち込み施設の受付時間・解体補助金まで掲載。ほかの市町村も申し込み先と料金の仕組みを載せています。</p><div class="dir-grid">${dirCols}</div><p class="small"><a href="${url("/city/")}">市町村別ガイドの一覧 →</a> ／ <a href="${url("/data/sodai-hikaku/")}">30市町村の粗大ごみ手数料・持ち込み比較 →</a></p></section>
<div class="two">
<section class="home-section recent"><h2>確認の記録</h2><p class="sub">各市町村の公式サイトを見た日と、載せている内容。古いものから順に見直します。</p><div class="table-wrap"><table><thead><tr><th>市町村</th><th>粗大ごみ</th><th>持ち込み</th><th>解体補助金</th><th class="n">確認日</th></tr></thead><tbody>${recentRows}</tbody></table></div></section>
<section class="home-section"><h2>実家じまいの進め方（新潟版）</h2><p class="sub">${guides.length}本のガイドを5つに分けています。</p><ul class="guide-cats">${guideCards}</ul><p class="small"><a href="${url("/guide/")}">ガイドの一覧（分類つき） →</a></p></section>
</div>
<section class="why"><div><h2>長岡に住む運営者が、公式情報と地元の業者を確かめて載せています</h2><p>運営は株式会社Kogera（新潟県長岡市）。市町村の制度と料金は各自治体の公式サイトだけを出典にし、ページごとに確認日を記載します。業者は運営者が直接会い、一般廃棄物収集運搬の許可と見積もりの出し方を確かめたところだけを載せます。</p><p><a href="${url("/about/")}">運営者情報・編集方針 →</a></p></div><ul class="promise"><li>出典は公式サイト。電話での聞き取りはしない</li><li>業者は会って確かめた先だけ。掲載料・紹介料を受け取る先には「PR」を表示</li><li>体験談や口コミを作らない。分からないことは「要確認」と書く</li><li>墓じまいは姉妹サイト<a href="https://hakarau.jp/" rel="noopener">ハカラウ</a>、解体補助金の全国版は<a href="https://www.fureaino-oka.com/" rel="noopener">ふれあいの丘</a></li></ul></section>
${ctaBox()}`;
  const orgLd = { "@context": "https://schema.org", "@type": "WebSite", name: SITE.name, url: abs("/"), description: SITE.tagline, publisher: { "@type": "Organization", name: SITE.operator } };
  write("/", layout({ title: SITE.name, description: `新潟県30市町村の粗大ごみの出し方・料金・持ち込み先、空き家の解体補助金、雪の支援を公式情報からまとめた実家じまいの案内。長岡から運営。まとめて頼むときは地元の許可業者へ。`, pathname: "/", body, jsonld: [orgLd] }));
}

// ---------- sitemap / robots / feed / 404 ----------
function extras() {
  // lastmod は「そのページの情報を最後に確認した日」。ビルド日で全ページを更新すると鮮度信号が信用されなくなる。
  const cityLatest = cities.map((c) => c.sodai?.checked_date).filter(Boolean).sort().pop() || TODAY;
  const guideLatest = guides.map((g) => g.meta.updated).filter(Boolean).sort().pop() || TODAY;
  const entries = [
    ["/", cityLatest > guideLatest ? cityLatest : guideLatest],
    ["/city/", cityLatest],
    ["/data/sodai-hikaku/", cityLatest],
    ["/guide/", guideLatest],
    ["/gyosha/", prices.checked || TODAY],
    ["/mitsumori/", guideLatest],
    ...published.map((p) => [`/gyosha/${p.id}/`, p.met_date || TODAY]),
    ...cities.map((c) => [`/city/${c.cityId}/`, c.sodai?.checked_date || cityLatest]),
    ...guides.map((g) => [`/guide/${g.slug}/`, g.meta.updated || guideLatest]),
    ...(qaCats.length ? qaPageList.map((p) => [p.path, p.updated || guideLatest]) : []),
    ...pages.filter((p) => p.meta.noindex !== "true").map((p) => [`/${p.slug}/`, p.meta.updated || guideLatest]),
  ];
  const seen = new Set();
  const uniq = entries.filter(([u]) => (seen.has(u) ? false : (seen.add(u), true)));
  write("/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${uniq.map(([u, d]) => `<url><loc>${abs(u)}</loc><lastmod>${d}</lastmod></url>`).join("\n")}\n</urlset>\n`);
  write("/robots.txt", `User-agent: *\nAllow: /\nSitemap: ${abs("/sitemap.xml")}\n`);
  // llms.txt: AI検索向けのサイト要約（ハカラウで引用数が伸びた型）
  const llms = [
    `# ${SITE.name}`,
    ``,
    `> ${SITE.tagline}。新潟県30市町村の粗大ごみの出し方・料金・持ち込み先、空き家の解体補助金・空き家バンク、雪の支援を各市町村の公式サイトを出典に掲載。運営は株式会社Kogera（長岡市）。掲載情報には確認日を付け、公式で確認できない項目は「確認中」と表示する。`,
    ``,
    `## まず読むページ`,
    `- [新潟の実家じまいの進め方（状況別の手順と期限の早見表）](${abs("/guide/jikkajimai-tejun-niigata/")}): 親が元気なうち・施設に入る・亡くなった・空き家の4つの状況別に、決める→期限のある手続き→仕分け→片付け→家の行き先の順で、新潟の窓口と公式の期限をまとめたページ`,
    ...(qaCats.length ? [`- [実家じまいの疑問Q&A（新潟版）](${abs("/qa/")}): 公式の情報をもとに、1問ごとに結論から答えたQ&A集`, ...qaCats.map((c) => `  - [${c.title}](${abs(`/qa/${c.id}/`)}): ${c.items.length}問`)] : []),
    ``,
    `## 実家じまいの進め方（ガイド）`,
    ...guides.map((g) => `- [${g.meta.title}](${abs(`/guide/${g.slug}/`)}): ${g.meta.description || ""}`),
    ``,
    `## 市町村別ガイド`,
    ...cities.map((c) => `- [${c.city}](${abs(`/city/${c.cityId}/`)}): ${c.city}の粗大ごみの出し方・料金・持ち込み先・解体補助金・空き家バンク`),
    ``,
    `## 比較・一覧`,
    `- [新潟県30市町村 粗大ごみ手数料・持ち込み比較](${abs("/data/sodai-hikaku/")})`,
    `- [新潟の遺品整理・実家片付け業者の料金と選び方](${abs("/gyosha/")}): 県内27社の公開料金の集計と、一般廃棄物収集運搬許可の確認方法`,
    ...(fs.existsSync(path.join(ROOT, "content/pages/tools.md")) ? [`- [無料の様式（チェックリスト・見積もり比較シート・粗大ごみ早見表）](${abs("/tools/")})`] : []),
    ``,
    `## 相談`,
    `- [見積もり相談（無料）](${abs("/mitsumori/")}): 新潟県内の許可業者に取り次ぐ。相談・訪問見積もりは無料。`,
    `- [業者の掲載について](${abs("/keisai/")})`,
    `- [運営者情報](${abs("/about/")})`,
  ].join("\n");
  write("/llms.txt", llms + "\n");
  write("/feed.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${esc(SITE.name)}</title><link>${abs("/")}</link><description>${esc(SITE.tagline)}</description>${guides.map((g) => `<item><title>${esc(g.meta.title)}</title><link>${abs(`/guide/${g.slug}/`)}</link><description>${esc(g.meta.description || "")}</description></item>`).join("")}</channel></rss>\n`);
  write("/404.html", layout({ title: "ページが見つかりません", description: "ページが見つかりません", pathname: "/404.html", body: `<h1>ページが見つかりません</h1><p><a href="${url("/")}">トップページへ戻る</a></p><p><a href="${url("/search/")}">サイト内を検索する →</a></p>`, noindex: true }));
  // fs.cpSync は Windows + Node 24 でプロセスごと落ちる（exit 0xC0000409）ことがあるため手動コピーにする（2026-10-02）
  const copyDir = (src, dst) => {
    fs.mkdirSync(dst, { recursive: true });
    for (const e of fs.readdirSync(src, { withFileTypes: true })) {
      const s = path.join(src, e.name), d = path.join(dst, e.name);
      if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
    }
  };
  if (fs.existsSync(path.join(ROOT, "public"))) copyDir(path.join(ROOT, "public"), OUT);
  fs.writeFileSync(path.join(OUT, ".nojekyll"), "");
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
// ---------- よくある疑問（Q&A） ----------
const qaCats = loadQa(ROOT);
const qaPageList = renderQaPages(qaCats, { esc, url });
function qaPages() {
  if (!qaCats.length) return;
  for (const p of qaPageList) write(p.path, layout({ title: p.title, description: p.description, pathname: p.path, body: p.body, breadcrumbs: p.crumbs, jsonld: p.jsonld, updated: p.updated }));
}

home(); cityIndex(); cities.forEach(cityPage); comparePage(); guidePages(); gyoshaPage(); partnerPages(); searchPage(); staticPages(); qaPages(); extras();
console.log(`built: ${cities.length} cities, ${guides.length} guides, ${pages.length} pages → ${OUT}`);
