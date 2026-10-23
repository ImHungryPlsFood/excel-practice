/*
 * 어댑터의 Excel 규칙 함수 교체 단위 테스트 (CARD-02B 추가 작업).
 * 기대값은 Microsoft 지원 문서의 함수 설명과 2차 골든(Excel 계산값)에서 확인한 규칙이다.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { HyperFormulaAdapter } from '@/engine/spreadsheet/adapters/HyperFormulaAdapter';
import { formatTextValue, roundDecimal } from '@/engine/spreadsheet/excelFormat';

const engine = new HyperFormulaAdapter();

beforeAll(async () => {
  await engine.initWorkbook({
    S: [
      ['사과', 12, '영업'],
      ['배', 7, '개발'],
      ['귤', 30, '영업'],
      ['포도', 5, '인사'],
    ],
  });
});

afterAll(() => {
  engine.destroy();
});

/** 수식을 임시 칸(20행)에 넣어 값을 읽는다. */
function evaluate(formula: string) {
  engine.setCellContent('S', 20, 0, formula);
  const result = engine.getCellValue('S', 20, 0);
  return result.error ? result.error.code : result.value;
}

describe('roundDecimal', () => {
  it.each([
    [2.5, 0, 'round', 3],
    [-2.5, 0, 'round', -3],
    [1.005, 2, 'round', 1.01],
    [-1.005, 2, 'round', -1.01],
    [0.285, 2, 'round', 0.29],
    [0.1 + 0.2, 1, 'round', 0.3],
    [1234.5678, -2, 'round', 1200],
    [3.14159, 2.9, 'round', 3.14],
    [3.0000001, 0, 'up', 4],
    [-3.141, 1, 'up', -3.2],
    [0.1 + 0.2, 1, 'up', 0.3],
    [-3.789, 1, 'down', -3.7],
    [3.789, -1, 'down', 0],
    [2.9999999999, 0, 'down', 2],
    [0, 3, 'round', 0],
  ] as const)('%s, 자릿수 %s, %s → %s', (value, places, mode, expected) => {
    expect(roundDecimal(value, places, mode)).toBe(expected);
  });

  it('음수가 0으로 반올림되면 -0이 아니라 0이다', () => {
    expect(Object.is(roundDecimal(-0.001, 1, 'round'), 0)).toBe(true);
  });
});

describe('INT·ROUND 계열 (수식)', () => {
  it.each([
    ['=INT(-1.5)', -2],
    ['=INT(1.5)', 1],
    ['=INT(-2)', -2],
    ['=ROUND(1.005,2)', 1.01],
    ['=ROUND(3.14159,2.9)', 3.14],
    ['=ROUNDUP(-3.141,1)', -3.2],
    ['=ROUNDDOWN(3.789,-1)', 0],
    ['=ROUND(2.5)', 3],
  ])('%s = %s', (formula, expected) => {
    expect(evaluate(formula)).toBe(expected);
  });
});

describe('EDATE·DATEDIF', () => {
  it.each([
    ['=EDATE(DATE(2024,1,31),1)', 45351], // 2024-02-29
    ['=EDATE(DATE(2023,1,31),1)', 44985], // 2023-02-28
    ['=EDATE(DATE(2024,3,31),-1)', 45351],
    ['=EDATE(DATE(2024,1,15),12)', 45672], // 2025-01-15
    ['=EDATE(DATE(2024,1,15),1.9)', 45337], // 개월은 버림: 2024-02-15
  ])('%s', (formula, expected) => {
    expect(evaluate(formula)).toBe(expected);
  });

  it('EDATE: 2024-12-31 + 2개월 = 2025-02-28', () => {
    expect(evaluate('=EDATE(DATE(2024,12,31),2)')).toBe(evaluate('=DATE(2025,2,28)'));
  });

  it.each([
    ['"Y"', 23],
    ['"y"', 23],
    ['"M"', 286],
    ['"m"', 286],
    ['"YM"', 10],
    ['"ym"', 10],
    ['"D"', 8705],
    ['"MD"', 0],
  ])('DATEDIF 단위 %s = %s', (unit, expected) => {
    expect(evaluate(`=DATEDIF(DATE(2000,5,15),DATE(2024,3,15),${unit})`)).toBe(expected);
  });

  it('DATEDIF: 잘못된 단위와 거꾸로 된 날짜는 #NUM!', () => {
    expect(evaluate('=DATEDIF(DATE(2000,5,15),DATE(2024,3,15),"X")')).toBe('#NUM!');
    expect(evaluate('=DATEDIF(DATE(2024,3,15),DATE(2000,5,15),"Y")')).toBe('#NUM!');
  });
});

