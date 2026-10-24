import type { ProblemDefinition } from '@/types/problem.schema';

/*
 * 단계별 힌트 (CARD-04C, MASTER_PROMPT §9.3, R-09.27~R-09.30).
 * PublicProblem은 힌트 본문을 빼고 단계 수만 알려 준다. 본문은 학생이 해당 단계를 요청했을 때만 이 함수로 꺼낸다.
 * 아직 요청하지 않은 단계는 돌려주지 않는다.
 */
export const HINT_LABELS = [
  '필요한 개념',
  '사용할 범위·기능',
  '수식 골격·작업 순서',
  '완전한 풀이',
] as const;

/** 1단계부터 revealedCount단계까지의 본문. 요청하지 않은 단계는 들어 있지 않다. */
export function revealedHints(
  problem: { readonly hints: readonly string[] },
  revealedCount: number,
): string[] {
  const count = Math.max(0, Math.min(revealedCount, problem.hints.length));
  return problem.hints.slice(0, count);
}

/** 힌트 사용에 따른 얻는 점수. 감점은 단계당 고정값이고 0점 아래로 내려가지 않는다(R-09.32). */
export function earnedPoints(
  scoring: Pick<ProblemDefinition['scoring'], 'points' | 'hintPenaltyPerStep'>,
  revealedCount: number,
): number {
  return Math.max(0, scoring.points - scoring.hintPenaltyPerStep * revealedCount);
}
