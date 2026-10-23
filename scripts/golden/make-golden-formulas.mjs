// Excel 대조용 기준 통합 문서 작성기 (CARD-02B, Q-01).
// 이 카드가 다루는 연산·함수·참조·오류 값을 검증할 수식과 입력값만 넣고, 수식 결과 값(<v>)은 넣지 않는다.
// 사용자가 이 파일을 Excel에서 열어 계산·저장한 것이 tests/fixtures/golden-excel-calculations.xlsx가 된다.
// 외부 패키지 없이 Node 내장 zlib(deflateRaw, crc32)으로 zip을 만들고 XML을 직접 쓴다.
//
// 실행: node scripts/golden/make-golden-formulas.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';

const OUTPUT = resolve(process.cwd(), 'tests/fixtures/golden-formulas.xlsx');

// 각 시트의 A~D열: 입력1, 입력2, 수식, 검증 내용. 행은 2행부터.
// null은 빈 셀이다. 수식은 '='로 시작한다.
const HEADER = ['입력1', '입력2', '수식', '검증 내용'];

/** @typedef {string | number | boolean | null} Scalar */
/**
 * plain: 머리글·A~D열 구성 없이 extra 셀만 쓰는 자료 시트.
 * @typedef {{ name: string, rows: Scalar[][], extra?: Record<string, Scalar>, plain?: boolean }} SheetSpec
 */

