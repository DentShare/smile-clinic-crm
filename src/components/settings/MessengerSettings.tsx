import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, MessageCircle, Send as SendIcon, Copy, ExternalLink } from 'lucide-react';

interface MessengerConfig {
  telegram_bot_token?: string;
  whatsapp_api_token?: string;
  whatsapp_phone_number_id?: string;
  whatsapp_verify_token?: string;
}

export const MessengerSettings = () => {
  const { clinic } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<MessengerConfig>({
    telegram_bot_token: '',
    whatsapp_api_token: '',
    whatsapp_phone_number_id: '',
    whatsapp_verify_token: '',
  });

  useEffect(() => {
    if (!clinic?.id) return;
    const settings = (clinic.settings as Record<string, any>) || {};
    setConfig({
      telegram_bot_token: settings.telegram_bot_token || '',
      whatsapp_api_token: settings.whatsapp_api_token || '',
      whatsapp_phone_number_id: settings.whatsapp_phone_number_id || '',
      whatsapp_verify_token: settings.whatsapp_verify_token || '',
    });
  }, [clinic]);

  const handleSave = async () => {
    if (!clinic?.id) return;
    setIsLoading(true);

    const currentSettings = (clinic.settings as Record<string, any>) || {};
    const newSettings = {
      ...currentSettings,
      telegram_bot_token: config.telegram_bot_token?.trim() || null,
      whatsapp_api_token: config.whatsapp_api_token?.trim() || null,
      whatsapp_phone_number_id: config.whatsapp_phone_number_id?.trim() || null,
      whatsapp_verify_token: config.whatsapp_verify_token?.trim() || null,
    };

    const { error } = await supabase
      .from('clinics')
      .update({ settings: newSettings })
      .eq('id', clinic.id);

    if (error) {
      toast.error('Ошибка сохранения настроек мессенджеров');
    } else {
      toast.success('Настройки мессенджеров сохранены');

      // If telegram token is set, try to register webhook
      if (config.telegram_bot_token?.trim()) {
        try {
          const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-webhook`;
          await fetch(
            `https://api.telegram.org/bot${config.telegram_bot_token.trim()}/setWebhook?url=${encodeURIComponent(webhookUrl)}`,
          );
          toast.success('Telegram webhook зарегистрирован');
        } catch {
          toast.error('Не удалось зарегистрировать Telegram webhook');
        }
      }
    }
    setIsLoading(false);
  };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const telegramWebhookUrl = `${supabaseUrl}/functions/v1/telegram-webhook`;
  const whatsappWebhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Скопировано');
  };

  return (
    <div className="space-y-6">
      {/* Telegram */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Telegram
              </CardTitle>
              <CardDescription>
                Подключите Telegram-бота для приёма сообщений
              </CardDescription>
            </div>
            <Badge variant={config.telegram_bot_token ? 'default' : 'secondary'}>
              {config.telegram_bot_token ? 'Настроен' : 'Не настроен'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Bot Token</Label>
            <Input
              type="password"
              placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
              value={config.telegram_bot_token}
              onChange={(e) => setConfig({ ...config, telegram_bot_token: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Получите токен у{' '}
              <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="underline">
                @BotFather
              </a>
              {' '}в Telegram
            </p>
          </div>

          <div className="space-y-2">
            <Label>Webhook URL (для справки)</Label>
            <div className="flex gap-2">
              <Input readOnly value={telegramWebhookUrl} className="text-xs font-mono" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(telegramWebhookUrl)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Webhook регистрируется автоматически при сохранении
            </p>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <SendIcon className="h-5 w-5" />
                WhatsApp
              </CardTitle>
              <CardDescription>
                Подключите WhatsApp Business API
              </CardDescription>
            </div>
            <Badge variant={config.whatsapp_api_token ? 'default' : 'secondary'}>
              {config.whatsapp_api_token ? 'Настроен' : 'Не настроен'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Access Token</Label>
            <Input
              type="password"
              placeholder="EAABsbCS1i..."
              value={config.whatsapp_api_token}
              onChange={(e) => setConfig({ ...config, whatsapp_api_token: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Phone Number ID</Label>
            <Input
              placeholder="1234567890"
              value={config.whatsapp_phone_number_id}
              onChange={(e) => setConfig({ ...config, whatsapp_phone_number_id: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Verify Token</Label>
            <Input
              placeholder="my-secret-verify-token"
              value={config.whatsapp_verify_token}
              onChange={(e) => setConfig({ ...config, whatsapp_verify_token: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Придумайте любую секретную строку для верификации webhook
            </p>
          </div>

          <div className="space-y-2">
            <Label>Webhook URL (для настройки в Meta)</Label>
            <div className="flex gap-2">
              <Input readOnly value={whatsappWebhookUrl} className="text-xs font-mono" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(whatsappWebhookUrl)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Укажите этот URL в настройках{' '}
              <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">
                Meta for Developers <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Сохранить настройки
      </Button>
    </div>
  );
};
