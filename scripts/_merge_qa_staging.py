# -*- coding: utf-8 -*-
"""監査を通った Q&A の下書き（content/qa_staging/<batch>.json）を、分類ごとの content/qa/<分類>.json に合流させる。
使い方: PYTHONUTF8=1 python scripts/_merge_qa_staging.py <batch> [<batch> ...] [--dry-run]
- items の category を見て、その分類の JSON の items の末尾に足す（category キーは外す）。
- id が既存と重なったら止める。links の guide が実在しなければ止める。
- 合流したバッチは content/qa_staging/_merged/ に移す（--dry-run では何もしない）。
"""
import io, os, sys, json, glob, shutil
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QA = os.path.join(ROOT, "content", "qa")
ST = os.path.join(ROOT, "content", "qa_staging")
dry = "--dry-run" in sys.argv
batches = [a for a in sys.argv[1:] if not a.startswith("--")]
if not batches:
    sys.exit("usage: _merge_qa_staging.py <batch>... [--dry-run]")
slugs = {os.path.basename(p)[:-3] for p in glob.glob(os.path.join(ROOT, "content", "guides", "*.md"))}
cats = {}
for p in glob.glob(os.path.join(QA, "*.json")):
    cats[os.path.basename(p)[:-5]] = (p, json.load(io.open(p, encoding="utf-8")))
ids = {it["id"] for _, d in cats.values() for it in d["items"]}
added = {}
for b in batches:
    src = os.path.join(ST, b + ".json")
    d = json.load(io.open(src, encoding="utf-8"))
    for it in d.get("items", []):
        c = it.pop("category")
        if c not in cats:
            sys.exit(f"{b}: 分類 {c} がない（{it['id']}）")
        if it["id"] in ids:
            sys.exit(f"{b}: id {it['id']} が既存と重なる")
        for l in it.get("links", []):
            if l.get("guide") not in slugs:
                sys.exit(f"{b}: {it['id']} のリンク先 {l.get('guide')} が実在しない")
        if not it.get("sources"):
            sys.exit(f"{b}: {it['id']} に出典がない")
        ids.add(it["id"])
        cats[c][1]["items"].append(it)
        added[c] = added.get(c, 0) + 1
print("追加:", added, "(dry-run)" if dry else "")
if not dry:
    for c, (p, d) in cats.items():
        if c in added:
            d["updated"] = "2026-10-12" if "--date" not in sys.argv else d.get("updated")
            io.open(p, "w", encoding="utf-8", newline="").write(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
    os.makedirs(os.path.join(ST, "_merged"), exist_ok=True)
    for b in batches:
        shutil.move(os.path.join(ST, b + ".json"), os.path.join(ST, "_merged", b + ".json"))
