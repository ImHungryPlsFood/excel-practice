import { afterEach, describe, expect, it } from 'vitest';

import { WorkbookModel, type WorkbookSnapshot } from '@/components/spreadsheet/workbookModel';
import {
  deleteFromStorage,
  downloadFileName,
  listSavedFiles,
  loadFromStorage,
  MAX_FILE_BYTES,
  MAX_SAVED_FILES,
  parseSandboxFile,
  SANDBOX_STORAGE_KEY,
  saveToStorage,
  serializeSandboxFile,
  type SandboxFile,
  type SandboxStorage,
} from '@/services/sandbox/sandboxFileStore';

/*
 * CARD-02D 연습실 학습 파일 (R-04.52). JSON 저장 → 복원 왕복, 신뢰할 수 없는 입력 거부,
 * 연습실 전용 저장소 키(학습 모드와 분리).
 */

const WORKBOOK: WorkbookSnapshot = {
  activeSheet: '계산',
  sheets: [
    { name: '입력', cells: { A1: '4', B1: "'007", C1: '=1E+3', A2: '사과' } },
    { name: '계산', cells: { A1: '=입력!A1^2', B1: "=SUM('입력'!A1:A2)", C3: 'TRUE' } },
    { name: 'Sheet3', cells: {} },
  ],
};

const FILE: SandboxFile = {
  name: '연습 1',
  savedAt: '2026-10-23T10:00:00.000Z',
  workbook: WORKBOOK,
};

