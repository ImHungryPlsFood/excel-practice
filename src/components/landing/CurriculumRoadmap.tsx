import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

// 레벨 이름과 요약은 docs/CURRICULUM.md §2 기준. 랜딩 소개용 요약이며 문제 데이터가 아니다.
const ROADMAP_STAGES = [
  {
    stage: '입문',
    levels: [
      { level: 0, title: '완전한 입문', summary: '셀·행·열과 주소 체계, 선택과 입력의 기본' },
      {
        level: 1,
        title: '데이터 입력과 서식',
        summary: '표시 형식, 정렬, 테두리로 읽기 쉬운 표 만들기',
      },
    ],
  },
  {
    stage: '기초',
    levels: [
      { level: 2, title: '수식의 기초', summary: '연산자 우선순위와 상대·절대·혼합 참조' },
      { level: 3, title: '핵심 함수', summary: 'SUM, IF, SUMIFS부터 XLOOKUP, 동적 배열까지' },
    ],
  },
  {
    stage: '활용',
    levels: [
      {
        level: 4,
        title: '데이터 정리와 관리',
        summary: '정렬·필터, 중복 제거, 유효성 검사, 조건부 서식',
      },
      { level: 5, title: '차트와 시각화', summary: '목적에 맞는 차트 선택과 업무용 대시보드' },
      { level: 6, title: '분석 도구', summary: '피벗 테이블, 고급 필터, 목표값 찾기' },
    ],
  },
  {
    stage: '전문',
    levels: [
      { level: 7, title: '고급 업무 활용', summary: 'LET·LAMBDA, 시트 간 참조, 자동화 개념' },
      { level: 8, title: '실무 프로젝트', summary: '기업 업무를 옮겨 온 종합 과제 11종' },
      { level: 9, title: '컴퓨터활용능력 대비', summary: '1·2급 실기 유형과 시간 제한 모의시험' },
      { level: 10, title: '고급 도전 문제', summary: '수식 디버깅, 단일 수식 설계 등 대회형 문제' },
    ],
  },
] as const;

export function CurriculumRoadmap() {
  return (
    <section id="roadmap" aria-labelledby="roadmap-title" className="scroll-mt-16 bg-canvas">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-semibold text-brand">성장 경로</p>
        <h2 id="roadmap-title" className="mt-2 text-2xl font-semibold text-fg">
          초급부터 고급까지, 11단계 성장 경로
        </h2>
        <p className="mt-3 max-w-2xl text-fg-secondary">
          셀을 처음 다루는 단계부터 실무 프로젝트와 대회형 문제까지, 앞 단계의 개념 위에 다음 단계가
          쌓이도록 구성했습니다.
        </p>

        <ol className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {ROADMAP_STAGES.map(({ stage, levels }, stageIndex) => (
            <Card as="li" key={stage} className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Badge tone={stageIndex === 0 ? 'brand' : 'neutral'}>{stage}</Badge>
                <span className="text-xs text-fg-muted">
                  Level {levels[0].level}–{levels[levels.length - 1]?.level}
                </span>
              </div>
              <ol className="flex flex-col gap-3">
                {levels.map(({ level, title, summary }) => (
                  <li key={level} className="border-l-2 border-line pl-3">
                    <p className="text-sm font-semibold text-fg">
                      <span className="mr-2 font-mono text-xs text-fg-muted">L{level}</span>
                      {title}
                    </p>
                    <p className="mt-1 text-sm text-fg-secondary">{summary}</p>
                  </li>
                ))}
              </ol>
            </Card>
          ))}
        </ol>
      </div>
    </section>
  );
}
