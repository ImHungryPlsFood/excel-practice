// Excel 대조용 2차 기준 통합 문서 작성기 (CARD-02B 추가 작업, Q-01).
// 1차 파일(make-golden-formulas.mjs)에 없던 항목만 담는다.
//   - docs/EXCEL_DIFFERENCES.md의 D-4 ~ D-8 확인용 수식
//   - CONCAT 범위 인수 동작 (D-1은 셀·문자열 인수만 Excel로 확인했다)
//   - ADR-001 §3 표에서 "지원"으로 확인됐지만 1차 파일에 없던 함수의 대표 수식
// 수식 결과 값(<v>)은 넣지 않는다. 사용자가 Excel에서 열어 계산·저장한 파일이 tests/fixtures/golden-excel-calculations-2.xlsx가 된다.
// 1차 파일과 같은 방식(외부 패키지 없이 zlib로 zip 작성, 수정 시각 0으로 출력 고정)이며 1차 파일은 건드리지 않는다.
//
// 실행: node scripts/golden/make-golden-formulas-2.mjs
//
// ── 비교 방법 (대조 테스트를 쓰기 전에 정해 둔 규칙) ──────────────────────────────────────────
// 1. 엔진에 넣는 수식은 이 파일(golden-formulas-2.xlsx)의 원본 수식이다. 1차 테스트처럼 Excel이 저장한 수식을 쓰지 않는다.
//    Excel은 저장할 때 수식 글자를 바꿀 수 있다(예: =1E+3 → =1000). 저장본 수식을 엔진에 넣으면 그 차이가 가려진다(D-4).
//    Excel 쪽에서는 셀 주소로 짝지어 계산 값만 읽는다.
// 2. 수식 글자 자체는 비교하지 않는다. 입력(수식이 아닌) 셀은 원본과 같아야 하고, 수식 셀의 개수와 주소도 같아야 한다.
//    단, 배열 수식(DynamicArrays 시트)은 Excel이 펼친 범위의 셀을 값으로 저장하므로 ref 범위 안의 셀은 입력 검사에서 뺀다.
// 3. 값 비교는 1차와 같다: 숫자 허용 오차 1e-9, 문자열·논리값·오류 코드는 정확히 일치.
// 4. E열 "비교 방식" 표시:
//      값           Excel 값과 엔진 값이 같아야 한다 (기본).
//      값(원본수식)   값만 비교하되 원본 수식을 넣는다는 점이 핵심인 항목 (D-4 지수 표기).
//      차이기록       엔진과 달라도 되는 항목. Excel 값을 확인해 EXCEL_DIFFERENCES.md에 적고, 테스트는 양쪽 값이 기록과 같은지 검사한다.
//      Excel만        Excel에서만 값을 확인한다 (순환 참조처럼 엔진이 일부러 다르게 처리하는 경우, D-5).
// 5. TODAY·NOW는 실행 시각에 따라 값이 달라 값 자체를 비교하지 않고, 결과가 항상 같은 식(예: =TODAY()-INT(NOW()))으로 검사한다.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';

const OUTPUT = resolve(process.cwd(), 'tests/fixtures/golden-formulas-2.xlsx');

const HEADER = ['입력1', '입력2', '수식', '검증 내용', '비교 방식'];

/** Excel 파일 안에서 접두사가 붙는 함수(Excel 2010 이후 추가). 작성할 때 자동으로 붙인다. */
const XLFN = [
  'CONCAT',
  'TEXTJOIN',
  'IFNA',
  'XLOOKUP',
  'XMATCH',
  'UNIQUE',
  'SEQUENCE',
  'SORTBY',
  'DAYS',
  'ISOWEEKNUM',
  'RANK.EQ',
  'MODE.SNGL',
  'NUMBERVALUE',
  'TEXTBEFORE',
];
const XLWS = ['FILTER', 'SORT'];

function withPrefixes(formula) {
  let text = formula;
  for (const name of XLFN) {
    const pattern = new RegExp(`(?<![A-Za-z0-9_.])${name.replace('.', '\\.')}\\(`, 'g');
    text = text.replace(pattern, `_xlfn.${name}(`);
  }
  for (const name of XLWS) {
    text = text.replace(new RegExp(`(?<![A-Za-z0-9_.])${name}\\(`, 'g'), `_xlfn._xlws.${name}(`);
  }
  return text;
}

/** @typedef {string | number | boolean | null | { f: string, array: string }} Scalar */
/**
 * rows의 각 행: [입력1, 입력2, 수식, 검증 내용, 비교 방식(생략하면 compare)].
 * plain: 머리글·A~E열 구성 없이 extra 셀만 쓰는 시트.
 * @typedef {{ name: string, rows: Scalar[][], compare?: string, extra?: Record<string, Scalar>, plain?: boolean }} SheetSpec
 */

const V = '값';
const DIFF = '차이기록';

