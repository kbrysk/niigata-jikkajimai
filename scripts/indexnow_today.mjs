// 予約公開した記事のうち、今日（日本時間）が公開日のものだけを IndexNow で通知する。
// 毎朝の定時ビルドの後に GitHub Actions から呼ぶ（.github/workflows/pages.yml）。手元でも実行できる。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const site = JSON.parse(fs.readFileSync(path.join(ROOT, "site.json"), "utf8"));
const key = fs.readFileSync(path.join(ROOT, ".indexnow-key"), "utf8").trim();
const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const dir = path.join(ROOT, "content", "guides");
const urls = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".md"))) {
  const fm = (fs.readFileSync(path.join(dir, f), "utf8").replace(/\r\n?/g, "\n").match(/^---\n([\s\S]*?)\n---/) || [])[1] || "";
  const pub = (fm.match(/^publish:\s*["']?(\d{4}-\d{2}-\d{2})/m) || [])[1];
  const slug = (fm.match(/^slug:\s*["']?([a-z0-9-]+)/m) || [])[1] || f.replace(/\.md$/, "");
  if (pub === today) urls.push(`${site.origin}${site.basePath}/guide/${slug}/`);
}
if (!urls.length) { console.log("IndexNow: 今日公開の記事なし", today); process.exit(0); }
urls.push(`${site.origin}${site.basePath}/`, `${site.origin}${site.basePath}/guide/`);
const host = new URL(site.origin).host;
const body = { host, key, keyLocation: `${site.origin}${site.basePath}/${key}.txt`, urlList: urls };
const res = await fetch("https://api.indexnow.org/indexnow", { method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify(body) });
console.log("IndexNow", res.status, today, urls);
