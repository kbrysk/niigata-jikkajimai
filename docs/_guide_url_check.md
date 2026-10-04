# 記事内の外部URL生存確認（2026-10-04）

対象URL 706 件 ／ 正常 702 ／ 要対応（404・5xx・接続失敗） 2 ／ 403（取得不可） 2 ／ リダイレクト先が別URL 11

再実行: `PYTHONUTF8=1 python scripts/_check_guide_urls.py`

## 要対応

| 状態 | URL | 記事 |
|---|---|---|
| 404 | https://www.town.aga.niigata.jp/info/soumu_info/3253.html | chouson-akiya-bank-niigata, jikkajimai-hojokin-niigata |
| 404 | https://www.city.kashiwazaki.lg.jp/soshikiichiran/shiminseikatsubu/kankyoka/2/6/6138.html | joetsu-sanjo-kashiwazaki-recycle-shop |

## 403（自動取得を拒否。ブラウザでの目視確認が必要）

| URL | 記事 |
|---|---|
| https://www1.g-reiki.net/town.seiro/reiki_honbun/e427RG00000875.html | jikkajimai-hojokin-niigata |
| https://www1.g-reiki.net/town.seiro/reiki_honbun/e427RG00000934.html | yukioroshi-shien-niigata-30 |

## リダイレクト先が別URL（記事のURLを新URLに差し替える候補）

| 旧URL | 転送先 | 記事 |
|---|---|---|
| http://www.town.izumozaki.niigata.jp/takuchi/bank/flow.html | https://www.town.izumozaki.niigata.jp:443/takuchi/bank/flow.html | chouson-akiya-bank-niigata |
| http://www.town.izumozaki.niigata.jp/takuchi/bank/owner.html | https://www.town.izumozaki.niigata.jp:443/takuchi/bank/owner.html | chouson-akiya-bank-niigata |
| http://www.town.izumozaki.niigata.jp/takuchi/ | https://www.town.izumozaki.niigata.jp:443/takuchi/ | chouson-akiya-bank-niigata |
| http://www.town.izumozaki.niigata.jp/_files/00026970/H291218yoko.pdf | https://www.town.izumozaki.niigata.jp:443/_files/00026970/H291218yoko.pdf | chouson-akiya-bank-niigata |
| https://sekikawa-vill.note.jp/n/n123700c94bc6 | https://sekikawa-vill.note.jp/n/n123700c94bc6?gs=e1547a889e9a94c5ba36ffbf23c9a369 | chouson-akiya-bank-niigata |
| https://sekikawa-vill.note.jp/n/na270e0ae718e | https://sekikawa-vill.note.jp/n/na270e0ae718e?gs=82c882654d0ec531cadbcfca3c74aaf9 | chouson-akiya-bank-niigata |
| https://sekikawa-vill.note.jp/n/n2f12da385d77 | https://sekikawa-vill.note.jp/n/n2f12da385d77?gs=30fc6085fc38d6ababdcf34ae37eef22 | chouson-akiya-bank-niigata |
| http://www.post.japanpost.jp/service/tenkyo/ | https://www.post.japanpost.jp/service/receive/relocation/ | enpou-kara-jikkajimai, jikkajimai-tejun-niigata |
| https://www.city.itoigawa.lg.jp/3385.htm | https://www.city.itoigawa.lg.jp/page/1541.html | myoko-itoigawa-uonuma-akiya-bank |
| https://www.city.itoigawa.lg.jp/6771.htm | https://www.city.itoigawa.lg.jp/page/1415.html | myoko-itoigawa-uonuma-akiya-bank |
| https://www.city.itoigawa.lg.jp/6427.htm | https://www.city.itoigawa.lg.jp/page/1910.html | myoko-itoigawa-uonuma-akiya-bank, yukioroshi-shien-niigata-30 |
