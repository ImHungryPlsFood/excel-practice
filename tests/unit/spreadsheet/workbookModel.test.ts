import { afterEach, describe, expect, it } from 'vitest';

import {
  checkSnapshot,
  parseA1,
  snapshotFromRows,
  validateSheetName,
  WorkbookModel,
  type WorkbookSnapshot,
} from '@/components/spreadsheet/workbookModel';

/* CARD-02D 여러 시트·실행 취소 (R-04.49, R-04.51, R-08.08, R-08.12, MASTER_PROMPT §9.2) */

const models: WorkbookModel[] = [];
afterEach(() => {
  models.splice(0).forEach((model) => model.destroy());
});

async function create(snapshot: WorkbookSnapshot) {
  const model = await WorkbookModel.create(snapshot);
  models.push(model);
  return model;
}

const TWO_SHEETS: WorkbookSnapshot = {
  sheets: [
    { name: 'Sheet1', cells: { A1: '=Sheet2!A1+1', B1: '=SUM(Sheet2!A1:A2)' } },
    { name: 'Sheet2', cells: { A1: '5', A2: '6' } },
  ],
};

describe('셀 값·수식 실행 취소', () => {
  it('Undo는 직전 값과 수식을 그대로 복원하고 Redo는 다시 적용한다', async () => {
    const model = await create(snapshotFromRows([['3', '=A1*2']]));
    model.setCells('Sheet1', [{ row: 0, col: 1, value: '=A1+100' }]);
    expect(model.getResult('Sheet1', 0, 1).value).toBe(103);
    model.undo();
    expect(model.getInput('Sheet1', 0, 1)).toBe('=A1*2');
    expect(model.getResult('Sheet1', 0, 1).value).toBe(6);
    model.redo();
    expect(model.getInput('Sheet1', 0, 1)).toBe('=A1+100');
  });

  it('입력 원문을 그대로 복원한다(=1E+3처럼 엔진이 바꿔 읽는 글자도)', async () => {
    const model = await create(snapshotFromRows([['=1E+3']]));
    model.setCells('Sheet1', [{ row: 0, col: 0, value: '' }]);
    model.undo();
    expect(model.getInput('Sheet1', 0, 0)).toBe('=1E+3');
    expect(model.getResult('Sheet1', 0, 0).value).toBe(1000);
  });

  it('여러 셀 지우기는 한 번의 Undo로 돌아온다', async () => {
    const model = await create(snapshotFromRows([['1', '2', '=A1+B1']]));
    model.setCells('Sheet1', [
      { row: 0, col: 0, value: '' },
      { row: 0, col: 1, value: '' },
    ]);
    expect(model.history.undoLabel).toBe('셀 2개 변경');
    model.undo();
    expect(model.getResult('Sheet1', 0, 2).value).toBe(3);
    expect(model.history.canUndo).toBe(false);
  });

  it('값이 같으면 기록하지 않는다', async () => {
    const model = await create(snapshotFromRows([['1']]));
    model.setCells('Sheet1', [{ row: 0, col: 0, value: '1' }]);
    expect(model.history.canUndo).toBe(false);
  });

  it('엔진이 거부하면 앞의 변경만 반영·기록하고 이유를 돌려준다', async () => {
    const model = await create(snapshotFromRows([['']]));
    const refusal = model.setCells('Sheet1', [
      { row: 0, col: 0, value: '7' },
      { row: 0, col: 1, value: `=${'1+'.repeat(600)}1` },
    ]);
    expect(refusal).toContain('1000자');
    expect(model.getInput('Sheet1', 0, 1)).toBe('');
    model.undo();
    expect(model.getInput('Sheet1', 0, 0)).toBe('');
  });

  it('다른 시트를 보고 있어도 Undo하면 변경된 시트로 옮겨 간다', async () => {
    const model = await create(TWO_SHEETS);
    model.setCells('Sheet2', [{ row: 0, col: 0, value: '50' }]);
    model.setActiveSheet('Sheet1');
    model.undo();
    expect(model.activeSheet).toBe('Sheet2');
    expect(model.getResult('Sheet1', 0, 0).value).toBe(6);
  });
});

