import { Link, useLocation } from 'react-router-dom';

import { courseIdForLevel, learnPath } from '@/content/contentIds';

// 연습실은 CARD-02D, 학습은 CARD-04D에서 동작하게 되어 링크로 되돌렸다.
// matchPrefix: 이 접두사로 시작하는 모든 경로에서 활성으로 표시한다(학습은 /learn/level-0~10 어디서나 활성).
const SIDEBAR_LINKS: readonly { to: string; label: string; matchPrefix?: string }[] = [
  { to: '/dashboard', label: '대시보드' },
  { to: learnPath(courseIdForLevel(0)), label: '학습', matchPrefix: '/learn/' },
  { to: '/sandbox', label: '연습실' },
  { to: '/settings', label: '설정' },
];

const LINK_BASE =
  'block rounded-md px-3 py-2 text-sm transition-colors duration-(--motion-duration-fast) ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

export function AppSidebar() {
  const { pathname } = useLocation();
  return (
    <nav aria-label="주 메뉴" className="w-52 shrink-0 border-r border-line bg-surface p-3">
      <ul className="flex flex-col gap-1">
        {SIDEBAR_LINKS.map(({ to, label, matchPrefix }) => {
          const active =
            pathname === to || (matchPrefix !== undefined && pathname.startsWith(matchPrefix));
          return (
            <li key={to}>
              <Link
                to={to}
                aria-current={active ? 'page' : undefined}
                className={`${LINK_BASE} ${
                  active
                    ? 'bg-brand-subtle font-semibold text-brand'
                    : 'text-fg-secondary hover:bg-subtle hover:text-fg'
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
