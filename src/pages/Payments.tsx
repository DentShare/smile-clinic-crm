import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, CreditCard, Banknote, Wallet } from 'lucide-react';
import type { Payment } from '@/types/database';

const paymentMethodLabels: Record<string, string> = {
  cash: 'Наличные',
  uzcard: 'UzCard',
  humo: 'Humo',
  visa: 'Visa',
  mastercard: 'MasterCard',
  click: 'Click',
  payme: 'Payme',
  transfer: 'Перевод'
};

const paymentMethodIcons: Record<string, React.ReactNode> = {
  cash: <Banknote className="h-4 w-4" />,
  uzcard: <CreditCard className="h-4 w-4" />,
  humo: <CreditCard className="h-4 w-4" />,
  visa: <CreditCard className="h-4 w-4" />,
  mastercard: <CreditCard className="h-4 w-4" />,
  click: <Wallet className="h-4 w-4" />,
  payme: <Wallet className="h-4 w-4" />,
  transfer: <CreditCard className="h-4 w-4" />
};

const Payments = () => {
  const { clinic } = useAuth();
  const [payments, setPayments] = useState<(Payment & { patient?: { full_name: string } })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    today: 0,
    week: 0,
    month: 0
  });

  const fetchPayments = async () => {
    if (!clinic?.id) return;

    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        patient:patients(full_name)
      `)
      .eq('clinic_id', clinic.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching payments:', error);
    } else {
      setPayments(data as any);

      // Calculate stats
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const today = data?.filter(p => new Date(p.created_at) >= startOfToday)
        .reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const week = data?.filter(p => new Date(p.created_at) >= startOfWeek)
        .reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const month = data?.filter(p => new Date(p.created_at) >= startOfMonth)
        .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      setStats({ today, week, month });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPayments();
  }, [clinic?.id]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price) + ' сум';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Финансы</h1>
        <p className="text-muted-foreground">Учёт оплат и выручки</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Сегодня</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats.today)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">За неделю</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats.week)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">За месяц</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats.month)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          Нет оплат
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Пациент</TableHead>
                <TableHead>Способ оплаты</TableHead>
                <TableHead>Фискализация</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    {new Date(payment.created_at).toLocaleDateString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </TableCell>
                  <TableCell className="font-medium">
                    {payment.patient?.full_name || '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {paymentMethodIcons[payment.payment_method]}
                      {paymentMethodLabels[payment.payment_method] || payment.payment_method}
                    </div>
                  </TableCell>
                  <TableCell>
                    {payment.is_fiscalized ? (
                      <Badge variant="secondary">Фискализирован</Badge>
                    ) : (
                      <Badge variant="outline">Нет</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium text-green-600">
                    +{formatPrice(payment.amount)}
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

export default Payments;
