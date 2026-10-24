import { z } from 'zod';

import {
  CourseIdSchema,
  levelOfCourseId,
  levelOfModuleId,
  ModuleIdSchema,
} from '@/content/contentIds';
import { lintFormula } from '@/content/contentLint';

import { ExamVersionSchema } from './examVersion';

/*
 * 튜토리얼 단계 선언형 스키마 (CARD-03A, MASTER_PROMPT §7.1, TECHNICAL_DESIGN §4).
 * 단계는 코드가 아니라 데이터다. 한 단계는 설명, 강조 대상, 사용자가 해야 할 행동, 허용 입력,
 * 실패 조건, 힌트, 다음·이전·건너뛰기 정책을 정의한다.
 *
 * 모든 단계는 실제 조작(expectedAction)을 요구한다. "다음 버튼만 누르면 끝나는" 단계는 표현할 수 없다(R-07.13).
 */

export const CellAddressSchema = z.string().regex(/^[A-Z]{1,3}[1-9][0-9]{0,6}$/, {
  message: "셀 주소는 'B2'처럼 대문자 열 + 행 번호여야 합니다.",
});

export const RangeAddressSchema = z
  .string()
  .regex(/^[A-Z]{1,3}[1-9][0-9]{0,6}(?::[A-Z]{1,3}[1-9][0-9]{0,6})?$/, {
    message: "범위는 'B2:B7' 또는 'B2' 형식이어야 합니다.",
  });

/** 강조할 UI 요소의 data-testid (CSS 선택자를 받지 않는다). */
export const UiElementIdSchema = z.string().regex(/^[a-z][a-z0-9-]*$/, {
  message: 'UI 요소는 data-testid 형식(소문자·숫자·하이픈)이어야 합니다.',
});

export const CellValueSchema = z.union([z.string(), z.number(), z.boolean()]);

const SheetNameSchema = z.string().min(1).max(31).default('Sheet1');

/** 강조 대상 (R-07.03, R-07.04) */
export const HighlightSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('CELL'), sheetName: SheetNameSchema, cell: CellAddressSchema }),
  z.object({ type: z.literal('RANGE'), sheetName: SheetNameSchema, range: RangeAddressSchema }),
  z.object({ type: z.literal('UI_ELEMENT'), element: UiElementIdSchema }),
  z.object({ type: z.literal('FORMULA_BAR') }),
]);

/** 사용자가 해야 할 행동 (R-07.05) */
export const ExpectedActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('SELECT_CELL'), sheetName: SheetNameSchema, cell: CellAddressSchema }),
  z.object({
    type: z.literal('SELECT_RANGE'),
    sheetName: SheetNameSchema,
    range: RangeAddressSchema,
  }),
  z.object({
    type: z.literal('ENTER_VALUE'),
    sheetName: SheetNameSchema,
    cell: CellAddressSchema,
    value: CellValueSchema,
  }),
  z.object({
    type: z.literal('ENTER_FORMULA'),
    sheetName: SheetNameSchema,
    cell: CellAddressSchema,
    /** 기준 정답 수식. CURRICULUM 1.3 작성 지침 검사 대상 */
    canonicalFormula: z.string().regex(/^=/, { message: "수식은 '='로 시작해야 합니다." }),
    /** true면 기준 정답과 글자 그대로(공백·대소문자 제외) 같아야 한다 */
    requireExactFormula: z.boolean().default(false),
    /** 그 밖의 허용 수식 모양: 대소문자 무시 정규식 (공백 제거 후 비교) */
    expectedFormulaPattern: z.string().min(1).max(200).optional(),
    /** 계산 결과 (실제 수식 계산값과 비교) */
    expectedResult: CellValueSchema.optional(),
    /** 수식에 반드시 들어 있어야 하는 함수 (상수 입력으로 때우는 것을 막는다) */
    requiredFunctions: z.array(z.string().regex(/^[A-Z][A-Z0-9.]*$/)).default([]),
  }),
  z.object({
    type: z.literal('PRESS_KEY'),
    /** 예: 'F2', 'Ctrl+D'. 대소문자 무시, 아무거나 하나면 통과 */
    keys: z.array(z.string().min(1)).min(1),
  }),
  z.object({ type: z.literal('CLICK_UI'), element: UiElementIdSchema }),
  z.object({
    type: z.literal('AUTOFILL_RANGE'),
    sheetName: SheetNameSchema,
    range: RangeAddressSchema,
  }),
  z.object({
    type: z.literal('CHANGE_FORMAT'),
    sheetName: SheetNameSchema,
    range: RangeAddressSchema,
    format: z.string().min(1),
  }),
]);

export const FAILURE_REASONS = [
  'WRONG_ACTION', // 다른 종류의 조작
  'WRONG_TARGET', // 셀·범위·UI 요소·키가 다름
  'NOT_ALLOWED', // 허용 입력 밖
  'NOT_A_FORMULA', // 수식이 아닌 입력
  'WRONG_VALUE', // 값이 다름
  'WRONG_FORMULA', // 수식 모양이 다름
  'MISSING_FUNCTION', // 필수 함수 없음
  'WRONG_RESULT', // 계산 결과가 다름
] as const;

