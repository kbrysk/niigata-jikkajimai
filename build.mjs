// にいがた実家じまい帖 — 静的サイト生成（依存: marked のみ）
// 使い方: node build.mjs  → dist/ に出力。BASE_PATH 環境変数でサブパス配信（例: /niigata-jikkajimai）。
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";
import { fileURLToPath } from "node:url";

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
function layout({ title, description, pathname, body, breadcrumbs = [], jsonld = [], noindex = false, updated }) {
  const fullTitle = pathname === "/" ? `${SITE.name}｜${SITE.tagline}` : `${title}｜${SITE.name}`;
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
<meta name="twitter:card" content="summary">
<link rel="icon" href="${url("/assets/favicon.svg")}" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="alternate" type="application/rss+xml" title="${esc(SITE.name)}" href="${abs("/feed.xml")}">
<style>${css}</style>
${ld}
</head>
<body>
<a class="skip" href="#main">本文へ</a>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="${url("/")}"><span class="brand-mark" aria-hidden="true">帖</span><span class="brand-name">${esc(SITE.name)}</span></a>
    <nav class="nav" aria-label="主要メニュー">
      <a href="${url("/city/")}">市町村別ガイド</a>
      <a href="${url("/guide/")}">実家じまいの進め方</a>
      <a href="${url("/gyosha/")}">業者の料金と選び方</a>
      <a class="cta" href="${url("/mitsumori/")}">見積もり相談</a>
    </nav>
  </div>
</header>
<nav class="crumbs wrap" aria-label="パンくず"><ol>${crumbs.map((c, i) => (i === crumbs.length - 1 ? `<li aria-current="page">${esc(c.name)}</li>` : `<li><a href="${url(c.path)}">${esc(c.name)}</a></li>`)).join("")}</ol></nav>
<main id="main" class="wrap">
${body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <p class="foot-lead">${esc(SITE.name)}は、長岡市在住の運営者が、新潟県の市町村の公式情報と地元の業者を確かめて載せる実家じまいの案内サイトです。掲載情報は各市町村の公式サイトを出典とし、確認日を記載しています。制度や料金は変わることがあるため、最新の情報は公式サイトでご確認ください。</p>
    <p class="foot-links"><a href="${url("/about/")}">運営者情報</a> ・ <a href="${url("/keisai/")}">業者の掲載について</a> ・ <a href="${url("/privacy/")}">プライバシーポリシー</a> ・ <a href="${url("/tokusho/")}">特定商取引法に基づく表記</a> ・ <a href="${url("/ad-policy/")}">広告について</a></p>
    <p class="foot-sister">姉妹サイト: <a href="https://www.fureaino-oka.com/" rel="noopener">生前整理支援センター ふれあいの丘</a>（実家じまい・空き家解体の補助金）／ <a href="https://hakarau.jp/" rel="noopener">ハカラウ</a>（墓じまい・改葬の手続き）</p>
    <p class="copy">© ${new Date().getFullYear()} ${esc(SITE.operator)}${updated ? ` ・ このページの更新日: ${esc(updated)}` : ""}</p>
  </div>
</footer>
</body>
</html>`;
}

function write(pathname, html) {
  const file = pathname.endsWith("/") ? path.join(OUT, pathname, "index.html") : path.join(OUT, pathname);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

const ctaBox = (city) => `
<aside class="cta-box">
  <h2>${city ? `${esc(city)}の実家の片付けを、まとめて頼みたい方へ` : "自分で出すのが難しいときは"}</h2>
  <p>量が多い、遠方で何度も帰れない、積雪期で搬出が難しい。そんなときは、新潟県内で一般廃棄物の収集運搬許可を持つ地元業者に見積もりを依頼できます。相談は無料で、依頼の内容は運営者が確認してから業者に取り次ぎます。</p>
  <p class="cta-actions"><a class="btn" href="${url("/mitsumori/")}">見積もり相談フォームへ</a> <a class="btn ghost" href="${url("/gyosha/")}">料金の目安と選び方を見る</a></p>
  <p class="cta-note">※ 業者からの紹介料・掲載料を受け取ることがあります（<a href="${url("/ad-policy/")}">広告について</a>）。</p>
</aside>`;

const sourceList = (urls, checked) => (urls && urls.length ? `<section class="sources"><h2>出典</h2><ul>${urls.map((u) => `<li><a href="${esc(u)}" rel="noopener nofollow">${esc(u)}</a></li>`).join("")}</ul><p class="small">確認日: ${esc(checked || TODAY)}。制度・料金は変更されることがあります。必ず公式サイトの最新情報をご確認ください。</p></section>` : "");

// ---------- 市町村ページ ----------
function cityPage(c) {
  const s = c.sodai || {};
  const a = c.ay || {};
  const feeRows = (s.fee_examples || []).filter((f) => (f.fee ?? f.price ?? f[1])).map((f) => `<tr><td>${esc(f.item ?? f.name ?? f[0])}</td><td class="n">${esc(f.fee ?? f.price ?? f[1])}</td></tr>`).join("");
  const bring = s.bring_in;
  const bringHtml = bring
    ? typeof bring === "string"
      ? `<p>${esc(bring)}</p>`
      : `<dl class="kv">${Object.entries(bring).filter(([, v]) => v).map(([k, v]) => `<dt>${esc({ facility: "施設", name: "施設", address: "所在地", hours: "受付時間", fee: "料金", reservation: "予約", not_accepted: "持ち込めない物", notes: "備考", url: "案内ページ" }[k] || k)}</dt><dd>${k === "url" ? `<a href="${esc(v)}" rel="noopener nofollow">${esc(v)}</a>` : esc(Array.isArray(v) ? v.join("、") : v)}</dd>`).join("")}</dl>`
    : `<p>公式サイトで持ち込みの案内を確認できませんでした。市の環境担当課にお問い合わせください。</p>`;
  const subsidy = c.subsidy || {};
  const srcs = [...new Set([...(s.source_urls || []), ...(a.source_urls || []), subsidy.officialUrl, c.garbage?.officialUrl].filter(Boolean))];
  const faq = [
    { q: `${c.city}で粗大ごみを出すには、どこに申し込みますか？`, a: s.apply_method || `${c.city}の公式サイト（粗大ごみの案内ページ）で申込方法をご確認ください。` },
    { q: `${c.city}の粗大ごみの料金はいくらですか？`, a: s.fee_system || "公式の料金表をご確認ください。" },
    { q: `実家の片付けをまとめて業者に頼むといくらかかりますか？`, a: "新潟県内の業者が公開している料金の目安は、1Kで2.5万〜5万円から、3LDKで15.8万〜23万円からです（みんなの遺品整理 新潟県ページの掲載料金、2026年10月1日確認）。量や搬出条件で変わるため、2〜3社の見積もりを比べることをおすすめします。" },
  ];
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
  const body = `
<article class="city">
<header class="page-head">
  <p class="eyebrow">${esc(c.area)}エリア ${c.core ? "・詳しいガイド" : ""}</p>
  <h1>${esc(c.city)}の実家じまい・粗大ごみ・空き家ガイド</h1>
  <p class="lead">${esc(c.city)}の実家を片付けるときに必要な、粗大ごみの出し方と料金、ごみの持ち込み先、解体の補助金、空き家バンクの情報を、${esc(c.city)}の公式サイトを出典にまとめました。</p>
  <p class="small">確認日: ${esc(s.checked_date || TODAY)}（粗大ごみ）／ 補助金は<a href="https://www.fureaino-oka.com/" rel="noopener">ふれあいの丘</a>の自治体データを使用</p>
</header>

<nav class="toc" aria-label="目次"><ol>
<li><a href="#sodai">粗大ごみの出し方と料金</a></li><li><a href="#bring">ごみの持ち込み</a></li><li><a href="#appliance">家電リサイクル・市で出せない物</a></li><li><a href="#akiya">空き家・解体の補助金・雪の支援</a></li><li><a href="#gyosha">まとめて頼む場合</a></li><li><a href="#faq">よくある質問</a></li></ol></nav>

<section id="sodai">
<h2>${esc(c.city)}の粗大ごみの出し方と料金</h2>
${s.apply_method ? `<h3>申し込み方法</h3><p>${esc(s.apply_method)}</p>` : `<p>申し込み方法は<a href="${esc(c.garbage?.officialUrl || "#")}" rel="noopener nofollow">${esc(c.city)}の公式サイト</a>でご確認ください。${c.garbage?.phone ? `問い合わせ先: ${esc(c.garbage.phone)}` : ""}</p>`}
${s.fee_system ? `<h3>料金の仕組み</h3><p>${esc(s.fee_system)}</p>` : ""}
${feeRows ? `<h3>主な品目の料金（公式料金表より）</h3><table class="fee"><thead><tr><th>品目</th><th class="n">料金</th></tr></thead><tbody>${feeRows}</tbody></table>` : ""}
${s.collection_frequency ? `<h3>収集の頻度</h3><p>${esc(s.collection_frequency)}</p>` : ""}
${s.special_notes ? `<p class="note">${esc(s.special_notes)}</p>` : ""}
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
  ? `<p><strong>${esc(a.demolition_subsidy.name)}</strong>${a.demolition_subsidy.max_amount ? `：${esc(a.demolition_subsidy.max_amount)}` : ""}。${a.demolition_subsidy.url ? `<a href="${esc(a.demolition_subsidy.url)}" rel="noopener nofollow">公式ページ</a>` : ""}</p><p class="small">受付期間や対象は年度ごとに変わります。申請は着工前が原則です。確認日: ${esc(a.checked_date || TODAY)}</p>`
  : subsidy.has
    ? `<p><strong>${esc(subsidy.name)}</strong>${subsidy.maxAmount ? `（${esc(subsidy.maxAmount)}）` : ""}。${subsidy.conditions ? `対象: ${esc(Array.isArray(subsidy.conditions) ? subsidy.conditions.join("／") : subsidy.conditions)}` : ""} ${subsidy.officialUrl ? `<a href="${esc(subsidy.officialUrl)}" rel="noopener nofollow">公式ページ</a>` : ""}</p><p class="small">制度は年度で変わります。最新の受付状況は公式ページでご確認ください。</p>`
    : `<p>${esc(c.city)}では、個人向けの空き家解体補助金を公式サイトで確認できませんでした${subsidy.window ? `（担当: ${esc(subsidy.window)}${subsidy.phone ? ` ${esc(subsidy.phone)}` : ""}）` : ""}。制度は年度で変わるため、市の窓口にご確認ください。</p>`}
${a.akiya_bank_url ? `<h3>空き家バンク</h3><p>${esc(c.city)}の空き家バンク: <a href="${esc(a.akiya_bank_url)}" rel="noopener nofollow">${esc(a.akiya_bank_url)}</a>${a.akiya_bank_operator ? `（運営: ${esc(a.akiya_bank_operator)}）` : ""}。売る・貸すを考えるなら、解体の前に登録できるか確認する価値があります。</p>` : ""}
${a.snow_support?.name ? `<h3>雪下ろし・除雪の支援</h3><p><strong>${esc(a.snow_support.name)}</strong>${a.snow_support.target ? `：対象は${esc(a.snow_support.target)}` : ""}${a.snow_support.amount ? `、${esc(a.snow_support.amount)}` : ""}。${a.snow_support.url ? `<a href="${esc(a.snow_support.url)}" rel="noopener nofollow">公式ページ</a>` : ""}</p>` : ""}
${a.akiya_consult?.section ? `<p>空き家の相談窓口: ${esc(a.akiya_consult.section)}${a.akiya_consult.url ? `（<a href="${esc(a.akiya_consult.url)}" rel="noopener nofollow">案内ページ</a>）` : ""}</p>` : ""}
<p class="small">空き家を売る・買い取ってもらう選択肢は<a href="${url("/guide/akiya-uru-kasu-kowasu/")}">売る・貸す・壊すの比べ方</a>で、墓じまいや仏壇の処分は姉妹サイト<a href="https://hakarau.jp/" rel="noopener">ハカラウ</a>で扱っています。</p>
</section>

<section id="gyosha">
<h2>${esc(c.city)}の実家をまとめて片付けてもらうには</h2>
<p>自分で出せる量を超えるとき、遠方で日程が取れないとき、積雪期で搬出が難しいときは、業者に頼む選択肢があります。家庭のごみを運ぶには市町村の「一般廃棄物収集運搬」の許可が必要です。許可のない業者が回収した物は不法投棄につながることがあるため、見積もりの際に許可の有無を確認してください。</p>
${partners.filter((p) => (p.cities || []).includes(c.cityId)).length ? `<ul class="partners">${partners.filter((p) => (p.cities || []).includes(c.cityId)).map((p) => `<li><strong>${esc(p.name)}</strong>（${esc(p.base)}）${p.note ? ` — ${esc(p.note)}` : ""} <span class="pr">PR</span></li>`).join("")}</ul>` : ""}
${ctaBox(c.city)}
</section>

<section id="faq" class="faq">
<h2>よくある質問</h2>
${faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}
</section>

${sourceList(srcs, s.checked_date)}
${(s.notes || "").toString().includes("要確認") ? `<p class="small">※ 一部に公式サイトで確認できなかった項目があります。該当箇所は記載を控えています。</p>` : ""}
</article>`;
  write(`/city/${c.cityId}/`, layout({ title: `${c.city}の実家じまい・粗大ごみ・空き家ガイド`, description: `${c.city}の粗大ごみの出し方・料金・持ち込み先、解体補助金、空き家バンク、雪の支援を公式情報からまとめました。実家の片付けをまとめて頼める地元業者への相談も。`, pathname: `/city/${c.cityId}/`, body, breadcrumbs: [{ name: "市町村別ガイド", path: "/city/" }, { name: c.city, path: `/city/${c.cityId}/` }], jsonld: [faqLd], updated: s.checked_date || TODAY }));
}

function cityIndex() {
  const groups = Object.entries(AREA).map(([area, ids]) => `<section><h2>${esc(area)}</h2><ul class="city-grid">${ids.map((id) => cityById[id]).filter(Boolean).map((c) => `<li><a href="${url(`/city/${c.cityId}/`)}">${esc(c.city)}</a>${c.core ? '<span class="badge">詳細</span>' : ""}${c.subsidy?.has ? '<span class="badge sub">解体補助金</span>' : ""}</li>`).join("")}</ul></section>`).join("");
  const body = `<header class="page-head"><h1>新潟県 市町村別の実家じまいガイド</h1><p class="lead">30市町村ごとに、粗大ごみの出し方・料金・持ち込み先、空き家の解体補助金、空き家バンク、雪の支援をまとめています。「詳細」のある市は、料金表や持ち込み施設まで掲載しています。</p></header>${groups}${ctaBox()}`;
  write("/city/", layout({ title: "市町村別ガイド（新潟県30市町村）", description: "新潟県30市町村の粗大ごみの出し方・料金・持ち込み先、空き家の解体補助金、空き家バンクを一覧で。", pathname: "/city/", body, breadcrumbs: [{ name: "市町村別ガイド", path: "/city/" }] }));
}

// ---------- ガイド ----------
function guidePages() {
  for (const g of guides) {
    const m = g.meta;
    const artLd = { "@context": "https://schema.org", "@type": "Article", headline: m.title, description: m.description, dateModified: m.updated || TODAY, author: { "@type": "Organization", name: SITE.operator }, publisher: { "@type": "Organization", name: SITE.name }, mainEntityOfPage: abs(`/guide/${g.slug}/`) };
    const body = `<article class="guide"><header class="page-head"><p class="eyebrow">実家じまいの進め方</p><h1>${esc(m.title)}</h1><p class="lead">${esc(m.description || "")}</p><p class="small">更新日: ${esc(m.updated || TODAY)}</p></header><div class="prose">${g.html}</div>${ctaBox()}</article>`;
    write(`/guide/${g.slug}/`, layout({ title: m.title, description: m.description || "", pathname: `/guide/${g.slug}/`, body, breadcrumbs: [{ name: "実家じまいの進め方", path: "/guide/" }, { name: m.title, path: `/guide/${g.slug}/` }], jsonld: [artLd], updated: m.updated }));
  }
  const list = guides.map((g) => `<li><a href="${url(`/guide/${g.slug}/`)}"><strong>${esc(g.meta.title)}</strong><span>${esc(g.meta.description || "")}</span></a></li>`).join("");
  write("/guide/", layout({ title: "実家じまいの進め方（新潟版）", description: "新潟の実家を片付ける手順、費用、県外からの段取り、冬の雪対策、業者に頼む基準をまとめたガイド。", pathname: "/guide/", body: `<header class="page-head"><h1>実家じまいの進め方（新潟版）</h1><p class="lead">何から始めるか、いくらかかるか、県外からどう進めるか、冬はどうするか。新潟の事情に合わせて書いています。</p></header><ul class="guide-list">${list}</ul>${ctaBox()}`, breadcrumbs: [{ name: "実家じまいの進め方", path: "/guide/" }] }));
}

// ---------- 業者・料金 ----------
function gyoshaPage() {
  const cs = prices.companies || [];
  const stat = (k) => { const v = cs.map((c) => c[k]).filter((x) => x); v.sort((a, b) => a - b); return v.length ? { n: v.length, min: v[0], max: v[v.length - 1], med: v[Math.floor(v.length / 2)] } : null; };
  const rows = [["1K", stat("k1")], ["1LDK", stat("ldk1")], ["2LDK", stat("ldk2")], ["3LDK", stat("ldk3")]].map(([l, s]) => s ? `<tr><td>${l}</td><td class="n">${yen(s.min)}〜</td><td class="n">${yen(s.med)}〜</td><td class="n">${yen(s.max)}〜</td><td class="n">${s.n}社</td></tr>` : "").join("");
  const list = cs.map((c) => `<tr><td>${esc(c.name)}${c.badge ? `<br><span class="small">${esc(c.badge)}</span>` : ""}</td><td>${esc(c.area)}</td><td class="n">${c.k1 ? yen(c.k1) + "〜" : "—"}</td><td class="n">${c.ldk1 ? yen(c.ldk1) + "〜" : "—"}</td><td class="n">${c.ldk2 ? yen(c.ldk2) + "〜" : "—"}</td><td class="n">${c.ldk3 ? yen(c.ldk3) + "〜" : "—"}</td></tr>`).join("");
  const body = `<article class="gyosha"><header class="page-head"><h1>新潟の遺品整理・実家片付け業者の料金と選び方</h1><p class="lead">新潟県内の業者が公開している間取り別の料金を集計し、見積もりで確認すべき点と、許可のある業者の見分け方をまとめました。</p><p class="small">料金の出典: ${esc(prices.source || "")}（確認日 ${esc(prices.checked || TODAY)}）。各社の「〜円」表記を転記しています。最新の料金は各社にご確認ください。</p></header>
<section><h2>間取り別の料金の目安（新潟県内${cs.length}社の公開料金）</h2><table class="fee"><thead><tr><th>間取り</th><th class="n">最安</th><th class="n">中央値</th><th class="n">最高</th><th class="n">公開社数</th></tr></thead><tbody>${rows}</tbody></table><p>「〜円」は最低料金です。実際の見積もりは、物の量、階段の有無、トラックを停められるか、買取できる物があるか、積雪期かどうかで変わります。</p></section>
<section><h2>見積もりで確認する6つのこと</h2><ol class="checks"><li><strong>一般廃棄物収集運搬の許可</strong>（市町村ごとの許可。許可業者の一覧は各市の公式サイトにあります）か、許可業者と提携しているか</li><li><strong>見積もりが訪問か写真か</strong>。一軒家は訪問見積もりが基本です</li><li><strong>追加料金の条件</strong>（量が増えた場合、エアコンの取り外し、仏壇や神棚の供養）</li><li><strong>買取の有無と、買取額を作業費から差し引けるか</strong></li><li><strong>作業日と立ち会い</strong>。遠方の場合、鍵の受け渡しと作業後の写真報告ができるか</li><li><strong>積雪期の対応</strong>。12〜3月は搬出経路の除雪が必要になることがあります</li></ol></section>
<section><h2>新潟県内の業者と公開料金の一覧</h2><div class="table-wrap"><table class="fee"><thead><tr><th>業者</th><th>所在地</th><th class="n">1K</th><th class="n">1LDK</th><th class="n">2LDK</th><th class="n">3LDK</th></tr></thead><tbody>${list}</tbody></table></div><p class="small">掲載順は出典サイトの表示順です。当サイトは特定の業者を推薦するものではありません。所在地が「新潟」とだけ表記されている業者は、県内のどの地域に対応するかを個別にご確認ください。</p></section>
${partners.length ? `<section><h2>長岡の運営者が直接確かめた業者 <span class="pr">PR</span></h2><ul class="partners">${partners.map((p) => `<li><strong>${esc(p.name)}</strong>（${esc(p.base)}）対応: ${esc((p.cities || []).map((id) => cityById[id]?.city).filter(Boolean).join("・"))}${p.note ? ` — ${esc(p.note)}` : ""}</li>`).join("")}</ul><p class="small">掲載業者からは掲載料または紹介料を受け取っています。掲載の条件は<a href="${url("/keisai/")}">業者の掲載について</a>をご覧ください。</p></section>` : ""}
${ctaBox()}
<section class="sources"><h2>出典・参考</h2><ul><li><a href="https://m-ihinseiri.jp/partners/pref-15/" rel="noopener nofollow">みんなの遺品整理 新潟県の遺品整理業者</a>（公開料金の転記元）</li><li><a href="https://www.env.go.jp/recycle/waste/ippan/" rel="noopener nofollow">環境省 一般廃棄物の処理（無許可の回収業者に関する注意喚起）</a></li></ul></section>
</article>`;
  write("/gyosha/", layout({ title: "新潟の遺品整理・実家片付け業者の料金と選び方", description: `新潟県内${cs.length}社の公開料金を間取り別に集計。1Kは2.5万円〜、3LDKは15.8万円〜。見積もりで確認する6点と、一般廃棄物収集運搬許可の見分け方。`, pathname: "/gyosha/", body, breadcrumbs: [{ name: "業者の料金と選び方", path: "/gyosha/" }] }));
}

// ---------- 固定ページ（content/pages/*.md） ----------
function staticPages() {
  for (const p of pages) {
    const m = p.meta;
    const body = `<article class="page"><header class="page-head"><h1>${esc(m.title)}</h1>${m.description ? `<p class="lead">${esc(m.description)}</p>` : ""}</header><div class="prose">${p.html}</div>${m.cta === "true" ? ctaBox() : ""}</article>`;
    write(`/${p.slug}/`, layout({ title: m.title, description: m.description || m.title, pathname: `/${p.slug}/`, body, breadcrumbs: [{ name: m.title, path: `/${p.slug}/` }], noindex: m.noindex === "true" }));
  }
}

// ---------- トップ ----------
function home() {
  const coreCards = CORE.map((id) => cityById[id]).filter(Boolean).map((c) => `<li><a href="${url(`/city/${c.cityId}/`)}"><strong>${esc(c.city)}</strong><span>粗大ごみ・持ち込み・補助金</span></a></li>`).join("");
  const guideCards = guides.slice(0, 5).map((g) => `<li><a href="${url(`/guide/${g.slug}/`)}"><strong>${esc(g.meta.title)}</strong></a></li>`).join("");
  const body = `
<section class="hero">
    <h1>新潟の実家を、遠くからでも、雪の季節でも、片付けられるように。</h1>
  <p class="lead">粗大ごみの出し方と料金、ごみの持ち込み先、空き家の解体補助金、雪下ろしの支援。新潟県30市町村の公式情報を1か所にまとめ、まとめて頼みたいときは地元の許可業者につなぎます。</p>
  <form class="city-jump" action="${url("/city/")}" method="get" onsubmit="var v=this.c.value;if(v){location.href='${url("/city/")}'+v+'/';return false;}">
    <label for="c">市町村を選ぶ</label>
    <select id="c" name="c">${cities.map((c) => `<option value="${c.cityId}">${esc(c.city)}</option>`).join("")}</select>
    <button class="btn" type="submit">ガイドを見る</button>
  </form>
</section>
<ol class="steps">
  <li><span class="num">01</span><h2>市のルールを知る</h2><p>粗大ごみは申し込み制で、品目ごとに料金が決まっています。持ち込めば早く安く済むこともあります。</p><a href="${url("/city/")}">市町村別ガイドへ</a></li>
  <li><span class="num">02</span><h2>進め方と費用を把握する</h2><p>何から手を付けるか、帰省2回で終わらせる段取り、冬の雪対策、業者に頼む分かれ目。</p><a href="${url("/guide/")}">実家じまいの進め方へ</a></li>
  <li><span class="num">03</span><h2>頼むなら許可のある業者に</h2><p>県内${(prices.companies || []).length}社の公開料金を集計。許可の確認方法と、見積もりで聞くべきこと。</p><a href="${url("/gyosha/")}">業者の料金と選び方へ</a></li>
</ol>
<section><h2>詳しいガイドのある市</h2><ul class="card-grid">${coreCards}</ul><p><a href="${url("/city/")}">30市町村すべてを見る →</a></p></section>
<section><h2>実家じまいの進め方（新潟版）</h2><ul class="guide-list compact">${guideCards}</ul></section>
<section class="why"><h2>このサイトについて</h2><p>運営者は長岡市に住んでいます。市町村の公式サイトを出典に、確認日を付けて掲載し、業者は直接会って確かめたところだけを載せます。墓じまいは姉妹サイトの<a href="https://hakarau.jp/" rel="noopener">ハカラウ</a>、空き家の解体補助金の全国版は<a href="https://www.fureaino-oka.com/" rel="noopener">ふれあいの丘</a>で扱っています。</p></section>
${ctaBox()}`;
  const orgLd = { "@context": "https://schema.org", "@type": "WebSite", name: SITE.name, url: abs("/"), description: SITE.tagline, publisher: { "@type": "Organization", name: SITE.operator } };
  write("/", layout({ title: SITE.name, description: `新潟県30市町村の粗大ごみの出し方・料金・持ち込み先、空き家の解体補助金、雪の支援を公式情報からまとめた実家じまいの案内。長岡から運営。まとめて頼むときは地元の許可業者へ。`, pathname: "/", body, jsonld: [orgLd] }));
}

// ---------- sitemap / robots / feed / 404 ----------
function extras() {
  const urls = ["/", "/city/", "/guide/", "/gyosha/", "/mitsumori/", ...cities.map((c) => `/city/${c.cityId}/`), ...guides.map((g) => `/guide/${g.slug}/`), ...pages.filter((p) => p.meta.noindex !== "true").map((p) => `/${p.slug}/`)];
  const uniq = [...new Set(urls)];
  write("/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${uniq.map((u) => `<url><loc>${abs(u)}</loc><lastmod>${TODAY}</lastmod></url>`).join("\n")}\n</urlset>\n`);
  write("/robots.txt", `User-agent: *\nAllow: /\nSitemap: ${abs("/sitemap.xml")}\n`);
  write("/feed.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${esc(SITE.name)}</title><link>${abs("/")}</link><description>${esc(SITE.tagline)}</description>${guides.map((g) => `<item><title>${esc(g.meta.title)}</title><link>${abs(`/guide/${g.slug}/`)}</link><description>${esc(g.meta.description || "")}</description></item>`).join("")}</channel></rss>\n`);
  write("/404.html", layout({ title: "ページが見つかりません", description: "ページが見つかりません", pathname: "/404.html", body: `<h1>ページが見つかりません</h1><p><a href="${url("/")}">トップページへ戻る</a></p>`, noindex: true }));
  if (fs.existsSync(path.join(ROOT, "public"))) fs.cpSync(path.join(ROOT, "public"), OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, ".nojekyll"), "");
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
home(); cityIndex(); cities.forEach(cityPage); guidePages(); gyoshaPage(); staticPages(); extras();
console.log(`built: ${cities.length} cities, ${guides.length} guides, ${pages.length} pages → ${OUT}`);
