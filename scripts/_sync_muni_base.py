# -*- coding: utf-8 -*-
"""ふれあいの丘の正本（app/lib/data/municipalities.json）から新潟県30市町村の解体補助データを
data/municipalities_base.json に再同期する。
使い方: PYTHONUTF8=1 python scripts/_sync_muni_base.py
- 正本に値があれば正本を採用。正本が null の項目（window・phone）はこちらの値を残す。
- 正本の applicationStatus が「終了」なら maxAmount の末尾に受付終了の注記を付ける。
- 同期元と日付を各エントリの _synced に記録する。
- 主要9市は data/akiya_yuki_core9.json（公式再確認値）が build 時に優先されるため、本ファイルは補助扱い。
"""
import json, io, os, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = r"C:\Users\Ryosuke\Desktop\seizenseiri\app\lib\data\municipalities.json"
DST = os.path.join(ROOT, "data", "municipalities_base.json")
TODAY = datetime.date.today().isoformat()

src = json.load(io.open(SRC, encoding="utf-8"))
canon = {m["cityId"]: m for m in src if m.get("prefId") == "niigata"}
ours = json.load(io.open(DST, encoding="utf-8"))
items = ours if isinstance(ours, list) else ours["municipalities"]

log = []
for o in items:
    m = canon.get(o.get("cityId"))
    if not m:
        log.append(f"{o.get('city')}: 正本に無し")
        continue
    s = m.get("subsidy") or {}
    t = o.setdefault("subsidy", {})
    before = json.dumps(t, ensure_ascii=False, sort_keys=True)
    t["has"] = bool(s.get("hasSubsidy"))
    t["name"] = s.get("name")
    mx = s.get("maxAmount")
    if mx and s.get("applicationStatus") == "終了":
        mx = f"{mx}（令和8年度分の受付は終了）"
    t["maxAmount"] = mx
    cond = s.get("conditions")
    if isinstance(cond, str):
        cond = [c.strip() for c in cond.replace("。", "。\n").split("\n") if c.strip()]
    t["conditions"] = cond or []
    if s.get("officialUrl"):
        t["officialUrl"] = s["officialUrl"]
    if s.get("window"):
        t["window"] = s["window"]
    if s.get("phone"):
        t["phone"] = s["phone"]
    t["applicationStatus"] = s.get("applicationStatus")
    t["note"] = s.get("notes") or s.get("note") or None
    o["_synced"] = {"from": "fureaino-oka app/lib/data/municipalities.json", "date": TODAY}
    after = json.dumps(t, ensure_ascii=False, sort_keys=True)
    log.append(f"{o.get('city')}: {'更新' if before != after else '変更なし'}")

io.open(DST, "w", encoding="utf-8", newline="\n").write(json.dumps(ours, ensure_ascii=False, indent=2) + "\n")
io.open(os.path.join(ROOT, "docs", "_sync_muni_log.txt"), "w", encoding="utf-8").write("\n".join(log) + "\n")
print(sum(1 for l in log if "更新" in l), len(log))
