import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '@aixsilicon/ui';
import Header from './Header';

export default function MainLayout() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const isChat = location.pathname === '/chat';

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface">
      <Header />
      <main ref={mainRef} className={cn('min-h-0 flex-1 bg-surface px-4 py-6 sm:px-6 sm:py-8', isChat ? 'overflow-hidden' : 'overflow-y-auto')}>
        <div className={cn('mx-auto w-full min-w-0', isChat ? 'h-full' : '')}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
