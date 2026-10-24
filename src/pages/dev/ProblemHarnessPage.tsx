import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { cellAddress } from '@/components/spreadsheet/hooks/useCellSelection';
import { useWorkbook } from '@/components/spreadsheet/hooks/useWorkbook';
import { Spreadsheet } from '@/components/spreadsheet/Spreadsheet';
import type { WorkbookSnapshot } from '@/components/spreadsheet/workbookModel';
import { Button } from '@/components/ui/Button';
import { GradingFeedbackPanel } from '@/features/learning/components/GradingFeedbackPanel';
import { HintAccordion } from '@/features/learning/components/HintAccordion';
import { LearningLayout } from '@/features/learning/components/LearningLayout';
import { ProblemResultModal } from '@/features/learning/components/ProblemResultModal';
import { RestartConfirmDialog } from '@/features/learning/components/RestartConfirmDialog';
import { useProblemSession } from '@/features/learning/useProblemSession';
import { ProblemDefinitionSchema, type ProblemDefinition } from '@/types/problem.schema';

/*
 * 개발 전용 문제 풀이 확인 화면 (/dev/problem, CARD-04C).
 * 개발 서버와 성능 측정 빌드(--mode perf)에서만 라우트가 등록된다.
 * 제출 → 피드백 → 힌트 → 재시작·실행 취소 흐름을 실제 시트와 채점기로 E2E 확인하는 용도다.
 * 실제 학습 라우트(/learn/:courseId)와 문제 콘텐츠는 CARD-04D에서 연결한다.
 * 이 문제는 확인용 데이터일 뿐이며, 화면·채점기 어디에도 문제 ID별 분기는 없다.
 */

const PROBLEM: ProblemDefinition = ProblemDefinitionSchema.parse({
  id: 'PRB-L03-SUM-01',
  courseId: 'level-3',
  moduleId: 'MOD-L03-SUM',
  difficulty: 'beginner',
  title: '월 매출 합계',
  goal: 'B2:B6의 매출 합계를 B7에 구하세요.',
  conditions: ['표의 숫자를 직접 더해 입력하지 않습니다.'],
  initialWorkbook: {
    activeSheet: 'Sheet1',
    sheets: {
      Sheet1: {
        rowCount: 20,
        colCount: 10,
        initialData: [
          ['항목', '금액'],
          ['A', 100],
          ['B', 250],
          ['C', 80],
          ['D', 300],
          ['E', 120],
        ],
      },
    },
  },
  allowedActions: ['ENTER_FORMULA', 'COPY_PASTE'],
  grading: {
    targetSheet: 'Sheet1',
    targetCell: 'B7',
    canonicalFormula: '=SUM(B2:B6)',
    expectedResult: 850,
    mode: 'REQUIRE_FUNCTION',
    requiredFunctions: ['SUM'],
    perturbations: [
      { kind: 'ADD_SCALAR', targetRange: 'B2:B6', value: 10 },
      { kind: 'INSERT_BLANK_ROW', targetRange: 'B2:B6' },
      { kind: 'MULTIPLY_SCALAR', targetRange: 'B2:B6', value: 2 },
    ],
  },
  misconceptions: [
    {
      diagnosis: 'HARDCODED_VALUE',
      input: '850',
      feedback:
        '계산된 값을 직접 입력하셨습니다. 표 값이 바뀌어도 결과가 따라오도록 수식을 쓰세요.',
    },
    {
      diagnosis: 'INCOMPLETE_RANGE',
      input: '=SUM(B2:B5)',
      feedback: '합계 범위에 마지막 행이 빠졌습니다.',
    },
  ],
  hints: [
    '여러 칸을 한 번에 더하는 함수를 떠올려 보세요.',
    '금액이 들어 있는 B열의 데이터 범위를 사용합니다.',
    '=함수이름(시작:끝) 모양입니다.',
    '합계 칸에 SUM 함수로 금액 범위 전체를 더합니다. 범위 전체를 더하므로 값이 바뀌어도 합계가 갱신됩니다.',
  ],
  explanation: 'SUM은 범위 안의 숫자를 모두 더합니다. 범위를 쓰면 값이 바뀌어도 합계가 따라옵니다.',
  recommendedSolution: { steps: ['B7을 선택한다', 'SUM 함수로 B2:B6을 더한다'] },
  completionCriteria: 'B7이 B2:B6의 합계를 수식으로 계산한다.',
});

