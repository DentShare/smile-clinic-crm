import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error('Ошибка', {
          description: 'Не удалось отправить письмо для сброса пароля',
        });
      } else {
        setIsSent(true);
        toast.success('Письмо отправлено', {
          description: 'Проверьте вашу почту для сброса пароля',
        });
      }
    } catch {
      toast.error('Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Восстановление пароля</CardTitle>
          <CardDescription>
            {isSent
              ? 'Проверьте вашу электронную почту'
              : 'Введите email для получения ссылки на сброс пароля'}
          </CardDescription>
        </CardHeader>

        {isSent ? (
          <CardContent className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Мы отправили письмо на <strong>{email}</strong>.
              Перейдите по ссылке в письме, чтобы установить новый пароль.
            </p>
            <p className="text-xs text-muted-foreground">
              Не получили письмо? Проверьте папку «Спам» или{' '}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => setIsSent(false)}
              >
                отправьте повторно
              </button>
            </p>
          </CardContent>
        ) : (
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
                  autoFocus
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Отправить ссылку
              </Button>
            </CardFooter>
          </form>
        )}

        <CardFooter className="justify-center pt-0">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" />
            Вернуться ко входу
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ForgotPassword;
