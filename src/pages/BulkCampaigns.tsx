import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Send, Plus, Loader2, MessageSquare, Users, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Черновик', variant: 'secondary' },
  sending: { label: 'Отправка', variant: 'default' },
  completed: { label: 'Завершена', variant: 'outline' },
  failed: { label: 'Ошибка', variant: 'destructive' },
};

const BulkCampaigns = () => {
  const { clinic, profile } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('');
  const [channel, setChannel] = useState('sms');
  const [filterType, setFilterType] = useState('all');
  const [filterDays, setFilterDays] = useState(30);

  useEffect(() => {
    if (!clinic?.id) return;
    fetchCampaigns();
  }, [clinic?.id]);

  const fetchCampaigns = async () => {
    const { data } = await supabase
      .from('bulk_campaigns')
      .select('*')
      .eq('clinic_id', clinic!.id)
      .order('created_at', { ascending: false });
    setCampaigns(data || []);
    setIsLoading(false);
  };

  const handleCreate = async () => {
    if (!name || !messageTemplate) { toast.error('Заполните все поля'); return; }
    setIsSaving(true);

    try {
      // Build filter criteria
      const filter_criteria: any = { type: filterType };
      if (filterType === 'no_visit') filter_criteria.days = filterDays;
      if (filterType === 'debtors') filter_criteria.min_debt = 0;

      // Get matching patients
      let patientsQuery = supabase.from('patients').select('id').eq('clinic_id', clinic!.id).eq('is_active', true);

      if (filterType === 'debtors') {
        patientsQuery = patientsQuery.lt('balance', 0);
      }

      const { data: matchingPatients } = await patientsQuery.limit(1000);
      const recipientIds = matchingPatients?.map(p => p.id) || [];

      // Create campaign
      const { data: campaign, error } = await supabase
        .from('bulk_campaigns')
        .insert({
          clinic_id: clinic!.id,
          name,
          message_template: messageTemplate,
          channel,
          filter_criteria,
          total_recipients: recipientIds.length,
          created_by: profile?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create recipients
      if (recipientIds.length > 0) {
        const recipients = recipientIds.map(pid => ({
          campaign_id: campaign.id,
          patient_id: pid,
        }));
        await supabase.from('bulk_campaign_recipients').insert(recipients);
      }

      toast.success(`Рассылка создана: ${recipientIds.length} получателей`);
      setDialogOpen(false);
      setName('');
      setMessageTemplate('');
      fetchCampaigns();
    } catch (e: any) {
      toast.error(e.message || 'Ошибка');
    }
    setIsSaving(false);
  };

  const handleSend = async (campaignId: string) => {
    toast.info('Отправка рассылки запущена...');
    // In production, this would call an edge function to send SMS/Telegram
    await supabase.from('bulk_campaigns').update({ status: 'sending', started_at: new Date().toISOString() }).eq('id', campaignId);
    fetchCampaigns();
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Рассылки</h1>
          <p className="text-muted-foreground">Массовые уведомления пациентам</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Новая рассылка</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Создать рассылку</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Название</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Напоминание о визите" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Канал</Label>
                  <Select value={channel} onValueChange={setChannel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="telegram">Telegram</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Фильтр пациентов</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все пациенты</SelectItem>
                      <SelectItem value="debtors">Должники</SelectItem>
                      <SelectItem value="no_visit">Не были давно</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {filterType === 'no_visit' && (
                <div className="space-y-2">
                  <Label>Не были более (дней)</Label>
                  <Input type="number" value={filterDays} onChange={e => setFilterDays(Number(e.target.value))} />
                </div>
              )}
              <div className="space-y-2">
                <Label>Текст сообщения</Label>
                <Textarea
                  value={messageTemplate}
                  onChange={e => setMessageTemplate(e.target.value)}
                  placeholder="Здравствуйте, {{patient_name}}! Напоминаем..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Переменные: {'{{patient_name}}'}, {'{{clinic_name}}'}
                </p>
              </div>
              <Button onClick={handleCreate} disabled={isSaving} className="w-full">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                Создать рассылку
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Канал</TableHead>
                <TableHead>Получатели</TableHead>
                <TableHead>Отправлено</TableHead>
                <TableHead>Ошибки</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map(c => {
                const st = statusLabels[c.status] || statusLabels.draft;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.channel === 'sms' ? 'SMS' : 'Telegram'}</Badge>
                    </TableCell>
                    <TableCell>{c.total_recipients}</TableCell>
                    <TableCell>{c.sent_count}</TableCell>
                    <TableCell>{c.failed_count > 0 ? <span className="text-destructive">{c.failed_count}</span> : '0'}</TableCell>
                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(c.created_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.status === 'draft' && (
                        <Button size="sm" onClick={() => handleSend(c.id)}>
                          <Send className="h-3.5 w-3.5 mr-1" />Отправить
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {campaigns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Нет рассылок
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkCampaigns;
