import fc from 'fast-check';
import { afterEach, describe, expect, it } from 'vitest';

import {
  snapshotFromRows,
  WorkbookModel,
  type WorkbookSnapshot,
} from '@/components/spreadsheet/workbookModel';
import { HistoryManager, type Command } from '@/engine/spreadsheet/history/historyManager';

/*
 * CARD-02D historyManager (R-04.51, R-08.08, TEST_STRATEGY Q-04).
 * 스택 동작과, 실제 수식 엔진 위에서 셀 값·수식·시트 추가/삭제/이름 변경을 섞은 50회 왕복 속성.
 * CARD-02E: 행·열 삽입·삭제, 열 너비·행 높이, 붙여넣기, 잘라내기, 자동 채우기, Ctrl+D/R, 시트 순서도 섞는다.
 */

function counter() {
  const state = { value: 0 };
  const add = (n: number): Command => ({
    label: `+${n}`,
    apply: () => {
      state.value += n;
    },
    revert: () => {
      state.value -= n;
    },
  });
  return { state, add };
}

describe('HistoryManager 스택 동작', () => {
  it('실행·취소·다시 실행', () => {
    const { state, add } = counter();
    const history = new HistoryManager();
    history.execute(add(1));
    history.execute(add(10));
    expect(state.value).toBe(11);
    expect(history.undoLabel).toBe('+10');
    history.undo();
    expect(state.value).toBe(1);
    expect(history.canRedo).toBe(true);
    history.redo();
    expect(state.value).toBe(11);
  });

  it('새 명령을 실행하면 다시 실행할 기록이 사라진다', () => {
    const { add } = counter();
    const history = new HistoryManager();
    history.execute(add(1));
    history.undo();
    history.execute(add(2));
    expect(history.canRedo).toBe(false);
    expect(history.redo()).toBeNull();
  });

  it('비어 있으면 아무것도 하지 않는다', () => {
    const history = new HistoryManager();
    expect(history.undo()).toBeNull();
    expect(history.redo()).toBeNull();
    expect(history.canUndo).toBe(false);
  });

  it('상한을 넘으면 가장 오래된 기록만 버린다(데이터는 그대로)', () => {
    const { state, add } = counter();
    const history = new HistoryManager(3);
    for (let i = 1; i <= 5; i += 1) history.execute(add(i));
    expect(state.value).toBe(15);
    expect(history.size).toBe(3);
    while (history.undo() !== null);
    // 5, 4, 3만 되돌려지고 1, 2는 남는다
    expect(state.value).toBe(3);
  });

  it('apply가 실패한 명령은 기록하지 않고 오류를 그대로 올린다', () => {
    const history = new HistoryManager();
    const failing: Command = {
      label: '실패',
      apply: () => {
        throw new Error('거부');
      },
      revert: () => undefined,
    };
    expect(() => history.execute(failing)).toThrow('거부');
    expect(history.canUndo).toBe(false);
  });
});

/** 비교용 상태: 시트 순서, 원문, 원문이 있는 셀의 계산 결과 */
function observe(model: WorkbookModel) {
  const snapshot = model.snapshot();
  return {
    snapshot,
    results: snapshot.sheets.map((sheet) =>
      Object.keys(sheet.cells)
        .sort()
        .map((address) => {
          const col = address.charCodeAt(0) - 65;
          const row = Number(address.slice(1)) - 1;
          const result = model.getResult(sheet.name, row, col);
          return [address, result.displayValue, result.error?.code ?? null];
        }),
    ),
  };
}

type Op =
  | { kind: 'set'; sheet: number; row: number; col: number; value: string }
  | { kind: 'add' }
  | { kind: 'rename'; sheet: number; name: string }
  | { kind: 'delete'; sheet: number }
  | { kind: 'activate'; sheet: number }
  // CARD-02E: 행·열, 크기, 붙여넣기, 잘라내기, 자동 채우기, 시트 순서
  | {
      kind: 'structure';
      sheet: number;
      axis: 'row' | 'col';
      insert: boolean;
      index: number;
      count: number;
    }
  | { kind: 'size'; sheet: number; axis: 'row' | 'col'; index: number; size: number | null }
  | { kind: 'paste'; sheet: number; row: number; col: number; fromRow: number; fromCol: number }
  | { kind: 'move'; from: number; to: number; row: number; col: number; dRow: number; dCol: number }
  | { kind: 'fill'; sheet: number; col: number; down: boolean; count: number }
  | { kind: 'fillEdge'; sheet: number; right: boolean }
  | { kind: 'moveSheet'; sheet: number; to: number };

