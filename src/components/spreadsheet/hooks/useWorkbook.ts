import { useCallback, useEffect, useMemo, useState } from 'react';

import { HyperFormulaAdapter } from '@/engine/spreadsheet/adapters/HyperFormulaAdapter';
import {
  FormulaEngineInputError,
  type CellResult,
  type CellScalar,
} from '@/engine/spreadsheet/FormulaEngineAdapter';

import type { CellChange } from '../types';

/*
 * 화면용 통합 문서 상태 (CARD-02C, MASTER_PROMPT §8.2 "수식 입력 결과와 수식 자체를 구분해 저장하라").
 * - 원문(inputs): 사용자가 셀에 입력한 글자 그대로(=1E+3도 그대로). 편집기와 수식 입력줄에 보인다.
 * - 결과: 수식 엔진(CARD-02B)이 계산한 CellResult. 셀 화면에 보인다.
 * 엔진은 앱 코드에서 FormulaEngineAdapter 인터페이스로만 다룬다.
 */

export const WORKBOOK_SHEET = 'Sheet1';

const EMPTY_RESULT: CellResult = { value: null, displayValue: '', error: null };

const keyOf = (row: number, col: number) => `${row}:${col}`;

/** 원문을 엔진 입력으로. 빈 문자열은 셀 지우기다. 숫자·논리값 해석은 엔진이 한다. */
const toEngineContent = (raw: string): CellScalar => (raw === '' ? null : raw);

type SheetData = readonly (readonly string[])[];

function initialInputs(data: SheetData): Map<string, string> {
  const inputs = new Map<string, string>();
  data.forEach((cells, row) =>
    cells.forEach((raw, col) => {
      if (raw !== '') inputs.set(keyOf(row, col), raw);
    }),
  );
  return inputs;
}

/** 어떤 데이터·몇 번째 다시 시작으로 만든 상태인지. 다시 시작 직후 이미 정리된 이전 엔진을 읽지 않기 위해 비교한다. */
interface LoadKey {
  data: SheetData;
  generation: number;
}

interface LoadedBook extends LoadKey {
  engine: HyperFormulaAdapter;
  inputs: ReadonlyMap<string, string>;
}

interface LoadFailure extends LoadKey {
  message: string;
}

export type WorkbookStatus = 'loading' | 'ready' | 'error';

export interface Workbook {
  status: WorkbookStatus;
  /** status가 error일 때 사용자에게 보여 줄 문장 */
  loadError: string | null;
  /** 셀 원문 (없으면 빈 문자열) */
  getInput: (row: number, col: number) => string;
  /** 셀 계산 결과 */
  getResult: (row: number, col: number) => CellResult;
  /** 변경을 엔진에 반영한다. 엔진이 받아들이지 않으면(수식 길이 상한 등) 반영을 멈추고 안내 문장을 돌려준다. */
  applyChanges: (changes: readonly CellChange[]) => string | null;
  /** 처음 데이터로 되돌린다(학습 화면의 "다시 시작"). */
  reset: () => void;
}

const sameKey = (key: LoadKey | null, data: SheetData, generation: number) =>
  key !== null && key.data === data && key.generation === generation;

/**
 * @param initialData 행 우선 원문 배열. 같은 배열 참조가 유지되어야 한다(바뀌면 통합 문서를 새로 만든다).
 */
export function useWorkbook(initialData: SheetData): Workbook {
  const [generation, setGeneration] = useState(0);
  const [book, setBook] = useState<LoadedBook | null>(null);
  const [failure, setFailure] = useState<LoadFailure | null>(null);

  useEffect(() => {
    const engine = new HyperFormulaAdapter();
    let active = true;
    engine
      .initWorkbook({ [WORKBOOK_SHEET]: initialData.map((cells) => cells.map(toEngineContent)) })
      .then(() => {
        if (active) {
          setBook({ data: initialData, generation, engine, inputs: initialInputs(initialData) });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          const detail = error instanceof Error ? `: ${error.message}` : '';
          setFailure({
            data: initialData,
            generation,
            message: `시트를 불러오지 못했습니다${detail}`,
          });
        }
      });
    return () => {
      active = false;
      engine.destroy();
    };
  }, [initialData, generation]);

  const current = sameKey(book, initialData, generation) ? book : null;
  const loadError =
    failure !== null && sameKey(failure, initialData, generation) ? failure.message : null;

  const applyChanges = useCallback(
    (changes: readonly CellChange[]): string | null => {
      if (current === null) {
        return '시트를 준비하는 중입니다. 잠시 후 다시 입력하세요.';
      }
      const applied: CellChange[] = [];
      let refusal: string | null = null;
      for (const change of changes) {
        try {
          current.engine.setCellContent(
            WORKBOOK_SHEET,
            change.row,
            change.col,
            toEngineContent(change.value),
          );
        } catch (error) {
          if (!(error instanceof FormulaEngineInputError)) throw error;
          // 앞의 변경은 이미 엔진에 들어갔으므로 원문도 거기까지만 맞춘다.
          refusal = error.message;
          break;
        }
        applied.push(change);
      }
      // 엔진 값이 바뀌었으니 새 상태로 다시 그리게 한다. 한 이벤트 안에서 여러 번 불려도 원문이 누락되지 않도록
      // 직전 상태를 받아 갱신한다.
      setBook((previous) => {
        if (previous === null || previous.engine !== current.engine) return previous;
        const inputs = new Map(previous.inputs);
        for (const { row, col, value } of applied) {
          if (value === '') inputs.delete(keyOf(row, col));
          else inputs.set(keyOf(row, col), value);
        }
        return { ...previous, inputs };
      });
      return refusal;
    },
    [current],
  );

  const reset = useCallback(() => setGeneration((n) => n + 1), []);

  return useMemo(() => {
    const status: WorkbookStatus =
      loadError !== null ? 'error' : current === null ? 'loading' : 'ready';
    return {
      status,
      loadError,
      getInput: (row: number, col: number) => current?.inputs.get(keyOf(row, col)) ?? '',
      getResult: (row: number, col: number) =>
        current === null ? EMPTY_RESULT : current.engine.getCellValue(WORKBOOK_SHEET, row, col),
      applyChanges,
      reset,
    };
  }, [current, loadError, applyChanges, reset]);
}
