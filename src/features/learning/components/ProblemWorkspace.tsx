import { useMemo, useState, type ReactNode } from 'react';

import { cellAddress } from '@/components/spreadsheet/hooks/useCellSelection';
import { useWorkbook } from '@/components/spreadsheet/hooks/useWorkbook';
import { Spreadsheet } from '@/components/spreadsheet/Spreadsheet';
import type { ReadOnlyRanges, WorkbookSnapshot } from '@/components/spreadsheet/workbookModel';
import { Button } from '@/components/ui/Button';
import type { ProblemDefinition } from '@/types/problem.schema';

import { useProblemSession } from '../useProblemSession';
import { GradingFeedbackPanel } from './GradingFeedbackPanel';
import { HintAccordion } from './HintAccordion';
import { LearningLayout } from './LearningLayout';
import { ProblemResultModal } from './ProblemResultModal';
import { RestartConfirmDialog } from './RestartConfirmDialog';

/*
 * 문제 하나를 푸는 작업 화면 (CARD-04C의 /dev/problem 본문을 CARD-04D에서 추출).
 * 실제 학습 화면(/learn/:courseId)과 개발 확인 화면이 같이 쓴다. 문제 ID별 분기는 없다.
 * 문제의 readOnlyRanges와 allowedActions는 통합 문서 모델이 강제한다(workbookModel). 거부 안내는 시트가 보여 준다.
 * 문제가 바뀌면 호출하는 쪽에서 key={problem.id}로 새로 만든다.
 */

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

function readOnlyRangesOf(problem: ProblemDefinition): ReadOnlyRanges {
  return Object.fromEntries(
    Object.entries(problem.initialWorkbook.sheets).map(([name, sheet]) => [
      name,
      sheet.readOnlyRanges,
    ]),
  );
}

const FOOTER_BUTTON =
  'rounded-md border border-line px-3 py-1 text-sm hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-50';

interface ProblemWorkspaceProps {
  problem: ProblemDefinition;
  /** 상단 바 내용 */
  header: ReactNode;
  /** 왼쪽 학습 안내 (개념 설명 등) */
  guide?: ReactNode;
  /** 하단 오른쪽 맨 끝 버튼 (예: 다음 문제). 이 문제를 해결했는지 알려 준다. */
  footerAction?: (passed: boolean) => ReactNode;
}

export function ProblemWorkspace({ problem, header, guide, footerAction }: ProblemWorkspaceProps) {
  const source = useMemo(() => snapshotOf(problem), [problem]);
  const readOnlyRanges = useMemo(() => readOnlyRangesOf(problem), [problem]);
  const workbook = useWorkbook(source, readOnlyRanges, problem.allowedActions);
  const session = useProblemSession(problem, workbook);
  const [confirmingRestart, setConfirmingRestart] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <LearningLayout
      header={header}
      guide={guide}
      task={
        <div className="flex flex-col gap-4">
          <section aria-label="문제" className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold">{problem.title}</h2>
            <p>{problem.goal}</p>
            <ul className="list-disc pl-5 text-sm text-fg-secondary">
              {problem.conditions.map((condition) => (
                <li key={condition}>{condition}</li>
              ))}
            </ul>
          </section>
          <HintAccordion
            total={problem.hints.length}
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
            {footerAction?.(session.passed)}
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
          explanation={problem.explanation}
          points={problem.scoring.points}
          earned={session.earned}
          hintsUsed={session.hintsRevealed}
          hintTotal={problem.hints.length}
          attempts={session.attempts}
          onClose={session.closeResult}
        />
      )}
    </LearningLayout>
  );
}
