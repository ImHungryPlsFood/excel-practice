import { type ZodError } from 'zod';

import {
  CourseMetaSchema,
  ProblemDefinitionSchema,
  type CourseMeta,
  type ModuleMeta,
  type ProblemDefinition,
} from '@/types/problem.schema';

/*
 * 문제·코스 독립 로더 (CARD-04A, R-06.18, R-06.19).
 * 콘텐츠 파일(src/content/**)을 읽어 스키마로 검증하고 조회 API만 내놓는다. UI는 이 모듈로만 문제를 얻으며
 * 문제 ID나 정답을 코드에 적지 않는다. 새 문제는 콘텐츠 파일만 추가하면 로더가 찾는다.
 *
 * 콘텐츠 파일 규칙:
 *   src/content/courses/*.ts      export const course   (CourseMetaSchema)
 *   src/content/exercises 아래 .ts  export const problems (ProblemDefinitionSchema 배열)
 */

/** 콘텐츠 파일 경로 → 그 파일이 export한 모듈 */
export type ContentModules = Readonly<Record<string, unknown>>;

export interface ContentSource {
  courses: ContentModules;
  exercises: ContentModules;
}

export class ContentLoadError extends Error {
  override readonly name = 'ContentLoadError';
  constructor(readonly problems: readonly string[]) {
    super(`콘텐츠를 불러오지 못했습니다:\n- ${problems.join('\n- ')}`);
  }
}

/**
 * 채점 정답·해설·힌트 본문·교란 설정을 뺀 화면 전달용 문제 (S-04).
 * 학습 화면과 시험 모드 화면은 이 모양만 받는다. 힌트는 단계 수만 알려 주고 본문은 요청 시 따로 공개한다(CARD-04C).
 */
export interface PublicProblem {
  id: string;
  courseId: string;
  moduleId: string;
  examVersion: ProblemDefinition['examVersion'];
  difficulty: ProblemDefinition['difficulty'];
  title: string;
  goal: string;
  conditions: readonly string[];
  initialWorkbook: ProblemDefinition['initialWorkbook'];
  allowedActions: ProblemDefinition['allowedActions'];
  target: { sheet: string; cell: string };
  forbiddenFunctions: readonly string[];
  hintCount: number;
  points: number;
  hintPenaltyPerStep: number;
  completionCriteria: string;
}

export function toPublicProblem(problem: ProblemDefinition): PublicProblem {
  return {
    id: problem.id,
    courseId: problem.courseId,
    moduleId: problem.moduleId,
    examVersion: problem.examVersion,
    difficulty: problem.difficulty,
    title: problem.title,
    goal: problem.goal,
    conditions: problem.conditions,
    initialWorkbook: problem.initialWorkbook,
    allowedActions: problem.allowedActions,
    target: { sheet: problem.grading.targetSheet, cell: problem.grading.targetCell },
    forbiddenFunctions: problem.grading.forbiddenFunctions,
    hintCount: problem.hints.length,
    points: problem.scoring.points,
    hintPenaltyPerStep: problem.scoring.hintPenaltyPerStep,
    completionCriteria: problem.completionCriteria,
  };
}

export interface ContentLoader {
  listCourses(): readonly CourseMeta[];
  loadCourse(courseId: string): CourseMeta;
  loadModule(moduleId: string): ModuleMeta;
  listProblems(courseId?: string): readonly ProblemDefinition[];
  loadProblem(problemId: string): ProblemDefinition;
}

function formatZodError(file: string, error: ZodError, label?: string): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : '(최상위)';
    return `${file}${label === undefined ? '' : ` [${label}]`} › ${path}: ${issue.message}`;
  });
}

/** 파일이 export한 값을 이름으로 꺼낸다. 모듈이 객체가 아니면 undefined. */
function exportOf(moduleValue: unknown, name: string): unknown {
  if (typeof moduleValue !== 'object' || moduleValue === null) return undefined;
  return (moduleValue as Record<string, unknown>)[name];
}

