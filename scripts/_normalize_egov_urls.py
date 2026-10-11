# -*- coding: utf-8 -*-
"""Q&A の出典にある e-Gov の API 形式URLを、読者が開ける条文ページ（該当条へのアンカー付き）に置き換える。
使い方: PYTHONUTF8=1 python scripts/_normalize_egov_urls.py <file.json> ...
"""
import re, io, sys
pat = re.compile(r'https://laws\.e-gov\.go\.jp/api/1/articles;lawId=([0-9A-Z]+);article=([0-9_]+)')
for f in sys.argv[1:]:
    s = io.open(f, encoding="utf-8", newline="").read()
    s2, k = pat.subn(lambda m: f"https://laws.e-gov.go.jp/law/{m.group(1)}#Mp-At_{m.group(2)}", s)
    if k:
        io.open(f, "w", encoding="utf-8", newline="").write(s2)
    print(f, k)
