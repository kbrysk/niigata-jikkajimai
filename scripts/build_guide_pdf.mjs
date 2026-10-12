// 登録特典PDF「新潟の実家じまい 完全ガイド」を作る。
// 使い方: node scripts/build_guide_pdf.mjs  → public/dl/niigata-jikkajimai-kanzen-guide.pdf（HTML の控えは .pdf-build/）
// 中身はすべてリポジトリ内のデータから組み立てる（content/roadmap/roadmap.json・data/*.json・site.json）。手で数字や体験談を足さない。
// 印刷は手元の Microsoft Edge か Google Chrome のヘッドレス印刷を使う（GitHub Actions では作らない。PDFはコミットして配る）。
// 書体は Windows 標準の BIZ UDPゴシック。
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { marked } from "marked";
import { icon } from "../icons.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJSON = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const SITE = readJSON("site.json");
const RM = readJSON("content/roadmap/roadmap.json");
const base = readJSON("data/municipalities_base.json");
const sodaiList = [...readJSON("data/sodai_core9.json"), ...readJSON("data/sodai_other21.json")];
const prices = readJSON("data/price_list_minnano.json");
const ORIGIN = SITE.origin.replace(/\/$/, "") + (SITE.basePath || "").replace(/\/$/, "");
const OUT_PDF = path.join(ROOT, "public/dl/niigata-jikkajimai-kanzen-guide.pdf");
const OUT_HTML = path.join(ROOT, ".pdf-build/kanzen-guide.html");

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const chk = (t) => String(t ?? "").replace(/\[要確認[:：]\s*([^\]]+)\]/g, "※確認中（$1）").replace(/\[要確認\]/g, "※確認中");
const inl = (t) => marked.parseInline(chk(t));
// PDFから戻ってきた人を数えるため、サイト内リンクに utm を付ける
const site = (p) => `${ORIGIN}${p}${p.includes("?") ? "&" : "?"}utm_source=kanzen_guide&utm_medium=pdf`;
const linkOf = (L) => {
  if (!L) return "";
  const href = L.guide ? site(`/guide/${L.guide}/`) : L.city ? site("/city/") : L.page ? site(`/${L.page}/`) : L.href && /^https?:/.test(L.href) ? L.href : L.href ? site("/tools/") : "";
  return href ? `<a href="${esc(href)}">${esc(L.label || "関連ページ")}</a>` : "";
};
const links = (arr) => (arr && arr.length ? `<p class="links">関連: ${arr.map(linkOf).filter(Boolean).join("／")}</p>` : "");
const STAGE_ICON = ["talk", "doc", "box", "truck", "house"];
const SIT_ICON = { s1: "people", s2: "building", s3: "calendar", s4: "house" };

// 粗大ごみの早見表（30市町村）。値は data/ の公式転記だけを使う
const cityName = Object.fromEntries(base.map((m) => [m.cityId, m.city]));
const order = base.map((m) => m.cityId);
const sodaiRows = [...sodaiList].sort((a, b) => order.indexOf(a.cityId) - order.indexOf(b.cityId)).map((s) => {
  const kinds = ["インターネット", "LINE", "電話", "FAX", "窓口"].filter((k) => String(s.apply_method || "").includes(k));
  // 申込方法の文にある電話番号を優先し、無ければ市町村の担当課の番号を「問い合わせ」として出す
  const applyTel = ([...String(s.apply_method || "").matchAll(/(FAX|ＦＡＸ|ファクス)?[^0-9]{0,4}(0\d{1,4}-\d{1,4}-\d{3,4})/g)].find((m) => !m[1]) || [])[2];
  const deptTel = base.find((m) => m.cityId === s.cityId)?.garbage?.phone;
  const phone = applyTel ? `受付 ${applyTel}` : deptTel ? `問い合わせ ${deptTel}` : "";
  return `<tr><td class="nw"><strong>${esc(cityName[s.cityId] || s.city)}</strong></td><td>${esc(chk(s.fee_system || "公式サイトで確認できず"))}</td><td>${kinds.length ? esc(kinds.join("・")) : "公式で確認"}${phone ? `<br><span class="mute">${esc(phone)}</span>` : ""}</td><td class="nw">${s.bring_in ? "案内あり" : "—"}</td><td class="nw mute">${esc(s.checked_date || "")}</td></tr>`;
}).join("");
const sodaiChecked = sodaiList.map((s) => s.checked_date).filter(Boolean).sort();