/** @type {SheetSpec[]} */
const SHEETS = [
  // ───────────── 자료 시트 (입력값만) ─────────────
  {
    name: 'Data',
    plain: true,
    extra: {
      // 1차 파일 Data 시트와 같은 표
      A1: '상품',
      B1: '수량',
      C1: '단가',
      D1: '비고',
      A2: '사과',
      B2: 12,
      C2: 1200,
      D2: null,
      A3: '배',
      B3: 7,
      C3: 2500,
      D3: '할인',
      A4: '귤',
      B4: 30,
      C4: 400,
      D4: null,
      A5: '포도',
      B5: 5,
      C5: 3200,
      D5: '할인',
      A6: '감',
      B6: 18,
      C6: 900,
      D6: '품절',
      // 1차 파일 CoreFunctions의 F~H 표 (G5는 빈 셀, G7은 문자)
      F1: '이름',
      G1: '점수',
      H1: '부서',
      F2: '김민준',
      G2: 85,
      H2: '영업',
      F3: '이서연',
      G3: 92,
      H3: '개발',
      F4: '박도윤',
      G4: 78,
      H4: '영업',
      F5: '최하은',
      G5: null,
      H5: '개발',
      F6: '정시우',
      G6: 64,
      H6: '인사',
      F7: '한지아',
      G7: '결석',
      H7: '영업',
      // 근사 일치 조회용: 오름차순 기준 점수표(J,K)와 내림차순 숫자(M)
      J1: '기준점',
      K1: '등급',
      M1: '내림차순',
      J2: 0,
      K2: 'F',
      M2: 90,
      J3: 60,
      K3: 'D',
      M3: 80,
      J4: 70,
      K4: 'C',
      M4: 70,
      J5: 80,
      K5: 'B',
      M5: 60,
      J6: 90,
      K6: 'A',
      M6: 0,
    },
    rows: [],
  },

  // ───────────── D-4 수식 안의 지수 표기 ─────────────
  {
    name: 'D4_Exponent',
    compare: '값(원본수식)',
    rows: [
      [null, null, '=1E+3', '양의 지수(부호 포함)'],
      [null, null, '=1E3', '양의 지수(부호 없음)'],
      [null, null, '=2.5E-1', '음의 지수'],
      [null, null, '=1.5E2', '대문자 E, 소수 가수'],
      [null, null, '=1.5e2', '소문자 e'],
      [2, null, '=A7*1E+3', '셀 참조와 지수 표기 곱'],
      [null, null, '=1E+3+1E-3', '지수 표기 두 개'],
      [null, null, '="x"&1E+3', '문자열 연결 안의 지수 표기'],
    ],
  },

  // ───────────── D-5 순환 참조 ─────────────
  {
    name: 'D5_Cycle',
    compare: 'Excel만',
    rows: [
      [null, null, '=C2+1', '자기 자신을 참조'],
      [null, null, '=C4', '두 셀이 서로 참조(1)'],
      [null, null, '=C3+1', '두 셀이 서로 참조(2)'],
      [null, null, '=SUM(C5:C6)', '범위가 자기 자신을 포함'],
      [null, null, '=IFERROR(C6,"대체")', '순환 참조를 IFERROR로 감싼 셀'],
    ],
  },

  // ───────────── D-6 숫자를 문자열로 바꾸는 방식 ─────────────
  {
    name: 'D6_NumToText',
    compare: V,
    rows: [
      [null, null, '="x"&(0.1+0.2)', '& : 0.30000000000000004'],
      [null, null, '=CONCATENATE("x",0.1+0.2)', 'CONCATENATE'],
      [null, null, '=CONCAT("x",0.1+0.2)', 'CONCAT (어댑터가 15자리 규칙 적용)'],
      [null, null, '="x"&(1/3)', '& : 순환소수'],
      [null, null, '="x"&(2/3)', '& : 반올림 방향이 바뀌는 순환소수'],
      [null, null, '="x"&(1/7)', '& : 15자리 경계'],
      [null, null, '="x"&1234567890123456', '& : 16자리 정수'],
      [null, null, '="x"&123456789012345678', '& : 18자리 정수(과학 표기로 바뀜)'],
      [null, null, '="x"&(10^15)', '& : 1E+15'],
      [null, null, '="x"&(10^20)', '& : 1E+20'],
      [null, null, '="x"&(1/10000000)', '& : 1E-07'],
      [null, null, '="x"&0.000123', '& : 0.000123'],
      [null, null, '="x"&-0.5', '& : 음수'],
      [null, null, '=LEN(0.1+0.2)', 'LEN 안에서의 변환'],
      [null, null, '=LEN(1/3)', 'LEN : 순환소수'],
      [null, null, '=LEFT(1/3,5)', 'LEFT : 숫자를 문자열로'],
      [null, null, '=(0.1+0.2)=0.3', '15자리 비교(연관 확인)'],
      [null, null, '=TEXTJOIN(",",TRUE,0.1+0.2,1/3)', 'TEXTJOIN 안에서의 변환'],
    ],
  },

  // ───────────── D-7 INDEX 행·열 번호 0 ─────────────
  {
    name: 'D7_IndexZero',
    compare: DIFF,
    rows: [
      [null, null, '=SUM(INDEX(Data!B2:C6,0,2))', '열 전체(단가 열) 합계'],
      [null, null, '=SUM(INDEX(Data!B2:C6,2,0))', '행 전체 합계'],
      [null, null, '=ROWS(INDEX(Data!A2:C6,0,2))', '열 전체 배열의 행 수'],
      [null, null, '=COLUMNS(INDEX(Data!A2:C6,2,0))', '행 전체 배열의 열 수'],
      [null, null, '=MAX(INDEX(Data!B2:C6,0,1))', '열 전체 최댓값'],
      [null, null, '=SUM(INDEX(Data!B2:B6,0))', '한 열 범위에 행 번호 0'],
      [null, null, '=SUM(INDEX(Data!B2:C6,0,0))', '행·열 모두 0 (범위 전체)'],
      [null, null, '=INDEX(Data!A2:A6,-1)', '음수 행 번호'],
      [null, null, '=INDEX(Data!A2:C6,2,4)', '열 번호 초과'],
      [null, null, '=INDEX(Data!A2:C6,6,1)', '행 번호 초과'],
      [null, null, '=INDEX(Data!A2:C6,2,-1)', '음수 열 번호'],
      [null, null, '=INDEX(Data!A2:C6,2)', '여러 열 범위에 행 번호만 (첫 열)'],
      [null, null, '=INDEX(Data!A2:C2,2)', '한 행 범위에 번호 하나 (열 번호로 사용)'],
    ],
  },

  // ───────────── D-8 엔진에 없는 함수 ─────────────
  {
    name: 'D8_Unsupported',
    compare: DIFF,
    rows: [
      [null, null, '=AVERAGEIFS(Data!G2:G7,Data!H2:H7,"영업")', 'AVERAGEIFS'],
      [null, null, '=RANK(Data!G3,Data!G2:G7)', 'RANK 내림차순'],
      [null, null, '=RANK(Data!G4,Data!G2:G7,1)', 'RANK 오름차순'],
      [null, null, '=RANK.EQ(Data!G2,Data!G2:G7)', 'RANK.EQ'],
      [null, null, '=XMATCH("박도윤",Data!F2:F7)', 'XMATCH 정확히 일치'],
      [null, null, '=XMATCH(80,Data!J2:J6,-1)', 'XMATCH 작거나 같은 값'],
      [null, null, '=LOOKUP(85,Data!J2:J6,Data!K2:K6)', 'LOOKUP 벡터 형식(근사 일치)'],
      [null, null, '=INDEX(SORTBY(Data!F2:F7,Data!G2:G7,-1),1)', 'SORTBY 후 첫 값'],
      [null, null, '=MODE.SNGL(Data!B2:B6,12)', 'MODE.SNGL'],
      [null, null, '=MODE(Data!B2:B6,12)', 'MODE'],
      [null, null, '=OFFSET(Data!A1,1,1)', 'OFFSET'],
      [null, null, '=INDIRECT("Data!B2")', 'INDIRECT'],
      [null, null, '=NUMBERVALUE("1.234,5",",",".")', 'NUMBERVALUE'],
      [null, null, '=TEXTBEFORE("a-b-c","-")', 'TEXTBEFORE'],
    ],
  },

  // ───────────── CONCAT 범위 인수 ─────────────
  {
    name: 'ConcatRange',
    compare: V,
    // F~G: 범위 인수 자료. F3는 빈 셀. G4는 0.1+0.2의 이진 표현을 숫자 상수로 직접 넣은 것. J2는 오류 값을 만드는 수식 셀.
    extra: {
      F1: '문자',
      G1: '값',
      F2: '가',
      G2: 1.5,
      F3: null,
      G3: true,
      F4: '나',
      G4: 0.30000000000000004,
      J1: '오류 셀',
      J2: '=1/0',
    },
    rows: [
      [null, null, '=CONCAT(Data!A2:A6)', '한 열 범위'],
      [null, null, '=CONCAT(Data!B2:C3)', '2차원 범위는 행 우선 (12,1200,7,2500)'],
      [null, null, '=CONCAT(Data!A2:A3,"-",Data!D2:D3)', '빈 셀 건너뜀 (D2는 빈 셀)'],
      [null, null, '=CONCAT(F2:F4)', '중간 빈 셀'],
      [null, null, '=CONCAT(G2:G4)', '숫자·논리값·긴 소수 (1.5TRUE0.3)'],
      [null, null, '=CONCAT(F2:G4)', '문자와 숫자가 섞인 2차원 범위'],
      [null, null, '=CONCAT(Data!A2:A3,Data!A2:A3)', '범위 인수 두 개'],
      [null, null, '=CONCAT(Data!G2:G7)', '빈 셀·문자 섞인 점수 열'],
      [null, null, '=CONCAT(TRUE,FALSE)', '논리값 상수'],
      [null, null, '=CONCAT(TRUE,1.5)', '논리값과 숫자'],
      [null, null, '=CONCAT(0.1+0.2)', '숫자는 15자리 일반 서식'],
      [null, null, '=CONCAT(1/3)', '순환소수'],
      [null, null, '=CONCAT(J2:J3)', '범위 안의 오류 값 전파'],
      [null, null, '=CONCAT("a",NA())', '인수의 오류 전파(#N/A)'],
      [null, null, '=CONCAT("a",1/0,NA())', '여러 오류는 앞의 것'],
      [null, null, '=CONCAT(Data!D2:D2)', '빈 셀 하나뿐인 범위 (빈 문자열)'],
      [null, null, '=CONCAT("")', '빈 문자열'],
      [null, null, '=LEN(CONCAT(REPT("a",32767)))', '32,767자는 허용'],
      [null, null, '=CONCAT(REPT("a",32767),"b")', '32,768자는 #VALUE!'],
      [null, null, '=CONCAT(F2:F4,G2:G4)', '범위 두 개 (각각 펼침)'],
    ],
  },

  // ───────────── 텍스트 함수 ─────────────
  {
    name: 'Text',
    compare: V,
    rows: [
      [null, null, '=LEFT(Data!F2,1)', 'LEFT 한글'],
      [null, null, '=LEFT("abc")', 'LEFT 글자 수 생략'],
      [null, null, '=LEFT("abc",10)', 'LEFT 길이 초과'],
      [null, null, '=LEFT("abc",-1)', 'LEFT 음수'],
      [null, null, '=RIGHT("abcdef",2)', 'RIGHT'],
      [null, null, '=RIGHT("abc")', 'RIGHT 글자 수 생략'],
      [null, null, '=MID("abcdef",2,3)', 'MID'],
      [null, null, '=MID("abc",5,2)', 'MID 시작 위치 초과'],
      [null, null, '=MID("abcdef",0,2)', 'MID 시작 0'],
      [null, null, '=MID(Data!F2,2,2)', 'MID 한글'],
      [null, null, '=LEN("")', 'LEN 빈 문자열'],
      [null, null, '=LEN(123.50)', 'LEN 숫자'],
      [null, null, '=LEN(Data!G5)', 'LEN 빈 셀'],
      [null, null, '=TRIM("  a   b  ")', 'TRIM 앞뒤·중간 공백'],
      [null, null, '=TRIM(CHAR(160)&"a")', 'TRIM은 줄바꿈 없는 공백(160)을 지우지 않음'],
      [null, null, '=LEN(TRIM("  a   b  "))', 'TRIM 후 글자 수'],
      [null, null, '=TEXTJOIN(",",TRUE,Data!F2:F4)', 'TEXTJOIN 정상'],
      [null, null, '=TEXTJOIN(",",TRUE,Data!G4:G6)', 'TEXTJOIN 빈 셀 무시'],
      [null, null, '=TEXTJOIN(",",FALSE,Data!G4:G6)', 'TEXTJOIN 빈 셀 포함'],
      [null, null, '=TEXTJOIN("-",TRUE,Data!F2:F3,Data!H2:H3)', 'TEXTJOIN 범위 두 개'],
      [null, null, '=TEXTJOIN(", ",TRUE,"a","","b")', 'TEXTJOIN 빈 문자열 인수 무시'],
      [null, null, '=TEXTJOIN(",",FALSE,"a","","b")', 'TEXTJOIN 빈 문자열 인수 포함'],
      [null, null, '=TEXTJOIN(",",TRUE,Data!A2:C3)', 'TEXTJOIN 2차원 범위'],
      [null, null, '=TEXTJOIN(,TRUE,"a","b")', 'TEXTJOIN 구분 기호 생략'],
      [null, null, '=UPPER("hello")&LOWER("WORLD")&PROPER("hello world")', 'UPPER·LOWER·PROPER'],
      [null, null, '=FIND("b","abcb")', 'FIND'],
      [null, null, '=FIND("B","abc")', 'FIND 대소문자 구분'],
      [null, null, '=SEARCH("B","abc")', 'SEARCH 대소문자 무시'],
      [null, null, '=SUBSTITUTE("a-b-c","-","+")', 'SUBSTITUTE'],
      [null, null, '=REPLACE("abcdef",2,3,"X")', 'REPLACE'],
      [null, null, '=VALUE("123")+1', 'VALUE'],
      [null, null, '=TEXT(1234.5,"#,##0.00")', 'TEXT 천 단위 구분 (부분 지원 확인)'],
      [null, null, '=TEXT(1234.5,"0.0")', 'TEXT 소수 한 자리'],
      [null, null, '=TEXT(0.256,"0%")', 'TEXT 백분율'],
      [null, null, '=TEXT(5,"000")', 'TEXT 앞자리 0'],
      [null, null, '=TEXT(DATE(2024,3,15),"yyyy-mm-dd")', 'TEXT 날짜'],
      [null, null, '=TEXT(DATE(2024,3,15),"yyyy")', 'TEXT 연도'],
      [null, null, '=TEXT(DATE(2024,3,15),"m/d")', 'TEXT 월/일'],
    ],
  },

  // ───────────── 날짜와 시간 함수 ─────────────
  {
    name: 'DateTime',
    compare: V,
    rows: [
      [null, null, '=TODAY()-INT(NOW())', 'TODAY와 NOW의 날짜 부분은 같다 (0)'],
      [null, null, '=NOW()-TODAY()<1', 'NOW의 시간 부분은 1 미만 (TRUE)'],
      [null, null, '=ISNUMBER(TODAY())', 'TODAY는 숫자'],
      [null, null, '=TODAY()>DATE(2024,1,1)', 'TODAY는 2024년 이후'],
      [null, null, '=TIME(13,30,0)', 'TIME'],
      [null, null, '=TIME(25,0,0)', 'TIME 24시간 넘김 (24시간 나머지)'],
      [null, null, '=TIME(0,90,0)', 'TIME 분 넘김'],
      [null, null, '=HOUR(TIME(13,30,45))', 'HOUR'],
      [null, null, '=MINUTE(TIME(13,30,45))', 'MINUTE'],
      [null, null, '=SECOND(TIME(13,30,45))', 'SECOND'],
      [0.75, null, '=HOUR(A12)', 'HOUR 소수 일련번호'],
      [null, null, '=TIMEVALUE("13:30")', 'TIMEVALUE'],
      [null, null, '=HOUR(DATE(2024,3,15)+0.5)', '날짜+시간 값의 시'],
      [null, null, '=WEEKDAY(DATE(2024,3,15),2)', 'WEEKDAY 월요일=1'],
      [null, null, '=WEEKDAY(DATE(2024,3,15),3)', 'WEEKDAY 월요일=0'],
      [null, null, '=WEEKNUM(DATE(2024,3,15))', 'WEEKNUM 일요일 시작'],
      [null, null, '=WEEKNUM(DATE(2024,3,15),2)', 'WEEKNUM 월요일 시작'],
      [null, null, '=WEEKNUM(DATE(2024,1,1))', 'WEEKNUM 연초'],
      [null, null, '=ISOWEEKNUM(DATE(2024,3,15))', 'ISOWEEKNUM'],
      [null, null, '=ISOWEEKNUM(DATE(2021,1,1))', 'ISOWEEKNUM 전년도 주'],
      [null, null, '=EDATE(DATE(2024,1,31),1)', 'EDATE 말일: 윤년 2월 29일이어야 함'],
      [null, null, '=EDATE(DATE(2023,1,31),1)', 'EDATE 말일: 평년 2월 28일'],
      [null, null, '=EDATE(DATE(2024,1,15),1)', 'EDATE'],
      [null, null, '=EDATE(DATE(2024,3,31),-1)', 'EDATE 음수 개월'],
      [null, null, '=EDATE(DATE(2024,1,15),12)', 'EDATE 12개월'],
      [null, null, '=EOMONTH(DATE(2024,1,15),0)', 'EOMONTH'],
      [null, null, '=EOMONTH(DATE(2024,1,31),1)', 'EOMONTH 윤년 2월'],
      [null, null, '=EOMONTH(DATE(2023,1,31),1)', 'EOMONTH 평년 2월'],
      [null, null, '=EOMONTH(DATE(2024,3,15),-1)', 'EOMONTH 음수'],
      [null, null, '=NETWORKDAYS(DATE(2024,3,1),DATE(2024,3,15))', 'NETWORKDAYS'],
      [null, null, '=NETWORKDAYS(DATE(2024,3,15),DATE(2024,3,1))', 'NETWORKDAYS 거꾸로'],
      [null, null, '=WORKDAY(DATE(2024,3,1),5)', 'WORKDAY'],
      [null, null, '=WORKDAY(DATE(2024,3,1),-1)', 'WORKDAY 음수'],
      [null, null, '=DAYS(DATE(2024,3,15),DATE(2024,3,1))', 'DAYS'],
      [null, null, '=DAYS(DATE(2024,3,1),DATE(2024,3,15))', 'DAYS 음수'],
      [null, null, '=DAYS360(DATE(2024,1,31),DATE(2024,3,31))', 'DAYS360'],
      [null, null, '=YEARFRAC(DATE(2024,1,1),DATE(2024,7,1))', 'YEARFRAC 기본(30/360)'],
      [null, null, '=YEARFRAC(DATE(2024,1,1),DATE(2024,7,1),1)', 'YEARFRAC 실제/실제'],
      [null, null, '=DATEDIF(DATE(2000,5,15),DATE(2024,3,15),"Y")', 'DATEDIF Y'],
      [null, null, '=DATEDIF(DATE(2000,5,15),DATE(2024,3,15),"M")', 'DATEDIF M'],
      [null, null, '=DATEDIF(DATE(2000,5,15),DATE(2024,3,15),"D")', 'DATEDIF D'],
      [null, null, '=DATEDIF(DATE(2000,5,15),DATE(2024,3,15),"YM")', 'DATEDIF YM'],
      [null, null, '=DATEDIF(DATE(2000,5,15),DATE(2024,3,15),"YD")', 'DATEDIF YD'],
      [null, null, '=DATEDIF(DATE(2000,5,15),DATE(2024,3,15),"MD")', 'DATEDIF MD'],
      [null, null, '=DATEDIF(DATE(2024,1,31),DATE(2024,3,1),"MD")', 'DATEDIF MD 말일 경계'],
      [null, null, '=DATEDIF(DATE(2024,3,15),DATE(2000,5,15),"Y")', 'DATEDIF 시작이 끝보다 늦음'],
      [null, null, '=DATEDIF(DATE(2000,5,15),DATE(2024,3,15),"X")', 'DATEDIF 잘못된 단위'],
      [null, null, '=DATEDIF(DATE(2000,5,15),DATE(2024,3,15),"y")', 'DATEDIF 소문자 단위'],
      [null, null, '=DATE(2024,3,15)+30', '날짜 + 일수'],
      [null, null, '=YEAR(DATE(2024,3,15)+30)', '날짜 연산 후 YEAR'],
      [null, null, '=DATE(2024,3,15)-DATE(2024,3,1)', '날짜 차'],
      [null, null, '=DATEVALUE("2024/03/15")', 'DATEVALUE 슬래시'],
      [null, null, '=DATEVALUE("2024-13-45")', 'DATEVALUE 잘못된 날짜'],
    ],
  },

  // ───────────── 조회 함수 ─────────────
  {
    name: 'Lookup',
    compare: V,
    rows: [
      [null, null, '=VLOOKUP(85,Data!J2:K6,2,TRUE)', 'VLOOKUP 근사 일치'],
      [null, null, '=VLOOKUP(85,Data!J2:K6,2)', 'VLOOKUP 4번째 인수 생략(근사 일치)'],
      [null, null, '=VLOOKUP(59,Data!J2:K6,2,TRUE)', 'VLOOKUP 근사: 경계 바로 아래'],
      [null, null, '=VLOOKUP(60,Data!J2:K6,2,TRUE)', 'VLOOKUP 근사: 경계 값'],
      [null, null, '=VLOOKUP(-1,Data!J2:K6,2,TRUE)', 'VLOOKUP 근사: 첫 값보다 작음'],
      [null, null, '=VLOOKUP(1000,Data!J2:K6,2,TRUE)', 'VLOOKUP 근사: 마지막 값보다 큼'],
      [null, null, '=VLOOKUP("사*",Data!A2:C6,2,FALSE)', 'VLOOKUP 정확히 일치 + 와일드카드'],
      [null, null, '=VLOOKUP("사과",Data!A2:C6,0,FALSE)', 'VLOOKUP 열 번호 0'],
      [null, null, '=VLOOKUP("SA",Data!A2:C6,2,FALSE)', 'VLOOKUP 없는 값'],
      [null, null, '=HLOOKUP("수량",Data!A1:D6,2,FALSE)', 'HLOOKUP'],
      [null, null, '=HLOOKUP("단가",Data!A1:D6,6,FALSE)', 'HLOOKUP 마지막 행'],
      [null, null, '=MATCH(85,Data!J2:J6,1)', 'MATCH 1 (작거나 같은 최댓값)'],
      [null, null, '=MATCH(85,Data!J2:J6)', 'MATCH 3번째 인수 생략'],
      [null, null, '=MATCH(85,Data!M2:M6,-1)', 'MATCH -1 (내림차순)'],
      [null, null, '=MATCH("사*",Data!A2:A6,0)', 'MATCH 와일드카드'],
      [null, null, '=MATCH("사과",Data!A2:A6,0)', 'MATCH 정확히 일치'],
      [null, null, '=INDEX(Data!A2:C6,2,3)', 'INDEX 행·열'],
      [null, null, '=INDEX(Data!A2:A6,3)', 'INDEX 한 열 범위'],
      [null, null, '=INDEX(Data!D2:D6,1)', 'INDEX 빈 셀(0)'],
      [
        null,
        null,
        '=INDEX(Data!A2:C6,MATCH("귤",Data!A2:A6,0),MATCH("단가",Data!A1:C1,0))',
        'INDEX+MATCH 양방향',
      ],
      [null, null, '=XLOOKUP("영업",Data!H2:H7,Data!F2:F7)', 'XLOOKUP 정확히 일치(처음 값)'],
      [null, null, '=XLOOKUP("없음",Data!H2:H7,Data!F2:F7,"없음")', 'XLOOKUP 못 찾았을 때 대체 값'],
      [null, null, '=XLOOKUP("없음",Data!H2:H7,Data!F2:F7)', 'XLOOKUP 못 찾음 #N/A'],
      [null, null, '=XLOOKUP(85,Data!J2:J6,Data!K2:K6,"없음",-1)', 'XLOOKUP 작거나 같은 값'],
      [null, null, '=XLOOKUP(85,Data!J2:J6,Data!K2:K6,"없음",1)', 'XLOOKUP 크거나 같은 값'],
      [null, null, '=XLOOKUP(85,Data!J2:J6,Data!K2:K6)', 'XLOOKUP 정확히 일치만 → #N/A'],
      [null, null, '=XLOOKUP("*",Data!F2:F7,Data!G2:G7,"없음",2)', 'XLOOKUP 와일드카드 모드'],
      [
        null,
        null,
        '=XLOOKUP("한*",Data!F2:F7,Data!G2:G7,"없음",2)',
        'XLOOKUP 와일드카드: 문자 값 반환',
      ],
      [null, null, '=XLOOKUP("영업",Data!H2:H7,Data!F2:F7,,0,-1)', 'XLOOKUP 마지막부터 검색'],
      [null, null, '=XLOOKUP(85,Data!J2:J6,Data!K2:K6,"없음",-1,2)', 'XLOOKUP 이진 검색(오름차순)'],
      [null, null, '=XLOOKUP("점수",Data!F1:H1,Data!F2:H2)', 'XLOOKUP 가로 방향'],
      [null, null, '=XLOOKUP("김민준",Data!F2:F7,Data!G2:G7)', 'XLOOKUP 숫자 반환'],
      [
        null,
        null,
        '=XLOOKUP("Y",Data!H2:H7,Data!F2:F7,"없음")',
        'XLOOKUP 일부만 같은 값은 못 찾음',
      ],
      [null, null, '=XLOOKUP(1,Data!A2:A3,Data!B2:B4)', 'XLOOKUP 범위 크기 불일치'],
      [null, null, '=XLOOKUP(1/0,Data!H2:H7,Data!F2:F7)', 'XLOOKUP 찾는 값이 오류'],
      [null, null, '=IFNA(MATCH(999,Data!B2:B6,0),"없음")', 'IFNA #N/A 대체'],
      [null, null, '=IFNA(1/0,"없음")', 'IFNA는 #N/A만 대체 → #DIV/0!'],
      [null, null, '=SUM(FILTER(Data!G2:G7,Data!H2:H7="영업"))', 'FILTER 결과의 합 (문자 무시)'],
      [null, null, '=ROWS(FILTER(Data!F2:F7,Data!H2:H7="영업"))', 'FILTER 결과 행 수'],
      [null, null, '=COUNTA(UNIQUE(Data!H2:H7))', 'UNIQUE 개수'],
      [null, null, '=INDEX(SORT(Data!B2:B6),1)', 'SORT 후 첫 값'],
      [null, null, '=INDEX(SORT(Data!B2:B6,1,-1),1)', 'SORT 내림차순 첫 값'],
      [null, null, '=SUM(SEQUENCE(4))', 'SEQUENCE 합'],
      [null, null, '=INDEX(FILTER(Data!F2:F7,Data!G2:G7>80),2)', 'FILTER 결과에서 둘째 값'],
    ],
  },

  // ───────────── 집계·조건·논리·반올림 ─────────────
  {
    name: 'Aggregate',
    compare: V,
    rows: [
      [null, null, '=SUM(1,2,3)', 'SUM 여러 인수'],
      [null, null, '=SUM(Data!G2:G7,10)', 'SUM 범위와 상수'],
      [null, null, '=SUM("3",2)', 'SUM 숫자 문자열 직접 인수'],
      [null, null, '=SUM("a",2)', 'SUM 변환 불가 문자열 직접 인수'],
      [null, null, '=SUM(TRUE,2)', 'SUM 논리값 직접 인수'],
      [null, null, '=AVERAGE(1,"a")', 'AVERAGE 변환 불가 문자열'],
      [null, null, '=AVERAGE("3",5)', 'AVERAGE 숫자 문자열'],
      [null, null, '=AVERAGE(Data!D2:D2)', 'AVERAGE 빈 셀만 → #DIV/0!'],
      [null, null, '=MAX(Data!D2:D2)', 'MAX 빈 셀만 → 0'],
      [null, null, '=MIN(Data!G5:G5)', 'MIN 빈 셀만 → 0'],
      [null, null, '=MAX(Data!G2:G7,100)', 'MAX 범위와 상수'],
      [null, null, '=COUNT(1,"a",TRUE,"3")', 'COUNT 직접 인수'],
      [null, null, '=COUNT(Data!G2:G7)', 'COUNT 범위'],
      [null, null, '=COUNTA("",1)', 'COUNTA 빈 문자열은 셈'],
      [null, null, '=COUNTA(Data!G2:G7)', 'COUNTA 범위'],
      [null, null, '=COUNTBLANK(Data!G2:G7)', 'COUNTBLANK'],
      [null, null, '=COUNTIF(Data!G2:G7,"")', 'COUNTIF 빈 조건'],
      [null, null, '=COUNTIF(Data!G2:G7,"<>")', 'COUNTIF 비어 있지 않은 셀'],
      [null, null, '=COUNTIF(Data!H2:H7,"영*")', 'COUNTIF 와일드카드 *'],
      [null, null, '=COUNTIF(Data!G2:G7,">=78")', 'COUNTIF 비교 조건'],
      [null, null, '=COUNTIF(Data!G2:G7,85)', 'COUNTIF 숫자 조건'],
      [null, null, '=COUNTIF(Data!G2:G7,"<>85")', 'COUNTIF <>숫자'],
      [null, null, '=COUNTIF(Data!H2:H7,"<>영업")', 'COUNTIF <>문자'],
      [null, null, '=COUNTIF(Data!H2:H7,"영업 ")', 'COUNTIF 끝 공백은 다른 값'],
      [null, null, '=COUNTIFS(Data!H2:H7,"영*",Data!G2:G7,">=80")', 'COUNTIFS 와일드카드+비교'],
      [null, null, '=COUNTIFS(Data!H2:H7,"영업",Data!G2:G7,"<>")', 'COUNTIFS 비어 있지 않은 셀'],
      [null, null, '=COUNTIFS(Data!G2:G7,">70",Data!G2:G7,"<90")', 'COUNTIFS 같은 범위 두 조건'],
      [null, null, '=SUMIF(Data!G2:G7,">80")', 'SUMIF 합계 범위 생략'],
      [null, null, '=SUMIF(Data!H2:H7,"<>영업",Data!G2:G7)', 'SUMIF <>문자'],
      [null, null, '=SUMIF(Data!H2:H7,"영*",Data!G2:G7)', 'SUMIF 와일드카드'],
      [null, null, '=SUMIFS(Data!G2:G7,Data!H2:H7,"영업",Data!G2:G7,">=80")', 'SUMIFS'],
      [null, null, '=SUMIFS(Data!G2:G7,Data!H2:H7,"없음")', 'SUMIFS 일치 없음 → 0'],
      [null, null, '=SUMIFS(Data!G2:G7,Data!H2:H6,"영업")', 'SUMIFS 범위 크기 불일치'],
      [null, null, '=IF(Data!G5="","빈칸","값")', 'IF 빈 셀 비교'],
      [null, null, '=IF(FALSE,1)', 'IF 거짓 값 생략'],
      [null, null, '=IF(0,"a","b")', 'IF 숫자 조건 0'],
      [null, null, '=IF("a",1,2)', 'IF 문자 조건 → #VALUE!'],
      [null, null, '=IF(1/0,1,2)', 'IF 오류 조건'],
      [null, null, '=IF(TRUE,1,1/0)', 'IF 쓰지 않는 분기의 오류'],
      [null, null, '=AND(1,0)', 'AND 숫자'],
      [null, null, '=AND(1,"a")', 'AND 문자 직접 인수 → #VALUE!'],
      [null, null, '=AND(TRUE,Data!H2:H3)', 'AND 범위의 문자 무시'],
      [null, null, '=OR(Data!H2:H3)', 'OR 논리값이 없는 범위 → #VALUE!'],
      [null, null, '=OR(FALSE,1)', 'OR 숫자'],
      [null, null, '=NOT(0)', 'NOT 숫자'],
      [null, null, '=IFERROR(VLOOKUP("수박",Data!A2:C6,2,FALSE),"없음")', 'IFERROR + VLOOKUP'],
      [null, null, '=IFERROR(Data!A2,"대체")', 'IFERROR 오류가 아님'],
      [null, null, '=ROUND(2.5,0)', 'ROUND 2.5'],
      [null, null, '=ROUND(-0.5,0)', 'ROUND -0.5'],
      [null, null, '=ROUND(1.005,2)', 'ROUND 1.005 (이진 표현 경계)'],
      [null, null, '=ROUND(0.285,2)', 'ROUND 0.285 (이진 표현 경계)'],
      [null, null, '=ROUND(1234.5678,-2)', 'ROUND 음수 자릿수'],
      [null, null, '=ROUND(1.45,1)', 'ROUND 1.45'],
      [null, null, '=ROUNDUP(-3.141,1)', 'ROUNDUP 음수'],
      [null, null, '=ROUNDUP(3.0000001,0)', 'ROUNDUP 작은 초과'],
      [null, null, '=ROUNDDOWN(3.789,-1)', 'ROUNDDOWN 음수 자릿수'],
      [null, null, '=ROUNDDOWN(2.9999999999,0)', 'ROUNDDOWN'],
      [null, null, '=ROUND("a",1)', 'ROUND 문자 → #VALUE!'],
      [null, null, '=ROUND(3.14159,2.9)', 'ROUND 자릿수 소수는 버림'],
      [null, null, '=INT(-1.5)', 'INT 음수'],
    ],
  },

  // ───────────── 동적 배열 (배열 수식으로 펼침) ─────────────
  // 각 칸의 수식은 { f, array: 펼쳐질 범위 }. Excel이 이 범위에 결과를 채운다. 범위 크기는 Excel 규칙으로 계산한 기대 크기다.
  {
    name: 'DynamicArrays',
    plain: true,
    extra: {
      A1: 'FILTER 한 열',
      A2: { f: '=FILTER(Data!F2:F7,Data!H2:H7="영업")', array: 'A2:A4' },
      B1: 'FILTER 두 열 원본',
      B2: { f: '=FILTER(Data!F2:G7,Data!H2:H7="영업")', array: 'B2:C4' },
      D1: 'FILTER 일치 없음+대체 값',
      D2: { f: '=FILTER(Data!F2:F7,Data!H2:H7="없음","없음")', array: 'D2:D2' },
      E1: 'FILTER 일치 없음',
      E2: { f: '=FILTER(Data!F2:F7,Data!H2:H7="없음")', array: 'E2:E2' },
      F1: 'FILTER 세 번째 인수(Excel은 if_empty)',
      F2: { f: '=FILTER(Data!F2:F7,Data!H2:H7="영업",Data!G2:G7>80)', array: 'F2:F4' },
      G1: 'FILTER 두 조건 곱',
      G2: { f: '=FILTER(Data!F2:F7,(Data!H2:H7="영업")*(Data!G2:G7>80))', array: 'G2:G3' },
      H1: 'SORT 오름차순',
      H2: { f: '=SORT(Data!B2:B6)', array: 'H2:H6' },
      I1: 'SORT 내림차순',
      I2: { f: '=SORT(Data!B2:B6,1,-1)', array: 'I2:I6' },
      J1: 'SORT 두 열 기준 열 2',
      J2: { f: '=SORT(Data!A2:B6,2,-1)', array: 'J2:K6' },
      L1: 'UNIQUE',
      L2: { f: '=UNIQUE(Data!H2:H7)', array: 'L2:L4' },
      M1: 'UNIQUE 한 번만 나온 값',
      M2: { f: '=UNIQUE(Data!H2:H7,FALSE,TRUE)', array: 'M2:M2' },
      N1: 'UNIQUE 빈 셀 포함',
      N2: { f: '=UNIQUE(Data!D2:D6)', array: 'N2:N4' },
      O1: 'SORT(UNIQUE())',
      O2: { f: '=SORT(UNIQUE(Data!H2:H7))', array: 'O2:O4' },
      P1: 'SEQUENCE 2x3',
      P2: { f: '=SEQUENCE(2,3)', array: 'P2:R3' },
      S1: 'SEQUENCE 시작·증가',
      S2: { f: '=SEQUENCE(3,1,10,5)', array: 'S2:S4' },
      T1: 'XLOOKUP 여러 열 반환',
      T2: { f: '=XLOOKUP("영업",Data!H2:H7,Data!F2:G7)', array: 'T2:U2' },
      V1: 'TRANSPOSE',
      V2: { f: '=TRANSPOSE(Data!F2:F4)', array: 'V2:X2' },
    },
    rows: [],
  },
];