function snapshotOf(problem: ProblemDefinition): WorkbookSnapshot {
  const sheets = Object.entries(problem.initialWorkbook.sheets).map(([name, sheet]) => {
    const cells: Record<string, string> = {};
    sheet.initialData.forEach((row, r) =>
      row.forEach((value, c) => {
        if (value !== null && value !== '') cells[cellAddress({ row: r, col: c })] = String(value);
      }),
    );
    return { name, cells };
  });
  return { sheets, activeSheet: problem.initialWorkbook.activeSheet };
}

const FOOTER_BUTTON =
  'rounded-md border border-line px-3 py-1 text-sm hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-50';

export function ProblemHarnessPage() {
  const source = useMemo(() => snapshotOf(PROBLEM), []);
  const workbook = useWorkbook(source);
  const session = useProblemSession(PROBLEM, workbook);
  const [confirmingRestart, setConfirmingRestart] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <LearningLayout
      header={
        <>
          <h1 className="text-sm font-semibold">문제 풀이 개발 확인 화면</h1>
          <span className="text-xs text-fg-muted">개발 전용 · 확인용 문제</span>
          <Link to="/dashboard" className="ml-auto text-sm text-brand hover:underline">
            나가기
          </Link>
        </>
      }
      task={
        <div className="flex flex-col gap-4">
          <section aria-label="문제" className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold">{PROBLEM.title}</h2>
            <p>{PROBLEM.goal}</p>
            <ul className="list-disc pl-5 text-sm text-fg-secondary">
              {PROBLEM.conditions.map((condition) => (
                <li key={condition}>{condition}</li>
              ))}
            </ul>
          </section>
          <HintAccordion
            total={PROBLEM.hints.length}
            revealed={session.hintTexts}
            onRevealNext={session.revealNextHint}
          />
          <GradingFeedbackPanel
            result={session.result}
            attempts={session.attempts}
            error={session.error}
          />
        </div>
      }
      footer={
        <>
          <span role="status" aria-label="작업 상태" className="truncate text-fg-secondary">
            {notice ?? (session.passed ? '문제를 해결했습니다' : '풀이 중')}
          </span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" onClick={() => void session.submit()} disabled={session.submitting}>
              제출
            </Button>
            <button
              type="button"
              onClick={() => {
                setNotice(null);
                workbook.undo();
              }}
              disabled={!workbook.canUndo}
              className={FOOTER_BUTTON}
            >
              실행 취소
            </button>
            <button
              type="button"
              onClick={() => {
                setNotice(
                  session.restoreSafeState()
                    ? '마지막 제출 상태로 돌렸습니다. 실행 취소로 되돌릴 수 있습니다.'
                    : '돌릴 상태가 없습니다.',
                );
              }}
              className={FOOTER_BUTTON}
            >
              마지막 제출 상태로
            </button>
            <button
              type="button"
              onClick={() => setConfirmingRestart(true)}
              className={FOOTER_BUTTON}
            >
              다시 시작
            </button>
          </div>
        </>
      }
    >
      <Spreadsheet
        workbook={workbook}
        label="작업 시트"
        rowCount={100}
        colCount={26}
        className="min-h-0 flex-1"
      />
      {confirmingRestart && (
        <RestartConfirmDialog
          onCancel={() => setConfirmingRestart(false)}
          onConfirm={() => {
            setConfirmingRestart(false);
            session.restart();
            setNotice('처음 상태로 돌렸습니다. 실행 취소로 방금 작성한 내용을 되찾을 수 있습니다.');
          }}
        />
      )}
      {session.resultOpen && session.result !== null && (
        <ProblemResultModal
          result={session.result}
          explanation={PROBLEM.explanation}
          points={PROBLEM.scoring.points}
          earned={session.earned}
          hintsUsed={session.hintsRevealed}
          hintTotal={PROBLEM.hints.length}
          attempts={session.attempts}
          onClose={session.closeResult}
        />
      )}
    </LearningLayout>
  );
}
