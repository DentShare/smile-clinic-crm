import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🦷</span>
          <span className="font-bold text-lg">DentaClinic</span>
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Возможности
          </a>
          <a href="#demo" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Демо
          </a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Тарифы
          </a>
        </div>

        {/* Auth Buttons */}
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Войти</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/register">Начать бесплатно</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};
