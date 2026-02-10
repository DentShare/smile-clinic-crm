import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { toast } from 'sonner';
import { Calculator, Settings, FileText, Loader2, Plus, Save, Trash2, TrendingUp } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';

const Salary = () => {
  const { clinic, profile, hasRole } = useAuth();
  const isAdmin = hasRole('clinic_admin');

  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [settings, setSettings] = useState<any>(null);
  const [categoryRates, setCategoryRates] = useState<any[]>([]);
  const [thresholds, setThresholds] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [periodMonth, setPeriodMonth] = useState(format(new Date(), 'yyyy-MM'));

  // Form state
  const [baseSalary, setBaseSalary] = useState(0);
  const [defaultCommission, setDefaultCommission] = useState(30);

  useEffect(() => {
    if (!clinic?.id) return;
    fetchDoctors();
    fetchCategories();
    fetchReports();
  }, [clinic?.id]);

  useEffect(() => {
    if (selectedDoctor) fetchSettings(selectedDoctor);
  }, [selectedDoctor]);

  const fetchDoctors = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, specialization, user_id')
      .eq('clinic_id', clinic!.id)
      .eq('is_active', true);
    
    // Filter to doctors only
    if (data) {
      const doctorProfiles: any[] = [];
      for (const p of data) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', p.user_id);
        if (roles?.some(r => r.role === 'doctor')) {
          doctorProfiles.push(p);
        }
      }
      setDoctors(doctorProfiles);
      if (doctorProfiles.length > 0 && !selectedDoctor) {
        setSelectedDoctor(doctorProfiles[0].id);
      }
    }
    setIsLoading(false);
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('service_categories')
      .select('*')
      .eq('clinic_id', clinic!.id)
      .order('sort_order');
    setCategories(data || []);
  };

  const fetchSettings = async (doctorId: string) => {
    const { data } = await supabase
      .from('salary_settings')
      .select('*')
      .eq('clinic_id', clinic!.id)
      .eq('doctor_id', doctorId)
      .maybeSingle();

    if (data) {
      setSettings(data);
      setBaseSalary(data.base_salary);
      setDefaultCommission(data.default_commission_percent);

      // Fetch category rates
      const { data: rates } = await supabase
        .from('salary_category_rates')
        .select('*, service_categories:category_id(name)')
        .eq('salary_setting_id', data.id);
      setCategoryRates(rates || []);

      // Fetch thresholds
      const { data: thresh } = await supabase
        .from('salary_thresholds')
        .select('*')
        .eq('salary_setting_id', data.id)
        .order('min_revenue');
      setThresholds(thresh || []);
    } else {
      setSettings(null);
      setBaseSalary(0);
      setDefaultCommission(30);
      setCategoryRates([]);
      setThresholds([]);
    }
  };

  const fetchReports = async () => {
    const { data } = await supabase
      .from('salary_reports')
      .select('*, doctor:doctor_id(full_name)')
      .eq('clinic_id', clinic!.id)
      .order('period_start', { ascending: false })
      .limit(50);
    setReports(data || []);
  };

  const handleSaveSettings = async () => {
    if (!selectedDoctor || !clinic?.id) return;
    setIsSaving(true);

    try {
      let settingId = settings?.id;

      if (settings) {
        await supabase
          .from('salary_settings')
          .update({ base_salary: baseSalary, default_commission_percent: defaultCommission })
          .eq('id', settings.id);
      } else {
        const { data, error } = await supabase
          .from('salary_settings')
          .insert({
            clinic_id: clinic.id,
            doctor_id: selectedDoctor,
            base_salary: baseSalary,
            default_commission_percent: defaultCommission,
          })
          .select()
          .single();
        if (error) throw error;
        settingId = data.id;
        setSettings(data);
      }

      toast.success('Настройки ЗП сохранены');
    } catch (e: any) {
      toast.error(e.message || 'Ошибка сохранения');
    }
    setIsSaving(false);
  };

  const handleGenerateReport = async () => {
    if (!selectedDoctor || !clinic?.id) return;
    setIsGenerating(true);

    try {
      const [year, month] = periodMonth.split('-').map(Number);
      const periodStart = startOfMonth(new Date(year, month - 1));
      const periodEnd = endOfMonth(new Date(year, month - 1));

      // Fetch performed works for this doctor in this period
      const { data: works } = await supabase
        .from('performed_works')
        .select('*, services:service_id(category_id)')
        .eq('clinic_id', clinic.id)
        .eq('doctor_id', selectedDoctor)
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString());

      const totalRevenue = (works || []).reduce((sum, w) => sum + (w.total || 0), 0);
      const worksCount = works?.length || 0;

      // Calculate commission
      let commissionAmount = 0;
      for (const work of works || []) {
        const catRate = categoryRates.find(cr => cr.category_id === work.services?.category_id);
        const rate = catRate ? catRate.commission_percent : defaultCommission;
        commissionAmount += (work.total || 0) * rate / 100;
      }

      // Calculate bonus from thresholds
      let bonusAmount = 0;
      for (const t of thresholds) {
        if (totalRevenue >= t.min_revenue) {
          bonusAmount = Math.max(bonusAmount, totalRevenue * t.bonus_percent / 100 + t.bonus_fixed);
        }
      }

      const totalSalary = baseSalary + commissionAmount + bonusAmount;

      const { error } = await supabase
        .from('salary_reports')
        .insert({
          clinic_id: clinic.id,
          doctor_id: selectedDoctor,
          period_start: format(periodStart, 'yyyy-MM-dd'),
          period_end: format(periodEnd, 'yyyy-MM-dd'),
          base_salary: baseSalary,
          commission_amount: commissionAmount,
          bonus_amount: bonusAmount,
          total_salary: totalSalary,
          total_revenue: totalRevenue,
          works_count: worksCount,
        });

      if (error) throw error;
      toast.success('Отчёт по ЗП сформирован');
      fetchReports();
    } catch (e: any) {
      toast.error(e.message || 'Ошибка формирования отчёта');
    }
    setIsGenerating(false);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Расчёт зарплаты</h1>
        <p className="text-muted-foreground">Настройка комиссий и формирование отчётов</p>
      </div>

      <Tabs defaultValue={isAdmin ? 'settings' : 'reports'}>
        <TabsList>
          {isAdmin && (
            <TabsTrigger value="settings">
              <Settings className="mr-2 h-4 w-4" />
              Настройки
            </TabsTrigger>
          )}
          <TabsTrigger value="reports">
            <FileText className="mr-2 h-4 w-4" />
            Отчёты
          </TabsTrigger>
        </TabsList>

        {isAdmin && (
          <TabsContent value="settings" className="mt-6 space-y-6">
            {/* Doctor selector */}
            <div className="flex items-center gap-4">
              <Label>Врач:</Label>
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Выберите врача" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedDoctor && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Base settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Базовые параметры</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Фиксированный оклад (сум/мес)</Label>
                      <Input
                        type="number"
                        value={baseSalary}
                        onChange={e => setBaseSalary(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Процент по умолчанию (%)</Label>
                      <Input
                        type="number"
                        value={defaultCommission}
                        onChange={e => setDefaultCommission(Number(e.target.value))}
                        min={0}
                        max={100}
                      />
                    </div>
                    <Button onClick={handleSaveSettings} disabled={isSaving} className="w-full">
                      {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Сохранить
                    </Button>
                  </CardContent>
                </Card>

                {/* Category-specific rates */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Ставки по категориям</CardTitle>
                    <CardDescription>Индивидуальный % для каждой категории услуг</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {settings ? (
                      <div className="space-y-2">
                        {categories.map(cat => {
                          const rate = categoryRates.find(cr => cr.category_id === cat.id);
                          return (
                            <div key={cat.id} className="flex items-center gap-3">
                              <span className="text-sm flex-1 truncate">{cat.name}</span>
                              <Input
                                type="number"
                                className="w-20"
                                placeholder={`${defaultCommission}`}
                                value={rate?.commission_percent ?? ''}
                                onChange={async (e) => {
                                  const val = Number(e.target.value);
                                  if (rate) {
                                    await supabase.from('salary_category_rates').update({ commission_percent: val }).eq('id', rate.id);
                                  } else {
                                    await supabase.from('salary_category_rates').insert({ salary_setting_id: settings.id, category_id: cat.id, commission_percent: val });
                                  }
                                  fetchSettings(selectedDoctor);
                                }}
                              />
                              <span className="text-sm text-muted-foreground">%</span>
                            </div>
                          );
                        })}
                        {categories.length === 0 && (
                          <p className="text-sm text-muted-foreground">Нет категорий услуг. Создайте их в разделе Услуги.</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Сначала сохраните базовые настройки</p>
                    )}
                  </CardContent>
                </Card>

                {/* Thresholds */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Пороги бонусов
                    </CardTitle>
                    <CardDescription>Дополнительные бонусы при достижении порога выручки</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {settings ? (
                      <div className="space-y-3">
                        {thresholds.map((t, idx) => (
                          <div key={t.id} className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">от</span>
                            <Input type="number" className="w-40" value={t.min_revenue} onChange={async (e) => {
                              await supabase.from('salary_thresholds').update({ min_revenue: Number(e.target.value) }).eq('id', t.id);
                              fetchSettings(selectedDoctor);
                            }} />
                            <span className="text-sm text-muted-foreground">сум → бонус</span>
                            <Input type="number" className="w-20" value={t.bonus_percent} onChange={async (e) => {
                              await supabase.from('salary_thresholds').update({ bonus_percent: Number(e.target.value) }).eq('id', t.id);
                              fetchSettings(selectedDoctor);
                            }} />
                            <span className="text-sm">% +</span>
                            <Input type="number" className="w-32" value={t.bonus_fixed} onChange={async (e) => {
                              await supabase.from('salary_thresholds').update({ bonus_fixed: Number(e.target.value) }).eq('id', t.id);
                              fetchSettings(selectedDoctor);
                            }} />
                            <span className="text-sm">сум</span>
                            <Button variant="ghost" size="icon" onClick={async () => {
                              await supabase.from('salary_thresholds').delete().eq('id', t.id);
                              fetchSettings(selectedDoctor);
                            }}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={async () => {
                          await supabase.from('salary_thresholds').insert({ salary_setting_id: settings.id, min_revenue: 0, bonus_percent: 0, bonus_fixed: 0 });
                          fetchSettings(selectedDoctor);
                        }}>
                          <Plus className="mr-2 h-4 w-4" />
                          Добавить порог
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Сначала сохраните базовые настройки</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Generate report */}
            {selectedDoctor && settings && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Сформировать отчёт</CardTitle>
                </CardHeader>
                <CardContent className="flex items-end gap-4">
                  <div className="space-y-2">
                    <Label>Период</Label>
                    <Input type="month" value={periodMonth} onChange={e => setPeriodMonth(e.target.value)} />
                  </div>
                  <Button onClick={handleGenerateReport} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
                    Рассчитать
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        <TabsContent value="reports" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>История отчётов</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Врач</TableHead>
                    <TableHead>Период</TableHead>
                    <TableHead className="text-right">Оклад</TableHead>
                    <TableHead className="text-right">Комиссия</TableHead>
                    <TableHead className="text-right">Бонус</TableHead>
                    <TableHead className="text-right">Итого ЗП</TableHead>
                    <TableHead className="text-right">Выручка</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.doctor?.full_name}</TableCell>
                      <TableCell>
                        {format(new Date(r.period_start), 'LLLL yyyy', { locale: ru })}
                      </TableCell>
                      <TableCell className="text-right"><CurrencyDisplay amount={r.base_salary} /></TableCell>
                      <TableCell className="text-right"><CurrencyDisplay amount={r.commission_amount} /></TableCell>
                      <TableCell className="text-right"><CurrencyDisplay amount={r.bonus_amount} /></TableCell>
                      <TableCell className="text-right font-semibold"><CurrencyDisplay amount={r.total_salary} /></TableCell>
                      <TableCell className="text-right"><CurrencyDisplay amount={r.total_revenue} /></TableCell>
                      <TableCell>
                        <Badge variant={r.status === 'approved' ? 'default' : 'secondary'}>
                          {r.status === 'approved' ? 'Утверждён' : r.status === 'draft' ? 'Черновик' : r.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {reports.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Нет отчётов
                      </TableCell>
                    </TableRow>
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

export default Salary;
