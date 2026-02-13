import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { useState } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const DashboardLayout = () => {
  const [language, setLanguage] = useState<'uz' | 'ru'>('ru');

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-12 border-b bg-card flex items-center justify-end px-4 shrink-0">
          <LanguageSwitcher value={language} onChange={setLanguage} />
        </header>
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="container py-4 h-full">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
};
