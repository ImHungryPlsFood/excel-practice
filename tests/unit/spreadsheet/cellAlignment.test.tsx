import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { cellValueKind, Spreadsheet } from '@/components/spreadsheet/Spreadsheet';
import { useWorkbook } from '@/components/spreadsheet/hooks/useWorkbook';

import { cellAt, installLayoutStubs } from '../helpers/layoutStubs';

/*
 * CARD-02D 셀 기본 정렬 (R-08.22). 서식이 없는 셀은 Excel 기본 표시대로
 * 숫자·날짜 오른쪽, 문자열(문자로 저장된 숫자 포함) 왼쪽, 논리값·오류 가운데.
 * 원문 글자가 아니라 엔진 계산 결과의 값 종류로 정한다.
 */

installLayoutStubs();

const DATA: readonly (readonly string[])[] = [
  ['123', "'123", '사과', 'TRUE', '=1/0', '2024-03-15', '=A1>100', '=A1&""', '50%', ''],
];

function Harness() {
  const workbook = useWorkbook(DATA);
  return <Spreadsheet workbook={workbook} label="작업 시트" rowCount={20} colCount={12} />;
}

/** 셀을 골라 값을 입력하고 Enter로 확정한다(사용자 입력 경로) */
function type(container: HTMLElement, row: number, col: number, value: string) {
  fireEvent.mouseDown(cellAt(container, row, col), { button: 0 });
  const input = screen.getByRole<HTMLInputElement>('textbox', { name: /^작업 시트 / });
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

async function setup() {
  const view = render(<Harness />);
  await waitFor(() => expect(cellAt(view.container, 0, 0)).toHaveTextContent('123'));
  return view;
}

describe('cellValueKind: 계산 결과로 값 종류를 정한다', () => {
  it.each([
    [{ value: 3, displayValue: '3', error: null }, 'number'],
    [{ value: 'a', displayValue: 'a', error: null }, 'text'],
    [{ value: true, displayValue: 'TRUE', error: null }, 'boolean'],
    [{ value: null, displayValue: '#DIV/0!', error: { code: '#DIV/0!', message: '' } }, 'error'],
    [{ value: null, displayValue: '', error: null }, 'empty'],
  ] as const)('%o → %s', (result, kind) => {
    expect(cellValueKind(result)).toBe(kind);
  });
});

describe('그리드 셀 기본 정렬 (R-08.22)', () => {
  it('값 종류에 따라 정렬된다', async () => {
    const { container } = await setup();
    const expectations: [number, string, string][] = [
      [0, 'number', 'text-right'], // 123
      [1, 'text', 'text-left'], // '123 → 문자로 저장된 숫자
      [2, 'text', 'text-left'], // 사과
      [3, 'boolean', 'text-center'], // TRUE
      [4, 'error', 'text-center'], // #DIV/0!
      [5, 'number', 'text-right'], // 날짜(일련번호)
      [6, 'boolean', 'text-center'], // 수식 결과 논리값
      [7, 'text', 'text-left'], // 수식 결과 문자열 "123"
      [8, 'number', 'text-right'], // 백분율
    ];
    for (const [col, kind, align] of expectations) {
      const cell = cellAt(container, 0, col);
      expect(cell, `열 ${col}`).toHaveAttribute('data-kind', kind);
      expect(cell, `열 ${col}`).toHaveClass(align);
    }
    expect(cellAt(container, 0, 1)).toHaveTextContent('123');
  });

  it('수식 결과가 바뀌면 정렬도 결과 종류를 따른다', async () => {
    const { container } = await setup();
    type(container, 1, 0, '=IF(A1>200,"큼",A1)');
    expect(cellAt(container, 1, 0)).toHaveAttribute('data-kind', 'number');
    expect(cellAt(container, 1, 0)).toHaveClass('text-right');
    type(container, 0, 0, '300');
    expect(cellAt(container, 1, 0)).toHaveTextContent('큼');
    expect(cellAt(container, 1, 0)).toHaveClass('text-left');
    type(container, 0, 0, '=1/0');
    expect(cellAt(container, 1, 0)).toHaveAttribute('data-kind', 'error');
    expect(cellAt(container, 1, 0)).toHaveClass('text-center');
  });

  it('셀에 직접 입력해도 같은 규칙이다 (편집 → 확정)', async () => {
    const { container } = await setup();
    type(container, 2, 0, '0012');
    expect(cellAt(container, 2, 0)).toHaveTextContent('12');
    expect(cellAt(container, 2, 0)).toHaveClass('text-right');
  });
});
