# -*- coding: utf-8 -*-
"""content/guides と content/pages の本文中の外部URLを全件 GET し、404 やエラーを docs/_guide_url_check.md に書く。
使い方: PYTHONUTF8=1 python scripts/_check_guide_urls.py
- 同じURLは1回だけ取得。HEAD でなく GET（HEAD を拒否する自治体サイトがある）。
- 403 は「取得不可（Botブロックの可能性）」として別枠にし、404/410/5xx/接続失敗を要対応にする。
"""
import io, os, re, glob, ssl, urllib.request, urllib.error, datetime, concurrent.futures as cf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TODAY = datetime.date.today().isoformat()
URL_RE = re.compile(r'https?://[^\s<>()\]）」、。"\']+')
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) niigata-jikkajimai-linkcheck/1.0"
ctx = ssl.create_default_context()

urls = {}
for d in ("guides", "pages"):
    for p in sorted(glob.glob(os.path.join(ROOT, "content", d, "*.md"))):
        slug = os.path.splitext(os.path.basename(p))[0]
        for u in URL_RE.findall(io.open(p, encoding="utf-8").read()):
            u = u.rstrip(".,;:)")
            if "kbrysk.github.io" in u:
                continue
            urls.setdefault(u, set()).add(slug)

def fetch(u):
    req = urllib.request.Request(u, headers={"User-Agent": UA, "Accept": "*/*"})
    try:
        with urllib.request.urlopen(req, timeout=40, context=ctx) as r:
            return r.status, r.geturl()
    except urllib.error.HTTPError as e:
        return e.code, u
    except Exception as e:
        return f"ERR {type(e).__name__}", u

results = {}
with cf.ThreadPoolExecutor(max_workers=12) as ex:
    for u, res in zip(urls, ex.map(fetch, urls)):
        results[u] = res

bad, blocked, moved, ok = [], [], [], 0
for u, (st, final) in results.items():
    slugs = ", ".join(sorted(urls[u]))
    if st == 403:
        blocked.append((u, slugs))
    elif isinstance(st, int) and st < 400:
        ok += 1
        if final.rstrip("/") != u.rstrip("/") and final.split("://", 1)[-1].rstrip("/") != u.split("://", 1)[-1].rstrip("/"):
            moved.append((u, final, slugs))
    else:
        bad.append((u, str(st), slugs))

out = [f"# 記事内の外部URL生存確認（{TODAY}）", "",
       f"対象URL {len(urls)} 件 ／ 正常 {ok} ／ 要対応（404・5xx・接続失敗） {len(bad)} ／ 403（取得不可） {len(blocked)} ／ リダイレクト先が別URL {len(moved)}", "",
       "再実行: `PYTHONUTF8=1 python scripts/_check_guide_urls.py`", "",
       "## 要対応", "", "| 状態 | URL | 記事 |", "|---|---|---|"]
out += [f"| {st} | {u} | {s} |" for u, st, s in sorted(bad, key=lambda x: x[2])]
out += ["", "## 403（自動取得を拒否。ブラウザでの目視確認が必要）", "", "| URL | 記事 |", "|---|---|"]
out += [f"| {u} | {s} |" for u, s in sorted(blocked, key=lambda x: x[1])]
out += ["", "## リダイレクト先が別URL（記事のURLを新URLに差し替える候補）", "", "| 旧URL | 転送先 | 記事 |", "|---|---|---|"]
out += [f"| {u} | {f} | {s} |" for u, f, s in sorted(moved, key=lambda x: x[2])]
io.open(os.path.join(ROOT, "docs", "_guide_url_check.md"), "w", encoding="utf-8", newline="\n").write("\n".join(out) + "\n")
print(len(urls), ok, len(bad), len(blocked), len(moved))
