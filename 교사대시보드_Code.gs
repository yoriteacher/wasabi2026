/* ============================================================
   와사비 — 교사용 대시보드 (선생님만 봅니다)

   ■ 무엇을 보나
     학생 한 명 한 명이 얼마나 늘었는지를 봅니다.
     처음 점수 → 최근 점수, 최고 점수, 점수가 지나온 자취(작은 그래프).

   ■ 붙이는 법
     1) 이 파일의 함수들을 기존 Apps Script 맨 아래에 덧붙입니다.
        (기존 doGet 은 아래 것으로 바꿉니다. sentences 갈래가 들어 있습니다)
     2) 파일 + → HTML → 이름을 '교사' 로 만들고 교사.html 내용을 붙여넣습니다.
     3) 비밀번호를 정합니다 — 코드에 적지 않습니다:
          프로젝트 설정(⚙) → 스크립트 속성 → 속성 추가
          속성 이름: 교사비밀번호      값: 선생님만 아는 번호
     4) 배포 → 배포 관리 → (연필) → 새 버전 → 배포   (주소 그대로)

   ■ 여는 주소
     기존 /exec 주소 뒤에 ?화면=교사 를 붙입니다.

   ■ 왜 비밀번호를 코드에 안 적나
     이 웹 앱은 '링크가 있는 모든 사용자'로 열려 있어야 학생 앱이 돌아갑니다.
     즉 주소를 아는 사람은 누구나 doGet 을 부를 수 있습니다. 그래서
     학생 자료는 비밀번호가 맞을 때만 서버에서 내보냅니다. 코드에 적으면
     소스에 남으므로 스크립트 속성에만 둡니다.
   ============================================================ */

var 대시보드시트 = SHEET_NAME;   // '발음기록'


/** 브라우저가 GET 으로 부를 때 */
function doGet(e) {
  var 무엇 = (e && e.parameter && e.parameter.action) || '';
  var 화면 = (e && e.parameter && e.parameter.화면) || '';

  // 선생님 대시보드
  if (화면 === '교사' || 무엇 === 'teacher') {
    return HtmlService.createHtmlOutputFromFile('교사')
      .setTitle('와사비 — 선생님 화면')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  }

  // 앱이 연습 문장 목록을 달라고 할 때
  if (무엇 === 'sentences') return jsonOut_(문장목록읽기());

  return jsonOut_({ result: 'ok', message: '와사비 발음 기록 서버 작동 중' });
}


/** 화면에서 비밀번호와 함께 부릅니다. 맞을 때만 자료를 돌려줍니다. */
function 대시보드자료(비밀번호) {
  if (!비밀번호확인_(비밀번호)) {
    return { ok: false, 까닭: '비밀번호가 맞지 않습니다.' };
  }
  return { ok: true, 자료: 학생별성장() };
}


/** 비밀번호 검사. 여러 번 틀리면 잠깐 막습니다. */
function 비밀번호확인_(입력) {
  var 정답 = PropertiesService.getScriptProperties().getProperty('교사비밀번호');
  if (!정답) throw new Error(
    '아직 비밀번호가 설정되지 않았습니다. 프로젝트 설정 → 스크립트 속성에서 ' +
    '교사비밀번호 를 추가해 주세요.');

  var 창고 = CacheService.getScriptCache();
  var 틀린횟수 = Number(창고.get('교사_틀린횟수') || 0);
  if (틀린횟수 >= 8) throw new Error('여러 번 틀렸습니다. 10분 뒤에 다시 해 주세요.');

  var 맞나 = 같은글자_(String(입력 || ''), String(정답));
  if (!맞나) {
    창고.put('교사_틀린횟수', String(틀린횟수 + 1), 600);
    Utilities.sleep(700);          // 기계로 빠르게 찔러 보는 것을 늦춥니다
    return false;
  }
  창고.remove('교사_틀린횟수');
  return true;
}


/** 글자 수로 빠르기가 달라지지 않게 끝까지 비교합니다. */
function 같은글자_(가, 나) {
  if (가.length !== 나.length) return false;
  var 다름 = 0;
  for (var i = 0; i < 가.length; i++) {
    다름 |= 가.charCodeAt(i) ^ 나.charCodeAt(i);
  }
  return 다름 === 0;
}


/** 제목 줄에서 원하는 칸을 찾습니다. 칸 순서가 바뀌어도 버팁니다. */
function 대시보드칸찾기_(제목, 열쇠말들, 기본) {
  for (var i = 0; i < 제목.length; i++) {
    for (var k = 0; k < 열쇠말들.length; k++) {
      if (제목[i].indexOf(열쇠말들[k]) !== -1) return i;
    }
  }
  return 기본;
}


