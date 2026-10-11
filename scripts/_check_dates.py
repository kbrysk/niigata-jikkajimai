# -*- coding: utf-8 -*-
"""Q&A・進め方ページ・ガイドに書いた「締切・受付期間」の日付のうち、今日より前になったものを拾う。
使い方: PYTHONUTF8=1 python scripts/_check_dates.py
- 「2026年12月28日」「令和8年11月30日」「12月28日まで」などを拾う（年が無いものは今年度＝4月始まりとみなす）。
- 「まで」「締切」「受付」「期限」「終了」が近くにある日付だけを対象にする（平年値や施行日は拾わない）。
- 結果は docs/_expired_dates.md（標準出力には件数だけ）。
"""
import io, os, re, glob, json, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TODAY = datetime.date.today()
FY = TODAY.year if TODAY.month >= 4 else TODAY.year - 1  # 今年度の開始年
KEY = re.compile(r"まで|締切|締め切り|受付|期限|終了|募集")
PAT = re.compile(r"(?:(20\d\d)年|令和(\d+)年)?(\d{1,2})月(\d{1,2})日")

def texts():
    for p in sorted(glob.glob(os.path.join(ROOT, "content", "qa", "*.json"))):
        d = json.load(io.open(p, encoding="utf-8"))
        for it in d.get("items", []):
            yield f"qa/{d['id']}#{it['id']}", " ".join([it.get("a", "")] + it.get("detail", []))
    p = os.path.join(ROOT, "content", "roadmap", "roadmap.json")
    if os.path.exists(p):
        yield "roadmap", io.open(p, encoding="utf-8").read()
    for p in sorted(glob.glob(os.path.join(ROOT, "content", "guides", "*.md"))):
        yield "guide/" + os.path.basename(p)[:-3], io.open(p, encoding="utf-8").read()

hits = []
for where, t in texts():
    for m in PAT.finditer(t):
        ctx = t[max(0, m.start() - 25): m.end() + 25]
        after = t[m.end(): m.end() + 8]
        before = t[max(0, m.start() - 2): m.start()]
        # 締切（〜まで／範囲の終わり）だけを見る。開始日・以前・済みの記載は除く
        is_end = after.startswith(("まで", "までに", "締切", "必着")) or before.endswith(("〜", "～", "から"[0:0] + "～"))
        if not is_end or after.startswith(("から", "以前", "に始")):
            continue
        if re.search(r"終了しました|終えました|でした|終了済み|締め切りました|受付終了|過ぎています|参考", t[max(0, m.start() - 10): m.end() + 40]):
            continue
        y, r, mo, da = m.groups()
        mo, da = int(mo), int(da)
        if y:
            year = int(y)
        elif r:
            year = 2018 + int(r)
        else:
            year = FY if mo >= 4 else FY + 1
        try:
            d = datetime.date(year, mo, da)
        except ValueError:
            continue
        if d < TODAY and d >= datetime.date(FY, 4, 1):
            hits.append((where, d.isoformat(), re.sub(r"\s+", " ", ctx)))

out = [f"# 期限が過ぎた日付の記載（{TODAY.isoformat()} 時点）", "",
       f"今年度（{FY}年4月〜）の日付で、締切・受付などの語の近くにあり、今日より前のもの: {len(hits)} 件。", "",
       "書き換えの目安: 「受付は○月○日で終了しました」に直すか、次年度の時期（例年の公式の記載があれば）に置き換える。", "",
       "| 場所 | 日付 | 前後の文 |", "|---|---|---|"]
out += [f"| {w} | {d} | {c.replace('|', '／')} |" for w, d, c in hits]
io.open(os.path.join(ROOT, "docs", "_expired_dates.md"), "w", encoding="utf-8", newline="\n").write("\n".join(out) + "\n")
print(len(hits))
