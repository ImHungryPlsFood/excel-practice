import type { ContentFailure } from '@/content/verifyContent';
import { HyperFormulaAdapter } from '@/engine/spreadsheet/adapters/HyperFormulaAdapter';
import type { CellScalar } from '@/engine/spreadsheet/FormulaEngineAdapter';

import { CONTENT_DATASETS, type ContentDataset, type DatasetRows } from './sampleData';

/*
 * 가상 데이터셋 점검 (CARD-04E, R-10.01~R-10.14). verify-content가 부른다.
 * 요구한 데이터 종류가 모두 있는지, 개인정보·실존 기업 이름이 없는지, 수식이 오류 없이 계산되는지,
 * 숫자가 지나치게 규칙적이지 않은지, 오류 데이터와 여러 시트 데이터가 실제로 그런 모양인지 본다.
 */

/** 요구사항 R-10.01~R-10.10이 각각 가리키는 데이터 */
export const REQUIRED_DATASET_REQUIREMENTS = [
  'R-10.01',
  'R-10.02',
  'R-10.03',
  'R-10.04',
  'R-10.05',
  'R-10.06',
  'R-10.07',
  'R-10.08',
  'R-10.09',
  'R-10.10',
] as const;

const PRIVACY_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\b01\d-?\d{3,4}-?\d{4}\b|\b0\d{1,2}-\d{3,4}-\d{4}\b/, '전화번호 형식'],
  [/[\w.+-]+@[\w-]+\.[\w.]+/, '이메일 형식'],
  [/\b\d{6}-?[1-4]\d{6}\b/, '주민등록번호 형식'],
];

/** 실존하는 기업·서비스 이름. 가상 데이터에 쓰지 않는다. */
const REAL_BRANDS = [
  '삼성',
  '현대',
  '네이버',
  '카카오',
  '쿠팡',
  '롯데',
  '신한',
  '국민은행',
  '구글',
  'google',
  'apple',
  'microsoft',
  'amazon',
];

const NUMBER = /^-?\d+(\.\d+)?$/;

const columnLetter = (c: number): string => String.fromCharCode(65 + c);

function* cellsOf(
  dataset: ContentDataset,
): Generator<{ sheet: string; address: string; raw: string }> {
  for (const [sheet, rows] of Object.entries(dataset.sheets)) {
    for (const [r, row] of rows.entries()) {
      for (const [c, raw] of row.entries()) {
        yield { sheet, address: `${columnLetter(c)}${r + 1}`, raw };
      }
    }
  }
}

function numericColumns(rows: DatasetRows): number[][] {
  const width = Math.max(0, ...rows.map((row) => row.length));
  return Array.from({ length: width }, (_unused, c) =>
    rows.flatMap((row) => {
      const raw = row[c] ?? '';
      return NUMBER.test(raw) ? [Number(raw)] : [];
    }),
  );
}

function isTooRegular(values: readonly number[]): boolean {
  if (values.length < 5) return false;
  if (new Set(values).size === 1) return true;
  const step = (values[1] ?? 0) - (values[0] ?? 0);
  return values.every((value, i) => i === 0 || value - (values[i - 1] ?? 0) === step);
}

async function errorCells(dataset: ContentDataset): Promise<string[]> {
  const engine = new HyperFormulaAdapter();
  try {
    const sheets: Record<string, CellScalar[][]> = {};
    for (const [name, rows] of Object.entries(dataset.sheets)) {
      sheets[name] = rows.map((row) => row.map((raw) => (raw === '' ? null : raw)));
    }
    await engine.initWorkbook(sheets);
    const errors: string[] = [];
    for (const name of Object.keys(sheets)) {
      engine.getSheetGrid(name).forEach((row, r) =>
        row.forEach((cell, c) => {
          if (cell.error !== null) {
            errors.push(`${name}!${columnLetter(c)}${r + 1}(${cell.error.code})`);
          }
        }),
      );
    }
    return errors;
  } finally {
    engine.destroy();
  }
}

