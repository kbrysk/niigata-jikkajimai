# レビューログ stock5A（2026-10-04）

対象: stock/ の niigata-shi-gomi-mochikomi、nagaoka-shi-gomi-mochikomi、jikkajimai-gyosha-hiyou-niigata
方法: 出典の公式ページ・PDF（画像PDFは目視）を取得して一件ずつ照合。業者費用は data/price_list_minnano.json をPythonで再計算し、比較サイトの掲載ページ（1〜3ページ）と全件突合。主KWでWebSearch（簡易監査）。電話・メールでの問い合わせはしていない。監査メモは research/_seo_audit/<slug>_audit_2026-10-04.md。

## 訂正・加筆の一覧（ファイル｜訂正前｜訂正後｜根拠URL）

| ファイル | 訂正前 | 訂正後 | 根拠URL |
|---|---|---|---|
| niigata-shi-gomi-mochikomi | 祝日は持ち込めません（全施設と読める）。鎧潟だけ日曜も可 | 祝日は鎧潟を除く5施設で不可。鎧潟は日曜と祝日も受け入れ（土日祝は15:00まで）。結論・早見表・施設節・FAQを修正 | https://www.city.niigata.lg.jp/kurashi/gomi/gomishigen/zikohan/haishi20180329.html ／ https://www.city.niigata.lg.jp/nishikan/shisetsu/seikatsu/yoroigata.html ／ https://www.city.niigata.lg.jp/kurashi/gomi/gomishigen/zikohan/haishidoyou.html |
| niigata-shi-gomi-mochikomi | 豊栄環境センターへの行き方は記載なし［要確認］ | 新新バイパス「豊栄IC」から車ですぐ。［要確認］を解消 | https://www.city.niigata.lg.jp/kita/shisetsu/seikatsu/toyosakakankyo.html |
| niigata-shi-gomi-mochikomi | 亀田一般廃棄物処理場の特定5品目の記載なし | 特定5品目の持ち込みは不可を追記 | https://www.city.niigata.lg.jp/konan/shisetsu/seikatsu/kamedaippanhaiki.html |
| niigata-shi-gomi-mochikomi | 免除制度の記載なし | 「手数料が免除される場合はありますか」を追加（火災ごみの家財道具は免除、量の上限なし、運搬費は自己負担、搬入不可物） | https://www.city.niigata.lg.jp/kurashi/gomi/gomi_recycl/tesuuryo-menjyo.html |
| niigata-shi-gomi-mochikomi | 粗大ごみ収集と持ち込みの比較表（guides/niigata-shi-sodaigomi.md と重複） | 表を削除。2文＋リンクに置換。計算例（900円＝90kg分）は残した | https://www.city.niigata.lg.jp/kurashi/gomi/gomishigen/gomidasi/niigata/ryoukinichiran.html |
| niigata-shi-gomi-mochikomi | ごみ出し支援の記載なし | 1文＋リンク（../niigata-shi-sodaigomi/）を追加 | （guides側の記述へのリンク） |
| niigata-shi-gomi-mochikomi | 出典に更新日なし。受入施設一覧の古さの記載なし | 各出典に更新日を付記。受入施設一覧は2023年10月2日更新と明記。「市で収集処理しないごみ」「手数料の免除制度」「豊栄」2ページを出典に追加 | https://www.city.niigata.lg.jp/kurashi/gomi/gomishigen/gomidasi/syusyunasi/none.html |
| nagaoka-shi-gomi-mochikomi | ページ内に「令和5年10月現在」の記載がある（収集処理できないもの全体にかかる書き方） | 消火器の項にある記載、と範囲を修正 | https://www.city.nagaoka.niigata.jp/kurashi/cate08/dekinai-gomi.html |
| nagaoka-shi-gomi-mochikomi | 粗大ごみ料金の表（3行、guidesと重複） | 表を削除し、文章＋リンク（../nagaoka-shi-sodaigomi/）に置換。値は照合済み（自転車200円、布団1枚200円、たんす600円/1,000円） | https://www.city.nagaoka.niigata.jp/kurashi/cate08/file/sodai-gomi01.pdf |
| nagaoka-shi-gomi-mochikomi | 収集と持ち込みの比較表（guidesと重複） | 表を削除し、文章＋リンクに置換 | https://www.city.nagaoka.niigata.jp/kurashi/cate08/sodai-gomi.html |
| nagaoka-shi-gomi-mochikomi | 古い施設名への注意なし | 民間サイトに鳥越クリーンセンターなどの旧名があることを1文追記 | https://www.city.nagaoka.niigata.jp/kurashi/cate08/mochi-gomi.html |
| nagaoka-shi-gomi-mochikomi | FAQ「寿に燃やさないごみは持ち込めますか」（冒頭・表と重複） | FAQ「実家の片付けのごみは持ち込めますか」に差し替え | https://www.city.nagaoka.niigata.jp/kurashi/cate08/mochi-gomi.html |
| jikkajimai-gyosha-hiyou-niigata | 「中央の半数」は4分の1番目と4分の3番目の値 | 第1・第3四分位数（線形補間）。補間のため実際の掲載額にない値も出る。「多くの社」を「半数ほどの社」に | https://m-ihinseiri.jp/partners/pref-15/ （データは data/price_list_minnano.json を再計算） |
| jikkajimai-gyosha-hiyou-niigata | 掲載元の「料金の目安」との関係の記載なし | 目安（1K 37,666円〜 ほか）は各社掲載額の平均と一致する旨を追記。本記事は中央値 | https://m-ihinseiri.jp/partners/pref-15/ |
| jikkajimai-gyosha-hiyou-niigata | 料金なし8社の内訳の記載なし。掲載元の「追加料金なし」「含まれる作業」の記載なし | 8社に刀剣買取を案内する社を含む旨、含まれる作業の範囲の掲載元の説明を追記 | https://m-ihinseiri.jp/partners/pref-15/ |
| jikkajimai-gyosha-hiyou-niigata | 総務省の調査でも、料金は事業者が自由に決めています | 総務省の報告書は「公定や公認の仕組みは存在しない」（廃棄物の処理やリサイクルには公定のルールや価格がある場合がある）。見積書75例の金額分布を追加 | https://www.soumu.go.jp/main_content/000675388.pdf （16・18ページ） ／ https://www.soumu.go.jp/menu_news/s-news/01hyouka02_200313000139953.html |
| jikkajimai-gyosha-hiyou-niigata | 「軽トラックパック7,000円」の広告で当日25万円 | 広告は「軽トラックパック7,000円、2トントラックパック2万5,000円」。詰め放題は「荷台の囲いの高さまで」 | https://www.kokusen.go.jp/news/data/n-20221102_1.html |
| jikkajimai-gyosha-hiyou-niigata | 残すよう指示した遺品を、誤って処分された例 | 処分しないよう頼んだ物を、勝手に処分された例 | https://www.kokusen.go.jp/news/data/n-20180719_1.html |
| jikkajimai-gyosha-hiyou-niigata | 料金表の行「テーブル（1人で持てる大きさ）」。ベッドにマットレスを含むか不明 | 「テーブル（小さめ）」。新潟市は天板最大辺1m未満、長岡市は1人で持てる大きさと注記。ベッドの料金にマットレスは含まないと注記。確認日を2026-10-04に | https://www.city.niigata.lg.jp/kurashi/gomi/gomishigen/gomidasi/niigata/ryoukinichiran.html ／ https://www.city.nagaoka.niigata.jp/kurashi/cate08/file/sodai-gomi01.pdf |
| jikkajimai-gyosha-hiyou-niigata | 新潟市の許可業者の一覧は当サイトの記事にある。長岡市の14社の一覧に時点の記載なし | 新潟市は市の公式一覧（2024年3月7日現在）で確認と明記。長岡市は一覧の表記「令和4年4月現在」（ページ更新2025年4月1日）と明記 | https://www.city.niigata.lg.jp/kurashi/gomi/gomishigen/unpankonnan.html ／ https://www.city.nagaoka.niigata.jp/kurashi/cate08/gomi-gyousya.html |
| jikkajimai-gyosha-hiyou-niigata | 補助金の表（guidesと重複） | 箇条書きに圧縮。上越市に「予算額に達し次第終了」、西蒲区に「消費税は対象外・一つの建築物につき1回・交付決定前の着手不可」を追記。詳細はguidesへリンク | https://www.city.joetsu.niigata.jp/soshiki/kenjuu/akiya-kazaisyobun.html ／ https://www.city.niigata.lg.jp/nishikan/torikumi/seisaku/nishikanakiyabank.files/akiyakazaishobunyoukou.pdf |
| jikkajimai-gyosha-hiyou-niigata | 「手数料に入っていないもの」（guidesと重複） | 箇条書きを1段落＋リンクに置換 | （guides/jikkajimai-hiyou-niigata.md へのリンク） |
| jikkajimai-gyosha-hiyou-niigata | 「費用を抑える」「誰が払う」「解体費用」の導線なし | 「費用を抑えるには」を追加（既存記事へのリンク） | （既存記事 jikkajimai-hiyou-niigata / jikkajimai-okane-ga-nai / kaitai-hiyou-niigata） |
| jikkajimai-gyosha-hiyou-niigata | 1文が76字・61字の2文 | 2文に分割 | （形式） |

