import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { useInventoryMovements } from '@/hooks/use-inventory-movements';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Plus, Loader2, AlertTriangle, Package, ArrowDownCircle, ArrowUpCircle,
  Search, RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { InventoryItem, InventoryMovementType } from '@/types/database';
import { cn } from '@/lib/utils';
import { WarehouseDocuments } from '@/components/inventory/WarehouseDocuments';

const movementLabels: Record<InventoryMovementType, { label: string; color: string }> = {
  in: { label: 'Приход', color: 'text-green-600' },
  out: { label: 'Расход', color: 'text-red-600' },
  adjustment: { label: 'Корректировка', color: 'text-yellow-600' },
  auto_deduct: { label: 'Автосписание', color: 'text-orange-600' },
  return: { label: 'Возврат', color: 'text-blue-600' },
};

const Inventory = () => {
  const { clinic, isClinicAdmin } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [newItem, setNewItem] = useState({
    name: '', sku: '', category: '', quantity: '0', unit: 'шт', min_quantity: '0', price: '0',
  });
  const [movementData, setMovementData] = useState({
    type: 'in' as InventoryMovementType,
    quantity: '',
    notes: '',
  });

  const { movements, isLoading: movementsLoading, addMovement } = useInventoryMovements(selectedItem?.id);

  const fetchItems = async () => {
    if (!clinic?.id) return;
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('clinic_id', clinic.id)
      .order('name');

    if (error) {
      toast.error('Ошибка загрузки склада');
    } else {
      setItems(data as InventoryItem[]);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchItems(); }, [clinic?.id]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic?.id) return;

    const { error } = await supabase.from('inventory').insert({
      clinic_id: clinic.id,
      name: newItem.name,
      sku: newItem.sku || null,
      category: newItem.category || null,
      quantity: parseFloat(newItem.quantity),
      unit: newItem.unit,
      min_quantity: parseFloat(newItem.min_quantity),
      price: parseFloat(newItem.price),
    });

    if (error) {
      toast.error('Ошибка добавления материала');
    } else {
      toast.success('Материал добавлен');
      setIsDialogOpen(false);
      setNewItem({ name: '', sku: '', category: '', quantity: '0', unit: 'шт', min_quantity: '0', price: '0' });
      fetchItems();
    }
  };

  const handleMovement = () => {
    if (!selectedItem || !movementData.quantity) return;

    addMovement.mutate(
      {
        inventoryId: selectedItem.id,
        movementType: movementData.type,
        quantity: parseFloat(movementData.quantity),
        notes: movementData.notes,
      },
      {
        onSuccess: () => {
          toast.success('Движение записано');
          setMovementData({ type: 'in', quantity: '', notes: '' });
          setIsMovementDialogOpen(false);
          fetchItems();
        },
        onError: () => toast.error('Ошибка записи движения'),
      }
    );
  };

  const categories = Array.from(new Set(items.map(i => i.category).filter(Boolean)));

  const filteredItems = items.filter(item => {
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const lowStockItems = items.filter(item => item.quantity <= item.min_quantity && item.is_active);
  const totalValue = items.reduce((sum, i) => sum + i.quantity * i.price, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Склад</h1>
          <p className="text-muted-foreground">Учёт материалов и расходников</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchItems}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {isClinicAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Добавить материал</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Новый материал</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateItem} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Название *</Label>
                    <Input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Артикул</Label>
                      <Input value={newItem.sku} onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Категория</Label>
                      <Input value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Количество</Label>
                      <Input type="number" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Ед. изм.</Label>
                      <Input value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Мин. остаток</Label>
                      <Input type="number" value={newItem.min_quantity} onChange={(e) => setNewItem({ ...newItem, min_quantity: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Цена за единицу</Label>
                    <Input type="number" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} />
                  </div>
                  <Button type="submit" className="w-full">Добавить</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Позиций</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Стоимость склада</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalValue.toLocaleString('ru-RU')} so'm</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Заканчиваются</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", lowStockItems.length > 0 && "text-destructive")}>{lowStockItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Категорий</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">Заканчиваются материалы ({lowStockItems.length})</span>
          </div>
          <p className="text-sm text-destructive/80 mt-1">
            {lowStockItems.map(i => i.name).join(', ')}
          </p>
        </div>
      )}

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Материалы</TabsTrigger>
          <TabsTrigger value="movements">Движение</TabsTrigger>
          <TabsTrigger value="documents">Документы</TabsTrigger>
        </TabsList>

        {/* Materials list */}
        <TabsContent value="items" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию или артикулу..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {categories.length > 0 && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Категория" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все категории</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Badge variant="outline">{filteredItems.length} из {items.length}</Badge>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              {items.length === 0 ? 'Склад пуст. Добавьте первый материал!' : 'Ничего не найдено'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Название</TableHead>
                    <TableHead>Артикул</TableHead>
                    <TableHead>Категория</TableHead>
                    <TableHead className="text-right">Остаток</TableHead>
                    <TableHead className="text-right">Цена</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id} className={cn(item.quantity <= item.min_quantity && 'bg-destructive/5')}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">{item.sku || '—'}</TableCell>
                      <TableCell>{item.category || '—'}</TableCell>
                      <TableCell className="text-right">
                        {item.quantity} {item.unit}
                        {item.min_quantity > 0 && (
                          <span className="text-xs text-muted-foreground ml-1">(мин. {item.min_quantity})</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{item.price.toLocaleString('ru-RU')}</TableCell>
                      <TableCell>
                        {item.quantity <= item.min_quantity ? (
                          <Badge variant="destructive">Мало</Badge>
                        ) : (
                          <Badge variant="secondary">В наличии</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-600"
                            title="Приход"
                            onClick={() => {
                              setSelectedItem(item);
                              setMovementData({ type: 'in', quantity: '', notes: '' });
                              setIsMovementDialogOpen(true);
                            }}
                          >
                            <ArrowDownCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-600"
                            title="Расход"
                            onClick={() => {
                              setSelectedItem(item);
                              setMovementData({ type: 'out', quantity: '', notes: '' });
                              setIsMovementDialogOpen(true);
                            }}
                          >
                            <ArrowUpCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Movements history */}
        <TabsContent value="movements" className="space-y-4">
          {movementsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Нет записей о движении материалов
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead className="text-right">Кол-во</TableHead>
                    <TableHead className="text-right">Было</TableHead>
                    <TableHead className="text-right">Стало</TableHead>
                    <TableHead>Примечание</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => {
                    const config = movementLabels[m.movement_type as InventoryMovementType];
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm">
                          {format(new Date(m.created_at), 'dd.MM.yy HH:mm', { locale: ru })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-xs', config?.color)}>
                            {config?.label || m.movement_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{m.quantity}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{m.quantity_before}</TableCell>
                        <TableCell className="text-right">{m.quantity_after}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {m.notes || '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Warehouse Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <WarehouseDocuments />
        </TabsContent>
      </Tabs>

      {/* Movement dialog */}
      <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {movementData.type === 'in' ? 'Приход' : 'Расход'}: {selectedItem?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedItem && (
              <p className="text-sm text-muted-foreground">
                Текущий остаток: <strong>{selectedItem.quantity} {selectedItem.unit}</strong>
              </p>
            )}
            <div className="space-y-2">
              <Label>Тип движения</Label>
              <Select
                value={movementData.type}
                onValueChange={(v) => setMovementData({ ...movementData, type: v as InventoryMovementType })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Приход</SelectItem>
                  <SelectItem value="out">Расход</SelectItem>
                  <SelectItem value="adjustment">Корректировка</SelectItem>
                  <SelectItem value="return">Возврат</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Количество</Label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                value={movementData.quantity}
                onChange={(e) => setMovementData({ ...movementData, quantity: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Примечание</Label>
              <Input
                value={movementData.notes}
                onChange={(e) => setMovementData({ ...movementData, notes: e.target.value })}
                placeholder="Поставка, списание..."
              />
            </div>
            <Button className="w-full" onClick={handleMovement} disabled={!movementData.quantity || addMovement.isPending}>
              {addMovement.isPending ? 'Сохранение...' : 'Записать'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
