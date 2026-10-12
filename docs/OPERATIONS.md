# 運用マニュアル（新潟 実家じまいナビ）

このサイトを、誰が引き継いでも同じ品質で運営できるようにするための手順書。必要なのは Node.js（22以上）と Python（3.12以上）だけで、特定のAIツールやサービスに依存しない。

## 1. 全体の仕組み

| 部分 | 場所 | 役割 |
|---|---|---|
| 設定 | `site.json` | サイト名、URL、連絡先、運営者の表示、姉妹サイト、計測ID。売却・移管時はここを書き換える |
| 記事 | `content/guides/*.md` | ガイド記事（front matter: title / slug / description / targetKeywords / updated） |
| 在庫 | `content/stock/*.md` | 未公開の記事。監査が済んだら `content/guides/` へ移すと公開される |
| 固定ページ | `content/pages/*.md` | 運営者情報、相談フォーム、掲載案内、プライバシー等。連絡先は `{{contactForm}}`（お問い合わせフォームへのリンク）、所在地は `{{operatorAddress}}` と書く |
| 進め方ページ | `content/roadmap/roadmap.json` | 状況別×段階別の進め方（表示は `roadmap.mjs`） |
| Q&A | `content/qa/*.json` | 分類ごとのQ&A（表示は `qa.mjs`。1問ごとにアンカーとFAQPage構造化データ） |
| データ | `data/*.json` | 30市町村の粗大ごみ・補助金・空き家バンク等。すべて公式サイトを出典に自前で確認したもの |
| 掲載業者 | `data/partners.json` | 掲載する業者（status: published のものだけ出力） |
| 生成 | `build.mjs` | `dist/` に静的サイトを出力 |
| 公開 | `.github/workflows/pages.yml` | main への push で GitHub Pages に自動公開 |

## 2. 毎日・記事を公開するとき

1. 記事を `content/stock/` に書く（書き方は §6）。
2. 事実の裏取り（出典URLを開いて突合）と、読者目線の通読を行う。
3. `content/guides/` へ移す。関連記事からのリンクは `python scripts/_add_backlinks.py <新slug> <関連slug>...`。
4. `BASE_PATH="" node build.mjs` → `python scripts/_qa_site.py`（指摘0を確認）。
5. 変更したファイルだけを `git add` してコミット、push。
6. 公開後に `node indexnow.mjs`（Bing等への更新通知）。

## 3. 毎週

`python scripts/weekly_check.py` を実行し、`docs/_weekly_<日付>.md` を確認する。
- 品質点検（リンク切れ、title/description、h1）
- 記事内の外部URLの生存確認（404・転送の差し替え）
- 締切が過ぎた記載（「受付終了」に直す）
- 「確認中」一覧の再生成

## 4. 毎月

1. データ側の出典の変更検知: `node scripts/check_official.mjs`（`docs/_official_changes.md`）。
2. 月次の数字の記録（§7）。
3. 掲載業者への月次報告（依頼件数・成約の確認）。

## 5. 掲載業者の追加

`data/partners.json` に1件追加（必須キー: id, status, name, base, cities。訪問して確認した日は met_date）。見本の draft 1件は型の説明なので残す。推薦や体験談の文は入れない。掲載料・紹介料を受け取る業者には「PR」が表示される。

## 6. 書き方のルール（編集方針）

- 出典は国・県・市町村・公的機関などの公式のみ。記事末尾に出典URLと確認日を書く。
- 公式で確認できないことは `[要確認: ○○（確認先の窓口）]` と書く（生成時に「※確認中」と表示される）。推測で埋めない。電話での聞き取りは出典にしない。
- 体験談・架空の事例を作らない。業者を推薦しない。
- title は「主題｜補足」で主題25字以内、答えや数字を先に。description は120字以内。
- 内部リンクは `../slug/` の相対形式。
- 運営者の一人称や個人名を記事本文に書かない（運営者の表示は `site.json` の operatorPerson だけ）。
- 姉妹サイトへのリンクを記事本文に増やさない（フッター等は `site.json` の sisterSites で一括管理）。

## 7. 記録として残すもの（引き継ぎ・売却の根拠になる）

| 記録 | 頻度 | 置き場所 |
|---|---|---|
| Search Console の検索語・ページ別の流入 | 月1回エクスポート | 非公開の記録フォルダ |
| GA4 のセッション・参照元（AI経由を含む）・lead_submit イベント（相談の種類・市町村別） | 月1回 | 同上 |
| 相談の記録（受付日、相談の種類、市町村、取り次いだ業者、成約の有無。氏名・連絡先は別管理） | 都度 | 同上 |
| 掲載・紹介料の契約書と入金 | 都度 | 同上 |
| 運営にかかった時間 | 月1回 | 同上 |

個人情報（相談者の氏名・連絡先）は、相談の取り次ぎに必要な期間だけ保持し、件数の記録とは分けて保管する。

## 8. アカウントと移管の対象（資格情報はここに書かない）

| 対象 | 移管の方法 |
|---|---|
| 独自ドメイン | レジストラのアカウント間移管（または他社への移管コード） |
| GitHub リポジトリ | リポジトリの移管、または所有する Organization の権限変更 |
| GitHub Pages | リポジトリに付随（独自ドメインの設定を引き継ぐ） |
| Search Console | ドメインプロパティ（DNSの確認）に新しい所有者を追加 |
| GA4 | サイト専用のアカウントに新しい管理者を追加し、旧管理者を外す |
| Bing Webmaster Tools | 新しい所有者を追加 |
| IndexNow の鍵 | `.indexnow-key` と `public/<鍵>.txt`。移管後に作り直してよい |
| 問い合わせ用メールアドレス | サイト専用のアドレスを使う（個人アドレスにしない）。移管時は転送先を変更 |
| フォームの送信先 | `site.json` の formEndpoint・formEntries（Google フォーム。設問を変えたら entry 番号を取り直す）、表示用は contactFormUrl |

## 予約公開（2026-10-12 追加）
- 監査を通った記事は content/guides/ に置き、front matter に `publish: YYYY-MM-DD` を書く。その日まではサイトに出ない（一覧・サイトマップ・RSS・他記事からのリンクも出さない）。
- 毎朝 7:05（日本時間）に GitHub Actions の定時ビルドが走り、その日が公開日の記事が出る。公開後に `scripts/indexnow_today.mjs` がその日の記事だけを IndexNow で通知する。
- 公開日は1日1〜2本を目安に、間を空けずに並べる。関連記事の「次に読む」へのリンク（scripts/_add_backlinks.py）は先に足しておいてよい（公開日までは文字だけで表示される）。
- 定時ビルドは GitHub の混雑で数十分遅れることがある。
