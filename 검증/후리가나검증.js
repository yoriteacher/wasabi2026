/* 한자 위에 히라가나가 제대로 얹히는지 확인합니다.  node 검증/후리가나검증.js
   시트에서 온 글도 그리므로, 남의 글이 화면을 건드리지 못하는지도 함께 봅니다. */
const fs = require('fs'), path = require('path');
const 뿌리 = path.join(__dirname, '..');
const 글 = fs.readFileSync(path.join(뿌리, 'index.html'), 'utf8');

let 통과 = 0, 실패 = 0;
function 확인(이름, 참) { 참 ? (통과++, console.log('  ok   ' + 이름)) : (실패++, console.log('  FAIL ' + 이름)); }

/* index.html 안의 후리가나그리기() 를 그대로 꺼내 가짜 DOM 위에서 돌립니다 */
const 조각 = 글.match(/function 후리가나그리기[\s\S]*?\n}\n/);
확인('후리가나그리기() 함수가 있다', !!조각);

function 가짜칸() {
  return { textContent: '', 자식: [], appendChild(n) { this.자식.push(n); } };
}
const 문서 = {
  createTextNode: (t) => ({ 종류: '글', 값: t }),
  createElement: (이름) => ({
    종류: 이름, 자식: [], textContent: '',
    appendChild(n) { this.자식.push(n); },
  }),
};
const 후리가나그리기 = new Function('document', 조각[0] + '\nreturn 후리가나그리기;')(문서);

function 그려보기(표기) {
  const 칸 = 가짜칸();
  후리가나그리기(칸, 표기);
  return 칸;
}
function 보이는글(칸) {
  return 칸.자식.map(n => n.종류 === '글' ? n.값 :
    n.자식.filter(c => c.종류 === '글').map(c => c.값).join('')).join('');
}
function 루비들(칸) {
  return 칸.자식.filter(n => n.종류 === 'ruby')
    .map(n => [n.자식.find(c => c.종류 === '글').값, n.자식.find(c => c.종류 === 'rt').textContent]);
}

console.log('\n한자 위에 히라가나 얹기');
let 칸 = 그려보기('{図書館|としょかん}は どこですか。');
확인('한자와 읽는 법이 짝지어진다', JSON.stringify(루비들(칸)) === JSON.stringify([['図書館', 'としょかん']]));
확인('한자가 본문에 그대로 보인다', 보이는글(칸) === '図書館は どこですか。');

칸 = 그려보기('{図書館|としょかん}は {本屋|ほんや}の {左|ひだり}に あります。');
확인('한 문장에 여러 개도 된다', 루비들(칸).length === 3);
확인('순서가 지켜진다', 루비들(칸).map(x => x[0]).join('') === '図書館本屋左');
확인('사이 글자가 빠지지 않는다', 보이는글(칸) === '図書館は 本屋の 左に あります。');

칸 = 그려보기('ありがとうございました。');
확인('한자가 없으면 글자만 나온다', 루비들(칸).length === 0 && 보이는글(칸) === 'ありがとうございました。');

console.log('\n시트에서 이상한 글이 와도 안전한가');
칸 = 그려보기('<img src=x onerror=alert(1)>{図書館|としょかん}');
확인('태그를 글자로만 담는다 (화면을 건드리지 못함)',
  칸.자식.every(n => n.종류 === '글' || n.종류 === 'ruby'));
확인('태그 글자가 그대로 보인다', 보이는글(칸).indexOf('<img') === 0);
확인('innerHTML 로 넣지 않는다', !/후리가나그리기[\s\S]*?innerHTML/.test(조각[0]));

칸 = 그려보기('{짝이 안 맞는 괄호');
확인('괄호가 안 닫혀도 그냥 글자로 나온다', 보이는글(칸) === '{짝이 안 맞는 괄호');
확인('빈 값도 견딘다', 보이는글(그려보기('')) === '');

console.log('\n문장과 읽는 법이 서로 맞는가');
const i = 글.indexOf('let PHRASES = ['), j = 글.indexOf('];', i);
const 문장들 = JSON.parse('[' + 글.slice(i + 15, j).replace(/([\w가-힣]+):/g, '"$1":') + ']');
확인('문장이 5개', 문장들.length === 5);
for (const p of 문장들) {
  if (!p.표기) continue;
  // 표기에서 한자를 읽는 법으로 바꾸고 공백을 지우면, 히라가나 문장과 같아야 합니다
  const 편 = p.표기.replace(/\{[^{}|]+\|([^{}|]+)\}/g, '$1').replace(/\s/g, '');
  확인('표기와 읽기가 일치: ' + p.표기.slice(0, 18), 편 === p.jp.replace(/\s/g, ''));
}

/* 화면 쪽 연결 */
console.log('\n화면에 이어져 있는가');
확인('표기가 있으면 후리가나로 그린다', /if\(p\.표기\) 후리가나그리기\(targetJp, p\.표기\);/.test(글));
확인('표기가 없으면 히라가나 그대로', /else targetJp\.textContent=p\.jp;/.test(글));
확인('단추에는 한자만 보인다', /b\.textContent = p\.표기 \? p\.표기\.replace/.test(글));
확인('시트의 표기 칸도 받는다', /표기:\s*String\(x\.표기/.test(글));
const 지에스 = fs.readFileSync(path.join(뿌리, '시트연동_Code.gs'), 'utf8');
확인('시트 코드가 표기 칸을 찾는다', /표기칸 = 칸찾기_/.test(지에스));

console.log('\n통과 ' + 통과 + ' / 실패 ' + 실패);
process.exit(실패 ? 1 : 0);
