# -*- coding: utf-8 -*-
"""新しく公開する記事への内部リンクを、関連する既存記事の「次に読む」に足す。
使い方: PYTHONUTF8=1 python scripts/_add_backlinks.py <新しいslug> <既存slug1> <既存slug2> ...
- リンク文字列は新しい記事の title の「｜」より前。
- 既に同じリンクがある記事は飛ばす。「## 次に読む」が無い記事は末尾に節を作る。
- 改行コード（CRLF/LF）は元のまま。
"""
import io, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
G = os.path.join(ROOT, "content", "guides")
if len(sys.argv) < 3:
    sys.exit("usage: _add_backlinks.py <new-slug> <src-slug>...")
new, srcs = sys.argv[1], sys.argv[2:]
np = os.path.join(G, new + ".md")
t = io.open(np, encoding="utf-8").read().replace("\r\n", "\n")
title = re.search(r'^title:\s*"?(.*?)"?\s*$', t, re.M).group(1).split("｜")[0].strip()
line = f"- [{title}](../{new}/)"
done = 0
for src in srcs:
    p = os.path.join(G, src + ".md")
    if not os.path.exists(p):
        continue
    raw = io.open(p, encoding="utf-8", newline="").read()
    nl = "\r\n" if "\r\n" in raw[:400] else "\n"
    s = raw.replace("\r\n", "\n")
    if f"../{new}/" in s:
        continue
    m = re.search(r"^## 次に読む\s*\n", s, re.M)
    if m:
        rest = s[m.end():]
        mm = re.search(r"\n(?=\n|#)", rest)
        idx = m.end() + (mm.start() if mm else len(rest))
        body = rest[:mm.start()] if mm else rest
        s = s[:idx] + ("" if body.endswith("\n") else "\n") + line + s[idx:]
    else:
        s = s.rstrip("\n") + "\n\n## 次に読む\n\n" + line + "\n"
    io.open(p, "w", encoding="utf-8", newline="").write(s.replace("\n", nl))
    done += 1
print(done)
