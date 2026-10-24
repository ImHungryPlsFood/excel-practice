import { NavLink } from 'react-router-dom';

import { courseIdForLevel, learnPath } from '@/content/contentIds';

// 연습실은 CARD-02D, 학습은 CARD-04D에서 동작하게 되어 링크로 되돌렸다.
const SIDEBAR_LINKS = [
  { to: '/dashboard', label: '대시보드' },
  { to: learnPath(courseIdForLevel(0)), label: '학습' },
  { to: '/sandbox', label: '연습실' },
  { to: '/settings', label: '설정' },
] as const;

const LINK_BASE =
  'block rounded-md px-3 py-2 text-sm transition-colors duration-(--motion-duration-fast) ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

export function AppSidebar() {
  return (
    <nav aria-label="주 메뉴" className="w-52 shrink-0 border-r border-line bg-surface p-3">
      <ul className="flex flex-col gap-1">
        {SIDEBAR_LINKS.map(({ to, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `${LINK_BASE} ${
                  isActive
                    ? 'bg-brand-subtle font-semibold text-brand'
                    : 'text-fg-secondary hover:bg-subtle hover:text-fg'
                }`
              }
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
