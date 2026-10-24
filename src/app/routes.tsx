import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { LandingPage } from '@/pages/LandingPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { SettingsPage } from '@/pages/SettingsPage';

/*
 * 연습실은 수식 엔진(HyperFormula)을 포함해 크므로 따로 내려받는다. 랜딩·대시보드 첫 화면 번들에 넣지 않는다.
 */
const LearnPage = lazy(() =>
  import('@/pages/LearnPage').then((module) => ({ default: module.LearnPage })),
);
const SandboxPage = lazy(() =>
  import('@/pages/SandboxPage').then((module) => ({ default: module.SandboxPage })),
);

/*
 * 개발 전용 화면은 개발 서버와 성능 측정 빌드(vite build --mode perf)에서만 등록한다.
 * 조건이 빌드 시점 상수라 프로덕션 번들에서는 동적 import 자체가 제거된다.
 */
const DEV_ROUTES_ENABLED = import.meta.env.DEV || import.meta.env.MODE === 'perf';
const GridHarnessPage = DEV_ROUTES_ENABLED
  ? lazy(() =>
      import('@/pages/dev/GridHarnessPage').then((module) => ({
        default: module.GridHarnessPage,
      })),
    )
  : null;
const WorkspaceHarnessPage = DEV_ROUTES_ENABLED
  ? lazy(() =>
      import('@/pages/dev/WorkspaceHarnessPage').then((module) => ({
        default: module.WorkspaceHarnessPage,
      })),
    )
  : null;

const TutorialHarnessPage = DEV_ROUTES_ENABLED
  ? lazy(() =>
      import('@/pages/dev/TutorialHarnessPage').then((module) => ({
        default: module.TutorialHarnessPage,
      })),
    )
  : null;

const ProblemHarnessPage = DEV_ROUTES_ENABLED
  ? lazy(() =>
      import('@/pages/dev/ProblemHarnessPage').then((module) => ({
        default: module.ProblemHarnessPage,
      })),
    )
  : null;

/** 앱 라우트 정의 (R-03.04). 라우터(BrowserRouter/MemoryRouter)는 호출하는 쪽에서 제공한다. */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route
          path="/sandbox"
          element={
            <Suspense fallback={<p className="text-sm text-fg-secondary">연습실을 여는 중…</p>}>
              <SandboxPage />
            </Suspense>
          }
        />
      </Route>
      <Route
        path="/learn/:courseId"
        element={
          <Suspense
            fallback={<p className="p-6 text-sm text-fg-secondary">학습 화면을 여는 중…</p>}
          >
            <LearnPage />
          </Suspense>
        }
      />
      {GridHarnessPage !== null && (
        <Route
          path="/dev/grid"
          element={
            <Suspense fallback={null}>
              <GridHarnessPage />
            </Suspense>
          }
        />
      )}
      {WorkspaceHarnessPage !== null && (
        <Route
          path="/dev/workspace"
          element={
            <Suspense fallback={null}>
              <WorkspaceHarnessPage />
            </Suspense>
          }
        />
      )}
      {TutorialHarnessPage !== null && (
        <Route
          path="/dev/tutorial"
          element={
            <Suspense fallback={null}>
              <TutorialHarnessPage />
            </Suspense>
          }
        />
      )}
      {ProblemHarnessPage !== null && (
        <Route
          path="/dev/problem"
          element={
            <Suspense fallback={null}>
              <ProblemHarnessPage />
            </Suspense>
          }
        />
      )}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
