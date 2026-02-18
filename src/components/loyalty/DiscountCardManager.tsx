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
import { Plus, Loader2, CreditCard, Search } from 'lucide-react';
import type { DiscountCard } from '@/types/database';

export function DiscountCardManager() {
  const { clinic } = useAuth();
  const [cards, setCards] = useState<DiscountCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<{ id: string; full_name: string; phone: string }[]>([]);
  const [patientSearch, setPatientSearch] = useState('');

  const [form, setForm] = useState({
    patient_id: '',
    card_number: '',
    discount_percent: 5,
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
  });

  useEffect(() => {
    if (clinic?.id) fetchCards();
  }, [clinic?.id]);

  const fetchCards = async () => {
    if (!clinic?.id) return;
    const { data, error } = await supabase
      .from('discount_cards')
      .select('*, patient:patients(full_name, phone)')
      .eq('clinic_id', clinic.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching discount cards:', error);
    }
    setCards((data || []) as any);
    setLoading(false);
  };

  const searchPatients = async (query: string) => {
    setPatientSearch(query);
    if (!clinic?.id || query.length < 2) {
      setPatients([]);
      return;
    }
    const { data, error } = await supabase
      .from('patients')
      .select('id, full_name, phone')
      .eq('clinic_id', clinic.id)
      .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(10);
    if (!error) setPatients(data || []);
  };

  const generateCardNumber = () => {
    const num = Math.floor(100000 + Math.random() * 900000);
    setForm(f => ({ ...f, card_number: `DC-${num}` }));
  };

  const handleCreate = async () => {
    if (!clinic?.id || !form.patient_id || !form.card_number) return;
    setSaving(true);

    const { error } = await supabase.from('discount_cards').insert({
      clinic_id: clinic.id,
      patient_id: form.patient_id,
      card_number: form.card_number,
      discount_percent: form.discount_percent,
      valid_from: form.valid_from,
      valid_until: form.valid_until || null,
    });

    if (error) {
      toast.error('Ошибка: ' + error.message);
    } else {
      toast.success('Скидочная карта выдана');
      setDialogOpen(false);
      setForm({ patient_id: '', card_number: '', discount_percent: 5, valid_from: new Date().toISOString().split('T')[0], valid_until: '' });
      setPatientSearch('');
      setPatients([]);
      await fetchCards();
    }
    setSaving(false);
  };

  const toggleCard = async (id: string, active: boolean) => {
    const { error } = await supabase
      .from('discount_cards')
      .update({ is_active: active })
      .eq('id', id);
    if (error) {
      toast.error('Ошибка: ' + error.message);
    } else {
      await fetchCards();
    }
  };

  const filteredCards = cards.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.card_number.toLowerCase().includes(q) ||
      (c as any).patient?.full_name?.toLowerCase().includes(q) ||
      (c as any).patient?.phone?.includes(q)
    );
  });

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
                <CreditCard className="h-5 w-5" />
                Скидочные карты
              </CardTitle>
              <CardDescription>Выпуск и управление скидочными картами пациентов</CardDescription>
            </div>
            <Button size="sm" onClick={() => { generateCardNumber(); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />
              Выдать карту
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск по номеру или пациенту..."
              className="pl-9"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {filteredCards.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Нет скидочных карт</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Номер карты</TableHead>
                  <TableHead>Пациент</TableHead>
                  <TableHead>Скидка</TableHead>
                  <TableHead>Действует до</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCards.map(card => (
                  <TableRow key={card.id}>
                    <TableCell className="font-mono text-sm">{card.card_number}</TableCell>
                    <TableCell>{(card as any).patient?.full_name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{card.discount_percent}%</Badge>
                    </TableCell>
                    <TableCell>
                      {card.valid_until
                        ? new Date(card.valid_until).toLocaleDateString('ru-RU')
                        : 'Бессрочно'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={card.is_active ? 'default' : 'outline'}>
                        {card.is_active ? 'Активна' : 'Неактивна'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleCard(card.id, !card.is_active)}
                      >
                        {card.is_active ? 'Деактивировать' : 'Активировать'}
                      </Button>
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
            <DialogTitle>Выдача скидочной карты</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Пациент</Label>
              <Input
                placeholder="Поиск пациента..."
                value={patientSearch}
                onChange={e => searchPatients(e.target.value)}
              />
              {patients.length > 0 && (
                <div className="border rounded-md max-h-32 overflow-y-auto">
                  {patients.map(p => (
                    <button
                      key={p.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                      onClick={() => {
                        setForm(f => ({ ...f, patient_id: p.id }));
                        setPatientSearch(p.full_name);
                        setPatients([]);
                      }}
                    >
                      {p.full_name} — {p.phone}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Номер карты</Label>
                <Input
                  value={form.card_number}
                  onChange={e => setForm(f => ({ ...f, card_number: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Скидка (%)</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={form.discount_percent}
                  onChange={e => setForm(f => ({ ...f, discount_percent: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Действует с</Label>
                <Input
                  type="date"
                  value={form.valid_from}
                  onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Действует до</Label>
                <Input
                  type="date"
                  value={form.valid_until}
                  onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleCreate} disabled={saving || !form.patient_id || !form.card_number}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Выдать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
