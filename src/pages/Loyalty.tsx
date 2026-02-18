import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { toast } from 'sonner';
import { Gift, Star, Ticket, Loader2, Plus, Save, Trash2, Settings, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { DiscountCardManager } from '@/components/loyalty/DiscountCardManager';

const Loyalty = () => {
  const { clinic, profile, hasRole } = useAuth();
  const isAdmin = hasRole('clinic_admin');
  const [program, setProgram] = useState<any>(null);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loyaltyPatients, setLoyaltyPatients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [voucherDialogOpen, setVoucherDialogOpen] = useState(false);

  // Program form
  const [programType, setProgramType] = useState('discount');
  const [isActive, setIsActive] = useState(true);
  const [bonusPercent, setBonusPercent] = useState(5);
  const [discountTiers, setDiscountTiers] = useState<any[]>([
    { min_spent: 500000, discount_percent: 3 },
    { min_spent: 2000000, discount_percent: 5 },
    { min_spent: 5000000, discount_percent: 10 },
  ]);

  // Voucher form
  const [voucherForm, setVoucherForm] = useState({
    code: '', type: 'service', service_id: '', amount: 0, patient_id: '', expires_at: '', notes: '',
  });

  useEffect(() => {
    if (!clinic?.id) return;
    fetchAll();
  }, [clinic?.id]);

  const fetchAll = async () => {
    const [progRes, vouchersRes, loyaltyRes, servicesRes, patientsRes] = await Promise.all([
      supabase.from('loyalty_programs').select('*').eq('clinic_id', clinic!.id).maybeSingle(),
      supabase.from('vouchers').select('*, patient:patient_id(full_name), service:service_id(name)').eq('clinic_id', clinic!.id).order('created_at', { ascending: false }).limit(100),
      supabase.from('patient_loyalty').select('*, patient:patient_id(full_name, phone)').eq('clinic_id', clinic!.id).order('total_spent', { ascending: false }).limit(100),
      supabase.from('services').select('id, name').eq('clinic_id', clinic!.id).eq('is_active', true),
      supabase.from('patients').select('id, full_name').eq('clinic_id', clinic!.id).eq('is_active', true).limit(500),
    ]);
    if (progRes.data) {
      setProgram(progRes.data);
      setProgramType(progRes.data.program_type);
      setIsActive(progRes.data.is_active);
      setBonusPercent(progRes.data.bonus_percent || 5);
      setDiscountTiers(Array.isArray(progRes.data.discount_tiers) ? progRes.data.discount_tiers : []);
    }
    setVouchers(vouchersRes.data || []);
    setLoyaltyPatients(loyaltyRes.data || []);
    setServices(servicesRes.data || []);
    setPatients(patientsRes.data || []);
    setIsLoading(false);
  };

  const handleSaveProgram = async () => {
    setIsSaving(true);
    try {
      const payload = {
        clinic_id: clinic!.id,
        program_type: programType,
        is_active: isActive,
        bonus_percent: bonusPercent,
        discount_tiers: discountTiers,
      };
      if (program) {
        await supabase.from('loyalty_programs').update(payload).eq('id', program.id);
      } else {
        await supabase.from('loyalty_programs').insert(payload);
      }
      toast.success('Программа лояльности сохранена');
      fetchAll();
    } catch (e: any) {
      toast.error(e.message || 'Ошибка');
    }
    setIsSaving(false);
  };

  const handleCreateVoucher = async () => {
    if (!voucherForm.code) { toast.error('Укажите код ваучера'); return; }
    setIsSaving(true);
    try {
      const { error } = await supabase.from('vouchers').insert({
        clinic_id: clinic!.id,
        code: voucherForm.code,
        type: voucherForm.type,
        service_id: voucherForm.service_id || null,
        amount: voucherForm.amount || null,
        patient_id: voucherForm.patient_id || null,
        expires_at: voucherForm.expires_at || null,
        notes: voucherForm.notes || null,
        issued_by: profile?.id,
      });
      if (error) throw error;
      toast.success('Ваучер создан');
      setVoucherDialogOpen(false);
      setVoucherForm({ code: '', type: 'service', service_id: '', amount: 0, patient_id: '', expires_at: '', notes: '' });
      fetchAll();
    } catch (e: any) {
      toast.error(e.message || 'Ошибка');
    }
    setIsSaving(false);
  };

  const handleRedeemVoucher = async (id: string) => {
    await supabase.from('vouchers').update({ is_used: true, used_at: new Date().toISOString() }).eq('id', id);
    toast.success('Ваучер погашен');
    fetchAll();
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Программа лояльности</h1>
        <p className="text-muted-foreground">Скидки, бонусы и ваучеры</p>
      </div>

      <Tabs defaultValue={isAdmin ? 'settings' : 'vouchers'}>
        <TabsList>
          {isAdmin && (
            <TabsTrigger value="settings">
              <Settings className="mr-2 h-4 w-4" />Настройки
            </TabsTrigger>
          )}
          <TabsTrigger value="patients">
            <Star className="mr-2 h-4 w-4" />Участники
          </TabsTrigger>
          <TabsTrigger value="vouchers">
            <Ticket className="mr-2 h-4 w-4" />Ваучеры
          </TabsTrigger>
          <TabsTrigger value="discount-cards">
            <CreditCard className="mr-2 h-4 w-4" />Скидочные карты
          </TabsTrigger>
        </TabsList>

        {isAdmin && (
          <TabsContent value="settings" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Настройки программы</span>
                  <div className="flex items-center gap-2">
                    <Label>Активна</Label>
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Тип программы</Label>
                  <Select value={programType} onValueChange={setProgramType}>
                    <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="discount">Накопительная скидка</SelectItem>
                      <SelectItem value="bonus">Бонусные баллы</SelectItem>
                      <SelectItem value="both">Оба варианта</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(programType === 'bonus' || programType === 'both') && (
                  <div className="space-y-2">
                    <Label>Кэшбэк баллами (%)</Label>
                    <Input type="number" className="w-32" value={bonusPercent} onChange={e => setBonusPercent(Number(e.target.value))} />
                  </div>
                )}

                {(programType === 'discount' || programType === 'both') && (
                  <div className="space-y-3">
                    <Label>Пороги скидок</Label>
                    {discountTiers.map((tier, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">от</span>
                        <Input type="number" className="w-40" value={tier.min_spent} onChange={e => {
                          const updated = [...discountTiers];
                          updated[idx].min_spent = Number(e.target.value);
                          setDiscountTiers(updated);
                        }} />
                        <span className="text-sm">сум →</span>
                        <Input type="number" className="w-20" value={tier.discount_percent} onChange={e => {
                          const updated = [...discountTiers];
                          updated[idx].discount_percent = Number(e.target.value);
                          setDiscountTiers(updated);
                        }} />
                        <span className="text-sm">%</span>
                        <Button variant="ghost" size="icon" onClick={() => setDiscountTiers(discountTiers.filter((_, i) => i !== idx))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setDiscountTiers([...discountTiers, { min_spent: 0, discount_percent: 0 }])}>
                      <Plus className="mr-2 h-4 w-4" />Добавить порог
                    </Button>
                  </div>
                )}

                <Button onClick={handleSaveProgram} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Сохранить
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="patients" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Участники программы</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Пациент</TableHead>
                    <TableHead className="text-right">Всего потрачено</TableHead>
                    <TableHead className="text-right">Бонусный баланс</TableHead>
                    <TableHead>Уровень</TableHead>
                    <TableHead className="text-right">Скидка</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loyaltyPatients.map(lp => (
                    <TableRow key={lp.id}>
                      <TableCell className="font-medium">{lp.patient?.full_name}</TableCell>
                      <TableCell className="text-right"><CurrencyDisplay amount={lp.total_spent} /></TableCell>
                      <TableCell className="text-right"><CurrencyDisplay amount={lp.bonus_balance} /></TableCell>
                      <TableCell>{lp.current_tier || '—'}</TableCell>
                      <TableCell className="text-right">{lp.current_discount_percent}%</TableCell>
                    </TableRow>
                  ))}
                  {loyaltyPatients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Нет участников
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vouchers" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Dialog open={voucherDialogOpen} onOpenChange={setVoucherDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Создать ваучер</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Новый ваучер / сертификат</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Код *</Label>
                      <Input value={voucherForm.code} onChange={e => setVoucherForm({ ...voucherForm, code: e.target.value.toUpperCase() })} placeholder="GIFT2024" />
                    </div>
                    <div className="space-y-2">
                      <Label>Тип</Label>
                      <Select value={voucherForm.type} onValueChange={v => setVoucherForm({ ...voucherForm, type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="service">На услугу</SelectItem>
                          <SelectItem value="amount">На сумму</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {voucherForm.type === 'service' && (
                    <div className="space-y-2">
                      <Label>Услуга</Label>
                      <Select value={voucherForm.service_id} onValueChange={v => setVoucherForm({ ...voucherForm, service_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Выберите услугу" /></SelectTrigger>
                        <SelectContent>
                          {services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {voucherForm.type === 'amount' && (
                    <div className="space-y-2">
                      <Label>Номинал (сум)</Label>
                      <Input type="number" value={voucherForm.amount} onChange={e => setVoucherForm({ ...voucherForm, amount: Number(e.target.value) })} />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Пациент (если именной)</Label>
                      <Select value={voucherForm.patient_id} onValueChange={v => setVoucherForm({ ...voucherForm, patient_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Любой" /></SelectTrigger>
                        <SelectContent>
                          {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Действует до</Label>
                      <Input type="date" value={voucherForm.expires_at} onChange={e => setVoucherForm({ ...voucherForm, expires_at: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Примечание</Label>
                    <Textarea value={voucherForm.notes} onChange={e => setVoucherForm({ ...voucherForm, notes: e.target.value })} />
                  </div>
                  <Button onClick={handleCreateVoucher} disabled={isSaving} className="w-full">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ticket className="mr-2 h-4 w-4" />}
                    Создать
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
                    <TableHead>Код</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Услуга / Сумма</TableHead>
                    <TableHead>Пациент</TableHead>
                    <TableHead>Действует до</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vouchers.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono font-semibold">{v.code}</TableCell>
                      <TableCell>{v.type === 'service' ? 'Услуга' : 'Сумма'}</TableCell>
                      <TableCell>
                        {v.type === 'service' ? v.service?.name || '—' : <CurrencyDisplay amount={v.amount || 0} />}
                      </TableCell>
                      <TableCell>{v.patient?.full_name || 'Любой'}</TableCell>
                      <TableCell>{v.expires_at ? format(new Date(v.expires_at), 'dd.MM.yyyy') : '—'}</TableCell>
                      <TableCell>
                        <Badge variant={v.is_used ? 'secondary' : 'default'}>
                          {v.is_used ? 'Использован' : 'Активен'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {!v.is_used && (
                          <Button size="sm" variant="outline" onClick={() => handleRedeemVoucher(v.id)}>
                            Погасить
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {vouchers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        <Gift className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        Нет ваучеров
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discount-cards" className="mt-6">
          <DiscountCardManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Loyalty;
