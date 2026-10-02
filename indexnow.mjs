// IndexNow: 公開後に Bing / Yandex へURLを通知する（無料・アカウント不要）
import fs from "node:fs";
const site = JSON.parse(fs.readFileSync(new URL("./site.json", import.meta.url), "utf8"));
const key = fs.readFileSync(new URL("./.indexnow-key", import.meta.url), "utf8").trim();
const host = new URL(site.origin).host;
const base = `${site.origin}${site.basePath}`;
const xml = await (await fetch(`${base}/sitemap.xml`)).text();
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const body = { host, key, keyLocation: `${base}/${key}.txt`, urlList: urls };
const res = await fetch("https://api.indexnow.org/indexnow", { method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify(body) });
console.log("IndexNow", res.status, urls.length, "urls");
