import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { courseIdForLevel, learnPath, MAX_LEVEL } from '@/content/contentIds';
import { ProblemWorkspace } from '@/features/learning/components/ProblemWorkspace';
import { getContentLoader } from '@/engine/grading/problemLoader';
import type { CourseMeta, ModuleMeta, ProblemDefinition } from '@/types/problem.schema';

import { NotFoundPage } from './NotFoundPage';

/*
 * 학습 화면 (/learn/:courseId, CARD-04D).
 * 흐름: 단원 개념 설명(왼쪽) → 실제 시트에서 풀이 → 제출·채점 → 오답 수정 → "다음 문제" → 코스 완료 요약.
 * 진행 상태는 이 화면이 열려 있는 동안만 유지한다(저장은 CARD-06).
 */

interface Step {
  module: ModuleMeta;
  problem: ProblemDefinition;
  /** 이 단원의 첫 문제인지 (개념 설명을 펼쳐서 보여 준다) */
  firstInModule: boolean;
}

function stepsOf(course: CourseMeta): Step[] {
  const loader = getContentLoader();
  return course.modules.flatMap((module) =>
    module.problemIds.map((id, index) => ({
      module,
      problem: loader.loadProblem(id),
      firstInModule: index === 0,
    })),
  );
}

function ConceptGuide({ module, open }: { module: ModuleMeta; open: boolean }) {
  return (
    <section aria-label="개념 설명" className="flex flex-col gap-3 text-sm">
      <h2 className="font-semibold">{module.title}</h2>
      <details open={open} key={`${module.id}-${open}`}>
        <summary className="cursor-pointer text-fg-secondary">개념 보기</summary>
        <div className="mt-2 flex flex-col gap-3">
          <p>{module.conceptSummary}</p>
          <p className="text-fg-secondary">
            <span className="font-medium text-fg">이런 때 씁니다. </span>
            {module.workUseCase}
          </p>
          <div>
            <h3 className="font-medium">이 단원의 목표</h3>
            <ul className="list-disc pl-5 text-fg-secondary">
              {module.objectives.map((objective) => (
                <li key={objective}>{objective}</li>
              ))}
            </ul>
          </div>
          {module.shortcuts.length > 0 && (
            <div>
              <h3 className="font-medium">단축키</h3>
              <ul className="text-fg-secondary">
                {module.shortcuts.map((shortcut) => (
                  <li key={shortcut.keys}>
                    <kbd className="rounded-sm border border-line px-1 text-xs">
                      {shortcut.keys}
                    </kbd>{' '}
                    {shortcut.description}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>
      <p className="text-fg-secondary">
        오른쪽의 문제를 읽고 가운데 시트에서 직접 풀어 보세요. 표의 원본 칸(회색)은 고칠 수
        없습니다.
      </p>
    </section>
  );
}

function CourseSwitcher({ current }: { current: string }) {
  const ids = Array.from({ length: MAX_LEVEL + 1 }, (_, level) => courseIdForLevel(level));
  const available = getContentLoader()
    .listCourses()
    .filter((course) => course.modules.some((module) => module.problemIds.length > 0))
    .map((course) => course.id);
  return (
    <nav aria-label="코스 선택" className="flex gap-1 text-xs">
      {ids
        .filter((id) => available.includes(id))
        .map((id) => (
          <Link
            key={id}
            to={learnPath(id)}
            aria-current={id === current ? 'page' : undefined}
            className={`rounded-md px-2 py-1 ${
              id === current
                ? 'bg-brand-subtle font-semibold text-brand'
                : 'text-fg-secondary hover:bg-subtle'
            }`}
          >
            {id.replace('level-', 'Level ')}
          </Link>
        ))}
    </nav>
  );
}

function CourseSummary({ course, steps }: { course: CourseMeta; steps: Step[] }) {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-start gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold">{course.title} 완료</h1>
      <p className="text-fg-secondary">
        이 코스의 문제 {steps.length}개를 모두 해결했습니다. 다른 코스로 이어서 학습하거나
        연습실에서 직접 시도해 보세요.
      </p>
      <ul className="list-disc pl-5 text-sm text-fg-secondary">
        {steps.map(({ problem }) => (
          <li key={problem.id}>{problem.title}</li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Link to="/dashboard" className="text-sm text-brand hover:underline">
          대시보드로
        </Link>
        <Link to="/sandbox" className="text-sm text-brand hover:underline">
          연습실로
        </Link>
      </div>
      <CourseSwitcher current={course.id} />
    </main>
  );
}

function CoursePlayer({ course }: { course: CourseMeta }) {
  const steps = useMemo(() => stepsOf(course), [course]);
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);

  if (steps.length === 0) {
    return (
      <main className="mx-auto flex max-w-xl flex-col items-start gap-4 px-6 py-16">
        <h1 className="text-2xl font-semibold">{course.title}</h1>
        <p className="text-fg-secondary">이 코스의 문제는 아직 준비되지 않았습니다.</p>
        <Link to="/dashboard" className="text-sm text-brand hover:underline">
          대시보드로
        </Link>
      </main>
    );
  }
  if (finished) return <CourseSummary course={course} steps={steps} />;

  const step = steps[Math.min(index, steps.length - 1)];
  if (step === undefined) return null;
  const isLast = index >= steps.length - 1;

  return (
    <ProblemWorkspace
      key={step.problem.id}
      problem={step.problem}
      header={
        <>
          <h1 className="text-sm font-semibold">{course.title}</h1>
          <span className="text-xs text-fg-muted">
            {step.module.title} · 문제 {index + 1} / {steps.length}
          </span>
          <CourseSwitcher current={course.id} />
          <Link to="/dashboard" className="ml-auto text-sm text-brand hover:underline">
            나가기
          </Link>
        </>
      }
      guide={<ConceptGuide module={step.module} open={step.firstInModule} />}
      footerAction={(passed) =>
        passed ? (
          <Button
            size="sm"
            onClick={() => {
              if (isLast) setFinished(true);
              else setIndex(index + 1);
            }}
          >
            {isLast ? '코스 마치기' : '다음 문제'}
          </Button>
        ) : null
      }
    />
  );
}

export function LearnPage() {
  const { courseId = '' } = useParams();
  const course = useMemo(() => {
    try {
      return getContentLoader().loadCourse(courseId);
    } catch (error) {
      if (error instanceof RangeError) return null;
      throw error;
    }
  }, [courseId]);
  if (course === null) return <NotFoundPage />;
  return <CoursePlayer key={course.id} course={course} />;
}
