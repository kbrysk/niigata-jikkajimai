# -*- coding: utf-8 -*-
"""SNS（X・LINE・Facebook）で共有されたときのアイキャッチ（1200x630）を、記事と市町村ページごとに作る。
使い方: PYTHONUTF8=1 python scripts/build_og_cards.py   （記事を足したとき・title を変えたときに実行してコミットする）
       背景を足すとき: PYTHONUTF8=1 python scripts/build_og_cards.py --import <ChatGPTの画像を置いたフォルダ>

- 出力: public/og/guide/<slug>.jpg、public/og/city/<cityId>.jpg（build.mjs がファイルがあるページだけ og:image に使う）
- 文字: title の「｜」より前（答え）。front matter に ogText があればそれを使う（「/」で改行位置を指定できる）
- 数字（金額・日数・件数）は黄色で強調。数字と単位の途中では改行しない
- 背景は分類ごとの版画風イメージ public/assets/cat-*.jpg（市町村ページは photo-city.jpg）
- 分類の判定は build.mjs の GUIDE_CATS と同じ順・同じ正規表現（変えるときは両方を直す）
- CI（GitHub Actions）には Python が無いので、画像はここで作ってコミットする
"""
import io, json, os, re, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FB = r"C:\Windows\Fonts\BIZ-UDGothicB.ttc"
FR = r"C:\Windows\Fonts\BIZ-UDGothicR.ttc"
W, H = 1200, 630
NAVY, NAVY2 = (31, 63, 107), (23, 48, 79)
PAPER, WHITE, HL, SEAL = (247, 244, 236), (255, 255, 255), (255, 210, 77), (179, 65, 47)

CATS = [  # build.mjs の GUIDE_CATS と同じ
    ("yuki", "雪と冬の実家じまい", r"yuki|fuyu"),
    ("gomi", "粗大ごみ・ごみの出し方", r"sodaigomi|gomi|kaden|futon|sofa|recycle"),
    ("gyosha", "業者・遺品整理", r"gyosha|gyousha|ihinseiri|butsudan"),
    ("akiya", "空き家・相続・税金", r"akiya|souzoku|zeikin"),
    ("susume", "実家じまいの進め方と費用", r""),
]

# 背景を話題ごとに変える（同じ絵が並ばないように）。public/assets/og-bg/<key>.jpg があればそれを使い、無ければ分類の絵（cat-*.jpg）。
# 上から順に、最初に当たったもの。絵の作り方は niigata_private/proposals/og背景_ChatGPTプロンプト_2026-10-12.md
BG_RULES = [
    ("yukioroshi", r"yukioroshi"),
    ("fuyu-kanri", r"fuyu|kasai-hoken|kanri"),
    ("butsudan", r"butsudan"),
    ("kaitori", r"kaitori-doji|ihin-kaitori|recycle"),
    ("ihinseiri", r"ihinseiri|gomiyashiki|tokushu"),
    ("gyosha", r"gyosha|gyousha|kyoka(?!i)|matomete"),
    ("kaden", r"kaden|pc-sumaho|stove|jitensha"),
    ("futon", r"futon|carpet|shokki"),
    ("sodai", r"sodaigomi|sofa|kinko"),
    ("mochikomi", r"mochikomi|bunbetsu"),
    ("kaitai", r"kaitai|hojokin"),
    ("akiyabank", r"akiya-bank"),
    ("kyokai", r"kyokai|shigaika|saikenchiku|nouchi|kokko"),
    ("touki", r"touki|kyouyuu|souzokuhouki"),
    ("zeikin", r"zeikin|3000man|shutokuhi|koteishisanzei|ijihi"),
    ("uru", r"uru|urenai|satei|baikyaku|akiya-kaitori|kazai-nokoshi|jiko-bukken"),
    ("kichouhin", r"kichouhin"),
    ("oya", r"oya|sabishii|ninchisho|shisetsu|aisatsu"),
    ("enpou", r"enpou"),
    ("hiyou", r"hiyou|okane"),
    ("tejun", r"tejun|towa|yattewaikenai|seizenseiri|akiya-uru"),
]
# 市町村ページは地域ごと（build.mjs の AREA と同じ）
AREA = {
    "chuetsu": "nagaoka sanjo kashiwazaki ojiya kamo tokamachi mitsuke uonuma minamiuonuma tsubame yahiko tagami izumozaki yuzawa tsunan kariwa",
    "kaetsu": "niigata shibata murakami gosen agano tainai seiro aga sekikawa awashimaura",
    "joetsu": "joetsu itoigawa myoko",
    "sado": "sado",
}
ASSETS = os.path.join(ROOT, "public", "assets")

def variants(key):
    """<key>.jpg、<key>-2.jpg、<key>-3.jpg … のうち、あるもの。"""
    out, i = [], 1
    while True:
        f = os.path.join(ASSETS, "og-bg", f"{key}.jpg" if i == 1 else f"{key}-{i}.jpg")
        if not os.path.exists(f):
            return out
        out.append(f); i += 1

