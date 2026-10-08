// 「実家じまいの進め方」ページ（サイトの背骨）を content/roadmap/roadmap.json から組み立てる。
// build.mjs の guidePages() から、slug が ROADMAP_SLUG の記事の本文の代わりに呼ばれる。
// 方針: 本文はすべて静的HTMLに出す（検索・JS無効でも全部読める）。JS は「状況で絞る」「市町村でリンク先を切り替える」「やることのチェックを覚える」だけ。
import { marked } from "marked";

export const ROADMAP_SLUG = "jikkajimai-tejun-niigata";

export function renderRoadmap(data, h) {
  const { esc, url, cities } = h;
  const sits = data.situations || [];
  const sitIds = sits.map((s) => s.id);
  const inl = (t) => marked.parseInline(String(t ?? ""));
  const sitAttr = (list) => {
    const l = (list || []).filter((x) => sitIds.includes(x));
    return l.length && l.length < sitIds.length ? ` data-sits="${l.join(" ")}"` : "";
  };
  const sitTags = (list) => {
    const l = (list || []).filter((x) => sitIds.includes(x));
    if (!l.length || l.length === sitIds.length) return "";
    return `<span class="rm-tags">${l.map((id) => `<span class="rm-tag">${esc(sits.find((s) => s.id === id)?.short || id)}</span>`).join("")}</span>`;
  };
  const link = (L) => {
    if (!L) return "";
    if (L.guide) return `<a href="${url(`/guide/${L.guide}/`)}">${esc(L.label || L.guide)}</a>`;
    if (L.city) return `<a href="${url("/city/")}" data-city-anchor="${esc(L.city)}">${esc(L.label || "市町村のページ")}</a>`;
    if (L.page) return `<a href="${url(`/${L.page}/`)}">${esc(L.label || L.page)}</a>`;
    if (L.href) return `<a href="${esc(L.href)}"${/^https?:/.test(L.href) ? ' rel="noopener nofollow"' : ""}>${esc(L.label || L.href)}</a>`;
    return "";
  };
  const links = (arr) => (arr && arr.length ? `<p class="rm-links">${arr.map(link).join("<span aria-hidden=\"true\">／</span>")}</p>` : "");

  const picker = `<section class="rm-pick" aria-label="あなたの状況">
<h2 class="rm-pick-h">いまの状況を選んでください</h2>
<p class="small">選ぶと、その状況に関係する手順と期限だけを表示します。選ばなければ、すべてを表示します。</p>
<div class="rm-sit" role="group" aria-label="状況">${sits.map((s) => `<button type="button" data-sit="${esc(s.id)}" aria-pressed="false"><strong>${esc(s.label)}</strong><span>${esc(s.hint || "")}</span></button>`).join("")}<button type="button" data-sit="" aria-pressed="true" class="rm-all"><strong>すべて表示</strong><span>まだ決まっていない・全体を見たい</span></button></div>
<div class="rm-city"><label for="rm-city-sel">実家のある市町村</label><select id="rm-city-sel"><option value="">選ぶと、ごみ・補助金のリンクがその市町村のページになります</option>${(cities || []).map((c) => `<option value="${esc(c.cityId)}">${esc(c.city)}</option>`).join("")}</select></div>
${sits.map((s) => `<div class="rm-sitnote" data-sits="${esc(s.id)}"><p><strong>${esc(s.label)}の場合:</strong> ${inl(s.lead)}</p>${s.first && s.first.length ? `<ol class="rm-first">${s.first.map((f) => `<li>${inl(f)}</li>`).join("")}</ol>` : ""}</div>`).join("")}
</section>`;

  const overview = `<nav class="rm-flow" aria-label="全体の流れ"><ol>${(data.stages || []).map((st) => `<li><a href="#stage-${st.id}"><span class="rm-n">段階${st.id}</span><strong>${esc(st.title)}</strong><span class="rm-p">${esc(st.period || "")}</span></a></li>`).join("")}</ol></nav>`;

  const deadlines = data.deadlines && data.deadlines.length ? `<section id="deadlines" class="rm-sec"><h2>${esc(data.deadlinesTitle || "期限のある手続きの早見表")}</h2>${data.deadlinesLead ? `<p>${inl(data.deadlinesLead)}</p>` : ""}
<div class="rm-tablewrap"><table class="rm-dl"><thead><tr><th>期限</th><th>手続き</th><th>数え始め</th><th>どこで</th><th>過ぎると</th></tr></thead><tbody>${data.deadlines.map((d) => `<tr${sitAttr(d.situations)}><td class="rm-due">${esc(d.due)}</td><td><strong>${inl(d.label)}</strong>${sitTags(d.situations)}${d.link ? `<br>${link(d.link)}` : ""}</td><td>${inl(d.start || "")}</td><td>${inl(d.where || "")}</td><td>${inl(d.risk || "")}${d.source ? ` <a class="rm-src" href="${esc(d.source)}" rel="noopener nofollow">出典</a>` : ""}</td></tr>`).join("")}</tbody></table></div></section>` : "";

  const forks = data.forks && data.forks.length ? `<section id="forks" class="rm-sec"><h2>${esc(data.forksTitle || "先に決める分かれ道")}</h2>${data.forksLead ? `<p>${inl(data.forksLead)}</p>` : ""}${data.forks.map((f) => `<div class="rm-fork"${sitAttr(f.situations)}><h3>${esc(f.q)}</h3>${f.why ? `<p>${inl(f.why)}</p>` : ""}<div class="rm-opts">${(f.options || []).map((o) => `<div class="rm-opt"><p class="rm-opt-h">${esc(o.label)}</p><p>${inl(o.then)}</p>${links(o.links)}</div>`).join("")}</div></div>`).join("")}</section>` : "";

  const stages = (data.stages || []).map((st) => {
    const meta = [st.period ? `<div><dt>かかる期間の目安</dt><dd>${inl(st.period)}</dd></div>` : "", st.who ? `<div><dt>誰が</dt><dd>${inl(st.who)}</dd></div>` : "", st.costNote ? `<div><dt>お金</dt><dd>${inl(st.costNote)}</dd></div>` : ""].join("");
    const todo = (st.todo || []).map((t, i) => `<li${sitAttr(t.situations)}><label><input type="checkbox" data-key="s${st.id}-${i}"><span>${inl(t.text)}</span></label>${sitTags(t.situations)}${t.detail ? `<p class="rm-detail">${inl(t.detail)}</p>` : ""}${links(t.links)}</li>`).join("");
    const costs = st.costs && st.costs.length ? `<h3>費用の目安（公式・公開されている数字だけ）</h3><div class="rm-tablewrap"><table><thead><tr><th>項目</th><th>金額</th><th>出典・注意</th></tr></thead><tbody>${st.costs.map((c) => `<tr${sitAttr(c.situations)}><td>${inl(c.label)}</td><td>${inl(c.value)}</td><td>${inl(c.note || "")}${c.source ? ` <a class="rm-src" href="${esc(c.source)}" rel="noopener nofollow">出典</a>` : ""}</td></tr>`).join("")}</tbody></table></div>` : "";
    const qa = st.questions && st.questions.length ? `<h3>ここで迷うこと</h3><div class="rm-qa">${st.questions.map((q) => `<details${sitAttr(q.situations)}><summary>${esc(q.q)}</summary><div>${(Array.isArray(q.a) ? q.a : [q.a]).map((p) => `<p>${inl(p)}</p>`).join("")}${links(q.links)}</div></details>`).join("")}</div>` : "";
    const niigata = st.niigata && st.niigata.length ? `<h3>新潟の窓口と制度</h3><ul class="rm-ni">${st.niigata.map((n) => `<li${sitAttr(n.situations)}>${inl(n.text)}${n.link ? ` ${link(n.link)}` : ""}</li>`).join("")}</ul>` : "";
    const done = st.doneWhen ? `<p class="rm-done"><strong>この段階が終わった目安:</strong> ${inl(st.doneWhen)}</p>` : "";
    const cta = st.cta ? `<aside class="rm-cta"><p><strong>${esc(st.cta.title)}</strong></p><p>${inl(st.cta.text)}</p><p>${link(st.cta.link)}${st.cta.tool ? `　${link(st.cta.tool)}` : ""}</p></aside>` : "";
    return `<section id="stage-${st.id}" class="rm-sec rm-stage"${sitAttr(st.situations)}><p class="rm-eyebrow">段階${st.id}</p><h2>${esc(st.title)}</h2>${st.goal ? `<p class="rm-goal">${inl(st.goal)}</p>` : ""}${meta ? `<dl class="rm-meta">${meta}</dl>` : ""}${(st.body || []).map((p) => `<p>${inl(p)}</p>`).join("")}<h3>やること</h3><ol class="rm-todo">${todo}</ol>${costs}${qa}${niigata}${done}${cta}${st.next && st.next.length ? `<h3>この段階で読む記事</h3>${links(st.next)}` : ""}</section>`;
  }).join("");

  const season = data.season && data.season.length ? `<section id="season" class="rm-sec"><h2>${esc(data.seasonTitle || "新潟では、いつやるか")}</h2>${data.seasonLead ? `<p>${inl(data.seasonLead)}</p>` : ""}<div class="rm-tablewrap"><table class="rm-season"><thead><tr><th>時期</th><th>新潟で起きること</th><th>やると良いこと</th></tr></thead><tbody>${data.season.map((m) => `<tr><td class="rm-due">${esc(m.when)}</td><td>${inl(m.happens)}</td><td>${inl(m.todo)}${m.source ? ` <a class="rm-src" href="${esc(m.source)}" rel="noopener nofollow">出典</a>` : ""}</td></tr>`).join("")}</tbody></table></div></section>` : "";

  const family = data.family ? `<section id="family" class="rm-sec"><h2>${esc(data.family.title)}</h2>${(data.family.body || []).map((p) => `<p>${inl(p)}</p>`).join("")}${data.family.agenda && data.family.agenda.length ? `<h3>家族で決める議題</h3><ol class="rm-todo">${data.family.agenda.map((a, i) => `<li><label><input type="checkbox" data-key="fam-${i}"><span>${inl(a)}</span></label></li>`).join("")}</ol>` : ""}${links(data.family.links)}</section>` : "";

  const faq = data.faq && data.faq.length ? `<section id="faq" class="faq rm-sec"><h2>よくある質問</h2>${data.faq.map((f) => `<details${sitAttr(f.situations)}><summary>${esc(f.q)}</summary><p>${inl(f.a)}</p></details>`).join("")}</section>` : "";
  const sources = data.sources && data.sources.length ? `<section class="sources"><h2>出典</h2><ul>${data.sources.map((s) => `<li>${esc(s.label)}${s.checked ? `（確認日: ${esc(s.checked)}）` : ""} <a href="${esc(s.url)}" rel="noopener nofollow">${esc(s.url)}</a></li>`).join("")}</ul></section>` : "";
  const toc = `<nav class="toc rm-toc" aria-label="目次"><ol>${data.deadlines && data.deadlines.length ? `<li><a href="#deadlines">期限の早見表</a></li>` : ""}${data.forks && data.forks.length ? `<li><a href="#forks">先に決める分かれ道</a></li>` : ""}${(data.stages || []).map((st) => `<li><a href="#stage-${st.id}">段階${st.id}　${esc(st.title)}</a></li>`).join("")}${data.family ? `<li><a href="#family">${esc(data.family.title)}</a></li>` : ""}${season ? `<li><a href="#season">新潟では、いつやるか</a></li>` : ""}${faq ? `<li><a href="#faq">よくある質問</a></li>` : ""}</ol></nav>`;

  const style = `<style>
.rm-pick{border:1px solid var(--line-strong,#ccc);padding:18px 18px 8px;margin:18px 0 26px;background:var(--paper-2,#fafafa)}
.rm-pick-h{font-size:18px;margin:0 0 4px}
.rm-sit{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin:12px 0}
.rm-sit button{text-align:left;font:inherit;padding:10px 12px;border:1px solid var(--line-strong,#ccc);background:var(--paper,#fff);color:var(--ink,#222);cursor:pointer;border-radius:4px}
.rm-sit button strong{display:block;font-size:15px}.rm-sit button span{display:block;font-size:12.5px;color:var(--mute,#666);margin-top:2px}
.rm-sit button[aria-pressed="true"]{border-color:var(--navy,#1d3557);box-shadow:inset 0 0 0 1px var(--navy,#1d3557);background:var(--navy-10,#eef2f7)}
.rm-city{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:4px 0 12px}.rm-city label{font-weight:600;font-size:14px}.rm-city select{font:inherit;font-size:14px;padding:6px;max-width:100%}
.rm-sitnote{border-top:1px solid var(--line,#ddd);padding-top:10px;margin-bottom:8px}.rm-first{margin:6px 0 0}
.rm-flow ol{list-style:none;padding:0;margin:0 0 24px;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));border-top:2px solid var(--ink,#222)}
.rm-flow li a{display:block;padding:10px 10px 12px;border-bottom:1px solid var(--line,#ddd);text-decoration:none;color:inherit}
.rm-flow .rm-n{display:block;font-size:12px;color:var(--mute,#666)}.rm-flow strong{display:block;font-size:15px}.rm-flow .rm-p{display:block;font-size:12.5px;color:var(--mute,#666)}
.rm-sec{border-top:1px solid var(--line-strong,#ccc);padding-top:22px;margin-top:30px}
.rm-eyebrow{font-size:12.5px;letter-spacing:.08em;color:var(--mute,#666);margin:0}
.rm-goal{font-size:16.5px;font-weight:600}
.rm-meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0;border:1px solid var(--line,#ddd);margin:12px 0}
.rm-meta div{padding:8px 12px;border-right:1px solid var(--line,#ddd)}.rm-meta dt{font-size:12.5px;color:var(--mute,#666)}.rm-meta dd{margin:2px 0 0}
.rm-todo{padding-left:0;list-style:none;counter-reset:rm}.rm-todo>li{counter-increment:rm;border-bottom:1px solid var(--line,#ddd);padding:10px 0}
.rm-todo label{display:flex;gap:10px;align-items:flex-start;cursor:pointer}.rm-todo input{margin-top:6px;flex:none}
.rm-todo label span::before{content:counter(rm) ". ";color:var(--mute,#666)}
.rm-detail{margin:4px 0 0 26px;font-size:14.5px;color:var(--ink-2,#333)}.rm-todo .rm-links{margin:4px 0 0 26px}
.rm-tags{margin-left:6px}.rm-tag{display:inline-block;font-size:11.5px;border:1px solid var(--line-strong,#ccc);color:var(--mute,#666);padding:0 5px;margin:0 3px 0 0;border-radius:2px}
.rm-links{font-size:14.5px}.rm-links a{margin-right:4px}
.rm-tablewrap{overflow-x:auto}.rm-dl td,.rm-season td{vertical-align:top}.rm-due{white-space:nowrap;font-weight:600}
.rm-src{font-size:12px}
.rm-qa details{border-bottom:1px solid var(--line,#ddd);padding:10px 0}.rm-qa summary{cursor:pointer;font-weight:600}.rm-qa details>div{padding-top:6px}
.rm-fork{border:1px solid var(--line,#ddd);padding:14px 16px;margin:12px 0}.rm-fork h3{margin-top:0}
.rm-opts{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}.rm-opt{border-top:2px solid var(--navy,#1d3557);padding-top:8px}.rm-opt-h{font-weight:700;margin:0 0 4px}
.rm-ni li{margin-bottom:6px}
.rm-done{border-left:3px solid var(--navy,#1d3557);padding-left:10px}
.rm-cta{border:1px solid var(--navy,#1d3557);padding:12px 16px;margin:16px 0;background:var(--navy-10,#eef2f7)}
html.rm-js [data-sits].rm-hide{display:none}
.rm-sitnote{display:none}html.rm-js .rm-sitnote.rm-show{display:block}
@media print{.rm-pick,.rm-flow,.rm-toc,.rm-cta{display:none}.rm-sec{break-inside:avoid-page}}
</style>`;

  const script = `<script>(function(){var d=document,R=d.documentElement;R.classList.add("rm-js");
var ls={get:function(k){try{return localStorage.getItem(k)}catch(e){return null}},set:function(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
var base=${JSON.stringify(url("/city/"))};
function sit(id){d.querySelectorAll(".rm-sit button").forEach(function(b){b.setAttribute("aria-pressed",String(b.getAttribute("data-sit")===id))});
d.querySelectorAll("[data-sits]").forEach(function(el){var on=!id||el.getAttribute("data-sits").split(" ").indexOf(id)>=0;if(el.classList.contains("rm-sitnote")){el.classList.toggle("rm-show",!!id&&on)}else{el.classList.toggle("rm-hide",!on)}});ls.set("rm-sit",id||"")}
d.querySelectorAll(".rm-sit button").forEach(function(b){b.addEventListener("click",function(){sit(b.getAttribute("data-sit"))})});
function city(id){d.querySelectorAll("[data-city-anchor]").forEach(function(a){a.href=id?base+id+"/#"+a.getAttribute("data-city-anchor"):base});ls.set("rm-city",id||"")}
var sel=d.getElementById("rm-city-sel");if(sel){sel.addEventListener("change",function(){city(sel.value)});var c=ls.get("rm-city");if(c){sel.value=c;city(c)}}
var s=ls.get("rm-sit");if(s)sit(s);
d.querySelectorAll(".rm-todo input[data-key]").forEach(function(i){var k="rm-chk-"+i.getAttribute("data-key");i.checked=ls.get(k)==="1";i.addEventListener("change",function(){ls.set(k,i.checked?"1":"0")})});
})();</script>`;

  return `${style}<article class="guide roadmap"><header class="page-head"><p class="eyebrow">${esc(data.eyebrow || "実家じまいの進め方")}</p><h1>${esc(data.title)}</h1><p class="lead">${inl(data.lead || data.description || "")}</p><p class="small">更新日: ${esc(data.updated || "")}</p></header>
<div class="prose">${(data.intro || []).map((p) => `<p>${inl(p)}</p>`).join("")}</div>
${picker}${overview}${toc}<div class="prose">${deadlines}${forks}${stages}${family}${season}${faq}${sources}</div></article>${script}`;
}
