import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Check, X } from 'lucide-react';

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 12, label: 'Минимум 12 символов' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'Заглавная буква' },
  { test: (p: string) => /[a-z]/.test(p), label: 'Строчная буква' },
  { test: (p: string) => /\d/.test(p), label: 'Цифра' },
  { test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p), label: 'Специальный символ' },
];

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user arrived via password reset link (Supabase sets session automatically)
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
      }
      setIsChecking(false);
    });

    // Also check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsValidSession(true);
      }
      setIsChecking(false);
    });
  }, []);

  const allRulesPassed = PASSWORD_RULES.every((r) => r.test(password));
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!allRulesPassed) {
      toast.error('Пароль не соответствует требованиям');
      return;
    }

    if (!passwordsMatch) {
      toast.error('Пароли не совпадают');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast.error('Ошибка', {
          description: 'Не удалось обновить пароль. Попробуйте снова.',
        });
      } else {
        toast.success('Пароль обновлён', {
          description: 'Вы можете войти с новым паролем',
        });
        navigate('/login');
      }
    } catch {
      toast.error('Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Ссылка недействительна</CardTitle>
            <CardDescription>
              Ссылка для сброса пароля истекла или недействительна.
              Запросите новую ссылку.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button onClick={() => navigate('/forgot-password')}>
              Запросить новую ссылку
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Новый пароль</CardTitle>
          <CardDescription>Введите новый пароль для вашего аккаунта</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Новый пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
              />
            </div>

            {password.length > 0 && (
              <div className="space-y-1">
                {PASSWORD_RULES.map((rule) => (
                  <div key={rule.label} className="flex items-center gap-2 text-xs">
                    {rule.test(password) ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <X className="h-3 w-3 text-red-500" />
                    )}
                    <span className={rule.test(password) ? 'text-green-600' : 'text-muted-foreground'}>
                      {rule.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-red-500">Пароли не совпадают</p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !allRulesPassed || !passwordsMatch}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Установить новый пароль
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ResetPassword;
