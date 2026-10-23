import {
  checkSnapshot,
  MAX_SHEETS,
  parseA1,
  type SheetSnapshot,
  type WorkbookSnapshot,
} from '@/components/spreadsheet/workbookModel';

/*
 * 연습실 학습 파일 저장·불러오기 (CARD-02D, R-04.52, MASTER_PROMPT §4.5).
 * - 시트·셀 원문(값과 수식)을 버전 필드가 있는 JSON으로 저장한다. JSON.stringify/JSON.parse만 쓰고 eval은 쓰지 않는다(S-09).
 * - 불러오는 내용(파일, 브라우저 저장소)은 신뢰할 수 없는 입력으로 보고 형식·크기·셀 주소·수식 길이를 검사한다.
 *   검사를 통과하지 못하면 어떤 셀도 바꾸지 않고 이유를 돌려준다.
 * - 브라우저 저장소 키는 연습실 전용(cellcraft.sandbox.*)이다. 학습 모드 진도 저장(CARD-06B)과 섞이지 않는다.
 * 내구성 있는 IndexedDB 저장과 공통 직렬화 모듈은 CARD-06B(cellStateSerializer.ts)에서 통합한다.
 */

export const SANDBOX_FILE_FORMAT = 'cellcraft-sandbox';
export const SANDBOX_FILE_VERSION = 1;
export const SANDBOX_STORAGE_KEY = 'cellcraft.sandbox.files.v1';
/** 파일 하나의 최대 크기(바이트). 1000행 × 50열을 넘는 입력을 해석하기 전에 막는다. */
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_SAVED_FILES = 20;
export const MAX_FILE_NAME_LENGTH = 60;

export interface SandboxFile {
  name: string;
  /** ISO 8601 저장 시각 */
  savedAt: string;
  workbook: WorkbookSnapshot;
}

export type ParseResult = { ok: true; file: SandboxFile } | { ok: false; error: string };

/** 저장소에서 쓰는 것만 추린 Storage (테스트에서 바꿔 넣을 수 있다) */
export type SandboxStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** 저장 파일 이름 규칙. 문제가 있으면 안내 문장. */
export function validateFileName(name: string): string | null {
  if (name.trim() === '') return '파일 이름을 입력하세요.';
  if (name.length > MAX_FILE_NAME_LENGTH) {
    return `파일 이름은 ${MAX_FILE_NAME_LENGTH}자까지 쓸 수 있습니다.`;
  }
  return null;
}

/** 저장할 JSON 객체 (파일·브라우저 저장소 공통) */
function toFileObject(file: SandboxFile) {
  return {
    format: SANDBOX_FILE_FORMAT,
    version: SANDBOX_FILE_VERSION,
    name: file.name,
    savedAt: file.savedAt,
    activeSheet: file.workbook.activeSheet,
    sheets: file.workbook.sheets.map((sheet) => ({ name: sheet.name, cells: sheet.cells })),
  };
}

