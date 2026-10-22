import { ButtonRouterLink } from '@/components/ui/Button';

export interface NotImplementedPageProps {
  title: string;
  description: string;
}

/** 아직 구현되지 않은 라우트의 자리. 동작하는 기능처럼 보이지 않도록 미구현임을 명시한다. */
export function NotImplementedPage({ title, description }: NotImplementedPageProps) {
  return (
    <section aria-labelledby="not-implemented-title" className="max-w-2xl">
      <h1 id="not-implemented-title" className="text-2xl font-semibold text-fg">
        {title}
      </h1>
      <p className="mt-3 text-fg-secondary">{description}</p>
      <p className="mt-2 text-sm text-fg-muted">이 화면은 아직 구현되지 않았습니다.</p>
      <ButtonRouterLink to="/dashboard" variant="secondary" className="mt-6">
        대시보드로 돌아가기
      </ButtonRouterLink>
    </section>
  );
}
