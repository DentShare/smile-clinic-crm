import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { Loader2, ShieldX } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

export const AdminProtectedRoute = ({ children }: AdminProtectedRouteProps) => {
  const [status, setStatus] = useState<'loading' | 'authorized' | 'no_user' | 'no_role'>('loading');
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session?.user) { setStatus('no_user'); return; }
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'super_admin')
        .maybeSingle();
      if (cancelled) return;
      setStatus(data ? 'authorized' : 'no_role');
    };
    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      check();
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Проверка доступа...</p>
        </div>
      </div>
    );
  }

  if (status === 'no_user') {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (status === 'no_role') {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
              <ShieldX className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold mb-2">Доступ запрещен</h2>
            <p className="text-muted-foreground mb-6">
              У вас нет прав для доступа к панели Super Admin. 
              Эта область доступна только администраторам платформы.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
                В личный кабинет
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/admin/login'}>
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
