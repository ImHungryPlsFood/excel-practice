import { Link } from 'react-router-dom';

import { Logo } from '@/components/brand/Logo';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface">
      <div className="flex h-14 items-center gap-4 px-6">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <Logo className="size-7" />
          <span className="text-base font-semibold tracking-tight text-fg">CELLCRAFT</span>
        </Link>
      </div>
    </header>
  );
}