export const FailureReasonSchema = z.enum(FAILURE_REASONS);
export type FailureReason = z.infer<typeof FailureReasonSchema>;

export const TutorialStepSchema = z
  .object({
    /** 튜토리얼 안에서 유일한 단계 ID */
    id: z.string().regex(/^[A-Za-z0-9_-]+$/),
    title: z.string().min(1).max(100),
    /** 일반 텍스트. 화면에서 HTML로 해석하지 않는다 */
    description: z.string().min(1).max(2000),
    highlight: HighlightSchema,
    expectedAction: ExpectedActionSchema,
    /** 허용되는 입력 (R-07.06): 비어 있으면 제한 없음 */
    allowedInput: z
      .object({
        /** 이 범위 안에서만 입력할 수 있다 */
        cells: z.array(RangeAddressSchema).default([]),
        /** 이 키만 허용한다 */
        keys: z.array(z.string().min(1)).default([]),
      })
      .prefault({}),
    /** 실패 조건과 안내 (R-07.08) */
    failure: z
      .object({
        messages: z.partialRecord(FailureReasonSchema, z.string().min(1)).default({}),
        /** 실패가 이 횟수에 이르면 다음 힌트를 자동으로 연다 */
        autoHintAfterAttempts: z.number().int().min(1).default(3),
      })
      .prefault({}),
    hints: z.array(z.string().min(1)).max(4).default([]),
    successMessage: z.string().min(1),
    /** 다음 단계로 가는 조건 (R-07.10): auto는 행동이 맞으면 바로, confirm은 행동이 맞은 뒤 '다음' */
    next: z.object({ mode: z.enum(['auto', 'confirm']).default('auto') }).prefault({}),
    /** 이전 단계로 돌아가는 방법 (R-07.11) */
    back: z
      .object({
        allowed: z.boolean().default(true),
        /** 지정하지 않으면 바로 앞 단계. 지정하면 앞쪽 단계 ID여야 한다 */
        to: z.string().optional(),
      })
      .prefault({}),
    /** 건너뛰기 가능 여부 (R-07.12) */
    canSkip: z.boolean().default(false),
  })
  .superRefine((step, ctx) => {
    const action = step.expectedAction;
    if (action.type === 'ENTER_FORMULA') {
      for (const issue of lintFormula(action.canonicalFormula)) {
        ctx.addIssue({
          code: 'custom',
          path: ['expectedAction', 'canonicalFormula'],
          message: `[${issue.rule}] ${issue.message}`,
        });
      }
      if (action.expectedFormulaPattern !== undefined) {
        try {
          new RegExp(action.expectedFormulaPattern, 'i');
        } catch {
          ctx.addIssue({
            code: 'custom',
            path: ['expectedAction', 'expectedFormulaPattern'],
            message: '정규식이 올바르지 않습니다.',
          });
        }
      }
      if (
        !action.requireExactFormula &&
        action.expectedFormulaPattern === undefined &&
        action.expectedResult === undefined
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['expectedAction'],
          message:
            'ENTER_FORMULA는 requireExactFormula, expectedFormulaPattern, expectedResult 중 하나는 있어야 합니다.',
        });
      }
    }
    if (
      action.type === 'ENTER_VALUE' &&
      typeof action.value === 'string' &&
      action.value.startsWith('=')
    ) {
      for (const issue of lintFormula(action.value)) {
        ctx.addIssue({
          code: 'custom',
          path: ['expectedAction', 'value'],
          message: `[${issue.rule}] ${issue.message}`,
        });
      }
    }
  });

export const TutorialDefinitionSchema = z
  .object({
    /** 보통 moduleId와 같다 */
    id: ModuleIdSchema,
    courseId: CourseIdSchema,
    moduleId: ModuleIdSchema,
    title: z.string().min(1).max(100),
    examVersion: ExamVersionSchema.default('standard'),
    steps: z.array(TutorialStepSchema).min(1),
  })
  .superRefine((tutorial, ctx) => {
    if (levelOfCourseId(tutorial.courseId) !== levelOfModuleId(tutorial.moduleId)) {
      ctx.addIssue({
        code: 'custom',
        path: ['moduleId'],
        message: 'moduleId의 레벨이 courseId의 레벨과 다릅니다.',
      });
    }
    const seen = new Map<string, number>();
    tutorial.steps.forEach((step, index) => {
      if (seen.has(step.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['steps', index, 'id'],
          message: `단계 ID '${step.id}'가 중복됩니다.`,
        });
      }
      seen.set(step.id, index);
      const target = step.back.to;
      if (target !== undefined) {
        const targetIndex = seen.get(target);
        if (targetIndex === undefined || targetIndex >= index) {
          ctx.addIssue({
            code: 'custom',
            path: ['steps', index, 'back', 'to'],
            message: `back.to '${target}'는 이 단계보다 앞에 있는 단계 ID여야 합니다.`,
          });
        }
      }
    });
  });

export type TutorialStep = z.infer<typeof TutorialStepSchema>;
export type TutorialDefinition = z.infer<typeof TutorialDefinitionSchema>;
export type ExpectedAction = z.infer<typeof ExpectedActionSchema>;
export type Highlight = z.infer<typeof HighlightSchema>;
