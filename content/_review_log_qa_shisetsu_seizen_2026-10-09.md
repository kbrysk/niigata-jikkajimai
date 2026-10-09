# Q&A監査ログ（親が施設に入るとき／親が元気なうちに準備する）2026-10-09

対象: content/qa/shisetsu.json、content/qa/seizen.json

## 件数の内訳

- 変更した行の合計: 49件（既存の問いの修正 36件、追加 13件）
- shisetsu.json: 36問 -> 43問（追加7問）。seizen.json: 33問 -> 39問（追加6問）
- 観点「事実」: 19件（shisetsu 12件、seizen 7件）
- 観点「読者の得」: 12件（shisetsu 6件、seizen 6件）
- 観点「AI引用」: 5件（shisetsu 1件、seizen 4件）
- 観点「疑問の連鎖(追加)」: 13件（shisetsu 7件、seizen 6件）

## 突合方法

- sources のURLと、訂正に使った公式ページを2026-10-09に実際に開いて照合した。電話・メールでの問い合わせはしていない。
- 出典は法務省・法務局・裁判所・国税庁・厚生労働省・自治体・日本公証人連合会・日本郵便・全国銀行協会・東北電力の公式のみ（既存の出典を維持。追加分は法務省・裁判所・国税庁・厚労省・自治体・日本公証人連合会）。
- 家族信託（seizen-24）は、法務省民事局の公表ページの記載範囲に収まっていることを確認した。

## 変更一覧