describe('시트 추가·이름 변경·삭제', () => {
  it('시트를 추가하면 다음 이름으로 끝에 생기고 그 시트로 간다. Undo하면 사라진다', async () => {
    const model = await create(TWO_SHEETS);
    const added = model.addSheet();
    expect(added).toEqual({ name: 'Sheet3' });
    expect(model.sheetNames).toEqual(['Sheet1', 'Sheet2', 'Sheet3']);
    expect(model.activeSheet).toBe('Sheet3');
    model.undo();
    expect(model.sheetNames).toEqual(['Sheet1', 'Sheet2']);
    expect(model.activeSheet).not.toBe('Sheet3');
  });

  it('이름을 바꾸면 다른 시트 수식의 원문도 새 이름을 따르고, Undo하면 원래 원문으로 돌아온다', async () => {
    const model = await create(TWO_SHEETS);
    expect(model.renameSheet('Sheet2', 'My Data')).toBeNull();
    expect(model.getInput('Sheet1', 0, 0)).toBe("='My Data'!A1+1");
    expect(model.getInput('Sheet1', 0, 1)).toBe("=SUM('My Data'!A1:A2)");
    expect(model.getResult('Sheet1', 0, 0).value).toBe(6);
    model.undo();
    expect(model.sheetNames).toEqual(['Sheet1', 'Sheet2']);
    expect(model.getInput('Sheet1', 0, 0)).toBe('=Sheet2!A1+1');
    expect(model.getResult('Sheet1', 0, 1).value).toBe(11);
    model.redo();
    expect(model.getInput('Sheet1', 0, 0)).toBe("='My Data'!A1+1");
  });

  it('이름 변경 후 그 시트의 셀 변경도 Undo로 차례대로 돌아온다', async () => {
    const model = await create(TWO_SHEETS);
    model.renameSheet('Sheet2', '자료');
    model.setCells('자료', [{ row: 0, col: 0, value: '100' }]);
    expect(model.getResult('Sheet1', 0, 0).value).toBe(101);
    model.undo();
    model.undo();
    expect(model.sheetNames).toEqual(['Sheet1', 'Sheet2']);
    expect(model.getInput('Sheet2', 0, 0)).toBe('5');
  });

  it('시트를 삭제하면 참조가 #REF!가 되고, Undo하면 위치·내용·참조가 돌아온다', async () => {
    const model = await create({
      sheets: [...TWO_SHEETS.sheets, { name: 'Sheet3', cells: { A1: 'x' } }],
    });
    expect(model.deleteSheet('Sheet2')).toBeNull();
    expect(model.sheetNames).toEqual(['Sheet1', 'Sheet3']);
    expect(model.getResult('Sheet1', 0, 0).error?.code).toBe('#REF!');
    model.undo();
    expect(model.sheetNames).toEqual(['Sheet1', 'Sheet2', 'Sheet3']);
    expect(model.getInput('Sheet2', 0, 1)).toBe('');
    expect(model.getInput('Sheet2', 1, 0)).toBe('6');
    expect(model.getResult('Sheet1', 0, 0).value).toBe(6);
  });

  it('마지막 시트는 삭제할 수 없다', async () => {
    const model = await create(snapshotFromRows([['1']]));
    expect(model.deleteSheet('Sheet1')).toContain('마지막 시트');
    expect(model.sheetNames).toEqual(['Sheet1']);
    expect(model.history.canUndo).toBe(false);
  });

  it('규칙에 맞지 않는 이름은 거부하고 기록하지 않는다', async () => {
    const model = await create(TWO_SHEETS);
    expect(model.renameSheet('Sheet2', 'sheet1')).toContain('같은 이름');
    expect(model.renameSheet('Sheet2', 'a/b')).toContain('쓸 수 없습니다');
    expect(model.history.canUndo).toBe(false);
  });

  it('시트는 20개까지 만들 수 있다', async () => {
    const model = await create(snapshotFromRows([]));
    for (let i = 0; i < 19; i += 1) model.addSheet();
    expect(model.addSheet()).toEqual({ error: '시트는 20개까지 만들 수 있습니다.' });
  });
});

