// ステップメール5通の見た目を、送る前に手元で確かめる。
// 使い方: node build.mjs && node scripts/preview_lead_mails.mjs  → .pdf-build/mail-preview.html（ブラウザで開く）
// 組み立ては Apps Script（scripts/gas/lead_mail.gs）の compose_ をそのまま動かす。差し込みは「親が元気なうちに準備する・長岡市」の例。
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const seq = JSON.parse(fs.readFileSync(path.join(ROOT, "dist/lead/sequence.json"), "utf8"));
const ctx = { PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) }, ScriptApp: { getService: () => ({ getUrl: () => "https://script.google.com/macros/s/（ウェブアプリ）/exec" }) }, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, "scripts/gas/lead_mail.gs"), "utf8"), ctx);
const vars = ctx.varsFor_(seq, "s1", "nagaoka", "https://script.google.com/macros/s/（ウェブアプリ）/exec?u=test");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const cards = seq.steps.map((st) => {
  const m = ctx.compose_(seq, st, vars);
  return `<section><p class="meta">${st.offsetDays === 0 ? "申し込み直後" : `${st.offsetDays}日後`}　差出人: ${esc(seq.senderName)}</p><h2>${esc(m.subject)}</h2><div class="mail">${m.html}</div></section>`;
}).join("");
const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive,noimageindex"><title>ステップメールの見本</title>
<style>body{margin:0;background:#eef0f3;font-family:sans-serif;color:#1f2328}main{max-width:720px;margin:0 auto;padding:24px 16px 60px}h1{font-size:20px}section{background:#fff;border-radius:10px;padding:20px 24px;margin:0 0 24px;box-shadow:0 1px 3px rgba(0,0,0,.08)}.meta{font-size:12px;color:#5f6670;margin:0 0 4px}h2{font-size:17px;margin:0 0 14px;padding-bottom:12px;border-bottom:1px solid #e3e5e8}</style></head>
<body><main><h1>ステップメールの見本（${seq.steps.length}通）</h1><p style="font-size:13px;color:#5f6670">差し込みは「親が元気なうちに準備する」「長岡市」を選んだ場合の例です。配信停止のリンク先は見本用です。</p>${cards}</main></body></html>`;
const out = path.join(ROOT, ".pdf-build/mail-preview.html");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(out);
