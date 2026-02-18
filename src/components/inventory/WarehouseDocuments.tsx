import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { Separator } from '@/components/ui/separator';
import { useWarehouseDocuments } from '@/hooks/use-warehouse-documents';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/formatters';
import {
  Plus, Check, X, FileText, Loader2, Trash2, PackagePlus
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const DOC_TYPE_LABELS: Record<string, string> = {
  receipt: 'Приходная накладная',
  writeoff: 'Расходная накладная',
  transfer: 'Перемещение',
  inventory_check: 'Инвентаризация',
};

const DOC_STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  confirmed: 'Проведён',
  cancelled: 'Отменён',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  confirmed: 'default',
  cancelled: 'destructive',
};

interface DocItem {
  id: string;
  inventory_id: string;
  name: string;
  quantity: string;
  price: string;
}

export function WarehouseDocuments() {
  const { clinic } = useAuth();
  const { documents, loading, createDocument, confirmDocument, cancelDocument } = useWarehouseDocuments();
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<{ id: string; name: string; price: number }[]>([]);
  const [form, setForm] = useState({
    type: 'receipt',
    supplier: '',
    notes: '',
  });
  const [items, setItems] = useState<DocItem[]>([
    { id: crypto.randomUUID(), inventory_id: '', name: '', quantity: '', price: '' }
  ]);

  useEffect(() => {
    if (clinic?.id) {
      supabase
        .from('inventory')
        .select('id, name, price')
        .eq('clinic_id', clinic.id)
        .eq('is_active', true)
        .order('name')
        .then(({ data }) => setInventoryItems(data || []));
    }
  }, [clinic?.id]);

  const addItem = () => {
    setItems(prev => [...prev, { id: crypto.randomUUID(), inventory_id: '', name: '', quantity: '', price: '' }]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof DocItem, value: string) => {
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i;
      const updated = { ...i, [field]: value };
      // Auto-fill name and price when selecting inventory item
      if (field === 'inventory_id') {
        const inv = inventoryItems.find(it => it.id === value);
        if (inv) {
          updated.name = inv.name;
          updated.price = String(inv.price || 0);
        }
      }
      return updated;
    }));
  };

  const handleCreate = async () => {
    const validItems = items
      .filter(i => (i.inventory_id || i.name) && parseFloat(i.quantity) > 0)
      .map(i => ({
        inventory_id: i.inventory_id || undefined,
        name: i.name || undefined,
        quantity: parseFloat(i.quantity),
        price: parseFloat(i.price) || 0,
      }));

    if (validItems.length === 0) return;

    setSaving(true);
    await createDocument({
      type: form.type,
      supplier: form.supplier || undefined,
      notes: form.notes || undefined,
      items: validItems,
    });
    setForm({ type: 'receipt', supplier: '', notes: '' });
    setItems([{ id: crypto.randomUUID(), inventory_id: '', name: '', quantity: '', price: '' }]);
    setShowCreate(false);
    setSaving(false);
  };

  const handleConfirm = async (docId: string) => {
    setSaving(true);
    await confirmDocument(docId);
    setSaving(false);
  };

  const handleCancel = async (docId: string) => {
    setSaving(true);
    await cancelDocument(docId);
    setSaving(false);
  };

  const itemsTotal = items.reduce((s, i) => {
    const qty = parseFloat(i.quantity) || 0;
    const price = parseFloat(i.price) || 0;
    return s + qty * price;
  }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Складские документы</h3>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Новый документ
        </Button>
      </div>

      {documents.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Номер</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead>Поставщик</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.document_number}</TableCell>
                      <TableCell className="text-sm">{DOC_TYPE_LABELS[doc.type]}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(doc.created_at), 'dd.MM.yy', { locale: ru })}
                      </TableCell>
                      <TableCell className="text-sm">{doc.supplier || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[doc.status]}>{DOC_STATUS_LABELS[doc.status]}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <CurrencyDisplay amount={doc.total_amount} />
                      </TableCell>
                      <TableCell className="text-right">
                        {doc.status === 'draft' && (
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="default" onClick={() => handleConfirm(doc.id)} disabled={saving}>
                              <Check className="h-3 w-3 mr-1" />
                              Провести
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleCancel(doc.id)} disabled={saving}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Нет складских документов</p>
            <p className="text-sm mt-1">Создайте приходную или расходную накладную</p>
          </CardContent>
        </Card>
      )}

      {/* Create Document Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Новый складской документ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Тип документа</Label>
                <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receipt">Приходная накладная</SelectItem>
                    <SelectItem value="writeoff">Расходная накладная</SelectItem>
                    <SelectItem value="inventory_check">Инвентаризация</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.type === 'receipt' && (
                <div className="space-y-2">
                  <Label>Поставщик</Label>
                  <Input
                    value={form.supplier}
                    onChange={(e) => setForm(f => ({ ...f, supplier: e.target.value }))}
                    placeholder="Название поставщика"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Примечание</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Комментарий к документу"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <PackagePlus className="h-4 w-4" />
                Позиции
              </Label>
              {items.map((item) => (
                <div key={item.id} className="flex gap-2 items-center">
                  <Select
                    value={item.inventory_id}
                    onValueChange={(v) => updateItem(item.id, 'inventory_id', v)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Выберите товар" />
                    </SelectTrigger>
                    <SelectContent>
                      {inventoryItems.map(inv => (
                        <SelectItem key={inv.id} value={inv.id}>{inv.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="text"
                    placeholder="Кол-во"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', e.target.value.replace(/[^\d.,]/g, ''))}
                    className="w-20"
                  />
                  <Input
                    type="text"
                    placeholder="Цена"
                    value={item.price}
                    onChange={(e) => updateItem(item.id, 'price', e.target.value.replace(/[^\d.,]/g, ''))}
                    className="w-28"
                  />
                  {items.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-3 w-3 mr-1" />
                Добавить позицию
              </Button>
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Итого:</span>
              <CurrencyDisplay amount={itemsTotal} size="lg" className="font-bold" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Отмена</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
