/* ============================================================
   와사비 — 문장을 자연스러운 일본어 음성으로 읽어 주는 코드
   (구글 클라우드 Text-to-Speech 사용)

   ■ 왜 필요한가
     학생이 직접 입력한 문장은 미리 녹음해 둘 수 없습니다.
     이 코드가 있으면 어떤 문장이든 그 자리에서 음성으로 만들어 줍니다.

   ■ 한 번 만든 소리는 다시 만들지 않습니다
     같은 문장이 또 오면 저장해 둔 것을 그대로 돌려줍니다.
     그래서 학생 서른 명이 같은 문장을 눌러도 요금은 한 번만 듭니다.

   ■ 쓰기 전에 선생님이 하실 일 (딱 두 가지)
     1) 구글 클라우드에서 Text-to-Speech API 를 켜고 API 키를 하나 만듭니다.
        · 결제 계정이 붙어 있어야 API 가 켜집니다.
        · 월 100만 자까지 무료입니다. 이 앱 규모면 실제 청구는 사실상 0원입니다.
     2) Apps Script → 프로젝트 설정 → 스크립트 속성에
        이름 TTS키  /  값 (방금 만든 키)  로 저장합니다.
        ※ 키는 코드에 적지 마세요. 코드는 깃허브에 올라가고, 앱 주소는 공개입니다.

   ■ 붙여넣은 뒤
     배포 → 배포 관리 → (연필) → 버전 '새 버전' → 배포   (주소는 그대로)
   ============================================================ */

var 목소리 = 'ja-JP-Neural2-B';   // 여성. 남성으로 바꾸려면 ja-JP-Neural2-C
var 말속도 = 0.9;                 // 1.0 이 보통. 학생용이라 조금 느리게
var 글자수한계 = 80;              // 이보다 긴 문장은 만들지 않습니다 (요금·악용 방지)
var 하루한계 = 3000;              // 하루에 새로 만들 수 있는 문장 수
var 소리보관함 = '와사비 소리';   // 만든 소리를 넣어 둘 구글 드라이브 폴더


/** 앱이 '이 문장 읽어 줘' 하고 부를 때 쓰는 갈래.
 *  기존 doGet 안에서 아래 한 줄로 이어 주세요.
 *    if (무엇 === 'speak') return jsonOut_(소리만들기(e.parameter.글));
 */
function 소리만들기(글) {
  var ㄱ = String(글 || '').trim();
  if (!ㄱ) return { ok: false, 까닭: '문장이 비었습니다' };
  if (ㄱ.length > 글자수한계) return { ok: false, 까닭: '문장이 너무 깁니다' };

  var 열쇠 = 이름표_(ㄱ);

  // 1) 짧은 기억(캐시)에 있나
  var 기억 = CacheService.getScriptCache().get(열쇠);
  if (기억) return { ok: true, 소리: 기억, 어디서: '기억' };

  // 2) 드라이브에 저장해 둔 게 있나
  var 담긴것 = 드라이브에서찾기_(열쇠);
  if (담긴것) {
    담아두기_(열쇠, 담긴것);
    return { ok: true, 소리: 담긴것, 어디서: '드라이브' };
  }

  // 3) 없으면 새로 만듭니다
  if (!하루치남았나_()) return { ok: false, 까닭: '오늘 만들 수 있는 양을 다 썼습니다' };

  var 키 = PropertiesService.getScriptProperties().getProperty('TTS키');
  if (!키) return { ok: false, 까닭: 'TTS키가 설정되지 않았습니다' };

  var 답 = UrlFetchApp.fetch(
    'https://texttospeech.googleapis.com/v1/text:synthesize?key=' + encodeURIComponent(키), {
      method: 'post',
      contentType: 'application/json',
      muteHttpExceptions: true,
      payload: JSON.stringify({
        input: { text: ㄱ },
        voice: { languageCode: 'ja-JP', name: 목소리 },
        audioConfig: { audioEncoding: 'MP3', speakingRate: 말속도 }
      })
    });

  if (답.getResponseCode() !== 200) {
    // 키 값이 새어 나가지 않도록 응답 본문은 기록하지 않습니다
    console.error('TTS 실패 코드 ' + 답.getResponseCode());
    return { ok: false, 까닭: '음성을 만들지 못했습니다' };
  }

  var 내용 = JSON.parse(답.getContentText()).audioContent;
  if (!내용) return { ok: false, 까닭: '음성이 비어 있습니다' };

  var 주소 = 'data:audio/mpeg;base64,' + 내용;
  드라이브에담기_(열쇠, 내용);
  담아두기_(열쇠, 주소);
  하루치쓰기_();
  return { ok: true, 소리: 주소, 어디서: '새로' };
}


/** 문장을 짧은 이름표로 바꿉니다. 같은 문장이면 늘 같은 이름표가 나옵니다. */
function 이름표_(글) {
  var 바이트 = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 글, Utilities.Charset.UTF_8);
  var 글자 = '';
  for (var i = 0; i < 12; i++) {
    var v = (바이트[i] + 256) % 256;
    글자 += (v < 16 ? '0' : '') + v.toString(16);
  }
  return 목소리 + '_' + 글자;
}


function 담아두기_(열쇠, 주소) {
  // 캐시는 한 칸에 100KB 까지라, 큰 것은 드라이브에만 둡니다
  if (주소.length < 95000) {
    try { CacheService.getScriptCache().put(열쇠, 주소, 21600); } catch (e) {}
  }
}


function 보관함_() {
  var 찾음 = DriveApp.getFoldersByName(소리보관함);
  return 찾음.hasNext() ? 찾음.next() : DriveApp.createFolder(소리보관함);
}


function 드라이브에서찾기_(열쇠) {
  var 파일들 = 보관함_().getFilesByName(열쇠 + '.mp3');
  if (!파일들.hasNext()) return '';
  var 자료 = 파일들.next().getBlob().getBytes();
  return 'data:audio/mpeg;base64,' + Utilities.base64Encode(자료);
}


function 드라이브에담기_(열쇠, 내용) {
  try {
    var 덩이 = Utilities.newBlob(Utilities.base64Decode(내용), 'audio/mpeg', 열쇠 + '.mp3');
    보관함_().createFile(덩이);
  } catch (e) {
    console.error('드라이브 저장 실패');   // 저장은 실패해도 소리는 나갑니다
  }
}


/** 하루에 새로 만드는 양을 제한합니다. 주소가 공개라 필요한 안전장치입니다. */
function 오늘_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
}
function 하루치남았나_() {
  var 속성 = PropertiesService.getScriptProperties();
  if (속성.getProperty('소리센날') !== 오늘_()) return true;
  return Number(속성.getProperty('소리센수') || 0) < 하루한계;
}
function 하루치쓰기_() {
  var 속성 = PropertiesService.getScriptProperties();
  if (속성.getProperty('소리센날') !== 오늘_()) {
    속성.setProperty('소리센날', 오늘_());
    속성.setProperty('소리센수', '1');
  } else {
    속성.setProperty('소리센수', String(Number(속성.getProperty('소리센수') || 0) + 1));
  }
}


/** 설정이 제대로 됐는지 여기서 한 번 눌러 확인하세요. (키 값은 찍히지 않습니다) */
function 소리시험() {
  var 결과 = 소리만들기('こんにちは。');
  Logger.log(결과.ok ? ('성공 — ' + 결과.어디서 + ', 길이 ' + 결과.소리.length) : ('실패 — ' + 결과.까닭));
}
