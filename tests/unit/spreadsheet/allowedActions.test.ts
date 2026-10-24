import { afterEach, describe, expect, it } from 'vitest';

import {
  snapshotFromRows,
  WorkbookModel,
  type AllowedActions,
} from '@/components/spreadsheet/workbookModel';

/* CARD-04E: 문제의 allowedActions 강제. 허용하지 않은 작업은 변경 전체를 거부하고 한국어로 안내한다. */

const models: WorkbookModel[] = [];
afterEach(() => {
  models.splice(0).forEach((model) => model.destroy());
});

async function create(allowed?: AllowedActions) {
  const model = await WorkbookModel.create(
    snapshotFromRows([
      ['10', '20', ''],
      ['30', '40', ''],
    ]),
    undefined,
    {},
    allowed,
  );
  models.push(model);
  return model;
}

const cell = { startRow: 0, startCol: 0, endRow: 0, endCol: 0 };
const PASTE = { values: [['5']], origin: null };

describe('allowedActions 강제', () => {
  it('값 입력: ENTER_VALUE가 없으면 값 입력과 지우기를 거부한다', async () => {
    const model = await create(['ENTER_FORMULA']);
    expect(model.setCells('Sheet1', [{ row: 0, col: 2, value: '7' }])).toMatch(/값을 직접/);
    expect(model.setCells('Sheet1', [{ row: 0, col: 0, value: '' }])).toMatch(/값을 직접/);
    expect(model.getInput('Sheet1', 0, 0)).toBe('10');
    expect(model.history.canUndo).toBe(false);
  });

  it('수식 입력: ENTER_FORMULA가 없으면 = 로 시작하는 입력을 거부하고 값 입력은 된다', async () => {
    const model = await create(['ENTER_VALUE']);
    expect(model.setCells('Sheet1', [{ row: 0, col: 2, value: '=A1+B1' }])).toMatch(/수식을/);
    expect(model.getInput('Sheet1', 0, 2)).toBe('');
    expect(model.setCells('Sheet1', [{ row: 0, col: 2, value: '7' }])).toBeNull();
    expect(model.getInput('Sheet1', 0, 2)).toBe('7');
  });

  it('허용 작업과 거부 작업이 섞인 변경은 일부만 반영하지 않고 전체를 거부한다', async () => {
    const model = await create(['ENTER_VALUE']);
    const refusal = model.setCells('Sheet1', [
      { row: 0, col: 2, value: '7' },
      { row: 1, col: 2, value: '=A2' },
    ]);
    expect(refusal).not.toBeNull();
    expect(model.getInput('Sheet1', 0, 2)).toBe('');
  });

  it('붙여넣기·잘라내기: COPY_PASTE가 없으면 거부한다', async () => {
    const model = await create(['ENTER_FORMULA']);
    expect(model.paste('Sheet1', PASTE, cell)).toEqual({ error: expect.stringMatching(/복사/) });
    expect(model.getInput('Sheet1', 0, 0)).toBe('10');
    const move = { fromSheet: 'Sheet1', toSheet: 'Sheet1', rect: cell, dRow: 0, dCol: 2 };
    expect(model.moveCells(move)).toMatch(/복사/);
    expect(model.getInput('Sheet1', 0, 0)).toBe('10');
  });

  it('자동 채우기·Ctrl+D/R: AUTOFILL이 없으면 거부한다', async () => {
    const model = await create(['ENTER_FORMULA', 'COPY_PASTE']);
    expect(model.fill('Sheet1', cell, 'down', 1)).toMatch(/자동 채우기/);
    const row = { startRow: 0, startCol: 0, endRow: 1, endCol: 0 };
    expect(model.fillFromEdge('Sheet1', row, 'down')).toMatch(/자동 채우기/);
    expect(model.getInput('Sheet1', 1, 0)).toBe('30');
  });

  it('행·열 삽입·삭제: INSERT_DELETE_ROW_COLUMN이 없으면 거부한다', async () => {
    const model = await create(['ENTER_FORMULA']);
    const refusal = model.changeStructure({
      sheet: 'Sheet1',
      axis: 'row',
      kind: 'insert',
      index: 0,
      count: 1,
    });
    expect(refusal).toMatch(/행이나 열/);
    expect(model.getInput('Sheet1', 0, 0)).toBe('10');
  });

  it('허용한 작업은 그대로 동작하고 실행 취소는 항상 된다', async () => {
    const model = await create(['ENTER_FORMULA', 'COPY_PASTE', 'AUTOFILL']);
    expect(model.setCells('Sheet1', [{ row: 0, col: 2, value: '=A1+B1' }])).toBeNull();
    expect(model.fill('Sheet1', { ...cell, startCol: 2, endCol: 2 }, 'down', 1)).toBeNull();
    expect(model.getInput('Sheet1', 1, 2)).toBe('=A2+B2');
    expect(model.paste('Sheet1', PASTE, { ...cell, startCol: 1, endCol: 1 })).toHaveProperty(
      'rect',
    );
    expect(model.undo()).not.toBeNull();
    expect(model.undo()).not.toBeNull();
    expect(model.getInput('Sheet1', 1, 2)).toBe('');
  });

  it('다시 시작(통합 문서 교체)은 허용 작업과 상관없이 된다', async () => {
    const model = await create(['ENTER_FORMULA']);
    expect(model.replaceWorkbook(snapshotFromRows([['1']]), '다시 시작')).toBeNull();
    expect(model.getInput('Sheet1', 0, 0)).toBe('1');
  });

  it('allowedActions가 없으면(연습실·튜토리얼) 아무것도 제한하지 않는다', async () => {
    const model = await create();
    expect(model.setCells('Sheet1', [{ row: 0, col: 2, value: '7' }])).toBeNull();
    expect(model.setCells('Sheet1', [{ row: 1, col: 2, value: '=A2' }])).toBeNull();
    expect(model.fill('Sheet1', cell, 'down', 1)).toBeNull();
    expect(model.paste('Sheet1', PASTE, cell)).toHaveProperty('rect');
  });
});