const CELL_VALUE = fc.oneof(
  fc.constant(''),
  fc.integer({ min: -50, max: 50 }).map(String),
  fc.constantFrom('가', 'TRUE', "'7", '2024-03-15'),
  fc.constantFrom('=A1+B1', '=SUM(A1:C3)', '=A1*2', '=1/0', '=IF(A1>0,"양","음")'),
  // 다른 시트 참조: 이름 변경·삭제의 영향을 받는다
  fc.constantFrom(
    '=Sheet2!A1+1',
    "='자료 1'!B2*2",
    '=SUM(Sheet3!A1:A3)',
    '=Sheet1!A1',
    '=합계!A1*2',
  ),
);

const OP: fc.Arbitrary<Op> = fc.oneof(
  {
    weight: 6,
    arbitrary: fc.record({
      kind: fc.constant('set' as const),
      sheet: fc.nat(5),
      row: fc.nat(3),
      col: fc.nat(2),
      value: CELL_VALUE,
    }),
  },
  { weight: 1, arbitrary: fc.constant({ kind: 'add' as const }) },
  {
    weight: 1,
    arbitrary: fc.record({
      kind: fc.constant('rename' as const),
      sheet: fc.nat(5),
      name: fc.constantFrom('Sheet2', 'Sheet3', '자료 1', 'Data', 'sheet1', '합계'),
    }),
  },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant('delete' as const), sheet: fc.nat(5) }) },
  {
    weight: 1,
    arbitrary: fc.record({ kind: fc.constant('activate' as const), sheet: fc.nat(5) }),
  },
  {
    weight: 2,
    arbitrary: fc.record({
      kind: fc.constant('structure' as const),
      sheet: fc.nat(5),
      axis: fc.constantFrom<'row' | 'col'>('row', 'col'),
      insert: fc.boolean(),
      index: fc.nat(3),
      count: fc.integer({ min: 1, max: 2 }),
    }),
  },
  {
    weight: 1,
    arbitrary: fc.record({
      kind: fc.constant('size' as const),
      sheet: fc.nat(5),
      axis: fc.constantFrom<'row' | 'col'>('row', 'col'),
      index: fc.nat(3),
      size: fc.option(fc.integer({ min: 30, max: 200 }), { nil: null }),
    }),
  },
  {
    weight: 2,
    arbitrary: fc.record({
      kind: fc.constant('paste' as const),
      sheet: fc.nat(5),
      row: fc.nat(4),
      col: fc.nat(3),
      fromRow: fc.nat(2),
      fromCol: fc.nat(2),
    }),
  },
  {
    weight: 1,
    arbitrary: fc.record({
      kind: fc.constant('move' as const),
      from: fc.nat(5),
      to: fc.nat(5),
      row: fc.nat(2),
      col: fc.nat(2),
      dRow: fc.integer({ min: 0, max: 2 }),
      dCol: fc.integer({ min: 0, max: 2 }),
    }),
  },
  {
    weight: 1,
    arbitrary: fc.record({
      kind: fc.constant('fill' as const),
      sheet: fc.nat(5),
      col: fc.nat(2),
      down: fc.boolean(),
      count: fc.integer({ min: 1, max: 3 }),
    }),
  },
  {
    weight: 1,
    arbitrary: fc.record({
      kind: fc.constant('fillEdge' as const),
      sheet: fc.nat(5),
      right: fc.boolean(),
    }),
  },
  {
    weight: 1,
    arbitrary: fc.record({
      kind: fc.constant('moveSheet' as const),
      sheet: fc.nat(5),
      to: fc.nat(5),
    }),
  },
);

