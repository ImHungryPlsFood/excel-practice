import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Spreadsheet } from '@/components/spreadsheet/Spreadsheet';
import { useWorkbook } from '@/components/spreadsheet/hooks/useWorkbook';

import { cellAt, installLayoutStubs } from '../helpers/layoutStubs';

/*
 * CARD-02D 시트 탭과 실행 취소 단축키 (R-04.49, R-04.51, R-08.08, R-08.12, Q-06).
 * Spreadsheet(입력줄+그리드+시트 탭)를 실제 엔진과 함께 그려 확인한다.
 */

installLayoutStubs();

const DATA: readonly (readonly string[])[] = [['10', '=A1*2']];

function Harness() {
  const workbook = useWorkbook(DATA);
  return <Spreadsheet workbook={workbook} label="작업 시트" rowCount={20} colCount={8} />;
}

async function setup() {
  const view = render(<Harness />);
  await waitFor(() => expect(cellAt(view.container, 0, 1)).toHaveTextContent('20'));
  return view;
}

const tabs = () => within(screen.getByRole('tablist', { name: '시트' })).getAllByRole('tab');
const tab = (name: string) => screen.getByRole('tab', { name });
const cellInput = () => screen.getByRole<HTMLInputElement>('textbox', { name: /^작업 시트 / });

function type(container: HTMLElement, row: number, col: number, value: string) {
  fireEvent.mouseDown(cellAt(container, row, col), { button: 0 });
  fireEvent.change(cellInput(), { target: { value } });
  fireEvent.keyDown(cellInput(), { key: 'Enter' });
}

const ctrl = (key: string, shiftKey = false) =>
  fireEvent.keyDown(cellInput(), { key, ctrlKey: true, shiftKey });

describe('Ctrl+Z / Ctrl+Y (Q-06)', () => {
  it('편집 중이 아닐 때 셀 값과 수식을 되돌리고 다시 실행한다', async () => {
    const { container } = await setup();
    type(container, 0, 0, '7');
    expect(cellAt(container, 0, 1)).toHaveTextContent('14');
    type(container, 0, 1, '=A1+1');
    expect(cellAt(container, 0, 1)).toHaveTextContent('8');

    ctrl('z');
    expect(cellAt(container, 0, 1)).toHaveTextContent('14');
    ctrl('z');
    expect(cellAt(container, 0, 0)).toHaveTextContent('10');
    expect(cellAt(container, 0, 1)).toHaveTextContent('20');
    ctrl('y');
    expect(cellAt(container, 0, 0)).toHaveTextContent('7');
    ctrl('Z', true);
    expect(cellAt(container, 0, 1)).toHaveTextContent('8');
  });

  it('Delete로 지운 범위도 한 번에 되돌린다', async () => {
    const { container } = await setup();
    fireEvent.mouseDown(cellAt(container, 0, 0), { button: 0 });
    fireEvent.mouseDown(cellAt(container, 0, 1), { button: 0, shiftKey: true });
    fireEvent.keyDown(cellInput(), { key: 'Delete' });
    expect(cellAt(container, 0, 0)).toHaveTextContent('');
    ctrl('z');
    expect(cellAt(container, 0, 0)).toHaveTextContent('10');
    expect(cellAt(container, 0, 1)).toHaveTextContent('20');
  });

  it('편집 중에는 Ctrl+Z가 통합 문서를 되돌리지 않는다(입력 상자의 글자 되돌리기)', async () => {
    const { container } = await setup();
    type(container, 0, 0, '7');
    fireEvent.change(cellInput(), { target: { value: '9' } });
    ctrl('z');
    expect(cellInput().value).toBe('9');
    expect(cellAt(container, 0, 0)).toHaveTextContent('7');
  });
});

