import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { usePatientFinance } from '@/hooks/use-patient-finance';
import { toast } from 'sonner';
import {
  Loader2,
  CheckCircle2,
  FileText,
  AlertCircle
} from 'lucide-react';
import { PaymentDialog } from '@/components/finance/PaymentDialog';

interface TreatmentPlanItem {
  id: string;
  service_name: string;
  tooth_number?: number | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_completed: boolean;
}

interface TreatmentStage {
  id: string;
  title: string;
  stage_number: number;
  status: string;
  items: TreatmentPlanItem[];
}

interface TreatmentPlan {
  id: string;
  title: string;
  status: string;
  stages: TreatmentStage[];
}

interface CompleteVisitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  patientId: string;
  patientName: string;
  doctorId?: string;
  onComplete?: () => void;
}

export function CompleteVisitDialog({
  open,
  onOpenChange,
  appointmentId,
  patientId,
  patientName,
  doctorId,
  onComplete
}: CompleteVisitDialogProps) {
  const { clinic, profile } = useAuth();
  const { completeServices, fetchSummary, summary } = usePatientFinance(patientId);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [completedAmount, setCompletedAmount] = useState(0);

  useEffect(() => {
    if (open && patientId && clinic) {
      fetchPlans();
      fetchSummary();
    }
  }, [open, patientId, clinic]);

  const fetchPlans = async () => {
    if (!clinic) return;
    setLoading(true);

    try {
      // Fetch active treatment plans with stages and items
      const { data: plansData, error } = await supabase
        .from('treatment_plans')
        .select('id, title, status')
        .eq('patient_id', patientId)
        .eq('clinic_id', clinic.id)
        .in('status', ['active', 'draft']);

      if (error) throw error;

      const plansWithDetails = await Promise.all(
        (plansData || []).map(async (plan) => {
          const { data: stagesData } = await supabase
            .from('treatment_plan_stages')
            .select('id, title, stage_number, status')
            .eq('treatment_plan_id', plan.id)
            .order('stage_number', { ascending: true });

          const stagesWithItems = await Promise.all(
            (stagesData || []).map(async (stage) => {
              const { data: itemsData } = await supabase
                .from('treatment_plan_items')
                .select('id, service_name, tooth_number, quantity, unit_price, total_price, is_completed')
                .eq('stage_id', stage.id)
                .eq('is_completed', false)
                .order('created_at', { ascending: true });

              return { ...stage, items: itemsData || [] };
            })
          );

          // Only include stages with uncompleted items
          const filteredStages = stagesWithItems.filter(s => s.items.length > 0);
          return { ...plan, stages: filteredStages };
        })
      );

      // Only include plans with uncompleted items
      setPlans(plansWithDetails.filter(p => p.stages.length > 0));
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Ошибка загрузки планов лечения');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAllInStage = (stage: TreatmentStage) => {
    const stageItemIds = stage.items.map(i => i.id);
    const allSelected = stageItemIds.every(id => selectedItems.includes(id));
    
    if (allSelected) {
      setSelectedItems(prev => prev.filter(id => !stageItemIds.includes(id)));
    } else {
      setSelectedItems(prev => [...new Set([...prev, ...stageItemIds])]);
    }
  };

  const getSelectedTotal = () => {
    let total = 0;
    plans.forEach(plan => {
      plan.stages.forEach(stage => {
        stage.items.forEach(item => {
          if (selectedItems.includes(item.id)) {
            total += item.total_price;
          }
        });
      });
    });
    return total;
  };

  const handleComplete = async () => {
    if (selectedItems.length === 0) {
      toast.error('Выберите хотя бы одну услугу');
      return;
    }

    setSaving(true);

    try {
      const currentDoctorId = doctorId || profile?.id;
      if (!currentDoctorId) {
        throw new Error('Не найден ID врача');
      }

      const result = await completeServices(appointmentId, selectedItems, currentDoctorId);

      if (result.success) {
        setCompletedAmount(result.total_amount || getSelectedTotal());
        
        // Update appointment status
        await supabase
          .from('appointments')
          .update({ 
            status: 'completed',
            doctor_notes: notes || undefined
          })
          .eq('id', appointmentId);

        toast.success(`Визит завершён. Выполнено ${result.completed_count} услуг`);
        
        // Offer to accept payment
        setPaymentDialogOpen(true);
      }
    } catch (error) {
      console.error('Error completing visit:', error);
      toast.error('Ошибка при завершении визита');
    } finally {
      setSaving(false);
    }
  };

  const handlePaymentComplete = () => {
    setPaymentDialogOpen(false);
    onOpenChange(false);
    onComplete?.();
  };

  const handleSkipPayment = () => {
    setPaymentDialogOpen(false);
    onOpenChange(false);
    onComplete?.();
  };

  const selectedTotal = getSelectedTotal();

  return (
    <>
      <Dialog open={open && !paymentDialogOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Завершение визита
            </DialogTitle>
            <DialogDescription>
              Пациент: {patientName}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                Нет активных планов лечения с незавершёнными услугами
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Сначала создайте план лечения или добавьте услуги
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px] pr-4">
              <div className="space-y-4">
                {plans.map(plan => (
                  <div key={plan.id} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-medium">{plan.title}</span>
                      <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                        {plan.status === 'active' ? 'Активный' : 'Черновик'}
                      </Badge>
                    </div>

                    {plan.stages.map(stage => {
                      const stageItemIds = stage.items.map(i => i.id);
                      const selectedInStage = stageItemIds.filter(id => selectedItems.includes(id)).length;
                      const allSelected = selectedInStage === stageItemIds.length;

                      return (
                        <div key={stage.id} className="ml-4 space-y-2">
                          <div 
                            className="flex items-center justify-between p-2 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                            onClick={() => handleSelectAllInStage(stage)}
                          >
                            <div className="flex items-center gap-2">
                              <Checkbox 
                                checked={allSelected}
                                onCheckedChange={() => handleSelectAllInStage(stage)}
                              />
                              <span className="text-sm font-medium">
                                Этап {stage.stage_number}: {stage.title}
                              </span>
                            </div>
                            {selectedInStage > 0 && (
                              <Badge variant="outline">
                                {selectedInStage}/{stageItemIds.length}
                              </Badge>
                            )}
                          </div>

                          <div className="ml-6 space-y-1">
                            {stage.items.map(item => (
                              <label
                                key={item.id}
                                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <Checkbox 
                                    checked={selectedItems.includes(item.id)}
                                    onCheckedChange={() => handleToggleItem(item.id)}
                                  />
                                  <div>
                                    <span className="text-sm">{item.service_name}</span>
                                    {item.tooth_number && (
                                      <span className="text-xs text-muted-foreground ml-1">
                                        (зуб {item.tooth_number})
                                      </span>
                                    )}
                                    {item.quantity > 1 && (
                                      <span className="text-xs text-muted-foreground ml-1">
                                        ×{item.quantity}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <CurrencyDisplay amount={item.total_price} size="sm" />
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}

                <Separator className="my-4" />

                <div className="space-y-2">
                  <Label htmlFor="notes">Заметки врача</Label>
                  <Textarea
                    id="notes"
                    placeholder="Комментарии к визиту..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            </ScrollArea>
          )}

          {/* Summary */}
          {plans.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Выбрано услуг: {selectedItems.length}</p>
                {summary && summary.current_debt > 0 && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    Текущий долг: <CurrencyDisplay amount={summary.current_debt} size="sm" />
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Итого:</p>
                <CurrencyDisplay amount={selectedTotal} size="lg" className="font-bold" />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleComplete}
              disabled={saving || selectedItems.length === 0}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Завершить визит
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleSkipPayment();
        }}
        patientId={patientId}
        patientName={patientName}
        currentDebt={(summary?.current_debt || 0) + completedAmount}
        appointmentId={appointmentId}
        onPaymentComplete={handlePaymentComplete}
      />
    </>
  );
}
