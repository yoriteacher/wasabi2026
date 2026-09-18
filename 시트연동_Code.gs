/* ============================================================
   와사비 — 연습 문장을 구글 시트에서 받아가게 하는 코드

   ■ 이 파일을 통째로 붙여넣지 마세요.
     아래 doGet 함수 하나만 기존 Apps Script 맨 아래에 덧붙이면 됩니다.
     기존 doPost(결과 저장)는 그대로 두세요.

   ■ 이미 doGet 이 있다면?
     두 개가 있으면 안 됩니다. 기존 doGet 안에 아래 내용을 합쳐 주세요.

   ■ 붙여넣은 뒤
     배포 → 배포 관리 → (연필 아이콘) → 버전을 '새 버전'으로 → 배포
     ※ 주소는 그대로 유지됩니다. 새 배포를 만들면 주소가 바뀌니 주의하세요.
   ============================================================ */

var 문장시트이름 = '문제은행';


/** 처음 한 번 실행하면 '문제은행' 탭을 만들고 지금 문장을 채워 넣습니다. */
function 문제은행만들기() {
  var 문서 = SpreadsheetApp.getActiveSpreadsheet();
  var 시트 = 문서.getSheetByName(문장시트이름);
  if (시트) {
    문서.toast("'" + 문장시트이름 + "' 탭이 이미 있습니다.");
    return;
  }

  시트 = 문서.insertSheet(문장시트이름);
  시트.appendRow(['일본어', '로마자', '한국어 뜻']);

  // 지금 앱에 들어 있는 문장을 그대로 옮겨 둡니다. 여기부터 마음껏 고치세요.
  시트.appendRow(['こんにちは！わたしは つつじちゃんです。', 'Konnichiwa! Watashi wa Tsutsuji-chan desu.', '안녕하세요! 저는 철쭉이예요.']);
  시트.appendRow(['わたしの おすすめは つつじもちです。', 'Watashi no osusume wa tsutsuji-mochi desu.', '제가 추천하는 건 철쭉떡이에요.']);
  시트.appendRow(['そして つつじの ライトアップも おすすめです。', 'Soshite tsutsuji no raito-appu mo osusume desu.', '그리고 철쭉 라이트업(야간 조명)도 추천해요.']);
  시트.appendRow(['なぜなら よるの つつじは とても きれいだからです。', 'Nazenara yoru no tsutsuji wa totemo kirei dakara desu.', '왜냐하면 밤의 철쭉은 아주 예쁘거든요.']);
  시트.appendRow(['みなさん、クンポに いっしょに いきましょう！', 'Minasan, Kunpo ni issho ni ikimashou!', '여러분, 군포에 함께 가요!']);

  시트.setFrozenRows(1);
  시트.getRange('A1:C1').setFontWeight('bold');
  시트.setColumnWidth(1, 320);
  시트.setColumnWidth(2, 320);
  시트.setColumnWidth(3, 280);

  문서.toast("'" + 문장시트이름 + "' 탭을 만들었습니다. 이제 여기만 고치면 앱 문장이 바뀝니다.");
}


/** 앱이 문장을 달라고 할 때 불립니다. (주소 뒤에 ?action=sentences) */
function doGet(e) {
  var 무엇 = (e && e.parameter && e.parameter.action) || '';

  if (무엇 === 'sentences') {
    return 답으로보내기(문장목록읽기());
  }

  // 그 밖의 요청에는 살아 있다는 표시만 돌려줍니다.
  return 답으로보내기({ ok: true });
}


/** '문제은행' 탭을 읽어 앱이 쓰는 모양으로 바꿔 줍니다. */
function 문장목록읽기() {
  var 시트 = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(문장시트이름);
  if (!시트) return [];           // 탭이 없으면 빈 목록 → 앱은 기본값을 씁니다

  var 값 = 시트.getDataRange().getValues();
  var 목록 = [];

  for (var i = 1; i < 값.length; i++) {   // 0번째 줄은 제목이라 건너뜁니다
    var 일본어 = String(값[i][0] || '').trim();
    if (!일본어) continue;                // 빈 줄은 무시

    목록.push({
      jp: 일본어,
      romaji: String(값[i][1] || '').trim(),
      kor: String(값[i][2] || '').trim()
    });
  }
  return 목록;
}


/** JSON 으로 내보냅니다. */
function 답으로보내기(자료) {
  return ContentService
    .createTextOutput(JSON.stringify(자료))
    .setMimeType(ContentService.MimeType.JSON);
}
