# -*- coding: utf-8 -*-
"""本文に残る [要確認: ○○] を集めて docs/要確認一覧_<日付>.md を作る。
使い方: PYTHONUTF8=1 python scripts/_build_youkakunin.py
対象: content/guides（公開）と content/stock（在庫）。
"""
import io, re, glob, os, sys, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TODAY = datetime.date.today().isoformat()
MUNI = ["新潟市","長岡市","上越市","三条市","柏崎市","新発田市","小千谷市","加茂市","十日町市","見附市",
        "村上市","燕市","糸魚川市","妙高市","五泉市","阿賀野市","佐渡市","魚沼市","南魚沼市","胎内市",
        "聖籠町","弥彦村","田上町","阿賀町","出雲崎町","湯沢町","津南町","刈羽村","関川村","粟島浦村"]

def fm(src):
    src = src.replace("\r\n", "\n").replace("\r", "\n")
    m = re.match(r"^---\n([\s\S]*?)\n---\n?([\s\S]*)$", src)
    if not m:
        return {}, src
    meta = {}
    for line in m.group(1).split("\n"):
        if ":" in line:
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip().strip('"').strip("'")
    return meta, m.group(2)

rows = []  # (muni, item, title, slug, state)
for state, d in (("公開", "guides"), ("在庫", "stock")):
    for p in sorted(glob.glob(os.path.join(ROOT, "content", d, "*.md"))):
        meta, body = fm(io.open(p, encoding="utf-8").read())
        slug = meta.get("slug") or os.path.splitext(os.path.basename(p))[0]
        title = (meta.get("title") or slug)[:30]
        for item in re.findall(r"\[要確認[:：]\s*([^\]]+)\]", body):
            item = item.strip()
            muni = next((m for m in MUNI if m in item), None)
            if not muni:
                muni = next((m for m in MUNI if m[:-1] in item and not (m == "新潟市" and "新潟県" in item)), None)
            if not muni:
                muni = next((m for m in MUNI if m in title), None)
            rows.append((muni or "その他（制度・一般）", item, title, slug, state))

groups = {}
for r in rows:
    groups.setdefault(r[0], []).append(r)
order = sorted(groups, key=lambda k: (-len(groups[k]), k))
n_art = len({r[3] for r in rows})

out = [f"# 本文に残る「確認中」の一覧（{TODAY}）", "",
       "用途: 業者訪問・市役所の窓口・公式サイトの再確認で埋めるためのリスト。公式サイトで確認できなかった項目だけが載っている。電話確認はしない方針なので、窓口に行く用事があるときや、業者から聞ける項目を優先する。",
       "", f"合計 {len(rows)} 件 ／ 記事 {n_art} 本（公開 {sum(1 for r in rows if r[4]=='公開')} 件・在庫 {sum(1 for r in rows if r[4]=='在庫')} 件）",
       "", "再生成: `PYTHONUTF8=1 python scripts/_build_youkakunin.py`", ""]
for g in order:
    out += [f"## {g}（{len(groups[g])}件）", "", "| 確認したいこと | 記事 | slug | 状態 |", "|---|---|---|---|"]
    seen = set()
    for _, item, title, slug, state in groups[g]:
        key = (item, slug)
        if key in seen:
            continue
        seen.add(key)
        out.append(f"| {item} | {title} | {slug} | {state} |")
    out.append("")

dst = os.path.join(ROOT, "docs", f"要確認一覧_{TODAY}.md")
io.open(dst, "w", encoding="utf-8", newline="\n").write("\n".join(out))
io.open(os.path.join(ROOT, "docs", "_youkakunin_count.txt"), "w", encoding="utf-8").write(f"{len(rows)} {n_art} {dst}\n")