## 照合OKで変更なしの主な点
- 新潟市: 10kgごと100円（2026年6月1日改定、旧60円）、現金のみ、計量2回、施設の住所・電話・受付、区別の施設、持ち込めない物、枝葉・草の寸法。
- 長岡市: 2施設の受付・料金、枝葉・草の曜日、拠点回収10品目・8か所、保存版PDF30ページの3点と寸法、収集処理できない物の全行、粗大ごみ収集の5点・2週間。
- 業者費用: 27社・19社・8社、全間取りの最小・中央値・最大・四分位、倍率・差額の数値。比較サイトの掲載額19社分が全件一致。市の粗大ごみ手数料の計算例（新潟市2,800円、長岡市4,000円）の18セル。

## 残した[要確認]
- niigata-shi-gomi-mochikomi: 8件（10kg未満の端数、事前予約の要否（2か所）、住む区と家の区が違うときの扱い、市外在住者の持ち込み、粗大ごみの寸法・重量の上限、第4赤塚埋立処分地で枝葉・草以外を受けるか、車種・積載量・台数の制限）
- nagaoka-shi-gomi-mochikomi: 14件（端数、1回の量の上限、窓口での受け入れ可否、実家の片付けが該当するか、年末年始の休業日、運べない大型物、支払方法、新施設の影響、電話受付時間、枝葉の寸法、点数上限、現行ページでの保存版3点、計量方法、防鳥ネット・防草シート）
- jikkajimai-gyosha-hiyou-niigata: 9件（4LDK以上、令和8年度の西蒲区受付、各社の想定家財量、最新料金、長岡市の所有者向け家財処分補助、範囲を絞った場合の下がり方、繁忙期・積雪期の料金差、階段・経路の加算、駐車条件の加算）
- 解消した[要確認]: 豊栄環境センターへの行き方（1件）。

## 対象外のため触っていない課題
- guides/niigata-shi-sodaigomi.md と guides/nagaoka-shi-sodaigomi.md の持ち込み節は、本記事と重なり、同じKW（「新潟市／長岡市 ごみ 持ち込み」）に入っている。本記事へのリンク化を推奨。
- guides/jikkajimai-hiyou-niigata.md の業者料金の表（1Kで37,666円〜など）は平均値。本記事は中央値のため、注記とリンクの追加を推奨。
