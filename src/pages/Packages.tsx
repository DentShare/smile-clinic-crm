import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { toast } from 'sonner';
import { Package, Wallet, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const Packages = () => {
  const { clinic, profile, hasRole } = useAuth();
  const isAdmin = hasRole('clinic_admin') || hasRole('reception');
  const [packages, setPackages] = useState<any[]>([]);
  const [patientPackages, setPatientPackages] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Package template form
  const [pkgDialogOpen, setPkgDialogOpen] = useState(false);
  const [pkgForm, setPkgForm] = useState({ name: '', description: '', total_price: 0, discount_percent: 0, validity_days: 365 });
  const [pkgItems, setPkgItems] = useState<{ service_id: string; quantity: number }[]>([]);

  // Sell package dialog
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [sellForm, setSellForm] = useState({ patient_id: '', package_id: '', amount_paid: 0 });

  // Deposit dialog
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [depositForm, setDepositForm] = useState({ patient_id: '', amount: 0, description: '' });

  useEffect(() => {
    if (!clinic?.id) return;
    fetchAll();
  }, [clinic?.id]);

  const fetchAll = async () => {
    const [pkgRes, patPkgRes, depRes, srvRes, patRes] = await Promise.all([
      supabase.from('service_packages').select('*, items:service_package_items(*, service:service_id(name))').eq('clinic_id', clinic!.id).order('created_at', { ascending: false }),
      supabase.from('patient_packages').select('*, patient:patient_id(full_name), package:package_id(name)').eq('clinic_id', clinic!.id).order('purchased_at', { ascending: false }).limit(100),
      supabase.from('patient_deposits').select('*, patient:patient_id(full_name, phone)').eq('clinic_id', clinic!.id).order('balance', { ascending: false }),
      supabase.from('services').select('id, name, price').eq('clinic_id', clinic!.id).eq('is_active', true),
      supabase.from('patients').select('id, full_name').eq('clinic_id', clinic!.id).eq('is_active', true).limit(500),
    ]);
    setPackages(pkgRes.data || []);
    setPatientPackages(patPkgRes.data || []);
    setDeposits(depRes.data || []);
    setServices(srvRes.data || []);
    setPatients(patRes.data || []);
    setIsLoading(false);
  };

  const handleCreatePackage = async () => {
    if (!pkgForm.name) { toast.error('Укажите название'); return; }
    setIsSaving(true);
    try {
      const { data: pkg, error } = await supabase.from('service_packages').insert({
        clinic_id: clinic!.id, ...pkgForm,
      }).select().single();
      if (error) throw error;

      if (pkgItems.length > 0) {
        await supabase.from('service_package_items').insert(
          pkgItems.filter(i => i.service_id).map(i => ({ package_id: pkg.id, service_id: i.service_id, quantity: i.quantity }))
        );
      }

      toast.success('Пакет создан');
      setPkgDialogOpen(false);
      setPkgForm({ name: '', description: '', total_price: 0, discount_percent: 0, validity_days: 365 });
      setPkgItems([]);
      fetchAll();
    } catch (e: any) { toast.error(e.message); }
    setIsSaving(false);
  };

  const handleSellPackage = async () => {
    if (!sellForm.patient_id || !sellForm.package_id) { toast.error('Заполните все поля'); return; }
    setIsSaving(true);
    try {
      const pkg = packages.find(p => p.id === sellForm.package_id);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (pkg?.validity_days || 365));

      const { error } = await supabase.from('patient_packages').insert({
        clinic_id: clinic!.id,
        patient_id: sellForm.patient_id,
        package_id: sellForm.package_id,
        amount_paid: sellForm.amount_paid || pkg?.total_price || 0,
        expires_at: expiresAt.toISOString(),
      });
      if (error) throw error;
      toast.success('Пакет продан');
      setSellDialogOpen(false);
      fetchAll();
    } catch (e: any) { toast.error(e.message); }
    setIsSaving(false);
  };

  const handleAddDeposit = async () => {
    if (!depositForm.patient_id || !depositForm.amount) { toast.error('Заполните все поля'); return; }
    setIsSaving(true);
    try {
      // Upsert deposit balance
      const existing = deposits.find(d => d.patient_id === depositForm.patient_id);
      if (existing) {
        await supabase.from('patient_deposits').update({ balance: existing.balance + depositForm.amount }).eq('id', existing.id);
      } else {
        await supabase.from('patient_deposits').insert({
          clinic_id: clinic!.id, patient_id: depositForm.patient_id, balance: depositForm.amount,
        });
      }

      // Log transaction
      await supabase.from('deposit_transactions').insert({
        clinic_id: clinic!.id, patient_id: depositForm.patient_id, type: 'topup', amount: depositForm.amount, description: depositForm.description || 'Пополнение депозита', created_by: profile?.id,
      });

      toast.success('Депозит пополнен');
      setDepositDialogOpen(false);
      setDepositForm({ patient_id: '', amount: 0, description: '' });
      fetchAll();
    } catch (e: any) { toast.error(e.message); }
    setIsSaving(false);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Абонементы и депозиты</h1>
        <p className="text-muted-foreground">Пакеты услуг и предоплатные счета</p>
      </div>

      <Tabs defaultValue="packages">
        <TabsList>
          <TabsTrigger value="packages"><Package className="mr-2 h-4 w-4" />Пакеты услуг</TabsTrigger>
          <TabsTrigger value="sold"><Package className="mr-2 h-4 w-4" />Проданные</TabsTrigger>
          <TabsTrigger value="deposits"><Wallet className="mr-2 h-4 w-4" />Депозиты</TabsTrigger>
        </TabsList>

        <TabsContent value="packages" className="mt-6 space-y-4">
          <div className="flex justify-end gap-2">
            <Dialog open={pkgDialogOpen} onOpenChange={setPkgDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Новый пакет</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Создать пакет услуг</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Название *</Label>
                    <Input value={pkgForm.name} onChange={e => setPkgForm({ ...pkgForm, name: e.target.value })} placeholder="Чистка x4" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Цена (сум)</Label>
                      <Input type="number" value={pkgForm.total_price} onChange={e => setPkgForm({ ...pkgForm, total_price: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Скидка %</Label>
                      <Input type="number" value={pkgForm.discount_percent} onChange={e => setPkgForm({ ...pkgForm, discount_percent: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Срок (дней)</Label>
                      <Input type="number" value={pkgForm.validity_days} onChange={e => setPkgForm({ ...pkgForm, validity_days: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Услуги в пакете</Label>
                    {pkgItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Select value={item.service_id} onValueChange={v => {
                          const updated = [...pkgItems]; updated[idx].service_id = v; setPkgItems(updated);
                        }}>
                          <SelectTrigger className="flex-1"><SelectValue placeholder="Услуга" /></SelectTrigger>
                          <SelectContent>
                            {services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input type="number" className="w-20" value={item.quantity} onChange={e => {
                          const updated = [...pkgItems]; updated[idx].quantity = Number(e.target.value); setPkgItems(updated);
                        }} />
                        <span className="text-sm">шт</span>
                        <Button variant="ghost" size="icon" onClick={() => setPkgItems(pkgItems.filter((_, i) => i !== idx))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setPkgItems([...pkgItems, { service_id: '', quantity: 1 }])}>
                      <Plus className="mr-2 h-4 w-4" />Добавить услугу
                    </Button>
                  </div>
                  <Button onClick={handleCreatePackage} disabled={isSaving} className="w-full">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Создать
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map(pkg => (
              <Card key={pkg.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{pkg.name}</CardTitle>
                  {pkg.description && <CardDescription>{pkg.description}</CardDescription>}
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Цена:</span>
                    <span className="font-semibold"><CurrencyDisplay amount={pkg.total_price} /></span>
                  </div>
                  {pkg.discount_percent > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Скидка:</span>
                      <Badge variant="secondary">{pkg.discount_percent}%</Badge>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Срок:</span>
                    <span className="text-sm">{pkg.validity_days} дней</span>
                  </div>
                  {pkg.items?.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground mb-1">Включено:</p>
                      {pkg.items.map((item: any) => (
                        <p key={item.id} className="text-sm">• {item.service?.name} × {item.quantity}</p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {packages.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground py-8">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Нет пакетов услуг
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sold" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Dialog open={sellDialogOpen} onOpenChange={setSellDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Продать пакет</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Продать пакет пациенту</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Пациент *</Label>
                    <Select value={sellForm.patient_id} onValueChange={v => setSellForm({ ...sellForm, patient_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                      <SelectContent>
                        {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Пакет *</Label>
                    <Select value={sellForm.package_id} onValueChange={v => {
                      const pkg = packages.find(p => p.id === v);
                      setSellForm({ ...sellForm, package_id: v, amount_paid: pkg?.total_price || 0 });
                    }}>
                      <SelectTrigger><SelectValue placeholder="Выберите пакет" /></SelectTrigger>
                      <SelectContent>
                        {packages.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — {p.total_price.toLocaleString()} сум</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Оплачено (сум)</Label>
                    <Input type="number" value={sellForm.amount_paid} onChange={e => setSellForm({ ...sellForm, amount_paid: Number(e.target.value) })} />
                  </div>
                  <Button onClick={handleSellPackage} disabled={isSaving} className="w-full">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Package className="mr-2 h-4 w-4" />}
                    Продать
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
                    <TableHead>Пакет</TableHead>
                    <TableHead className="text-right">Оплачено</TableHead>
                    <TableHead>Действует до</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patientPackages.map(pp => {
                    const isExpired = pp.expires_at && new Date(pp.expires_at) < new Date();
                    const effectiveStatus = isExpired ? 'expired' : pp.status;
                    return (
                      <TableRow key={pp.id}>
                        <TableCell className="font-medium">{pp.patient?.full_name}</TableCell>
                        <TableCell>{pp.package?.name}</TableCell>
                        <TableCell className="text-right"><CurrencyDisplay amount={pp.amount_paid} /></TableCell>
                        <TableCell className={isExpired ? 'text-destructive' : ''}>
                          {pp.expires_at ? format(new Date(pp.expires_at), 'dd.MM.yyyy') : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={effectiveStatus === 'active' ? 'default' : 'secondary'}>
                            {effectiveStatus === 'active' ? 'Активен' : effectiveStatus === 'expired' ? 'Истёк' : effectiveStatus}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {patientPackages.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Нет продаж</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deposits" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Пополнить депозит</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Пополнение депозита</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Пациент *</Label>
                    <Select value={depositForm.patient_id} onValueChange={v => setDepositForm({ ...depositForm, patient_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                      <SelectContent>
                        {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Сумма (сум) *</Label>
                    <Input type="number" value={depositForm.amount} onChange={e => setDepositForm({ ...depositForm, amount: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Описание</Label>
                    <Input value={depositForm.description} onChange={e => setDepositForm({ ...depositForm, description: e.target.value })} />
                  </div>
                  <Button onClick={handleAddDeposit} disabled={isSaving} className="w-full">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                    Пополнить
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
                    <TableHead className="text-right">Баланс депозита</TableHead>
                    <TableHead>Обновлён</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deposits.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.patient?.full_name}</TableCell>
                      <TableCell className="text-right font-semibold"><CurrencyDisplay amount={d.balance} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(d.updated_at), 'dd.MM.yyyy', { locale: ru })}
                      </TableCell>
                    </TableRow>
                  ))}
                  {deposits.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Нет депозитов</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Packages;