function columnLetter(index) {
  let label = '';
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

function escapeXml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function cellXml(ref, value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    const text = escapeXml(withPrefixes(value.f.slice(1)));
    return `<c r="${ref}"><f t="array" ref="${value.array}">${text}</f></c>`;
  }
  if (typeof value === 'string' && value.startsWith('=')) {
    // 결과 값(<v>)은 쓰지 않는다. Excel이 열 때 fullCalcOnLoad로 계산한다.
    return `<c r="${ref}"><f>${escapeXml(withPrefixes(value.slice(1)))}</f></c>`;
  }
  if (typeof value === 'number') {
    return `<c r="${ref}"><v>${value}</v></c>`;
  }
  if (typeof value === 'boolean') {
    return `<c r="${ref}" t="b"><v>${value ? 1 : 0}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function sheetCells(spec) {
  /** @type {Map<number, Map<number, Scalar>>} */
  const grid = new Map();
  const put = (row, col, value) => {
    if (!grid.has(row)) grid.set(row, new Map());
    grid.get(row).set(col, value);
  };
  if (!spec.plain) {
    HEADER.forEach((title, col) => put(1, col, title));
    spec.rows.forEach((cells, index) => {
      for (let col = 0; col < 4; col++) put(index + 2, col, cells[col] ?? null);
      put(index + 2, 4, cells[4] ?? spec.compare ?? V);
    });
  }
  for (const [ref, value] of Object.entries(spec.extra ?? {})) {
    const match = /^([A-Z]+)(\d+)$/.exec(ref);
    const col = [...match[1]].reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 64, 0) - 1;
    put(Number(match[2]), col, value);
  }
  return grid;
}

function sheetXml(spec) {
  const grid = sheetCells(spec);
  const rows = [...grid.keys()]
    .sort((a, b) => a - b)
    .map((row) => {
      const cols = [...grid.get(row).entries()].sort((a, b) => a[0] - b[0]);
      const cells = cols
        .map(([col, value]) => cellXml(`${columnLetter(col)}${row}`, value))
        .join('');
      return `<row r="${row}">${cells}</row>`;
    })
    .join('');
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<cols><col min="3" max="3" width="48" customWidth="1"/><col min="4" max="5" width="40" customWidth="1"/></cols>` +
    `<sheetData>${rows}</sheetData></worksheet>`
  );
}

