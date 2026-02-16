import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { useServiceMaterials } from '@/hooks/use-service-materials';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Package, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { InventoryItem } from '@/types/database';

interface ServiceMaterialsEditorProps {
  serviceId: string;
  serviceName: string;
}

export function ServiceMaterialsEditor({ serviceId, serviceName }: ServiceMaterialsEditorProps) {
  const { clinic } = useAuth();
  const { materials, isLoading, addMaterial, removeMaterial, updateQuantity } = useServiceMaterials(serviceId);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [qty, setQty] = useState('1');

  useEffect(() => {
    if (!clinic?.id) return;
    supabase
      .from('inventory')
      .select('*')
      .eq('clinic_id', clinic.id)
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (data) setInventoryItems(data as InventoryItem[]);
      });
  }, [clinic?.id]);

  const handleAdd = () => {
    if (!selectedInventoryId || !qty) return;

    addMaterial.mutate(
      { inventoryId: selectedInventoryId, quantityPerUnit: parseFloat(qty) },
      {
        onSuccess: () => {
          toast.success('Материал привязан к услуге');
          setSelectedInventoryId('');
          setQty('1');
        },
        onError: (err: any) => {
          toast.error('Ошибка: ' + (err.message || 'Не удалось добавить'));
        },
      }
    );
  };

  const handleRemove = (id: string) => {
    removeMaterial.mutate(id, {
      onSuccess: () => toast.success('Материал отвязан'),
      onError: () => toast.error('Ошибка удаления'),
    });
  };

  // Filter out already-linked inventory items
  const linkedIds = new Set(materials.map(m => m.inventory_id));
  const availableItems = inventoryItems.filter(i => !linkedIds.has(i.id));

  if (isLoading) {
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Материалы для «{serviceName}»</span>
      </div>

      {/* Linked materials */}
      {materials.length > 0 ? (
        <div className="space-y-2">
          {materials.map((mat) => (
            <div key={mat.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium truncate">{mat.inventory?.name || 'Материал'}</span>
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  {mat.quantity_per_unit} {mat.inventory?.unit || 'шт'}
                </Badge>
                {mat.is_required && (
                  <Badge variant="secondary" className="text-xs flex-shrink-0">обязат.</Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  className="w-20 h-8 text-sm"
                  defaultValue={mat.quantity_per_unit}
                  onBlur={(e) => {
                    const newVal = parseFloat(e.target.value);
                    if (newVal > 0 && newVal !== mat.quantity_per_unit) {
                      updateQuantity.mutate({ materialId: mat.id, quantityPerUnit: newVal });
                    }
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive"
                  onClick={() => handleRemove(mat.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Нет привязанных материалов</p>
      )}

      {/* Add new material */}
      {availableItems.length > 0 && (
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Материал</Label>
            <Select value={selectedInventoryId} onValueChange={setSelectedInventoryId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Выберите материал" />
              </SelectTrigger>
              <SelectContent>
                {availableItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} ({item.quantity} {item.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-20 space-y-1">
            <Label className="text-xs">Кол-во</Label>
            <Input
              type="number"
              step="0.1"
              min="0.1"
              className="h-9"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>
          <Button size="sm" className="h-9" onClick={handleAdd} disabled={!selectedInventoryId || addMaterial.isPending}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
