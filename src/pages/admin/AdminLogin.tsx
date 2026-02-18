import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Shield, Lock, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [existingNonAdminUser, setExistingNonAdminUser] = useState(false);
  const navigate = useNavigate();

  // On mount, check if already logged in as super_admin
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      if (session?.user) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'super_admin')
          .maybeSingle();
        if (!cancelled && data) {
          navigate('/admin/dashboard', { replace: true });
          return;
        }
        // User is logged in but NOT super_admin — show option to switch
        if (!cancelled) {
          setExistingNonAdminUser(true);
        }
      }
      if (!cancelled) setCheckingSession(false);
    });
    return () => { cancelled = true; };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // If a non-admin user is already logged in, sign them out first
      // so we can sign in with admin credentials
      if (existingNonAdminUser) {
        await supabase.auth.signOut();
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError || !data.user) {
        setError('Неверные учетные данные');
        setIsLoading(false);
        return;
      }

      // Directly verify super_admin role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .eq('role', 'super_admin')
        .maybeSingle();
      if (roleError) throw roleError;

      if (!roleData) {
        setError('У этого аккаунта нет прав Super Admin. Войдите с аккаунтом администратора.');
        // Do NOT sign out — the user may want to go back to CRM
        setIsLoading(false);
        return;
      }

      toast.success('Добро пожаловать, Admin!');
      navigate('/admin/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Ошибка входа');
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out current session and show login form
  const handleSwitchAccount = async () => {
    await supabase.auth.signOut();
    setExistingNonAdminUser(false);
    setError(null);
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Super Admin Portal</CardTitle>
            <CardDescription>Панель управления платформой Dentelica</CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {existingNonAdminUser && !error && (
              <Alert className="border-primary/30 bg-primary/5">
                <AlertDescription className="text-sm">
                  Вы уже вошли в CRM. Для входа в Admin панель введите данные администратора или{' '}
                  <button type="button" onClick={handleSwitchAccount} className="text-primary underline hover:no-underline">
                    сменить аккаунт
                  </button>.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input id="admin-email" type="email" placeholder="admin@dentelica.uz" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password">Пароль</Label>
              <Input id="admin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            <Button type="submit" className="w-full mt-6" size="lg" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Проверка доступа...</>
              ) : (
                <><Lock className="mr-2 h-4 w-4" />Войти в панель управления</>
              )}
            </Button>

            <div className="flex justify-between items-center mt-4">
              <Link to="/login" className="text-xs text-muted-foreground hover:text-primary">
                ← Вернуться в CRM
              </Link>
              <p className="text-xs text-muted-foreground">
                Только для администраторов
              </p>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
};

export default AdminLogin;
