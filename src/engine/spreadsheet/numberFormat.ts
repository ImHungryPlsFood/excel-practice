/*
 * Excel '일반' 서식에 가까운 숫자 → 문자열 변환 (CARD-02B).
 * Excel은 숫자를 유효 숫자 15자리까지만 보여 주고 문자열로 이을 때도 같은 규칙을 쓴다(0.1+0.2 → "0.3").
 * 지수 표기는 대문자 E. 열 너비에 따른 자릿수 줄임은 셀 서식 기능(Phase 7)에서 다룬다.
 */
export function formatGeneralNumber(value: number): string {
  return String(Number(value.toPrecision(15))).toUpperCase();
}
