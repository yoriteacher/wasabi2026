/* 소리 파일 연결이 제대로 되는지 확인합니다.  실행:  node 검증/소리검증.js  */
const fs = require('fs');
const path = require('path');
const 뿌리 = path.join(__dirname, '..');
const 글 = fs.readFileSync(path.join(뿌리, 'index.html'), 'utf8');

let 통과 = 0, 실패 = 0;
function 확인(이름, 참) { 참 ? (통과++, console.log('  ok   ' + 이름)) : (실패++, console.log('  FAIL ' + 이름)); }

/* index.html 안의 소리주소() 를 그대로 꺼내 실제로 돌려 봅니다. */
const 조각 = 글.match(/const 소리폴더 = [\s\S]*?\n}\n/);
확인('소리주소() 함수가 있다', !!조각);
const 소리주소 = new Function(조각[0] + '\nreturn 소리주소;')();

확인('파일 이름만 적으면 소리 폴더를 붙인다', 소리주소('1.mp3') === '소리/1.mp3');
확인('http 주소는 그대로 쓴다', 소리주소('https://a.b/c.mp3') === 'https://a.b/c.mp3');
확인('경로가 들어 있으면 그대로 쓴다', 소리주소('other/2.mp3') === 'other/2.mp3');
확인('비어 있으면 빈 값 (→ 기계 음성)', 소리주소('') === '' && 소리주소(null) === '' && 소리주소(undefined) === '');
확인('앞뒤 공백을 지운다', 소리주소('  3.mp3  ') === '소리/3.mp3');

/* 기본 문장 5개에 소리 파일이 지정되어 있어야, 시트가 안 열려도 소리가 납니다. */
const 기본 = 글.slice(글.indexOf('let PHRASES = ['), 글.indexOf('];', 글.indexOf('let PHRASES = [')));
const 지정 = 기본.match(/소리:"([^"]+)"/g) || [];
확인('기본 문장에는 녹음 파일을 걸어 두지 않았다 (서버가 만들어 줌)', 지정.length === 0);

/* 실제 파일이 있는지 (없으면 기계 음성으로 내려가니 오류는 아니고 안내만) */
const 소리칸 = path.join(뿌리, '소리');
const 있는파일 = fs.existsSync(소리칸) ? fs.readdirSync(소리칸).filter(f => /\.(mp3|m4a|wav|ogg)$/i.test(f)) : [];
확인('소리 폴더가 있다', fs.existsSync(소리칸));

/* 소리가 안 나면 다음 길로 내려가야 합니다: 녹음 파일 → 서버 → 기계 음성 */
확인('재생 실패를 붙잡아 거짓으로 돌려준다', /onerror = \(\) => \{[^}]*맺음\(false\)/.test(글) && /play\(\)\.then[\s\S]{0,60}catch[\s\S]{0,40}맺음\(false\)/.test(글));
확인('녹음 파일이 안 되면 서버로 넘어간다', /if\(파일 && await 틀기\(파일, 글\)\) return;/.test(글));
확인('서버도 안 되면 기계 음성으로 읽는다', /if\(주소 && await 틀기\(주소, 글\)\) return;[\s\S]{0,120}기계음성으로\(글\);/.test(글));
확인('직접 입력한 문장은 서버 길로 간다', /const 칸 = customMode \? null : PHRASES\[current\];/.test(글));

/* 서버 부탁이 앱을 멈춰 세우지 않아야 합니다 */
확인('서버가 늦으면 끊는다', /AbortController/.test(글) && /setTimeout\(\(\) => 끊개\.abort\(\), \d+\)/.test(글));
확인('서버 오류를 붙잡는다', /catch\(e\)\{\s*return '';/.test(글));
확인('서버 답의 모양을 확인하고 쓴다', /ㄱ\.ok !== true \|\| typeof ㄱ\.소리 !== 'string'/.test(글));
확인('같은 문장은 서버에 다시 묻지 않는다', /받아둔소리\.has\(글\)/.test(글) && /받아둔소리\.set\(글, ㄱ\.소리\)/.test(글));
확인('준비하는 동안 단추를 잠근다', /듣기단추\.disabled = true/.test(글) && /듣기단추\.disabled = false/.test(글));
확인('단추 모양을 되돌려 놓는다', /듣기단추\.innerHTML = 본디/.test(글));

/* 시트에서 온 소리 칸이 PHRASES 까지 전달되는지 */
확인('시트의 소리 칸을 앱이 받아 쓴다', /소리:\s*String\(x\.소리/.test(글));
const 지에스 = fs.readFileSync(path.join(뿌리, '시트연동_Code.gs'), 'utf8');
확인('시트 코드가 소리 칸을 찾는다', /소리칸 = 칸찾기_/.test(지에스));
확인('시트 코드가 소리를 내보낸다', /소리:\s*\(소리칸 >= 0\)/.test(지에스));

console.log('\n통과 ' + 통과 + ' / 실패 ' + 실패);
if (false) {
  console.log('\n[안내] 소리 폴더에 든 음성 파일: ' + 있는파일.length + '개');
  console.log('       5개를 다 채우기 전까지, 빠진 문장은 기계 음성으로 읽습니다.');
}
process.exit(실패 ? 1 : 0);
