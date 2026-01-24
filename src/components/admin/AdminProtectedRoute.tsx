import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ShieldX } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

export const AdminProtectedRoute = ({ children }: AdminProtectedRouteProps) => {
  const { user, isLoading, isSuperAdmin } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-slate-400">Проверка доступа...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 p-4">
        <Card className="max-w-md border-slate-700 bg-slate-800">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
              <ShieldX className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Доступ запрещен</h2>
            <p className="text-slate-400 mb-6">
              У вас нет прав для доступа к панели Super Admin. 
              Эта область доступна только администраторам платформы.
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300"
                onClick={() => window.location.href = '/dashboard'}
              >
                В личный кабинет
              </Button>
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300"
                onClick={() => window.location.href = '/admin/login'}
              >
                Другой аккаунт
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
