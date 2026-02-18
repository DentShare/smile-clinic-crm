import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Calendar, 
  CreditCard, 
  Clock, 
  User,
  ChevronRight,
  RotateCcw,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { formatCurrency } from '@/lib/formatters';
import { PAYMENT_METHOD_LABELS } from '@/lib/payment-methods';
import { RefundDialog } from '@/components/finance/RefundDialog';

interface WorkPaymentStatus {
  performed_work_id: string;
  total_cost: number;
  paid_amount: number;
  status: 'paid' | 'partial' | 'unpaid';
}

interface Visit {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  complaints: string | null;
  diagnosis: string | null;
  doctor: { full_name: string } | null;
  performed_works: {
    id: string;
    total: number;
    service: { name: string } | null;
    tooth_number: number | null;
    treatment_plan_item: { service_name: string } | null;
  }[];
}

interface Payment {
  id: string;
  amount: number;
  payment_method: string | null;
  created_at: string;
  notes: string | null;
  is_fiscalized: boolean;
  fiscal_check_url: string | null;
}

interface PatientHistoryTimelineProps {
  patientId: string;
  patientName: string;
  onRefresh?: () => void;
}

export function PatientHistoryTimeline({ patientId, patientName, onRefresh }: PatientHistoryTimelineProps) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [workPaymentMap, setWorkPaymentMap] = useState<Map<string, WorkPaymentStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [refundPayment, setRefundPayment] = useState<Payment | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [patientId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const [visitsRes, paymentsRes] = await Promise.all([
        supabase
          .from('appointments')
          .select(`
            id,
            start_time,
            end_time,
            status,
            complaints,
            diagnosis,
            doctor:doctor_id (full_name),
            performed_works (
              id,
              total,
              tooth_number,
              service:service_id (name),
              treatment_plan_item:treatment_plan_item_id (service_name)
            )
          `)
          .eq('patient_id', patientId)
          .in('status', ['completed', 'cancelled', 'no_show'])
          .order('start_time', { ascending: false })
          .limit(50),
        
        supabase
          .from('payments')
          .select('id, amount, payment_method, created_at, notes, is_fiscalized, fiscal_check_url')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })
          .limit(50)
      ]);

      if (visitsRes.error) throw visitsRes.error;
      if (paymentsRes.error) throw paymentsRes.error;

      setVisits((visitsRes.data as unknown as Visit[]) || []);
      setPayments((paymentsRes.data as Payment[]) || []);

      // Fetch payment status for performed works
      const { data: statusData } = await supabase.rpc('get_work_payment_status', {
        p_patient_id: patientId
      });
      if (statusData) {
        const statusArr = statusData as unknown as WorkPaymentStatus[];
        const map = new Map<string, WorkPaymentStatus>();
        statusArr.forEach(s => map.set(s.performed_work_id, s));
        setWorkPaymentMap(map);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'no_show':
        return <XCircle className="h-4 w-4 text-warning" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Завершён';
      case 'cancelled': return 'Отменён';
      case 'no_show': return 'Не явился';
      default: return status;
    }
  };

  const isRefund = (payment: Payment) => payment.amount < 0;

  const handleRefundComplete = () => {
    fetchHistory();
    onRefresh?.();
  };

  if (loading) {
    return (
      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="py-3 px-4 shrink-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            История
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 flex-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 py-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const allItems = [
    ...visits.filter(v => v && v.start_time).map(v => ({ 
      type: 'visit' as const, 
      date: new Date(v.start_time), 
      data: v 
    })),
    ...payments.filter(p => p && p.created_at).map(p => ({ 
      type: 'payment' as const, 
      date: new Date(p.created_at), 
      data: p 
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <>
      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="py-3 px-4 shrink-0">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              История
            </span>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-auto">
              <TabsList className="h-7">
                <TabsTrigger value="all" className="text-xs px-2 py-1">Всё</TabsTrigger>
                <TabsTrigger value="visits" className="text-xs px-2 py-1">Визиты</TabsTrigger>
                <TabsTrigger value="payments" className="text-xs px-2 py-1">Оплаты</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 min-h-0">
          <ScrollArea className="h-full max-h-[400px]">
            <div className="p-4 space-y-1">
              {activeTab === 'all' && allItems.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Нет записей
                </p>
              )}
              
              {activeTab === 'all' && allItems.map((item, idx) => (
                item.type === 'visit' ? (
                  <VisitItem key={`visit-${item.data.id}`} visit={item.data as Visit} workPaymentMap={workPaymentMap} />
                ) : (
                  <PaymentItem 
                    key={`payment-${item.data.id}`} 
                    payment={item.data as Payment}
                    onRefund={() => setRefundPayment(item.data as Payment)}
                  />
                )
              ))}

              {activeTab === 'visits' && visits.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Нет завершённых визитов
                </p>
              )}
              
              {activeTab === 'visits' && visits.map((visit) => (
                <VisitItem key={visit.id} visit={visit} workPaymentMap={workPaymentMap} />
              ))}

              {activeTab === 'payments' && payments.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Нет платежей
                </p>
              )}
              
              {activeTab === 'payments' && payments.map((payment) => (
                <PaymentItem 
                  key={payment.id} 
                  payment={payment}
                  onRefund={() => setRefundPayment(payment)}
                />
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {refundPayment && refundPayment.amount > 0 && (
        <RefundDialog
          open={!!refundPayment}
          onOpenChange={(open) => !open && setRefundPayment(null)}
          patientId={patientId}
          patientName={patientName}
          payment={{
            id: refundPayment.id,
            amount: refundPayment.amount,
            method: refundPayment.payment_method || 'cash',
            date: refundPayment.created_at
          }}
          onRefundComplete={handleRefundComplete}
        />
      )}
    </>
  );
}

function VisitItem({ visit, workPaymentMap }: { visit: Visit; workPaymentMap: Map<string, WorkPaymentStatus> }) {
  const [expanded, setExpanded] = useState(false);
  const totalCost = visit.performed_works?.reduce((sum, pw) => sum + Number(pw.total), 0) || 0;
  const hasWorks = visit.performed_works && visit.performed_works.length > 0;

  return (
    <div className="rounded-lg transition-colors">
      <div 
        className={`flex gap-3 group hover:bg-muted/50 -mx-2 px-2 py-2 rounded-lg cursor-pointer ${expanded ? 'bg-muted/30' : ''}`}
        onClick={() => hasWorks && setExpanded(!expanded)}
      >
        <div className="p-1.5 rounded-full shrink-0 bg-primary/10 text-primary">
          <Calendar className="h-3 w-3" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium truncate">
              Визит {format(new Date(visit.start_time), 'd MMM yyyy', { locale: ru })}
            </p>
            <Badge 
              variant={visit.status === 'completed' ? 'default' : 'secondary'}
              className="text-xs shrink-0"
            >
              {visit.status === 'completed' ? 'Завершён' : 
               visit.status === 'cancelled' ? 'Отменён' : 'Не явился'}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <Clock className="h-3 w-3" />
            {format(new Date(visit.start_time), 'HH:mm')} - {format(new Date(visit.end_time), 'HH:mm')}
            {visit.doctor && (
              <>
                <span>•</span>
                <User className="h-3 w-3" />
                {visit.doctor.full_name}
              </>
            )}
          </div>
          {hasWorks && (
            <div className="mt-1 text-xs">
              <span className="text-muted-foreground">Услуги: </span>
              <span className="font-medium">
                {visit.performed_works.length} на {formatCurrency(totalCost)}
              </span>
            </div>
          )}
          {visit.diagnosis && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              Диагноз: {visit.diagnosis}
            </p>
          )}
        </div>
        {hasWorks && (
          <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 self-center transition-transform ${expanded ? 'rotate-90' : ''}`} />
        )}
      </div>
      
      {/* Expanded services list */}
      {expanded && hasWorks && (
        <div className="ml-8 mt-1 mb-2 space-y-1 border-l-2 border-muted pl-3">
          {visit.performed_works.map((work) => {
            const payStatus = workPaymentMap.get(work.id);
            return (
              <div key={work.id} className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-2 min-w-0">
                  {work.tooth_number && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                      №{work.tooth_number}
                    </Badge>
                  )}
                  <span className="truncate text-muted-foreground">
                    {work.service?.name || work.treatment_plan_item?.service_name || 'Услуга'}
                  </span>
                  {payStatus && payStatus.status === 'paid' && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0 shrink-0 bg-success/15 text-success border-success/30">
                      Оплачено
                    </Badge>
                  )}
                  {payStatus && payStatus.status === 'partial' && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0 shrink-0 bg-warning/15 text-warning border-warning/30">
                      Частично
                    </Badge>
                  )}
                  {(!payStatus || payStatus.status === 'unpaid') && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0 shrink-0 bg-destructive/15 text-destructive border-destructive/30">
                      Не оплачено
                    </Badge>
                  )}
                </div>
                <span className="font-medium shrink-0 ml-2">
                  {formatCurrency(work.total)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PaymentItem({ payment, onRefund }: { payment: Payment; onRefund: () => void }) {
  const isRefundPayment = payment.amount < 0;
  
  return (
    <div className="flex gap-3 group hover:bg-muted/50 -mx-2 px-2 py-2 rounded-lg transition-colors">
      <div className={`p-1.5 rounded-full shrink-0 ${
        isRefundPayment 
          ? 'bg-warning/10 text-warning' 
          : 'bg-success/10 text-success'
      }`}>
        {isRefundPayment ? (
          <RotateCcw className="h-3 w-3" />
        ) : (
          <CreditCard className="h-3 w-3" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate">
            {isRefundPayment ? 'Возврат' : 'Оплата'}
          </p>
          <span className={`text-sm font-semibold ${
            isRefundPayment ? 'text-warning' : 'text-success'
          }`}>
            {isRefundPayment ? '' : '+'}{formatCurrency(payment.amount)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <Clock className="h-3 w-3" />
          {payment.created_at 
            ? format(new Date(payment.created_at), 'd MMM yyyy, HH:mm', { locale: ru })
            : '—'}
          <span>•</span>
          {PAYMENT_METHOD_LABELS[payment.payment_method || 'cash'] || payment.payment_method}
        </div>
        {payment.notes && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {payment.notes}
          </p>
        )}
        {payment.is_fiscalized && (
          <Badge variant="outline" className="text-xs mt-1 gap-1">
            Фискализирован
            {payment.fiscal_check_url && (
              <a href={payment.fiscal_check_url} target="_blank" rel="noopener noreferrer" 
                 className="text-primary hover:underline"
                 onClick={(e) => e.stopPropagation()}>
                Чек
              </a>
            )}
          </Badge>
        )}
      </div>
      {!isRefundPayment && payment.amount > 0 && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 self-center"
          onClick={(e) => {
            e.stopPropagation();
            onRefund();
          }}
          title="Возврат"
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
