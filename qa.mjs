// Q&A（よくある疑問）を、生成AIと検索エンジンが引用しやすい形で出す。
// 1. content/qa/*.json → /qa/（索引）と /qa/<id>/（分類ごと）。1問ごとに #q-<id> で直接リンクでき、FAQPage の構造化データを付ける。
// 2. 既存ガイドの「よくある質問／よくある疑問」節から Q&A を抜き出し、各ガイドに FAQPage の構造化データを付ける。
// 書き方の約束: 質問は読者の言葉。答えの1文目だけで意味が通る（主語と地名を省かない）。数字には単位と出典。
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";

const strip = (s) => String(s ?? "").replace(/<[^>]+>/g, "")
  .replace(/\[要確認[:：]\s*([^\]]+)\]/g, "※確認中（$1）").replace(/\[要確認\]/g, "※確認中")
  .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_`>#]/g, "").replace(/\s+/g, " ").trim();

export function loadQa(root) {
  const dir = path.join(root, "content/qa");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")))
    .filter((c) => c && c.id && Array.isArray(c.items) && c.items.length)
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

export function faqLd(items) {
  return { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map((it) => ({
    "@type": "Question", name: strip(it.q),
    acceptedAnswer: { "@type": "Answer", text: strip([it.a, ...(it.detail || [])].join(" ")) },
  })) };
}

// ガイド本文（Markdown）から FAQ を抜く。対応する書き方:
//   ## …よくある質問／よくある疑問 … の下にある
//   (a) ### 質問  → 次の見出しまでが答え
//   (b) **Q　質問** または **質問？** の行 → 次の太字の質問行・見出しまでが答え
export function extractGuideFaq(md) {
  const lines = String(md).replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  let inFaq = false, cur = null;
  const flush = () => { if (cur && cur.a.join(" ").trim()) out.push({ q: strip(cur.q), a: strip(cur.a.join(" ")) }); cur = null; };
  for (const line of lines) {
    if (/^##\s/.test(line) && !/^###/.test(line)) { flush(); inFaq = /よくある(質問|疑問)|FAQ|Q&A/.test(line); continue; }
    if (!inFaq) continue;
    let m;
    if ((m = line.match(/^###\s+(.+)/))) { flush(); cur = { q: m[1].replace(/^Q[\s　.:：]*/, ""), a: [] }; continue; }
    if ((m = line.match(/^\*\*(?:Q[\s　.:：]*)?(.+?)\*\*\s*$/)) && /[？?。]$|か$/.test(m[1].trim())) { flush(); cur = { q: m[1], a: [] }; continue; }
    if (cur && line.trim()) cur.a.push(line.replace(/^\*\*?A[\s　.:：]*\**/, ""));
  }
  flush();
  return out.filter((x) => x.q.length >= 6 && x.a.length >= 10).slice(0, 30);
}

export function renderQaPages(cats, h) {
  const { esc, url } = h;
  const inl = (t) => marked.parseInline(String(t ?? ""));
  const link = (L) => {
    if (!L) return "";
    if (L.guide) return `<a href="${url(`/guide/${L.guide}/`)}">${esc(L.label || L.guide)}</a>`;
    if (L.city) return `<a href="${url("/city/")}">${esc(L.label || "市町村別ガイド")}</a>`;
    if (L.page) return `<a href="${url(`/${L.page}/`)}">${esc(L.label || L.page)}</a>`;
    if (L.href) return `<a href="${esc(L.href)}" rel="noopener nofollow">${esc(L.label || L.href)}</a>`;
    return "";
  };
  const style = `<style>