describe('MATCH 와일드카드', () => {
  it.each([
    ['=MATCH("사*",A1:A4,0)', 1],
    ['=MATCH("?",A1:A4,0)', 2],
    ['=MATCH("*도",A1:A4,0)', 4],
    ['=MATCH("사과",A1:A4,0)', 1],
    ['=MATCH("사?",A1:A4,0)', 1],
    ['=MATCH("*없음*",A1:A4,0)', '#N/A'],
    ['=MATCH(30,B1:B4,0)', 3],
    ['=MATCH("영업",C1:C4,0)', 1],
  ])('%s = %s', (formula, expected) => {
    expect(evaluate(formula)).toBe(expected);
  });

  it('~ 뒤의 * 는 글자 그대로 찾는다', () => {
    engine.setCellContent('S', 25, 0, 'a*b');
    engine.setCellContent('S', 26, 0, 'axb');
    expect(evaluate('=MATCH("a~*b",A26:A27,0)')).toBe(1);
    expect(evaluate('=MATCH("a*b",A26:A27,0)')).toBe(1);
    expect(evaluate('=MATCH("a~?b",A26:A27,0)')).toBe('#N/A');
  });

  it('근사 일치는 정렬된 범위에서 이전과 같다', () => {
    engine.setCellContent('S', 30, 0, 0);
    engine.setCellContent('S', 31, 0, 60);
    engine.setCellContent('S', 32, 0, 70);
    engine.setCellContent('S', 33, 0, 80);
    expect(evaluate('=MATCH(75,A31:A34,1)')).toBe(3);
    expect(evaluate('=MATCH(75,A31:A34)')).toBe(3);
    expect(evaluate('=MATCH(-1,A31:A34,1)')).toBe('#N/A');
  });
});

describe('INDEX 번호 하나 + 여러 행·열 범위', () => {
  it('열 번호가 없으면 #REF!', () => {
    expect(evaluate('=INDEX(A1:C4,2)')).toBe('#REF!');
  });
  it('한 열 범위·한 행 범위는 번호 하나로 된다', () => {
    expect(evaluate('=INDEX(A1:A4,2)')).toBe('배');
    expect(evaluate('=INDEX(A1:C1,2)')).toBe(12);
  });
});

