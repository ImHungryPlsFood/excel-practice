import { Button } from '@/components/ui/Button';
import type { GradingResult } from '@/engine/grading/PerturbationScorer';

import { Dialog } from './Dialog';

/*
 * 문제 완료 결과 (CARD-04C, R-09.11). 통과했을 때만 연다.
 * 정답 이유(explanation)와 통과 방식, 범위 조언, 힌트 사용 정보를 보여 준다. 힌트 사용은 정보일 뿐 꾸짖지 않는다(R-09.32).
 */
interface ProblemResultModalProps {
  result: GradingResult;
  explanation: string;
  points: number;
  earned: number;
  hintsUsed: number;
  hintTotal: number;
  attempts: number;
  onClose: () => void;
}

export function ProblemResultModal({
  result,
  explanation,
  points,
  earned,
  hintsUsed,
  hintTotal,
  attempts,
  onClose,
}: ProblemResultModalProps) {
  return (
    <Dialog title="문제 완료" onClose={onClose}>
      <h2 className="text-lg font-semibold text-success">문제를 해결했어요</h2>
      <p>
        {result.diagnosis === 'ALTERNATE_FORMULA_PASS'
          ? '다른 방식의 수식이지만 데이터가 바뀌어도 같은 결과를 냅니다.'
          : '데이터가 바뀌어도 맞는 결과를 내는 수식입니다.'}
      </p>
      <div>
        <h3 className="text-sm font-semibold">왜 맞는지</h3>
        <p data-testid="result-explanation" className="mt-1 whitespace-pre-wrap">
          {explanation}
        </p>
      </div>
      {result.advice !== null && (
        <p className="rounded-md bg-subtle p-2">
          <span className="font-medium">범위 조언: </span>
          {result.advice}
        </p>
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-fg-secondary">
        <dt>점수</dt>
        <dd data-testid="result-points">
          {earned}/{points}점
        </dd>
        <dt>힌트</dt>
        <dd>
          {hintsUsed}/{hintTotal}단계 사용
        </dd>
        <dt>제출</dt>
        <dd>{attempts}번</dd>
      </dl>
      <Button data-autofocus onClick={onClose} className="self-end">
        확인
      </Button>
    </Dialog>
  );
}