.qa-cats{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:0;border-top:1px solid var(--line-strong,#ccc)}
.qa-cats li a{display:block;padding:12px 10px;border-bottom:1px solid var(--line,#ddd);text-decoration:none;color:inherit}.qa-cats strong{display:block}.qa-cats span{font-size:13px;color:var(--mute,#666)}
.qa-item{border-top:1px solid var(--line,#ddd);padding:16px 0 6px}.qa-item h2,.qa-item h3{font-size:17px;margin:0 0 6px;line-height:1.5}
.qa-a{font-weight:600}.qa-a::before{content:"答え ";color:var(--mute,#666);font-weight:400;font-size:13px}
.qa-meta{font-size:13px;color:var(--mute,#666)}.qa-meta a{margin-right:6px}
.qa-list{columns:2 300px;padding-left:1.2em}.qa-list li{break-inside:avoid;margin-bottom:4px;font-size:14.5px}
</style>`;
  const pages = [];
  const total = cats.reduce((n, c) => n + c.items.length, 0);
  // 索引
  const idxBody = `${style}<article class="page"><header class="page-head"><p class="eyebrow">よくある疑問</p><h1>実家じまいの疑問${total}問（新潟版）</h1><p class="lead">新潟の実家じまいで迷いやすい疑問に、公式の情報をもとに短く答えます。答えの1文目だけで結論が分かるように書き、詳しい手順は各記事につないでいます。</p></header>
<ul class="qa-cats">${cats.map((c) => `<li><a href="${url(`/qa/${c.id}/`)}"><strong>${esc(c.title)}（${c.items.length}問）</strong><span>${esc(c.lead || "")}</span></a></li>`).join("")}</ul>
${cats.map((c) => `<section><h2><a href="${url(`/qa/${c.id}/`)}">${esc(c.title)}</a></h2><ul class="qa-list">${c.items.map((it) => `<li><a href="${url(`/qa/${c.id}/`)}#q-${esc(it.id)}">${esc(strip(it.q))}</a></li>`).join("")}</ul></section>`).join("")}
</article>`;
  pages.push({ path: "/qa/", title: `実家じまいの疑問${total}問｜新潟の手続き・片付け・空き家`, description: `新潟の実家じまいで迷いやすい疑問${total}問に、公式の情報をもとに短く答えます。家族の決め方、期限のある手続き、仕分け、ごみと業者、空き家の売却・解体・補助金、冬の管理まで。`, body: idxBody, jsonld: [], crumbs: [{ name: "よくある疑問", path: "/qa/" }] });
  // 分類ごと
  for (const c of cats) {
    const body = `${style}<article class="page qa"><header class="page-head"><p class="eyebrow">よくある疑問</p><h1>${esc(c.title)}（${c.items.length}問）</h1><p class="lead">${inl(c.lead || "")}</p><p class="small">更新日: ${esc(c.updated || "")}</p></header>
<nav class="toc" aria-label="質問の一覧"><ol>${c.items.map((it) => `<li><a href="#q-${esc(it.id)}">${esc(strip(it.q))}</a></li>`).join("")}</ol></nav>
${c.items.map((it) => `<section class="qa-item" id="q-${esc(it.id)}"><h2>${esc(strip(it.q))}</h2><p class="qa-a">${inl(it.a)}</p>${(it.detail || []).map((p) => `<p>${inl(p)}</p>`).join("")}<p class="qa-meta">${(it.links || []).map(link).join("")}${(it.sources || []).map((s) => `<a href="${esc(s.url)}" rel="noopener nofollow">出典: ${esc(s.label)}</a>`).join("")}${it.checked ? `確認日 ${esc(it.checked)}` : ""}</p></section>`).join("")}
<p><a href="${url("/qa/")}">疑問の一覧に戻る</a>　<a href="${url("/guide/jikkajimai-tejun-niigata/")}">実家じまいの進め方を見る</a></p></article>`;
    pages.push({ path: `/qa/${c.id}/`, title: c.title + (c.titleSuffix ? `｜${c.titleSuffix}` : "｜実家じまいの疑問（新潟版）"), description: c.description || c.lead || c.title, body, jsonld: [faqLd(c.items)], crumbs: [{ name: "よくある疑問", path: "/qa/" }, { name: c.title, path: `/qa/${c.id}/` }], updated: c.updated });
  }
  return pages;
}
