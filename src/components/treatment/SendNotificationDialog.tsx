import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MessageCircle, Phone, Send, Loader2 } from 'lucide-react';

interface SendNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  patientPhone: string;
  clinicId: string;
  treatmentPlanId?: string;
  stageId?: string;
  stageName?: string;
  defaultMessage?: string;
}

const SendNotificationDialog = ({
  open,
  onOpenChange,
  patientId,
  patientName,
  patientPhone,
  clinicId,
  treatmentPlanId,
  stageId,
  stageName,
  defaultMessage,
}: SendNotificationDialogProps) => {
  const [message, setMessage] = useState(
    defaultMessage ||
      `Уважаемый(ая) ${patientName}! Напоминаем вам о следующем этапе лечения${stageName ? `: "${stageName}"` : ''}. Для записи на приём свяжитесь с нами.`
  );
  const [sendSms, setSendSms] = useState(true);
  const [sendTelegram, setSendTelegram] = useState(true);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Введите текст сообщения');
      return;
    }

    if (!sendSms && !sendTelegram) {
      toast.error('Выберите хотя бы один способ отправки');
      return;
    }

    setSending(true);

    try {
      const type = sendSms && sendTelegram ? 'both' : sendSms ? 'sms' : 'telegram';

      const { data, error } = await supabase.functions.invoke('send-patient-notification', {
        body: {
          patientId,
          clinicId,
          treatmentPlanId,
          stageId,
          type,
          message: message.trim(),
        },
      });

      if (error) throw error;

      const results = data.results || {};
      const smsSuccess = results.sms?.success;
      const tgSuccess = results.telegram?.success;

      if (smsSuccess || tgSuccess) {
        const successParts = [];
        if (smsSuccess) successParts.push('SMS');
        if (tgSuccess) successParts.push('Telegram');
        toast.success(`Уведомление отправлено: ${successParts.join(', ')}`);
      }

      if (results.sms && !smsSuccess && sendSms) {
        toast.warning(`SMS не отправлено: ${results.sms.error || 'Ошибка'}`);
      }

      if (results.telegram && !tgSuccess && sendTelegram) {
        toast.warning(`Telegram не отправлено: ${results.telegram.error || 'Ошибка'}`);
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error('Notification error:', error);
      toast.error('Ошибка отправки: ' + (error.message || 'Попробуйте позже'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Отправить уведомление
          </DialogTitle>
          <DialogDescription>
            Пациент: {patientName} ({patientPhone})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Message */}
          <div className="space-y-2">
            <Label>Текст сообщения</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Введите текст уведомления..."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {message.length}/160 символов (SMS)
            </p>
          </div>

          {/* Channels */}
          <div className="space-y-2">
            <Label>Способ отправки</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sms"
                  checked={sendSms}
                  onCheckedChange={(checked) => setSendSms(checked === true)}
                />
                <label
                  htmlFor="sms"
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Phone className="h-4 w-4" />
                  SMS (Eskiz.uz)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="telegram"
                  checked={sendTelegram}
                  onCheckedChange={(checked) => setSendTelegram(checked === true)}
                />
                <label
                  htmlFor="telegram"
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <MessageCircle className="h-4 w-4" />
                  Telegram
                </label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Отправка...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Отправить
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendNotificationDialog;
