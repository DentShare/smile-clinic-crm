import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle, Building2, UserCheck, Stethoscope, Users, HeartHandshake, UserCog } from 'lucide-react';

type AppRole = 'clinic_admin' | 'doctor' | 'reception' | 'nurse';

interface Invitation {
  id: string;
  email: string;
  role: AppRole;
  clinic_id: string;
  expires_at: string;
  accepted_at: string | null;
  clinics?: { name: string };
}

const roleConfig: Record<AppRole, { label: string; icon: React.ElementType; color: string }> = {
  clinic_admin: { label: 'Директор', icon: UserCog, color: 'bg-primary text-primary-foreground' },
  reception: { label: 'Администратор', icon: Users, color: 'bg-info text-info-foreground' },
  doctor: { label: 'Врач', icon: Stethoscope, color: 'bg-success text-success-foreground' },
  nurse: { label: 'Ассистент', icon: HeartHandshake, color: 'bg-warning text-warning-foreground' },
};

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (token) {
      fetchInvitation();
    } else {
      setError('Недействительная ссылка приглашения');
      setIsLoading(false);
    }
  }, [token]);

  const fetchInvitation = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('staff_invitations')
        .select(`
          *,
          clinics:clinic_id (name)
        `)
        .eq('token', token)
        .maybeSingle();

      if (fetchError || !data) {
        setError('Приглашение не найдено');
        return;
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        setError('Срок действия приглашения истёк');
        return;
      }

      // Check if already accepted
      if (data.accepted_at) {
        setError('Это приглашение уже было принято');
        return;
      }

      setInvitation(data as Invitation);
    } catch (err) {
      console.error('Error fetching invitation:', err);
      setError('Ошибка при загрузке приглашения');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invitation) return;

    if (formData.password !== formData.confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Пароль должен содержать минимум 6 символов');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password: formData.password,
        options: {
          data: { full_name: formData.fullName },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Не удалось создать пользователя');

      // 2. Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          clinic_id: invitation.clinic_id,
          full_name: formData.fullName,
        });

      if (profileError) throw profileError;

      // 3. Assign role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: invitation.role,
        });

      if (roleError) throw roleError;

      // 4. Mark invitation as accepted
      await supabase
        .from('staff_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      setSuccess(true);
      toast.success('Регистрация завершена!');

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      toast.error('Ошибка при регистрации', {
        description: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="rounded-full bg-destructive/10 p-3">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold">{error}</h2>
              <p className="text-muted-foreground">
                Запросите новое приглашение у администратора клиники
              </p>
              <Link to="/login">
                <Button variant="outline">Перейти на страницу входа</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="rounded-full bg-success/10 p-3">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <h2 className="text-xl font-semibold">Добро пожаловать!</h2>
              <p className="text-muted-foreground">
                Регистрация успешно завершена. Переходим в панель управления...
              </p>
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleInfo = roleConfig[invitation?.role || 'doctor'];
  const RoleIcon = roleInfo.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <UserCheck className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Приглашение в команду</CardTitle>
          <CardDescription>
            Завершите регистрацию, чтобы присоединиться к клинике
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Invitation Info */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Клиника</p>
                <p className="font-medium">{invitation?.clinics?.name || 'Клиника'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <RoleIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Роль</p>
                <Badge className={roleInfo.color}>{roleInfo.label}</Badge>
              </div>
            </div>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={invitation?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">ФИО *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Иванов Иван Иванович"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Минимум 6 символов"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Подтвердите пароль *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Повторите пароль"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Завершить регистрацию
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Войти
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvitation;