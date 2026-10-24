import { problems as level0 } from '../../../../src/content/exercises/level0/intro-cells';

/* 스키마를 어긴 문제 (CARD-04E 테스트 전용): 목표(goal)가 없고 허용 작업이 빈 배열이다. */
const [ref] = level0;
if (ref === undefined) throw new Error('바탕 문제가 없습니다.');
const withoutGoal = Object.fromEntries(Object.entries(ref).filter(([key]) => key !== 'goal'));

export const problems = [{ ...withoutGoal, id: 'PRB-L00-BADSCH-01', allowedActions: [] }];
