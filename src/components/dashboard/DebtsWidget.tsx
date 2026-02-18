import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Debtor {
  id: string;
  full_name: string;
  balance: number;
}

export function DebtsWidget() {
  const { clinic } = useAuth();
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [totalDebt, setTotalDebt] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clinic?.id) fetchDebtors();
  }, [clinic?.id]);

  const fetchDebtors = async () => {
    if (!clinic?.id) return;
    const { data, error } = await supabase
      .from('patients')
      .select('id, full_name, balance')
      .eq('clinic_id', clinic.id)
      .lt('balance', 0)
      .order('balance', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Error fetching debtors:', error);
      setLoading(false);
      return;
    }

    const list = (data || []).map(d => ({ ...d, balance: Number(d.balance) }));
    setDebtors(list);
    setTotalDebt(list.reduce((s, d) => s + Math.abs(d.balance), 0));
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

  if (debtors.length === 0) return null;

  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Задолженности
          <Badge variant="destructive" className="ml-auto">
            <CurrencyDisplay amount={totalDebt} size="sm" />
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {debtors.slice(0, 5).map(d => (
            <Link
              key={d.id}
              to={`/patients/${d.id}`}
              className="flex items-center justify-between py-1 hover:text-primary transition-colors text-sm"
            >
              <span className="truncate">{d.full_name}</span>
              <CurrencyDisplay amount={Math.abs(d.balance)} size="sm" className="text-destructive ml-2" />
            </Link>
          ))}
          {debtors.length > 5 && (
            <Link to="/finance" className="text-xs text-primary hover:underline block text-center mt-2">
              Все должники ({debtors.length})
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
