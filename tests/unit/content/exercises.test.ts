import { describe, expect, it } from 'vitest';

import { gradeSubmission, type SheetContents } from '@/engine/grading/PerturbationScorer';
import { getContentLoader } from '@/engine/grading/problemLoader';
import { positionOfAddress } from '@/engine/spreadsheet/operations/referenceShift';
import type { CellScalar } from '@/engine/spreadsheet/FormulaEngineAdapter';
import type { ProblemDefinition } from '@/types/problem.schema';

/*
 * CARD-04D 실제 문제 콘텐츠 검증 (MASTER_PROMPT §10, R-09.33, R-09.44, Q-03).
 * 모든 문제에 대해 기준 정답이 채점기를 통과하고, 대표 오답이 선언한 판정 코드로 판정되는지 본다.
 * 채점기·테스트에는 문제 ID별 분기가 없다.
 */

const loader = getContentLoader();
const problems = loader.listProblems();

function submissionWith(problem: ProblemDefinition, input: string): SheetContents {
  const sheets: Record<string, CellScalar[][]> = {};
  for (const [name, sheet] of Object.entries(problem.initialWorkbook.sheets)) {
    sheets[name] = sheet.initialData.map((row) => [...row]);
  }
  const position = positionOfAddress(problem.grading.targetCell);
  if (position === null) throw new Error(`대상 셀 주소 오류: ${problem.grading.targetCell}`);
  const grid = sheets[problem.grading.targetSheet] ?? [];
  while (grid.length <= position.row) grid.push([]);
  const line = grid[position.row] ?? [];
  while (line.length <= position.col) line.push(null);
  line[position.col] = /^-?\d+(\.\d+)?$/.test(input) ? Number(input) : input; // 화면과 같이 숫자 원문은 숫자로 채점기에 넘긴다
  grid[position.row] = line;
  sheets[problem.grading.targetSheet] = grid;
  return sheets;
}

const grade = (problem: ProblemDefinition, input: string) =>
  gradeSubmission(problem, { sheets: submissionWith(problem, input) });

describe('기초 문제 콘텐츠 구성', () => {
  it('Level 0~3에 10문항(3/0/3/4)이 있고 서식 코스(Level 1)에는 아직 문제가 없다', () => {
    const count = (courseId: string) => problems.filter((p) => p.courseId === courseId).length;
    expect(problems).toHaveLength(10);
    expect([0, 1, 2, 3].map((level) => count(`level-${level}`))).toEqual([3, 0, 3, 4]);
  });

  it('문제 ID와 제목이 겹치지 않는다', () => {
    expect(new Set(problems.map((p) => p.id)).size).toBe(problems.length);
    expect(new Set(problems.map((p) => p.title)).size).toBe(problems.length);
  });

  it('같은 정답 수식 구조에 숫자와 주소만 바꾼 문제가 없다 (R-09.33)', () => {
    // 주소와 숫자를 지운 뼈대 + 시작 데이터 모양이 같으면 같은 문제로 본다.
    const skeleton = (p: ProblemDefinition) => {
      const formula = p.grading.canonicalFormula
        .replace(/\$?[A-Z]+\$?\d+/g, 'REF')
        .replace(/\d+/g, 'N');
      const sheet = p.initialWorkbook.sheets[p.grading.targetSheet];
      return `${formula}|${sheet?.initialData.length}x${Math.max(0, ...(sheet?.initialData.map((r) => r.length) ?? []))}`;
    };
    expect(new Set(problems.map(skeleton)).size).toBe(problems.length);
  });

  it.each(problems.map((p) => [p.id, p] as const))(
    '%s: 문장이 한국어이고 읽기 전용 칸이 있으며 정답 칸은 입력할 수 있다',
    (_id, p) => {
      const hangul = /[가-힣]/;
      for (const text of [
        p.title,
        p.goal,
        p.explanation,
        p.completionCriteria,
        ...p.hints,
        ...p.misconceptions.map((m) => m.feedback),
      ]) {
        expect(text).toMatch(hangul);
      }
      const sheet = p.initialWorkbook.sheets[p.grading.targetSheet];
      expect(sheet?.readOnlyRanges.length).toBeGreaterThan(0);
      expect(p.misconceptions.length).toBeGreaterThanOrEqual(2);
    },
  );
});

describe.each(problems.map((p) => [p.id, p] as const))('%s 채점 검증', (_id, problem) => {
  it('기준 정답 수식이 PASS로 채점된다', async () => {
    const result = await grade(problem, problem.grading.canonicalFormula);
    expect(result.passed).toBe(true);
    expect(result.diagnosis).toBe('PASS');
  });

  it('권장 해결 수식과 대체 해결 수식이 통과한다', async () => {
    const formulas = [
      problem.recommendedSolution.formula,
      ...problem.alternativeSolutions.map((a) => a.formula),
    ].filter((f): f is string => f !== undefined);
    for (const formula of formulas) {
      const result = await grade(problem, formula);
      expect(result.passed, formula).toBe(true);
    }
  });

  it('모든 대표 오답이 선언한 판정 코드로 판정되고 오답 안내가 연결된다', async () => {
    for (const misconception of problem.misconceptions) {
      const result = await grade(problem, misconception.input);
      expect(result.passed, misconception.input).toBe(false);
      expect(result.diagnosis, misconception.input).toBe(misconception.diagnosis);
      expect(result.misconceptionFeedback, misconception.input).toBe(misconception.feedback);
    }
  });

  it('아무것도 입력하지 않으면 통과하지 못한다', async () => {
    const result = await gradeSubmission(problem, {
      sheets: Object.fromEntries(
        Object.entries(problem.initialWorkbook.sheets).map(([name, sheet]) => [
          name,
          sheet.initialData.map((row) => [...row]),
        ]),
      ),
    });
    // 채우기 문제처럼 대상 칸이 비어 있지 않은 시작 상태는 없다.
    expect(result.passed).toBe(false);
  });
});
