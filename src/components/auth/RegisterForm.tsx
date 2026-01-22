import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export const RegisterForm = () => {
  const [clinicName, setClinicName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubdomainChange = (value: string) => {
    // Only allow lowercase letters, numbers, and hyphens
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSubdomain(sanitized);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // 2. Create clinic
      const { data: clinicData, error: clinicError } = await supabase
        .from('clinics')
        .insert({
          name: clinicName,
          subdomain,
          phone,
          email
        })
        .select()
        .single();

      if (clinicError) throw clinicError;

      // 3. Create profile with clinic reference
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          clinic_id: clinicData.id,
          full_name: fullName,
          phone
        });

      if (profileError) throw profileError;

      // 4. Assign clinic_admin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'clinic_admin'
        });

      if (roleError) throw roleError;

      // 5. Get starter plan and create subscription
      const { data: starterPlan } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('name', 'Starter')
        .single();

      if (starterPlan) {
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 14);

        await supabase.from('clinic_subscriptions').insert({
          clinic_id: clinicData.id,
          plan_id: starterPlan.id,
          status: 'trial',
          trial_ends_at: trialEndsAt.toISOString(),
          current_period_end: trialEndsAt.toISOString()
        });
      }

      toast.success('Клиника зарегистрирована!', {
        description: 'Добро пожаловать в DentaClinic'
      });
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error('Ошибка регистрации', {
        description: error.message || 'Попробуйте позже'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">🦷 Регистрация клиники</CardTitle>
        <CardDescription>Создайте аккаунт для вашей стоматологии</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clinicName">Название клиники</Label>
            <Input
              id="clinicName"
              placeholder="Digital Implant"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subdomain">Поддомен (для входа)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="subdomain"
                placeholder="digital"
                value={subdomain}
                onChange={(e) => handleSubdomainChange(e.target.value)}
                required
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">.dent-crm.uz</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Ваше имя</Label>
              <Input
                id="fullName"
                placeholder="Иван Иванов"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                placeholder="+998901234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@clinic.uz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Создать клинику
          </Button>
          <p className="text-sm text-muted-foreground">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Войти
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
};