// 業者の公開料金（間取り別の最安・中央値）
const cs = prices.companies || [];
const stat = (k) => { const v = cs.map((c) => c[k]).filter(Boolean).sort((a, b) => a - b); return v.length ? { n: v.length, min: v[0], med: v[Math.floor(v.length / 2)], max: v[v.length - 1] } : null; };
const yen = (n) => `${Number(n).toLocaleString("ja-JP")}円`;
const priceRows = [["1K", "k1"], ["1LDK", "ldk1"], ["2LDK", "ldk2"], ["3LDK", "ldk3"]].map(([l, k]) => { const s = stat(k); return s ? `<tr><td>${l}</td><td class="n">${yen(s.min)}〜</td><td class="n">${yen(s.med)}〜</td><td class="n">${yen(s.max)}〜</td><td class="n">${s.n}社</td></tr>` : ""; }).join("");

const stages = RM.stages || [];
const checkedAll = [RM.updated, prices.checked, ...sodaiChecked].filter(Boolean).sort();
const issued = checkedAll[checkedAll.length - 1];

// ---------- 各章 ----------
// 表紙: 濃紺に金の二重罫、明朝の題字、主要な数字を金で。山の線画は新潟の山並みのイメージ（実在の景色の写しではない）
const todoTotal = stages.reduce((n, st) => n + (st.todo || []).length, 0);
const mountains = `<svg class="c-mt" viewBox="0 0 600 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 92 L60 70 L110 84 L170 40 L215 66 L260 52 L320 20 L380 58 L430 46 L480 72 L540 50 L600 66" fill="none" stroke="rgba(201,169,106,.55)" stroke-width="1"/><path d="M155 49 L170 40 L184 50 M305 30 L320 20 L336 31" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="1"/></svg>`;
const cover = `<section class="cover"><div class="c-frame">
  <p class="c-brand">NIIGATA JIKKAJIMAI NAVI<span>${esc(SITE.name)}</span></p>
  <div class="c-mid">
    <p class="c-ed">${new Date(issued).getFullYear()} EDITION　｜　無料ガイドブック</p>
    <p class="c-pre">期限・手順・費用・新潟の窓口</p>
    <h1>新潟の実家じまい<span>完全ガイド</span></h1>
    <div class="c-rule"></div>
    <p class="c-lead">親が元気なうちの準備から、亡くなったあとの手続き、片付け、空き家の行き先と冬の管理まで。新潟県内30市町村の公式情報をもとに、1冊にまとめました。</p>
    <ul class="c-points"><li><b>${(RM.deadlines || []).length}</b><span>期限のある手続きの早見表</span></li><li><b>${todoTotal}</b><span>段階ごとのやること</span></li><li><b>30</b><span>市町村の粗大ごみ早見表</span></li></ul>
  </div>
  ${mountains}
  <div class="c-foot"><p>発行 ${esc(SITE.operator)}　／　${esc(ORIGIN)}/</p><p>掲載情報の確認日 ${esc(checkedAll[0])}〜${esc(issued)}。制度・料金は変わることがあります。手続きの前に、各機関の公式サイトでご確認ください。</p></div>
</div></section>`;

