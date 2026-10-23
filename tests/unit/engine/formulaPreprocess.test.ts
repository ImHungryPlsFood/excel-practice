import { describe, expect, it } from 'vitest';

import { HyperFormulaAdapter } from '@/engine/spreadsheet/adapters/HyperFormulaAdapter';
import { normalizeNumberLiterals, quoteSheetNames } from '@/engine/spreadsheet/formulaPreprocess';

describe('지수 표기 전처리 (D-4)', () => {
  it.each([
    ['=1E+3', '=1000'],
    ['=1E3', '=1000'],
    ['=2.5E-1', '=0.25'],
    ['=1.5E2', '=150'],
    ['=1.5e2', '=150'],
    ['=.5E2', '=50'],
    ['=1E-7', '=0.0000001'],
    ['=1E+20', '=100000000000000000000'],
    ['=12.345E1', '=123.45'],
    ['=1E+0', '=1'],
    ['=0E+5', '=0'],
    ['=A7*1E+3', '=A7*1000'],
    ['=1E+3+1E-3', '=1000+0.001'],
    ['={1E3,2E0}', '={1000,2}'],
    ['=SUM(1E3,2.5E-1)', '=SUM(1000,0.25)'],
  ])('숫자 토큰을 풀어 쓴다: %s', (input, expected) => {
    expect(normalizeNumberLiterals(input)).toBe(expected);
  });

  it.each([
    '=E1',
    '=AE10',
    '=$E$1',
    '=E1+AE10*$E2',
    '=SUM(E1:E10)',
    '=SUM(AE1E3:AE9)',
    '=LOG10(E1)',
    '=E1E3',
    '=B2E3',
    '=Sheet1!E1',
    '=E1*2',
  ])('셀 주소와 식별자는 바꾸지 않는다: %s', (input) => {
    expect(normalizeNumberLiterals(input)).toBe(input);
  });

  it.each([
    '="1E+3"',
    '="1E3 and 2E-1"',
    '="그는 ""1E3""라고 했다"',
    '=A1&"x1E3"&B1',
    '=IF(A1="1E+3",1E3,0)',
  ])('큰따옴표 문자열 안은 바꾸지 않는다: %s', (input) => {
    const out = normalizeNumberLiterals(input);
    // 문자열 안의 글자는 그대로 남아야 한다.
    for (const match of input.matchAll(/"(?:[^"]|"")*"/g)) {
      expect(out).toContain(match[0]);
    }
  });

  it('큰따옴표 문자열 밖의 숫자만 바꾼다', () => {
    expect(normalizeNumberLiterals('=IF(A1="1E+3",1E3,0)')).toBe('=IF(A1="1E+3",1000,0)');
    expect(normalizeNumberLiterals('="1E3"&1E3')).toBe('="1E3"&1000');
  });

  it.each(["='Sheet 1E3'!A1", "='It''s 1E+3'!A1+1", "=SUM('매출 2E1'!A1:A3)", "='1E3'!E1"])(
    '작은따옴표 시트 이름 안은 바꾸지 않는다: %s',
    (input) => {
      expect(normalizeNumberLiterals(input)).toBe(input);
    },
  );

  it('시트 이름 밖의 숫자만 바꾼다', () => {
    expect(normalizeNumberLiterals("='Sheet 1E3'!A1*1E3")).toBe("='Sheet 1E3'!A1*1000");
  });

  it('수식이 아닌 값은 그대로 둔다', () => {
    expect(normalizeNumberLiterals('1E+3')).toBe('1E+3');
    expect(normalizeNumberLiterals("'1E3")).toBe("'1E3");
    expect(normalizeNumberLiterals('')).toBe('');
  });

  it('지수 부분이 숫자가 아니거나 너무 크면 바꾸지 않는다', () => {
    expect(normalizeNumberLiterals('=5E')).toBe('=5E');
    expect(normalizeNumberLiterals('=5E+')).toBe('=5E+');
    expect(normalizeNumberLiterals('=1E+400')).toBe('=1E+400');
  });

  it('닫히지 않은 따옴표도 이후 글자를 바꾸지 않고 끝낸다', () => {
    expect(normalizeNumberLiterals('="1E3')).toBe('="1E3');
    expect(normalizeNumberLiterals("='Sheet 1E3")).toBe("='Sheet 1E3");
  });
});