describe('FILTER', () => {
  function column(formula: string, rows: number, col = 0): unknown[] {
    engine.setCellContent('S', 40, col, formula);
    return Array.from({ length: rows }, (_, i) => {
      const result = engine.getCellValue('S', 40 + i, col);
      return result.error ? result.error.code : result.value;
    });
  }

  it('한 열 원본', () => {
    expect(column('=FILTER(A1:A4,C1:C4="영업")', 3)).toEqual(['사과', '귤', null]);
  });

  it('여러 열 원본은 선택한 행의 모든 열', () => {
    engine.setCellContent('S', 40, 0, '=FILTER(A1:B4,C1:C4="영업")');
    expect([0, 1].map((c) => engine.getCellValue('S', 40, c).value)).toEqual(['사과', 12]);
    expect([0, 1].map((c) => engine.getCellValue('S', 41, c).value)).toEqual(['귤', 30]);
    expect(engine.getCellValue('S', 42, 0).value).toBeNull();
  });

  it('세 번째 인수는 if_empty다 (조건이 아니다)', () => {
    expect(column('=FILTER(A1:A4,C1:C4="영업",B1:B4>20)', 3)).toEqual(['사과', '귤', null]);
    expect(column('=FILTER(A1:A4,C1:C4="없음","없음")', 1)).toEqual(['없음']);
  });

  it('일치하는 값이 없고 if_empty가 없으면 #N/A (D-12)', () => {
    expect(column('=FILTER(A1:A4,C1:C4="없음")', 1)).toEqual(['#N/A']);
  });

  it('곱으로 만든 조건과 숫자 조건', () => {
    expect(column('=FILTER(A1:A4,(C1:C4="영업")*(B1:B4>20))', 2)).toEqual(['귤', null]);
    expect(column('=FILTER(A1:A4,B1:B4-5)', 4)).toEqual(['사과', '배', '귤', null]);
  });

  it('가로 방향 조건은 열을 거른다', () => {
    engine.setCellContent('S', 50, 0, '=FILTER(A1:C1,{1,0,1})');
    expect(engine.getCellValue('S', 50, 0).value).toBe('사과');
    expect(engine.getCellValue('S', 50, 1).value).toBe('영업');
  });

  it('조건의 크기가 맞지 않으면 #VALUE!', () => {
    expect(column('=FILTER(A1:A4,C1:C3="영업")', 1)).toEqual(['#VALUE!']);
  });

  it('조건에 문자가 있으면 #VALUE!', () => {
    expect(column('=FILTER(A1:A4,C1:C4)', 1)).toEqual(['#VALUE!']);
  });
});

describe('숫자 → 문자열 (CONCATENATE, TEXTJOIN, LEN)', () => {
  it.each([
    ['=CONCATENATE("x",0.1+0.2)', 'x0.3'],
    ['=CONCATENATE(A1,"-",B1)', '사과-12'],
    ['=CONCATENATE(TRUE,1/3)', 'TRUE0.333333333333333'],
    ['=TEXTJOIN(",",TRUE,0.1+0.2,1/3)', '0.3,0.333333333333333'],
    ['=TEXTJOIN("-",TRUE,A1:A2,C1:C2)', '사과-배-영업-개발'],
    ['=TEXTJOIN(,TRUE,"a","b")', 'ab'],
    ['=TEXTJOIN(",",FALSE,"a","","b")', 'a,,b'],
    ['=TEXTJOIN(",",TRUE,"a","","b")', 'a,b'],
    ['=LEN(0.1+0.2)', 3],
    ['=LEN(1/3)', 17],
    ['=LEN("")', 0],
    ['=LEN(A1)', 2],
    ['=LEN(123.50)', 5],
  ])('%s = %s', (formula, expected) => {
    expect(evaluate(formula)).toBe(expected);
  });

  it('오류는 그대로 전달된다', () => {
    expect(evaluate('=LEN(1/0)')).toBe('#DIV/0!');
    expect(evaluate('=CONCATENATE("a",NA())')).toBe('#N/A');
    expect(evaluate('=TEXTJOIN(",",TRUE,"a",1/0)')).toBe('#DIV/0!');
  });
});

