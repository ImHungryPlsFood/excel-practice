/*
 * 학습용 지원 함수 목록 (CARD-02B, R-08.21, R-08.25).
 * 이 목록은 "엔진이 실제로 계산한다"고 테스트로 확인된 함수만 담는다(formula-eval.test.ts가 엔진과 대조).
 * 엔진에 등록된 전체 함수(약 400개)는 FormulaEngineAdapter.isFunctionSupported로 확인한다.
 */

export type FunctionCategory = '수학' | '통계' | '논리' | '텍스트' | '날짜' | '조회' | '오류 처리';

export interface SupportedFunction {
  name: string;
  category: FunctionCategory;
  summary: string;
}

export const SUPPORTED_FUNCTIONS: readonly SupportedFunction[] = [
  { name: 'SUM', category: '수학', summary: '숫자의 합계' },
  { name: 'SUMIF', category: '수학', summary: '조건에 맞는 셀의 합계' },
  { name: 'SUMIFS', category: '수학', summary: '여러 조건에 맞는 셀의 합계' },
  { name: 'ROUND', category: '수학', summary: '지정한 자릿수로 반올림' },
  { name: 'ROUNDUP', category: '수학', summary: '지정한 자릿수로 올림' },
  { name: 'ROUNDDOWN', category: '수학', summary: '지정한 자릿수로 내림' },
  { name: 'SQRT', category: '수학', summary: '제곱근' },
  { name: 'AVERAGE', category: '통계', summary: '평균' },
  { name: 'MIN', category: '통계', summary: '최솟값' },
  { name: 'MAX', category: '통계', summary: '최댓값' },
  { name: 'COUNT', category: '통계', summary: '숫자가 든 셀 개수' },
  { name: 'COUNTA', category: '통계', summary: '비어 있지 않은 셀 개수' },
  { name: 'COUNTIF', category: '통계', summary: '조건에 맞는 셀 개수' },
  { name: 'COUNTIFS', category: '통계', summary: '여러 조건에 맞는 셀 개수' },
  { name: 'IF', category: '논리', summary: '조건에 따라 다른 값' },
  { name: 'AND', category: '논리', summary: '모든 조건이 참인지' },
  { name: 'OR', category: '논리', summary: '하나라도 참인지' },
  { name: 'NOT', category: '논리', summary: '참·거짓 뒤집기' },
  { name: 'IFERROR', category: '오류 처리', summary: '오류일 때 대신 쓸 값' },
  { name: 'LEFT', category: '텍스트', summary: '왼쪽에서 글자 추출' },
  { name: 'RIGHT', category: '텍스트', summary: '오른쪽에서 글자 추출' },
  { name: 'MID', category: '텍스트', summary: '가운데에서 글자 추출' },
  { name: 'LEN', category: '텍스트', summary: '글자 수' },
  { name: 'TRIM', category: '텍스트', summary: '불필요한 공백 제거' },
  { name: 'CONCATENATE', category: '텍스트', summary: '문자열 잇기' },
  {
    name: 'CONCAT',
    category: '텍스트',
    summary: '문자열·범위 잇기 (어댑터 구현, excelCompatPlugin.ts)',
  },
  { name: 'TEXTJOIN', category: '텍스트', summary: '구분 기호로 문자열 잇기' },
  { name: 'DATE', category: '날짜', summary: '연·월·일로 날짜 만들기' },
  { name: 'YEAR', category: '날짜', summary: '날짜의 연도' },
  { name: 'MONTH', category: '날짜', summary: '날짜의 월' },
  { name: 'DAY', category: '날짜', summary: '날짜의 일' },
  { name: 'TODAY', category: '날짜', summary: '오늘 날짜' },
  { name: 'NOW', category: '날짜', summary: '현재 날짜와 시각' },
  { name: 'DATEDIF', category: '날짜', summary: '두 날짜 사이의 기간' },
  { name: 'VLOOKUP', category: '조회', summary: '첫 열에서 찾아 같은 행 값 반환' },
  { name: 'XLOOKUP', category: '조회', summary: '범위에서 찾아 대응 값 반환' },
  { name: 'INDEX', category: '조회', summary: '범위에서 위치로 값 반환' },
  { name: 'MATCH', category: '조회', summary: '범위에서 값의 위치' },
];

/**
 * Excel에는 있지만 이 엔진이 계산하지 못하는 함수 (R-08.25).
 * 입력하면 #NAME?과 함께 아래 안내를 보여 준다. 근거는 docs/EXCEL_DIFFERENCES.md.
 */
export const KNOWN_UNSUPPORTED_FUNCTIONS: Readonly<Record<string, string>> = {
  AVERAGEIFS:
    'AVERAGEIFS는 지원하지 않습니다. SUMIFS 결과를 같은 조건의 COUNTIFS 결과로 나눠 구하세요.',
  RANK: 'RANK는 지원하지 않습니다. COUNTIF(범위,">"&값)+1로 순위를 구하세요.',
  'RANK.EQ': 'RANK.EQ는 지원하지 않습니다. COUNTIF(범위,">"&값)+1로 순위를 구하세요.',
  XMATCH: 'XMATCH는 지원하지 않습니다. MATCH(찾을 값, 범위, 0)를 사용하세요.',
};
