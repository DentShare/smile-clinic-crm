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
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Calculator, Settings, FileText, Loader2, Plus, Save, Trash2,
  TrendingUp, AlertTriangle, Users,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';

interface MissingSalaryMonth {
  doctor_id: string;
  doctor_name: string;
  period_start: string;
}

const Salary = () => {
  const { clinic, hasRole } = useAuth();
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
  const [periodMonth, setPeriodMonth] = useState(format(new Date(), 'yyyy-MM'));

  // Form state
  const [baseSalary, setBaseSalary] = useState(0);
  const [defaultCommission, setDefaultCommission] = useState(30);
  const [autoGenerate, setAutoGenerate] = useState(false);

  // Bulk calculation state
  const [selectedBulkDoctors, setSelectedBulkDoctors] = useState<Set<string>>(new Set());
  const [bulkGenerating, setBulkGenerating] = useState(false);

  // Missing months banner
  const [missingMonths, setMissingMonths] = useState<MissingSalaryMonth[]>([]);
  const [generatingMissing, setGeneratingMissing] = useState(false);

  useEffect(() => {
    if (!clinic?.id) return;
    fetchDoctors();
    fetchCategories();
    fetchReports();
    if (isAdmin) fetchMissingMonths();
  }, [clinic?.id]);

  useEffect(() => {
    if (selectedDoctor) fetchSettings(selectedDoctor);
  }, [selectedDoctor]);

  const fetchDoctors = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, specialization, user_id')
      .eq('clinic_id', clinic!.id)
      .eq('is_active', true);
    if (error) console.error('Error fetching profiles:', error);

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
    const { data, error } = await supabase
      .from('service_categories')
      .select('*')
      .eq('clinic_id', clinic!.id)
      .order('sort_order');
    if (error) console.error('Error fetching categories:', error);
    setCategories(data || []);
  };

  const fetchSettings = async (doctorId: string) => {
    const { data, error } = await supabase
      .from('salary_settings')
      .select('*')
      .eq('clinic_id', clinic!.id)
      .eq('doctor_id', doctorId)
      .maybeSingle();
    if (error) console.error('Error fetching salary settings:', error);

    if (data) {
      setSettings(data);
      setBaseSalary(data.base_salary);
      setDefaultCommission(data.default_commission_percent);
      setAutoGenerate(data.auto_generate || false);

      const { data: rates } = await supabase
        .from('salary_category_rates')
        .select('*, service_categories:category_id(name)')
        .eq('salary_setting_id', data.id);
      setCategoryRates(rates || []);

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
      setAutoGenerate(false);
      setCategoryRates([]);
      setThresholds([]);
    }
  };

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from('salary_reports')
      .select('*, doctor:doctor_id(full_name)')
      .eq('clinic_id', clinic!.id)
      .order('period_start', { ascending: false })
      .limit(50);
    if (error) console.error('Error fetching salary reports:', error);
    setReports(data || []);
  };

  const fetchMissingMonths = async () => {
    if (!clinic?.id) return;
    try {
      const { data, error } = await supabase.rpc('get_missing_salary_months', {
        p_clinic_id: clinic.id,
      });
      if (error) throw error;
      setMissingMonths((data || []) as MissingSalaryMonth[]);
    } catch (err) {
      console.error('Error fetching missing months:', err);
    }
  };

  const handleSaveSettings = async () => {
    if (!selectedDoctor || !clinic?.id) return;
    setIsSaving(true);

    try {
      if (settings) {
        await supabase
          .from('salary_settings')
          .update({
            base_salary: baseSalary,
            default_commission_percent: defaultCommission,
            auto_generate: autoGenerate,
          })
          .eq('id', settings.id);
      } else {
        const { data, error } = await supabase
          .from('salary_settings')
          .insert({
            clinic_id: clinic.id,
            doctor_id: selectedDoctor,
            base_salary: baseSalary,
            default_commission_percent: defaultCommission,
            auto_generate: autoGenerate,
          })
          .select()
          .single();
        if (error) throw error;
        setSettings(data);
      }

      toast.success('Настройки ЗП сохранены');
    } catch (e: any) {
      toast.error(e.message || 'Ошибка сохранения');
    }
    setIsSaving(false);
  };

  // Single-doctor report via RPC
  const handleGenerateReport = async (doctorId: string) => {
    if (!clinic?.id) return;

    try {
      const [year, month] = periodMonth.split('-').map(Number);
      const pStart = startOfMonth(new Date(year, month - 1));
      const pEnd = endOfMonth(new Date(year, month - 1));

      const { data, error } = await supabase.rpc('generate_salary_report', {
        p_clinic_id: clinic.id,
        p_doctor_id: doctorId,
        p_period_start: format(pStart, 'yyyy-MM-dd'),
        p_period_end: format(pEnd, 'yyyy-MM-dd'),
      });

      if (error) throw error;
      return data as string;
    } catch (e: any) {
      throw e;
    }
  };

  // Bulk generate for selected doctors
  const handleBulkGenerate = async () => {
    if (!clinic?.id || selectedBulkDoctors.size === 0) return;
    setBulkGenerating(true);

    try {
      const [year, month] = periodMonth.split('-').map(Number);
      const pStart = startOfMonth(new Date(year, month - 1));
      const pEnd = endOfMonth(new Date(year, month - 1));

      const { data, error } = await supabase.rpc('bulk_generate_salary_reports', {
        p_clinic_id: clinic.id,
        p_doctor_ids: Array.from(selectedBulkDoctors),
        p_period_start: format(pStart, 'yyyy-MM-dd'),
        p_period_end: format(pEnd, 'yyyy-MM-dd'),
      });

      if (error) throw error;

      const result = data as { generated: number; errors: any[] };
      if (result.errors?.length > 0) {
        toast.warning(`Рассчитано: ${result.generated}, ошибок: ${result.errors.length}`);
      } else {
        toast.success(`Рассчитана ЗП для ${result.generated} врачей`);
      }

      fetchReports();
      setSelectedBulkDoctors(new Set());
    } catch (e: any) {
      toast.error(e.message || 'Ошибка массового расчёта');
    }
    setBulkGenerating(false);
  };

  // Generate missing months
  const handleGenerateMissing = async () => {
    if (!clinic?.id || missingMonths.length === 0) return;
    setGeneratingMissing(true);

    try {
      const doctorIds = missingMonths.map(m => m.doctor_id);
      const periodStart = missingMonths[0].period_start;
      // Calculate period_end from period_start
      const pStart = new Date(periodStart);
      const pEnd = endOfMonth(pStart);

      const { data, error } = await supabase.rpc('bulk_generate_salary_reports', {
        p_clinic_id: clinic.id,
        p_doctor_ids: doctorIds,
        p_period_start: periodStart,
        p_period_end: format(pEnd, 'yyyy-MM-dd'),
      });

      if (error) throw error;

      const result = data as { generated: number; errors: any[] };
      toast.success(`Рассчитана ЗП для ${result.generated} врачей`);
      setMissingMonths([]);
      fetchReports();
    } catch (e: any) {
      toast.error(e.message || 'Ошибка расчёта');
    }
    setGeneratingMissing(false);
  };

  const toggleBulkDoctor = (doctorId: string) => {
    setSelectedBulkDoctors(prev => {
      const next = new Set(prev);
      if (next.has(doctorId)) {
        next.delete(doctorId);
      } else {
        next.add(doctorId);
      }
      return next;
    });
  };

  const toggleAllBulkDoctors = () => {
    if (selectedBulkDoctors.size === doctors.length) {
      setSelectedBulkDoctors(new Set());
    } else {
      setSelectedBulkDoctors(new Set(doctors.map(d => d.id)));
    }
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

      {/* Missing months banner */}
      {isAdmin && missingMonths.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>
              За {format(new Date(missingMonths[0].period_start), 'LLLL yyyy', { locale: ru })} не рассчитана ЗП
              для {missingMonths.length} {missingMonths.length === 1 ? 'врача' : missingMonths.length < 5 ? 'врачей' : 'врачей'}:
              {' '}{missingMonths.map(m => m.doctor_name).join(', ')}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateMissing}
              disabled={generatingMissing}
              className="shrink-0"
            >
              {generatingMissing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
              Рассчитать сейчас
            </Button>
          </AlertDescription>
        </Alert>
      )}

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
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Авто-расчёт 1-го числа</Label>
                        <p className="text-xs text-muted-foreground">
                          ЗП рассчитывается автоматически каждый месяц
                        </p>
                      </div>
                      <Switch
                        checked={autoGenerate}
                        onCheckedChange={setAutoGenerate}
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
                        {thresholds.map((t) => (
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

            {/* Bulk report generation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Сформировать отчёты
                </CardTitle>
                <CardDescription>Выберите врачей и период для массового расчёта ЗП</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end gap-4">
                  <div className="space-y-2">
                    <Label>Период</Label>
                    <Input type="month" value={periodMonth} onChange={e => setPeriodMonth(e.target.value)} />
                  </div>
                </div>

                {/* Doctor checkboxes */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={selectedBulkDoctors.size === doctors.length && doctors.length > 0}
                      onCheckedChange={toggleAllBulkDoctors}
                    />
                    <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                      Выбрать всех ({doctors.length})
                    </Label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {doctors.map(d => (
                      <div key={d.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`doc-${d.id}`}
                          checked={selectedBulkDoctors.has(d.id)}
                          onCheckedChange={() => toggleBulkDoctor(d.id)}
                        />
                        <Label htmlFor={`doc-${d.id}`} className="text-sm cursor-pointer truncate">
                          {d.full_name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleBulkGenerate}
                  disabled={bulkGenerating || selectedBulkDoctors.size === 0}
                >
                  {bulkGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
                  Рассчитать ({selectedBulkDoctors.size})
                </Button>
              </CardContent>
            </Card>
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
