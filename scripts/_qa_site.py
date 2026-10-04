# -*- coding: utf-8 -*-
"""dist/ を対象にしたサイト品質点検。
使い方: BASE_PATH="" node build.mjs ; PYTHONUTF8=1 python scripts/_qa_site.py
点検項目: 内部リンク切れ、title の長さ、description の長さ・欠落、title/description の重複、
h1 の欠落・複数、要確認マーカーの生残り、絵文字・★、canonical の有無。
結果は docs/_qa_report.md に書く（標準出力には件数だけ）。
"""
import io, os, re, glob, sys, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")
pages = sorted(glob.glob(os.path.join(DIST, "**", "*.html"), recursive=True))
existing = set()
for p in pages:
    rel = os.path.relpath(p, DIST).replace(os.sep, "/")
    existing.add("/" + rel)
    if rel.endswith("/index.html"):
        existing.add("/" + rel[: -len("index.html")])
        existing.add("/" + rel[: -len("/index.html")])
for p in glob.glob(os.path.join(DIST, "**", "*"), recursive=True):
    if os.path.isfile(p):
        existing.add("/" + os.path.relpath(p, DIST).replace(os.sep, "/"))

issues = []  # (level, page, msg)
titles, descs = {}, {}
EMOJI = re.compile("[\U0001F300-\U0001FAFF☀-✒✔-➿⭐★☆]")

for p in pages:
    rel = "/" + os.path.relpath(p, DIST).replace(os.sep, "/")
    if rel.endswith("/404.html"):
        continue
    s = io.open(p, encoding="utf-8").read()
    page_dir = rel.rsplit("/", 1)[0] + "/"
    m = re.search(r"<title>(.*?)</title>", s, re.S)
    t = html.unescape(m.group(1).strip()) if m else ""
    if not t:
        issues.append(("高", rel, "title がない"))
    elif len(t) > 40:
        issues.append(("中", rel, f"title が長い（{len(t)}字）: {t}"))
    titles.setdefault(t, []).append(rel)
    m = re.search(r'<meta name="description" content="(.*?)"', s, re.S)
    d = html.unescape(m.group(1).strip()) if m else ""
    noindex = 'name="robots" content="noindex' in s
    if not d and not noindex:
        issues.append(("高", rel, "description がない"))
    elif d and len(d) > 125:
        issues.append(("中", rel, f"description が長い（{len(d)}字）"))
    elif d and len(d) < 50 and not noindex:
        issues.append(("低", rel, f"description が短い（{len(d)}字）"))
    if d:
        descs.setdefault(d, []).append(rel)
    h1 = re.findall(r"<h1[^>]*>", s)
    if len(h1) != 1:
        issues.append(("中", rel, f"h1 が {len(h1)} 個"))
    if 'rel="canonical"' not in s and not noindex:
        issues.append(("中", rel, "canonical がない"))
    if "[要確認" in s:
        issues.append(("中", rel, "変換されていない [要確認 が残っている"))
    body = re.sub(r"<script[\s\S]*?</script>", "", s)
    if EMOJI.search(body):
        issues.append(("低", rel, "絵文字・★が含まれる"))
    for href in re.findall(r'href="([^"#]+)(?:#[^"]*)?"', s):
        if href.startswith(("http", "mailto:", "tel:", "data:")):
            continue
        target = href if href.startswith("/") else os.path.normpath(os.path.join(page_dir, href)).replace("\\", "/")
        if not target.startswith("/"):
            target = "/" + target
        if target not in existing and target.rstrip("/") not in existing and target.rstrip("/") + "/index.html" not in existing:
            issues.append(("高", rel, f"内部リンク切れ: {href}"))

for t, ps in titles.items():
    if len(ps) > 1:
        issues.append(("中", ", ".join(ps), f"title が重複: {t}"))
for d, ps in descs.items():
    if len(ps) > 1:
        issues.append(("低", ", ".join(ps), "description が重複"))

order = {"高": 0, "中": 1, "低": 2}
issues.sort(key=lambda x: (order[x[0]], x[1]))
out = ["# サイト品質点検（dist 対象）", "", f"対象ページ {len(pages)} 件 ／ 指摘 {len(issues)} 件（高 {sum(1 for i in issues if i[0]=='高')}・中 {sum(1 for i in issues if i[0]=='中')}・低 {sum(1 for i in issues if i[0]=='低')}）", "",
       "| 重大度 | ページ | 内容 |", "|---|---|---|"]
out += [f"| {a} | {b} | {c} |" for a, b, c in issues]
io.open(os.path.join(ROOT, "docs", "_qa_report.md"), "w", encoding="utf-8", newline="\n").write("\n".join(out) + "\n")
print(len(pages), len(issues), sum(1 for i in issues if i[0] == "高"))