export function serializeSandboxFile(file: SandboxFile): string {
  return JSON.stringify(toFileObject(file));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const fail = (error: string): ParseResult => ({ ok: false, error });

/** JSON.parse 결과(아직 믿을 수 없는 값)를 검사해 SandboxFile로 만든다. */
export function validateSandboxFile(data: unknown): ParseResult {
  if (!isRecord(data)) return fail('학습 파일 형식이 아닙니다.');
  if (data.format !== SANDBOX_FILE_FORMAT) return fail('CELLCRAFT 연습실 파일이 아닙니다.');
  if (data.version !== SANDBOX_FILE_VERSION) {
    return fail(`지원하지 않는 파일 버전입니다: ${String(data.version)}`);
  }
  const { name, savedAt, activeSheet, sheets } = data;
  if (typeof name !== 'string' || validateFileName(name) !== null) {
    return fail('파일 이름이 올바르지 않습니다.');
  }
  if (typeof savedAt !== 'string' || Number.isNaN(Date.parse(savedAt))) {
    return fail('저장 시각이 올바르지 않습니다.');
  }
  if (activeSheet !== undefined && typeof activeSheet !== 'string') {
    return fail('보고 있던 시트 정보가 올바르지 않습니다.');
  }
  if (!Array.isArray(sheets) || sheets.length === 0 || sheets.length > MAX_SHEETS) {
    return fail(`시트 목록이 올바르지 않습니다(1~${MAX_SHEETS}개).`);
  }
  const parsed: SheetSnapshot[] = [];
  for (const sheet of sheets as unknown[]) {
    if (!isRecord(sheet) || typeof sheet.name !== 'string' || !isRecord(sheet.cells)) {
      return fail('시트 정보가 올바르지 않습니다.');
    }
    // 주소를 먼저 검사한 뒤 새 객체에 옮긴다. '__proto__' 같은 키는 A1 주소가 아니라서 여기서 걸러진다.
    const cells: Record<string, string> = {};
    for (const [address, raw] of Object.entries(sheet.cells)) {
      if (parseA1(address) === null) {
        return fail(`${sheet.name} 시트의 셀 주소가 올바르지 않습니다: ${address.slice(0, 20)}`);
      }
      if (typeof raw !== 'string') {
        return fail(`${sheet.name}!${address}의 값이 문자열이 아닙니다.`);
      }
      if (raw !== '') cells[address] = raw;
    }
    parsed.push({ name: sheet.name, cells });
  }
  const workbook: WorkbookSnapshot =
    activeSheet === undefined ? { sheets: parsed } : { sheets: parsed, activeSheet };
  const problem = checkSnapshot(workbook);
  if (problem !== null) return fail(problem);
  return { ok: true, file: { name, savedAt, workbook } };
}

/** 파일 내용(신뢰할 수 없는 문자열)을 해석한다. */
export function parseSandboxFile(text: string): ParseResult {
  if (new TextEncoder().encode(text).length > MAX_FILE_BYTES) {
    return fail(`파일이 너무 큽니다(최대 ${MAX_FILE_BYTES / 1024 / 1024}MB).`);
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    const detail = error instanceof Error ? ` (${error.message})` : '';
    return fail(`파일 내용을 읽을 수 없습니다. JSON 형식이 아닙니다${detail}`);
  }
  return validateSandboxFile(data);
}

// ---- 브라우저 저장소 ----

export interface SavedFileSummary {
  name: string;
  savedAt: string;
  sheetCount: number;
}

export interface StoredFiles {
  files: SandboxFile[];
  /** 손상되어 건너뛴 항목 수 */
  skipped: number;
  /** 저장소를 읽지 못했으면 이유 */
  error: string | null;
}

function storageError(error: unknown, action: string): string {
  const quota = error instanceof DOMException && error.name === 'QuotaExceededError';
  if (quota) return `브라우저 저장 공간이 부족해 ${action} 못했습니다. 오래된 파일을 삭제하세요.`;
  const detail = error instanceof Error ? ` (${error.message})` : '';
  return `브라우저 저장소를 사용할 수 없어 ${action} 못했습니다${detail}. 파일로 내려받기를 이용하세요.`;
}

/** 저장된 파일 전부. 저장소 내용도 신뢰하지 않고 항목마다 검사한다. */
export function readStoredFiles(storage: SandboxStorage): StoredFiles {
  let text: string | null;
  try {
    text = storage.getItem(SANDBOX_STORAGE_KEY);
  } catch (error) {
    return { files: [], skipped: 0, error: storageError(error, '목록을 읽지') };
  }
  if (text === null) return { files: [], skipped: 0, error: null };
  if (text.length > MAX_FILE_BYTES * MAX_SAVED_FILES) {
    return { files: [], skipped: 0, error: '저장된 연습실 파일 목록이 손상되었습니다.' };
  }
  let entries: unknown;
  try {
    entries = JSON.parse(text);
  } catch {
    return { files: [], skipped: 0, error: '저장된 연습실 파일 목록이 손상되었습니다.' };
  }
  if (!Array.isArray(entries)) {
    return { files: [], skipped: 0, error: '저장된 연습실 파일 목록이 손상되었습니다.' };
  }
  const files: SandboxFile[] = [];
  let skipped = 0;
  for (const entry of entries.slice(0, MAX_SAVED_FILES)) {
    const result = validateSandboxFile(entry);
    if (result.ok) files.push(result.file);
    else skipped += 1;
  }
  return { files, skipped, error: null };
}

export function listSavedFiles(storage: SandboxStorage): {
  files: SavedFileSummary[];
  skipped: number;
  error: string | null;
} {
  const stored = readStoredFiles(storage);
  return {
    ...stored,
    files: stored.files.map(({ name, savedAt, workbook }) => ({
      name,
      savedAt,
      sheetCount: workbook.sheets.length,
    })),
  };
}

function writeFiles(storage: SandboxStorage, files: SandboxFile[], action: string): string | null {
  const text = JSON.stringify(files.map(toFileObject));
  try {
    storage.setItem(SANDBOX_STORAGE_KEY, text);
  } catch (error) {
    return storageError(error, action);
  }
  return null;
}

/** 같은 이름이 있으면 덮어쓴다(확인은 화면이 한다). 실패하면 안내 문장. */
export function saveToStorage(storage: SandboxStorage, file: SandboxFile): string | null {
  const nameProblem = validateFileName(file.name);
  if (nameProblem !== null) return nameProblem;
  const problem = checkSnapshot(file.workbook);
  if (problem !== null) return problem;
  if (new TextEncoder().encode(serializeSandboxFile(file)).length > MAX_FILE_BYTES) {
    return `파일이 너무 큽니다(최대 ${MAX_FILE_BYTES / 1024 / 1024}MB).`;
  }
  const stored = readStoredFiles(storage);
  if (stored.error !== null) return stored.error;
  const others = stored.files.filter((saved) => saved.name !== file.name);
  if (others.length >= MAX_SAVED_FILES) {
    return `브라우저에는 파일을 ${MAX_SAVED_FILES}개까지 저장할 수 있습니다. 오래된 파일을 삭제하세요.`;
  }
  return writeFiles(storage, [file, ...others], '저장하지');
}

export function loadFromStorage(storage: SandboxStorage, name: string): ParseResult {
  const stored = readStoredFiles(storage);
  if (stored.error !== null) return fail(stored.error);
  const file = stored.files.find((saved) => saved.name === name);
  return file === undefined ? fail(`저장된 파일을 찾을 수 없습니다: ${name}`) : { ok: true, file };
}

export function deleteFromStorage(storage: SandboxStorage, name: string): string | null {
  const stored = readStoredFiles(storage);
  if (stored.error !== null) return stored.error;
  return writeFiles(
    storage,
    stored.files.filter((saved) => saved.name !== name),
    '삭제하지',
  );
}

// ---- 파일 내려받기 ----

/** 내려받을 파일 이름. 운영체제가 받지 않는 글자는 _로 바꾼다. */
export function downloadFileName(name: string): string {
  const safe = [...name.trim()]
    .map((ch) => ('<>:"/\\|?*'.includes(ch) || ch.charCodeAt(0) < 32 ? '_' : ch))
    .join('');
  return `${safe === '' ? '연습실' : safe}.cellcraft.json`;
}