const toc = `<section class="toc-page"><h2 class="h">${icon("book")}このガイドの使い方と目次</h2>
${(RM.intro || []).filter((p) => !/ボタン|ブラウザ/.test(p)).map((p) => `<p>${inl(p)}</p>`).join("")}
<p>全部を順に読む必要はありません。まず1章で、いまの状況に近いものを選び、そこに書かれた「最初にやること」から始めてください。期限のある手続きは3章の早見表で、新潟の市町村ごとのごみの出し方は${stages.length + 7}章で確かめられます。</p>
<ol class="toc">
<li><span>1</span>いまの状況から始める</li><li><span>2</span>実家じまいの全体の流れ（5段階）</li><li><span>3</span>期限のある手続きの早見表</li><li><span>4</span>先に決める分かれ道</li>
${stages.map((st, i) => `<li><span>${i + 5}</span>段階${esc(st.id)}　${esc(st.title)}</li>`).join("")}
<li><span>${stages.length + 5}</span>${esc(RM.family?.title || "家族で決めること")}</li><li><span>${stages.length + 6}</span>新潟では、いつやるか（季節の目安）</li><li><span>${stages.length + 7}</span>新潟県30市町村 粗大ごみ早見表</li><li><span>${stages.length + 8}</span>業者に頼むときの料金の目安と、見積もりで確かめること</li><li><span>${stages.length + 9}</span>出典</li>
</ol>
<p class="note">このガイドは、${esc(SITE.name)}に掲載している内容を、印刷して使えるようにまとめたものです。各項目の詳しい説明は、本文中のリンクからサイトの記事で読めます。法律や税金の個別の判断は、弁護士・司法書士・税理士などの専門家にご相談ください。</p>
</section>`;

const sits = `<section><h2 class="h"><span class="no">1</span>いまの状況から始める</h2>
<p>状況によって、最初にやることと、気にすべき期限が変わります。いちばん近いものを選んでください。</p>
${(RM.situations || []).map((s) => `<div class="sit"><div class="sit-h"><span class="ic-badge">${icon(SIT_ICON[s.id] || "route")}</span><div><strong>${esc(s.label)}</strong><span class="mute">${esc(s.hint || "")}</span></div></div><p>${inl(s.lead)}</p>${(s.first || []).length ? `<p class="sub">最初にやること</p><ol class="first">${s.first.map((f) => `<li>${inl(f)}</li>`).join("")}</ol>` : ""}</div>`).join("")}
</section>`;

const flow = `<section class="flow-sec"><h2 class="h"><span class="no">2</span>実家じまいの全体の流れ（${stages.length}段階）</h2>
<p>${inl(RM.lead || "")}</p>
<ol class="flow">${stages.map((st, i) => `<li><span class="fl-ic">${icon(STAGE_ICON[i] || "doc")}</span><span class="fl-n">段階${esc(st.id)}</span><strong>${esc(st.title)}</strong><span class="fl-p">${esc(st.period || "")}</span></li>`).join("")}</ol>
<table class="grid"><thead><tr><th>段階</th><th>目標</th><th>誰が</th></tr></thead><tbody>${stages.map((st) => `<tr><td class="nw"><strong>段階${esc(st.id)}<br>${esc(st.title)}</strong></td><td>${inl(st.goal || "")}</td><td>${inl(st.who || "")}</td></tr>`).join("")}</tbody></table>
</section>`;

const deadlines = `<section><h2 class="h"><span class="no">3</span>${esc(RM.deadlinesTitle || "期限のある手続きの早見表")}</h2>
<p>${inl(RM.deadlinesLead || "")}</p>
<table class="grid small"><thead><tr><th style="width:15%">期限</th><th style="width:20%">手続き</th><th style="width:20%">数え始め</th><th style="width:22%">どこで</th><th>過ぎると</th></tr></thead><tbody>${(RM.deadlines || []).map((d) => `<tr><td><strong>${esc(d.due)}</strong></td><td><strong>${inl(d.label)}</strong>${d.link ? `<br>${linkOf(d.link)}` : ""}</td><td>${inl(d.start || "")}</td><td>${inl(d.where || "")}</td><td>${inl(d.risk || "")}</td></tr>`).join("")}</tbody></table>
</section>`;

