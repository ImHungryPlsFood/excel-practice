import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Spreadsheet } from '@/components/spreadsheet/Spreadsheet';
import { useWorkbook } from '@/components/spreadsheet/hooks/useWorkbook';

/*
 * CARD-02C 수식 입력줄 ↔ 셀 편집 통합 테스트.
 * jsdom은 레이아웃을 계산하지 않아 가상화가 셀을 그리지 않으므로 스크롤 영역 크기만 알려 준다(SpreadsheetGrid.test.tsx와 같은 방식).
 * 실제 Chromium 레이아웃·IME는 E2E(tests/e2e/formula-bar.spec.ts)가 검증한다.
 */
const SIZE_STUBS = {
  offsetWidth: 960,
  offsetHeight: 480,
  clientWidth: 960,
  clientHeight: 480,
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
    if (descriptor === undefined) Reflect.deleteProperty(HTMLElement.prototype, name);
    else Object.defineProperty(HTMLElement.prototype, name, descriptor);
  }
});

const DATA: readonly (readonly string[])[] = [['10'], ['20'], ['30']];

function Harness() {
  const workbook = useWorkbook(DATA);
  return <Spreadsheet workbook={workbook} label="작업 시트" rowCount={50} colCount={10} />;
}

async function setup() {
  const view = render(<Harness />);
  // 엔진 초기화(비동기)가 끝나 예제 값이 셀에 보일 때까지 기다린다.
  await waitFor(() => expect(cellAt(view.container, 0, 0)).toHaveTextContent('10'));
  return view;
}

function cellAt(container: HTMLElement, row: number, col: number): HTMLElement {
  const cell = container.querySelector<HTMLElement>(`[data-row="${row}"][data-col="${col}"]`);
  if (cell === null) throw new Error(`셀 ${row},${col}이 그려지지 않았습니다`);
  return cell;
}

const bar = () => screen.getByRole<HTMLInputElement>('textbox', { name: /^수식 입력줄/ });
const nameBox = () => screen.getByRole('textbox', { name: '이름 상자' });
const cellInput = () => screen.getByRole<HTMLInputElement>('textbox', { name: /^작업 시트 / });
const message = () => screen.getByRole('status');

function selectCell(container: HTMLElement, row: number, col: number) {
  fireEvent.mouseDown(cellAt(container, row, col), { button: 0 });
}

function typeInBar(text: string) {
  fireEvent.change(bar(), { target: { value: text } });
}

function enterInBar() {
  fireEvent.keyDown(bar(), { key: 'Enter' });
}

describe('수식 입력줄과 셀 편집기는 같은 편집 상태를 공유한다', () => {
  it('입력줄에서 치면 셀 편집기에도 같은 초안이 보인다', async () => {
    const { container } = await setup();
    selectCell(container, 0, 1);
    typeInBar('=A1*2');
    expect(cellInput()).toHaveValue('=A1*2');
    expect(cellInput()).toHaveAccessibleName('작업 시트 B1 셀 편집 중');
  });

  it('셀에서 치면 입력줄에도 같은 초안이 보인다', async () => {
    const { container } = await setup();
    selectCell(container, 0, 1);
    fireEvent.change(cellInput(), { target: { value: '=A2+1' } });
    expect(bar()).toHaveValue('=A2+1');
  });

  it('입력줄로 낸 결과와 셀에서 낸 결과가 같다', async () => {
    const { container } = await setup();
    selectCell(container, 0, 1);
    typeInBar('=SUM(A1:A3)*2');
    enterInBar();

    selectCell(container, 0, 2);
    fireEvent.change(cellInput(), { target: { value: '=SUM(A1:A3)*2' } });
    fireEvent.keyDown(cellInput(), { key: 'Enter' });

    expect(cellAt(container, 0, 1)).toHaveTextContent('120');
    expect(cellAt(container, 0, 2)).toHaveTextContent('120');
  });

  it('셀 편집 중 입력줄로 포커스가 옮겨 가도 확정되지 않고 편집이 이어진다', async () => {
    const { container } = await setup();
    selectCell(container, 0, 1);
    fireEvent.change(cellInput(), { target: { value: '=A1' } });
    fireEvent.blur(cellInput(), { relatedTarget: bar() });
    expect(cellAt(container, 0, 1)).toHaveTextContent('');
    expect(bar()).toHaveAttribute('data-editing', 'true');
    typeInBar('=A1+5');
    enterInBar();
    expect(cellAt(container, 0, 1)).toHaveTextContent('15');
  });
});

