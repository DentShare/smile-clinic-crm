import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRateLimit } from '@/hooks/use-rate-limit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { checkLimit, recordAttempt, reset } = useRateLimit({
    maxAttempts: 5,
    windowMs: 60_000,
    lockoutMs: 300_000,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { allowed, retryAfterMs } = checkLimit();
    if (!allowed) {
      const minutes = Math.ceil(retryAfterMs / 60_000);
      toast.error('Слишком много попыток', {
        description: `Попробуйте снова через ${minutes} мин.`,
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        recordAttempt();
        toast.error('Ошибка входа', {
          description: 'Неверный email или пароль'
        });
      } else {
        reset();
        const from = (location.state as any)?.from?.pathname || '/dashboard';
        navigate(from);
      }
    } catch {
      recordAttempt();
      toast.error('Ошибка входа');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Dentelica</CardTitle>
        <CardDescription>Войдите в свой аккаунт</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="doctor@clinic.uz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Пароль</Label>
              <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary">
                Забыли пароль?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Войти
          </Button>
          <p className="text-sm text-muted-foreground">
            Нет аккаунта?{' '}
            <Link to="/register" className="text-primary hover:underline">
              Зарегистрировать клинику
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
};