/** 발음기록을 학생별로 묶어 '얼마나 늘었는지'를 계산합니다. */
function 학생별성장() {
  var 시트 = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(대시보드시트);
  if (!시트) return { 학생들: [], 문장들: [], 전체: 비어있는요약_() };

  var 값 = 시트.getDataRange().getValues();
  if (값.length < 2) return { 학생들: [], 문장들: [], 전체: 비어있는요약_() };

  var 제목 = 값[0].map(function (c) { return String(c || '').trim(); });
  var ㄱ = {
    때:   대시보드칸찾기_(제목, ['기록시각', '시각', '일시'], 0),
    학번: 대시보드칸찾기_(제목, ['학번'], 1),
    이름: 대시보드칸찾기_(제목, ['이름'], 2),
    문장: 대시보드칸찾기_(제목, ['연습문장', '문장'], 3),
    점수: 대시보드칸찾기_(제목, ['점수'], 5),
    통과: 대시보드칸찾기_(제목, ['통과여부'], 6)
  };

  var 통과기준칸 = 대시보드칸찾기_(제목, ['통과기준'], -1);
  var 통과기준 = 80;
  if (통과기준칸 >= 0) {
    for (var ㅂ = 1; ㅂ < 값.length; ㅂ++) {
      var ㄱㅈ = Number(값[ㅂ][통과기준칸]);
      if (isFinite(ㄱㅈ) && ㄱㅈ > 0) { 통과기준 = ㄱㅈ; break; }
    }
  }

  var 사람 = {};     // 학번+이름 → 기록 모음
  var 문장 = {};     // 문장 → 점수 모음

  for (var i = 1; i < 값.length; i++) {
    var 줄 = 값[i];
    var 학번 = String(줄[ㄱ.학번] || '').trim();
    var 이름 = String(줄[ㄱ.이름] || '').trim();
    if (!학번 && !이름) continue;               // 시험용 빈 줄은 건너뜁니다

    var 점수 = Number(줄[ㄱ.점수]);
    if (!isFinite(점수)) continue;

    var 열쇠 = 학번 + '·' + 이름;
    if (!사람[열쇠]) 사람[열쇠] = { 학번: 학번, 이름: 이름, 기록: [] };
    사람[열쇠].기록.push({
      때: 때를숫자로_(줄[ㄱ.때]),
      때글: 때를글자로_(줄[ㄱ.때]),
      점수: 점수,
      문장: String(줄[ㄱ.문장] || '').trim(),
      통과: String(줄[ㄱ.통과] || '').indexOf('미') === -1 &&
            String(줄[ㄱ.통과] || '').indexOf('통과') !== -1
    });

    var ㅁ = String(줄[ㄱ.문장] || '').trim();
    if (ㅁ) {
      if (!문장[ㅁ]) 문장[ㅁ] = [];
      문장[ㅁ].push(점수);
    }
  }

  var 학생들 = [];
  Object.keys(사람).forEach(function (열쇠) {
    var ㅅ = 사람[열쇠];
    ㅅ.기록.sort(function (가, 나) { return 가.때 - 나.때; });   // 시간 순

    var 점수들 = ㅅ.기록.map(function (ㄱ) { return ㄱ.점수; });
    var 처음 = 점수들[0];
    var 최근 = 점수들[점수들.length - 1];

    var 한명 = {
      학번: ㅅ.학번,
      이름: ㅅ.이름,
      시도: 점수들.length,
      처음: 처음,
      최근: 최근,
      성장: 반올림_(최근 - 처음),
      최고: Math.max.apply(null, 점수들),
      평균: 반올림_(점수들.reduce(function (ㄱ, ㄴ) { return ㄱ + ㄴ; }, 0) / 점수들.length),
      통과수: ㅅ.기록.filter(function (ㄱ) { return ㄱ.통과; }).length,
      자취: 점수들.slice(-12),                        // 작은 그래프용
      마지막날: ㅅ.기록[ㅅ.기록.length - 1].때글,
      연습한날수: 날짜수_(ㅅ.기록)
    };
    한명.약한문장 = 약한문장찾기_(ㅅ.기록);
    짚어줄까닭_(한명, 통과기준);
    학생들.push(한명);
  });

  // 많이 는 사람이 아니라, 도움이 필요한 사람이 위로 오게
  학생들.sort(function (가, 나) {
    if (가.최고 !== 나.최고) return 가.최고 - 나.최고;
    return 가.평균 - 나.평균;
  });

  var 문장들 = Object.keys(문장).map(function (ㅁ) {
    var 점수들 = 문장[ㅁ];
    return {
      문장: ㅁ,
      시도: 점수들.length,
      평균: 반올림_(점수들.reduce(function (ㄱ, ㄴ) { return ㄱ + ㄴ; }, 0) / 점수들.length)
    };
  }).sort(function (가, 나) { return 가.평균 - 나.평균; });   // 어려운 문장이 위로

  // 개별 지도가 급한 순서대로. 급한 정도가 같으면 최고 점수가 낮은 쪽이 먼저.
  var 짚을학생 = 학생들.filter(function (ㅅ) { return ㅅ.급함 > 0; })
    .slice()
    .sort(function (가, 나) {
      if (가.급함 !== 나.급함) return 나.급함 - 가.급함;
      return 가.최고 - 나.최고;
    });

  return {
    학생들: 학생들,
    짚을학생: 짚을학생,
    문장들: 문장들,
    통과기준: 통과기준,
    전체: 전체요약_(학생들)
  };
}


