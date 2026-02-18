import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { usePatientFinance, type UnpaidWork } from '@/hooks/use-patient-finance';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { PAYMENT_METHOD_LABELS } from '@/lib/payment-methods';
import { Loader2, Gift, Wallet, Plus, X, FileText, CalendarDays, AlertCircle, Percent, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  currentDebt: number;
  onPaymentComplete?: () => void;
  onCreateVisit?: () => void;
}

const PAYMENT_METHODS = ['cash', 'uzcard', 'humo', 'visa', 'mastercard', 'click', 'payme', 'transfer'];

type PaymentMode = 'services' | 'advance';

interface PaymentLine {
  id: string;
  method: string;
  amount: string;
}

export function PaymentDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
  currentDebt,
  onPaymentComplete,
  onCreateVisit,
}: PaymentDialogProps) {
  const { clinic, profile } = useAuth();
  const [lines, setLines] = useState<PaymentLine[]>([
    { id: crypto.randomUUID(), method: 'cash', amount: '' }
  ]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentIdempotencyKey, setCurrentIdempotencyKey] = useState<string>(() => crypto.randomUUID());
  const { fetchUnpaidWorks, allocatePayment } = usePatientFinance(patientId);

  // Payment mode
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('services');
  const [unpaidWorks, setUnpaidWorks] = useState<UnpaidWork[]>([]);
  const [selectedWorkIds, setSelectedWorkIds] = useState<Set<string>>(new Set());
  const [loadingWorks, setLoadingWorks] = useState(false);

  // Bonus, deposit & advance balances
  const [bonusBalance, setBonusBalance] = useState(0);
  const [depositBalance, setDepositBalance] = useState(0);
  const [advanceBalance, setAdvanceBalance] = useState(0);
  const [discountCardInfo, setDiscountCardInfo] = useState<{ card_number: string; discount_percent: number } | null>(null);
  const [loadingBalances, setLoadingBalances] = useState(false);

  // Discounts
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [workDiscounts, setWorkDiscounts] = useState<Record<string, number>>({});
  const [showDiscounts, setShowDiscounts] = useState(false);

  useEffect(() => {
    if (open && patientId && clinic?.id) {
      fetchBalances();
      loadUnpaidWorks();
      // Reset discounts
      setGlobalDiscount(0);
      setWorkDiscounts({});
      setShowDiscounts(false);
    }
  }, [open, patientId, clinic?.id]);

  const loadUnpaidWorks = async () => {
    setLoadingWorks(true);
    const works = await fetchUnpaidWorks();
    setUnpaidWorks(works);
    setSelectedWorkIds(new Set(works.map(w => w.id)));
    setPaymentMode(works.length > 0 ? 'services' : 'advance');
    setLoadingWorks(false);
  };

  const fetchBalances = async () => {
    if (!clinic?.id) return;
    setLoadingBalances(true);
    const [loyaltyRes, depositRes, cardRes, paymentsRes] = await Promise.all([
      supabase.from('patient_loyalty').select('bonus_balance').eq('patient_id', patientId).eq('clinic_id', clinic.id).maybeSingle(),
      supabase.from('patient_deposits').select('balance').eq('patient_id', patientId).eq('clinic_id', clinic.id).maybeSingle(),
      supabase.from('discount_cards')
        .select('card_number, discount_percent')
        .eq('patient_id', patientId).eq('clinic_id', clinic.id).eq('is_active', true)
        .or(`valid_until.is.null,valid_until.gte.${new Date().toISOString().split('T')[0]}`)
        .limit(1).maybeSingle(),
      // Get payments with their allocated amounts to calculate real unallocated advance
      supabase.from('payments')
        .select('id, amount, payment_allocations(amount)')
        .eq('patient_id', patientId).eq('clinic_id', clinic.id),
    ]);
    setBonusBalance(loyaltyRes.data?.bonus_balance || 0);
    setDepositBalance(depositRes.data?.balance || 0);
    // Advance = SUM of unallocated amounts per payment
    const payments = paymentsRes.data || [];
    let totalUnallocated = 0;
    for (const p of payments) {
      const paid = Number(p.amount);
      const allocated = ((p as any).payment_allocations || []).reduce(
        (s: number, a: any) => s + Number(a.amount), 0
      );
      totalUnallocated += Math.max(0, paid - allocated);
    }
    setAdvanceBalance(totalUnallocated);
    const card = cardRes.data || null;
    setDiscountCardInfo(card);
    // Auto-apply discount card as global discount
    if (card && card.discount_percent > 0) {
      setGlobalDiscount(card.discount_percent);
      setShowDiscounts(true);
    }
    setLoadingBalances(false);
  };

  const addLine = () => {
    setLines(prev => [...prev, { id: crypto.randomUUID(), method: 'cash', amount: '' }]);
  };

  const removeLine = (id: string) => {
    if (lines.length <= 1) return;
    setLines(prev => prev.filter(l => l.id !== id));
  };

  const updateLine = (id: string, field: 'method' | 'amount', value: string) => {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      if (field === 'method') {
        let newAmount = l.amount;
        // Auto-cap amount when switching to bonus/deposit/advance
        if (value === 'bonus' || value === 'deposit' || value === 'advance_balance') {
          const currentAmt = parseAmount(l.amount);
          const totalBalance = value === 'bonus' ? bonusBalance : value === 'deposit' ? depositBalance : advanceBalance;
          const usedInOthers = prev
            .filter(ol => ol.method === value && ol.id !== id)
            .reduce((s, ol) => s + parseAmount(ol.amount), 0);
          const available = Math.max(0, totalBalance - usedInOthers);
          if (currentAmt > available) {
            newAmount = available > 0 ? available.toString() : '';
          }
        }
        return { ...l, method: value, amount: newAmount };
      }
      return { ...l, [field]: value };
    }));
  };

  const parseAmount = (str: string) => {
    const num = parseFloat(str.replace(/\s/g, '').replace(',', '.'));
    if (isNaN(num)) return 0;
    if (num <= 0) return 0;
    if (num > 100000000) return 0;
    return Math.round(num * 100) / 100;
  };

  const totalAmount = lines.reduce((sum, l) => sum + parseAmount(l.amount), 0);

  // Calculate discounted amount for a work
  const getWorkDiscountedAmount = (work: UnpaidWork) => {
    const perServiceDiscount = workDiscounts[work.id] || 0;
    // Apply per-service discount first, then global
    const afterServiceDiscount = work.remaining * (1 - perServiceDiscount / 100);
    const afterGlobalDiscount = afterServiceDiscount * (1 - globalDiscount / 100);
    return Math.round(afterGlobalDiscount);
  };

  // Selected works total with discounts
  const selectedWorksTotal = useMemo(() => {
    return unpaidWorks
      .filter(w => selectedWorkIds.has(w.id))
      .reduce((sum, w) => sum + getWorkDiscountedAmount(w), 0);
  }, [unpaidWorks, selectedWorkIds, workDiscounts, globalDiscount]);

  // Original total without discounts for comparison
  const selectedWorksOriginal = useMemo(() => {
    return unpaidWorks
      .filter(w => selectedWorkIds.has(w.id))
      .reduce((sum, w) => sum + w.remaining, 0);
  }, [unpaidWorks, selectedWorkIds]);

  const totalSavings = selectedWorksOriginal - selectedWorksTotal;

  const toggleWork = (workId: string) => {
    setSelectedWorkIds(prev => {
      const next = new Set(prev);
      if (next.has(workId)) {
        next.delete(workId);
      } else {
        next.add(workId);
      }
      return next;
    });
  };

  const updateWorkDiscount = (workId: string, discount: number) => {
    setWorkDiscounts(prev => ({ ...prev, [workId]: Math.max(0, Math.min(100, discount)) }));
  };

  // Auto-fill amount when selecting works or changing discounts in services mode
  useEffect(() => {
    if (paymentMode === 'services' && selectedWorkIds.size > 0) {
      if (selectedWorksTotal > 0 && lines.length === 1) {
        let autoAmount = selectedWorksTotal;
        // Cap to available balance for bonus/deposit/advance
        if (lines[0].method === 'bonus') {
          autoAmount = Math.min(autoAmount, bonusBalance);
        } else if (lines[0].method === 'deposit') {
          autoAmount = Math.min(autoAmount, depositBalance);
        } else if (lines[0].method === 'advance_balance') {
          autoAmount = Math.min(autoAmount, advanceBalance);
        }
        setLines([{ id: lines[0].id, method: lines[0].method, amount: autoAmount.toString() }]);
      }
    }
  }, [selectedWorkIds, paymentMode, selectedWorksTotal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    if (totalAmount <= 0) return;

    if (totalAmount > 100000000) {
      toast.error('Сумма платежа превышает максимально допустимую (100,000,000)');
      return;
    }

    // Validate bonus/deposit/advance totals across ALL lines
    const totalAdvanceUsed = lines
      .filter(l => l.method === 'advance_balance')
      .reduce((sum, l) => sum + parseAmount(l.amount), 0);
    if (totalAdvanceUsed > advanceBalance) {
      toast.error(`Сумма из аванса (${totalAdvanceUsed.toLocaleString('ru-RU')}) превышает доступный аванс (${advanceBalance.toLocaleString('ru-RU')})`);
      return;
    }
    const totalBonusUsed = lines
      .filter(l => l.method === 'bonus')
      .reduce((sum, l) => sum + parseAmount(l.amount), 0);
    if (totalBonusUsed > bonusBalance) {
      toast.error(`Сумма бонусов (${totalBonusUsed.toLocaleString('ru-RU')}) превышает доступный баланс (${bonusBalance.toLocaleString('ru-RU')})`);
      return;
    }
    const totalDepositUsed = lines
      .filter(l => l.method === 'deposit')
      .reduce((sum, l) => sum + parseAmount(l.amount), 0);
    if (totalDepositUsed > depositBalance) {
      toast.error(`Сумма с депозита (${totalDepositUsed.toLocaleString('ru-RU')}) превышает доступный баланс (${depositBalance.toLocaleString('ru-RU')})`);
      return;
    }

    setLoading(true);
    const createdPaymentIds: string[] = [];

    // Build discount notes for the payment
    const discountNotes: string[] = [];
    if (globalDiscount > 0) discountNotes.push(`скидка ${globalDiscount}%`);
    if (discountCardInfo && globalDiscount === discountCardInfo.discount_percent) {
      discountNotes.push(`карта ${discountCardInfo.card_number}`);
    }
    const hasPerServiceDiscounts = Object.values(workDiscounts).some(d => d > 0);
    if (hasPerServiceDiscounts) discountNotes.push('инд. скидки на услуги');
    const discountNote = discountNotes.length > 0 ? ` (${discountNotes.join(', ')})` : '';
    const fullNotes = (notes || '') + discountNote;

    try {
      // Separate advance lines from other payment lines
      const advanceLines = lines.filter(l => l.method === 'advance_balance' && parseAmount(l.amount) > 0);
      const paymentLines = lines.filter(l => l.method !== 'advance_balance' && parseAmount(l.amount) > 0);

      // Process regular payment lines (create new payments)
      for (const line of paymentLines) {
        const amt = parseAmount(line.amount);
        if (amt <= 0) continue;

        if (line.method === 'bonus') {
          const { data, error } = await supabase.rpc('process_bonus_payment', {
            p_clinic_id: clinic!.id,
            p_patient_id: patientId,
            p_amount: amt,
            p_deducted_by: profile?.id || null,
          });
          if (error) throw new Error(`Ошибка списания бонусов: ${error.message}`);
          const result = data as unknown as { success: boolean; error?: string; payment_id?: string; new_balance?: number };
          if (!result.success) throw new Error(result.error || 'Ошибка списания бонусов');
          if (result.payment_id) createdPaymentIds.push(result.payment_id);
          if (typeof result.new_balance === 'number') setBonusBalance(result.new_balance);
        } else if (line.method === 'deposit') {
          const { data, error } = await supabase.rpc('process_deposit_payment', {
            p_clinic_id: clinic!.id,
            p_patient_id: patientId,
            p_amount: amt,
            p_deducted_by: profile?.id || null,
          });
          if (error) throw new Error(`Ошибка списания с депозита: ${error.message}`);
          const result = data as unknown as { success: boolean; error?: string; payment_id?: string; new_balance?: number };
          if (!result.success) throw new Error(result.error || 'Ошибка списания с депозита');
          if (result.payment_id) createdPaymentIds.push(result.payment_id);
          if (typeof result.new_balance === 'number') setDepositBalance(result.new_balance);
        } else {
          const lineIdempotencyKey = `${currentIdempotencyKey}-${line.id}`;
          const { data, error } = await supabase.rpc('process_patient_payment', {
            p_clinic_id: clinic!.id,
            p_patient_id: patientId,
            p_amount: amt,
            p_method: line.method,
            p_processed_by: profile?.id || null,
            p_notes: fullNotes || null,
            p_idempotency_key: lineIdempotencyKey,
            p_ip_address: null,
            p_user_agent: navigator?.userAgent || null,
          });

          if (error) throw new Error(`Ошибка обработки платежа: ${error.message}`);
          const result = data as unknown as { success: boolean; error?: string; payment_id?: string };
          if (!result.success) throw new Error(result.error || 'Ошибка оплаты');

          if (result.payment_id) {
            createdPaymentIds.push(result.payment_id);
          }
        }
      }

      // Allocate new payments to services if in services mode
      if (paymentMode === 'services' && selectedWorkIds.size > 0 && createdPaymentIds.length > 0) {
        const selectedWorks = unpaidWorks.filter(w => selectedWorkIds.has(w.id));
        let remainingPayment = paymentLines.reduce((s, l) => s + parseAmount(l.amount), 0);

        for (const paymentId of createdPaymentIds) {
          const allocations: { performed_work_id: string; amount: number }[] = [];

          for (const work of selectedWorks) {
            if (remainingPayment <= 0) break;
            const discountedAmount = getWorkDiscountedAmount(work);
            const allocAmount = Math.min(discountedAmount, remainingPayment);
            allocations.push({ performed_work_id: work.id, amount: allocAmount });
            remainingPayment -= allocAmount;
          }

          if (allocations.length > 0) {
            await allocatePayment(clinic!.id, paymentId, allocations);
          }
        }
      }

      // Process advance lines — allocate existing unallocated payments to works
      if (advanceLines.length > 0 && paymentMode === 'services' && selectedWorkIds.size > 0) {
        const advanceTotal = advanceLines.reduce((s, l) => s + parseAmount(l.amount), 0);
        const selectedWorks = unpaidWorks.filter(w => selectedWorkIds.has(w.id));
        let remaining = advanceTotal;
        const advanceAllocations: { performed_work_id: string; amount: number }[] = [];

        for (const work of selectedWorks) {
          if (remaining <= 0) break;
          const discountedAmount = getWorkDiscountedAmount(work);
          const allocAmount = Math.min(discountedAmount, remaining);
          advanceAllocations.push({ performed_work_id: work.id, amount: allocAmount });
          remaining -= allocAmount;
        }

        if (advanceAllocations.length > 0) {
          const { data, error } = await supabase.rpc('allocate_advance_to_works', {
            p_clinic_id: clinic!.id,
            p_patient_id: patientId,
            p_allocations: advanceAllocations as any,
          });
          if (error) throw new Error(`Ошибка распределения аванса: ${error.message}`);
          const result = data as unknown as { success: boolean; error?: string; total_allocated?: number };
          if (!result.success) throw new Error(result.error || 'Ошибка распределения аванса');
          toast.success(`Из аванса распределено: ${(result.total_allocated || advanceTotal).toLocaleString('ru-RU')} сум`);
        }
      }

      // Show success toast for regular payments
      const regularTotal = paymentLines.reduce((s, l) => s + parseAmount(l.amount), 0);
      if (regularTotal > 0) {
        toast.success(`Оплата принята: ${regularTotal.toLocaleString('ru-RU')} сум`);
      }

      // Reset form
      setLines([{ id: crypto.randomUUID(), method: 'cash', amount: '' }]);
      setNotes('');
      setSelectedWorkIds(new Set());
      setGlobalDiscount(0);
      setWorkDiscounts({});
      await fetchBalances();
      onOpenChange(false);
      onPaymentComplete?.();
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      console.error('[PaymentDialog] Payment error:', errorMsg);
      toast.error(errorMsg, { duration: 10000 });
      setCurrentIdempotencyKey(crypto.randomUUID());
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setLines([{ id: crypto.randomUUID(), method: 'cash', amount: '' }]);
      setNotes('');
      setSelectedWorkIds(new Set());
      setGlobalDiscount(0);
      setWorkDiscounts({});
      onOpenChange(false);
    }
  };

  const allMethods = [
    ...PAYMENT_METHODS,
    ...(advanceBalance > 0 && paymentMode === 'services' ? ['advance_balance'] : []),
    ...(bonusBalance > 0 ? ['bonus'] : []),
    ...(depositBalance > 0 ? ['deposit'] : []),
  ];

  const getMethodLabel = (m: string, forLineId?: string) => {
    if (m === 'advance_balance') {
      const usedInOthers = forLineId
        ? lines.filter(l => l.method === 'advance_balance' && l.id !== forLineId).reduce((s, l) => s + parseAmount(l.amount), 0)
        : 0;
      const available = Math.max(0, advanceBalance - usedInOthers);
      return `Аванс (${available.toLocaleString('ru-RU')})`;
    }
    if (m === 'bonus') {
      const usedInOthers = forLineId
        ? lines.filter(l => l.method === 'bonus' && l.id !== forLineId).reduce((s, l) => s + parseAmount(l.amount), 0)
        : 0;
      const available = Math.max(0, bonusBalance - usedInOthers);
      return `Бонусы (${available.toLocaleString('ru-RU')})`;
    }
    if (m === 'deposit') {
      const usedInOthers = forLineId
        ? lines.filter(l => l.method === 'deposit' && l.id !== forLineId).reduce((s, l) => s + parseAmount(l.amount), 0)
        : 0;
      const available = Math.max(0, depositBalance - usedInOthers);
      return `Депозит (${available.toLocaleString('ru-RU')})`;
    }
    return PAYMENT_METHOD_LABELS[m] ?? m;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Принять оплату</DialogTitle>
          <DialogDescription>
            Пациент: {patientName}
            {currentDebt > 0 && (
              <span className="block mt-1 text-destructive">
                Задолженность: {currentDebt.toLocaleString('ru-RU')} сум
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden gap-3">
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {/* Quick balance info */}
        {!loadingBalances && (advanceBalance > 0 || bonusBalance > 0 || depositBalance > 0 || discountCardInfo) && (
          <div className="flex gap-2 flex-wrap">
            {discountCardInfo && (
              <Badge
                variant={globalDiscount === discountCardInfo.discount_percent ? 'default' : 'outline'}
                className="gap-1 cursor-pointer"
                onClick={() => {
                  if (globalDiscount === discountCardInfo.discount_percent) {
                    setGlobalDiscount(0);
                  } else {
                    setGlobalDiscount(discountCardInfo.discount_percent);
                    setShowDiscounts(true);
                  }
                }}
              >
                <Percent className="h-3 w-3" />
                Карта {discountCardInfo.card_number}: −{discountCardInfo.discount_percent}%
              </Badge>
            )}
            {advanceBalance > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Banknote className="h-3 w-3" />
                Аванс: <CurrencyDisplay amount={advanceBalance} size="sm" />
              </Badge>
            )}
            {bonusBalance > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Gift className="h-3 w-3" />
                Бонусы: <CurrencyDisplay amount={bonusBalance} size="sm" />
              </Badge>
            )}
            {depositBalance > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Wallet className="h-3 w-3" />
                Депозит: <CurrencyDisplay amount={depositBalance} size="sm" />
              </Badge>
            )}
          </div>
        )}

        {/* Payment mode toggle */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={paymentMode === 'services' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPaymentMode('services')}
            disabled={loading}
            className="flex-1"
          >
            <FileText className="h-4 w-4 mr-1" />
            Закрыть услуги
            {unpaidWorks.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">{unpaidWorks.length}</Badge>
            )}
          </Button>
          <Button
            type="button"
            variant={paymentMode === 'advance' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPaymentMode('advance')}
            disabled={loading}
            className="flex-1"
          >
            <Wallet className="h-4 w-4 mr-1" />
            Аванс
          </Button>
        </div>

        {/* Unpaid services list (services mode) */}
        {paymentMode === 'services' && (
          <div className="space-y-2">
            {loadingWorks ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : unpaidWorks.length === 0 ? (
              <div className="text-center py-4 space-y-3 border border-dashed rounded-lg">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
                <div>
                  <p className="text-sm font-medium">Все услуги оплачены</p>
                  <p className="text-xs text-muted-foreground">Можно внести аванс или создать визит с услугой</p>
                </div>
                {onCreateVisit && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleClose();
                      onCreateVisit();
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Создать визит
                  </Button>
                )}
              </div>
            ) : (
              <ScrollArea className="max-h-[220px]">
                <div className="space-y-1">
                  {unpaidWorks.map((work) => {
                    const perDiscount = workDiscounts[work.id] || 0;
                    const discountedAmt = getWorkDiscountedAmount(work);
                    const hasDiscount = perDiscount > 0 || globalDiscount > 0;
                    return (
                      <div key={work.id} className="rounded-lg hover:bg-muted/50 transition-colors">
                        <label className="flex items-center gap-3 p-2 cursor-pointer">
                          <Checkbox
                            checked={selectedWorkIds.has(work.id)}
                            onCheckedChange={() => toggleWork(work.id)}
                            disabled={loading}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium truncate">{work.service_name}</span>
                              {work.tooth_number && (
                                <Badge variant="outline" className="text-xs shrink-0">
                                  зуб {work.tooth_number}
                                </Badge>
                              )}
                            </div>
                            {work.visit_date && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />
                                {format(new Date(work.visit_date), 'd MMM yyyy', { locale: ru })}
                              </span>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            {hasDiscount ? (
                              <>
                                <span className="text-xs text-muted-foreground line-through">
                                  {work.remaining.toLocaleString('ru-RU')}
                                </span>
                                <CurrencyDisplay amount={discountedAmt} size="sm" className="font-medium text-primary" />
                              </>
                            ) : (
                              <CurrencyDisplay amount={work.remaining} size="sm" className="font-medium" />
                            )}
                          </div>
                        </label>
                        {/* Per-service discount inline */}
                        {showDiscounts && selectedWorkIds.has(work.id) && (
                          <div className="flex items-center gap-2 px-2 pb-2 pl-9">
                            <span className="text-xs text-muted-foreground">Скидка:</span>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={perDiscount || ''}
                              onChange={(e) => updateWorkDiscount(work.id, parseInt(e.target.value) || 0)}
                              className="h-6 w-16 text-xs px-1.5"
                              placeholder="0"
                              disabled={loading}
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            {/* Discount controls */}
            {unpaidWorks.length > 0 && (
              <div className="space-y-2">
                {/* Toggle discounts + global discount */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={showDiscounts ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setShowDiscounts(!showDiscounts)}
                  >
                    <Percent className="h-3 w-3" />
                    Скидки
                  </Button>
                  {showDiscounts && (
                    <div className="flex items-center gap-1.5 flex-1">
                      <span className="text-xs text-muted-foreground">Общая:</span>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={globalDiscount || ''}
                        onChange={(e) => setGlobalDiscount(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                        className="h-7 w-16 text-xs px-1.5"
                        placeholder="0"
                        disabled={loading}
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                      {discountCardInfo && globalDiscount !== discountCardInfo.discount_percent && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={() => setGlobalDiscount(discountCardInfo.discount_percent)}
                        >
                          Карта {discountCardInfo.discount_percent}%
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Summary row */}
                {selectedWorkIds.size > 0 && (
                  <div className="flex items-center justify-between text-sm px-2">
                    <span className="text-muted-foreground">
                      Выбрано: {selectedWorkIds.size} из {unpaidWorks.length}
                      {totalSavings > 0 && (
                        <span className="text-primary ml-1">(−{totalSavings.toLocaleString('ru-RU')})</span>
                      )}
                    </span>
                    <CurrencyDisplay amount={selectedWorksTotal} size="sm" className="font-semibold" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

          {/* Payment lines */}
          <div className="space-y-2">
            <Label>Способы оплаты</Label>
            {lines.map((line) => (
              <div key={line.id} className="flex gap-2 items-center">
                <Select value={line.method} onValueChange={v => updateLine(line.id, 'method', v)} disabled={loading}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allMethods.map(m => (
                      <SelectItem key={m} value={m}>{getMethodLabel(m, line.id)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="text"
                  placeholder="Сумма"
                  value={line.amount}
                  onChange={(e) => updateLine(line.id, 'amount', e.target.value.replace(/[^\d\s,]/g, ''))}
                  disabled={loading}
                  className="flex-1"
                />
                {lines.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(line.id)} disabled={loading}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addLine} disabled={loading}>
              <Plus className="h-3 w-3 mr-1" />Разделить оплату
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Примечание</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Комментарий к оплате"
              disabled={loading}
            />
          </div>
        </div>{/* end scrollable area */}

          <Separator className="shrink-0" />

          <div className="flex items-center justify-between shrink-0">
            <span className="text-sm text-muted-foreground">Итого:</span>
            <CurrencyDisplay amount={totalAmount} size="lg" className="font-bold" />
          </div>

          <DialogFooter className="shrink-0">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading || totalAmount <= 0}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Принять'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
