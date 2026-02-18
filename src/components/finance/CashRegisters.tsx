import { useState } from 'react';
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
import { useCashRegisters } from '@/hooks/use-cash-registers';
import { formatCurrency } from '@/lib/formatters';
import { Plus, Wallet, Banknote, Globe, ArrowUpRight, ArrowDownRight, Settings2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const TYPE_LABELS: Record<string, string> = {
  cash: 'Наличные',
  terminal: 'Терминал',
  online: 'Онлайн',
};

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  cash: Banknote,
  terminal: Wallet,
  online: Globe,
};

const OP_TYPE_LABELS: Record<string, string> = {
  income: 'Приход',
  expense: 'Расход',
  transfer: 'Перевод',
  adjustment: 'Корректировка',
};

export function CashRegisters() {
  const { registers, operations, loading, totalBalance, createRegister, updateRegister, recordOperation, fetchOperations } = useCashRegisters();
  const [showCreate, setShowCreate] = useState(false);
  const [showOperation, setShowOperation] = useState(false);
  const [selectedRegister, setSelectedRegister] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', type: 'cash', opening_balance: '' });
  const [opForm, setOpForm] = useState({ type: 'income' as string, amount: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await createRegister({
      name: form.name.trim(),
      type: form.type,
      opening_balance: parseFloat(form.opening_balance) || 0,
    });
    setForm({ name: '', type: 'cash', opening_balance: '' });
    setShowCreate(false);
    setSaving(false);
  };

  const handleOperation = async () => {
    if (!selectedRegister || !opForm.amount) return;
    const amount = parseFloat(opForm.amount.replace(/\s/g, '').replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return;
    setSaving(true);
    await recordOperation({
      cash_register_id: selectedRegister,
      type: opForm.type as any,
      amount,
      reference_type: 'manual',
      notes: opForm.notes || undefined,
    });
    setOpForm({ type: 'income', amount: '', notes: '' });
    setShowOperation(false);
    setSaving(false);
  };

  const openOperations = async (registerId: string) => {
    setSelectedRegister(registerId);
    await fetchOperations(registerId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Общий баланс касс</p>
          <CurrencyDisplay amount={totalBalance} size="lg" className="font-bold" />
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Новая касса
        </Button>
      </div>

      {/* Register Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {registers.map((reg) => {
          const Icon = TYPE_ICONS[reg.type] || Wallet;
          return (
            <Card key={reg.id} className={!reg.is_active ? 'opacity-50' : ''}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {reg.name}
                </CardTitle>
                <Badge variant="outline">{TYPE_LABELS[reg.type]}</Badge>
              </CardHeader>
              <CardContent>
                <CurrencyDisplay
                  amount={reg.current_balance}
                  size="lg"
                  className={reg.current_balance < 0 ? 'text-destructive' : 'text-success'}
                />
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSelectedRegister(reg.id);
                      setOpForm({ type: 'income', amount: '', notes: '' });
                      setShowOperation(true);
                    }}
                  >
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    Операция
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openOperations(reg.id)}
                  >
                    <Settings2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {registers.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-10 text-center text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Нет касс. Создайте первую кассу для учёта денежных средств.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Operations */}
      {operations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Последние операции
              {selectedRegister && (
                <Button variant="link" size="sm" className="ml-2" onClick={() => { setSelectedRegister(null); fetchOperations(); }}>
                  Все кассы
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Примечание</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                    <TableHead className="text-right">Баланс</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operations.map((op) => (
                    <TableRow key={op.id}>
                      <TableCell className="text-xs">
                        {format(new Date(op.created_at), 'dd.MM.yy HH:mm', { locale: ru })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={op.type === 'income' ? 'default' : op.type === 'expense' ? 'destructive' : 'secondary'}>
                          {op.type === 'income' ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                          {OP_TYPE_LABELS[op.type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {op.notes || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={op.type === 'income' ? 'text-success' : 'text-destructive'}>
                          {op.type === 'income' ? '+' : '-'}{formatCurrency(op.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(op.balance_after)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Create Register Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Новая касса</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Основная касса"
              />
            </div>
            <div className="space-y-2">
              <Label>Тип</Label>
              <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Наличные</SelectItem>
                  <SelectItem value="terminal">Терминал</SelectItem>
                  <SelectItem value="online">Онлайн</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Начальный баланс</Label>
              <Input
                type="text"
                value={form.opening_balance}
                onChange={(e) => setForm(f => ({ ...f, opening_balance: e.target.value.replace(/[^\d\s,]/g, '') }))}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Отмена</Button>
            <Button onClick={handleCreate} disabled={saving || !form.name.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Operation Dialog */}
      <Dialog open={showOperation} onOpenChange={setShowOperation}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Кассовая операция</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Тип операции</Label>
              <Select value={opForm.type} onValueChange={(v) => setOpForm(f => ({ ...f, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Приход</SelectItem>
                  <SelectItem value="expense">Расход</SelectItem>
                  <SelectItem value="adjustment">Корректировка</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Сумма</Label>
              <Input
                type="text"
                value={opForm.amount}
                onChange={(e) => setOpForm(f => ({ ...f, amount: e.target.value.replace(/[^\d\s,]/g, '') }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Примечание</Label>
              <Input
                value={opForm.notes}
                onChange={(e) => setOpForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Комментарий"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOperation(false)}>Отмена</Button>
            <Button onClick={handleOperation} disabled={saving || !opForm.amount}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Провести'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