const forks = `<section><h2 class="h"><span class="no">4</span>${esc(RM.forksTitle || "先に決める分かれ道")}</h2>
<p>${inl(RM.forksLead || "")}</p>
${(RM.forks || []).map((f) => `<div class="fork"><h3>${icon("route", "ic sm")}${esc(f.q)}</h3>${f.why ? `<p>${inl(f.why)}</p>` : ""}<div class="opts">${(f.options || []).map((o) => `<div class="opt"><p class="opt-h">${esc(o.label)}</p><p>${inl(o.then)}</p>${links(o.links)}</div>`).join("")}</div></div>`).join("")}
</section>`;

const stageSecs = stages.map((st, i) => `<section class="stage"><div class="stage-h"><span class="fl-ic">${icon(STAGE_ICON[i] || "doc")}</span><div><p class="mute">${i + 5}章　段階${esc(st.id)}</p><h2>${esc(st.title)}</h2></div></div>
${st.goal ? `<p class="goal">${inl(st.goal)}</p>` : ""}
<table class="meta"><tr>${st.period ? `<td><span>かかる期間の目安</span>${inl(st.period)}</td>` : ""}${st.who ? `<td><span>誰が</span>${inl(st.who)}</td>` : ""}${st.costNote ? `<td><span>お金</span>${inl(st.costNote)}</td>` : ""}</tr></table>
${(st.body || []).map((p) => `<p>${inl(p)}</p>`).join("")}
<h3>${icon("check", "ic sm")}やることチェックリスト</h3>
<ol class="todo">${(st.todo || []).map((t) => `<li><span class="box"></span><div><strong>${inl(t.text)}</strong>${t.detail ? `<p>${inl(t.detail)}</p>` : ""}</div></li>`).join("")}</ol>
${(st.costs || []).length ? `<h3>${icon("yen", "ic sm")}費用の目安（公式・公開されている数字だけ）</h3><table class="grid small"><thead><tr><th style="width:28%">項目</th><th style="width:30%">金額</th><th>注意</th></tr></thead><tbody>${st.costs.map((c) => `<tr><td>${inl(c.label)}</td><td>${inl(c.value)}</td><td>${inl(c.note || "")}</td></tr>`).join("")}</tbody></table>` : ""}
${(st.niigata || []).length ? `<h3>${icon("pin", "ic sm")}新潟の窓口と制度</h3><ul class="ni">${st.niigata.map((n) => `<li>${inl(n.text)}</li>`).join("")}</ul>` : ""}
${st.doneWhen ? `<p class="done"><strong>この段階が終わった目安:</strong> ${inl(st.doneWhen)}</p>` : ""}
${(st.next || []).length ? `<p class="links">この段階で読む記事: ${st.next.map(linkOf).filter(Boolean).join("／")}</p>` : ""}
</section>`).join("");

const fam = RM.family ? `<section><h2 class="h"><span class="no">${stages.length + 5}</span>${esc(RM.family.title)}</h2>
${(RM.family.body || []).map((p) => `<p>${inl(p)}</p>`).join("")}
${(RM.family.agenda || []).length ? `<h3>${icon("people", "ic sm")}家族で決める議題（話し合いのときに印刷して使えます）</h3><ol class="todo">${RM.family.agenda.map((a) => `<li><span class="box"></span><div><strong>${inl(a)}</strong><p class="memo">メモ:</p></div></li>`).join("")}</ol>` : ""}
</section>` : "";

const season = `<section><h2 class="h"><span class="no">${stages.length + 6}</span>${esc(RM.seasonTitle || "新潟では、いつやるか")}</h2>
<p>${inl(RM.seasonLead || "")}</p>
<table class="grid small"><thead><tr><th style="width:10%">時期</th><th style="width:48%">新潟で起きること</th><th>やると良いこと</th></tr></thead><tbody>${(RM.season || []).map((m) => `<tr><td><strong>${esc(m.when)}</strong></td><td>${inl(m.happens)}</td><td>${inl(m.todo)}</td></tr>`).join("")}</tbody></table>
</section>`;

