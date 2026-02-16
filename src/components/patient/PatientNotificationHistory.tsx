import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Bell, Send, MessageCircle, Phone, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';

interface Props {
  patientId: string;
  patientName: string;
  patientPhone: string;
}

export function PatientNotificationHistory({ patientId, patientName, patientPhone }: Props) {
  const { clinic } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sendType, setSendType] = useState<'sms' | 'telegram' | 'both'>('sms');
  const [sending, setSending] = useState(false);

  const { data: notifications = [], refetch } = useQuery({
    queryKey: ['patient-notifications', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_notifications')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!patientId,
  });

  const handleSend = async () => {
    if (!message.trim() || !clinic?.id) return;
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-patient-notification', {
        body: {
          patientId,
          clinicId: clinic.id,
          type: sendType,
          message: message.trim(),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Уведомление отправлено');
      setSendDialogOpen(false);
      setMessage('');
      refetch();
    } catch (err: any) {
      toast.error('Ошибка отправки', { description: err.message });
    } finally {
      setSending(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'sent': return <Badge variant="default" className="bg-green-600 text-xs">Отправлено</Badge>;
      case 'delivered': return <Badge variant="default" className="bg-blue-600 text-xs">Доставлено</Badge>;
      case 'failed': return <Badge variant="destructive" className="text-xs">Ошибка</Badge>;
      default: return <Badge variant="secondary" className="text-xs">Ожидание</Badge>;
    }
  };

  const typeBadge = (type: string) => {
    if (type === 'sms') return <Phone className="h-3 w-3 text-green-600" />;
    return <MessageCircle className="h-3 w-3 text-blue-600" />;
  };

  const visibleNotifications = expanded ? notifications : notifications.slice(0, 3);

  return (
    <>
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Уведомления
              {notifications.length > 0 && (
                <Badge variant="outline" className="ml-1 text-xs">{notifications.length}</Badge>
              )}
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => {
                setMessage(`Уважаемый(ая) ${patientName}! `);
                setSendDialogOpen(true);
              }}
            >
              <Send className="h-3 w-3 mr-1" />
              Отправить
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет отправленных уведомлений</p>
          ) : (
            <div className="space-y-2">
              {visibleNotifications.map((n: any) => (
                <div key={n.id} className="flex items-start gap-2 text-sm border-b border-border/50 pb-2 last:border-0">
                  <div className="mt-0.5">{typeBadge(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(n.created_at), 'dd.MM.yy HH:mm', { locale: ru })}
                      </span>
                      {statusBadge(n.status)}
                    </div>
                  </div>
                </div>
              ))}
              {notifications.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs h-7"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                  {expanded ? 'Свернуть' : `Ещё ${notifications.length - 3}`}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send notification dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Отправить уведомление</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm text-muted-foreground">
              <strong>{patientName}</strong> — {patientPhone}
            </div>
            <div className="flex gap-2">
              {(['sms', 'telegram', 'both'] as const).map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={sendType === t ? 'default' : 'outline'}
                  onClick={() => setSendType(t)}
                >
                  {t === 'sms' ? 'SMS' : t === 'telegram' ? 'Telegram' : 'Оба'}
                </Button>
              ))}
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Текст сообщения..."
            />
            <p className="text-xs text-muted-foreground">
              {message.length}/160 символов {message.length > 160 && '(2 SMS)'}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSend} disabled={!message.trim() || sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Отправить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
