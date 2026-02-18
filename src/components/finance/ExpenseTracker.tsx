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
import { Separator } from '@/components/ui/separator';
import { useExpenses } from '@/hooks/use-expenses';
import { useCashRegisters } from '@/hooks/use-cash-registers';
import { formatCurrency } from '@/lib/formatters';
import { Plus, Trash2, Tag, Loader2, Receipt, FolderPlus } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export function ExpenseTracker() {
  const { expenses, categories, loading, totalExpenses, createCategory, deleteCategory, createExpense, deleteExpense, fetchExpenses } = useExpenses();
  const { registers, recordOperation } = useCashRegisters();
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category_id: '',
    cash_register_id: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [categoryName, setCategoryName] = useState('');
  const [saving, setSaving] = useState(false);
  const [dateFilter, setDateFilter] = useState<'week' | 'month' | 'all'>('month');

  const handleAddExpense = async () => {
    const amount = parseFloat(expenseForm.amount.replace(/\s/g, '').replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return;
    setSaving(true);

    const result = await createExpense({
      category_id: expenseForm.category_id || undefined,
      cash_register_id: expenseForm.cash_register_id || undefined,
      amount,
      description: expenseForm.description || undefined,
      date: expenseForm.date,
    });

    if (result && expenseForm.cash_register_id) {
      await recordOperation({
        cash_register_id: expenseForm.cash_register_id,
        type: 'expense',
        amount,
        reference_type: 'expense',
        reference_id: result.id,
        notes: expenseForm.description || 'Расход',
      });
    }

    setExpenseForm({ category_id: '', cash_register_id: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
    setShowAddExpense(false);
    setSaving(false);
  };

  const handleAddCategory = async () => {
    if (!categoryName.trim()) return;
    setSaving(true);
    await createCategory(categoryName.trim());
    setCategoryName('');
    setShowAddCategory(false);
    setSaving(false);
  };

  const handleDeleteExpense = async (id: string) => {
    await deleteExpense(id);
  };

  // Group expenses by category for summary
  const expensesByCategory = expenses.reduce<Record<string, { name: string; total: number; count: number }>>((acc, e) => {
    const catName = (e.category as any)?.name || 'Без категории';
    if (!acc[catName]) acc[catName] = { name: catName, total: 0, count: 0 };
    acc[catName].total += Number(e.amount);
    acc[catName].count += 1;
    return acc;
  }, {});

  const categorySummary = Object.values(expensesByCategory).sort((a, b) => b.total - a.total);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Общие расходы за период</p>
          <CurrencyDisplay amount={totalExpenses} size="lg" className="font-bold text-destructive" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddCategory(true)}>
            <FolderPlus className="h-4 w-4 mr-1" />
            Категория
          </Button>
          <Button onClick={() => setShowAddExpense(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Расход
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Category Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">По категориям</CardTitle>
          </CardHeader>
          <CardContent>
            {categorySummary.length > 0 ? (
              <div className="space-y-3">
                {categorySummary.map((cat) => (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {cat.name}
                      </span>
                      <span className="text-muted-foreground">{cat.count} оп.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-destructive/70"
                          style={{ width: `${totalExpenses > 0 ? (cat.total / totalExpenses) * 100 : 0}%` }}
                        />
                      </div>
                      <CurrencyDisplay amount={cat.total} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Нет расходов</p>
            )}

            {categories.length > 0 && (
              <>
                <Separator className="my-4" />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Категории расходов</p>
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between text-sm py-1">
                      <span>{cat.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => deleteCategory(cat.id)}
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Expense List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Расходы
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expenses.length > 0 ? (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата</TableHead>
                      <TableHead>Категория</TableHead>
                      <TableHead>Описание</TableHead>
                      <TableHead className="text-right">Сумма</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="text-xs">
                          {format(new Date(expense.date), 'dd.MM.yy', { locale: ru })}
                        </TableCell>
                        <TableCell>
                          {(expense.category as any)?.name ? (
                            <Badge variant="outline" className="text-xs">
                              {(expense.category as any).name}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">
                          {expense.description || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <CurrencyDisplay amount={expense.amount} className="text-destructive" />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleDeleteExpense(expense.id)}
                          >
                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Нет расходов за выбранный период</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Expense Dialog */}
      <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Добавить расход</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Сумма</Label>
              <Input
                type="text"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm(f => ({ ...f, amount: e.target.value.replace(/[^\d\s,]/g, '') }))}
                placeholder="0"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Категория</Label>
              <Select value={expenseForm.category_id} onValueChange={(v) => setExpenseForm(f => ({ ...f, category_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {registers.length > 0 && (
              <div className="space-y-2">
                <Label>Касса (откуда списать)</Label>
                <Select value={expenseForm.cash_register_id} onValueChange={(v) => setExpenseForm(f => ({ ...f, cash_register_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Без привязки к кассе" />
                  </SelectTrigger>
                  <SelectContent>
                    {registers.filter(r => r.is_active).map((reg) => (
                      <SelectItem key={reg.id} value={reg.id}>
                        {reg.name} ({formatCurrency(reg.current_balance)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Описание</Label>
              <Input
                value={expenseForm.description}
                onChange={(e) => setExpenseForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Что оплачено"
              />
            </div>
            <div className="space-y-2">
              <Label>Дата</Label>
              <Input
                type="date"
                value={expenseForm.date}
                onChange={(e) => setExpenseForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddExpense(false)}>Отмена</Button>
            <Button onClick={handleAddExpense} disabled={saving || !expenseForm.amount}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Добавить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Новая категория расходов</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Аренда, Материалы, ЗП..."
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCategory(false)}>Отмена</Button>
            <Button onClick={handleAddCategory} disabled={saving || !categoryName.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
