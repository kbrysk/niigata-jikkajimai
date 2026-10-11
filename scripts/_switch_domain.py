# -*- coding: utf-8 -*-
"""GitHub Pages のサブパス（kbrysk.github.io/niigata-jikkajimai）から独自ドメインへ切り替える。
使い方（DNS の A/AAAA/CNAME レコードを設定し終えてから実行する）:
    PYTHONUTF8=1 python scripts/_switch_domain.py niigata-jikkajimai.com
    PYTHONUTF8=1 python scripts/_switch_domain.py niigata-jikkajimai.com --dry-run
やること:
  1. public/CNAME にドメインを書く（GitHub Pages の独自ドメイン指定）
  2. site.json の origin を https://<domain>、basePath を "" に
  3. .github/workflows/pages.yml の BASE_PATH を "" に
  4. 営業資料・点検スクリプト内の旧URL（https://kbrysk.github.io/niigata-jikkajimai）を新URLに置換
     （点検スクリプトは自サイト除外の判定に新ドメインも追加）
このあと: build → QA → commit → push → GitHub の Pages 設定で custom domain を確認し HTTPS を有効化
          → node indexnow.mjs → ハカラウ側のフッターリンクURLの更新を依頼。
旧URL は GitHub Pages が新ドメインへ自動で転送する。
"""
import io, os, re, sys, json, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OLD = "https://kbrysk.github.io/niigata-jikkajimai"
args = [a for a in sys.argv[1:] if not a.startswith("--")]
dry = "--dry-run" in sys.argv
if not args or not re.fullmatch(r"[a-z0-9-]+(\.[a-z0-9-]+)+", args[0]):
    sys.exit("usage: _switch_domain.py <domain> [--dry-run]")
DOMAIN = args[0]
NEW = f"https://{DOMAIN}"
log = []

def write(path, text):
    log.append(os.path.relpath(path, ROOT))
    if not dry:
        io.open(path, "w", encoding="utf-8", newline="").write(text)

# 1. CNAME
write(os.path.join(ROOT, "public", "CNAME"), DOMAIN + "\n")

# 2. site.json
p = os.path.join(ROOT, "site.json")
site = json.load(io.open(p, encoding="utf-8"))
site["origin"] = NEW
site["basePath"] = ""
write(p, json.dumps(site, ensure_ascii=False, indent=2) + "\n")

# 3. workflow
p = os.path.join(ROOT, ".github", "workflows", "pages.yml")
s = io.open(p, encoding="utf-8", newline="").read()
s2 = re.sub(r"(BASE_PATH:\s*)/niigata-jikkajimai", r'\1""', s)
if s2 != s:
    write(p, s2)

# 4. docs / scripts
targets = glob.glob(os.path.join(ROOT, "docs", "**", "*.md"), recursive=True) + \
          glob.glob(os.path.join(ROOT, "content", "**", "*.md"), recursive=True)
for p in targets:
    s = io.open(p, encoding="utf-8", newline="").read()
    if OLD in s:
        write(p, s.replace(OLD + "/", NEW + "/").replace(OLD, NEW))
for p in [os.path.join(ROOT, "scripts", "_check_guide_urls.py"), os.path.join(ROOT, "scripts", "check_official.mjs")]:
    if not os.path.exists(p):
        continue
    s = io.open(p, encoding="utf-8", newline="").read()
    if "kbrysk.github.io" in s and DOMAIN not in s:
        s2 = s.replace('if "kbrysk.github.io" in u:', f'if "kbrysk.github.io" in u or "{DOMAIN}" in u:')
        if s2 != s:
            write(p, s2)

out = os.path.join(ROOT, "docs", "_switch_domain_log.txt")
io.open(out, "w", encoding="utf-8").write(("DRY RUN\n" if dry else "") + f"{OLD} -> {NEW}\n" + "\n".join(log) + "\n")
print(len(log), "files", "(dry-run)" if dry else "")
