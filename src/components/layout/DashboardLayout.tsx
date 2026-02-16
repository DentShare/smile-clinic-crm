import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GlobalSearch } from '@/components/GlobalSearch';
import { ImpersonationBanner } from '@/components/ImpersonationBanner';
import { useState } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export const DashboardLayout = () => {
  const [language, setLanguage] = useState<'uz' | 'ru'>('ru');
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <ImpersonationBanner />
        {/* Top Bar */}
        <header className="h-12 border-b bg-card flex items-center gap-2 px-4 shrink-0">
          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* Global search */}
          <div className="flex-1">
            <GlobalSearch />
          </div>

          {/* Right side actions */}
          <ThemeToggle />
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
