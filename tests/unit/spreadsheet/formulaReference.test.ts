import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  formatCellReference,
  parseCellReference,
  toggleReferenceAt,
} from '@/components/spreadsheet/formulaReference';

describe('F4 참조 고정 순환 (Q-06)', () => {
  it('A1 → $A$1 → A$1 → $A1 → A1 순서로 바꾼다', () => {
    const steps = ['=A1', '=$A$1', '=A$1', '=$A1', '=A1'];
    let text = steps[0] ?? '';
    for (const expected of steps.slice(1)) {
      text = toggleReferenceAt(text, text.length).text;
      expect(text).toBe(expected);
    }
  });

  it('커서가 참조 안이나 바로 뒤에 있으면 그 참조를 바꾸고 커서를 참조 끝에 둔다', () => {
    expect(toggleReferenceAt('=B12+C3', 2)).toEqual({ text: '=$B$12+C3', caret: 6, changed: true });
    expect(toggleReferenceAt('=B12+C3', 4)).toEqual({ text: '=$B$12+C3', caret: 6, changed: true });
    expect(toggleReferenceAt('=B12+C3', 7)).toEqual({ text: '=B12+$C$3', caret: 9, changed: true });
  });

  it('범위는 커서가 있는 끝만 바꾼다', () => {
    expect(toggleReferenceAt('=SUM(A1:B2)', 6).text).toBe('=SUM($A$1:B2)');
    expect(toggleReferenceAt('=SUM(A1:B2)', 10).text).toBe('=SUM(A1:$B$2)');
  });

  it('시트 이름이 붙은 참조는 셀 부분만 바꾼다', () => {
    expect(toggleReferenceAt('=Data!B2*2', 8).text).toBe('=Data!$B$2*2');
    const quoted = "='매출 자료'!A1";
    expect(toggleReferenceAt(quoted, quoted.length).text).toBe("='매출 자료'!$A$1");
  });

  it.each([
    ['문자열 안', '="A1"', 3],
    ['작은따옴표 시트 이름 안', "='A1 시트'!B2", 3],
    ['함수 이름(LOG10)', '=LOG10(100)', 4],
    ['시트 이름처럼 쓰인 토큰', '=AB1!C2', 3],
    ['숫자', '=1E3+2', 3],
    ['참조가 아닌 이름', '=TRUE', 3],
    ['범위를 벗어난 열', '=XFE1', 3],
    ['0행', '=A0', 3],
  ])('%s는 바꾸지 않는다', (_label, text, caret) => {
    expect(toggleReferenceAt(text, caret)).toEqual({ text, caret, changed: false });
  });

  it('커서 근처에 참조가 없으면 그대로 둔다', () => {
    expect(toggleReferenceAt('=A1 + 3', 6).changed).toBe(false);
  });
});

/*
 * Q-04 속성 기반 테스트 (F4 참조 순환성). 임의의 셀 참조와 앞뒤 수식에 대해
 *   1) F4를 네 번 누르면 원래 수식으로 돌아온다.
 *   2) 매 단계 가리키는 열과 행은 바뀌지 않고 $ 고정만 바뀐다.
 *   3) 참조 밖의 글자는 바뀌지 않는다.
 */
const columnLetters = fc.integer({ min: 1, max: 16_384 }).map((n) => {
  let label = '';
  for (let k = n; k > 0; k = Math.floor((k - 1) / 26)) {
    label = String.fromCharCode(65 + ((k - 1) % 26)) + label;
  }
  return label;
});

const reference = fc.record({
  colAbsolute: fc.boolean(),
  column: columnLetters,
  rowAbsolute: fc.boolean(),
  row: fc.integer({ min: 1, max: 1_048_576 }),
});

const surroundings = fc.constantFrom(
  ['=', ''],
  ['=SUM(', ')'],
  ['=', '*2+B$3'],
  ['=Data!', '+1'],
  ['="A1"&', ''],
  ["='시트 B2'!", ''],
  ['=IF(C1>0,', ',"x")'],
);

describe('F4 순환성 (Q-04, fast-check)', () => {
  it('네 번 누르면 원래대로 돌아오고, 가리키는 셀과 주변 글자는 그대로다', () => {
    fc.assert(
      fc.property(reference, surroundings, caretOffset(), (parts, [before, after], offset) => {
        const ref = formatCellReference(parts);
        const original = `${before}${ref}${after}`;
        let text = original;
        let start = before.length;
        let caret = start + Math.min(offset, ref.length);
        for (let i = 0; i < 4; i += 1) {
          const result = toggleReferenceAt(text, caret);
          expect(result.changed).toBe(true);
          const end = result.text.length - after.length;
          expect(result.text.slice(0, start)).toBe(before);
          expect(result.text.slice(end)).toBe(after);
          const toggled = parseCellReference(result.text.slice(start, end));
          expect(toggled?.column).toBe(parts.column);
          expect(toggled?.row).toBe(parts.row);
          text = result.text;
          caret = result.caret;
          start = before.length;
        }
        expect(text).toBe(original);
      }),
      { numRuns: 300 },
    );
  });
});

function caretOffset() {
  return fc.integer({ min: 0, max: 12 });
}