| ファイル | id | 観点 | 訂正前 | 訂正後 | 根拠URL |
|---|---|---|---|---|---|
| shisetsu.json | shisetsu-01 | 読者の得 | 最初の相談先の記載なし | detailに「最初の相談先は、親の担当の地域包括支援センター」を追加 | https://www.city.niigata.lg.jp/iryo/kaigo/chiikihokatsu/houkatsutop.html |
| shisetsu.json | shisetsu-02 | 事実 | a「新潟市と長岡市の案内ページに、施設入所時に住民票を移す基準の記載はありません。[要確認: 施設入所時の住民票の扱い]」。長岡市の期限は未記載 | a「移す基準は両市の案内に書かれていません。移す場合は、新しい住所に住み始めた日から14日以内」。長岡市の転居届も14日以内、新潟市も14日以内、代理届出は委任状、長岡市市民課0258-39-7514を追記。基準そのものは公式に無いため[要確認]を窓口確認の形で残した | https://www.city.niigata.lg.jp/kurashi/todokede/kosekinado/jyuminhyo/jushoido.html<br>https://www.city.nagaoka.niigata.jp/kurashi/life03/tenkyo.html<br>https://www.pref.niigata.lg.jp/sec/kourei/1194797775806.html |
| shisetsu.json | shisetsu-04 | 事実 | 「家族が親の分を代わりに出せるかは、[要確認: 日本郵便の代理提出の条件]」 | 窓口では提出者と転居者が異なる場合、転居者の本人確認書類は写しでよい、に置換。提出方法3種を追加。転送「無料」を原文で確認 | https://www.post.japanpost.jp/service/receive/relocation/ |
| shisetsu.json | shisetsu-11 | 事実 | 民法717条を「所有者らが責任を負う可能性」とのみ記載。「弁護士に相談します」 | 占有者が先、注意を尽くしていれば所有者、の順を補足。相談先を新潟県弁護士会・法テラス新潟の名称と電話つきで記載 | https://www.city.niigata.lg.jp/kurashi/jyutaku/kenchiku/kanri/kanrisekinin.html<br>https://www.city.niigata.lg.jp/kurashi/jyutaku/akiya/madoguchi.html |
| shisetsu.json | shisetsu-12 | 事実 | サポーターの相談分野「管理、売買、解体、相続」 | 県ページの5分野「売買・賃貸、管理、除却・解体、相続、活用」に合わせた | https://www.pref.niigata.lg.jp/site/toshiseisaku/niigata-akiya-supporter-soudan.html |
| shisetsu.json | shisetsu-13 | 読者の得 | 「親の判断能力が下がっているときの払出しは、[要確認: 銀行・司法書士・弁護士]」 | 独断で払い出さず銀行と専門家に相談、と相談先（地域包括支援センター、新潟県司法書士会、新潟県弁護士会、法テラス新潟）を電話つきで記載。断定はしていない | https://www.city.niigata.lg.jp/kurashi/jyutaku/akiya/madoguchi.html<br>https://www.zenginkyo.or.jp/article/life/retirement/15761/ |
| shisetsu.json | shisetsu-15 | 読者の得 | 申立ての相談窓口の記載なし | 新潟市成年後見支援センター（025-248-4545）、長岡市成年後見センター（0258-86-4715）を追記 | https://www.city.niigata.lg.jp/iryo/kenfuku/news/kouken-shien-center.html<br>https://www.city.nagaoka.niigata.jp/fukushi/cate07/seinen-kouken.html |
| shisetsu.json | shisetsu-16 | 事実 | 「後見人等が…許可が必要」のみ | 保佐人・補助人は不動産の処分の代理権を与えられている場合に申し立てられる、を追記 | https://www.courts.go.jp/saiban/syurui/syurui_kazi/kazi_25_04/index.html |
| shisetsu.json | shisetsu-17 | 事実 | a「…委任や後見の手続きが一般に必要です。」（出典に「委任」の記載なし） | a「判断能力が下がった後は、後見人等が家庭裁判所の許可を得て売ります。」に変更。相談先に新潟県司法書士会の電話相談を追記 | https://www.courts.go.jp/saiban/syurui/syurui_kazi/kazi_25_04/index.html<br>https://guardianship.mhlw.go.jp/personal/type/legal_guardianship/<br>https://www.city.niigata.lg.jp/kurashi/jyutaku/akiya/madoguchi.html |
| shisetsu.json | shisetsu-18 | 事実 | 「かかる期間の公式な目安は、確認できていません。[要確認: 家庭裁判所に確認]」 | 後見開始の審理期間（令和7年、2か月以内約71.1%、4か月以内約93.8%）を最高裁の統計で補った。居住用不動産の許可の期間は公式な目安が無いため[要確認]を残した | https://www.courts.go.jp/assets/20260316koukengaikyou-r7.pdf |
| shisetsu.json | shisetsu-19 | 事実 | 「利用料は、[要確認: 新潟県社会福祉協議会の料金]」 | 厚生労働省の記載（実施主体が定める。訪問1回あたり平均約1,200円。契約前の初期相談は無料）を補った。県社協の料金そのものは[要確認]を残した | https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/hukushi_kaigo/seikatsuhogo/chiiki-fukusi-yougo/index.html |
| shisetsu.json | shisetsu-21 | 読者の得 | 「聞いた内容は、メモや書面に残します」等のみで切り出しの順番がない | 進める順番（戻れる見込みの確認、本人の気持ち、費用を並べる、選択肢を比べる）を追加 | （一次情報の追加なし。構成の改善） |
| shisetsu.json | shisetsu-24 | AI引用 | a「…預貯金額の上限があります。」（結論の数字なし） | a「預貯金等が段階ごとの上限（単身で500万〜1,000万円）を超えると、…受けられません。」 | https://www.city.niigata.lg.jp/iryo/kaigo/kaigoindex/riyousyahutankeigen.html |
| shisetsu.json | shisetsu-26 | 読者の得 | 費用を払った子の控除の扱いなし | 新しい問い（shisetsu-38）への参照を追記 | https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1120.htm |
| shisetsu.json | shisetsu-27 | 事実 | 「施設入所中の売却がどこまで認められるかは、No.3302に記載がありません。[要確認: 税務署・税理士]」 | No.3302の期限（住まなくなった日から3年を経過する日の属する年の12月31日）の読み方と日付の例を追加。国税庁の質疑応答事例・通達を検索したが施設入所中の自宅売却を扱うページは確認できず、[要確認]を残した | https://www.nta.go.jp/taxes/shiraberu/taxanswer/joto/3302.htm |
| shisetsu.json | shisetsu-29 | 事実 | 要件が建築年・貸付・期限のみ | 耐震基準（または取り壊し）、売却代金1億円以下、市区町村の確認書を追記 | https://www.nta.go.jp/taxes/shiraberu/taxanswer/joto/3306.htm<br>https://www.nta.go.jp/taxes/shiraberu/taxanswer/joto/3307.htm |
| shisetsu.json | shisetsu-30 | 事実 | 要介護認定の要件の記載なし。出典はNo.4124のみ | 入所の直前に要介護認定または要支援認定を受けていたことを追記。国税庁の質疑応答事例を出典に追加 | https://www.nta.go.jp/taxes/shiraberu/taxanswer/sozoku/4124.htm<br>https://www.nta.go.jp/law/shitsugi/sozoku/10/15.htm |
| shisetsu.json | shisetsu-33 | 事実 | 「親の住所で担当が決まります」 | 「担当する地区が決まっています。長岡市は町名別の担当一覧がある」。新潟市のページは中学校区ごとの圏域とあり、「親の住所で決まる」旨の記載が無かった | https://www.city.niigata.lg.jp/iryo/kaigo/chiikihokatsu/houkatsutop.html<br>https://www.city.nagaoka.niigata.jp/fukushi/cate02/houkatu_center.html |
| shisetsu.json | shisetsu-36 | 読者の得 | a「公式ページに、分担割合の一般論は確認できていません。[要確認: 相続人間の負担割合（弁護士・司法書士）]」 | a「分担割合を決める公式の基準は確認できていません。立て替えた人と金額を記録し、窓口役を決めて話し合います。」。相談先を新潟県弁護士会・法テラス新潟の名称と電話つきで追記 | https://www.city.niigata.lg.jp/kurashi/jyutaku/akiya/madoguchi.html |
| shisetsu.json | shisetsu-37 | 疑問の連鎖(追加) | なし | 施設の食費・居住費の補助（負担限度額認定）の申請先と必要書類 | https://www.city.niigata.lg.jp/iryo/kaigo/kaigoindex/riyousyahutankeigen.html<br>https://www.city.nagaoka.niigata.jp/fukushi/cate02/hutan_keigen.html |
| shisetsu.json | shisetsu-38 | 疑問の連鎖(追加) | なし | 施設に入った親の費用を子が払うと医療費控除になるか | https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1120.htm<br>https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1125.htm |
| shisetsu.json | shisetsu-39 | 疑問の連鎖(追加) | なし | 空き家になった実家の固定資産税は誰が払うか | https://www.city.niigata.lg.jp/kurashi/zei/siraberu/koteishisan/koteishisangaiyou.html<br>https://www.city.nagaoka.niigata.jp/kurashi/cate02/kotei/kotei.html<br>https://www.city.nagaoka.niigata.jp/kurashi/life03/akiya-taisaku.html |
| shisetsu.json | shisetsu-40 | 疑問の連鎖(追加) | なし | 成年後見人に子がなれるか（令和7年の統計） | https://www.courts.go.jp/assets/20260316koukengaikyou-r7.pdf<br>https://www.courts.go.jp/saiban/syurui/syurui_kazi/kazi_06_01/index.html |
| shisetsu.json | shisetsu-41 | 疑問の連鎖(追加) | なし | 成年後見人への報酬（新潟家庭裁判所のめやす、平成26年2月） | https://www.courts.go.jp/niigata/vc-files/niigata/2021/kasaisyosiki/R3211.pdf<br>https://www.courts.go.jp/saiban/syurui/syurui_kazi/kazi_25_06/index.html |
| shisetsu.json | shisetsu-42 | 疑問の連鎖(追加) | なし | 成年後見の申立費用・報酬の助成（新潟市・長岡市・法テラス） | https://www.city.niigata.lg.jp/iryo/korei/anshinseikatsu/koreisha-seinenkoken.html<br>https://www.city.nagaoka.niigata.jp/fukushi/cate07/shien-jigyo.html<br>https://guardianship.mhlw.go.jp/personal/type/legal_guardianship/ |
| shisetsu.json | shisetsu-43 | 疑問の連鎖(追加) | なし | 入所前の要介護認定と相続後の空き家特例・小規模宅地等の特例 | https://www.nta.go.jp/taxes/shiraberu/taxanswer/joto/3307.htm<br>https://www.nta.go.jp/taxes/shiraberu/taxanswer/sozoku/4124.htm |
| seizen.json | seizen-01 | 読者の得 | a「…親がこれからどうしたいかを聞く形で切り出します。」。時期は「帰省のたびに1つ」のみ | a「「この家、これからどうしたい？」と聞く形で、帰省のたびに1つずつ」。聞く順番（住まい、持ち物、万一のとき）と時期（お盆・年末年始の帰省）を具体化 | （一次情報の追加なし。構成の改善） |
| seizen.json | seizen-02 | 読者の得 | 「地域包括支援センターなど、第三者に…」（名称と数のみ・出典なし） | 親と一緒に相談する旨と、長岡市11か所・新潟市30か所を記載し、出典を追加 | https://www.city.niigata.lg.jp/iryo/kaigo/chiikihokatsu/houkatsutop.html<br>https://www.city.nagaoka.niigata.jp/fukushi/cate02/houkatu_center.html |
| seizen.json | seizen-04 | AI引用 | a「…同じ内容を知っておくと、後で揉めにくくなります。」（問いの「いつ」に答えていない） | a「親の了解を得たら、早めにきょうだい全員へ同時に伝えます。親に無断で、先にきょうだいへ話すことは避けます。」 | （一次情報の追加なし。構成の改善） |
| seizen.json | seizen-09 | 事実 | 「長岡市の同様の支援は、[要確認: 長岡市のごみ出し支援の有無]」 | 長岡市の「高齢者の助けになるサービス」にごみ出し支援の記載が無いこと、「ふれあい収集」の利用申請書が公開されていること（介護度等の書類コピーを添付）を記載。対象要件は申請書に無く、[要確認]を残した | https://www.city.nagaoka.niigata.jp/fukushi/cate02/zaitaku_survice.html<br>https://www.city.nagaoka.niigata.jp/download/cate03/ |
| seizen.json | seizen-10 | AI引用 | a「…書面請求の手数料は1通600円です。」（時点なし） | a「令和7年4月1日以降、書面請求の手数料は1通600円です。」（法務省ページの時点に合わせた） | （一次情報の追加なし。構成の改善） |
| seizen.json | seizen-11 | 読者の得 | a「2024年4月1日より前に相続した不動産の登記は…」。相談先は「司法書士」のみ | a「…祖父母から相続した不動産は…」と主語を補い、新潟県司法書士会の電話相談（025-240-7867）を追記 | https://www.city.niigata.lg.jp/kurashi/jyutaku/akiya/madoguchi.html |
| seizen.json | seizen-13 | AI引用 | a「権利証（登記識別情報）は再通知されませんが、…」（問い「売れなくなる？」に結論が出るのが2文目） | a「売れなくなるとは限りません。…」と結論を1文目に置いた | （一次情報の追加なし。構成の改善） |
| seizen.json | seizen-14 | 事実 | 「国土交通省版の案内があります」 | 長岡市のページの記載（家系図も記入できる国のエンディングノート）に合わせ、「国土交通省版」を「国のエンディングノート」に修正 | https://www.city.nagaoka.niigata.jp/kurashi/life03/akiya-taisaku.html |
| seizen.json | seizen-16 | 事実 | detail「司法書士、公証役場、法務局に相談できます。」（seizen-18の「保管所は内容の相談に応じない」と矛盾） | 「遺言の内容は、司法書士、弁護士、公証役場で相談します。法務局の遺言書保管所は、内容の相談には応じません。」 | https://www.moj.go.jp/MINJI/02.html<br>https://www.koshonin.gr.jp/system/s02/s02_08 |
| seizen.json | seizen-19 | AI引用 | a「法務局に保管された自筆証書遺言は、…検認が不要です。」 | a「不要です。…」と問いへの答えを1文目に置いた | （一次情報の追加なし。構成の改善） |
| seizen.json | seizen-20 | 読者の得 | 手数料は「財産の価額に応じて決まります」のみ | 金額の例（seizen-36）への参照、公証人への相談は無料、を追記 | https://www.koshonin.gr.jp/notary/ow02 |
| seizen.json | seizen-21 | 事実 | 「受付時間は、[要確認: 各役場に問い合わせ]」 | 両役場のページに受付時間の記載が無いこと、日本公証人連合会が予約制の役場があり相談は無料と案内していることを記載。受付時間は公式に無いため[要確認]を残した（電話はしていない） | https://www.koshonin.gr.jp/system/s02/s02_08 |
| seizen.json | seizen-23 | 読者の得 | a「法務省は、地域包括支援センター、弁護士会、…などを挙げています。」（窓口名・電話なし） | a「新潟市成年後見支援センター（025-248-4545）、長岡市成年後見センター（0258-86-4715）が相談窓口です。」。受付時間・相談無料・予約を追記。shisetsu-33との重複（センター数）を解消 | https://www.city.niigata.lg.jp/iryo/kenfuku/news/kouken-shien-center.html<br>https://www.city.nagaoka.niigata.jp/fukushi/cate07/seinen-kouken.html<br>https://www.moj.go.jp/MINJI/minji17.html |
| seizen.json | seizen-24 | 読者の得 | 相談先の記載なし | 「個別の設計は、司法書士や弁護士に相談します。」を追記。解説は法務省ページの範囲内であることを確認（パンフレット本文は取得できず[要確認]のまま） | https://www.moj.go.jp/MINJI/minji17.html |
| seizen.json | seizen-28 | 事実 | 「実家の名義変更の登記費用や不動産取得税は、[要確認: 法務局・県税事務所]」 | 国税庁No.7191と新潟県の不動産取得税のページで確認でき、新しい問い（seizen-34）に回した | https://www.nta.go.jp/taxes/shiraberu/taxanswer/inshi/7191.htm<br>https://www.pref.niigata.lg.jp/sec/zeimu/fudosan.html |
| seizen.json | seizen-30 | 事実 | 令和9年以降の加算の100万円控除の記載なし | 「令和9年1月2日以後の相続開始では、相続開始前3年より前の贈与分は、合計100万円まで加算されません」を追記。国税庁の表は令和9年1月1日から、100万円控除の注記は1月2日以後と日付の書き方が揃っておらず、注記側の日付を採った | https://www.nta.go.jp/taxes/shiraberu/taxanswer/sozoku/4161.htm |
| seizen.json | seizen-31 | 事実 | 「新潟市は要介護状態や慢性疾患のある人などが対象」（世帯要件の記載なし） | 新潟市の対象に「65歳以上の世帯員で構成される世帯など」の要件を補い、長岡市の月額の区分（非課税500円・課税1,500円）、新潟市の窓口3種を明記 | https://www.city.niigata.lg.jp/iryo/korei/anshinseikatsu/anshinrenraku.html<br>https://www.city.nagaoka.niigata.jp/fukushi/cate02/zaitaku_survice.html |
| seizen.json | seizen-34 | 疑問の連鎖(追加) | なし | 実家の名義を生前に移すときの登録免許税・不動産取得税 | https://www.nta.go.jp/taxes/shiraberu/taxanswer/inshi/7191.htm<br>https://www.pref.niigata.lg.jp/sec/zeimu/fudosan.html |
| seizen.json | seizen-35 | 疑問の連鎖(追加) | なし | 任意後見契約の費用（公証役場の手数料13,000円など）。厚生労働省の後見ポータルは旧額（11,000円・1,400円）のため、日本公証人連合会の記載を採用 | https://www.koshonin.gr.jp/notary/ow04/4-q22<br>https://guardianship.mhlw.go.jp/personal/type/optional_guardianship/ |
| seizen.json | seizen-36 | 疑問の連鎖(追加) | なし | 公正証書遺言の手数料と計算例 | https://www.koshonin.gr.jp/notary/ow02 |
| seizen.json | seizen-37 | 疑問の連鎖(追加) | なし | 法務局に預けた遺言書の通知（指定者通知・関係遺言書保管通知） | https://www.moj.go.jp/MINJI/10.html |
| seizen.json | seizen-38 | 疑問の連鎖(追加) | なし | 親の物忘れが増えたときの相談先 | https://www.city.nagaoka.niigata.jp/fukushi/cate02/houkatu_center.html<br>https://www.city.niigata.lg.jp/iryo/kaigo/chiikihokatsu/houkatsutop.html |
| seizen.json | seizen-39 | 疑問の連鎖(追加) | なし | 遺言と遺留分 | https://www.courts.go.jp/saiban/syurui/syurui_kazi/lkazi_07_26/index.html |