def bg_for(slug, cid):
    for key, rx in BG_RULES:
        if re.search(rx, slug):
            vs = variants(key)
            if vs:  # 同じ話題が多いときは、slug で決まった1枚を選ぶ（毎回同じ結果になる）
                return vs[sum(map(ord, slug)) % len(vs)]
            break
    return os.path.join(ASSETS, f"cat-{cid}.jpg")

def bg_for_city(city_id):
    for key, ids in AREA.items():
        f = os.path.join(ASSETS, "og-bg", f"area-{key}.jpg")
        if city_id in ids.split() and os.path.exists(f):
            return f
    return os.path.join(ASSETS, "photo-city.jpg")

def cat_of(slug):
    for cid, name, rx in CATS:
        if not rx or re.search(rx, slug):
            return cid, name

def front_matter(path):
    s = io.open(path, encoding="utf-8").read().replace("\r\n", "\n")
    m = re.match(r"---\n(.*?)\n---", s, re.S)
    fm = {}
    for line in (m.group(1) if m else "").split("\n"):
        mm = re.match(r"^([A-Za-z]+):\s*(.*)$", line)
        if mm:
            fm[mm.group(1)] = mm.group(2).strip().strip('"').strip("'")
    return fm

# ---- 文字の分割（数字＋単位・カタカナ・英字はひと固まり。助詞・句読点の後ろを改行の候補にする）----
UNIT = r"(?:万円|億円|円|か月|ヶ月|年度|年末|年|月末|月|日|時間|分|%|％|社|者|本|点|件|枚|kg|ｋｇ|cm|㎡|m|倍|割|段階|ルート|品目|項目|通り|問|つ|歳|字|人|市町村|町村|市|町|村|か所)?"
TOKEN = re.compile(r"[0-9０-９][0-9０-９,，.．〜~]*" + UNIT + r"|[ァ-ヴー・]+|[A-Za-z]+|.", re.S)
NUM = re.compile(r"^[0-9０-９]")
BREAK_AFTER = set("はがをにでのへ、。・？！）」』")
NO_HEAD = set("、。）」』？！ーっゃゅょ・")

def tokens(text):
    return TOKEN.findall(text)

_BX = None
def phrases(text):
    """BudouX で文節に分け（「新潟の/実家で/孤独死が/あっても/売却できる」）、「・」「、」の後ろと「（」の前でも分ける。「/」は手動の改行。"""
    global _BX
    if _BX is None:
        import budoux  # pip install budoux
        _BX = budoux.load_default_japanese_parser()
    out = []
    for i, part in enumerate(text.split("/")):
        if i:
            out.append(None)  # 改行
        for ph in _BX.parse(part):
            for x in re.split(r"(?<=[・、])|(?=（)", ph):
                # 行頭に来てはいけない文字（「・」「、」など）は前の文節にくっつける
                while x and x[0] in NO_HEAD and out and out[-1] is not None:
                    out[-1] += x[0]; x = x[1:]
                if x:
                    out.append(x)
    return out

def wrap(text, font, maxw, draw):
    w = lambda x: draw.textlength(x, font=font)
    lines, cur = [], ""
    for ph in phrases(text):
        if ph is None:
            lines.append(cur); cur = ""; continue
        if w(cur + ph) <= maxw:
            cur += ph; continue
        if cur:
            lines.append(cur); cur = ""
        if w(ph) <= maxw:
            cur = ph; continue
        for t in tokens(ph):  # 1つの文節が長すぎるときだけ、数字と単位を割らずに文字で折る
            if cur and w(cur + t) > maxw and t not in NO_HEAD:
                lines.append(cur); cur = ""
            cur += t
    if cur:
        lines.append(cur)
    return [l for l in lines if l]

def fit(text, draw, maxw, maxh):
    for size in range(88, 51, -4):
        f = ImageFont.truetype(FB, size)
        lines = wrap(text, f, maxw, draw)
        lh = int(size * 1.32)
        fits = all(draw.textlength(l, font=f) <= maxw + 4 for l in lines)  # 長いカタカナ語がはみ出すなら小さくする
        if fits and len(lines) <= (3 if size >= 72 else 4) and lh * len(lines) <= maxh:
            if len(lines) > 1:  # 行の長さをそろえる（最後の行だけ極端に短くならないように）
                total = draw.textlength(text.replace("/", ""), font=f)
                for wd in range(int(total / len(lines)), maxw + 1, 10):
                    alt = wrap(text, f, wd, draw)
                    if len(alt) == len(lines) and all(draw.textlength(l, font=f) <= maxw + 4 for l in alt):
                        lines = alt
                        break
            return f, lines, lh
    f = ImageFont.truetype(FB, 52)
    return f, wrap(text, f, maxw, draw)[:4], int(52 * 1.32)

def draw_line(draw, x, y, line, font):
    for t in tokens(line):
        if NUM.match(t):  # 数字の中の「,」は詰める（等幅のままだと「3, 000」と離れて見える）
            for ch in t:
                draw.text((x, y), ch, font=font, fill=HL, anchor="ls")
                x += draw.textlength(ch, font=font) * (0.45 if ch in ",，" else 1)
        else:
            draw.text((x, y), t, font=font, fill=WHITE, anchor="ls")
            x += draw.textlength(t, font=font)

