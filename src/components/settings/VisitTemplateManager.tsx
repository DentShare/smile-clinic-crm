import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Clock, X } from 'lucide-react';
import type { VisitTemplate, Service, ServiceCategory } from '@/types/database';

interface TemplateServiceItem {
  service_id: string;
  quantity: number;
  service_name?: string;
}

export function VisitTemplateManager() {
  const { clinic } = useAuth();
  const [templates, setTemplates] = useState<(VisitTemplate & { serviceNames?: string[] })[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    duration_minutes: 30,
    default_diagnosis: '',
    notes: '',
    serviceItems: [] as TemplateServiceItem[],
  });

  useEffect(() => {
    if (clinic?.id) fetchData();
  }, [clinic?.id]);

  const fetchData = async () => {
    if (!clinic?.id) return;
    setLoading(true);

    const [templatesRes, servicesRes, categoriesRes] = await Promise.all([
      supabase
        .from('visit_templates')
        .select('*')
        .eq('clinic_id', clinic.id)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('services')
        .select('*')
        .eq('clinic_id', clinic.id)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('service_categories')
        .select('*')
        .eq('clinic_id', clinic.id)
        .order('sort_order'),
    ]);

    const svcList = servicesRes.data || [];
    setServices(svcList);
    setCategories(categoriesRes.data || []);

    const tpls = (templatesRes.data || []).map((t: any) => ({
      ...t,
      services: t.services || [],
      serviceNames: (t.services || []).map((s: any) => {
        const svc = svcList.find(sv => sv.id === s.service_id);
        return svc ? `${svc.name} x${s.quantity}` : `? x${s.quantity}`;
      }),
    }));
    setTemplates(tpls);
    setLoading(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', duration_minutes: 30, default_diagnosis: '', notes: '', serviceItems: [] });
    setDialogOpen(true);
  };

  const openEdit = (t: VisitTemplate) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      duration_minutes: t.duration_minutes,
      default_diagnosis: t.default_diagnosis || '',
      notes: t.notes || '',
      serviceItems: (t.services || []).map((s: any) => ({
        service_id: s.service_id,
        quantity: s.quantity,
      })),
    });
    setDialogOpen(true);
  };

  const addServiceItem = () => {
    setForm(f => ({
      ...f,
      serviceItems: [...f.serviceItems, { service_id: '', quantity: 1 }],
    }));
  };

  const removeServiceItem = (idx: number) => {
    setForm(f => ({
      ...f,
      serviceItems: f.serviceItems.filter((_, i) => i !== idx),
    }));
  };

  const updateServiceItem = (idx: number, field: string, value: any) => {
    setForm(f => ({
      ...f,
      serviceItems: f.serviceItems.map((item, i) =>
        i === idx ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleSave = async () => {
    if (!clinic?.id || !form.name.trim()) return;
    setSaving(true);

    const payload = {
      clinic_id: clinic.id,
      name: form.name.trim(),
      duration_minutes: form.duration_minutes,
      default_diagnosis: form.default_diagnosis || null,
      notes: form.notes || null,
      services: form.serviceItems
        .filter(s => s.service_id)
        .map(s => ({ service_id: s.service_id, quantity: s.quantity })),
    };

    if (editingId) {
      const { error } = await supabase
        .from('visit_templates')
        .update(payload)
        .eq('id', editingId);
      if (error) {
        toast.error('Ошибка: ' + error.message);
      } else {
        toast.success('Шаблон обновлён');
        setDialogOpen(false);
        await fetchData();
      }
    } else {
      const { error } = await supabase
        .from('visit_templates')
        .insert(payload);
      if (error) {
        toast.error('Ошибка: ' + error.message);
      } else {
        toast.success('Шаблон создан');
        setDialogOpen(false);
        await fetchData();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('visit_templates')
      .update({ is_active: false })
      .eq('id', id);
    if (error) {
      toast.error('Ошибка: ' + error.message);
    } else {
      toast.success('Шаблон удалён');
      await fetchData();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Шаблоны приёмов</CardTitle>
              <CardDescription>Готовые наборы услуг для быстрого оформления визита</CardDescription>
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Добавить
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Нет шаблонов. Создайте первый для быстрого оформления приёмов.
            </p>
          ) : (
            <div className="space-y-3">
              {templates.map(t => (
                <div key={t.id} className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{t.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {t.duration_minutes} мин
                      </Badge>
                    </div>
                    {t.serviceNames && t.serviceNames.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {t.serviceNames.join(', ')}
                      </p>
                    )}
                    {t.default_diagnosis && (
                      <p className="text-xs text-muted-foreground">
                        Диагноз: {t.default_diagnosis}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Редактировать шаблон' : 'Новый шаблон приёма'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Например: Профгигиена"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Длительность (мин)</Label>
                <Input
                  type="number"
                  min={5}
                  step={5}
                  value={form.duration_minutes}
                  onChange={e => setForm(f => ({ ...f, duration_minutes: parseInt(e.target.value) || 30 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Диагноз по умолчанию</Label>
                <Input
                  value={form.default_diagnosis}
                  onChange={e => setForm(f => ({ ...f, default_diagnosis: e.target.value }))}
                  placeholder="K02.1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Заметки</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Дополнительные указания..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Услуги</Label>
                <Button variant="outline" size="sm" onClick={addServiceItem}>
                  <Plus className="h-3 w-3 mr-1" />
                  Услуга
                </Button>
              </div>
              {form.serviceItems.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Нажмите «Услуга» чтобы добавить</p>
              ) : (
                <div className="space-y-2">
                  {form.serviceItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Select
                        value={item.service_id}
                        onValueChange={v => updateServiceItem(idx, 'service_id', v)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Выберите услугу" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => {
                            const catServices = services.filter(s => s.category_id === cat.id);
                            if (catServices.length === 0) return null;
                            return (
                              <div key={cat.id}>
                                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">{cat.name}</div>
                                {catServices.map(s => (
                                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                              </div>
                            );
                          })}
                          {services.filter(s => !s.category_id).map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={1}
                        className="w-16"
                        value={item.quantity}
                        onChange={e => updateServiceItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                      />
                      <Button variant="ghost" size="sm" onClick={() => removeServiceItem(idx)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