function workbookParts() {
  const NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const NS_PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const sheetEntries = SHEETS.map(
    (spec, i) => `<sheet name="${escapeXml(spec.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
  ).join('');
  const sheetRels = SHEETS.map(
    (_, i) =>
      `<Relationship Id="rId${i + 1}" Type="${NS_REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
  ).join('');
  const parts = {
    '[Content_Types].xml':
      head +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      SHEETS.map(
        (_, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
      ).join('') +
      '</Types>',
    '_rels/.rels':
      head +
      `<Relationships xmlns="${NS_PKG}">` +
      `<Relationship Id="rId1" Type="${NS_REL}/officeDocument" Target="xl/workbook.xml"/>` +
      '</Relationships>',
    'xl/workbook.xml':
      head +
      `<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">` +
      `<sheets>${sheetEntries}</sheets>` +
      // 파일을 열 때 모든 수식을 다시 계산하게 한다(결과 값이 없으므로 필수).
      '<calcPr calcId="191029" fullCalcOnLoad="1"/>' +
      '</workbook>',
    'xl/_rels/workbook.xml.rels':
      head +
      `<Relationships xmlns="${NS_PKG}">${sheetRels}` +
      `<Relationship Id="rId${SHEETS.length + 1}" Type="${NS_REL}/styles" Target="styles.xml"/>` +
      '</Relationships>',
    'xl/styles.xml':
      head +
      `<styleSheet xmlns="${NS_MAIN}">` +
      '<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>' +
      '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
      '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>' +
      '</styleSheet>',
  };
  SHEETS.forEach((spec, i) => {
    parts[`xl/worksheets/sheet${i + 1}.xml`] = sheetXml(spec);
  });
  return parts;
}

// 최소 zip 작성기: 항목마다 로컬 헤더 + deflate 데이터, 끝에 중앙 디렉터리. 파일 이름은 UTF-8(플래그 0x0800).
function zip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, text] of Object.entries(entries)) {
    const nameBytes = Buffer.from(name, 'utf8');
    const data = Buffer.from(text, 'utf8');
    const compressed = deflateRawSync(data);
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(0, 10); // 수정 시각 0: 출력이 실행 시점과 무관하게 같도록
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBytes, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(0, 12);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + compressed.length;
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(entries).length, 8);
  end.writeUInt16LE(Object.keys(entries).length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, zip(workbookParts()));

const isFormula = (v) =>
  (typeof v === 'string' && v.startsWith('=')) || (typeof v === 'object' && v !== null);
const formulaCount = SHEETS.reduce(
  (sum, spec) =>
    sum +
    spec.rows.filter((cells) => isFormula(cells[2])).length +
    Object.values(spec.extra ?? {}).filter(isFormula).length,
  0,
);
console.log(`${OUTPUT} 작성 완료: 시트 ${SHEETS.length}개, 수식 ${formulaCount}개`);