def card(hook, chip, bg_path, out):
    img = Image.new("RGB", (W, H), PAPER)
    if os.path.exists(bg_path):
        bg = Image.open(bg_path).convert("RGB")
        scale = max(W / bg.width, H / bg.height)
        bg = bg.resize((int(bg.width * scale + 0.5), int(bg.height * scale + 0.5)), Image.LANCZOS)
        left = bg.width - W  # 絵の主役は右寄りなので右端に合わせる
        top = (bg.height - H) // 2
        img.paste(bg.crop((left, top, left + W, top + H)), (0, 0))
    d = ImageDraw.Draw(img)
    # 左の藍の面（右端を斜めに切る）
    d.polygon([(0, 0), (760, 0), (690, H), (0, H)], fill=NAVY)
    d.line([(760, 0), (690, H)], fill=PAPER, width=6)
    # 分類のラベル
    fc = ImageFont.truetype(FB, 28)
    cw = d.textlength(chip, font=fc)
    d.rounded_rectangle([60, 46, 60 + cw + 36, 46 + 50], radius=6, fill=PAPER)
    d.text((60 + 18, 46 + 25), chip, font=fc, fill=NAVY, anchor="lm")
    # 答え（大きく）
    font, lines, lh = fit(hook, d, 590, 380)
    block = lh * len(lines)
    y0 = 128 + (380 - block) // 2 + int(font.size * 0.95)
    for i, ln in enumerate(lines):
        draw_line(d, 60, y0 + i * lh, ln, font)
    # 下: サイト名と確認印
    d.line([(60, 540), (640, 540)], fill=(120, 145, 180), width=2)
    d.rectangle([60, 560, 104, 604], outline=WHITE, width=3)
    d.text((82, 583), "ナビ", font=ImageFont.truetype(FB, 17), fill=WHITE, anchor="mm")
    d.text((120, 583), "新潟 実家じまいナビ", font=ImageFont.truetype(FB, 30), fill=WHITE, anchor="lm")
    fs = ImageFont.truetype(FB, 20)
    sx, sy = 498, 562
    d.rectangle([sx - 18, sy, sx + 160, sy + 42], fill=PAPER, outline=SEAL, width=3)
    d.text((sx + 71, sy + 21), "公式情報で確認", font=fs, fill=SEAL, anchor="mm")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    buf = io.BytesIO(); img.save(buf, "JPEG", quality=86, optimize=True, progressive=True)
    data = buf.getvalue()
    if os.path.exists(out) and open(out, "rb").read() == data:
        return  # 変化なし（書き込まない）
    for i in range(6):  # Windows で一時的にファイルがつかまれていることがあるので、少し待って再試行
        try:
            with open(out, "wb") as fo:
                fo.write(data)
            return
        except OSError:
            import time; time.sleep(0.5 * (i + 1))
    raise OSError("書き込めません: " + out)

def main():
    made = 0
    gdir = os.path.join(ROOT, "content", "guides")
    for f in sorted(os.listdir(gdir)):
        if not f.endswith(".md"):
            continue
        fm = front_matter(os.path.join(gdir, f))
        slug = fm.get("slug") or f[:-3]
        hook = fm.get("ogText") or re.split(r"[｜|]", fm.get("title", slug))[0].strip()
        cid, cname = cat_of(slug)
        card(hook, cname, bg_for(slug, cid), os.path.join(ROOT, "public", "og", "guide", f"{slug}.jpg"))
        made += 1
    base = json.load(io.open(os.path.join(ROOT, "data", "municipalities_base.json"), encoding="utf-8"))
    for c in base:
        card(f"{c['city']}の/実家じまい", "粗大ごみ・解体補助金・空き家バンク", bg_for_city(c["cityId"]), os.path.join(ROOT, "public", "og", "city", f"{c['cityId']}.jpg"))
        made += 1
    print(made)

def import_bg(src):
    """ChatGPT で作った背景（<key>.png など。名前はプロンプト集どおり）を、幅1400のJPEGにして og-bg に置く。"""
    dst = os.path.join(ASSETS, "og-bg"); os.makedirs(dst, exist_ok=True); n = 0
    for f in sorted(os.listdir(src)):
        stem, ext = os.path.splitext(f)
        if ext.lower() not in (".png", ".jpg", ".jpeg", ".webp") or not re.fullmatch(r"[a-z0-9-]+", stem):
            continue
        im = Image.open(os.path.join(src, f)).convert("RGB")
        if im.width > 1400:
            im = im.resize((1400, round(im.height * 1400 / im.width)), Image.LANCZOS)
        im.save(os.path.join(dst, stem + ".jpg"), "JPEG", quality=84, optimize=True, progressive=True); n += 1
    print("imported", n)

if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "--import":  # build_og_cards.py --import <フォルダ>
        import_bg(sys.argv[2]); main()
    elif len(sys.argv) > 1:  # 試し: build_og_cards.py "文字" 出力パス
        card(sys.argv[1], "試し", os.path.join(ROOT, "public", "assets", "cat-akiya.jpg"), sys.argv[2])
    else:
        main()
