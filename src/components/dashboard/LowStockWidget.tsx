import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { Package, AlertTriangle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  min_quantity: number;
  unit: string;
}

export function LowStockWidget() {
  const { clinic } = useAuth();
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clinic?.id) fetchLowStock();
  }, [clinic?.id]);

  const fetchLowStock = async () => {
    if (!clinic?.id) return;
    const { data, error } = await supabase
      .from('inventory')
      .select('id, name, quantity, min_quantity, unit')
      .eq('clinic_id', clinic.id)
      .eq('is_active', true)
      .order('quantity', { ascending: true })
      .limit(20);

    if (error) {
      console.error('Error fetching low stock:', error);
      setLoading(false);
      return;
    }

    const lowStock = (data || []).filter(i => i.quantity <= i.min_quantity);
    setItems(lowStock);
    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) return null;

  return (
    <Card className="border-orange-200 dark:border-orange-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Package className="h-4 w-4 text-orange-500" />
          Низкий остаток на складе
          <Badge variant="destructive" className="ml-auto">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.slice(0, 5).map(item => (
            <Link
              key={item.id}
              to="/inventory"
              className="flex items-center justify-between py-1 hover:text-primary transition-colors text-sm"
            >
              <span className="truncate flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-orange-500 shrink-0" />
                {item.name}
              </span>
              <span className="text-xs font-medium text-destructive ml-2 whitespace-nowrap">
                {item.quantity} / {item.min_quantity} {item.unit}
              </span>
            </Link>
          ))}
          {items.length > 5 && (
            <Link to="/inventory" className="text-xs text-primary hover:underline block text-center mt-2">
              Ещё {items.length - 5} позиций...
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