describe('통합 문서 교체 (빈 시트·샘플·다시 시작)는 실행 취소로 되찾을 수 있다 (§9.2)', () => {
  it('빈 통합 문서로 바꾼 뒤 Undo하면 모든 시트와 값이 돌아온다', async () => {
    const model = await create(TWO_SHEETS);
    model.replaceWorkbook(snapshotFromRows([]), '빈 스프레드시트');
    expect(model.sheetNames).toEqual(['Sheet1']);
    expect(model.getInput('Sheet1', 0, 0)).toBe('');
    expect(model.getResult('Sheet1', 0, 0).value).toBeNull();
    model.undo();
    expect(model.sheetNames).toEqual(['Sheet1', 'Sheet2']);
    expect(model.getResult('Sheet1', 0, 1).value).toBe(11);
  });

  it('한 시트의 내용만 바꾸고(샘플) Undo하면 그 시트의 원래 내용이 돌아온다', async () => {
    const model = await create(TWO_SHEETS);
    model.replaceSheetCells('Sheet2', { A1: '1', B1: '=A1*3' }, '샘플 불러오기');
    expect(model.getInput('Sheet2', 1, 0)).toBe('');
    expect(model.getResult('Sheet2', 0, 1).value).toBe(3);
    expect(model.getResult('Sheet1', 0, 0).value).toBe(2);
    model.undo();
    expect(model.getInput('Sheet2', 1, 0)).toBe('6');
    expect(model.getInput('Sheet2', 0, 1)).toBe('');
  });

  it('검사를 통과하지 못한 스냅샷은 아무것도 바꾸지 않는다', async () => {
    const model = await create(TWO_SHEETS);
    expect(model.replaceWorkbook({ sheets: [] })).toContain('하나 이상');
    expect(model.sheetNames).toEqual(['Sheet1', 'Sheet2']);
    expect(model.history.canUndo).toBe(false);
  });
});

describe('시트 이름·주소·스냅샷 검사', () => {
  it('Excel 시트 이름 규칙', () => {
    expect(validateSheetName('판매 2024', [])).toBeNull();
    expect(validateSheetName('', [])).not.toBeNull();
    expect(validateSheetName('  ', [])).not.toBeNull();
    expect(validateSheetName('x'.repeat(32), [])).toContain('31자');
    for (const bad of ['a[b', 'a]b', 'a:b', 'a*b', 'a?b', 'a/b', 'a\\b', "'a", "a'"]) {
      expect(validateSheetName(bad, [])).not.toBeNull();
    }
    expect(validateSheetName('DATA', ['data'])).toContain('같은 이름');
    expect(validateSheetName('DATA', ['data'], 'data')).toBeNull();
  });

  it('A1 주소는 엔진 상한 안에서만 읽는다', () => {
    expect(parseA1('A1')).toEqual({ row: 0, col: 0 });
    expect(parseA1('AX1000')).toEqual({ row: 999, col: 49 });
    expect(parseA1('AY1')).toBeNull();
    expect(parseA1('A1001')).toBeNull();
    expect(parseA1('$A$1')).toBeNull();
    expect(parseA1('A0')).toBeNull();
    expect(parseA1('1A')).toBeNull();
  });

  it('스냅샷 검사', () => {
    expect(checkSnapshot(TWO_SHEETS)).toBeNull();
    expect(checkSnapshot({ sheets: [{ name: 'S', cells: { ZZ9: '1' } }] })).toContain('셀 주소');
    expect(
      checkSnapshot({
        sheets: [
          { name: 'A', cells: {} },
          { name: 'a', cells: {} },
        ],
      }),
    ).toContain('같은 이름');
    expect(
      checkSnapshot({ sheets: [{ name: 'S', cells: { A1: `=${'1'.repeat(1000)}` } }] }),
    ).toContain('1000자');
  });
});
