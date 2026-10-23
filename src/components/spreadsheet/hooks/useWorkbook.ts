import { useCallback, useEffect, useMemo, useState } from 'react';

import type { CellResult } from '@/engine/spreadsheet/FormulaEngineAdapter';

import type { CellChange } from '../types';
import {
  DEFAULT_SHEET,
  snapshotFromRows,
  WorkbookModel,
  type WorkbookSnapshot,
} from '../workbookModel';

/*
 * 화면용 통합 문서 상태 (CARD-02C, MASTER_PROMPT §8.2 "수식 입력 결과와 수식 자체를 구분해 저장하라").
 * - 원문: 사용자가 셀에 입력한 글자 그대로(=1E+3도 그대로). 편집기와 수식 입력줄에 보인다.
 * - 결과: 수식 엔진(CARD-02B)이 계산한 CellResult. 셀 화면에 보인다.
 * CARD-02D: 여러 시트와 실행 취소·다시 실행. 상태와 명령은 WorkbookModel(workbookModel.ts)이 가지고,
 * 이 훅은 모델을 준비하고 변경마다 다시 그리게 한다. 셀 읽기·쓰기(getInput·getResult·applyChanges)는 보고 있는 시트 기준이다.
 */

const EMPTY_RESULT: CellResult = { value: null, displayValue: '', error: null };

const NOT_READY = '시트를 준비하는 중입니다. 잠시 후 다시 입력하세요.';

type SheetData = readonly (readonly string[])[];

/** 단일 시트 원문 배열 또는 여러 시트 스냅샷 */
export type WorkbookSource = SheetData | WorkbookSnapshot;

const toSnapshot = (source: WorkbookSource): WorkbookSnapshot =>
  Array.isArray(source) ? snapshotFromRows(source as SheetData) : (source as WorkbookSnapshot);

interface LoadedBook {
  source: WorkbookSource;
  model: WorkbookModel;
}

interface LoadFailure {
  source: WorkbookSource;
  message: string;
}

export type WorkbookStatus = 'loading' | 'ready' | 'error';

export interface Workbook {
  status: WorkbookStatus;
  /** status가 error일 때 사용자에게 보여 줄 문장 */
  loadError: string | null;
  /** 보고 있는 시트의 셀 원문 (없으면 빈 문자열) */
  getInput: (row: number, col: number) => string;
  /** 보고 있는 시트의 셀 계산 결과 */
  getResult: (row: number, col: number) => CellResult;
  /** 변경을 엔진에 반영한다(실행 취소 가능). 엔진이 받아들이지 않으면 반영을 멈추고 안내 문장을 돌려준다. */
  applyChanges: (changes: readonly CellChange[]) => string | null;
  /** 처음 데이터로 되돌린다(학습 화면의 "다시 시작"). 실행 취소로 직전 작업을 되찾을 수 있다. */
  reset: () => void;

  /** 시트 이름(탭 순서) */
  sheets: readonly string[];
  /** 보고 있는 시트 */
  activeSheet: string;
  setActiveSheet: (name: string) => void;
  sheetHasData: (name: string) => boolean;
  /** 새 시트를 추가하고 그 시트로 간다. 거부되면 안내 문장. */
  addSheet: () => string | null;
  renameSheet: (oldName: string, newName: string) => string | null;
  deleteSheet: (name: string) => string | null;

  undo: () => boolean;
  redo: () => boolean;
  canUndo: boolean;
  canRedo: boolean;
  /** 실행 취소할 작업 설명(버튼 툴팁용) */
  undoLabel: string | null;
  redoLabel: string | null;

  /** 지금 통합 문서 원문 전체. 준비 전이면 null. */
  snapshot: () => WorkbookSnapshot | null;
  /** 통합 문서 전체를 바꾼다(빈 스프레드시트·파일 불러오기). 실행 취소 가능. */
  replaceWorkbook: (snapshot: WorkbookSnapshot, label: string) => string | null;
  /** 보고 있는 시트의 내용을 통째로 바꾼다(샘플 불러오기). 실행 취소 가능. */
  replaceActiveSheet: (cells: Readonly<Record<string, string>>, label: string) => string | null;
}

