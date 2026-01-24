import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Building2, 
  Key, 
  Calendar, 
  CreditCard, 
  FileText,
  Plus,
  Check,
  X,
  ExternalLink,
  Phone,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { toast } from 'sonner';
import type { ClinicTenant, BillingHistoryItem, ManualAdjustment } from '@/types/superAdmin';

interface ClinicDetailDrawerProps {
  clinic: ClinicTenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

const acquisitionSources = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'referral', label: 'Реферал' },
  { value: 'exhibition', label: 'Выставка' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'organic', label: 'Органика' },
  { value: 'other', label: 'Другое' },
];

export function ClinicDetailDrawer({ 
  clinic, 
  open, 
  onOpenChange, 
  onRefresh 
}: ClinicDetailDrawerProps) {
  const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>([]);
  const [adjustments, setAdjustments] = useState<ManualAdjustment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [inn, setInn] = useState('');
  const [acquisitionSource, setAcquisitionSource] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [daysToAdd, setDaysToAdd] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  useEffect(() => {
    if (clinic && open) {
      setOwnerName(clinic.owner_name || '');
      setPhone(clinic.phone || '');
      setInn(clinic.inn || '');
      setAcquisitionSource(clinic.acquisition_source || '');
      setAdminNotes(clinic.admin_notes || '');
      fetchBillingData();
    }
  }, [clinic, open]);

  const fetchBillingData = async () => {
    if (!clinic) return;
    setLoading(true);
    try {
      const [billingRes, adjustmentsRes] = await Promise.all([
        supabase
          .from('billing_history')
          .select('*')
          .eq('clinic_id', clinic.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('billing_manual_adjustments')
          .select('*')
          .eq('clinic_id', clinic.id)
          .order('created_at', { ascending: false }),
      ]);

      if (billingRes.data) setBillingHistory(billingRes.data);
      if (adjustmentsRes.data) setAdjustments(adjustmentsRes.data);
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInfo = async () => {
    if (!clinic) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('clinics')
        .update({
          owner_name: ownerName || null,
          phone: phone || null,
          inn: inn || null,
          acquisition_source: acquisitionSource || null,
          admin_notes: adminNotes || null,
        })
        .eq('id', clinic.id);

      if (error) throw error;
      toast.success('Информация сохранена');
      onRefresh();
    } catch (error) {
      console.error('Error saving clinic info:', error);
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleAddDays = async () => {
    if (!clinic || !daysToAdd) return;
    setSaving(true);
    try {
      // Insert adjustment record
      const { error: adjustmentError } = await supabase
        .from('billing_manual_adjustments')
        .insert({
          clinic_id: clinic.id,
          days_added: parseInt(daysToAdd),
          reason: adjustmentReason || null,
        });

      if (adjustmentError) throw adjustmentError;

      // Update subscription end date
      const currentEnd = clinic.subscription?.current_period_end 
        ? new Date(clinic.subscription.current_period_end)
        : new Date();
      
      const newEnd = new Date(currentEnd);
      newEnd.setDate(newEnd.getDate() + parseInt(daysToAdd));

      const { error: subError } = await supabase
        .from('clinic_subscriptions')
        .update({
          current_period_end: newEnd.toISOString(),
          status: 'active',
        })
        .eq('clinic_id', clinic.id);

      if (subError) throw subError;

      toast.success(`Добавлено ${daysToAdd} дней`);
      setDaysToAdd('');
      setAdjustmentReason('');
      fetchBillingData();
      onRefresh();
    } catch (error) {
      console.error('Error adding days:', error);
      toast.error('Ошибка при добавлении дней');
    } finally {
      setSaving(false);
    }
  };

  if (!clinic) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle>{clinic.name}</SheetTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
                {clinic.subdomain}.dent-crm.uz
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6">
          <Tabs defaultValue="info">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Информация</TabsTrigger>
              <TabsTrigger value="billing">Биллинг</TabsTrigger>
              <TabsTrigger value="notes">Заметки</TabsTrigger>
            </TabsList>

            {/* Info Tab */}
            <TabsContent value="info" className="space-y-4 mt-4">
              <div className="space-y-3">
                <div>
                  <Label>Имя владельца</Label>
                  <Input 
                    value={ownerName} 
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="ФИО владельца"
                  />
                </div>
                <div>
                  <Label>Телефон</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+998 90 123 45 67"
                    />
                    {phone && (
                      <Button variant="outline" size="icon" asChild>
                        <a 
                          href={`https://wa.me/${phone.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <Label>ИНН</Label>
                  <Input 
                    value={inn} 
                    onChange={(e) => setInn(e.target.value)}
                    placeholder="123456789"
                  />
                </div>
                <div>
                  <Label>Источник привлечения</Label>
                  <Select value={acquisitionSource} onValueChange={setAcquisitionSource}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите источник" />
                    </SelectTrigger>
                    <SelectContent>
                      {acquisitionSources.map(source => (
                        <SelectItem key={source.value} value={source.value}>
                          {source.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSaveInfo} disabled={saving} className="w-full">
                  {saving ? 'Сохранение...' : 'Сохранить информацию'}
                </Button>
              </div>
            </TabsContent>

            {/* Billing Tab */}
            <TabsContent value="billing" className="space-y-4 mt-4">
              {/* Subscription Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Текущая подписка</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Тариф</span>
                    <Badge>{clinic.subscription?.plan_name_ru || 'Нет'}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Статус</span>
                    <Badge variant={clinic.subscription?.status === 'active' ? 'default' : 'secondary'}>
                      {clinic.subscription?.status || 'trial'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Оплачено до</span>
                    <span>
                      {clinic.subscription?.current_period_end 
                        ? format(new Date(clinic.subscription.current_period_end), 'dd.MM.yyyy', { locale: ru })
                        : '—'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Manual Adjustment */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Ручное продление
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Добавить дней</Label>
                    <Input 
                      type="number" 
                      value={daysToAdd} 
                      onChange={(e) => setDaysToAdd(e.target.value)}
                      placeholder="30"
                    />
                  </div>
                  <div>
                    <Label>Причина</Label>
                    <Input 
                      value={adjustmentReason} 
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      placeholder="Оплата через Click/P2P"
                    />
                  </div>
                  <Button 
                    onClick={handleAddDays} 
                    disabled={!daysToAdd || saving}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить дни
                  </Button>
                </CardContent>
              </Card>

              {/* Payment History */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    История платежей
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-4 text-muted-foreground">Загрузка...</div>
                  ) : billingHistory.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">Нет платежей</div>
                  ) : (
                    <div className="space-y-2">
                      {billingHistory.slice(0, 5).map(item => (
                        <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="text-sm">{item.description || 'Оплата'}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(item.created_at), 'dd.MM.yyyy', { locale: ru })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {Number(item.amount).toLocaleString('ru-RU')} сум
                            </p>
                            <Badge variant={item.status === 'paid' ? 'default' : 'destructive'} className="text-xs">
                              {item.status === 'paid' ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Manual Adjustments History */}
              {adjustments.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Ручные корректировки</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {adjustments.map(adj => (
                        <div key={adj.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="text-sm">+{adj.days_added} дней</p>
                            <p className="text-xs text-muted-foreground">{adj.reason || '—'}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(adj.created_at), 'dd.MM.yyyy', { locale: ru })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="space-y-4 mt-4">
              <div>
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Заметки администратора
                </Label>
                <Textarea 
                  value={adminNotes} 
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Заметки для отдела продаж..."
                  className="mt-2 min-h-[200px]"
                />
              </div>
              <Button onClick={handleSaveInfo} disabled={saving} className="w-full">
                {saving ? 'Сохранение...' : 'Сохранить заметки'}
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        <Separator className="my-6" />

        {/* Quick Actions */}
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start">
            <Key className="h-4 w-4 mr-2 text-chart-4" />
            Войти как клиника
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