const cellRect = (startRow: number, startCol: number, endRow = startRow, endCol = startCol) => ({
  startRow,
  startCol,
  endRow,
  endCol,
});

function run(model: WorkbookModel, op: Op): void {
  const names = model.sheetNames;
  const pick = (index: number) => names[index % names.length] ?? names[0] ?? '';
  switch (op.kind) {
    case 'set':
      model.setCells(pick(op.sheet), [{ row: op.row, col: op.col, value: op.value }]);
      return;
    case 'add':
      model.addSheet();
      return;
    case 'rename':
      model.renameSheet(pick(op.sheet), op.name);
      return;
    case 'delete':
      model.deleteSheet(pick(op.sheet));
      return;
    case 'activate':
      model.setActiveSheet(pick(op.sheet));
      return;
    case 'structure':
      model.changeStructure({
        sheet: pick(op.sheet),
        axis: op.axis,
        kind: op.insert ? 'insert' : 'delete',
        index: op.index,
        count: op.count,
      });
      return;
    case 'size':
      model.setSizes(pick(op.sheet), op.axis, [op.index], op.size);
      return;
    case 'paste': {
      const sheet = pick(op.sheet);
      model.paste(
        sheet,
        {
          values: [[model.getInput(sheet, op.fromRow, op.fromCol)]],
          origin: { row: op.fromRow, col: op.fromCol },
        },
        cellRect(op.row, op.col),
      );
      return;
    }
    case 'move':
      model.moveCells({
        fromSheet: pick(op.from),
        rect: cellRect(op.row, op.col, op.row + 1, op.col),
        toSheet: pick(op.to),
        dRow: op.dRow,
        dCol: op.dCol,
      });
      return;
    case 'fill':
      model.fill(
        pick(op.sheet),
        op.down ? cellRect(0, op.col, 1, op.col) : cellRect(2, op.col, 3, op.col),
        op.down ? 'down' : 'up',
        op.count,
      );
      return;
    case 'fillEdge':
      model.fillFromEdge(pick(op.sheet), cellRect(0, 0, 2, 2), op.right ? 'right' : 'down');
      return;
    case 'moveSheet':
      model.moveSheet(pick(op.sheet), op.to);
  }
}

const START: WorkbookSnapshot = {
  sheets: [
    ...snapshotFromRows([
      ['3', '=A1*2', '=Sheet2!A1'],
      ['합계', '=SUM(B1:B1)', ''],
    ]).sheets,
    { name: 'Sheet2', cells: { A1: '10', B2: '=A1+Sheet1!A1' } },
  ],
};

describe('WorkbookModel 실행 취소 왕복 (Q-04)', () => {
  const models: WorkbookModel[] = [];
  afterEach(() => {
    models.splice(0).forEach((model) => model.destroy());
  });

  it('무작위 작업 50회를 모두 취소하면 처음 상태, 모두 다시 실행하면 마지막 상태와 같다', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(OP, { minLength: 50, maxLength: 50 }), async (ops) => {
        const model = await WorkbookModel.create(START);
        models.push(model);
        const initial = observe(model);
        for (const op of ops) run(model, op);
        const final = observe(model);

        while (model.undo() !== null);
        const undone = observe(model);
        // 활성 시트는 화면 상태라 비교에서 뺀다(실행 취소는 변경된 시트로 옮겨 간다).
        expect(undone.snapshot.sheets).toEqual(initial.snapshot.sheets);
        expect(undone.results).toEqual(initial.results);

        while (model.redo() !== null);
        const redone = observe(model);
        expect(redone.snapshot.sheets).toEqual(final.snapshot.sheets);
        expect(redone.results).toEqual(final.results);

        // 새 엔진에 마지막 원문을 그대로 넣었을 때와 계산 결과가 같다(엔진 상태가 원문과 어긋나지 않음).
        const fresh = await WorkbookModel.create(redone.snapshot);
        models.push(fresh);
        expect(observe(fresh).results).toEqual(redone.results);
      }),
      { numRuns: 25 },
    );
  }, 60_000);
});
