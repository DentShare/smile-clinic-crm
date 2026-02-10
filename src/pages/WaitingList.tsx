import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Clock, Plus, Loader2, CheckCircle2, X, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const priorityConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  low: { label: 'Низкий', variant: 'secondary' },
  normal: { label: 'Обычный', variant: 'default' },
  high: { label: 'Высокий', variant: 'destructive' },
};

const WaitingList = () => {
  const { clinic, profile } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form
  const [form, setForm] = useState({
    patient_id: '',
    doctor_id: '',
    service_id: '',
    priority: 'normal',
    preferred_date_from: '',
    preferred_date_to: '',
    notes: '',
  });

  useEffect(() => {
    if (!clinic?.id) return;
    fetchAll();
  }, [clinic?.id]);

  const fetchAll = async () => {
    const [entriesRes, patientsRes, doctorsRes, servicesRes] = await Promise.all([
      supabase.from('waiting_list').select('*, patient:patient_id(full_name, phone), doctor:doctor_id(full_name), service:service_id(name)').eq('clinic_id', clinic!.id).eq('status', 'waiting').order('created_at', { ascending: false }),
      supabase.from('patients').select('id, full_name, phone').eq('clinic_id', clinic!.id).eq('is_active', true).limit(500),
      supabase.from('profiles').select('id, full_name').eq('clinic_id', clinic!.id).eq('is_active', true),
      supabase.from('services').select('id, name').eq('clinic_id', clinic!.id).eq('is_active', true),
    ]);
    setEntries(entriesRes.data || []);
    setPatients(patientsRes.data || []);
    setDoctors(doctorsRes.data || []);
    setServices(servicesRes.data || []);
    setIsLoading(false);
  };

  const handleAdd = async () => {
    if (!form.patient_id) { toast.error('Выберите пациента'); return; }
    setIsSaving(true);
    try {
      const { error } = await supabase.from('waiting_list').insert({
        clinic_id: clinic!.id,
        patient_id: form.patient_id,
        doctor_id: form.doctor_id || null,
        service_id: form.service_id || null,
        priority: form.priority,
        preferred_date_from: form.preferred_date_from || null,
        preferred_date_to: form.preferred_date_to || null,
        notes: form.notes || null,
        created_by: profile?.id || null,
      });
      if (error) throw error;
      toast.success('Пациент добавлен в лист ожидания');
      setDialogOpen(false);
      setForm({ patient_id: '', doctor_id: '', service_id: '', priority: 'normal', preferred_date_from: '', preferred_date_to: '', notes: '' });
      fetchAll();
    } catch (e: any) {
      toast.error(e.message || 'Ошибка');
    }
    setIsSaving(false);
  };

  const handleResolve = async (id: string, status: 'booked' | 'cancelled') => {
    await supabase.from('waiting_list').update({ status, resolved_at: new Date().toISOString() }).eq('id', id);
    toast.success(status === 'booked' ? 'Пациент записан' : 'Запись из листа удалена');
    fetchAll();
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Лист ожидания</h1>
          <p className="text-muted-foreground">Пациенты, ожидающие свободного слота</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Добавить</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Добавить в лист ожидания</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Пациент *</Label>
                <Select value={form.patient_id} onValueChange={v => setForm({ ...form, patient_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Выберите пациента" /></SelectTrigger>
                  <SelectContent>
                    {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Врач</Label>
                  <Select value={form.doctor_id} onValueChange={v => setForm({ ...form, doctor_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Любой" /></SelectTrigger>
                    <SelectContent>
                      {doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Услуга</Label>
                  <Select value={form.service_id} onValueChange={v => setForm({ ...form, service_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Любая" /></SelectTrigger>
                    <SelectContent>
                      {services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Приоритет</Label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Низкий</SelectItem>
                    <SelectItem value="normal">Обычный</SelectItem>
                    <SelectItem value="high">Высокий</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Желаемая дата от</Label>
                  <Input type="date" value={form.preferred_date_from} onChange={e => setForm({ ...form, preferred_date_from: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Желаемая дата до</Label>
                  <Input type="date" value={form.preferred_date_to} onChange={e => setForm({ ...form, preferred_date_to: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Примечание</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <Button onClick={handleAdd} disabled={isSaving} className="w-full">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Добавить
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
                <TableHead>Пациент</TableHead>
                <TableHead>Врач</TableHead>
                <TableHead>Услуга</TableHead>
                <TableHead>Приоритет</TableHead>
                <TableHead>Желаемый период</TableHead>
                <TableHead>Примечание</TableHead>
                <TableHead>Добавлен</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map(e => {
                const prio = priorityConfig[e.priority] || priorityConfig.normal;
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.patient?.full_name}</TableCell>
                    <TableCell>{e.doctor?.full_name || '—'}</TableCell>
                    <TableCell>{e.service?.name || '—'}</TableCell>
                    <TableCell><Badge variant={prio.variant}>{prio.label}</Badge></TableCell>
                    <TableCell className="text-sm">
                      {e.preferred_date_from ? format(new Date(e.preferred_date_from), 'dd.MM') : ''}
                      {e.preferred_date_from && e.preferred_date_to ? ' — ' : ''}
                      {e.preferred_date_to ? format(new Date(e.preferred_date_to), 'dd.MM') : ''}
                      {!e.preferred_date_from && !e.preferred_date_to && '—'}
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{e.notes || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(e.created_at), 'dd.MM.yyyy', { locale: ru })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleResolve(e.id, 'booked')}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Записать
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleResolve(e.id, 'cancelled')}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Лист ожидания пуст
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

export default WaitingList;