describe('입력줄 키보드', () => {
  it('Enter는 확정하고 아래 셀로 이동한다', async () => {
    const { container } = await setup();
    selectCell(container, 0, 1);
    typeInBar('=A1+A2');
    enterInBar();
    expect(cellAt(container, 0, 1)).toHaveTextContent('30');
    expect(nameBox()).toHaveValue('B2');
    expect(bar()).toHaveAttribute('data-editing', 'false');
  });

  it('Tab은 확정하고 오른쪽으로, Esc는 취소한다', async () => {
    const { container } = await setup();
    selectCell(container, 0, 1);
    typeInBar('7');
    fireEvent.keyDown(bar(), { key: 'Tab' });
    expect(cellAt(container, 0, 1)).toHaveTextContent('7');
    expect(nameBox()).toHaveValue('C1');

    typeInBar('999');
    fireEvent.keyDown(bar(), { key: 'Escape' });
    expect(cellAt(container, 0, 2)).toHaveTextContent('');
    expect(bar()).toHaveValue('');
  });

  it('한글 조합 중 Enter로는 확정되지 않는다', async () => {
    const { container } = await setup();
    selectCell(container, 0, 1);
    fireEvent.compositionStart(bar());
    typeInBar('합');
    fireEvent.keyDown(bar(), { key: 'Enter', isComposing: true, keyCode: 229 });
    expect(cellAt(container, 0, 1)).toHaveTextContent('');
    expect(bar()).toHaveAttribute('data-editing', 'true');
    fireEvent.compositionEnd(bar());
    typeInBar('합계');
    enterInBar();
    expect(cellAt(container, 0, 1)).toHaveTextContent('합계');
  });

  it('F4는 커서 위치 참조의 고정 상태를 순환한다', async () => {
    const { container } = await setup();
    selectCell(container, 0, 1);
    typeInBar('=A1*2');
    bar().setSelectionRange(3, 3);
    fireEvent.keyDown(bar(), { key: 'F4' });
    expect(bar()).toHaveValue('=$A$1*2');
    fireEvent.keyDown(bar(), { key: 'F4' });
    expect(bar()).toHaveValue('=A$1*2');
  });

  it('셀 편집기에서도 F4가 같은 순환을 한다', async () => {
    const { container } = await setup();
    selectCell(container, 0, 1);
    fireEvent.change(cellInput(), { target: { value: '=A1' } });
    cellInput().setSelectionRange(3, 3);
    fireEvent.keyDown(cellInput(), { key: 'F4' });
    expect(cellInput()).toHaveValue('=$A$1');
    expect(bar()).toHaveValue('=$A$1');
  });
});

describe('원문과 결과의 분리 (MASTER_PROMPT §8.2)', () => {
  it('셀에는 결과, 입력줄에는 원문이 보인다', async () => {
    const { container } = await setup();
    selectCell(container, 0, 1);
    typeInBar('=1E+3');
    enterInBar();
    expect(cellAt(container, 0, 1)).toHaveTextContent('1000');
    selectCell(container, 0, 1);
    expect(bar()).toHaveValue('=1E+3');
  });

  it('원본 셀을 바꾸면 의존 셀이 다시 계산된다', async () => {
    const { container } = await setup();
    selectCell(container, 0, 1);
    typeInBar('=A1*3');
    enterInBar();
    expect(cellAt(container, 0, 1)).toHaveTextContent('30');
    selectCell(container, 0, 0);
    typeInBar('5');
    enterInBar();
    expect(cellAt(container, 0, 1)).toHaveTextContent('15');
  });
});

describe('오류와 지원하지 않는 기능 안내', () => {
  it('오류 셀은 오류 코드로 보이고, 선택하면 안내 문장이 나온다', async () => {
    const { container } = await setup();
    selectCell(container, 0, 1);
    typeInBar('=1/0');
    enterInBar();
    const cell = cellAt(container, 0, 1);
    expect(cell).toHaveTextContent('#DIV/0!');
    expect(cell).toHaveAttribute('aria-invalid', 'true');
    selectCell(container, 0, 1);
    expect(message()).toHaveTextContent('#DIV/0!');
    expect(message()).toHaveTextContent('0으로 나눌 수 없습니다');
  });

  it('지원하지 않는 함수는 이름과 대체 방법을 안내한다', async () => {
    const { container } = await setup();
    selectCell(container, 0, 1);
    typeInBar('=XMATCH(20,A1:A3)');
    enterInBar();
    expect(cellAt(container, 0, 1)).toHaveTextContent('#NAME?');
    selectCell(container, 0, 1);
    expect(message()).toHaveTextContent('XMATCH는 지원하지 않습니다');
  });

  it('지원하지 않는 TEXT 서식은 틀린 값 대신 안내를 보여 준다', async () => {
    const { container } = await setup();
    selectCell(container, 0, 1);
    typeInBar('=TEXT(A1,"hh:mm")');
    enterInBar();
    selectCell(container, 0, 1);
    expect(message()).toHaveTextContent('지원하지 않는 서식입니다');
  });

  it('엔진이 받아들이지 않는 입력(1000자 초과)은 반영하지 않고 이유를 보여 주며 편집을 유지한다', async () => {
    const { container } = await setup();
    selectCell(container, 0, 1);
    typeInBar(`=${'1+'.repeat(600)}1`);
    enterInBar();
    expect(message()).toHaveTextContent('1000자');
    expect(bar()).toHaveAttribute('data-editing', 'true');
    expect(cellAt(container, 0, 1)).toHaveTextContent('');
    expect(nameBox()).toHaveValue('B1');
  });

  it('오류가 없는 셀을 고르면 안내 줄이 비어 있다', async () => {
    const { container } = await setup();
    selectCell(container, 0, 0);
    expect(message()).toHaveTextContent('');
  });
});

describe('이름 상자와 fx 버튼', () => {
  it('이름 상자에 주소를 입력하고 Enter를 누르면 그 셀로 이동한다', async () => {
    await setup();
    fireEvent.focus(nameBox());
    fireEvent.change(nameBox(), { target: { value: 'c5' } });
    fireEvent.keyDown(nameBox(), { key: 'Enter' });
    expect(nameBox()).toHaveValue('C5');
    expect(bar()).toHaveAccessibleName('수식 입력줄 C5');
  });

  it('잘못된 주소는 이동하지 않는다', async () => {
    await setup();
    fireEvent.focus(nameBox());
    fireEvent.change(nameBox(), { target: { value: '없는주소' } });
    fireEvent.keyDown(nameBox(), { key: 'Enter' });
    expect(nameBox()).toHaveValue('A1');
  });

  it('fx 버튼은 빈 셀에서 =로 수식 입력을 시작한다', async () => {
    const { container } = await setup();
    selectCell(container, 4, 4);
    fireEvent.click(screen.getByRole('button', { name: '수식 입력 시작' }));
    expect(bar()).toHaveValue('=');
    expect(bar()).toHaveAttribute('data-editing', 'true');
    expect(cellInput()).toHaveValue('=');
  });
});