## 突合して一致を確認（変更なし）

shisetsu: shisetsu-03、shisetsu-05、shisetsu-06、shisetsu-07、shisetsu-08、shisetsu-09、shisetsu-10、shisetsu-14、shisetsu-20、shisetsu-22、shisetsu-23、shisetsu-25、shisetsu-28、shisetsu-31、shisetsu-32、shisetsu-34、shisetsu-35

seizen: seizen-03、seizen-05、seizen-06、seizen-07、seizen-08、seizen-12、seizen-15、seizen-17、seizen-18、seizen-22、seizen-25、seizen-26、seizen-27、seizen-29、seizen-32、seizen-33

主な確認内容: 住所地特例の対象施設と2015年4月のサ高住の扱い（県ページの更新は2019年9月26日）、日本郵便の転居届（届出日から1年・3〜7営業日）、東北電力の廃止申込（2営業日前）、成年後見の申立手数料800円・登記手数料2,600円、居住用不動産の処分の許可（無効・手数料800円）、補足給付の預貯金上限（1,000万・650万・550万・500万円）、高額介護サービス費（第4段階①44,400円）、国税庁No.3302・3306・3307・4124・4103・4161・4402・1125、法務局の遺言書保管手数料3,900円、登記事項証明書の手数料600円・520円・490円、所有不動産記録証明制度（令和8年2月2日開始・1,600円）、相続登記の義務化（令和9年3月31日まで・過料10万円以下）、新潟県の雪下ろし事故（令和6年度137件）。

