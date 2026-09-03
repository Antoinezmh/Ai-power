import { Outlet } from 'react-router-dom';
import Header from './Header';

export default function MainLayout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface">
      <Header />
      <main className="flex-1 overflow-y-auto bg-surface px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
