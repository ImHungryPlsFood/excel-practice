import type { GradingResult } from '@/engine/grading/PerturbationScorer';

/*
 * 제출 결과 피드백 (CARD-04C, MASTER_PROMPT §9.2, R-09.20~R-09.25).
 * 보여 주는 것: 구체적인 이유, 범위 조언, 출제자가 적은 대표 오답 설명.
 * 보여 주지 않는 것: 정답 값·정답 수식. 결과의 datasets[].expectedValue는 읽지도 않는다.
 * 오답이어도 학생의 시트는 그대로이고, 고쳐서 다시 제출하면 된다.
 */
interface GradingFeedbackPanelProps {
  result: GradingResult | null;
  /** 지금까지 제출한 횟수 */
  attempts: number;
  /** 채점 자체가 실패했을 때의 안내 */
  error?: string | null;
}

/** reason 끝에 붙은 대표 오답 설명·범위 조언을 떼어 본문 이유만 남긴다(채점기가 `${이유} ${덧붙임}`으로 합친다). */
function baseReason(result: GradingResult): string {
  let text = result.reason;
  for (const extra of [result.misconceptionFeedback, result.advice]) {
    if (extra !== null && text.endsWith(extra)) text = text.slice(0, -extra.length).trimEnd();
  }
  return text;
}

export function GradingFeedbackPanel({
  result,
  attempts,
  error = null,
}: GradingFeedbackPanelProps) {
  if (error !== null) {
    return (
      <section aria-label="채점 결과" role="alert" className="text-sm text-error">
        {error}
      </section>
    );
  }
  if (result === null) return null;
  return (
    <section
      aria-label="채점 결과"
      data-passed={result.passed}
      className={[
        'flex flex-col gap-2 rounded-md border p-3 text-sm',
        result.passed ? 'border-success bg-success-bg' : 'border-warning bg-warning-bg',
      ].join(' ')}
    >
      <h2
        role="status"
        className={`font-semibold ${result.passed ? 'text-success' : 'text-warning'}`}
      >
        {result.passed ? '통과했어요' : '아직 완성되지 않았어요'}
        <span className="ml-2 text-xs font-normal text-fg-muted">{attempts}번째 제출</span>
      </h2>
      <p data-testid="feedback-reason">{baseReason(result)}</p>
      {result.misconceptionFeedback !== null && (
        <p data-testid="feedback-misconception" className="rounded-md bg-surface p-2">
          <span className="font-medium">이 입력은 이런 점이 달라요: </span>
          {result.misconceptionFeedback}
        </p>
      )}
      {result.advice !== null && (
        <p data-testid="feedback-advice" className="rounded-md bg-surface p-2">
          <span className="font-medium">범위 조언: </span>
          {result.advice}
        </p>
      )}
      {!result.passed && (
        <p className="text-xs text-fg-secondary">
          작성한 내용은 그대로 남아 있습니다. 셀을 고쳐 다시 제출하거나, 실행 취소로 되돌릴 수
          있습니다.
        </p>
      )}
    </section>
  );
}
