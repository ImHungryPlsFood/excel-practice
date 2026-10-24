import { Button } from '@/components/ui/Button';

import { HINT_LABELS } from '../hints';

/*
 * 4단계 힌트 아코디언 (CARD-04C, MASTER_PROMPT §9.3, R-09.27~R-09.32).
 * 학생이 '힌트 보기'를 누르기 전에는 힌트 본문이 화면(DOM)에 없다. 한 번에 한 단계씩 순서대로만 열린다.
 * 이 컴포넌트는 문제 완료 상태를 알지 못하고 바꾸지도 않는다. 열린 단계의 본문만 부모에게서 받는다.
 */
interface HintAccordionProps {
  /** 전체 단계 수 */
  total: number;
  /** 지금까지 열린 단계의 본문(1단계부터 순서대로). 아직 열지 않은 단계는 넘기지 않는다 */
  revealed: readonly string[];
  /** 다음 단계 열기 요청 */
  onRevealNext: () => void;
}

export function HintAccordion({ total, revealed, onRevealNext }: HintAccordionProps) {
  const allOpen = revealed.length >= total;
  const nextLabel = HINT_LABELS[revealed.length];
  return (
    <section aria-label="힌트" className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold">힌트</h2>
      {revealed.length === 0 && (
        <p className="text-xs text-fg-muted">
          막혔을 때만 열어 보세요. 힌트를 봐도 답은 직접 입력해야 합니다.
        </p>
      )}
      <ol className="flex flex-col gap-2">
        {revealed.map((text, index) => (
          <li
            key={index}
            data-testid={`hint-step-${index + 1}`}
            className="rounded-md border border-line bg-subtle p-2 text-sm"
          >
            <p className="text-xs font-medium text-fg-secondary">
              {index + 1}단계 · {HINT_LABELS[index] ?? ''}
            </p>
            <p className="mt-1 whitespace-pre-wrap">{text}</p>
          </li>
        ))}
      </ol>
      {!allOpen && (
        <Button variant="secondary" size="sm" onClick={onRevealNext}>
          {revealed.length === 0 ? '힌트 보기' : `다음 힌트 보기 (${nextLabel ?? ''})`}
        </Button>
      )}
      <p role="status" aria-label="힌트 사용" className="text-xs text-fg-muted">
        힌트 {revealed.length}/{total}단계 열림
      </p>
    </section>
  );
}
