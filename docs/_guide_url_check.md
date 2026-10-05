# 記事内の外部URL生存確認（2026-10-05）

対象URL 709 件 ／ 正常 705 ／ 要対応（404・5xx・接続失敗） 2 ／ 403（取得不可） 2 ／ リダイレクト先が別URL 10

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
| http://www.vill.sekikawa.niigata.jp/life/13/696/index.html | https://www.vill.sekikawa.niigata.jp:443/life/13/696/index.html | chouson-akiya-bank-niigata |
| http://www.vill.sekikawa.niigata.jp/life/13/696/699/index.html | https://www.vill.sekikawa.niigata.jp:443/life/13/696/699/index.html | chouson-akiya-bank-niigata |
| http://www.vill.sekikawa.niigata.jp/reiki_int/reiki_honbun/e499RG00000598.html | https://www.vill.sekikawa.niigata.jp:443/reiki_int/reiki_honbun/e499RG00000598.html | chouson-akiya-bank-niigata |
| http://www.vill.sekikawa.niigata.jp/life/13/696/3545/index.html | https://www.vill.sekikawa.niigata.jp:443/life/13/696/3545/index.html | chouson-akiya-bank-niigata |
| http://www.vill.sekikawa.niigata.jp/file/01%E8%A6%81%E7%B6%B1.pdf | https://www.vill.sekikawa.niigata.jp:443/file/01%E8%A6%81%E7%B6%B1.pdf | chouson-akiya-bank-niigata |
| https://sekikawa-vill.note.jp/n/n123700c94bc6 | https://sekikawa-vill.note.jp/n/n123700c94bc6?gs=f20dad0ad968d3b4210d6714801b4682 | chouson-akiya-bank-niigata |
| https://sekikawa-vill.note.jp/n/na270e0ae718e | https://sekikawa-vill.note.jp/n/na270e0ae718e?gs=6aa68aa2d132f8e661307ead458220d5 | chouson-akiya-bank-niigata |
| https://sekikawa-vill.note.jp/n/n2f12da385d77 | https://sekikawa-vill.note.jp/n/n2f12da385d77?gs=ce37800fe633c1a7ffb610f4372a6859 | chouson-akiya-bank-niigata |
| http://www.vill.sekikawa.niigata.jp/life/13/bb3953ab80a8/index.html | https://www.vill.sekikawa.niigata.jp:443/life/13/bb3953ab80a8/index.html | chouson-akiya-bank-niigata, jikkajimai-hojokin-niigata |
| http://www.vill.sekikawa.niigata.jp/life/8/4085/index.html | https://www.vill.sekikawa.niigata.jp:443/life/8/4085/index.html | yukioroshi-gyosha-ryokin-niigata, yukioroshi-shien-niigata-30 |
