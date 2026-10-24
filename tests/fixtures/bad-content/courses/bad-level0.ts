import { course as base } from '../../../../src/content/courses/level0';
import { problems } from '../exercises/bad';

/* 틀린 문제 fixture를 담는 Level 0 코스. 모듈 메타데이터는 바탕 코스에서 가져와 문제 ID만 바꾼다. */
export const course = {
  ...base,
  modules: base.modules
    .filter((module) => module.id === 'MOD-L00-01')
    .map((module) => ({
      ...module,
      prerequisites: [],
      problemIds: problems.filter((p) => p.courseId === base.id).map((p) => p.id),
    })),
};
