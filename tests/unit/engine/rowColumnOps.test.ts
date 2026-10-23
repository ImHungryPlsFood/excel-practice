import { afterEach, describe, expect, it } from 'vitest';

import { WorkbookModel, type WorkbookSnapshot } from '@/components/spreadsheet/workbookModel';
import { applyStructuralChange } from '@/engine/spreadsheet/operations/rowColumnOps';

/*
 * CARD-02E 행·열 삽입·삭제·크기 (R-08.06). 순수 함수와, 실제 엔진 위 WorkbookModel에서 값·수식·실행 취소를 확인한다.
 */

const models: WorkbookModel[] = [];
afterEach(() => {
  models.splice(0).forEach((model) => model.destroy());
});

async function create(snapshot: WorkbookSnapshot) {
  const model = await WorkbookModel.create(snapshot);
  models.push(model);
  return model;
}

const BOOK: WorkbookSnapshot = {
  sheets: [
    {
      name: 'Sheet1',
      cells: { A1: '1', A2: '2', A3: '3', A4: '=SUM(A1:A3)', B1: '=A3*10', C1: '=$A$2' },
      rowHeights: { '3': 40 },
      columnWidths: { B: 150 },
    },
    { name: 'Data', cells: { A1: '=Sheet1!A2+Sheet1!A4' } },
  ],
};

const value = (model: WorkbookModel, sheet: string, row: number, col: number) =>
  model.getResult(sheet, row, col).value;

describe('applyStructuralChange (순수 함수)', () => {
  it('행 삽입: 셀·수식·다른 시트 수식·행 높이가 같이 움직인다', () => {
    const result = applyStructuralChange(BOOK.sheets, {
      sheet: 'Sheet1',
      axis: 'row',
      kind: 'insert',
      index: 1,
      count: 2,
    });
    if ('error' in result) throw new Error(result.error);
    const [sheet1, data] = result.sheets;
    expect(sheet1?.cells).toEqual({
      A1: '1',
      A4: '2',
      A5: '3',
      A6: '=SUM(A1:A5)',
      B1: '=A5*10',
      C1: '=$A$4',
    });
    expect(sheet1?.rowHeights).toEqual({ '5': 40 });
    expect(sheet1?.columnWidths).toEqual({ B: 150 });
    expect(data?.cells).toEqual({ A1: '=Sheet1!A4+Sheet1!A6' });
  });

  it('열 삭제: 지운 열의 셀이 사라지고 그 열만 가리키던 참조는 #REF!', () => {
    const result = applyStructuralChange(BOOK.sheets, {
      sheet: 'Sheet1',
      axis: 'col',
      kind: 'delete',
      index: 0,
      count: 1,
    });
    if ('error' in result) throw new Error(result.error);
    expect(result.sheets[0]?.cells).toEqual({ A1: '=#REF!*10', B1: '=#REF!' });
    expect(result.sheets[0]?.columnWidths).toEqual({ A: 150 });
    expect(result.sheets[1]?.cells).toEqual({ A1: '=#REF!+#REF!' });
  });

  it('시트 끝 행에 값이 있으면 삽입을 거부한다', () => {
    const result = applyStructuralChange([{ name: 'Sheet1', cells: { A1000: 'x' } }], {
      sheet: 'Sheet1',
      axis: 'row',
      kind: 'insert',
      index: 0,
      count: 1,
    });
    expect(result).toEqual({ error: expect.stringContaining('1000행') as unknown });
  });

  it('지울 열이 시트 밖까지 이어지면 거부한다', () => {
    const result = applyStructuralChange([{ name: 'Sheet1', cells: {} }], {
      sheet: 'Sheet1',
      axis: 'col',
      kind: 'delete',
      index: 49,
      count: 2,
    });
    expect('error' in result).toBe(true);
  });
});

describe('WorkbookModel 행·열 조작과 실행 취소', () => {
  it('행 삽입 뒤 수식 결과가 그대로이고, 실행 취소·다시 실행이 된다', async () => {
    const model = await create(BOOK);
    const before = model.snapshot();
    expect(value(model, 'Sheet1', 3, 0)).toBe(6);

    expect(
      model.changeStructure({ sheet: 'Sheet1', axis: 'row', kind: 'insert', index: 1, count: 1 }),
    ).toBeNull();
    expect(model.getInput('Sheet1', 4, 0)).toBe('=SUM(A1:A4)');
    expect(value(model, 'Sheet1', 4, 0)).toBe(6);
    expect(value(model, 'Data', 0, 0)).toBe(8);
    // 삽입한 행 안에 값을 넣으면 범위가 늘어난 합계에 들어간다
    model.setCells('Sheet1', [{ row: 1, col: 0, value: '100' }]);
    expect(value(model, 'Sheet1', 4, 0)).toBe(106);

    model.undo();
    model.undo();
    expect(model.snapshot().sheets).toEqual(before.sheets);
    expect(value(model, 'Sheet1', 3, 0)).toBe(6);
    model.redo();
    expect(model.getInput('Sheet1', 4, 0)).toBe('=SUM(A1:A4)');
    expect(model.history.undoLabel).toBe('행 1개 삽입');
  });

  it('행 삭제로 참조 셀이 사라지면 #REF! 오류가 된다', async () => {
    const model = await create(BOOK);
    model.changeStructure({ sheet: 'Sheet1', axis: 'row', kind: 'delete', index: 2, count: 1 });
    expect(model.getInput('Sheet1', 0, 1)).toBe('=#REF!*10');
    expect(model.getResult('Sheet1', 0, 1).error?.code).toBe('#REF!');
    expect(model.getInput('Sheet1', 2, 0)).toBe('=SUM(A1:A2)');
    expect(value(model, 'Sheet1', 2, 0)).toBe(3);
    model.undo();
    expect(value(model, 'Sheet1', 0, 1)).toBe(30);
  });

  it('열 너비·행 높이 변경과 기본값 복원이 실행 취소된다', async () => {
    const model = await create(BOOK);
    expect(model.setSizes('Sheet1', 'col', [0, 2], 200)).toBeNull();
    expect(model.getColumnWidth('Sheet1', 0)).toBe(200);
    expect(model.getColumnWidth('Sheet1', 2)).toBe(200);
    model.setSizes('Sheet1', 'row', [2], null);
    expect(model.getRowHeight('Sheet1', 2)).toBeUndefined();
    model.undo();
    expect(model.getRowHeight('Sheet1', 2)).toBe(40);
    model.undo();
    expect(model.getColumnWidth('Sheet1', 0)).toBeUndefined();
    expect(model.setSizes('Sheet1', 'col', [0], 5)).toContain('허용 범위');
  });

  it('시트 순서를 바꾸고 되돌린다. 수식은 그대로 계산된다', async () => {
    const model = await create(BOOK);
    model.moveSheet('Data', 0);
    expect(model.sheetNames).toEqual(['Data', 'Sheet1']);
    expect(value(model, 'Data', 0, 0)).toBe(8);
    model.undo();
    expect(model.sheetNames).toEqual(['Sheet1', 'Data']);
  });
});
