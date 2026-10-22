import { Outlet } from 'react-router-dom';

import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';

/** 로그인 후 화면(대시보드·학습·샌드박스)의 공통 틀. 랜딩 페이지는 사용하지 않는다. */
export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <AppHeader />
      <div className="flex flex-1">
        <AppSidebar />
        <main className="min-w-0 flex-1 px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