## 未解決の[要確認]（公式で埋められなかったもの）

- shisetsu-02: 施設入所時に住民票を移すかどうかの基準（新潟市・長岡市の案内に記載なし）
- shisetsu-12: 空き家の管理委託の料金（公的な相場資料なし）
- shisetsu-18: 居住用不動産の処分の許可にかかる期間（公式の目安なし。後見開始の審理期間は統計で補った）
- shisetsu-19: 新潟県社会福祉協議会の日常生活自立支援事業の料金（県・市のページに記載なし。厚労省の全国平均のみ）
- shisetsu-26: 有料老人ホームの医療費控除（No.1125に記載なし）
- shisetsu-27: 施設入所中に実家を売る場合の「住まなくなった日」の扱い（No.3302・通達・質疑応答事例を探したが確認できず）
- shisetsu-31: 火災保険の空き家の扱い（公的な一次情報なし）
- shisetsu-36: きょうだい間の費用負担割合
- shisetsu-37: 新潟市の負担限度額認定の適用開始時期
- shisetsu-38: 親と別居の場合の「生計を一にする」の判断
- shisetsu-39: 新潟市の資産税課の連絡先と納税通知書の送付先変更
- shisetsu-41: 新潟家庭裁判所の報酬のめやすの現在の運用（文書は平成26年2月）
- shisetsu-43: 入所前後の認定の時期の扱い
- seizen-09: 長岡市のふれあい収集の対象要件
- seizen-21: 長岡公証人合同役場・新潟公証人合同役場の受付時間
- seizen-24: 信託パンフレット本文（PDF）の内容

## 補足（出典間の食い違い）

- 任意後見契約の費用: 厚生労働省の後見ポータルは「基本手数料11,000円・登記嘱託手数料1,400円」、日本公証人連合会は「13,000円・1,600円」。連合会の記載を採用した（seizen-35）。
- 国税庁No.4161: 表は令和9年1月1日から、100万円控除の注記は令和9年1月2日以後と日付が揃っていない。日付の食い違いは国税庁に確認が要る。