describe('TEXT: 지원하는 서식은 정확히, 나머지는 오류', () => {
  it.each([
    [1234.5, '#,##0.00', '1,234.50'],
    [1234.5, '#,##0', '1,235'],
    [1234567.891, '#,##0.0', '1,234,567.9'],
    [-1234.5, '#,##0.00', '-1,234.50'],
    [-0.001, '0.00', '0.00'],
    [1234.5, '0.0', '1234.5'],
    [5, '000', '005'],
    [-5, '000', '-005'],
    [1234, '0', '1234'],
    [0.256, '0%', '26%'],
    [0.256, '0.0%', '25.6%'],
    [1.005, '0.00', '1.01'],
    [0, '0.00', '0.00'],
  ])('숫자 %s, 서식 %s → %s', (value, format, expected) => {
    const result = formatTextValue(value, format, () => undefined);
    expect(result).toEqual({ kind: 'text', text: expected });
  });

  const toDate = (serial: number) =>
    serial === 45366 ? { year: 2024, month: 3, day: 5 } : undefined;

  it.each([
    ['yyyy-mm-dd', '2024-03-05'],
    ['YYYY/MM/DD', '2024/03/05'],
    ['yyyy.m.d', '2024.3.5'],
    ['m/d', '3/5'],
    ['mm/dd/yyyy', '03/05/2024'],
    ['yy', '24'],
    ['yyyy', '2024'],
    ['d m yyyy', '5 3 2024'],
  ])('날짜 서식 %s → %s', (format, expected) => {
    expect(formatTextValue(45366, format, toDate)).toEqual({ kind: 'text', text: expected });
  });

  it.each([
    'hh:mm',
    'mmm',
    'dddd',
    '₩#,##0',
    'yyyy"년"',
    '0.0E+00',
    '@',
    '#,##0.00;[Red]-#,##0.00',
    '',
    'abc',
  ])('지원하지 않는 서식 %j', (format) => {
    expect(formatTextValue(45366, format, toDate)).toEqual({ kind: 'unsupported-format' });
  });

  it('날짜로 바꿀 수 없는 값은 invalid-value', () => {
    expect(formatTextValue(0, 'yyyy-mm-dd', toDate)).toEqual({ kind: 'invalid-value' });
  });

  it('수식: 지원하는 서식은 Excel 값, 지원하지 않는 서식은 #VALUE!와 안내', () => {
    expect(evaluate('=TEXT(1234.5,"#,##0.00")')).toBe('1,234.50');
    expect(evaluate('=TEXT(0.256,"0%")')).toBe('26%');
    expect(evaluate('=TEXT(DATE(2024,3,15),"yyyy-mm-dd")')).toBe('2024-03-15');
    expect(evaluate('=TEXT(DATE(2024,3,15),"m/d")')).toBe('3/15');
    engine.setCellContent('S', 20, 0, '=TEXT(1234.5,"₩#,##0")');
    const result = engine.getCellValue('S', 20, 0);
    expect(result.error?.code).toBe('#VALUE!');
    expect(result.error?.message).toContain('지원하지 않는 서식입니다');
    expect(result.error?.message).toContain('#,##0.00');
  });
});