describe('시트 탭 (R-04.49)', () => {
  it('시트를 추가하면 새 탭이 선택되고, 탭을 눌러 전환하면 그 시트의 값이 보인다', async () => {
    const { container } = await setup();
    fireEvent.click(screen.getByRole('button', { name: '시트 추가' }));
    expect(tabs().map((t) => t.textContent)).toEqual(['Sheet1', 'Sheet2']);
    expect(tab('Sheet2')).toHaveAttribute('aria-selected', 'true');
    expect(cellAt(container, 0, 0)).toHaveTextContent('');

    type(container, 0, 0, '=Sheet1!B1+1');
    expect(cellAt(container, 0, 0)).toHaveTextContent('21');

    fireEvent.click(tab('Sheet1'));
    expect(cellAt(container, 0, 0)).toHaveTextContent('10');
  });

  it('편집 중에 다른 탭을 누르면 지금 시트에 확정하고 넘어간다', async () => {
    const { container } = await setup();
    fireEvent.click(screen.getByRole('button', { name: '시트 추가' }));
    fireEvent.mouseDown(cellAt(container, 2, 0), { button: 0 });
    fireEvent.change(cellInput(), { target: { value: '시트2 값' } });
    fireEvent.click(tab('Sheet1'));
    expect(cellAt(container, 2, 0)).toHaveTextContent('');
    fireEvent.click(tab('Sheet2'));
    expect(cellAt(container, 2, 0)).toHaveTextContent('시트2 값');
  });

  it('더블클릭으로 이름을 바꾸고, 규칙에 맞지 않으면 이유를 보여 준다', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: '시트 추가' }));
    fireEvent.doubleClick(tab('Sheet2'));
    const input = screen.getByRole('textbox', { name: 'Sheet2 시트 새 이름' });
    fireEvent.change(input, { target: { value: 'sheet1' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByRole('alert')).toHaveTextContent('같은 이름');
    fireEvent.change(input, { target: { value: '판매 자료' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(tabs().map((t) => t.textContent)).toEqual(['Sheet1', '판매 자료']);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('Esc는 이름 변경을 취소한다', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: '이름 바꾸기' }));
    const input = screen.getByRole('textbox', { name: 'Sheet1 시트 새 이름' });
    fireEvent.change(input, { target: { value: '바뀜' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(tabs().map((t) => t.textContent)).toEqual(['Sheet1']);
  });

  it('시트가 하나면 삭제할 수 없다', async () => {
    await setup();
    expect(screen.getByRole('button', { name: '시트 삭제' })).toBeDisabled();
  });

  it('값이 있는 시트는 확인 후 삭제하고, Ctrl+Z로 되돌린다 (§9.2)', async () => {
    const { container } = await setup();
    fireEvent.click(screen.getByRole('button', { name: '시트 추가' }));
    type(container, 0, 0, '보존할 값');
    fireEvent.click(screen.getByRole('button', { name: '시트 삭제' }));
    const dialog = screen.getByRole('alertdialog', { name: '시트 삭제 확인' });
    expect(dialog).toHaveTextContent('실행 취소');

    fireEvent.click(within(dialog).getByRole('button', { name: '취소' }));
    expect(tabs()).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: '시트 삭제' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '삭제' }));
    expect(tabs().map((t) => t.textContent)).toEqual(['Sheet1']);

    ctrl('z');
    expect(tabs().map((t) => t.textContent)).toEqual(['Sheet1', 'Sheet2']);
    expect(tab('Sheet2')).toHaveAttribute('aria-selected', 'true');
    expect(cellAt(container, 0, 0)).toHaveTextContent('보존할 값');
  });

  it('빈 시트는 확인 없이 삭제한다', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: '시트 추가' }));
    fireEvent.click(screen.getByRole('button', { name: '시트 삭제' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(tabs()).toHaveLength(1);
  });

  it('시트 추가·이름 변경도 Ctrl+Z로 차례로 되돌린다', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: '시트 추가' }));
    fireEvent.doubleClick(tab('Sheet2'));
    const input = screen.getByRole('textbox', { name: 'Sheet2 시트 새 이름' });
    fireEvent.change(input, { target: { value: '자료' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    ctrl('z');
    expect(tabs().map((t) => t.textContent)).toEqual(['Sheet1', 'Sheet2']);
    ctrl('z');
    expect(tabs().map((t) => t.textContent)).toEqual(['Sheet1']);
  });
});