function memoryStorage(initial: Record<string, string> = {}): SandboxStorage & {
  data: Map<string, string>;
} {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

const models: WorkbookModel[] = [];
afterEach(() => {
  models.splice(0).forEach((model) => model.destroy());
});

describe('저장 → 복원 왕복', () => {
  it('파일 문자열로 저장했다가 읽으면 시트 순서·값·수식·보던 시트가 같다', () => {
    const result = parseSandboxFile(serializeSandboxFile(FILE));
    expect(result).toEqual({ ok: true, file: FILE });
  });

  it('복원한 통합 문서의 계산 결과도 같다', async () => {
    const original = await WorkbookModel.create(WORKBOOK);
    models.push(original);
    const result = parseSandboxFile(
      serializeSandboxFile({ ...FILE, workbook: original.snapshot() }),
    );
    if (!result.ok) throw new Error(result.error);
    const restored = await WorkbookModel.create(result.file.workbook);
    models.push(restored);
    expect(restored.sheetNames).toEqual(['입력', '계산', 'Sheet3']);
    expect(restored.activeSheet).toBe('계산');
    for (const [sheet, row, col] of [
      ['입력', 0, 1],
      ['입력', 0, 2],
      ['계산', 0, 0],
      ['계산', 0, 1],
    ] as const) {
      expect(restored.getInput(sheet, row, col)).toBe(original.getInput(sheet, row, col));
      expect(restored.getResult(sheet, row, col)).toEqual(original.getResult(sheet, row, col));
    }
    expect(restored.getResult('계산', 0, 0).value).toBe(16);
  });

  it('JSON에는 버전과 형식 필드가 있다', () => {
    const json = JSON.parse(serializeSandboxFile(FILE)) as Record<string, unknown>;
    expect(json.format).toBe('cellcraft-sandbox');
    expect(json.version).toBe(1);
  });
});

describe('손상되었거나 악의적인 파일은 거부한다 (신뢰할 수 없는 입력)', () => {
  const valid = () => JSON.parse(serializeSandboxFile(FILE)) as Record<string, unknown>;
  const withSheets = (sheets: unknown) => JSON.stringify({ ...valid(), sheets });

  it.each([
    ['JSON이 아님', '{ "format": ', 'JSON 형식이 아닙니다'],
    ['배열', '[]', '학습 파일 형식이 아닙니다'],
    ['null', 'null', '학습 파일 형식이 아닙니다'],
    ['다른 형식', JSON.stringify({ ...valid(), format: 'other' }), '연습실 파일이 아닙니다'],
    ['다른 버전', JSON.stringify({ ...valid(), version: 2 }), '지원하지 않는 파일 버전'],
    ['이름 없음', JSON.stringify({ ...valid(), name: '' }), '파일 이름'],
    ['저장 시각 오류', JSON.stringify({ ...valid(), savedAt: 'yesterday' }), '저장 시각'],
    ['시트 0개', withSheets([]), '시트 목록'],
    [
      '시트 21개',
      withSheets(Array.from({ length: 21 }, (_, i) => ({ name: `S${i}`, cells: {} }))),
      '시트 목록',
    ],
    ['시트가 객체 아님', withSheets(['Sheet1']), '시트 정보'],
    ['셀이 배열', withSheets([{ name: 'S', cells: [] }]), '시트 정보'],
    ['잘못된 셀 주소', withSheets([{ name: 'S', cells: { '1A': 'x' } }]), '셀 주소'],
    ['범위 밖 열', withSheets([{ name: 'S', cells: { AY1: 'x' } }]), '셀 주소'],
    ['범위 밖 행', withSheets([{ name: 'S', cells: { A1001: 'x' } }]), '셀 주소'],
    ['값이 숫자', withSheets([{ name: 'S', cells: { A1: 3 } }]), '문자열이 아닙니다'],
    [
      '값이 객체',
      withSheets([{ name: 'S', cells: { A1: { toString: 'x' } } }]),
      '문자열이 아닙니다',
    ],
    [
      '수식 1000자 초과',
      withSheets([{ name: 'S', cells: { A1: `=${'1'.repeat(1000)}` } }]),
      '1000자',
    ],
    ['시트 이름 규칙 위반', withSheets([{ name: 'a/b', cells: {} }]), '쓸 수 없습니다'],
    [
      '중복 시트 이름',
      withSheets([
        { name: 'A', cells: {} },
        { name: 'a', cells: {} },
      ]),
      '같은 이름',
    ],
    ['보던 시트가 문자열 아님', JSON.stringify({ ...valid(), activeSheet: 3 }), '보고 있던 시트'],
  ])('%s', (_, text, reason) => {
    const result = parseSandboxFile(text);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(reason);
  });

  it('__proto__ 키로 프로토타입을 오염시키지 못한다', () => {
    const text = `{"format":"cellcraft-sandbox","version":1,"name":"x","savedAt":"2026-10-23T00:00:00Z","sheets":[{"name":"S","cells":{"__proto__":{"polluted":"yes"}}}]}`;
    const result = parseSandboxFile(text);
    expect(result.ok).toBe(false);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('너무 큰 파일은 해석하기 전에 거부한다', () => {
    const result = parseSandboxFile(' '.repeat(MAX_FILE_BYTES + 1));
    expect(result).toEqual({ ok: false, error: expect.stringContaining('너무 큽니다') });
  });

  it('수식 문자열은 실행되지 않고 원문 그대로 보관된다', () => {
    const payload = withSheets([
      { name: 'S', cells: { A1: '=WEBSERVICE("http://x")', B1: 'alert(1)' } },
    ]);
    const result = parseSandboxFile(payload);
    if (!result.ok) throw new Error(result.error);
    expect(result.file.workbook.sheets[0]?.cells).toEqual({
      A1: '=WEBSERVICE("http://x")',
      B1: 'alert(1)',
    });
  });

  it('알 수 없는 필드는 무시한다', () => {
    const result = parseSandboxFile(JSON.stringify({ ...valid(), extra: { anything: 1 } }));
    expect(result.ok).toBe(true);
  });
});

describe('브라우저 저장소 (연습실 전용 키)', () => {
  it('저장·목록·불러오기·삭제', () => {
    const storage = memoryStorage();
    expect(saveToStorage(storage, FILE)).toBeNull();
    expect(saveToStorage(storage, { ...FILE, name: '연습 2' })).toBeNull();
    expect(listSavedFiles(storage).files.map((file) => file.name)).toEqual(['연습 2', '연습 1']);
    expect(listSavedFiles(storage).files[1]?.sheetCount).toBe(3);

    const loaded = loadFromStorage(storage, '연습 1');
    expect(loaded).toEqual({ ok: true, file: FILE });

    expect(deleteFromStorage(storage, '연습 2')).toBeNull();
    expect(listSavedFiles(storage).files.map((file) => file.name)).toEqual(['연습 1']);
    expect(loadFromStorage(storage, '연습 2').ok).toBe(false);
  });

  it('연습실 전용 키 하나만 쓰고 다른 키는 건드리지 않는다(학습 모드 저장소와 분리)', () => {
    const storage = memoryStorage({ 'cellcraft.progress': '{"level":3}' });
    saveToStorage(storage, FILE);
    expect([...storage.data.keys()].sort()).toEqual(['cellcraft.progress', SANDBOX_STORAGE_KEY]);
    expect(SANDBOX_STORAGE_KEY.startsWith('cellcraft.sandbox.')).toBe(true);
    expect(storage.data.get('cellcraft.progress')).toBe('{"level":3}');
  });

  it('같은 이름으로 저장하면 덮어쓴다', () => {
    const storage = memoryStorage();
    saveToStorage(storage, FILE);
    const changed: SandboxFile = {
      ...FILE,
      workbook: { sheets: [{ name: 'Sheet1', cells: { A1: '바뀜' } }] },
    };
    saveToStorage(storage, changed);
    expect(listSavedFiles(storage).files).toHaveLength(1);
    expect(loadFromStorage(storage, '연습 1')).toEqual({ ok: true, file: changed });
  });

  it(`${MAX_SAVED_FILES}개를 넘게 저장하지 않는다`, () => {
    const storage = memoryStorage();
    for (let i = 0; i < MAX_SAVED_FILES; i += 1) {
      expect(saveToStorage(storage, { ...FILE, name: `f${i}` })).toBeNull();
    }
    expect(saveToStorage(storage, { ...FILE, name: '하나 더' })).toContain(`${MAX_SAVED_FILES}개`);
  });

  it('저장소 내용이 손상되었으면 그 항목만 건너뛴다', () => {
    const good = JSON.parse(serializeSandboxFile(FILE)) as unknown;
    const storage = memoryStorage({
      [SANDBOX_STORAGE_KEY]: JSON.stringify([good, { format: 'cellcraft-sandbox', version: 9 }]),
    });
    const listed = listSavedFiles(storage);
    expect(listed.files.map((file) => file.name)).toEqual(['연습 1']);
    expect(listed.skipped).toBe(1);
  });

  it('저장소 전체가 JSON이 아니면 안내한다', () => {
    const storage = memoryStorage({ [SANDBOX_STORAGE_KEY]: 'not json' });
    expect(listSavedFiles(storage).error).toContain('손상');
    expect(saveToStorage(storage, FILE)).toContain('손상');
  });

  it('저장소를 쓸 수 없으면(사생활 모드·용량 초과) 안내 문장을 돌려준다', () => {
    const blocked: SandboxStorage = {
      getItem: () => {
        throw new DOMException('denied', 'SecurityError');
      },
      setItem: () => undefined,
    };
    expect(listSavedFiles(blocked).error).toContain('브라우저 저장소를 사용할 수 없어');

    const full: SandboxStorage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError');
      },
    };
    expect(saveToStorage(full, FILE)).toContain('저장 공간이 부족');
  });

  it('잘못된 통합 문서는 저장하지 않는다', () => {
    const storage = memoryStorage();
    expect(saveToStorage(storage, { ...FILE, workbook: { sheets: [] } })).toContain('하나 이상');
    expect(saveToStorage(storage, { ...FILE, name: ' ' })).toContain('파일 이름');
    expect(storage.data.size).toBe(0);
  });
});

describe('내려받을 파일 이름', () => {
  it('운영체제가 받지 않는 글자를 바꾼다', () => {
    expect(downloadFileName('연습 1')).toBe('연습 1.cellcraft.json');
    expect(downloadFileName('a/b:c*?')).toBe('a_b_c__.cellcraft.json');
    expect(downloadFileName('  ')).toBe('연습실.cellcraft.json');
  });
});
