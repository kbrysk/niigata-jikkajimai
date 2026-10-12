# -*- coding: utf-8 -*-
"""今日（日本時間）公開した記事と、送信待ちのURLを Bing Webmaster API（SubmitUrlBatch）に送る。毎朝の定期タスクから使う。
使い方: PYTHONUTF8=1 python scripts/bwt_submit_today.py [--send]   （--send が無ければ送らずに一覧だけ出す）
- APIキーは ふれあいの丘のリポジトリの .env.local の BWT_API_KEY を読む（画面に出さない）
- 送信待ち: ../niigata_private/logs/bwt_backlog.txt（1行1URL）。送った分は消す
- Bing の上限は1日100件。今日の記事を先に、残りを送信待ちから
"""
import datetime, io, json, os, re, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = json.load(io.open(os.path.join(ROOT, "site.json"), encoding="utf-8"))
ORIGIN = SITE["origin"].rstrip("/") + SITE.get("basePath", "")
BACKLOG = os.path.join(ROOT, "..", "niigata_private", "logs", "bwt_backlog.txt")
ENV = r"C:\Users\Ryosuke\Desktop\seizenseiri\.env.local"
TODAY = (datetime.datetime.utcnow() + datetime.timedelta(hours=9)).date().isoformat()

def today_urls():
    out = []
    gdir = os.path.join(ROOT, "content", "guides")
    for f in sorted(os.listdir(gdir)):
        if not f.endswith(".md"):
            continue
        s = io.open(os.path.join(gdir, f), encoding="utf-8").read().replace("\r\n", "\n")
        fm = (re.match(r"---\n(.*?)\n---", s, re.S) or [None, ""])[1]
        if re.search(r"^publish:\s*['\"]?" + TODAY, fm, re.M):
            slug = (re.search(r"^slug:\s*['\"]?([a-z0-9-]+)", fm, re.M) or [None, f[:-3]])[1]
            out.append(f"{ORIGIN}/guide/{slug}/")
    if out:
        out += [f"{ORIGIN}/", f"{ORIGIN}/guide/"]
    return out

def main():
    send = "--send" in sys.argv
    backlog = [l.strip() for l in io.open(BACKLOG, encoding="utf-8")] if os.path.exists(BACKLOG) else []
    backlog = [u for u in backlog if u.startswith("http")]
    urls = []
    for u in today_urls() + backlog:
        if u not in urls:
            urls.append(u)
    urls = urls[:100]
    print(f"today={TODAY} urls={len(urls)}")
    for u in urls:
        print(" ", u)
    if not send or not urls:
        return
    key = next((l.split("=", 1)[1].strip().strip('"') for l in io.open(ENV, encoding="utf-8") if l.startswith("BWT_API_KEY=")), "")
    if not key:
        sys.exit("BWT_API_KEY が見つかりません")
    body = json.dumps({"siteUrl": ORIGIN + "/", "urlList": urls}).encode("utf-8")
    req = urllib.request.Request("https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlBatch?apikey=" + key, data=body, headers={"Content-Type": "application/json; charset=utf-8"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            print("bing", r.status)
    except urllib.error.HTTPError as e:
        sys.exit(f"bing error {e.code}: {e.read()[:300].decode('utf-8', 'replace')}")
    rest = [u for u in backlog if u not in urls]
    if os.path.exists(BACKLOG):
        io.open(BACKLOG, "w", encoding="utf-8").write("".join(u + "\n" for u in rest))
    print("backlog left", len(rest))

if __name__ == "__main__":
    main()