/** 소스 전체를 검증해 로더를 만든다. 하나라도 틀리면 모든 오류를 모아 ContentLoadError를 던진다. */
export function createContentLoader(source: ContentSource): ContentLoader {
  const errors: string[] = [];
  const courses = new Map<string, CourseMeta>();
  const modules = new Map<string, ModuleMeta>();
  const problems = new Map<string, ProblemDefinition>();
  const problemFile = new Map<string, string>();

  for (const [file, mod] of Object.entries(source.courses)) {
    const raw = exportOf(mod, 'course');
    if (raw === undefined) {
      errors.push(`${file}: 'course'를 export해야 합니다.`);
      continue;
    }
    const parsed = CourseMetaSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push(...formatZodError(file, parsed.error));
      continue;
    }
    const course = parsed.data;
    if (courses.has(course.id)) {
      errors.push(`${file}: 코스 ID '${course.id}'가 중복됩니다.`);
      continue;
    }
    courses.set(course.id, course);
    for (const module of course.modules) {
      if (modules.has(module.id)) {
        errors.push(`${file}: 모듈 ID '${module.id}'가 다른 코스와 중복됩니다.`);
      }
      modules.set(module.id, module);
    }
  }

  for (const [file, mod] of Object.entries(source.exercises)) {
    const list = exportOf(mod, 'problems');
    if (!Array.isArray(list)) {
      errors.push(`${file}: 'problems' 배열을 export해야 합니다.`);
      continue;
    }
    list.forEach((raw: unknown, index) => {
      const parsed = ProblemDefinitionSchema.safeParse(raw);
      if (!parsed.success) {
        errors.push(...formatZodError(file, parsed.error, `problems[${index}]`));
        return;
      }
      const problem = parsed.data;
      const earlier = problemFile.get(problem.id);
      if (earlier !== undefined) {
        errors.push(`${file}: 문제 ID '${problem.id}'가 ${earlier}와 중복됩니다.`);
        return;
      }
      problemFile.set(problem.id, file);
      problems.set(problem.id, problem);
    });
  }

  for (const problem of problems.values()) {
    const module = modules.get(problem.moduleId);
    const file = problemFile.get(problem.id) ?? '(알 수 없음)';
    if (module === undefined) {
      errors.push(
        `${file}: 문제 ${problem.id}의 모듈 '${problem.moduleId}'가 코스 메타데이터에 없습니다.`,
      );
    } else if (module.courseId !== problem.courseId) {
      errors.push(
        `${file}: 문제 ${problem.id}의 courseId가 모듈 ${module.id}의 코스(${module.courseId})와 다릅니다.`,
      );
    } else if (!module.problemIds.includes(problem.id)) {
      errors.push(`${file}: 문제 ${problem.id}가 모듈 ${module.id}의 problemIds에 없습니다.`);
    }
  }
  for (const module of modules.values()) {
    for (const id of module.problemIds) {
      if (!problems.has(id)) errors.push(`모듈 ${module.id}가 없는 문제 '${id}'를 참조합니다.`);
    }
    for (const pre of module.prerequisites) {
      if (!modules.has(pre)) errors.push(`모듈 ${module.id}의 선수 모듈 '${pre}'가 없습니다.`);
    }
  }

  if (errors.length > 0) throw new ContentLoadError(errors);

  return {
    listCourses: () => [...courses.values()],
    loadCourse(courseId) {
      const course = courses.get(courseId);
      if (course === undefined) throw new RangeError(`없는 코스입니다: ${courseId}`);
      return course;
    },
    loadModule(moduleId) {
      const module = modules.get(moduleId);
      if (module === undefined) throw new RangeError(`없는 모듈입니다: ${moduleId}`);
      return module;
    },
    listProblems(courseId) {
      const all = [...problems.values()];
      return courseId === undefined ? all : all.filter((p) => p.courseId === courseId);
    },
    loadProblem(problemId) {
      const problem = problems.get(problemId);
      if (problem === undefined) throw new RangeError(`없는 문제입니다: ${problemId}`);
      return problem;
    },
  };
}

let defaultLoader: ContentLoader | undefined;

/** 실제 콘텐츠(src/content/**)로 만든 로더. 처음 부를 때 한 번 검증한다. */
export function getContentLoader(): ContentLoader {
  defaultLoader ??= createContentLoader({
    courses: import.meta.glob(['/src/content/courses/*.ts', '!/src/content/courses/index.ts'], {
      eager: true,
    }),
    exercises: import.meta.glob('/src/content/exercises/**/*.ts', { eager: true }),
  });
  return defaultLoader;
}
