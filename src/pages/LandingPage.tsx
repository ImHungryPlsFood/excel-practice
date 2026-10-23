import { Link } from 'react-router-dom';

import { Logo } from '@/components/brand/Logo';
import { CurriculumRoadmap } from '@/components/landing/CurriculumRoadmap';
import { HeroSection } from '@/components/landing/HeroSection';
import { Badge } from '@/components/ui/Badge';
import { ButtonRouterLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

// 학습 시작 진입점 (/dashboard 라우트는 CARD-01C에서 구현).
const START_HREF = '/dashboard';
// GPLv3 소스 공개 의무 (ADR-001 §4, OPEN_QUESTIONS 의사결정 1).
const SOURCE_REPOSITORY_URL = 'https://github.com/ImHungryPlsFood/excel-practice';
const GPL_LICENSE_URL = 'https://www.gnu.org/licenses/gpl-3.0.html';

const NAV_LINKS = [
  { href: '#course', label: '과정 소개' },
  { href: '#roadmap', label: '성장 경로' },
  { href: '#certification', label: '자격증·실무' },
] as const;

// docs/CURRICULUM.md §1.1 4단계 순환 학습법
const LEARNING_STEPS = [
  {
    title: '짧은 개념 설명',
    description: '필요한 개념만 짧고 명확하게 먼저 정리합니다.',
  },
  {
    title: '안내형 실습',
    description: '작업할 셀과 수식 입력줄만 강조되고, 선택과 입력은 직접 합니다.',
  },
  {
    title: '독립 문제와 검증',
    description:
      '데이터를 바꿔 다시 계산하는 채점기가 수식을 확인하므로, 결과 숫자만 적어 넣은 답은 통과하지 못합니다.',
  },
  {
    title: '힌트와 복습',
    description: '힌트는 원할 때만 단계별로 열리고, 틀린 개념은 간격을 두고 다시 만납니다.',
  },
] as const;

const PROJECT_EXAMPLES = [
  '월별 매출 결산과 지점별 달성률 보고서',
  '안전 재고 경고가 포함된 재고 관리표',
  '부서별 예산 대비 지출 편차 분석',
  '중복·오탈자가 섞인 고객 데이터 정제',
  '경영진 보고용 원페이지 판매 대시보드',
] as const;

function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <Logo />
          <span className="text-lg font-semibold tracking-tight text-fg">CELLCRAFT</span>
        </Link>
        <nav aria-label="랜딩 페이지 섹션" className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="rounded-sm text-sm text-fg-secondary transition-colors duration-(--motion-duration-fast) hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {label}
            </a>
          ))}
        </nav>
        <ButtonRouterLink to={START_HREF} size="sm">
          학습 시작
        </ButtonRouterLink>
      </div>
    </header>
  );
}

function CourseIntroSection() {
  return (
    <section
      id="course"
      aria-labelledby="course-title"
      className="scroll-mt-16 border-b border-line bg-surface"
    >
      <div className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-semibold text-brand">과정 소개</p>
        <h2 id="course-title" className="mt-2 text-2xl font-semibold text-fg">
          설명을 읽는 것만으로는 끝나지 않는 학습
        </h2>
        <p className="mt-3 max-w-2xl text-fg-secondary">
          모든 단원은 같은 순서로 진행됩니다. 마지막 단계까지 직접 시트에서 작업하고 검증을 통과해야
          완료됩니다.
        </p>
        <ol className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {LEARNING_STEPS.map(({ title, description }, index) => (
            <li key={title} className="flex flex-col gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-brand-subtle text-sm font-semibold text-brand">
                {index + 1}
              </span>
              <h3 className="text-base font-semibold text-fg">{title}</h3>
              <p className="text-sm text-fg-secondary">{description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function CertificationSection() {
  return (
    <section
      id="certification"
      aria-labelledby="certification-title"
      className="scroll-mt-16 border-t border-line bg-surface"
    >
      <div className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-semibold text-brand">자격증과 실무</p>
        <h2 id="certification-title" className="mt-2 text-2xl font-semibold text-fg">
          시험 준비와 실제 업무까지 이어지는 학습
        </h2>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Card as="article" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-fg">컴퓨터활용능력 1·2급 실기 대비</h3>
              <Badge>Level 9</Badge>
            </div>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-fg-secondary">
              <li>2급: 기본작업·계산작업·분석작업·기타작업 유형별 훈련</li>
              <li>1급: 배열 수식, INDEX/MATCH, 복합 피벗 테이블 등 고급 계산작업</li>
              <li>실제 시험처럼 시간 제한이 있는 모의시험 모드</li>
              <li>2024–2026 출제기준(MS Office 2021 LTSC)과 2027년 개편 사항을 구분해 안내</li>
            </ul>
            <p className="text-xs text-fg-muted">
              기출문제를 그대로 옮기지 않고 출제 유형을 반영한 자체 문항으로 구성합니다. CELLCRAFT는
              대한상공회의소와 관련 없는 독립 학습 서비스입니다.
            </p>
          </Card>
          <Card as="article" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-fg">실무 프로젝트 11종</h3>
              <Badge>Level 8</Badge>
            </div>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-fg-secondary">
              {PROJECT_EXAMPLES.map((project) => (
                <li key={project}>{project}</li>
              ))}
            </ul>
            <p className="text-xs text-fg-muted">
              실제 업무처럼 정돈되지 않은 데이터에서 시작해, 결과물이 요구사항을 만족하는지
              검증받습니다.
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="bg-inverse text-fg-inverse">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Logo className="size-6" />
          <span className="font-semibold">CELLCRAFT</span>
        </div>
        <div className="flex flex-col gap-1 text-sm md:items-end">
          <p>
            이 소프트웨어는{' '}
            <a
              href={GPL_LICENSE_URL}
              className="underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              GNU GPL v3.0 이상<span className="sr-only"> (새 탭에서 열림)</span>
            </a>
            으로 배포됩니다.{' '}
            <a
              href={SOURCE_REPOSITORY_URL}
              className="font-medium underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              소스 코드 저장소 (GitHub)<span className="sr-only"> (새 탭에서 열림)</span>
            </a>
          </p>
          <p className="text-xs opacity-75">
            Microsoft Excel은 Microsoft Corporation의 상표이며, Google Sheets는 Google LLC의
            상표입니다.
          </p>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <HeroSection startHref={START_HREF} roadmapHref="#roadmap" />
        <CourseIntroSection />
        <CurriculumRoadmap />
        <CertificationSection />
      </main>
      <SiteFooter />
    </>
  );
}
