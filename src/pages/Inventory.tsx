import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Loader2, AlertTriangle } from 'lucide-react';
import type { InventoryItem } from '@/types/database';

const Inventory = () => {
  const { clinic, isClinicAdmin } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    sku: '',
    category: '',
    quantity: '0',
    unit: 'шт',
    min_quantity: '0',
    price: '0'
  });

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

  useEffect(() => {
    fetchItems();
  }, [clinic?.id]);

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
      price: parseFloat(newItem.price)
    });

    if (error) {
      toast.error('Ошибка добавления материала');
      console.error(error);
    } else {
      toast.success('Материал добавлен');
      setIsDialogOpen(false);
      setNewItem({ name: '', sku: '', category: '', quantity: '0', unit: 'шт', min_quantity: '0', price: '0' });
      fetchItems();
    }
  };

  const lowStockItems = items.filter(item => item.quantity <= item.min_quantity);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Склад</h1>
          <p className="text-muted-foreground">Учёт материалов и расходников</p>
        </div>

        {isClinicAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Добавить материал
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Новый материал</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateItem} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Название *</Label>
                  <Input
                    id="name"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sku">Артикул</Label>
                    <Input
                      id="sku"
                      value={newItem.sku}
                      onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Категория</Label>
                    <Input
                      id="category"
                      value={newItem.category}
                      onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Количество</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Ед. изм.</Label>
                    <Input
                      id="unit"
                      value={newItem.unit}
                      onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min_quantity">Мин. остаток</Label>
                    <Input
                      id="min_quantity"
                      type="number"
                      value={newItem.min_quantity}
                      onChange={(e) => setNewItem({ ...newItem, min_quantity: e.target.value })}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  Добавить
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {lowStockItems.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">Заканчиваются материалы ({lowStockItems.length})</span>
          </div>
          <p className="text-sm text-yellow-700 mt-1">
            {lowStockItems.map(i => i.name).join(', ')}
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          Склад пуст. Добавьте первый материал!
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
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-muted-foreground">{item.sku || '—'}</TableCell>
                  <TableCell>{item.category || '—'}</TableCell>
                  <TableCell className="text-right">
                    {item.quantity} {item.unit}
                  </TableCell>
                  <TableCell>
                    {item.quantity <= item.min_quantity ? (
                      <Badge variant="destructive">Мало</Badge>
                    ) : (
                      <Badge variant="secondary">В наличии</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default Inventory;
