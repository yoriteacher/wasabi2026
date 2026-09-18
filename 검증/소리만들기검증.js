/* 소리만들기_Code.gs 를 가짜 앱스스크립트 위에서 실제로 돌려 봅니다.
   실행:  node 검증/소리만들기검증.js      (진짜 구글 서버는 부르지 않습니다) */
const fs = require('fs'), vm = require('vm'), path = require('path'), crypto = require('crypto');
const 코드 = fs.readFileSync(path.join(__dirname, '..', '소리만들기_Code.gs'), 'utf8');

let 통과 = 0, 실패 = 0;
function 확인(이름, 참) { 참 ? (통과++, console.log('  ok   ' + 이름)) : (실패++, console.log('  FAIL ' + 이름)); }

/* ---- 가짜 앱스스크립트 ---- */
function 판만들기(설정) {
  const 속성 = Object.assign({}, 설정.속성 || {});
  const 캐시 = {};
  const 드라이브 = {};          // 파일이름 → 바이트
  const 부른것 = [];
  const 판 = {
    console: { error() {}, log() {} },
    Logger: { log() {} },
    Session: { getScriptTimeZone: () => 'Asia/Seoul' },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: k => (k in 속성 ? 속성[k] : null),
      setProperty: (k, v) => { 속성[k] = String(v); }
    })},
    CacheService: { getScriptCache: () => ({
      get: k => (k in 캐시 ? 캐시[k] : null),
      put: (k, v) => { 캐시[k] = v; }
    })},
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' },
      Charset: { UTF_8: 'utf8' },
      computeDigest: (a, 글) => Array.from(crypto.createHash('sha256').update(글, 'utf8').digest()).map(b => b > 127 ? b - 256 : b),
      base64Encode: b => Buffer.from(b).toString('base64'),
      base64Decode: s => Array.from(Buffer.from(s, 'base64')),
      newBlob: (b, t, 이름) => ({ 이름, b, getBytes: () => b }),
      formatDate: () => 설정.날짜 || '20260918'
    },
    DriveApp: {
      getFoldersByName: () => ({ hasNext: () => true, next: () => 폴더 }),
      createFolder: () => 폴더
    },
    UrlFetchApp: { fetch: (주소, 옵션) => {
      부른것.push({ 주소, 옵션 });
      if (설정.서버실패) return { getResponseCode: () => 400, getContentText: () => '{"error":{"message":"bad key"}}' };
      return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ audioContent: Buffer.from('가짜음성').toString('base64') }) };
    }}
  };
  const 폴더 = {
    getFilesByName: 이름 => {
      const 있 = 이름 in 드라이브;
      let 썼나 = false;
      return { hasNext: () => 있 && !썼나, next: () => { 썼나 = true; return { getBlob: () => ({ getBytes: () => 드라이브[이름] }) }; } };
    },
    createFile: 덩이 => { 드라이브[덩이.이름] = 덩이.getBytes(); }
  };
  판.판속 = { 속성, 캐시, 드라이브, 부른것 };
  vm.createContext(판);
  vm.runInContext(코드, 판);
  return 판;
}

console.log('설정 확인');
let 판 = 판만들기({ 속성: {} });
확인('TTS키가 없으면 만들지 않고 알려 준다', 판.소리만들기('こんにちは').까닭 === 'TTS키가 설정되지 않았습니다');
확인('키가 없을 때 구글 서버를 부르지 않는다', 판.판속.부른것.length === 0);

console.log('\n문장 거르기');
판 = 판만들기({ 속성: { TTS키: 'x' } });
확인('빈 문장은 거른다', 판.소리만들기('').ok === false && 판.판속.부른것.length === 0);
확인('공백뿐인 문장도 거른다', 판.소리만들기('   ').ok === false);
확인('너무 긴 문장은 거른다', 판.소리만들기('あ'.repeat(81)).까닭 === '문장이 너무 깁니다');
확인('한계까지는 받는다', 판.소리만들기('あ'.repeat(80)).ok === true);

console.log('\n음성 만들기');
판 = 판만들기({ 속성: { TTS키: 'KEY123' } });
let ㄱ = 판.소리만들기('こんにちは。');
확인('음성을 만든다', ㄱ.ok === true && ㄱ.어디서 === '새로');
확인('앱이 바로 재생할 수 있는 모양이다', ㄱ.소리.startsWith('data:audio/mpeg;base64,'));
확인('일본어 음성을 지정해 부른다', /ja-JP/.test(판.판속.부른것[0].옵션.payload));
확인('mp3 로 받아 온다', /MP3/.test(판.판속.부른것[0].옵션.payload));
확인('키를 본문이 아니라 주소로 보낸다', 판.판속.부른것[0].주소.includes('KEY123') && !판.판속.부른것[0].옵션.payload.includes('KEY123'));

console.log('\n같은 문장은 다시 만들지 않는다  ← 요금이 걸린 부분');
let ㄴ = 판.소리만들기('こんにちは。');
확인('두 번째는 기억에서 꺼낸다', ㄴ.어디서 === '기억');
확인('구글 서버를 다시 부르지 않았다', 판.판속.부른것.length === 1);
확인('같은 소리가 나온다', ㄴ.소리 === ㄱ.소리);
판.판속.캐시[Object.keys(판.판속.캐시)[0]] = undefined;
delete 판.판속.캐시[Object.keys(판.판속.캐시)[0]];
let ㄷ = 판.소리만들기('こんにちは。');
확인('기억이 지워져도 드라이브에서 꺼낸다', ㄷ.어디서 === '드라이브' && ㄷ.소리 === ㄱ.소리);
확인('그때도 구글 서버를 부르지 않았다', 판.판속.부른것.length === 1);
확인('다른 문장은 새로 만든다', 판.소리만들기('さようなら。').어디서 === '새로' && 판.판속.부른것.length === 2);

console.log('\n하루 한도');
판 = 판만들기({ 속성: { TTS키: 'x', 소리센날: '20260918', 소리센수: '3000' } });
확인('한도를 넘으면 만들지 않는다', 판.소리만들기('あたらしい').까닭 === '오늘 만들 수 있는 양을 다 썼습니다');
확인('한도를 넘으면 구글 서버도 안 부른다', 판.판속.부른것.length === 0);
판 = 판만들기({ 속성: { TTS키: 'x', 소리센날: '20260101', 소리센수: '3000' } });
확인('날이 바뀌면 다시 만든다', 판.소리만들기('あたらしい').ok === true);
확인('셈이 오늘 것으로 새로 시작된다', 판.판속.속성.소리센수 === '1');

console.log('\n실패했을 때');
판 = 판만들기({ 속성: { TTS키: 'x' }, 서버실패: true });
ㄱ = 판.소리만들기('こんにちは');
확인('구글이 거절하면 실패로 알려 준다', ㄱ.ok === false);
확인('실패 까닭에 키나 서버 응답을 담지 않는다', !/key|error|bad/i.test(ㄱ.까닭));

console.log('\n키가 코드에 적혀 있지 않은지');
확인('코드 안에 키 값이 없다', /getProperty\('TTS키'\)/.test(코드) && !/AIza/.test(코드));

console.log('\n통과 ' + 통과 + ' / 실패 ' + 실패);
process.exit(실패 ? 1 : 0);
