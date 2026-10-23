import { NavLink } from 'react-router-dom';

// 연습실은 CARD-02D에서 동작하게 되어 링크로 되돌렸다.
const SIDEBAR_LINKS = [
  { to: '/dashboard', label: '대시보드' },
  { to: '/sandbox', label: '연습실' },
] as const;

// 아직 구현되지 않은 화면은 링크로 노출하지 않는다 (R-15.11, R-15.12).
const SIDEBAR_PENDING_ITEMS = [{ label: '학습' }] as const;

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
        {SIDEBAR_PENDING_ITEMS.map(({ label }) => (
          <li key={label}>
            <span
              aria-disabled="true"
              className="flex cursor-not-allowed items-center justify-between rounded-md px-3 py-2 text-sm text-fg-muted"
            >
              {label}
              <span className="rounded-sm border border-line px-1.5 py-0.5 text-xs">준비 중</span>
            </span>
          </li>
        ))}
      </ul>
    </nav>
  );
}
