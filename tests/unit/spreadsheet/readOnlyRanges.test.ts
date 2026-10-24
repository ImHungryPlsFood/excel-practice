import { afterEach, describe, expect, it } from 'vitest';

import { snapshotFromRows, WorkbookModel } from '@/components/spreadsheet/workbookModel';

/* CARD-04D: 문제의 readOnlyRanges 강제. 원본 데이터 칸(A1:B4)은 어떤 경로로도 바뀌지 않는다. */

const models: WorkbookModel[] = [];
afterEach(() => {
  models.splice(0).forEach((model) => model.destroy());
});

async function create() {
  const model = await WorkbookModel.create(
    snapshotFromRows([
      ['항목', '금액', ''],
      ['가', '100', ''],
      ['나', '200', ''],
      ['다', '300', ''],
    ]),
    undefined,
    { Sheet1: ['A1:B4'] },
  );
  models.push(model);
  return model;
}

const original = (model: WorkbookModel) =>
  [0, 1, 2, 3].map((row) => [model.getInput('Sheet1', row, 0), model.getInput('Sheet1', row, 1)]);
const ORIGINAL = [
  ['항목', '금액'],
  ['가', '100'],
  ['나', '200'],
  ['다', '300'],
];

describe('읽기 전용 칸', () => {
  it('원본 칸 직접 입력은 거부하고 값을 바꾸지 않는다', async () => {
    const model = await create();
    expect(model.setCells('Sheet1', [{ row: 1, col: 1, value: '999' }])).toMatch(/수정할 수 없/);
    expect(original(model)).toEqual(ORIGINAL);
    expect(model.history.canUndo).toBe(false);
  });

  it('지우기(Delete)도 거부한다', async () => {
    const model = await create();
    expect(model.setCells('Sheet1', [{ row: 2, col: 1, value: '' }])).not.toBeNull();
    expect(model.getInput('Sheet1', 2, 1)).toBe('200');
  });

  it('원본과 허용 칸을 함께 바꾸면 전체를 거부한다(일부만 반영하지 않는다)', async () => {
    const model = await create();
    const refusal = model.setCells('Sheet1', [
      { row: 0, col: 2, value: 'ok' },
      { row: 1, col: 1, value: '1' },
    ]);
    expect(refusal).not.toBeNull();
    expect(model.getInput('Sheet1', 0, 2)).toBe('');
  });

  it('허용 칸은 정상적으로 입력되고 실행 취소된다', async () => {
    const model = await create();
    expect(model.setCells('Sheet1', [{ row: 4, col: 1, value: '=SUM(B2:B4)' }])).toBeNull();
    expect(model.getResult('Sheet1', 4, 1).value).toBe(600);
    model.undo();
    expect(model.getInput('Sheet1', 4, 1)).toBe('');
    model.undo();
    expect(original(model)).toEqual(ORIGINAL);
  });

  it('붙여넣기가 원본 칸을 덮으면 거부한다', async () => {
    const model = await create();
    const source = { values: [['1', '2']], origin: null };
    const result = model.paste('Sheet1', source, {
      startRow: 1,
      startCol: 0,
      endRow: 1,
      endCol: 0,
    });
    expect('error' in result).toBe(true);
    expect(original(model)).toEqual(ORIGINAL);
    const ok = model.paste('Sheet1', source, { startRow: 6, startCol: 0, endRow: 6, endCol: 0 });
    expect('rect' in ok).toBe(true);
  });

  it('자동 채우기가 원본 칸으로 이어지면 거부한다', async () => {
    const model = await create();
    model.setCells('Sheet1', [{ row: 5, col: 0, value: '7' }]);
    const refusal = model.fill(
      'Sheet1',
      { startRow: 5, startCol: 0, endRow: 5, endCol: 0 },
      'up',
      3,
    );
    expect(refusal).not.toBeNull();
    expect(original(model)).toEqual(ORIGINAL);
    expect(
      model.fillFromEdge('Sheet1', { startRow: 2, startCol: 1, endRow: 5, endCol: 1 }, 'down'),
    ).not.toBeNull();
    expect(original(model)).toEqual(ORIGINAL);
  });

  it('원본 칸을 잘라내 옮기거나 원본 칸 위로 옮기면 거부한다', async () => {
    const model = await create();
    model.setCells('Sheet1', [{ row: 6, col: 0, value: '9' }]);
    const base = { fromSheet: 'Sheet1', toSheet: 'Sheet1' };
    expect(
      model.moveCells({
        ...base,
        rect: { startRow: 1, startCol: 1, endRow: 1, endCol: 1 },
        dRow: 0,
        dCol: 3,
      }),
    ).not.toBeNull();
    expect(
      model.moveCells({
        ...base,
        rect: { startRow: 6, startCol: 0, endRow: 6, endCol: 0 },
        dRow: -5,
        dCol: 0,
      }),
    ).not.toBeNull();
    expect(original(model)).toEqual(ORIGINAL);
    expect(model.getInput('Sheet1', 6, 0)).toBe('9');
  });

  it('원본을 지우거나 밀어내는 행·열 삽입·삭제는 거부하고, 원본 뒤쪽은 허용한다', async () => {
    const model = await create();
    for (const [axis, kind, index] of [
      ['row', 'delete', 1],
      ['row', 'insert', 0],
      ['row', 'insert', 3],
      ['col', 'delete', 0],
      ['col', 'insert', 1],
    ] as const) {
      expect(
        model.changeStructure({ sheet: 'Sheet1', axis, kind, index, count: 1 }),
      ).not.toBeNull();
    }
    expect(original(model)).toEqual(ORIGINAL);
    expect(
      model.changeStructure({ sheet: 'Sheet1', axis: 'row', kind: 'insert', index: 4, count: 1 }),
    ).toBeNull();
    expect(
      model.changeStructure({ sheet: 'Sheet1', axis: 'col', kind: 'delete', index: 2, count: 1 }),
    ).toBeNull();
    expect(original(model)).toEqual(ORIGINAL);
  });

  it('원본 시트의 이름 변경·삭제는 거부한다', async () => {
    const model = await create();
    expect(model.renameSheet('Sheet1', '다른이름')).not.toBeNull();
    expect(model.addSheet()).toHaveProperty('name');
    expect(model.deleteSheet('Sheet1')).not.toBeNull();
  });

  it('다시 시작(통합 문서 교체)은 읽기 전용이어도 동작한다', async () => {
    const model = await create();
    expect(model.replaceWorkbook(snapshotFromRows([['처음', '상태']]), '다시 시작')).toBeNull();
    expect(model.getInput('Sheet1', 0, 0)).toBe('처음');
  });
});
