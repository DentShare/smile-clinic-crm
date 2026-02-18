import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Pencil, Loader2, Shield } from 'lucide-react';
import type { InsuranceCompany } from '@/types/database';

export function InsuranceCompanies() {
  const { clinic } = useAuth();
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    contract_number: '',
    discount_percent: 0,
  });

  useEffect(() => {
    if (clinic?.id) fetchCompanies();
  }, [clinic?.id]);

  const fetchCompanies = async () => {
    if (!clinic?.id) return;
    const { data, error } = await supabase
      .from('insurance_companies')
      .select('*')
      .eq('clinic_id', clinic.id)
      .order('name');

    if (error) console.error('Error fetching insurance companies:', error);
    setCompanies(data || []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', contract_number: '', discount_percent: 0 });
    setDialogOpen(true);
  };

  const openEdit = (c: InsuranceCompany) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      contract_number: c.contract_number || '',
      discount_percent: c.discount_percent,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!clinic?.id || !form.name.trim()) return;
    setSaving(true);

    const payload = {
      clinic_id: clinic.id,
      name: form.name.trim(),
      contract_number: form.contract_number || null,
      discount_percent: form.discount_percent,
    };

    if (editingId) {
      const { error } = await supabase
        .from('insurance_companies')
        .update(payload)
        .eq('id', editingId);
      if (error) {
        toast.error('Ошибка: ' + error.message);
      } else {
        toast.success('Компания обновлена');
        setDialogOpen(false);
        await fetchCompanies();
      }
    } else {
      const { error } = await supabase
        .from('insurance_companies')
        .insert(payload);
      if (error) {
        toast.error('Ошибка: ' + error.message);
      } else {
        toast.success('Компания добавлена');
        setDialogOpen(false);
        await fetchCompanies();
      }
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase
      .from('insurance_companies')
      .update({ is_active: active })
      .eq('id', id);
    if (error) {
      toast.error('Ошибка: ' + error.message);
    } else {
      await fetchCompanies();
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
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Страховые компании
              </CardTitle>
              <CardDescription>Управление страховыми компаниями и ДМС</CardDescription>
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Добавить
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Нет страховых компаний</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Договор</TableHead>
                  <TableHead>Скидка</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.contract_number || '—'}</TableCell>
                    <TableCell>
                      {c.discount_percent > 0 ? (
                        <Badge variant="secondary">{c.discount_percent}%</Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.is_active ? 'default' : 'outline'}>
                        {c.is_active ? 'Активна' : 'Неактивна'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(c.id, !c.is_active)}
                        >
                          {c.is_active ? 'Откл' : 'Вкл'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Редактировать компанию' : 'Новая страховая компания'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Название компании"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Номер договора</Label>
                <Input
                  value={form.contract_number}
                  onChange={e => setForm(f => ({ ...f, contract_number: e.target.value }))}
                  placeholder="ДМС-001"
                />
              </div>
              <div className="space-y-2">
                <Label>Скидка (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.discount_percent}
                  onChange={e => setForm(f => ({ ...f, discount_percent: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