export async function verifyDatasets(
  datasets: readonly ContentDataset[] = CONTENT_DATASETS,
): Promise<ContentFailure[]> {
  const failures: ContentFailure[] = [];
  const fail = (id: string, message: string) =>
    failures.push({ problemId: `데이터셋 ${id}`, check: '가상 데이터', message });

  for (const requirement of REQUIRED_DATASET_REQUIREMENTS) {
    if (!datasets.some((dataset) => dataset.requirement === requirement)) {
      fail('(전체)', `${requirement}에 해당하는 데이터셋이 없습니다.`);
    }
  }
  const seen = new Set<string>();
  for (const dataset of datasets) {
    if (seen.has(dataset.id)) fail(dataset.id, '데이터셋 ID가 중복됩니다.');
    seen.add(dataset.id);

    for (const { sheet, address, raw } of cellsOf(dataset)) {
      for (const [pattern, label] of PRIVACY_PATTERNS) {
        if (pattern.test(raw)) {
          fail(
            dataset.id,
            `${sheet}!${address}에 ${label}의 값이 있습니다. 개인정보를 쓰지 마세요(R-10.13).`,
          );
        }
      }
      const brand = REAL_BRANDS.find((name) => raw.toLowerCase().includes(name));
      if (brand !== undefined) {
        fail(
          dataset.id,
          `${sheet}!${address}에 실존 기업·서비스 이름 '${brand}'이(가) 있습니다. 가상 이름을 쓰세요(R-10.13).`,
        );
      }
    }

    for (const [sheet, rows] of Object.entries(dataset.sheets)) {
      numericColumns(rows).forEach((values, c) => {
        if (isTooRegular(values)) {
          fail(
            dataset.id,
            `${sheet} 시트 ${columnLetter(c)}열의 숫자가 모두 같거나 일정하게 늘어납니다. 데이터는 지나치게 규칙적이지 않게 만드세요(R-10.11).`,
          );
        }
      });
    }

    const errors = await errorCells(dataset);
    if (errors.length > 0) fail(dataset.id, `수식이 오류가 됩니다: ${errors.join(', ')}`);

    const sheetRows = Object.values(dataset.sheets);
    if (dataset.requirement === 'R-10.10') {
      const crossSheet = sheetRows.some((rows) =>
        rows.some((row) => row.some((raw) => raw.startsWith('=') && raw.includes('!'))),
      );
      if (sheetRows.length < 2 || !crossSheet) {
        fail(
          dataset.id,
          '여러 시트로 나뉜 자료는 시트가 둘 이상이고 다른 시트를 참조하는 수식이 있어야 합니다(R-10.10).',
        );
      }
    }
    if (dataset.requirement === 'R-10.09') {
      const rows = sheetRows.flat();
      const flaws = dataset.flaws ?? [];
      const hasBlank = rows.slice(1).some((row) => row.some((raw) => raw === ''));
      const keys = rows.map((row) => row.join('\u0000'));
      const hasDuplicate = new Set(keys).size < keys.length;
      if (flaws.length === 0 || (flaws.includes('BLANK_CELL') && !hasBlank)) {
        fail(
          dataset.id,
          '오류가 섞인 데이터는 선언한 문제(빈 셀 등)가 실제로 들어 있어야 합니다(R-10.09).',
        );
      }
      if (flaws.includes('DUPLICATE_ROW') && !hasDuplicate) {
        fail(dataset.id, '중복 행을 선언했지만 중복 행이 없습니다(R-10.09).');
      }
    } else if (dataset.flaws !== undefined) {
      fail(
        dataset.id,
        '오류를 일부러 섞은 데이터는 R-10.09 데이터셋에만 둡니다. 다른 데이터는 불필요한 혼란을 만들지 마세요(R-10.12).',
      );
    }
  }
  return failures;
}
