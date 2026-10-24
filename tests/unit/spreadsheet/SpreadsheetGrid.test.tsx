import { act, fireEvent, render, screen } from '@testing-library/react';
import { createRef, useState } from 'react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { SpreadsheetGrid } from '@/components/spreadsheet/SpreadsheetGrid';
import type { CellChange, SpreadsheetGridHandle } from '@/components/spreadsheet/types';

/*
 * jsdom은 레이아웃을 계산하지 않아 offset·client 크기가 모두 0이고, 그러면 가상화가 셀을 하나도 그리지 않는다.
 * 스크롤 영역 크기만 960×480으로 알려 준다. 실제 브라우저 레이아웃·좌표 정확도는 E2E(spreadsheet-grid.spec.ts)가 검증한다.
 */
const VIEWPORT = { width: 960, height: 480 };
const SIZE_STUBS = {
  offsetWidth: VIEWPORT.width,
  offsetHeight: VIEWPORT.height,
  clientWidth: VIEWPORT.width,
  clientHeight: VIEWPORT.height,
} as const;

const savedDescriptors = new Map<string, PropertyDescriptor | undefined>();

beforeAll(() => {
  for (const [name, value] of Object.entries(SIZE_STUBS)) {
    savedDescriptors.set(name, Object.getOwnPropertyDescriptor(HTMLElement.prototype, name));
    Object.defineProperty(HTMLElement.prototype, name, { configurable: true, get: () => value });
  }
});

afterAll(() => {
  for (const [name, descriptor] of savedDescriptors) {
    if (descriptor === undefined) {
      // 원래 상위 프로토타입(Element)에 있던 속성이면 덧씌운 것만 지운다.
      Reflect.deleteProperty(HTMLElement.prototype, name);
    } else {
      Object.defineProperty(HTMLElement.prototype, name, descriptor);
    }
  }
});

function Harness({
  initial = {},
  onChange,
  gridRef,
}: {
  initial?: Record<string, string>;
  onChange?: (changes: readonly CellChange[]) => void;
  gridRef?: React.Ref<SpreadsheetGridHandle>;
}) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  return (
    <SpreadsheetGrid
      ref={gridRef}
      label="테스트 시트"
      rowCount={100}
      colCount={30}
      getCellValue={(row, col) => values[`${row}:${col}`] ?? ''}
      onCellsChange={(changes) => {
        onChange?.(changes);
        setValues((current) => {
          const next = { ...current };
          for (const { row, col, value } of changes) next[`${row}:${col}`] = value;
          return next;
        });
      }}
    />
  );
}

const cell = (row: number, col: number) => {
  const found = document.querySelector<HTMLElement>(`[data-row="${row}"][data-col="${col}"]`);
  if (found === null) throw new Error(`셀 ${row},${col}이 렌더링되지 않았습니다`);
  return found;
};
const input = () => screen.getByRole('textbox');
const activeLabel = () => input().getAttribute('aria-label');

