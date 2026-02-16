import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft, Search } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-muted-foreground/20 select-none">404</div>
        <h1 className="mt-4 text-2xl font-bold">Страница не найдена</h1>
        <p className="mt-2 text-muted-foreground">
          Запрашиваемая страница не существует или была перемещена.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="default">
            <Link to="/dashboard">
              <Home className="h-4 w-4 mr-2" />
              На главную
            </Link>
          </Button>
          <Button asChild variant="outline" onClick={() => window.history.back()}>
            <button type="button" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </button>
          </Button>
        </div>
        <div className="mt-6">
          <p className="text-xs text-muted-foreground">
            Возможно вы искали:
          </p>
          <div className="mt-2 flex flex-wrap gap-2 justify-center">
            <Link to="/patients" className="text-xs text-primary hover:underline">Пациенты</Link>
            <Link to="/appointments" className="text-xs text-primary hover:underline">Расписание</Link>
            <Link to="/finance" className="text-xs text-primary hover:underline">Финансы</Link>
            <Link to="/settings" className="text-xs text-primary hover:underline">Настройки</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
