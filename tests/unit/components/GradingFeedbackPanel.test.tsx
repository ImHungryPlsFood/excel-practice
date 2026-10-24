import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { gradeSubmission, type GradingResult } from '@/engine/grading/PerturbationScorer';
import { Dialog } from '@/features/learning/components/Dialog';
import { GradingFeedbackPanel } from '@/features/learning/components/GradingFeedbackPanel';
import { ProblemResultModal } from '@/features/learning/components/ProblemResultModal';
import { RestartConfirmDialog } from '@/features/learning/components/RestartConfirmDialog';
import { ProblemDefinitionSchema } from '@/types/problem.schema';

import { buildProblem } from '../grading/problemFixtures';

/*
 * CARD-04C 채점 피드백·결과 모달·재시작 확인 (R-09.20~26, R-09.23): 실제 채점기의 결과로 그린다.
 * 정답 값(850)과 정답 수식은 어떤 화면에도 나오지 않는다.
 */

const problem = ProblemDefinitionSchema.parse(buildProblem());

function submit(target: string): Promise<GradingResult> {
  const grid = problem.initialWorkbook.sheets['Sheet1']?.initialData.map((row) => [...row]) ?? [];
  while (grid.length < 7) grid.push([]);
  const row = grid[6] ?? [];
  row[1] = target;
  grid[6] = row;
  return gradeSubmission(problem, { sheets: { Sheet1: grid } });
}

function expectNoAnswer(text: string | null) {
  expect(text).not.toContain('850');
  expect(text).not.toContain(problem.grading.canonicalFormula);
}

describe('GradingFeedbackPanel', () => {
  it('결과가 없으면 아무것도 그리지 않는다', () => {
    const { container } = render(<GradingFeedbackPanel result={null} attempts={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('대표 오답과 같은 입력이면 출제자의 오답 설명을 따로 보여 주고, 정답은 숨긴다', async () => {
    const result = await submit('850');
    const { container } = render(<GradingFeedbackPanel result={result} attempts={2} />);
    expect(screen.getByText(/아직 완성되지 않았어요/)).toBeTruthy();
    expect(screen.getByText(/2번째 제출/)).toBeTruthy();
    expect(screen.getByTestId('feedback-misconception').textContent).toContain(
      '계산된 값을 직접 입력하셨습니다',
    );
    // 이유 본문에 오답 설명이 한 번 더 붙어 중복되지 않는다
    expect(screen.getByTestId('feedback-reason').textContent).not.toContain(
      '계산된 값을 직접 입력하셨습니다',
    );
    expect(screen.getByText(/작성한 내용은 그대로 남아 있습니다/)).toBeTruthy();
    // 학생이 직접 입력한 850은 이유 문구가 되풀이할 수 있다. 정답 수식이 나오지 않는 것만 확인한다.
    expect(container.textContent).not.toContain(problem.grading.canonicalFormula);
  });

  it('틀린 결과에는 구체적인 이유가 있고 정답 값은 없다 (R-09.23)', async () => {
    const result = await submit('=B2');
    const { container } = render(<GradingFeedbackPanel result={result} attempts={1} />);
    expect(screen.getByTestId('feedback-reason').textContent?.length).toBeGreaterThan(10);
    expectNoAnswer(container.textContent);
  });

  it('통과했지만 범위가 넓으면 범위 조언을 보여 준다', async () => {
    const result = await submit('=SUM(B1:B6)');
    expect(result.passed).toBe(true);
    render(<GradingFeedbackPanel result={result} attempts={1} />);
    expect(screen.getByText(/통과했어요/)).toBeTruthy();
    expect(screen.getByTestId('feedback-advice').textContent).toContain('B1');
  });

  it('채점 실패 안내는 경고로 알린다', () => {
    render(<GradingFeedbackPanel result={null} attempts={0} error="채점 중 문제가 생겼습니다." />);
    expect(screen.getByRole('alert').textContent).toContain('채점 중 문제');
  });
});

describe('ProblemResultModal', () => {
  it('정답 이유·점수·힌트 사용을 보여 주고 Esc로 닫으면 포커스가 돌아온다', async () => {
    const result = await submit('=SUM(B2:B6)');
    const onClose = vi.fn();
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const { unmount } = render(
      <ProblemResultModal
        result={result}
        explanation={problem.explanation}
        points={20}
        earned={16}
        hintsUsed={2}
        hintTotal={4}
        attempts={3}
        onClose={onClose}
      />,
    );
    const dialog = screen.getByRole('dialog', { name: '문제 완료' });
    expect(screen.getByTestId('result-explanation').textContent).toBe(problem.explanation);
    expect(screen.getByTestId('result-points').textContent).toBe('16/20점');
    expect(dialog.textContent).toContain('2/4단계 사용');
    expectNoAnswer(dialog.textContent);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '확인' }));

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});

describe('Dialog 포커스 가두기', () => {
  it('마지막 버튼에서 Tab하면 처음으로, 처음에서 Shift+Tab하면 마지막으로 돈다', () => {
    render(
      <Dialog title="시험" onClose={vi.fn()}>
        <button type="button">가</button>
        <button type="button">나</button>
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog');
    const first = screen.getByRole('button', { name: '가' });
    const last = screen.getByRole('button', { name: '나' });
    last.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });
});

describe('RestartConfirmDialog (R-09.25, R-09.26)', () => {
  it('처음 포커스는 취소에 있고, 취소·Esc는 확인 콜백을 부르지 않는다', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<RestartConfirmDialog onConfirm={onConfirm} onCancel={onCancel} />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '취소' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('다시 시작을 눌러야만 확인 콜백이 불린다', () => {
    const onConfirm = vi.fn();
    render(<RestartConfirmDialog onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '다시 시작' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