const sodai = `<section><h2 class="h"><span class="no">${stages.length + 7}</span>新潟県30市町村 粗大ごみ早見表</h2>
<p>各市町村の公式サイトの記載を、確認日時点で転記しています（確認日 ${esc(sodaiChecked[0])}〜${esc(sodaiChecked[sodaiChecked.length - 1])}）。公式サイトに記載が見当たらない項目は、推測で埋めず「確認中」と書いています。申し込み前に、必ず公式サイトで最新の情報を確かめてください。市町村ごとの料金表・持ち込み施設・解体補助金は、<a href="${esc(site("/city/"))}">市町村別ガイド</a>で見られます。</p>
<table class="grid small"><thead><tr><th style="width:11%">市町村</th><th>手数料の仕組み（公式の記載）</th><th style="width:20%">申し込み</th><th style="width:9%">持ち込み</th><th style="width:11%">確認日</th></tr></thead><tbody>${sodaiRows}</tbody></table>
</section>`;

const checks = [
  ["shield", "一般廃棄物収集運搬の許可", "市町村ごとの許可です。許可業者の一覧は各市の公式サイトにあります。許可業者と提携しているかも確かめます。"],
  ["house", "見積もりが訪問か写真か", "一軒家は訪問見積もりが基本です。"],
  ["yen", "追加料金の条件", "量が増えた場合、エアコンの取り外し、仏壇や神棚の供養など。"],
  ["calc", "買取の有無", "買取額を作業費から差し引けるか。"],
  ["calendar", "作業日と立ち会い", "遠方の場合、鍵の受け渡しと作業後の写真報告ができるか。"],
  ["snow", "積雪期の対応", "12〜3月は搬出経路の除雪が必要になることがあります。"],
];
const gyosha = `<section><h2 class="h"><span class="no">${stages.length + 8}</span>業者に頼むときの料金の目安と、見積もりで確かめること</h2>
<p>新潟県内の業者が公開している間取り別の料金を集計しました（${esc(prices.source || "")}、確認日 ${esc(prices.checked || "")}）。「〜円」は各社の最低料金の表記で、実際の見積もりは物の量、階段の有無、トラックを停められるか、買取できる物があるか、積雪期かどうかで変わります。</p>
<table class="grid"><thead><tr><th>間取り</th><th class="n">最安</th><th class="n">中央値</th><th class="n">最高</th><th class="n">公開社数</th></tr></thead><tbody>${priceRows}</tbody></table>
<h3>${icon("check", "ic sm")}見積もりで確かめる6つのこと</h3>
<div class="checks">${checks.map(([ic, t, d], i) => `<div><span class="ic-badge">${icon(ic)}</span><div><strong>${i + 1}. ${esc(t)}</strong><p>${esc(d)}</p></div></div>`).join("")}</div>
<p>家庭のごみを運ぶには、市町村の「一般廃棄物収集運搬」の許可が要ります。許可のない回収業者に渡した物は、不法投棄につながることがあります。2〜3社の見積もりを同じ項目で比べるには、サイトの<a href="${esc(site("/tools/"))}">見積もり比較シート（無料）</a>が使えます。</p>
<div class="cta"><p><strong>自分たちで出しきれないときは</strong></p><p>${esc(SITE.name)}の<a href="${esc(site("/mitsumori/"))}">見積もり・相談の窓口</a>で、見積もりサービス（PR）と、運営者への無料相談（原則2営業日以内に返信）を案内しています。相談しても依頼の義務はありません。</p></div>
</section>`;

