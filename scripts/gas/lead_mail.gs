/**
 * 新潟 実家じまいナビ — 完全ガイドの申し込み受付とステップメール（Google Apps Script）
 *
 * 置き場所: このサイト専用の Google アカウントで作ったスプレッドシートの「拡張機能 > Apps Script」に貼る（docs/LEAD_SETUP.md）。
 * 役割:
 *   doPost  … サイトのフォームから申し込みを受け、シート「leads」に1行足し、1通目を送る
 *   doGet   … 配信停止リンク（?u=<token>）を受け、配信を止める
 *   runSteps … 1時間ごとのトリガーで、2通目以降のうち送る時期が来たものを送る
 * 本文はサイトの /lead/sequence.json を毎回読み込む（content/lead/sequence.md が元）。approved が true でないと1通も送らない。
 * 送信は Gmail（MailApp）。無料の Google アカウントは1日100通まで。
 */

var SHEET = 'leads';
var HEAD = ['受付日時', 'メールアドレス', '市町村', '状況', '同意', '申込ページ', '状態', '送信済み', '最終送信', '配信停止日時', 'token'];
var C = { at: 1, email: 2, city: 3, sit: 4, consent: 5, page: 6, status: 7, sent: 8, last: 9, unsub: 10, token: 11 };

function prop_(k, d) { var v = PropertiesService.getScriptProperties().getProperty(k); return v || d; }
// 配信停止リンクの宛先。ウェブアプリとしてデプロイした URL（…/exec）をスクリプト プロパティ WEBAPP_URL に入れる
function webAppUrl_() { return prop_('WEBAPP_URL', ScriptApp.getService().getUrl()); }
function siteUrl_() { return String(prop_('SITE_URL', 'https://niigata-jikkajimai.com')).replace(/\/$/, ''); }

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
  if (sh.getLastRow() === 0) sh.appendRow(HEAD);
  return sh;
}

function sequence_() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get('seq');
  if (hit) return JSON.parse(hit);
  var res = UrlFetchApp.fetch(siteUrl_() + '/lead/sequence.json?t=' + Date.now(), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('sequence.json を読めません: ' + res.getResponseCode());
  var text = res.getContentText('UTF-8');
  cache.put('seq', text, 600);
  return JSON.parse(text);
}

// ---------- 申し込み ----------
function doPost(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.website) return text_('ok'); // ボット除け（人には見えない欄）
    var email = String(p.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return text_('invalid');
    if (p.consent !== 'yes') return text_('no-consent');
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var sh = sheet_();
      var rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, HEAD.length).getValues() : [];
      var now = new Date();
      for (var i = 0; i < rows.length; i++) {
        if (rows[i][C.email - 1] !== email) continue;
        if (rows[i][C.unsub - 1]) return text_('ok'); // 配信停止した人には送り直さない
        if (now - new Date(rows[i][C.at - 1]) < 24 * 3600 * 1000) return text_('ok'); // 24時間以内の重複は受け流す
      }
      var token = Utilities.getUuid().replace(/-/g, '');
      sh.appendRow([now, email, String(p.city || '').slice(0, 40), String(p.situation || '').slice(0, 10), 'あり（' + Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm') + '）', String(p.page || '').slice(0, 200), '配信中', '', '', '', token]);
      var row = sh.getLastRow();
    } finally { lock.releaseLock(); }
    sendStep_(row, 0);
    return text_('ok');
  } catch (err) {
    console.error(err);
    return text_('error');
  }
}

