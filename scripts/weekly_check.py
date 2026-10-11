# -*- coding: utf-8 -*-
"""週1回の点検をまとめて回す（公開後の運用用）。
使い方: PYTHONUTF8=1 python scripts/weekly_check.py
1. ビルド（BASE_PATH は site.json の basePath に従う）
2. サイト品質点検 scripts/_qa_site.py（docs/_qa_report.md）
3. 記事内の外部URLの生存確認 scripts/_check_guide_urls.py（docs/_guide_url_check.md）
4. 「確認中」一覧の再生成 scripts/_build_youkakunin.py（docs/要確認一覧_<日付>.md）
結果の要約を docs/_weekly_<日付>.md に書く。標準出力には英数字だけを出す。
"""
import io, os, subprocess, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TODAY = datetime.date.today().isoformat()
ENV = dict(os.environ, PYTHONUTF8="1", PYTHONIOENCODING="utf-8")
# 点検は dist をルート基準で見るので、ローカルのビルドは常に BASE_PATH="" で行う（本番の配信パスとは無関係）。
ENV["BASE_PATH"] = ""

def run(cmd):
    r = subprocess.run(cmd, cwd=ROOT, env=ENV, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.returncode, ((r.stdout or "") + (r.stderr or "")).strip()

lines = [f"# 週次点検（{TODAY}）", ""]
_, b = run(["node", "build.mjs"])
lines.append(f"- ビルド: {b.splitlines()[-1] if b else '出力なし'}")
_, qa = run(["python", "scripts/_qa_site.py"])
p = (qa.split() + ["?", "?", "?"])[:3]
lines.append(f"- 品質点検: 対象 {p[0]} ページ／指摘 {p[1]} 件（高 {p[2]}）。詳細は docs/_qa_report.md")
_, u = run(["python", "scripts/_check_guide_urls.py"])
q = (u.split() + ["?"] * 5)[:5]
lines.append(f"- 記事内URL: {q[0]} 件中 正常 {q[1]}／要対応 {q[2]}／403 {q[3]}／転送先あり {q[4]}。詳細は docs/_guide_url_check.md")
_, dt = run(["python", "scripts/_check_dates.py"])
lines.append(f"- 期限が過ぎた締切の記載: {dt.strip() or '?'} 件。docs/_expired_dates.md を見て「受付終了」に直す")
run(["python", "scripts/_build_youkakunin.py"])
cnt = os.path.join(ROOT, "docs", "_youkakunin_count.txt")
if os.path.exists(cnt):
    c = io.open(cnt, encoding="utf-8").read().split()
    lines.append(f"- 確認中: {c[0]} 件（{c[1]} 記事）。docs/要確認一覧_{TODAY}.md")
    os.remove(cnt)
lines += ["", "次にやること: 要対応のURLを差し替える／確認中を窓口・業者訪問で埋める／Search Console の表示回数が出始めた記事から title を見直す。"]
out = os.path.join(ROOT, "docs", f"_weekly_{TODAY}.md")
io.open(out, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")
print("weekly done:", " ".join(p), " urls:", " ".join(q))
