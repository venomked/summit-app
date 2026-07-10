// ひろしさんダイエットアプリ 自動テスト
// 実行: npm install && npm test
// Claude Codeで更新した後は必ずこのテストを全件パスさせること（CLAUDE.md参照）
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const HTML_PATH = process.env.APP_HTML || path.join(__dirname, 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

let pass = 0, fail = 0;
const results = [];
function ok(name, cond, detail) {
  if (cond) { pass++; results.push('OK  ' + name); }
  else { fail++; results.push('NG  ' + name + (detail ? ' -- ' + detail : '')); }
}
function dstr(offsetDays) {
  const d = new Date(Date.now() - offsetDays * 86400000);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function makeDom(url, storageItems) {
  const errors = [], alerts = [];
  const dom = new JSDOM(html, {
    url, runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(window) {
      if (storageItems) for (const [k, v] of Object.entries(storageItems)) window.localStorage.setItem(k, v);
      window.URL.createObjectURL = window.URL.createObjectURL || (() => 'blob:stub');
      window.URL.revokeObjectURL = window.URL.revokeObjectURL || (() => {});
      window.alert = (m) => alerts.push(m);
      window.addEventListener('error', e => errors.push(e.message));
    }
  });
  dom.__errors = errors; dom.__alerts = alerts;
  return dom;
}
function synth(days, endW, slopePerWeek) {
  const arr = [];
  const perDay = slopePerWeek / 7;
  for (let i = days; i >= 0; i--) arr.push({ d: dstr(i), w: +(endW - perDay * i).toFixed(3), f: +(27 + 0.03 * i).toFixed(2) });
  return arr;
}
const pick = (d, g, v) => d.querySelector('.cgroup[data-g="' + g + '"] button[data-v="' + v + '"]').click();

(async () => {
  // ---- 基本表示 ----
  {
    const dom = makeDom('https://base.test/d.html');
    const d = dom.window.document;
    await new Promise(r => setTimeout(r, 60));
    ok('基本1 読み込み時JSエラーなし', dom.__errors.length === 0, dom.__errors.join(';'));
    ok('基本2 起点76.3kg・残り13.3kg', d.getElementById('startLbl').textContent === '76.3kg' && d.getElementById('remain').textContent === '13.3');
    ok('基本3 みらい予報が表示', !isNaN(parseFloat(d.getElementById('fcW').textContent)));
  }
  // ---- レディネス採点（v5.0） ----
  {
    const dom = makeDom('https://r1.test/d.html');
    const d = dom.window.document;
    await new Promise(r => setTimeout(r, 50));
    d.getElementById('coachBtn').click();
    ok('採点1 デフォルト条件でR=95・GO判定', d.getElementById('rText').textContent.includes('95/100') && d.getElementById('rText').textContent.includes('GO'), d.getElementById('rText').textContent);
    ok('採点2 バー幅がスコア連動', d.getElementById('rFill').style.width === '95%');
    pick(d, 'sleep', 's4'); pick(d, 'fatigue', 'mid'); pick(d, 'rhr', 'high');
    d.getElementById('coachBtn').click();
    ok('採点3 低回復日はR=30・CARE判定', d.getElementById('rText').textContent.includes('30/100') && d.getElementById('rText').textContent.includes('CARE'), d.getElementById('rText').textContent);
    const w = d.getElementById('coWork').textContent;
    ok('採点4 心拍高値の警告と強度ダウン指示', w.includes('起床時心拍') && w.includes('レディネス30'));
    ok('採点5 心拍入力の選択肢4つ', d.querySelectorAll('.cgroup[data-g="rhr"] button').length === 4);
  }
  // ---- ピリオダイゼーション（v5.0） ----
  {
    const dom = makeDom('https://p1.test/d.html');
    const d = dom.window.document;
    await new Promise(r => setTimeout(r, 50));
    dom.window.__forceWeek = 4;
    d.getElementById('coachBtn').click();
    ok('周期1 第4週はディロード指示', d.getElementById('coWork').textContent.includes('ディロード'), d.getElementById('coWork').textContent);
    ok('周期2 週表示にサイクル4/4', d.getElementById('rText').textContent.includes('サイクル4/4'));
    dom.window.__forceWeek = 2;
    d.getElementById('coachBtn').click();
    ok('周期3 第2週はディロードなし', !d.getElementById('coWork').textContent.includes('ディロード'));
  }
  // ---- メンター統合（v5.0） ----
  {
    const dom = makeDom('https://m1.test/d.html', {
      'diet:hist': JSON.stringify(synth(20, 76.3, -0.45)),
      'diet:latest': JSON.stringify({ weight: 76.3, fat: 27, waist: 86 })
    });
    const d = dom.window.document;
    await new Promise(r => setTimeout(r, 60));
    d.getElementById('coachBtn').click();
    ok('統合1 順調ペースを声かけに反映', d.getElementById('coWord').textContent.includes('応えている'), d.getElementById('coWord').textContent);
  }
  // ---- 既存機能の回帰 ----
  {
    const dom = makeDom('https://reg.test/d.html');
    const d = dom.window.document;
    await new Promise(r => setTimeout(r, 50));
    pick(d, 'time', 't4');
    d.getElementById('coachBtn').click();
    ok('回帰1 22:30以降→運動オフは最優先で維持', d.getElementById('coWork').textContent.includes('運動オフ'));
    pick(d, 'time', 't1');
    d.getElementById('inW').value = '75.8'; d.getElementById('inF').value = '26.8'; d.getElementById('inC').value = '86.5';
    d.getElementById('saveBtn').click();
    await new Promise(r => setTimeout(r, 30));
    ok('回帰2 記録保存と履歴追加', JSON.parse(dom.window.localStorage.getItem('diet:hist')).some(p => p.w === 75.8));
    ok('回帰3 保存後もJSエラーなし', dom.__errors.length === 0, dom.__errors.join(';'));
    d.getElementById('inStart').value = '80'; d.getElementById('startBtn').click();
    await new Promise(r => setTimeout(r, 30));
    ok('回帰4 起点変更が機能', dom.window.localStorage.getItem('diet:start') === '80');
  }
  // ---- 予測の頑健性 ----
  {
    const clean = synth(20, 76.3, -0.45);
    const spiked = JSON.parse(JSON.stringify(clean));
    spiked[10].w = +(spiked[10].w + 1.7).toFixed(3);
    const d1 = makeDom('https://f1.test/d.html', { 'diet:hist': JSON.stringify(clean), 'diet:latest': JSON.stringify({ weight: 76.3, fat: 27, waist: 86 }) });
    const d2 = makeDom('https://f2.test/d.html', { 'diet:hist': JSON.stringify(spiked), 'diet:latest': JSON.stringify({ weight: 76.3, fat: 27, waist: 86 }) });
    await new Promise(r => setTimeout(r, 80));
    const w1 = parseFloat(d1.window.document.getElementById('fcW').textContent);
    const w2 = parseFloat(d2.window.document.getElementById('fcW').textContent);
    ok('予測1 ホールモデル予測が妥当圏', w1 > 70.7 && w1 < 71.9, 'fcW=' + w1);
    ok('予測2 1日の異常値でもブレ1.2kg未満', Math.abs(w1 - w2) < 1.2, 'diff=' + Math.abs(w1 - w2).toFixed(2));
  }
  // ---- セキュリティ不変条件（Claude Code更新時も必ず維持） ----
  {
    ok('守1 CSPで外部送信遮断', html.includes("connect-src 'none'"));
    ok('守2 送信コード(fetch/XHR/beacon)なし', !/fetch\(|XMLHttpRequest|sendBeacon/.test(html));
    ok('守3 eval等なし', !/\beval\(|new\s+Function\(/.test(html));
    ok('守4 外部scriptタグなし', (html.match(/<script[^>]*src=/g) || []).length === 0);
  }
  console.log(results.join('\n'));
  console.log('\n合計: OK ' + pass + ' / NG ' + fail);
  process.exit(fail ? 1 : 0);
})();
