/* 지금 채점이 실제로 몇 점을 주는지 재 봅니다.  node 검증/채점재보기.js */
const fs=require('fs'), path=require('path');
const 글=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const 시작=글.indexOf('/* ---------- 유사도 ----------');
const 끝=글.indexOf('function buildDiff');
const 조각=글.slice(시작,끝);
const similarity=new Function(조각+'\nreturn similarity;')();

const 목표='こんにちは！ぼくたちは バンドぶです。';
const 경우=[
  ['그대로 정확히', 'こんにちは！ぼくたちは バンドぶです。'],
  ['조사 하나 빠짐', 'こんにちは ぼくたち バンドぶです'],
  ['끝을 흐림', 'こんにちは ぼくたちは バンドぶ'],
  ['한 글자 틀림', 'こんにちは ぼくたちは バンドふです'],
  ['앞부분만 들림', 'こんにちは ぼくたちは'],
  ['띄어 읽어 인식이 끊김', 'こんにちは ぼく たちは バンド ぶです'],
  ['비슷하게 잘못 받아적힘', 'こんにちわ ぼくたちわ バンドブです'],
  ['절반쯤', 'こんにちは バンドです'],
  ['전혀 다른 말', 'ありがとうございます'],
];
console.log('목표: ' + 목표 + '\n');
console.log('  점수  통과(80)  통과(70)  상황');
for(const [이름,들린] of 경우){
  const s=similarity(목표,들린);
  console.log('  ' + String(s).padStart(3) + '점    ' + (s>=80?'  ○ ':'  ✗ ') + '     ' + (s>=70?'  ○ ':'  ✗ ') + '    ' + 이름);
}

/* 느슨하게 만들되 아무 말이나 통과하면 안 됩니다 */
let 통과=0,실패=0;
function 확인(n,ok){ ok?(통과++,console.log('  ok   '+n)):(실패++,console.log('  FAIL '+n)); }
console.log('\n선 지키기');
확인('정확히 읽으면 만점', similarity(목표,목표)===100);
확인('전혀 다른 말은 70을 못 넘는다', similarity(목표,'ありがとうございます')<70);
확인('첫 마디만 말하면 70을 못 넘는다', similarity(목표,'こんにちは')<70);
확인('침묵은 0점', similarity(목표,'')===0);
확인('부분만 인식돼도 70은 넘는다', similarity(목표,'こんにちは ぼくたちは')>=70);
확인('탁점 실수는 봐준다', similarity(목표,'こんにちは ぼくたちは バンドふです')>=70);
console.log('\n통과 '+통과+' / 실패 '+실패);
process.exit(실패?1:0);
