/* ============================================================
   와사비 — 연습 문장을 구글 시트에서 받아가게 하는 코드

   ■ 이 파일을 통째로 붙여넣지 마세요.
     기존 Apps Script 맨 아래에 아래 함수들만 덧붙이면 됩니다.
     기존 doPost(결과 저장)는 그대로 두세요.

   ■ 이미 doGet 이 있다면?
     두 개가 있으면 안 됩니다. 기존 doGet 안에 sentences 갈래만 합쳐 주세요.

   ■ 붙여넣은 뒤
     배포 → 배포 관리 → (연필 아이콘) → 버전을 '새 버전'으로 → 배포
     ※ 주소는 그대로 유지됩니다. 새 배포를 만들면 주소가 바뀌니 주의하세요.

   ■ '문제은행' 탭의 칸 순서
     제목 줄을 보고 칸을 찾습니다. 그래서 칸 순서가 달라도,
     쓰지 않는 칸(로마자 같은 것)이 끼어 있어도 그대로 동작합니다.
       · 일본어 → 제목에 '일본' 이 들어간 칸 (없으면 첫 칸)
       · 한국어 뜻 → 제목에 '뜻' 이나 '한국' 이 들어간 칸
       · 소리 → 제목에 '소리'·'녹음'·'음성'·'mp3' 가 들어간 칸 (없어도 됩니다)

   ■ 소리 칸
     녹음 파일을 적어 두면 기계 음성 대신 그 파일을 들려줍니다.
     비워 두면 지금처럼 기계 음성으로 읽습니다. 한 줄만 채워도 되고,
     파일이 없거나 안 열리면 앱이 알아서 기계 음성으로 내려갑니다.
   ============================================================ */

var 문장시트이름 = '문제은행';


/** 브라우저(앱)가 GET 으로 부를 때 */
function doGet(e) {
  var 무엇 = (e && e.parameter && e.parameter.action) || '';

  // 앱이 연습 문장 목록을 달라고 할 때  (…/exec?action=sentences)
  if (무엇 === 'sentences') return jsonOut_(문장목록읽기());

  // 앱이 이 문장을 읽어 달라고 할 때  (…/exec?action=speak&글=…)
  // 소리만들기_Code.gs 가 함께 있어야 동작합니다.
  if (무엇 === 'speak') return jsonOut_(소리만들기(e.parameter['글']));

  // 그 밖에는 서버가 살아있는지 확인하는 용도
  return jsonOut_({ result: 'ok', message: '와사비 발음 기록 서버 작동 중' });
}


/** '문제은행' 탭을 읽어 앱이 쓰는 모양으로 바꿔 줍니다. */
function 문장목록읽기() {
  var 시트 = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(문장시트이름);
  if (!시트) return [];           // 탭이 없으면 빈 목록 → 앱은 코드 안의 기본 문장을 씁니다

  var 값 = 시트.getDataRange().getValues();
  if (값.length < 2) return [];

  var 제목 = 값[0].map(function (c) { return String(c || '').trim(); });
  var 일본어칸 = 칸찾기_(제목, ['일본'], 0);
  var 뜻칸 = 칸찾기_(제목, ['뜻', '한국'], -1);
  var 소리칸 = 칸찾기_(제목, ['소리', '녹음', '음성', 'mp3'], -1);
  if (뜻칸 === -1) 뜻칸 = (소리칸 === 제목.length - 1) ? 제목.length - 2 : 제목.length - 1;

  var 목록 = [];
  for (var i = 1; i < 값.length; i++) {   // 0번째 줄은 제목이라 건너뜁니다
    var 일본어 = String(값[i][일본어칸] || '').trim();
    if (!일본어) continue;                // 빈 줄은 무시
    목록.push({
      jp: 일본어,
      kor: (뜻칸 >= 0) ? String(값[i][뜻칸] || '').trim() : '',
      // 녹음 파일 (있으면 기계 음성 대신 이것을 들려줍니다)
      소리: (소리칸 >= 0) ? String(값[i][소리칸] || '').trim() : ''
    });
  }
  return 목록;
}


/** 제목 줄에서 원하는 칸의 번호를 찾습니다. 못 찾으면 기본값. */
function 칸찾기_(제목, 열쇠말들, 기본) {
  for (var i = 0; i < 제목.length; i++) {
    for (var k = 0; k < 열쇠말들.length; k++) {
      if (제목[i].indexOf(열쇠말들[k]) !== -1) return i;
    }
  }
  return 기본;
}


/** 처음 한 번만 실행하면 '문제은행' 탭을 만들고 지금 문장을 채워 넣습니다. */
function 문제은행만들기() {
  var 문서 = SpreadsheetApp.getActiveSpreadsheet();
  var 시트 = 문서.getSheetByName(문장시트이름);
  if (시트) { 문서.toast("'" + 문장시트이름 + "' 탭이 이미 있습니다."); return; }

  시트 = 문서.insertSheet(문장시트이름);
  시트.appendRow(['일본어', '한국어 뜻', '소리']);

  // 지금 앱에 들어 있는 문장을 그대로 옮겨 둡니다. 여기부터 마음껏 고치세요.
  시트.appendRow(['こんにちは！ぼくたちは バンドぶです。', '안녕하세요! 저희는 밴드부입니다.']);
  시트.appendRow(['れんしゅうは かようびと きんようびです。', '연습은 화요일과 금요일입니다.']);
  시트.appendRow(['じかんは よじから ろくじまでです。', '시간은 4시부터 6시까지입니다.']);
  시트.appendRow(['ばしょは おんがくしつです。', '장소는 음악실입니다.']);
  시트.appendRow(['みなさん、バンドぶへ ぜひ どうぞ！', '여러분, 밴드부로 꼭 오세요!']);

  시트.setFrozenRows(1);
  시트.getRange('A1:C1').setFontWeight('bold');
  시트.setColumnWidth(1, 360);
  시트.setColumnWidth(2, 300);
  시트.setColumnWidth(3, 220);
  시트.getRange('C2').setNote(
    '녹음 파일 이름이나 주소를 적으면 기계 음성 대신 그것을 들려줍니다. ' +
    '비워 두면 지금처럼 기계 음성으로 읽습니다. ' +
    '예) 1.mp3   또는   https://…/소리/1.mp3');
  문서.toast("'" + 문장시트이름 + "' 탭을 만들었습니다. 이제 여기만 고치면 앱 문장이 바뀝니다.");
}


/** JSON 으로 내보냅니다. (기존 코드에 이미 있으면 다시 넣지 마세요) */
function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
