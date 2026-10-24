import { describe, expect, it } from 'vitest';

import { convertsNumbersToText, lintFormula } from '@/content/contentLint';
import type { LintRule } from '@/content/contentLint';

function rules(formula: string): LintRule[] {
  return lintFormula(formula).map((issue) => issue.rule);
}

describe('contentLint — CURRICULUM 1.3', () => {
  it.each(['=SUM(A1:A5)', '=IF(A1>0,"양수","음수")', '=INDEX(A1:C5,2,3)', '=ROUND(A1/3,2)'])(
    '지침을 지킨 수식 %s는 통과한다',
    (formula) => {
      expect(lintFormula(formula)).toEqual([]);
    },
  );

  it.each(['AVERAGEIFS', 'RANK', 'XMATCH', 'LOOKUP', 'SORTBY', 'LET', 'INDIRECT'])(
    '지원하지 않는 함수 %s를 찾아낸다',
    (name) => {
      expect(rules(`=${name}(A1,B1:B5)`)).toContain('UNSUPPORTED_FUNCTION');
      expect(rules(`=1+${name.toLowerCase()} (A1)`)).toContain('UNSUPPORTED_FUNCTION');
    },
  );

  it('문자열 안에 든 함수 이름은 무시한다', () => {
    expect(lintFormula('="RANK(A1)"')).toEqual([]);
  });

  it('INDEX의 행·열 번호 0을 찾아낸다', () => {
    expect(rules('=INDEX(A1:C5,0,2)')).toEqual(['INDEX_ZERO']);
    expect(rules('=INDEX(A1:C5,2,0)')).toEqual(['INDEX_ZERO']);
    expect(rules('=INDEX(A1:C5,10,2)')).toEqual([]);
  });

  it('DATEDIF의 "YD" 단위를 찾아낸다', () => {
    expect(rules('=DATEDIF(A1,B1,"YD")')).toEqual(['DATEDIF_YD']);
    expect(rules('=DATEDIF(A1,B1,"Y")')).toEqual([]);
  });

  it('TEXT는 숫자·백분율·날짜 서식만 허용한다', () => {
    for (const ok of [
      '0',
      '000',
      '0.00',
      '#,##0',
      '#,##0.00',
      '0%',
      '0.0%',
      'yyyy-mm-dd',
      'yy/mm/dd',
    ]) {
      expect(rules(`=TEXT(A1,"${ok}")`)).toEqual([]);
    }
    for (const bad of ['h:mm', 'mmmm', '₩#,##0', '0원', 'aaa']) {
      expect(rules(`=TEXT(A1,"${bad}")`)).toEqual(['TEXT_FORMAT']);
    }
  });

  describe('& 연산자와 소수 (D-9)', () => {
    it('소수가 될 수 있는 피연산자를 찾아낸다', () => {
      expect(rules('="합계: "&(0.1+0.2)')).toEqual(['AMPERSAND_DECIMAL']);
      expect(rules('="평균: "&A1/3')).toEqual(['AMPERSAND_DECIMAL']);
      expect(rules('=A1*0.1&"원"')).toEqual(['AMPERSAND_DECIMAL']);
      expect(rules('=SUM(A1:A3)/3&"점"')).toEqual(['AMPERSAND_DECIMAL']);
    });

    it('함수 인수 안쪽의 & 도 검사한다', () => {
      expect(rules('=IF(A1>0,"값: "&B1/3,"없음")')).toEqual(['AMPERSAND_DECIMAL']);
    });

    it('ROUND·TEXT 등으로 감싸면 통과한다', () => {
      expect(lintFormula('="합계: "&ROUND(A1/3,2)')).toEqual([]);
      expect(lintFormula('="합계: "&TEXT(A1/3,"0.00")')).toEqual([]);
      expect(lintFormula('=ROUNDUP(A1*0.1,0)&"원"')).toEqual([]);
    });

    it('& 가 없으면 나눗셈과 소수 리터럴도 문제 삼지 않는다', () => {
      expect(lintFormula('=A1/3')).toEqual([]);
      expect(lintFormula('=A1*0.1')).toEqual([]);
    });

    it('정수 피연산자와 문자열 안의 "/" 는 통과한다', () => {
      expect(lintFormula('=A1&"/"&B1')).toEqual([]);
      expect(lintFormula('=A1&" 3.5 "&B1')).toEqual([]);
    });
  });

  it('여러 위반을 한꺼번에 보고한다', () => {
    expect(rules('=RANK(A1,B1:B5)&A1/3')).toEqual(['UNSUPPORTED_FUNCTION', 'AMPERSAND_DECIMAL']);
  });
});

describe('convertsNumbersToText — 소수 교란 판정', () => {
  it.each([
    '="평균 "&AVERAGE(B2:B6)',
    '=A1&"원"',
    '=CONCAT("a",B2)',
    '=CONCATENATE(B2,"원")',
    '=TEXTJOIN("-",TRUE,B2:B6)',
    '=TEXT(B2,"0.00")',
    '=FIXED(B2,1)',
    '=IF(B2>0,"값 "&B2,"없음")',
  ])('값을 글자로 바꾸는 수식: %s', (formula) => {
    expect(convertsNumbersToText(formula)).toBe(true);
  });

  it.each([
    '=SUM(B2:B6)',
    '=ROUND(AVERAGE(B2:B6),2)',
    '=IF(B2>0,"양수","음수")',
    '="합계: "&ROUND(SUM(B2:B6),1)',
    '=CONCAT("a","&","b")',
    '=TEXTJOIN("-",TRUE,"a","b")',
    '=TEXT(ROUND(B2,1),"0.0")',
    '="a&b"',
  ])('글자로 바뀌어도 안정적이거나 바꾸지 않는 수식: %s', (formula) => {
    expect(convertsNumbersToText(formula)).toBe(false);
  });
});