/** 그 학생이 가장 힘들어한 문장 (두 번 이상 해 본 것 우선) */
function 약한문장찾기_(기록) {
  var 묶음 = {};
  기록.forEach(function (ㄱ) {
    if (!ㄱ.문장) return;
    if (!묶음[ㄱ.문장]) 묶음[ㄱ.문장] = [];
    묶음[ㄱ.문장].push(ㄱ.점수);
  });
  var 이름들 = Object.keys(묶음);
  if (이름들.length === 0) return null;

  var 목록 = 이름들.map(function (ㅁ) {
    var 점수들 = 묶음[ㅁ];
    return {
      문장: ㅁ,
      시도: 점수들.length,
      평균: 반올림_(점수들.reduce(function (ㄱ, ㄴ) { return ㄱ + ㄴ; }, 0) / 점수들.length)
    };
  });
  목록.sort(function (가, 나) { return 가.평균 - 나.평균; });
  return 목록[0];
}


/**
 * 왜 이 학생을 따로 봐야 하는지 적어 둡니다.
 * 점수가 낮은 것만이 아니라, 잘하다가 떨어진 학생과 거의 안 한 학생도 잡습니다.
 */
function 짚어줄까닭_(ㅅ, 통과기준) {
  var 까닭 = [];
  var 급함 = 0;

  if (ㅅ.시도 <= 1) {
    까닭.push('아직 ' + ㅅ.시도 + '번밖에 안 했습니다');
    급함 = Math.max(급함, 2);
  }
  if (ㅅ.최고 < 통과기준) {
    까닭.push('한 번도 통과하지 못했습니다 (최고 ' + ㅅ.최고 + '점, 기준 ' + 통과기준 + '점)');
    급함 = Math.max(급함, 3);
  }
  if (ㅅ.성장 <= -10 && ㅅ.시도 >= 3) {
    까닭.push('처음보다 ' + Math.abs(ㅅ.성장) + '점 떨어졌습니다');
    급함 = Math.max(급함, 2);
  }
  if (ㅅ.최고 >= 통과기준 && ㅅ.최근 < 통과기준 && ㅅ.시도 >= 3) {
    까닭.push('통과한 적이 있는데 최근에 다시 내려갔습니다');
    급함 = Math.max(급함, 2);
  }
  // 평균이 낮아도, 뚜렷하게 오르는 중이고 지금 기준을 넘겼으면 부르지 않습니다.
  // (낮게 시작해 많이 는 학생이 '지도 대상'으로 뜨면 목록이 시끄러워집니다)
  var 오르는중 = (ㅅ.성장 >= 10 && ㅅ.최근 >= 통과기준);
  if (까닭.length === 0 && ㅅ.평균 < 통과기준 && ㅅ.시도 >= 3 && !오르는중) {
    까닭.push('통과는 했지만 평균이 기준 아래입니다 (' + ㅅ.평균 + '점)');
    급함 = Math.max(급함, 1);
  }

  ㅅ.까닭들 = 까닭;
  ㅅ.급함 = 급함;
}


function 전체요약_(학생들) {
  if (학생들.length === 0) return 비어있는요약_();
  var 성장들 = 학생들.map(function (ㅅ) { return ㅅ.성장; });
  var 평균들 = 학생들.map(function (ㅅ) { return ㅅ.평균; });
  return {
    학생수: 학생들.length,
    시도수: 학생들.reduce(function (ㄱ, ㅅ) { return ㄱ + ㅅ.시도; }, 0),
    평균점수: 반올림_(평균들.reduce(function (ㄱ, ㄴ) { return ㄱ + ㄴ; }, 0) / 평균들.length),
    평균성장: 반올림_(성장들.reduce(function (ㄱ, ㄴ) { return ㄱ + ㄴ; }, 0) / 성장들.length),
    는사람: 성장들.filter(function (ㄱ) { return ㄱ > 0; }).length,
    준사람: 성장들.filter(function (ㄱ) { return ㄱ < 0; }).length
  };
}

function 비어있는요약_() {
  return { 학생수: 0, 시도수: 0, 평균점수: 0, 평균성장: 0, 는사람: 0, 준사람: 0 };
}

function 날짜수_(기록) {
  var 날 = {};
  기록.forEach(function (ㄱ) { 날[(ㄱ.때글 || '').slice(0, 10)] = 1; });
  return Object.keys(날).length;
}

function 때를숫자로_(값) {
  if (값 instanceof Date) return 값.getTime();
  var ㄷ = new Date(값);
  return isNaN(ㄷ.getTime()) ? 0 : ㄷ.getTime();
}

function 때를글자로_(값) {
  var ㄷ = (값 instanceof Date) ? 값 : new Date(값);
  if (isNaN(ㄷ.getTime())) return String(값 || '');
  return Utilities.formatDate(ㄷ, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
}

function 반올림_(숫자) {
  return Math.round(숫자 * 10) / 10;
}
