/*
 * Excel 1900 날짜 체계의 일련번호 ↔ 날짜 변환 (CARD-02B, Q-07).
 * 1900-01-01 = 1. Excel은 Lotus 1-2-3 호환을 위해 1900년을 윤년으로 보아 존재하지 않는 1900-02-29에
 * 60을 부여한다. 그래서 1900-03-01부터는 실제 경과 일수보다 1이 크다.
 * 엔진(HyperFormula)도 같은 규칙(leapYear1900, nullDate 1899-12-31)으로 설정하며, 테스트가 둘을 대조한다.
 */

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

const MS_PER_DAY = 86_400_000;
const EPOCH = Date.UTC(1899, 11, 31); // 일련번호 0
const FAKE_LEAP_DAY_SERIAL = 60;

/** 일련번호의 정수 부분을 날짜로 바꾼다. 1 미만은 Excel 1900 체계에서 날짜가 아니므로 null. */
export function serialToDate(serial: number): CalendarDate | null {
  if (!Number.isFinite(serial)) {
    return null;
  }
  const whole = Math.floor(serial);
  if (whole < 1) {
    return null;
  }
  if (whole === FAKE_LEAP_DAY_SERIAL) {
    return { year: 1900, month: 2, day: 29 };
  }
  const days = whole > FAKE_LEAP_DAY_SERIAL ? whole - 1 : whole;
  const date = new Date(EPOCH + days * MS_PER_DAY);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

/** 날짜를 일련번호로 바꾼다. 1900-02-29는 60. 1900-01-01 이전이나 없는 날짜(예: 2023-02-29)는 null. */
export function dateToSerial({ year, month, day }: CalendarDate): number | null {
  if (year === 1900 && month === 2 && day === 29) {
    return FAKE_LEAP_DAY_SERIAL;
  }
  const time = Date.UTC(year, month - 1, day);
  const check = new Date(time);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  const days = Math.round((time - EPOCH) / MS_PER_DAY);
  if (days < 1) {
    return null;
  }
  return days >= FAKE_LEAP_DAY_SERIAL ? days + 1 : days;
}

/** 표시용 ISO 형식(YYYY-MM-DD). 한국어 서식(YYYY"년" MM"월" DD"일")은 셀 서식 기능(Phase 7)에서 다룬다. */
export function formatSerialAsIsoDate(serial: number): string | null {
  const date = serialToDate(serial);
  if (!date) {
    return null;
  }
  const mm = String(date.month).padStart(2, '0');
  const dd = String(date.day).padStart(2, '0');
  return `${String(date.year).padStart(4, '0')}-${mm}-${dd}`;
}