// ---------- 配信停止 ----------
function doGet(e) {
  var t = String((e && e.parameter && e.parameter.u) || '').replace(/[^0-9a-f]/g, '');
  var msg = '配信停止のリンクが正しくありません。お手数ですが、サイトのお問い合わせフォームからご連絡ください。';
  if (t) {
    var sh = sheet_();
    var n = sh.getLastRow() - 1;
    var tokens = n > 0 ? sh.getRange(2, C.token, n, 1).getValues() : [];
    for (var i = 0; i < tokens.length; i++) {
      if (tokens[i][0] !== t) continue;
      var r = i + 2;
      if (!sh.getRange(r, C.unsub).getValue()) { sh.getRange(r, C.unsub).setValue(new Date()); sh.getRange(r, C.status).setValue('配信停止'); }
      msg = '配信を停止しました。これ以降、新潟 実家じまいナビからのメールはお送りしません。';
      break;
    }
  }
  var site = siteUrl_();
  return HtmlService.createHtmlOutput('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><div style="font-family:sans-serif;max-width:560px;margin:40px auto;padding:0 16px;line-height:1.8"><h1 style="font-size:20px">新潟 実家じまいナビ</h1><p>' + msg + '</p><p><a href="' + site + '/" target="_top">サイトに戻る</a></p></div>').setTitle('配信停止｜新潟 実家じまいナビ');
}

// ---------- 2通目以降（1時間ごとのトリガー） ----------
function runSteps() {
  var seq = sequence_();
  if (seq.approved !== true) return;
  var sh = sheet_();
  var n = sh.getLastRow() - 1;
  if (n < 1) return;
  var rows = sh.getRange(2, 1, n, HEAD.length).getValues();
  var now = new Date();
  var budget = Math.max(0, MailApp.getRemainingDailyQuota() - 10); // 1通目のために少し残す
  for (var i = 0; i < rows.length && budget > 0; i++) {
    var row = rows[i];
    if (row[C.unsub - 1] || row[C.status - 1] !== '配信中') continue;
    var sent = String(row[C.sent - 1] || '').split(',').filter(String);
    // 間隔は「前の1通を送った日」から数える（承認前に申し込んだ人に、承認後まとめて届かないように）
    var last = row[C.last - 1] ? new Date(row[C.last - 1]) : null;
    for (var s = 0; s < seq.steps.length; s++) {
      var st = seq.steps[s];
      if (sent.indexOf(String(st.step)) >= 0) continue;
      var gap = s === 0 ? 0 : st.offsetDays - seq.steps[s - 1].offsetDays;
      if (s > 0 && (!last || (now - last) / (24 * 3600 * 1000) < gap)) break;
      sendStep_(i + 2, s); // 1回の実行で1人1通まで
      budget--;
      break;
    }
    if (sent.length >= seq.steps.length) sh.getRange(i + 2, C.status).setValue('配信完了');
  }
}

function sendStep_(r, index) {
  var seq = sequence_();
  if (seq.approved !== true) return; // 承認前は送らない（申し込みの記録だけ残る）
  var sh = sheet_();
  var v = sh.getRange(r, 1, 1, HEAD.length).getValues()[0];
  if (v[C.unsub - 1]) return;
  var st = seq.steps[index];
  var sent = String(v[C.sent - 1] || '').split(',').filter(String);
  if (!st || sent.indexOf(String(st.step)) >= 0) return;
  var vars = varsFor_(seq, v[C.sit - 1], v[C.city - 1], webAppUrl_() + '?u=' + v[C.token - 1]);
  var mail = compose_(seq, st, vars);
  var opts = { name: seq.senderName, htmlBody: mail.html };
  if (index === 0) {
    try { opts.attachments = [UrlFetchApp.fetch(vars.pdf_url).getBlob().setName(seq.pdfName)]; } catch (err) { console.warn('PDFを添付できませんでした: ' + err); }
  }
  MailApp.sendEmail(v[C.email - 1], mail.subject, mail.text, opts);
  sent.push(String(st.step));
  sh.getRange(r, C.sent).setValue(sent.join(','));
  sh.getRange(r, C.last).setValue(new Date());
}