/**
 * @param source 행 우선 원문 배열(단일 시트) 또는 여러 시트 스냅샷. 같은 참조가 유지되어야 한다(바뀌면 통합 문서를 새로 만든다).
 */
export function useWorkbook(source: WorkbookSource): Workbook {
  const [book, setBook] = useState<LoadedBook | null>(null);
  const [failure, setFailure] = useState<LoadFailure | null>(null);

  useEffect(() => {
    let active = true;
    let created: WorkbookModel | null = null;
    WorkbookModel.create(toSnapshot(source))
      .then((model) => {
        if (active) {
          created = model;
          setBook({ source, model });
        } else {
          model.destroy();
        }
      })
      .catch((error: unknown) => {
        if (active) {
          const detail = error instanceof Error ? `: ${error.message}` : '';
          setFailure({ source, message: `시트를 불러오지 못했습니다${detail}` });
        }
      });
    return () => {
      active = false;
      created?.destroy();
    };
  }, [source]);

  const current = book !== null && book.source === source ? book : null;
  const loadError = failure !== null && failure.source === source ? failure.message : null;

  // 모델은 제자리에서 바뀌므로 변경마다 book을 새 객체로 바꿔 화면이 다시 그려지게 한다.
  const bump = useCallback(
    () => setBook((previous) => (previous === null ? null : { ...previous })),
    [],
  );

  /** 모델이 준비됐으면 변경을 실행하고 다시 그린다. 준비 전이면 안내 문장. */
  const mutate = useCallback(
    (run: (ready: WorkbookModel) => string | null): string | null => {
      if (current === null) return NOT_READY;
      const result = run(current.model);
      bump();
      return result;
    },
    [current, bump],
  );

  return useMemo(() => {
    const model = current?.model ?? null;
    const status: WorkbookStatus =
      loadError !== null ? 'error' : model === null ? 'loading' : 'ready';
    const activeSheet = model?.activeSheet ?? DEFAULT_SHEET;
    const history = model?.history;
    return {
      status,
      loadError,
      getInput: (row, col) => model?.getInput(activeSheet, row, col) ?? '',
      getResult: (row, col) => model?.getResult(activeSheet, row, col) ?? EMPTY_RESULT,
      applyChanges: (changes) => mutate((ready) => ready.setCells(activeSheet, changes)),
      reset: () => {
        mutate((ready) => ready.replaceWorkbook(toSnapshot(source), '다시 시작'));
      },

      sheets: model?.sheetNames ?? [DEFAULT_SHEET],
      activeSheet,
      setActiveSheet: (name) => {
        mutate((ready) => {
          ready.setActiveSheet(name);
          return null;
        });
      },
      sheetHasData: (name) => model?.sheetHasData(name) ?? false,
      addSheet: () =>
        mutate((ready) => {
          const added = ready.addSheet();
          return 'error' in added ? added.error : null;
        }),
      renameSheet: (oldName, newName) => mutate((ready) => ready.renameSheet(oldName, newName)),
      deleteSheet: (name) => mutate((ready) => ready.deleteSheet(name)),

      undo: () => {
        if (model === null) return false;
        const undone = model.undo() !== null;
        bump();
        return undone;
      },
      redo: () => {
        if (model === null) return false;
        const redone = model.redo() !== null;
        bump();
        return redone;
      },
      canUndo: history?.canUndo ?? false,
      canRedo: history?.canRedo ?? false,
      undoLabel: history?.undoLabel ?? null,
      redoLabel: history?.redoLabel ?? null,

      snapshot: () => model?.snapshot() ?? null,
      replaceWorkbook: (snapshot, label) =>
        mutate((ready) => ready.replaceWorkbook(snapshot, label)),
      replaceActiveSheet: (cells, label) =>
        mutate((ready) => ready.replaceSheetCells(activeSheet, cells, label)),
    };
  }, [current, loadError, mutate, bump, source]);
}
