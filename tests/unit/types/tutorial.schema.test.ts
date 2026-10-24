import { describe, expect, it } from 'vitest';

import { EXAM_VERSIONS, ExamVersionSchema } from '@/types/examVersion';
import { TutorialDefinitionSchema, TutorialStepSchema } from '@/types/tutorial.schema';

import { buildSampleTutorial } from '../tutorials/sampleTutorial';

function stepWith(expectedAction: unknown) {
  return {
    id: 's1',
    title: 't',
    description: 'd',
    highlight: { type: 'CELL', cell: 'B2' },
    expectedAction,
    successMessage: 'ok',
  };
}

describe('TutorialStepSchema', () => {
  it('생략한 정책에 기본값을 채운다', () => {
    const step = TutorialStepSchema.parse(stepWith({ type: 'SELECT_CELL', cell: 'B2' }));
    expect(step).toMatchObject({
      canSkip: false,
      hints: [],
      next: { mode: 'auto' },
      back: { allowed: true },
      allowedInput: { cells: [], keys: [] },
      failure: { messages: {}, autoHintAfterAttempts: 3 },
      highlight: { sheetName: 'Sheet1' },
      expectedAction: { sheetName: 'Sheet1' },
    });
  });

  it('행동 없이 설명만 있는 단계는 표현할 수 없다', () => {
    const withoutAction = {
      id: 's1',
      title: 't',
      description: 'd',
      highlight: { type: 'CELL', cell: 'B2' },
      successMessage: 'ok',
    };
    expect(TutorialStepSchema.safeParse(withoutAction).success).toBe(false);
    expect(TutorialStepSchema.safeParse(stepWith({ type: 'ACKNOWLEDGE' })).success).toBe(false);
  });

  it('잘못된 셀 주소·UI 요소·힌트 개수를 거부한다', () => {
    expect(
      TutorialStepSchema.safeParse(stepWith({ type: 'SELECT_CELL', cell: 'b2' })).success,
    ).toBe(false);
    expect(
      TutorialStepSchema.safeParse(stepWith({ type: 'SELECT_CELL', cell: 'B0' })).success,
    ).toBe(false);
    expect(
      TutorialStepSchema.safeParse(stepWith({ type: 'CLICK_UI', element: '#a > b' })).success,
    ).toBe(false);
    const fiveHints = {
      ...stepWith({ type: 'SELECT_CELL', cell: 'B2' }),
      hints: ['1', '2', '3', '4', '5'],
    };
    expect(TutorialStepSchema.safeParse(fiveHints).success).toBe(false);
  });

  it('ENTER_FORMULA는 검증 기준이 하나도 없으면 거부한다', () => {
    const loose = stepWith({ type: 'ENTER_FORMULA', cell: 'B2', canonicalFormula: '=SUM(B3:B7)' });
    expect(TutorialStepSchema.safeParse(loose).success).toBe(false);
    const exact = stepWith({
      type: 'ENTER_FORMULA',
      cell: 'B2',
      canonicalFormula: '=SUM(B3:B7)',
      requireExactFormula: true,
    });
    expect(TutorialStepSchema.safeParse(exact).success).toBe(true);
  });

  it('깨진 정규식을 거부한다', () => {
    const broken = stepWith({
      type: 'ENTER_FORMULA',
      cell: 'B2',
      canonicalFormula: '=SUM(B3:B7)',
      expectedFormulaPattern: '(',
    });
    expect(TutorialStepSchema.safeParse(broken).success).toBe(false);
  });

  it('정답 수식이 콘텐츠 작성 지침을 어기면 거부한다 (CURRICULUM 1.3)', () => {
    const base = { type: 'ENTER_FORMULA', cell: 'B2', requireExactFormula: true };
    const unsupported = stepWith({ ...base, canonicalFormula: '=RANK(A1,A1:A5)' });
    const result = TutorialStepSchema.safeParse(unsupported);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain('UNSUPPORTED_FUNCTION');

    const decimal = stepWith({ ...base, canonicalFormula: '="합계: "&A1/3' });
    expect(TutorialStepSchema.safeParse(decimal).success).toBe(false);
    const rounded = stepWith({ ...base, canonicalFormula: '="합계: "&ROUND(A1/3,2)' });
    expect(TutorialStepSchema.safeParse(rounded).success).toBe(true);
  });
});

describe('TutorialDefinitionSchema', () => {
  it('샘플 튜토리얼을 로드하고 examVersion 기본값은 standard', () => {
    const definition = buildSampleTutorial();
    expect(definition.steps).toHaveLength(3);
    expect(definition.examVersion).toBe('standard');
  });

  it.each(EXAM_VERSIONS)('출제기준 버전 %s을 담을 수 있다', (version) => {
    const raw = { ...buildSampleTutorial(), examVersion: version };
    expect(TutorialDefinitionSchema.parse(raw).examVersion).toBe(version);
  });

  it('정의되지 않은 출제기준 버전을 거부한다', () => {
    expect(ExamVersionSchema.safeParse('2030-2032').success).toBe(false);
    const raw = { ...buildSampleTutorial(), examVersion: '2030-2032' };
    expect(TutorialDefinitionSchema.safeParse(raw).success).toBe(false);
  });

  it('courseId와 moduleId의 레벨이 다르면 거부한다', () => {
    const raw = { ...buildSampleTutorial(), courseId: 'level-4' };
    expect(TutorialDefinitionSchema.safeParse(raw).success).toBe(false);
  });

  it('단계 ID 중복과 앞쪽이 아닌 back.to 를 거부한다', () => {
    const base = buildSampleTutorial();
    const first = base.steps[0];
    const second = base.steps[1];
    if (first === undefined || second === undefined) throw new Error('샘플 단계가 부족합니다.');
    expect(
      TutorialDefinitionSchema.safeParse({ ...base, steps: [first, { ...second, id: first.id }] })
        .success,
    ).toBe(false);
    expect(
      TutorialDefinitionSchema.safeParse({
        ...base,
        steps: [first, { ...second, back: { allowed: true, to: 'press-f2' } }],
      }).success,
    ).toBe(false);
  });
});