/** @type {SheetSpec[]} */
const SHEETS = [
  {
    name: 'Arithmetic',
    rows: [
      [3, 4, '=A2+B2', '덧셈'],
      [10, 4, '=A3-B3', '뺄셈'],
      [6, 7, '=A4*B4', '곱셈'],
      [7, 2, '=A5/B5', '나눗셈 결과 소수'],
      [2, 10, '=A6^B6', '거듭제곱'],
      [2, 3, '=A7+B7*4', '연산자 우선순위(곱셈 먼저)'],
      [2, 3, '=(A8+B8)*4', '괄호 우선'],
      [3, null, '=-A9^2', '단항 음수가 거듭제곱보다 먼저'],
      [0.1, 0.2, '=A10+B10', '부동소수 덧셈 오차'],
      [1, 3, '=A11/B11*B11', '나눗셈 후 곱셈 복원'],
      [50, null, '=A12%', '% 연산자'],
      ['합계', 10, '=A13&B13', '문자열 연결(&)과 숫자'],
      [1.5, null, '="값:"&A14', '소수의 문자열 변환'],
      ['5', 2, '=A15*B15', '숫자 모양 문자열의 자동 변환'],
      [true, 1, '=A16+B16', '논리값 TRUE의 산술'],
      [null, 5, '=A17+B17', '빈 셀은 0'],
      [1, null, '=A18*1E+3', '지수 표기 숫자 리터럴'],
    ],
  },
  {
    name: 'CoreFunctions',
    // F~H열: 함수가 참조하는 표. G열에 빈 셀과 문자가 섞여 있다.
    extra: {
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
    },
    rows: [
      [null, null, '=SUM(G2:G7)', 'SUM: 빈 셀·문자 무시'],
      [null, null, '=AVERAGE(G2:G7)', 'AVERAGE: 숫자만 평균'],
      [null, null, '=MIN(G2:G7)', 'MIN'],
      [null, null, '=MAX(G2:G7)', 'MAX'],
      [null, null, '=COUNT(G2:G7)', 'COUNT: 숫자 셀 개수'],
      [null, null, '=COUNTA(G2:G7)', 'COUNTA: 비어 있지 않은 셀'],
      [null, null, '=IF(G2>=80,"합격","불합격")', 'IF 참'],
      [null, null, '=IF(G6>=80,"합격","불합격")', 'IF 거짓'],
      [null, null, '=AND(G2>80,G3>80)', 'AND'],
      [null, null, '=OR(G4>80,G6>80)', 'OR 모두 거짓'],
      [null, null, '=NOT(G2>80)', 'NOT'],
      [2.345, null, '=ROUND(A13,2)', 'ROUND: 이진 표현 경계값'],
      [-2.5, null, '=ROUND(A14,0)', 'ROUND: 음수 .5는 0에서 멀어지는 쪽'],
      [3.141, null, '=ROUNDUP(A15,1)', 'ROUNDUP'],
      [-3.789, null, '=ROUNDDOWN(A16,1)', 'ROUNDDOWN: 음수는 0 쪽으로'],
      [1234.5, null, '=ROUND(A17,-2)', 'ROUND: 음수 자릿수'],
      [null, null, '=SUMIF(H2:H7,"영업",G2:G7)', 'SUMIF: 문자 조건, 합계 범위의 문자 무시'],
      [null, null, '=COUNTIF(H2:H7,"영업")', 'COUNTIF: 문자 조건'],
      [null, null, '=COUNTIF(G2:G7,">80")', 'COUNTIF: 비교 조건'],
      [null, null, '=COUNTIF(H2:H7,"?발")', 'COUNTIF: 와일드카드 ?'],
      [null, null, '=SUMIFS(G2:G7,H2:H7,"영업",G2:G7,">70")', 'SUMIFS: 두 조건'],
      [null, null, '=COUNTIFS(H2:H7,"개발",G2:G7,">=90")', 'COUNTIFS: 두 조건'],
      [null, null, '=IFERROR(G2/1,"오류")', 'IFERROR: 정상 값 통과'],
      [null, null, '=IFERROR(G7/1,"오류")', 'IFERROR: 문자 나눗셈 오류 대체'],
      [null, null, '=LEN(F2)', 'LEN: 한글 글자 수'],
      [null, null, '=CONCATENATE(F2,"-",H2)', 'CONCATENATE'],
      [null, null, '=_xlfn.CONCAT(F2,"-",H2)', 'CONCAT(Excel 2019+ 함수)'],
      [null, null, '=SQRT(G3+8)', 'SQRT'],
    ],
  },
  {
    name: 'References',
    extra: { F1: '할인율', G1: 0.1 },
    rows: [
      [1000, null, '=A2*(1-$G$1)', '절대 참조 $G$1'],
      [2000, null, '=$G$1*A3', '절대 참조(순서 바꿈)'],
      [3000, null, '=A4*(1-G$1)', '혼합 참조: 행 고정'],
      [4000, null, '=A5*(1-$G1)', '혼합 참조: 열 고정($G1)'],
      [5000, null, '=SUM(A2:A6)', '범위 참조'],
      [null, null, '=SUM($A$2:$A$6)/COUNT(A2:A6)', '절대 범위와 상대 범위 혼용'],
      [null, null, '=Data!B2', '다른 시트 단일 셀'],
      [null, null, '=SUM(Data!B2:B6)', '다른 시트 범위'],
      [null, null, '=Data!B3*Data!C3', '다른 시트 셀끼리 연산'],
      [null, null, '=SUMPRODUCT(Data!B2:B6,Data!C2:C6)', '다른 시트 두 범위의 곱의 합'],
      [null, null, "='매출 자료'!A1+'매출 자료'!A2", '공백·한글 시트 이름 따옴표 참조'],
      [null, null, '=VLOOKUP("귤",Data!A2:C6,3,FALSE)', 'VLOOKUP 정확히 일치'],
      [null, null, '=INDEX(Data!A2:A6,MATCH(30,Data!B2:B6,0))', 'INDEX+MATCH'],
      [null, null, '=MATCH("포도",Data!A2:A6,0)', 'MATCH 위치'],
      [null, null, '=Data!E9', '다른 시트 빈 셀은 0'],
      [null, null, '=C2+C3', '수식 셀을 참조하는 수식(연쇄 재계산)'],
    ],
  },
  {
    name: 'Data',
    plain: true,
    extra: {
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
    },
    rows: [],
  },
  {
    name: '매출 자료',
    plain: true,
    extra: { A1: 100, A2: 250 },
    rows: [],
  },
  {
    name: 'DateSerial',
    rows: [
      [null, null, '=DATE(1900,1,1)', '일련번호 기준 1900-01-01 = 1'],
      [null, null, '=DATE(1900,2,28)', '1900-02-28 = 59'],
      [null, null, '=DATE(1900,2,29)', '없는 날짜 1900-02-29(1900 윤년 버그)'],
      [null, null, '=DATE(1900,3,1)', '1900-03-01 = 61'],
      [null, null, '=DATE(2024,2,29)', '실제 윤년'],
      [null, null, '=DATE(2023,2,29)', '없는 날짜는 다음 달로 넘김'],
      [null, null, '=DATE(2024,13,1)', '13월은 다음 해 1월'],
      [null, null, '=DATE(2024,1,0)', '0일은 전달 말일'],
      [60, null, '=YEAR(A10)', '일련번호 60의 연도'],
      [60, null, '=MONTH(A11)', '일련번호 60의 월'],
      [60, null, '=DAY(A12)', '일련번호 60의 일'],
      [61, null, '=DAY(A13)', '일련번호 61의 일'],
      [null, null, '=DATEVALUE("2024-03-15")', 'ISO 날짜 문자열 해석'],
      [null, null, '=DATE(2024,12,25)-DATE(2024,1,1)', '날짜 차(일수)'],
      [null, null, '=DATEDIF(DATE(2000,5,15),DATE(2024,3,15),"Y")', 'DATEDIF 만 나이'],
      [null, null, '=WEEKDAY(DATE(2024,3,15))', 'WEEKDAY 금요일'],
      [1, null, '=WEEKDAY(A18)', 'WEEKDAY: 1900-01-01을 일요일로 봄'],
      [45366, null, '=YEAR(A19)*10000+MONTH(A19)*100+DAY(A19)', '일련번호 → 연월일'],
    ],
  },
  {
    name: 'ErrorValues',
    rows: [
      [null, null, '=1/0', '#DIV/0! 상수'],
      [5, 0, '=A3/B3', '#DIV/0! 셀 참조'],
      [null, null, '="가"+1', '#VALUE! 문자 산술'],
      [null, null, '=SQRT(-1)', '#NUM! 음수 제곱근'],
      [null, null, '=DATE(-1,1,1)', '#NUM! 범위 밖 날짜'],
      [null, null, '=FOOBAR(1)', '#NAME? 없는 함수'],
      [null, null, '=SUMM(1,2)', '#NAME? 함수 이름 오타'],
      [null, null, '=VLOOKUP("수박",Data!A2:C6,2,FALSE)', '#N/A VLOOKUP 못 찾음'],
      [null, null, '=MATCH(999,Data!B2:B6,0)', '#N/A MATCH 못 찾음'],
      [null, null, '=INDEX(Data!A2:A6,10)', '#REF! INDEX 범위 밖'],
      [null, null, '=VLOOKUP("사과",Data!A2:C6,5,FALSE)', '#REF! VLOOKUP 열 번호 초과'],
      [1, 2, '=SUM(A13:A14 B13:B14)', '#NULL! 겹치지 않는 범위 교집합(공백 연산자)'],
      [null, null, '=1/0+1', '오류 전파'],
      [null, null, '=IF(1/0>1,1,2)', '조건식 오류 전파'],
      [null, null, '=IFERROR(1/0,"대체")', 'IFERROR 오류 대체'],
      [null, null, '=ISERROR(1/0)', 'ISERROR'],
      [null, null, '=SQRT("abc")', '#VALUE! 함수 인수 형식'],
    ],
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
  if (typeof value === 'string' && value.startsWith('=')) {
    // 결과 값(<v>)은 쓰지 않는다. Excel이 열 때 fullCalcOnLoad로 계산한다.
    return `<c r="${ref}"><f>${escapeXml(value.slice(1))}</f></c>`;
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
    spec.rows.forEach((cells, index) => cells.forEach((value, col) => put(index + 2, col, value)));
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
    `<cols><col min="3" max="3" width="40" customWidth="1"/><col min="4" max="4" width="44" customWidth="1"/></cols>` +
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
const formulaCount = SHEETS.reduce(
  (sum, spec) =>
    sum +
    spec.rows.filter((cells) => typeof cells[2] === 'string' && cells[2].startsWith('=')).length,
  0,
);
console.log(`${OUTPUT} 작성 완료: 시트 ${SHEETS.length}개, 수식 ${formulaCount}개`);
