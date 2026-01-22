'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { AlertNotification } from '@/components/ui/alert-notification';
import { PageErrorBoundary } from '@/components/ui/ErrorBoundary';

// Routes that should not show the sidebar
const publicRoutes = ['/login', '/signup', '/forgot-password'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  if (isPublicRoute) {
    // Public routes - no sidebar, full page
    return (
      <PageErrorBoundary>
        {children}
      </PageErrorBoundary>
    );
  }

  // Authenticated routes - with sidebar
  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto w-full">
          <div className="md:hidden h-16" />
          <PageErrorBoundary>
            {children}
          </PageErrorBoundary>
        </main>
      </div>
      <AlertNotification />
    </>
  );
}
