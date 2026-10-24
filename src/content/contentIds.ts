import { z } from 'zod';

/*
 * 콘텐츠 ID 체계 (CARD-03A). docs/CURRICULUM.md의 모듈 ID 형식을 따른다.
 *   courseId = 'level-{0..10}'              예) level-0   (학습 경로 /learn/level-0)
 *   moduleId = 'MOD-L{00..10}-{식별자}'      예) MOD-L00-01, MOD-L03-SUM-01
 * 대시보드의 "이어서 학습하기"와 학습 라우트(/learn/:courseId)는 이 파일의 함수로만 경로를 만든다.
 */

export const MIN_LEVEL = 0;
export const MAX_LEVEL = 10;

const COURSE_ID_PATTERN = /^level-(0|[1-9]|10)$/;
const MODULE_ID_PATTERN = /^MOD-L(0[0-9]|10)-[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

export const CourseIdSchema = z.string().regex(COURSE_ID_PATTERN, {
  message: "courseId는 'level-0' ~ 'level-10' 형식이어야 합니다.",
});

export const ModuleIdSchema = z.string().regex(MODULE_ID_PATTERN, {
  message: "moduleId는 'MOD-L00-01' 같은 형식이어야 합니다.",
});

export function courseIdForLevel(level: number): string {
  if (!Number.isInteger(level) || level < MIN_LEVEL || level > MAX_LEVEL) {
    throw new RangeError(`레벨은 ${MIN_LEVEL}~${MAX_LEVEL}의 정수여야 합니다: ${level}`);
  }
  return `level-${level}`;
}

export function levelOfCourseId(courseId: string): number {
  if (!COURSE_ID_PATTERN.test(courseId)) {
    throw new RangeError(`올바른 courseId가 아닙니다: ${courseId}`);
  }
  return Number(courseId.slice('level-'.length));
}

export function levelOfModuleId(moduleId: string): number {
  if (!MODULE_ID_PATTERN.test(moduleId)) {
    throw new RangeError(`올바른 moduleId가 아닙니다: ${moduleId}`);
  }
  return Number(moduleId.slice('MOD-L'.length, 'MOD-L'.length + 2));
}

/** 학습 화면 경로. */
export function learnPath(courseId: string): string {
  levelOfCourseId(courseId);
  return `/learn/${courseId}`;
}