// 差し込みの値。状況・市町村は申し込み時に選んだもの（選ばなければ汎用の文）
function varsFor_(seq, sitId, cityId, unsubUrl) {
  var site = siteUrl_();
  var sit = seq.situations[sitId];
  var city = seq.cities[cityId];
  return {
    site: site,
    pdf_url: site + seq.pdfPath,
    situation_block: sit ? '**「' + sit.label + '」を選んだ方へ**\n最初にやることは、次の' + sit.first.length + 'つです。\n' + sit.first.map(function (f, i) { return (i + 1) + '. ' + f; }).join('\n') : 'いまの状況がはっきりしない場合は、ガイドの1章にある4つの状況から、近いものを選んでください。',
    city_block: city ? city.name + 'の粗大ごみの料金・申し込み方法・持ち込み先と、空き家の解体補助金は、こちらにまとめています。\n\n[' + city.name + 'のページを見る](' + site + '/city/' + cityId + '/)' : '実家のある市町村のページで、料金表と持ち込み先を確かめられます。\n\n[市町村別ガイドを見る](' + site + '/city/)',
    price_count: seq.prices.count, price_1k: seq.prices.k1, price_3ldk: seq.prices.ldk3,
    unsubscribe_url: unsubUrl,
  };
}

// 件名・テキスト版・HTML版を組み立てる
function compose_(seq, st, vars) {
  var fill = function (t) { return String(t).replace(/\{\{(\w+)\}\}/g, function (all, k) { return vars[k] != null ? vars[k] : ''; }); };
  var body = fill(st.body), foot = fill(seq.footer);
  var footBody = foot.replace(/^─+\n/, '');
  return {
    subject: fill(st.subject),
    text: toText_(body) + '\n\n' + toText_(foot),
    html: '<div style="font-family:\'Hiragino Sans\',\'Yu Gothic\',Meiryo,sans-serif;font-size:15px;line-height:1.85;color:#1f2328;max-width:600px">' + toHtml_(body) + '<hr style="border:none;border-top:1px solid #d9d7d0;margin:32px 0 14px">' + toHtml_(footBody, true) + '</div>',
  };
}

// 本文の記法: 空行で段落／[文字](URL) はテキストリンク／リンクだけの段落はボタン／**太字**
var LINK_RE = /\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g;
function toHtml_(text, small) {
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var pStyle = small ? 'margin:0 0 8px;font-size:12px;line-height:1.7;color:#5f6670' : 'margin:0 0 16px';
  return text.split(/\n{2,}/).map(function (para) {
    var t = para.trim();
    if (!t) return '';
    var only = t.match(/^\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (only && !small) return '<p style="margin:22px 0 26px"><a href="' + esc(only[2]) + '" style="display:inline-block;background:#1f3f6b;color:#ffffff;text-decoration:none;font-weight:bold;padding:13px 24px;border-radius:6px">' + esc(only[1]) + '</a></p>';
    var links = [];
    var h = esc(para.replace(LINK_RE, function (all, label, url) { links.push([label, url]); return '\u0000' + (links.length - 1) + '\u0000'; }));
    h = h.replace(/https?:\/\/[^\s<\u0000]+/g, function (u) { return '<a href="' + u + '" style="color:#1f3f6b">' + u + '</a>'; });
    h = h.replace(/\u0000(\d+)\u0000/g, function (all, i) { return '<a href="' + esc(links[i][1]) + '" style="color:#1f3f6b">' + esc(links[i][0]) + '</a>'; });
    h = h.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    return '<p style="' + pStyle + '">' + h + '</p>';
  }).join('');
}

// テキスト版: リンクは「文字（URL）」、太字の記号は外す
function toText_(text) {
  return String(text).replace(LINK_RE, '$1（$2）').replace(/\*\*([^*\n]+)\*\*/g, '$1');
}

function text_(s) { return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.TEXT); }

// ---------- 初期設定（1回だけ手で実行する） ----------
function setup() {
  sheet_();
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'runSteps') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('runSteps').timeBased().everyHours(1).create();
  var seq = sequence_();
  console.log('sequence.json を読めました。approved=' + seq.approved + '、' + seq.steps.length + '通');
}

// 自分のアドレスに5通をまとめて送って見た目を確かめる（承認前でも送れる。シートには記録しない）
function sendTestToMe() {
  var me = Session.getActiveUser().getEmail();
  var seq = sequence_();
  var vars = varsFor_(seq, 's1', 'nagaoka', webAppUrl_() + '?u=test');
  seq.steps.forEach(function (st) {
    var mail = compose_(seq, st, vars);
    MailApp.sendEmail(me, '[テスト] ' + mail.subject, mail.text, { name: seq.senderName, htmlBody: mail.html });
  });
}
