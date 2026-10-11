# -*- coding: utf-8 -*-
"""SNS共有用の画像 public/assets/og.png（1200x630）を作る。サイト名を変えたらこれを再実行する。
使い方: PYTHONUTF8=1 python scripts/_build_og.py
"""
import os, json, io
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = json.load(io.open(os.path.join(ROOT, "site.json"), encoding="utf-8"))
B = r"C:\Windows\Fonts\BIZ-UDGothicB.ttc"
R = r"C:\Windows\Fonts\BIZ-UDGothicR.ttc"
BG, FG, SUB = (31, 61, 107), (255, 255, 255), (200, 212, 230)

img = Image.new("RGB", (1200, 630), BG)
d = ImageDraw.Draw(img)
# 左のマーク（ヘッダーの brand-mark と同じ「ナビ」）
d.rectangle([80, 150, 230, 300], outline=FG, width=6)
f = ImageFont.truetype(B, 64)
w = d.textlength("ナビ", font=f)
d.text((155 - w / 2, 225), "ナビ", font=f, fill=FG, anchor="lm")
# サイト名（「新潟」と「実家じまいナビ」の2行）
name = SITE["name"].split(" ", 1)
d.text((270, 190), name[0], font=ImageFont.truetype(B, 50), fill=FG, anchor="lm")
d.text((270, 262), name[1] if len(name) > 1 else "", font=ImageFont.truetype(B, 76), fill=FG, anchor="lm")
d.line([80, 360, 1120, 360], fill=FG, width=3)
d.text((80, 405), "新潟県30市町村の粗大ごみ・実家の片付け・空き家の案内", font=ImageFont.truetype(R, 34), fill=FG, anchor="lm")
d.text((80, 460), "公式サイトを出典に、確認日つき。長岡から運営。", font=ImageFont.truetype(R, 27), fill=SUB, anchor="lm")
host = SITE["origin"].replace("https://", "")
d.text((80, 571), f"{host}  ／  {SITE['operator']}", font=ImageFont.truetype(R, 22), fill=SUB, anchor="lm")
img.save(os.path.join(ROOT, "public", "assets", "og.png"), optimize=True)
print("ok")
