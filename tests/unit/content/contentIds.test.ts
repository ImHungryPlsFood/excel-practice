import { describe, expect, it } from 'vitest';

import {
  CourseIdSchema,
  courseIdForLevel,
  learnPath,
  levelOfCourseId,
  levelOfModuleId,
  ModuleIdSchema,
} from '@/content/contentIds';
import { createEmptyDashboardData } from '@/features/dashboard/emptyDashboard';

describe('contentIds', () => {
  it('level-0 ~ level-10 만 courseId로 인정한다', () => {
    for (let level = 0; level <= 10; level += 1) {
      expect(CourseIdSchema.safeParse(`level-${level}`).success).toBe(true);
    }
    for (const bad of ['level-11', 'level-00', 'level-', 'Level-1', 'course-1', 'level--1']) {
      expect(CourseIdSchema.safeParse(bad).success).toBe(false);
    }
  });

  it('CURRICULUM의 모듈 ID 형식을 인정한다', () => {
    for (const ok of ['MOD-L00-01', 'MOD-L01-02', 'MOD-L03-SUM-01', 'MOD-L10-12']) {
      expect(ModuleIdSchema.safeParse(ok).success).toBe(true);
    }
    for (const bad of ['MOD-L11-01', 'MOD-L0-01', 'mod-l00-01', 'MOD-L00', 'L00-01']) {
      expect(ModuleIdSchema.safeParse(bad).success).toBe(false);
    }
  });

  it('레벨과 courseId·moduleId를 서로 변환한다', () => {
    expect(courseIdForLevel(0)).toBe('level-0');
    expect(levelOfCourseId('level-10')).toBe(10);
    expect(levelOfModuleId('MOD-L03-SUM-01')).toBe(3);
    expect(() => courseIdForLevel(11)).toThrow(RangeError);
    expect(() => courseIdForLevel(1.5)).toThrow(RangeError);
    expect(() => levelOfCourseId('abc')).toThrow(RangeError);
  });

  it('학습 경로는 /learn/:courseId', () => {
    expect(learnPath('level-0')).toBe('/learn/level-0');
    expect(() => learnPath('nope')).toThrow(RangeError);
  });

  it('대시보드의 "이어서 학습하기" 경로가 콘텐츠 ID 체계에서 만들어진다', () => {
    expect(createEmptyDashboardData().nextAction.to).toBe(learnPath(courseIdForLevel(0)));
  });
});
