import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

import { Spreadsheet, type SpreadsheetHandle } from '@/components/spreadsheet/Spreadsheet';
import { useWorkbook } from '@/components/spreadsheet/hooks/useWorkbook';
import { TutorialSpotlight } from '@/components/tutorial/TutorialSpotlight';
import { LearningLayout } from '@/features/learning/components/LearningLayout';
import {
  TutorialStepList,
  useTutorialGuards,
} from '@/features/learning/components/TutorialStepGuards';
import { TutorialProvider } from '@/features/learning/context/TutorialContext';
import { useTutorial } from '@/features/learning/context/useTutorial';
import { TutorialDefinitionSchema } from '@/types/tutorial.schema';

/*
 * 개발 전용 튜토리얼 조작 감지 확인 화면 (/dev/tutorial, CARD-03B).
 * 개발 서버와 성능 측정 빌드(--mode perf)에서만 라우트가 등록된다.
 * 실제 그리드 조작이 러너에 전달되어 단계가 넘어가는지 E2E로 확인하는 용도이며,
 * CARD-03C: 강조 오버레이·말풍선(TutorialSpotlight)을 붙이고, 가상 스크롤 밖 셀(L60)을 강조하는 단계를 더했다.
 */

const DEFINITION = TutorialDefinitionSchema.parse({
  id: 'MOD-L03-SUM-01',
  courseId: 'level-3',
  moduleId: 'MOD-L03-SUM-01',
  title: 'SUM으로 합계 구하기',
  steps: [
    {
      id: 'select-b2',
      title: 'B2 선택',
      description: '합계를 넣을 B2 셀을 클릭하세요.',
      highlight: { type: 'CELL', cell: 'B2' },
      expectedAction: { type: 'SELECT_CELL', cell: 'B2' },
      failure: { messages: { WRONG_TARGET: 'B2 셀을 선택해야 합니다.' } },
      hints: ['열 B, 행 2의 교차점입니다.'],
      successMessage: 'B2를 선택했습니다.',
    },
    {
      id: 'pick-range',
      title: '범위 고르기',
      description: 'B2에 =SUM( 을 입력한 뒤 B3부터 B7까지 끌어서 고르세요.',
      highlight: { type: 'RANGE', range: 'B3:B7' },
      expectedAction: { type: 'SELECT_RANGE', range: 'B3:B7' },
      failure: { messages: { WRONG_TARGET: 'B3부터 B7까지 골라야 합니다.' } },
      hints: ['수식 입력 중에 셀을 끌면 참조가 들어갑니다.'],
      successMessage: 'B3:B7을 골랐습니다.',
    },
    {
      id: 'type-sum',
      title: 'SUM 입력',
      description: '괄호를 닫고 Enter로 확정하세요.',
      highlight: { type: 'CELL', cell: 'B2' },
      expectedAction: {
        type: 'ENTER_FORMULA',
        cell: 'B2',
        canonicalFormula: '=SUM(B3:B7)',
        expectedFormulaPattern: '^=SUM\\(B3:B7\\)$',
        expectedResult: 150,
        requiredFunctions: ['SUM'],
      },
      allowedInput: { cells: ['B2'] },
      failure: { messages: { NOT_ALLOWED: 'B2 셀에만 입력할 수 있습니다.' } },
      hints: ['=SUM(B3:B7)'],
      successMessage: '합계가 계산되었습니다.',
      next: { mode: 'confirm' },
    },
    {
      id: 'undo',
      title: '실행 취소',
      description: 'Ctrl+Z로 방금 입력을 되돌려 보세요.',
      highlight: { type: 'UI_ELEMENT', element: 'undo-button' },
      expectedAction: { type: 'PRESS_KEY', keys: ['Ctrl+Z'] },
      successMessage: '되돌렸습니다.',
    },
    {
      id: 'far-cell',
      title: '먼 셀 선택',
      description: '화면 밖에 있던 L60 셀을 클릭하세요.',
      highlight: { type: 'CELL', cell: 'L60' },
      expectedAction: { type: 'SELECT_CELL', cell: 'L60' },
      failure: { messages: { WRONG_TARGET: 'L60 셀을 선택해야 합니다.' } },
      successMessage: 'L60을 선택했습니다.',
    },
  ],
});

const DATA: readonly (readonly string[])[] = [
  ['항목', '값'],
  ['합계', ''],
  ['a', '10'],
  ['b', '20'],
  ['c', '30'],
  ['d', '40'],
  ['e', '50'],
];

function TutorialWorkspace() {
  const workbook = useWorkbook(DATA);
  const { state, dispatch } = useTutorial();
  const { onUserAction, inputGuard } = useTutorialGuards();
  const sheetRef = useRef<SpreadsheetHandle>(null);

  useEffect(() => {
    dispatch({ type: 'START' });
  }, [dispatch]);

  const progress =
    state.status === 'active'
      ? `단계 ${state.stepIndex + 1}/${DEFINITION.steps.length}`
      : state.status === 'completed'
        ? '완료'
        : '준비 중';

  return (
    <LearningLayout
      header={
        <>
          <h1 className="text-sm font-semibold">튜토리얼 조작 감지 개발 확인 화면</h1>
          <span className="text-xs text-fg-muted">개발 전용</span>
          <Link to="/dashboard" className="ml-auto text-sm text-brand hover:underline">
            나가기
          </Link>
        </>
      }
      guide={<TutorialStepList />}
      footer={
        <>
          <span role="status" aria-label="튜토리얼 진행" className="truncate text-fg-secondary">
            {progress}
          </span>
          <button
            type="button"
            onClick={() => {
              workbook.undo();
              onUserAction({ type: 'uiClicked', composing: false, element: 'undo-button' });
            }}
            disabled={!workbook.canUndo}
            data-testid="undo-button"
            className="ml-auto rounded-md border border-line px-3 py-1 text-sm hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-50"
          >
            실행 취소
          </button>
        </>
      }
    >
      <Spreadsheet
        ref={sheetRef}
        workbook={workbook}
        label="작업 시트"
        rowCount={100}
        colCount={26}
        onUserAction={onUserAction}
        inputGuard={inputGuard}
        className="min-h-0 flex-1"
      />
      <TutorialSpotlight sheetRef={sheetRef} activeSheet={workbook.activeSheet} />
    </LearningLayout>
  );
}

export function TutorialHarnessPage() {
  return (
    <TutorialProvider definition={DEFINITION}>
      <TutorialWorkspace />
    </TutorialProvider>
  );
}