const sources = `<section class="sources"><h2 class="h"><span class="no">${stages.length + 9}</span>出典</h2>
<p>このガイドの制度・期限・料金は、次の公式サイト等を出典にしています。括弧内は確認日です。</p>
<ol>${(RM.sources || []).map((s) => `<li>${esc(s.label)}${s.checked ? `（${esc(s.checked)}）` : ""}<br><span class="url">${esc(s.url)}</span></li>`).join("")}<li>新潟県内30市町村の粗大ごみ・ごみ持ち込みの公式ページ（各市町村のページは ${esc(ORIGIN)}/city/ に掲載）</li><li>${esc(prices.source || "")}（${esc(prices.checked || "")}）</li></ol>
<p class="end">発行: ${esc(SITE.operator)}（${esc(SITE.name)} ${esc(ORIGIN)}/）。このガイドは無料で配布しています。内容の誤りや制度の変更にお気づきの場合は、サイトのお問い合わせフォームからお知らせください。</p>
</section>`;

const css = `
@page{size:A4;margin:16mm 15mm 18mm;@bottom-center{content:counter(page) " / " counter(pages);font-family:"BIZ UDPGothic";font-size:8.5pt;color:#8a9099}@bottom-left{content:"${SITE.name}　新潟の実家じまい 完全ガイド";font-family:"BIZ UDPGothic";font-size:8pt;color:#8a9099}}
@page:first{margin:0;@bottom-center{content:none}@bottom-left{content:none}}
:root{--ink:#1f2328;--ink2:#3b414a;--mute:#5f6670;--line:#d9d7d0;--navy:#1f3f6b;--navy10:#edf1f7;--paper2:#f4f2ec}
*{box-sizing:border-box}
body{margin:0;font-family:"BIZ UDPGothic","Yu Gothic UI","Meiryo",sans-serif;color:var(--ink);font-size:10pt;line-height:1.75;font-feature-settings:"palt" 1;-webkit-print-color-adjust:exact;print-color-adjust:exact}
a{color:var(--navy);text-decoration:underline;text-decoration-color:rgba(31,63,107,.45)}
.ic{width:16px;height:16px;vertical-align:-3px;color:var(--navy);flex:none}.ic.sm{width:14px;height:14px}
.mute{color:var(--mute)}.nw{white-space:nowrap}.n{text-align:right;white-space:nowrap}
section{break-before:page}
section.cover{break-before:auto}
h2{font-family:"Noto Serif JP","Yu Mincho",serif;font-weight:700;font-size:17pt;line-height:1.4;margin:0 0 10px;padding-bottom:6px;border-bottom:1.5px solid var(--navy);color:#15304f}
h2.h{display:flex;align-items:center;gap:10px}
h2 .no{display:inline-grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--navy);color:#fff;font-size:12pt;flex:none}
h2 .ic{width:24px;height:24px}
h3{font-size:12pt;margin:18px 0 6px;display:flex;align-items:center;gap:6px;break-after:avoid}
p{margin:5px 0}
.note{background:var(--paper2);padding:10px 12px;font-size:9pt;color:var(--ink2);margin-top:14px}
.links{font-size:8.5pt;color:var(--mute)}
.ic-badge{display:inline-grid;place-items:center;width:34px;height:34px;border-radius:7px;background:var(--navy10);color:var(--navy);flex:none}.ic-badge .ic{width:20px;height:20px}
/* 表紙 */
.cover{height:297mm;padding:11mm;background:radial-gradient(120% 75% at 85% 0%,#2a4d7a 0%,#15304f 50%,#0c1b30 100%);color:#fff}
.c-frame{position:relative;height:100%;border:.8pt solid #c9a96a;padding:15mm 14mm 11mm;display:flex;flex-direction:column;overflow:hidden}
.c-frame::before{content:"";position:absolute;inset:2.2mm;border:.4pt solid rgba(201,169,106,.45);pointer-events:none}
.c-brand{position:relative;z-index:1;margin:0;font-family:"Noto Serif JP","Yu Mincho",serif;font-size:8.5pt;letter-spacing:.32em;color:#c9a96a}
.c-brand span{display:block;font-family:"BIZ UDPGothic";letter-spacing:.12em;font-size:9pt;color:rgba(255,255,255,.75);margin-top:3px}
.c-mid{position:relative;z-index:1;margin:auto 0 0;padding-top:30mm}
.c-ed{margin:0 0 10px;font-family:"Noto Serif JP","Yu Mincho",serif;font-size:10pt;letter-spacing:.3em;color:#c9a96a}
.c-pre{margin:0 0 6px;font-size:12pt;letter-spacing:.18em;color:rgba(255,255,255,.85)}
.cover h1{margin:0;font-family:"Noto Serif JP","Yu Mincho",serif;font-weight:700;font-size:40pt;line-height:1.3;letter-spacing:.06em}
.cover h1 span{display:block;font-size:52pt;letter-spacing:.12em;color:#e6cf9c}
.c-rule{width:46mm;height:0;border-top:.8pt solid #c9a96a;margin:9mm 0 7mm;position:relative}
.c-rule::after{content:"";position:absolute;left:48mm;top:-2.2pt;width:4pt;height:4pt;background:#c9a96a;transform:rotate(45deg)}
.c-lead{font-size:11.5pt;line-height:2;max-width:140mm;color:rgba(255,255,255,.9);margin:0}
.c-points{list-style:none;padding:0;margin:12mm 0 0;display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-top:.5pt solid rgba(201,169,106,.5);border-bottom:.5pt solid rgba(201,169,106,.5)}
.c-points li{padding:5mm 4mm 4mm;text-align:center}
.c-points li+li{border-left:.5pt solid rgba(201,169,106,.5)}
.c-points b{display:block;font-family:"Noto Serif JP","Yu Mincho",serif;font-size:30pt;line-height:1.1;color:#e6cf9c;font-weight:700}
.c-points span{display:block;font-size:8.5pt;color:rgba(255,255,255,.8);margin-top:2mm;letter-spacing:.04em}
.c-mt{position:absolute;left:0;right:0;bottom:22mm;width:100%;height:34mm}
.c-foot{position:relative;z-index:1;margin-top:auto;padding-top:26mm;font-size:7.5pt;line-height:1.6;color:rgba(255,255,255,.6)}.c-foot p{margin:1px 0}
/* 目次 */
.toc{list-style:none;padding:0;margin:14px 0;columns:2;column-gap:18px}
.toc li{display:flex;gap:10px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line);break-inside:avoid;font-size:10.5pt}
.toc li span{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--navy10);color:var(--navy);font-size:9pt;font-weight:700;flex:none}
/* 状況 */
.sit{border:1px solid var(--line);border-top:3px solid var(--navy);border-radius:6px;padding:10px 12px;margin:10px 0;break-inside:avoid}
.sit-h{display:flex;gap:10px;align-items:center;margin-bottom:4px}.sit-h strong{display:block;font-size:12pt}.sit-h .mute{font-size:9pt}
.sub{font-weight:700;margin-top:6px}
.first{margin:2px 0 0;padding-left:1.4em}.first li{margin:2px 0}
/* 流れ */
.flow{list-style:none;padding:0;margin:16px 0;display:grid;grid-template-columns:repeat(5,1fr)}
.flow li{display:flex;flex-direction:column;align-items:center;text-align:center;position:relative;padding:0 4px}
.flow li+li::before{content:"";position:absolute;top:23px;left:calc(-50% + 28px);right:calc(50% + 28px);border-top:2px dashed #c9ccd1}
.flow .fl-ic{display:grid;place-items:center;width:46px;height:46px;border-radius:50%;border:2px solid var(--navy);color:var(--navy);background:#fff}.flow .ic{width:22px;height:22px}
.fl-n{font-size:8pt;color:var(--mute);margin-top:5px}.flow strong{font-size:10pt}.fl-p{font-size:8pt;color:var(--mute);line-height:1.5}
/* 表 */
table{border-collapse:collapse;width:100%;margin:8px 0 12px}
.grid th,.grid td{border:1px solid var(--line);padding:5px 7px;vertical-align:top;text-align:left}
.grid thead th{background:var(--navy10);font-size:9pt}
.grid.small{font-size:8.5pt;line-height:1.6}
tr{break-inside:avoid}
.meta td{border:1px solid var(--line);padding:6px 8px;vertical-align:top;font-size:9pt}.meta td span{display:block;font-size:8pt;color:var(--mute)}
/* 分かれ道 */
.fork{border:1px solid var(--line);border-radius:6px;padding:8px 12px;margin:10px 0;break-inside:avoid}.fork h3{margin-top:4px}
.opts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.opt{border-top:2px solid var(--navy);padding-top:4px;font-size:9pt}.opt-h{font-weight:700;margin:0}
/* 段階 */
.stage-h{display:flex;gap:12px;align-items:center;border-bottom:2px solid var(--ink);padding-bottom:6px;margin-bottom:8px}.stage-h h2{border:0;padding:0;margin:0}.stage-h p{margin:0;font-size:9pt}
.stage-h .fl-ic{display:grid;place-items:center;width:48px;height:48px;border-radius:50%;border:2px solid var(--navy);color:var(--navy);flex:none}.stage-h .ic{width:24px;height:24px}
.goal{font-size:11pt;font-weight:700}
.todo{list-style:none;padding:0;margin:6px 0}
.todo li{display:flex;gap:10px;padding:6px 0;border-bottom:1px solid var(--line);break-inside:avoid}
.todo .box{width:13px;height:13px;border:1.5px solid var(--ink);border-radius:2px;flex:none;margin-top:4px}
.todo p{margin:2px 0 0;font-size:9pt;color:var(--ink2)}
.todo .memo{border-bottom:1px dotted var(--line);height:20px;color:var(--mute)}
.ni{padding-left:1.2em;font-size:9pt}.ni li{margin:3px 0}
.done{border-left:3px solid var(--navy);padding:4px 10px;background:var(--navy10);font-size:9.5pt;break-inside:avoid}
/* 業者 */
.checks{display:grid;grid-template-columns:1fr 1fr;gap:8px}.checks>div{display:flex;gap:10px;border:1px solid var(--line);border-radius:6px;padding:8px;break-inside:avoid}.checks p{margin:2px 0 0;font-size:9pt}
.cta{border:1.5px solid var(--navy);background:var(--navy10);padding:10px 12px;margin-top:14px;border-radius:6px}
/* 出典 */
.sources ol{font-size:7.5pt;line-height:1.5;padding-left:1.6em;columns:2;column-gap:16px}.sources li{break-inside:avoid;margin-bottom:3px}.url{color:var(--mute);word-break:break-all}
.end{margin-top:14px;font-size:9pt}
`;

const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>新潟の実家じまい 完全ガイド｜${esc(SITE.name)}</title><style>${css}</style></head><body>
${cover}${toc}${sits}${flow}${deadlines}${forks}${stageSecs}${fam}${season}${sodai}${gyosha}${sources}
</body></html>`;

fs.mkdirSync(path.dirname(OUT_HTML), { recursive: true });
fs.writeFileSync(OUT_HTML, html);
fs.mkdirSync(path.dirname(OUT_PDF), { recursive: true });
const browsers = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"];
const exe = browsers.find((b) => fs.existsSync(b));
if (!exe) { console.error("Edge / Chrome が見つかりません。HTML だけ出力しました: " + OUT_HTML); process.exit(1); }
const userDir = path.join(ROOT, ".pdf-build/profile");
execFileSync(exe, ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", `--user-data-dir=${userDir}`, "--virtual-time-budget=8000", `--print-to-pdf=${OUT_PDF}`, pathToFileURL(OUT_HTML).href], { stdio: "ignore" });
console.log(`PDF: ${OUT_PDF}（${Math.round(fs.statSync(OUT_PDF).size / 1024)}KB）`);
