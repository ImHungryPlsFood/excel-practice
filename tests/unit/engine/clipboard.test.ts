import { afterEach, describe, expect, it } from 'vitest';

import { WorkbookModel, type WorkbookSnapshot } from '@/components/spreadsheet/workbookModel';
import { parseTsv, pasteWrites, toTsv } from '@/engine/spreadsheet/operations/clipboard';

/*
 * CARD-02E 복사·잘라내기·붙여넣기 (R-08.07, R-08.17).
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

const rect = (startRow: number, startCol: number, endRow = startRow, endCol = startCol) => ({
  startRow,
  startCol,
  endRow,
  endCol,
});

describe('TSV', () => {
  it('탭·줄바꿈·큰따옴표가 든 값은 따옴표로 감싸고, 다시 읽으면 같다', () => {
    const rows = [
      ['a', 'b\tc', '줄\n바꿈'],
      ['say "hi"', '', '=A1'],
    ];
    const text = toTsv(rows);
    expect(text).toBe('a\t"b\tc"\t"줄\n바꿈"\r\n"say ""hi"""\t\t=A1');
    expect(parseTsv(text)).toEqual(rows);
  });

  it('끝 줄바꿈은 무시하고, 칸 수가 다른 행은 빈 칸으로 채운다', () => {
    expect(parseTsv('1\t2\r\n3\r\n')).toEqual([
      ['1', '2'],
      ['3', ''],
    ]);
    expect(parseTsv('')).toEqual([]);
  });
});

describe('pasteWrites', () => {
  it('앱 안에서 복사한 수식은 상대 참조만 옮긴다', () => {
    const result = pasteWrites(
      { values: [['=A1+$B$1', '=A$1']], origin: { row: 1, col: 2 } },
      rect(4, 3),
    );
    expect(result).toEqual({
      writes: [
        { row: 4, col: 3, value: '=B4+$B$1' },
        { row: 4, col: 4, value: '=B$1' },
      ],
      rect: rect(4, 3, 4, 4),
    });
  });

  it('밖에서 온 값은 수식도 글자 그대로 넣는다', () => {
    const result = pasteWrites({ values: [['=A1']], origin: null }, rect(5, 5));
    expect('writes' in result && result.writes).toEqual([{ row: 5, col: 5, value: '=A1' }]);
  });

  it('선택 범위가 복사한 크기의 배수면 반복해 채운다', () => {
    const result = pasteWrites(
      { values: [['x'], ['=A1']], origin: { row: 0, col: 1 } },
      rect(0, 2, 3, 3),
    );
    if ('error' in result) throw new Error(result.error);
    expect(result.rect).toEqual(rect(0, 2, 3, 3));
    // 원본 =A1은 B2에 있었다. D2는 (0행, 2열), D4는 (2행, 2열) 떨어져 있다.
    expect(result.writes.filter((w) => w.col === 3).map((w) => w.value)).toEqual([
      'x',
      '=C1',
      'x',
      '=C3',
    ]);
  });

  it('배수가 아니면 왼쪽 위부터 복사한 크기만큼', () => {
    const result = pasteWrites({ values: [['a', 'b']], origin: null }, rect(0, 0, 2, 2));
    expect('rect' in result && result.rect).toEqual(rect(0, 0, 0, 1));
  });

  it('시트 밖으로 넘치면 거부한다', () => {
    const result = pasteWrites({ values: [['a', 'b']], origin: null }, rect(0, 49));
    expect('error' in result).toBe(true);
  });

  it('위로 붙여넣어 시트 밖을 가리키게 되면 #REF!', () => {
    const result = pasteWrites({ values: [['=A1']], origin: { row: 1, col: 0 } }, rect(0, 0));
    expect('writes' in result && result.writes[0]?.value).toBe('=#REF!');
  });
});

const BOOK: WorkbookSnapshot = {
  sheets: [
    { name: 'Sheet1', cells: { A1: '1', A2: '2', B1: '=A1*10', B2: '=A2*10', D1: '=SUM(A1:A2)' } },
    { name: 'Data', cells: { A1: '=Sheet1!A1+Sheet1!B1' } },
  ],
};

describe('WorkbookModel 붙여넣기·잘라내기', () => {
  it('붙여넣기는 한 번의 실행 취소로 되돌아간다', async () => {
    const model = await create(BOOK);
    const result = model.paste(
      'Sheet1',
      { values: [['=A1*10'], ['=A2*10']], origin: { row: 0, col: 1 } },
      rect(0, 2),
    );
    expect(result).toEqual({ rect: rect(0, 2, 1, 2) });
    expect(model.getInput('Sheet1', 0, 2)).toBe('=B1*10');
    expect(model.getResult('Sheet1', 1, 2).value).toBe(200);
    expect(model.history.undoLabel).toBe('붙여넣기');
    model.undo();
    expect(model.getInput('Sheet1', 0, 2)).toBe('');
  });

  it('잘라내서 붙여넣으면 셀이 옮겨지고 다른 시트 수식도 따라간다', async () => {
    const model = await create(BOOK);
    const before = model.snapshot();
    expect(
      model.moveCells({
        fromSheet: 'Sheet1',
        rect: rect(0, 0, 1, 1),
        toSheet: 'Sheet1',
        dRow: 4,
        dCol: 0,
      }),
    ).toBeNull();
    expect(model.getInput('Sheet1', 0, 0)).toBe('');
    // 옮긴 수식 B5의 A1 참조는 같이 옮겨진 A5를 가리킨다
    expect(model.getInput('Sheet1', 4, 1)).toBe('=A5*10');
    expect(model.getInput('Sheet1', 0, 3)).toBe('=SUM(A5:A6)');
    expect(model.getInput('Data', 0, 0)).toBe('=Sheet1!A5+Sheet1!B5');
    expect(model.getResult('Data', 0, 0).value).toBe(11);
    model.undo();
    expect(model.snapshot().sheets).toEqual(before.sheets);
  });

  it('다른 시트로 잘라내 붙이면 남은 셀을 가리키는 참조에 원래 시트 이름이 붙는다', async () => {
    const model = await create(BOOK);
    model.moveCells({
      fromSheet: 'Sheet1',
      rect: rect(0, 1),
      toSheet: 'Data',
      dRow: 2,
      dCol: 0,
    });
    expect(model.getInput('Data', 2, 1)).toBe('=Sheet1!A1*10');
    expect(model.getInput('Data', 0, 0)).toBe('=Sheet1!A1+B3');
    expect(model.getResult('Data', 0, 0).value).toBe(11);
  });

  it('덮어쓴 셀을 가리키던 참조는 #REF!', async () => {
    const model = await create(BOOK);
    model.moveCells({ fromSheet: 'Sheet1', rect: rect(0, 0), toSheet: 'Sheet1', dRow: 0, dCol: 1 });
    // A1 → B1: B1에 있던 =A1*10 이 덮어써지고, Data의 Sheet1!B1 참조는 #REF!
    expect(model.getInput('Sheet1', 0, 1)).toBe('1');
    expect(model.getInput('Data', 0, 0)).toBe('=Sheet1!B1+#REF!');
  });
});
