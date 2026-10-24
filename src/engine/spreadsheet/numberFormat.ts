/*
 * Excel '일반' 서식에 가까운 숫자 → 문자열 변환 (CARD-02B).
 * Excel은 숫자를 유효 숫자 15자리까지만 보여 주고 문자열로 이을 때도 같은 규칙을 쓴다(0.1+0.2 → "0.3").
 * 지수 표기는 대문자 E. 열 너비에 따른 자릿수 줄임은 셀 서식 기능(Phase 7)에서 다룬다.
 */
export function formatGeneralNumber(value: number): string {
  return String(Number(value.toPrecision(15))).toUpperCase();
}

/**
 * 소수 자릿수. 유효 숫자 15자리로 정리한 값 기준이라 0.1+0.2는 1자리다.
 * 지수 표기로 나오는 아주 크거나 작은 수는 판단할 수 없어 Infinity를 돌려준다.
 */
export function decimalPlaces(value: number): number {
  const text = formatGeneralNumber(value);
  if (text.includes('E')) return Number.POSITIVE_INFINITY;
  return text.split('.')[1]?.length ?? 0;
}

/**
 * 채점에서 두 계산 결과가 같은지 본다 (docs/TEST_STRATEGY.md Q-02 "숫자 비교 기준").
 * 둘 다 숫자면 Excel이 보여 주는 유효 숫자 15자리로 정리한 값이 같을 때 같다고 본다.
 * 그 밖의 값(텍스트·논리값·빈 값)은 형식까지 정확히 같아야 한다.
 */
export function resultsMatch(
  actual: string | number | boolean | null,
  expected: string | number | boolean | null,
): boolean {
  if (typeof actual === 'number' && typeof expected === 'number') {
    return Number(actual.toPrecision(15)) === Number(expected.toPrecision(15));
  }
  return actual === expected;
}