describe('SpreadsheetGrid', () => {
  it('보이는 범위의 셀만 렌더링하고 열 머리글은 A부터 시작한다', () => {
    render(<Harness />);
    expect(screen.getByRole('grid', { name: '테스트 시트' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'A' })).toBeInTheDocument();
    // 100×30 = 3,000칸 중 화면(960×480)과 여유분만 그린다.
    const rendered = document.querySelectorAll('[role="gridcell"]').length;
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThan(500);
  });

  it('클릭한 셀이 활성 셀이 되고 화살표·Enter·Tab으로 이동한다', () => {
    render(<Harness />);
    expect(activeLabel()).toBe('테스트 시트 A1 셀');

    fireEvent.mouseDown(cell(2, 1), { button: 0 });
    expect(activeLabel()).toBe('테스트 시트 B3 셀');
    expect(cell(2, 1)).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(input(), { key: 'ArrowRight' });
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(activeLabel()).toBe('테스트 시트 C4 셀');

    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(activeLabel()).toBe('테스트 시트 C5 셀');
    fireEvent.keyDown(input(), { key: 'Enter', shiftKey: true });
    expect(activeLabel()).toBe('테스트 시트 C4 셀');
    fireEvent.keyDown(input(), { key: 'Tab' });
    expect(activeLabel()).toBe('테스트 시트 D4 셀');
    fireEvent.keyDown(input(), { key: 'Tab', shiftKey: true });
    expect(activeLabel()).toBe('테스트 시트 C4 셀');
  });

  it('Shift+화살표와 마우스 드래그로 범위를 선택한다', () => {
    render(<Harness />);
    fireEvent.keyDown(input(), { key: 'ArrowDown', shiftKey: true });
    fireEvent.keyDown(input(), { key: 'ArrowRight', shiftKey: true });
    for (const [row, col] of [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ] as const) {
      expect(cell(row, col)).toHaveAttribute('aria-selected', 'true');
    }
    expect(cell(2, 0)).toHaveAttribute('aria-selected', 'false');

    fireEvent.mouseDown(cell(3, 3), { button: 0 });
    fireEvent.mouseOver(cell(4, 4));
    fireEvent.mouseOver(cell(5, 5));
    fireEvent.mouseUp(window);
    fireEvent.mouseOver(cell(8, 8)); // 버튼을 뗀 뒤에는 범위가 더 넓어지지 않는다
    expect(cell(5, 5)).toHaveAttribute('aria-selected', 'true');
    expect(cell(3, 4)).toHaveAttribute('aria-selected', 'true');
    expect(cell(6, 6)).toHaveAttribute('aria-selected', 'false');
    expect(cell(8, 8)).toHaveAttribute('aria-selected', 'false');
    expect(cell(0, 0)).toHaveAttribute('aria-selected', 'false');
  });

  it('타이핑하면 편집이 시작되고 Enter로 확정한 뒤 아래 셀로 이동한다', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.change(input(), { target: { value: '합' } });
    expect(input()).toHaveAttribute('data-editing', 'true');
    fireEvent.change(input(), { target: { value: '합계' } });
    // 확정 전에는 셀 값이 바뀌지 않는다 (P-05 1계층: 초안은 로컬 state)
    expect(onChange).not.toHaveBeenCalled();
    expect(cell(0, 0)).toHaveTextContent('');

    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith([{ row: 0, col: 0, value: '합계' }]);
    expect(cell(0, 0)).toHaveTextContent('합계');
    expect(activeLabel()).toBe('테스트 시트 A2 셀');
    expect(input()).toHaveAttribute('data-editing', 'false');
    expect(input()).toHaveValue('');
  });

  it('IME 조합 중 Enter는 셀을 확정하지 않고, 조합이 끝난 뒤 Enter에서 한 번만 확정한다', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.compositionStart(input());
    expect(input()).toHaveAttribute('data-editing', 'true');
    fireEvent.change(input(), { target: { value: '홍길동' } });
    fireEvent.keyDown(input(), { key: 'Enter', isComposing: true, keyCode: 229 });
    expect(onChange).not.toHaveBeenCalled();
    expect(activeLabel()).toBe('테스트 시트 A1 셀 편집 중');

    fireEvent.compositionEnd(input());
    fireEvent.keyDown(input(), { key: 'Enter', keyCode: 13 });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([{ row: 0, col: 0, value: '홍길동' }]);
    expect(activeLabel()).toBe('테스트 시트 A2 셀');
  });

  it('Esc는 편집을 취소해 원래 값을 남긴다', () => {
    const onChange = vi.fn();
    render(<Harness initial={{ '0:0': '원래 값' }} onChange={onChange} />);
    fireEvent.change(input(), { target: { value: '바뀐 값' } });
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(onChange).not.toHaveBeenCalled();
    expect(cell(0, 0)).toHaveTextContent('원래 값');
    expect(input()).toHaveAttribute('data-editing', 'false');
  });

  it('F2는 기존 내용을 이어서 편집하고, 이때 화살표는 셀을 옮기지 않는다', () => {
    render(<Harness initial={{ '0:0': '매출' }} />);
    fireEvent.keyDown(input(), { key: 'F2' });
    expect(input()).toHaveValue('매출');
    fireEvent.keyDown(input(), { key: 'ArrowLeft' });
    expect(activeLabel()).toBe('테스트 시트 A1 셀 편집 중');
    fireEvent.change(input(), { target: { value: '매출액' } });
    fireEvent.keyDown(input(), { key: 'Tab' });
    expect(cell(0, 0)).toHaveTextContent('매출액');
    expect(activeLabel()).toBe('테스트 시트 B1 셀');
  });

  it('타이핑으로 시작한 편집에서는 화살표가 확정 후 이동한다', () => {
    render(<Harness />);
    fireEvent.change(input(), { target: { value: '10' } });
    fireEvent.keyDown(input(), { key: 'ArrowRight' });
    expect(cell(0, 0)).toHaveTextContent('10');
    expect(activeLabel()).toBe('테스트 시트 B1 셀');
  });

  it('더블클릭하면 그 셀의 기존 내용을 편집한다', () => {
    render(<Harness initial={{ '1:1': '지점' }} />);
    fireEvent.mouseDown(cell(1, 1), { button: 0 });
    fireEvent.doubleClick(cell(1, 1));
    expect(input()).toHaveAttribute('data-editing', 'true');
    expect(input()).toHaveValue('지점');
  });

  it('Delete는 선택 범위의 내용을 지우고, 빈 셀은 변경으로 보내지 않는다', () => {
    const onChange = vi.fn();
    render(<Harness initial={{ '0:0': 'a', '1:1': 'b', '5:5': 'c' }} onChange={onChange} />);
    fireEvent.keyDown(input(), { key: 'ArrowDown', shiftKey: true });
    fireEvent.keyDown(input(), { key: 'ArrowRight', shiftKey: true });
    fireEvent.keyDown(input(), { key: 'Delete' });
    expect(onChange).toHaveBeenCalledWith([
      { row: 0, col: 0, value: '' },
      { row: 1, col: 1, value: '' },
    ]);
    expect(cell(0, 0)).toHaveTextContent('');
    expect(cell(5, 5)).toHaveTextContent('c');
  });

  it('Backspace는 활성 셀을 비운 채 편집을 시작하고 Esc로 되돌릴 수 있다', () => {
    const onChange = vi.fn();
    render(<Harness initial={{ '0:0': '값' }} onChange={onChange} />);
    fireEvent.keyDown(input(), { key: 'Backspace' });
    expect(input()).toHaveAttribute('data-editing', 'true');
    expect(input()).toHaveValue('');
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(onChange).not.toHaveBeenCalled();
    expect(cell(0, 0)).toHaveTextContent('값');
  });

  it('Home, Ctrl+Home, Ctrl+A, F1을 처리한다', () => {
    render(<Harness />);
    fireEvent.mouseDown(cell(4, 3), { button: 0 });
    fireEvent.keyDown(input(), { key: 'Home' });
    expect(activeLabel()).toBe('테스트 시트 A5 셀');
    fireEvent.keyDown(input(), { key: 'ArrowRight' });
    fireEvent.keyDown(input(), { key: 'Home', ctrlKey: true });
    expect(activeLabel()).toBe('테스트 시트 A1 셀');

    fireEvent.keyDown(input(), { key: 'a', ctrlKey: true });
    expect(cell(10, 10)).toHaveAttribute('aria-selected', 'true');

    const f1 = new KeyboardEvent('keydown', { key: 'F1', bubbles: true, cancelable: true });
    input().dispatchEvent(f1);
    expect(f1.defaultPrevented).toBe(true);
  });

  it('핸들 API: selectCell·startEditing이 동작하고 좌표 API는 범위 밖에서 null이다', () => {
    const gridRef = createRef<SpreadsheetGridHandle>();
    const onChange = vi.fn();
    render(<Harness gridRef={gridRef} onChange={onChange} />);
    const handle = gridRef.current;
    if (handle === null) throw new Error('핸들이 연결되지 않았습니다');

    act(() => handle.selectCell(3, 2));
    expect(activeLabel()).toBe('테스트 시트 C4 셀');

    act(() => handle.startEditing('5'));
    expect(input()).toHaveAttribute('data-editing', 'true');
    expect(input()).toHaveValue('5');
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith([{ row: 3, col: 2, value: '5' }]);

    act(() => handle.selectCell(3, 2));
    act(() => handle.startEditing());
    expect(input()).toHaveValue('5');
    fireEvent.keyDown(input(), { key: 'Escape' });

    expect(handle.getCellViewportRect(-1, 0)).toBeNull();
    expect(handle.getCellViewportRect(0, 30)).toBeNull();
    expect(handle.getRangeViewportRect(0, 0, 100, 0)).toBeNull();
    // jsdom의 스크롤 영역 위치는 (0,0)이므로 계산값은 머리글 크기 + 인덱스 × 셀 크기다.
    expect(handle.getCellViewportRect(2, 1)).toEqual({ top: 72, left: 144, width: 96, height: 24 });
    expect(handle.getRangeViewportRect(3, 2, 1, 0)).toEqual({
      top: 48,
      left: 48,
      width: 288,
      height: 72,
    });
  });

  it('핸들 API: getCellAreaRect는 머리글을 뺀 셀 표시 영역을 돌려준다', () => {
    const gridRef = createRef<SpreadsheetGridHandle>();
    render(<Harness gridRef={gridRef} />);
    const handle = gridRef.current;
    if (handle === null) throw new Error('핸들이 연결되지 않았습니다');
    const scroller = screen.getByRole('grid');
    Object.defineProperty(scroller, 'clientWidth', { configurable: true, value: 500 });
    Object.defineProperty(scroller, 'clientHeight', { configurable: true, value: 300 });
    // jsdom의 위치는 (0,0)이므로 머리글 크기만큼 안쪽에서 시작하고, 크기는 머리글을 뺀 값이다.
    expect(handle.getCellAreaRect()).toEqual({ top: 24, left: 48, width: 452, height: 276 });
  });
});
