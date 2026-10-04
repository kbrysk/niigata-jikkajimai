// 公式ページの変更検知。data/*.json に載っている出典URL（市町村の公式ページ・PDF）を取得し、
// 本文のハッシュを前回と比べて「変わったURL」を docs/_official_changes.md に書き出す。
// 使い方:
//   node scripts/check_official.mjs --baseline   … 現在の状態を data/_official_snapshots.json に保存（初回・更新確認後）
//   node scripts/check_official.mjs              … 前回と比較して差分を報告（ファイルは更新しない）
//   node scripts/check_official.mjs --update     … 比較して報告したうえで、スナップショットも最新に置き換える
// 方針: 取得は GET のみ。電話確認はしない。変更が見つかったら人が公式ページを読み、data/*.json と checked_date を更新する。
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SNAP = path.join(ROOT, "data/_official_snapshots.json");
const REPORT = path.join(ROOT, "docs/_official_changes.md");
const args = new Set(process.argv.slice(2));
const readJSON = (p, fb) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : fb);

const base = readJSON(path.join(ROOT, "data/municipalities_base.json"), []);
const core9 = readJSON(path.join(ROOT, "data/sodai_core9.json"), []);
const other21 = readJSON(path.join(ROOT, "data/sodai_other21.json"), []);
const ay = readJSON(path.join(ROOT, "data/akiya_yuki_core9.json"), []);
const cityName = Object.fromEntries(base.map((m) => [m.cityId, m.city]));

// URL → どの市町村のどの項目か
const owners = new Map();
const add = (u, who) => { if (!u || !/^https?:\/\//.test(u)) return; if (!owners.has(u)) owners.set(u, new Set()); owners.get(u).add(who); };
for (const x of [...core9, ...other21]) { add(x.sodai_official_url, `${cityName[x.cityId] || x.cityId}/粗大ごみ`); (x.source_urls || []).forEach((u) => add(u, `${cityName[x.cityId] || x.cityId}/粗大ごみ出典`)); }
for (const x of ay) (x.source_urls || []).forEach((u) => add(u, `${cityName[x.cityId] || x.cityId}/空き家・雪`));
for (const m of base) { add(m.subsidy?.officialUrl, `${m.city}/解体補助金`); add(m.garbage?.officialUrl, `${m.city}/ごみ`); }
const urls = [...owners.keys()];

const textOf = (html) => html
  .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&[a-z#0-9]+;/gi, " ")
  .replace(/\s+/g, " ")
  .trim();
const sha = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 16);

async function fetchOne(u) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), (/[.]pdf([?]|$)/i.test(u) ? 90000 : 25000)); // 町村の大きなPDFは遅いので長めに待つ
  try {
    const r = await fetch(u, { signal: ctrl.signal, redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (compatible; niigata-jikkajimai-check/1.0; +https://kbrysk.github.io/niigata-jikkajimai/about/)", accept: "text/html,application/pdf,*/*" } });
    const type = (r.headers.get("content-type") || "").split(";")[0].trim();
    const buf = Buffer.from(await r.arrayBuffer());
    const isPdf = /pdf/i.test(type) || /\.pdf(\?|$)/i.test(u);
    const body = isPdf ? sha(buf) : sha(textOf(buf.toString("utf8")));
    const len = isPdf ? buf.length : textOf(buf.toString("utf8")).length;
    return { status: r.status, type: isPdf ? "pdf" : "html", hash: body, len, final: r.url !== u ? r.url : undefined };
  } catch (e) {
    return { status: 0, type: "error", hash: "", len: 0, error: String(e && e.name === "AbortError" ? "timeout" : e && e.message || e).slice(0, 80) };
  } finally { clearTimeout(t); }
}

async function run() {
  const prev = readJSON(SNAP, {});
  const now = new Date().toISOString().slice(0, 10);
  const results = {};
  let i = 0;
  const workers = Array.from({ length: 6 }, async () => {
    while (i < urls.length) { const u = urls[i++]; results[u] = { ...(await fetchOne(u)), checked: now }; }
  });
  await Promise.all(workers);

  const changed = [], errors = [], fresh = [];
  for (const u of urls) {
    const cur = results[u], old = prev[u];
    if (cur.status === 0 || cur.status >= 400) { errors.push([u, cur]); continue; }
    if (!old) { fresh.push([u, cur]); continue; }
    if (old.hash && old.hash !== cur.hash) changed.push([u, old, cur]);
  }
  const who = (u) => [...owners.get(u)].join("、");
  const lines = [
    `# 公式ページの変更検知`, ``,
    `実行日 ${now} ／ 対象 ${urls.length} URL ／ 変更 ${changed.length} ／ 取得失敗 ${errors.length} ／ 新規（前回なし） ${fresh.length}`, ``,
    `変更が出たURLは、人が公式ページを読み、該当する data/*.json の値と checked_date を更新する。電話確認はしない。`, ``,
  ];
  if (changed.length) {
    lines.push(`## 変更あり`, ``, `| 市町村／項目 | URL | 前回 | 今回 | 本文の長さ |`, `|---|---|---|---|---|`);
    for (const [u, o, c] of changed) lines.push(`| ${who(u)} | ${u} | ${o.checked} | ${now} | ${o.len} → ${c.len}（${c.len - o.len >= 0 ? "+" : ""}${c.len - o.len}） |`);
    lines.push(``);
  }
  if (errors.length) {
    lines.push(`## 取得できなかったURL（リンク切れ・移転・一時的な障害の可能性）`, ``, `| 市町村／項目 | URL | 状態 |`, `|---|---|---|`);
    for (const [u, c] of errors) lines.push(`| ${who(u)} | ${u} | ${c.status || c.error} |`);
    lines.push(``);
  }
  if (fresh.length && Object.keys(prev).length) {
    lines.push(`## 新規に監視に入ったURL`, ``, ...fresh.map(([u]) => `- ${who(u)}: ${u}`), ``);
  }
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, lines.join("\n") + "\n");

  if (args.has("--baseline") || args.has("--update")) {
    const next = { ...prev };
    for (const u of urls) if (results[u].status && results[u].status < 400) next[u] = { hash: results[u].hash, len: results[u].len, type: results[u].type, checked: now, ...(results[u].final ? { final: results[u].final } : {}) };
    fs.writeFileSync(SNAP, JSON.stringify(next, null, 1) + "\n");
  }
  console.log(`urls ${urls.length} changed ${changed.length} errors ${errors.length} fresh ${fresh.length} -> ${path.relative(ROOT, REPORT)}${args.has("--baseline") || args.has("--update") ? " (snapshot saved)" : ""}`);
}
run();
