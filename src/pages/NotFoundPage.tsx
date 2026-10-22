import { ButtonRouterLink } from '@/components/ui/Button';

export function NotFoundPage() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-start gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold text-fg">페이지를 찾을 수 없습니다</h1>
      <p className="text-fg-secondary">주소가 잘못되었거나 이동된 페이지입니다.</p>
      <ButtonRouterLink to="/">처음으로 돌아가기</ButtonRouterLink>
    </main>
  );
}