// 숫자 인수를 문자열로 바꾸는 텍스트 함수. 기대값은 Microsoft 지원 문서의 함수 설명과 "숫자는 유효 숫자 15자리로 문자열이 된다"는
// 규칙에서 계산한 값이다. 아직 Excel로 실측하지 않았다(docs/EXCEL_DIFFERENCES.md "다음 골든 라운드 확인 목록").
describe('텍스트 함수의 숫자 인수 (15자리 규칙, Excel 실측 전)', () => {
  it.each([
    ['=LEFT(0.1+0.2,5)', '0.3'],
    ['=LEFT(1/3,5)', '0.333'],
    ['=RIGHT(1/3,3)', '333'],
    ['=RIGHT(0.1+0.2,2)', '.3'],
    ['=MID(1/3,3,4)', '3333'],
    ['=MID(0.1+0.2,3,5)', '3'],
    ['=FIND("3",0.1+0.2)', 3],
    ['=FIND(".",1/3)', 2],
    ['=FIND(0.3,0.1+0.2)', 1],
    ['=SEARCH("3",0.1+0.2)', 3],
    ['=SEARCH(".?",1/3)', 2],
    ['=SUBSTITUTE(0.1+0.2,"3","x")', '0.x'],
    ['=SUBSTITUTE(1/3,"3","")', '0.'],
    ['=SUBSTITUTE("a-b",0.1+0.2,"x")', 'a-b'],
    ['=SUBSTITUTE("a",1/3,0.1+0.2)', 'a'],
    ['=REPLACE(0.1+0.2,3,1,"x")', '0.x'],
    ['=REPLACE("abc",2,1,0.1+0.2)', 'a0.3c'],
    ['=REPT(0.1+0.2,2)', '0.30.3'],
    ['=UPPER(TRUE)', 'TRUE'],
    ['=LOWER(TRUE)', 'true'],
    ['=UPPER(1/3)', '0.333333333333333'],
    ['=PROPER(1/3)', '0.333333333333333'],
    ['=EXACT(0.1+0.2,0.3)', true],
    ['=EXACT(1/3,"0.333333333333333")', true],
    ['=CLEAN(0.1+0.2)', '0.3'],
    ['=TRIM(0.1+0.2)', '0.3'],
  ])('%s = %j', (formula, expected) => {
    expect(evaluate(formula)).toBe(expected);
  });

  it.each([
    ['=LEFT("abc")', 'a'],
    ['=LEFT("abc",10)', 'abc'],
    ['=LEFT("abc",-1)', '#VALUE!'],
    ['=RIGHT("abc")', 'c'],
    ['=RIGHT("abc",0)', ''],
    ['=RIGHT("abc",-1)', '#VALUE!'],
    ['=MID("abcdef",2,3)', 'bcd'],
    ['=MID("abc",5,2)', ''],
    ['=MID("abc",0,1)', '#VALUE!'],
    ['=FIND("b","abcb")', 2],
    ['=FIND("b","abcb",3)', 4],
    ['=FIND("B","abc")', '#VALUE!'],
    ['=FIND("a","abc",4)', '#VALUE!'],
    ['=SEARCH("B?","abc")', 2],
    ['=SEARCH("B","abc")', 2],
    ['=SEARCH("z","abc")', '#VALUE!'],
    ['=SUBSTITUTE("a-b-c","-","+")', 'a+b+c'],
    ['=SUBSTITUTE("a-b-c","-","+",2)', 'a-b+c'],
    ['=SUBSTITUTE("a-b-c","-","+",5)', 'a-b-c'],
    ['=SUBSTITUTE("aaa","a","b")', 'bbb'],
    ['=SUBSTITUTE("aaa","aa","b")', 'ba'],
    ['=SUBSTITUTE("a","","x")', 'a'],
    ['=SUBSTITUTE("$a","a","$&")', '$$&'],
    ['=SUBSTITUTE("a-b","-","+",0)', '#VALUE!'],
    ['=REPLACE("abcdef",2,3,"X")', 'aXef'],
    ['=REPLACE("abc",0,1,"X")', '#VALUE!'],
    ['=REPT("ab",3)', 'ababab'],
    ['=REPT("a",0)', ''],
    ['=REPT("a",-1)', '#VALUE!'],
    ['=REPT("a",32768)', '#VALUE!'],
    ['=REPT("ab",16384)', '#VALUE!'],
    ['=LEN(REPT("a",32767))', 32767],
    ['=UPPER("abc")&LOWER("ABC")&PROPER("hello world")', 'ABCabcHello World'],
    ['=TRIM("  a   b  ")', 'a b'],
    ['=EXACT("a","A")', false],
  ])('기존 동작은 그대로: %s = %j', (formula, expected) => {
    expect(evaluate(formula)).toBe(expected);
  });

  it('오류와 빈 셀', () => {
    expect(evaluate('=UPPER(1/0)')).toBe('#DIV/0!');
    expect(evaluate('=LEFT(NA(),1)')).toBe('#N/A');
    expect(evaluate('=FIND(1/0,"abc")')).toBe('#DIV/0!');
    expect(evaluate('=SUBSTITUTE("a",NA(),"b")')).toBe('#N/A');
    expect(evaluate('=UPPER(Z99)')).toBe('');
    expect(evaluate('=LEFT(Z99,1)')).toBe('');
    expect(evaluate('=REPT(Z99,3)')).toBe('');
  });
});
