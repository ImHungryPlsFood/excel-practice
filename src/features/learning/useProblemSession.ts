import { useCallback, useEffect, useRef, useState } from 'react';

import type { Workbook } from '@/components/spreadsheet/hooks/useWorkbook';
import type { WorkbookSnapshot } from '@/components/spreadsheet/workbookModel';
import {
  GradingContentError,
  gradeSubmission,
  type GradingResult,
  type SheetContents,
} from '@/engine/grading/PerturbationScorer';
import { positionOfAddress } from '@/engine/spreadsheet/operations/referenceShift';
import type { CellScalar } from '@/engine/spreadsheet/FormulaEngineAdapter';
import type { ProblemDefinition } from '@/types/problem.schema';

import { earnedPoints, revealedHints } from './hints';

/*
 * 한 문제를 푸는 동안의 상태 (CARD-04C): 제출 결과, 열어 본 힌트 단계, 안전 상태.
 * 채점은 학생 시트를 읽기만 한다(오답이어도 지우지 않는다, R-09.20·R-09.25).
 * 안전 상태 = 마지막으로 제출한 시트(제출 전이면 시작 상태). 되돌려도 실행 취소로 다시 되찾을 수 있다(R-09.24).
 * 힌트 단계와 제출 횟수는 재시작해도 유지한다(학습 기록, 처벌 없음, R-09.32).
 */

/** 시트 스냅샷(A1 키 → 원문)을 채점기가 받는 격자로 바꾼다. */
export function sheetContentsOf(snapshot: WorkbookSnapshot): SheetContents {
  const sheets: Record<string, CellScalar[][]> = {};
  for (const sheet of snapshot.sheets) {
    const grid: CellScalar[][] = [];
    for (const [address, raw] of Object.entries(sheet.cells)) {
      const position = positionOfAddress(address);
      if (position === null) continue;
      while (grid.length <= position.row) grid.push([]);
      const line = grid[position.row] ?? [];
      while (line.length <= position.col) line.push(null);
      line[position.col] = raw;
      grid[position.row] = line;
    }
    sheets[sheet.name] = grid;
  }
  return sheets;
}

export interface ProblemSession {
  result: GradingResult | null;
  /** 채점 자체가 실패했을 때의 안내(문제 콘텐츠 오류 등) */
  error: string | null;
  attempts: number;
  submitting: boolean;
  /** 한 번이라도 통과했다 */
  passed: boolean;
  /** 결과 모달을 열어 둘지 */
  resultOpen: boolean;
  closeResult: () => void;
  hintsRevealed: number;
  hintTexts: string[];
  revealNextHint: () => void;
  earned: number;
  submit: () => Promise<void>;
  /** 마지막 제출(없으면 시작) 상태로 시트를 돌린다. 돌릴 수 없으면 false */
  restoreSafeState: () => boolean;
  /** 확인을 받은 뒤 호출한다: 시작 상태로 되돌리고 이전 채점 표시를 지운다 */
  restart: () => void;
}

export function useProblemSession(problem: ProblemDefinition, workbook: Workbook): ProblemSession {
  const [result, setResult] = useState<GradingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [passed, setPassed] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const safeState = useRef<WorkbookSnapshot | null>(null);
  const workbookRef = useRef(workbook);
  useEffect(() => {
    workbookRef.current = workbook;
    // 시작 상태: 처음 준비된 시트를 한 번만 잡아 둔다.
    if (safeState.current === null && workbook.status === 'ready') {
      safeState.current = workbook.snapshot();
    }
  });

  const submit = useCallback(async () => {
    const snapshot = workbookRef.current.snapshot();
    if (snapshot === null) {
      setError('시트가 아직 준비되지 않았습니다.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const graded = await gradeSubmission(problem, { sheets: sheetContentsOf(snapshot) });
      safeState.current = snapshot;
      setAttempts((count) => count + 1);
      setResult(graded);
      if (graded.passed) {
        setPassed(true);
        setResultOpen(true);
      }
    } catch (caught) {
      setError(
        caught instanceof GradingContentError
          ? `이 문제는 지금 채점할 수 없습니다. ${caught.message}`
          : '채점 중 문제가 생겼습니다. 작성한 내용은 그대로입니다. 다시 제출해 보세요.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [problem]);

  const restoreSafeState = useCallback(() => {
    const safe = safeState.current;
    if (safe === null) return false;
    return workbookRef.current.replaceWorkbook(safe, '마지막 제출 상태로 돌리기') === null;
  }, []);

  const restart = useCallback(() => {
    workbookRef.current.reset();
    setResult(null);
    setError(null);
  }, []);

  return {
    result,
    error,
    attempts,
    submitting,
    passed,
    resultOpen,
    closeResult: () => setResultOpen(false),
    hintsRevealed,
    hintTexts: revealedHints(problem, hintsRevealed),
    revealNextHint: () => setHintsRevealed((count) => Math.min(count + 1, problem.hints.length)),
    earned: earnedPoints(problem.scoring, hintsRevealed),
    submit,
    restoreSafeState,
    restart,
  };
}