describe('어댑터에서의 지수 표기 (셀 주소·문자열·시트 이름이 보존된다)', () => {
  const engine = new HyperFormulaAdapter();

  it('지수 표기 수식이 계산된다', async () => {
    await engine.initWorkbook({ S: [[2, '=A1*1E+3', '=1.5e2+2.5E-1']] });
    expect(engine.getCellValue('S', 0, 1).value).toBe(2000);
    expect(engine.getCellValue('S', 0, 2).value).toBe(150.25);
  });

  it('E1·AE10 셀 주소를 참조해도 값이 바뀌지 않는다', async () => {
    await engine.initWorkbook({ S: [[]] });
    engine.setCellContent('S', 0, 4, 7); // E1
    engine.setCellContent('S', 9, 30, 11); // AE10
    engine.setCellContent('S', 1, 0, '=E1+AE10');
    engine.setCellContent('S', 2, 0, '=SUM(E1:E1)*1E+1');
    expect(engine.getCellValue('S', 1, 0).value).toBe(18);
    expect(engine.getCellValue('S', 2, 0).value).toBe(70);
  });

  it('큰따옴표 문자열 안의 1E+3은 그대로다', async () => {
    await engine.initWorkbook({ S: [['="값 1E+3 "&1E+3']] });
    expect(engine.getCellValue('S', 0, 0).value).toBe('값 1E+3 1000');
  });

  it('작은따옴표 시트 이름 안의 글자는 그대로라 참조가 이어진다', async () => {
    await engine.initWorkbook({ 'Sheet 1E3': [[5]], "It's 1E+3": [[6]], S: [[]] });
    engine.setCellContent('S', 0, 0, "='Sheet 1E3'!A1*1E+1");
    engine.setCellContent('S', 1, 0, "='It''s 1E+3'!A1+1E1");
    expect(engine.getCellValue('S', 0, 0).value).toBe(50);
    expect(engine.getCellValue('S', 1, 0).value).toBe(16);
  });
});

describe('길이 상한(S-09)은 지수 표기를 풀어 쓴 뒤에도 적용된다', () => {
  it('풀어 쓴 수식이 1000자를 넘으면 거부한다', async () => {
    const engine = new HyperFormulaAdapter();
    await engine.initWorkbook({ S: [[]] });
    const formula = `=${Array.from({ length: 5 }, () => '1E+250').join('+')}`;
    expect(formula.length).toBeLessThan(1000);
    expect(() => engine.setCellContent('S', 0, 0, formula)).toThrow('1000자');
  });
});

describe('따옴표 없는 한글 시트 이름 (D-15, CARD-02D)', () => {
  it.each([
    ['=자료!A1', "='자료'!A1"],
    ['=SUM(판매_1!A1:A3)*2', "=SUM('판매_1'!A1:A3)*2"],
    ['=Data자료!B2', "='Data자료'!B2"],
    ['=자료!A1+출석!$B$2', "='자료'!A1+'출석'!$B$2"],
  ])('%s → %s', (input, expected) => {
    expect(quoteSheetNames(input)).toBe(expected);
  });

  it.each(['=Sheet2!A1', "='자료'!A1", '="자료!A1"', '=합계', '=A1&"원"', '자료!A1'])(
    '%s 는 그대로 둔다',
    (input) => {
      expect(quoteSheetNames(input)).toBe(input);
    },
  );

  it('엔진에서 한글 시트 참조가 계산된다', async () => {
    const engine = new HyperFormulaAdapter();
    await engine.initWorkbook({ 입력: [[4, 6]], 계산: [['=입력!A1^2']] });
    engine.setCellContent('계산', 1, 0, '=SUM(입력!A1:B1)*1E+1');
    expect(engine.getCellValue('계산', 0, 0).value).toBe(16);
    expect(engine.getCellValue('계산', 1, 0).value).toBe(100);
    engine.destroy();
  });
});
