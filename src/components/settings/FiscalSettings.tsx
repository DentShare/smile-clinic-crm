import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Receipt, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export function FiscalSettings() {
  const { clinic } = useAuth();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    ofd_enabled: false,
    ofd_provider: 'soliq', // 'soliq' or 'myfin'
    ofd_inn: '',
    ofd_login: '',
    ofd_password: '',
    ofd_terminal_id: '',
    auto_fiscalize: false,
  });

  useEffect(() => {
    if (!clinic?.id) return;
    const s = (clinic as any).settings || {};
    setSettings({
      ofd_enabled: s.ofd_enabled || false,
      ofd_provider: s.ofd_provider || 'soliq',
      ofd_inn: s.ofd_inn || '',
      ofd_login: s.ofd_login || '',
      ofd_password: s.ofd_password || '',
      ofd_terminal_id: s.ofd_terminal_id || '',
      auto_fiscalize: s.auto_fiscalize || false,
    });
  }, [clinic]);

  const handleSave = async () => {
    if (!clinic?.id) return;
    setLoading(true);

    try {
      const currentSettings = (clinic as any).settings || {};
      const { error } = await supabase
        .from('clinics')
        .update({
          settings: {
            ...currentSettings,
            ...settings,
          },
        })
        .eq('id', clinic.id);

      if (error) throw error;
      toast.success('Настройки фискализации сохранены');
    } catch (err: any) {
      toast.error('Ошибка сохранения', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const isConfigured = settings.ofd_inn && settings.ofd_login && settings.ofd_password;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Фискализация (ОФД)
              </CardTitle>
              <CardDescription>Интеграция с оператором фискальных данных для выдачи чеков</CardDescription>
            </div>
            <Badge variant={isConfigured && settings.ofd_enabled ? 'default' : 'secondary'}>
              {isConfigured && settings.ofd_enabled ? (
                <><CheckCircle className="h-3 w-3 mr-1" />Подключено</>
              ) : (
                <><XCircle className="h-3 w-3 mr-1" />Не подключено</>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Включить фискализацию</Label>
              <p className="text-xs text-muted-foreground">Все платежи будут отправляться в ОФД</p>
            </div>
            <Switch
              checked={settings.ofd_enabled}
              onCheckedChange={(v) => setSettings({ ...settings, ofd_enabled: v })}
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ИНН организации</Label>
              <Input
                value={settings.ofd_inn}
                onChange={(e) => setSettings({ ...settings, ofd_inn: e.target.value })}
                placeholder="123456789"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Логин ОФД</Label>
                <Input
                  value={settings.ofd_login}
                  onChange={(e) => setSettings({ ...settings, ofd_login: e.target.value })}
                  placeholder="login@company.uz"
                />
              </div>
              <div className="space-y-2">
                <Label>Пароль ОФД</Label>
                <Input
                  type="password"
                  value={settings.ofd_password}
                  onChange={(e) => setSettings({ ...settings, ofd_password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>ID терминала</Label>
              <Input
                value={settings.ofd_terminal_id}
                onChange={(e) => setSettings({ ...settings, ofd_terminal_id: e.target.value })}
                placeholder="TERM-001"
              />
              <p className="text-xs text-muted-foreground">Получите ID терминала в личном кабинете Soliq.uz</p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Автоматическая фискализация</Label>
                <p className="text-xs text-muted-foreground">Автоматически фискализировать при приёме платежа</p>
              </div>
              <Switch
                checked={settings.auto_fiscalize}
                onCheckedChange={(v) => setSettings({ ...settings, auto_fiscalize: v })}
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Сохранить настройки
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
