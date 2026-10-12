# -*- coding: utf-8 -*-
"""特典PDFのページを画像にして、サイトの「無料ガイド」の見本（表紙と中のページを重ねた絵）に使う。
使い方: node scripts/build_guide_pdf.mjs のあとで  PYTHONUTF8=1 python scripts/_build_guide_images.py
出力: public/assets/guide/cover.jpg（表紙）・p-deadlines.jpg（期限の早見表）・p-checklist.jpg（やることチェックリスト）
画像はすべて当サイトのPDFから作った自作物（docs/ASSETS.md に記録）。依存: PyMuPDF（fitz）
"""
import os
import fitz  # PyMuPDF

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF = os.path.join(ROOT, "public", "dl", "niigata-jikkajimai-kanzen-guide.pdf")
OUT = os.path.join(ROOT, "public", "assets", "guide")
os.makedirs(OUT, exist_ok=True)

doc = fitz.open(PDF)


def find_page(*words):
    """すべての語を含む最初のページ（表紙と目次は除く）"""
    for i in range(2, len(doc)):
        t = doc[i].get_text()
        if all(w in t for w in words):
            return i
    raise SystemExit("ページが見つかりません: " + " ".join(words))


targets = {
    "cover.jpg": 0,
    "p-deadlines.jpg": find_page("期限のある手続きの早見表", "数え始め"),
    "p-checklist.jpg": find_page("やることチェックリスト"),
}
for name, idx in targets.items():
    page = doc[idx]
    zoom = 900 / page.rect.width  # 幅900pxで書き出す（表示は最大300px前後。高解像度の画面でもにじまない）
    pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
    path = os.path.join(OUT, name)
    pix.save(path, jpg_quality=84)
    print(name, "page", idx + 1, os.path.getsize(path) // 1024, "KB")
