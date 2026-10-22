import { SpreadsheetPreviewMock } from '@/components/landing/SpreadsheetPreviewMock';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink, ButtonRouterLink } from '@/components/ui/Button';

export interface HeroSectionProps {
  startHref: string;
  roadmapHref: string;
}

export function HeroSection({ startHref, roadmapHref }: HeroSectionProps) {
  return (
    <section aria-labelledby="hero-title" className="border-b border-line bg-surface">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-20">
        <div className="flex flex-col items-start gap-6">
          <Badge tone="brand">실습 중심 스프레드시트 학습</Badge>
          <h1
            id="hero-title"
            className="text-3xl leading-tight font-semibold tracking-tight text-fg lg:text-4xl"
          >
            읽고 끝나는 강의 대신,
            <br />
            직접 셀을 다루며 배우는 스프레드시트
          </h1>
          <p className="max-w-xl text-lg text-fg-secondary">
            CELLCRAFT에서는 실제와 같은 시트에 직접 수식을 입력하고, 데이터를 바꿔 다시 계산하는
            채점기로 결과를 검증받습니다. 입문부터 실무 프로젝트, 컴퓨터활용능력 대비까지 하나의
            경로로 이어집니다.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonRouterLink to={startHref} size="lg">
              무료로 학습 시작하기
            </ButtonRouterLink>
            <ButtonLink href={roadmapHref} size="lg" variant="secondary">
              학습 경로 보기
            </ButtonLink>
          </div>
        </div>
        <SpreadsheetPreviewMock />
      </div>
    </section>
  );
}
