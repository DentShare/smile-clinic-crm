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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { usePatientFinance } from '@/hooks/use-patient-finance';
import { toast } from 'sonner';
import {
  Loader2,
  CheckCircle2,
  FileText,
  AlertCircle,
  Plus,
  ChevronDown,
  X,
  ClipboardList
} from 'lucide-react';
import { PaymentDialog } from '@/components/finance/PaymentDialog';
import type { Service } from '@/types/database';

interface SelectedService {
  id: string; // unique key for UI
  service_id: string;
  service_name: string;
  price: number;
  quantity: number;
  tooth_number?: number | null;
  fromPlan?: boolean;
  treatment_plan_item_id?: string;
}

interface TreatmentPlanItem {
  id: string;
  service_name: string;
  tooth_number?: number | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_completed: boolean;
  service_id?: string;
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
  const { fetchSummary, summary } = usePatientFinance(patientId);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [notes, setNotes] = useState('');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [completedAmount, setCompletedAmount] = useState(0);
  
  // Treatment plan state
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [showPlanSection, setShowPlanSection] = useState(false);
  const [selectedPlanItems, setSelectedPlanItems] = useState<string[]>([]);

  // Additional service selection
  const [selectedNewService, setSelectedNewService] = useState('');

  useEffect(() => {
    if (open && patientId && clinic) {
      fetchAppointmentService();
      fetchServices();
      fetchPlans();
      fetchSummary();
    }
  }, [open, patientId, clinic]);

  // Fetch the service that was scheduled with the appointment
  const fetchAppointmentService = async () => {
    if (!clinic) return;
    setLoading(true);

    try {
      const { data: appointment, error } = await supabase
        .from('appointments')
        .select('service_id, complaints')
        .eq('id', appointmentId)
        .single();

      if (error) throw error;

      const initialServices: SelectedService[] = [];

      // If there's a linked service
      if (appointment?.service_id) {
        const { data: service } = await supabase
          .from('services')
          .select('*')
          .eq('id', appointment.service_id)
          .single();

        if (service) {
          initialServices.push({
            id: `scheduled-${service.id}`,
            service_id: service.id,
            service_name: service.name,
            price: Number(service.price),
            quantity: 1,
            fromPlan: false
          });
        }
      }

      setSelectedServices(initialServices);
    } catch (error) {
      console.error('Error fetching appointment:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    if (!clinic) return;

    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('clinic_id', clinic.id)
      .eq('is_active', true)
      .order('name');

    if (data) setServices(data as Service[]);
  };

  const fetchPlans = async () => {
    if (!clinic) return;

    try {
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
                .select('id, service_name, service_id, tooth_number, quantity, unit_price, total_price, is_completed')
                .eq('stage_id', stage.id)
                .eq('is_completed', false)
                .order('created_at', { ascending: true });

              return { ...stage, items: itemsData || [] };
            })
          );

          const filteredStages = stagesWithItems.filter(s => s.items.length > 0);
          return { ...plan, stages: filteredStages };
        })
      );

      setPlans(plansWithDetails.filter(p => p.stages.length > 0));
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const handleAddService = () => {
    if (!selectedNewService) return;
    
    const service = services.find(s => s.id === selectedNewService);
    if (!service) return;

    // Check if already added
    if (selectedServices.some(s => s.service_id === service.id && !s.fromPlan)) {
      toast.error('Услуга уже добавлена');
      return;
    }

    setSelectedServices(prev => [...prev, {
      id: `manual-${service.id}-${Date.now()}`,
      service_id: service.id,
      service_name: service.name,
      price: Number(service.price),
      quantity: 1,
      fromPlan: false
    }]);
    setSelectedNewService('');
  };

  const handleRemoveService = (id: string) => {
    setSelectedServices(prev => prev.filter(s => s.id !== id));
  };

  const handleTogglePlanItem = (item: TreatmentPlanItem) => {
    const itemKey = `plan-${item.id}`;
    
    if (selectedPlanItems.includes(item.id)) {
      // Remove from plan items and selected services
      setSelectedPlanItems(prev => prev.filter(id => id !== item.id));
      setSelectedServices(prev => prev.filter(s => s.treatment_plan_item_id !== item.id));
    } else {
      // Add to plan items and selected services
      setSelectedPlanItems(prev => [...prev, item.id]);
      setSelectedServices(prev => [...prev, {
        id: itemKey,
        service_id: item.service_id || '',
        service_name: item.service_name,
        price: item.unit_price,
        quantity: item.quantity,
        tooth_number: item.tooth_number,
        fromPlan: true,
        treatment_plan_item_id: item.id
      }]);
    }
  };

  const getTotal = () => {
    return selectedServices.reduce((sum, s) => sum + (s.price * s.quantity), 0);
  };

  const handleComplete = async () => {
    if (selectedServices.length === 0) {
      toast.error('Добавьте хотя бы одну услугу');
      return;
    }

    setSaving(true);

    try {
      const currentDoctorId = doctorId || profile?.id;
      if (!currentDoctorId || !clinic) {
        throw new Error('Не найден ID врача');
      }

      // Separate plan items and manual services
      const planItemIds = selectedServices
        .filter(s => s.treatment_plan_item_id)
        .map(s => s.treatment_plan_item_id!);
      
      const manualServices = selectedServices.filter(s => !s.treatment_plan_item_id);

      let totalAmount = 0;

      // Complete plan items via RPC
      if (planItemIds.length > 0) {
        const { data: rpcResult, error: rpcError } = await supabase.rpc(
          'complete_treatment_services',
          {
            p_appointment_id: appointmentId,
            p_doctor_id: currentDoctorId,
            p_item_ids: planItemIds
          }
        );

        if (rpcError) throw rpcError;
        const result = rpcResult as { success: boolean; total_amount?: number };
        totalAmount += result.total_amount || 0;
      }

      // Insert manual performed_works
      if (manualServices.length > 0) {
        // Get patient_id from appointment
        const { data: appt } = await supabase
          .from('appointments')
          .select('patient_id')
          .eq('id', appointmentId)
          .single();

        const performedWorks = manualServices.map(s => ({
          clinic_id: clinic.id,
          appointment_id: appointmentId,
          patient_id: appt?.patient_id || patientId,
          doctor_id: currentDoctorId,
          service_id: s.service_id || null,
          tooth_number: s.tooth_number || null,
          quantity: s.quantity,
          price: s.price,
          total: s.price * s.quantity,
          discount_percent: 0
        }));

        const { error: insertError } = await supabase
          .from('performed_works')
          .insert(performedWorks);

        if (insertError) throw insertError;

        const manualTotal = manualServices.reduce((sum, s) => sum + (s.price * s.quantity), 0);
        totalAmount += manualTotal;

        // Update patient balance
        await supabase.rpc('calculate_patient_balance', { p_patient_id: patientId });
      }

      setCompletedAmount(totalAmount);

      // Update appointment status
      await supabase
        .from('appointments')
        .update({ 
          status: 'completed',
          doctor_notes: notes || undefined
        })
        .eq('id', appointmentId);

      toast.success(`Визит завершён. Сумма: ${totalAmount.toLocaleString('ru-RU')} сум`);
      
      // Offer to accept payment
      setPaymentDialogOpen(true);
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

  const total = getTotal();

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
          ) : (
            <ScrollArea className="max-h-[400px] pr-4">
              <div className="space-y-4">
                {/* Selected Services List */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Оказанные услуги</Label>
                  
                  {selectedServices.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm border border-dashed rounded-lg">
                      Добавьте услуги для завершения визита
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedServices.map((service) => (
                        <div 
                          key={service.id} 
                          className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                            <div className="min-w-0">
                              <span className="text-sm truncate block">{service.service_name}</span>
                              {service.tooth_number && (
                                <span className="text-xs text-muted-foreground">зуб {service.tooth_number}</span>
                              )}
                              {service.fromPlan && (
                                <Badge variant="outline" className="ml-1 text-xs">Из плана</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <CurrencyDisplay amount={service.price * service.quantity} size="sm" />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleRemoveService(service.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Service */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Добавить услугу</Label>
                  <div className="flex gap-2">
                    <Select value={selectedNewService} onValueChange={setSelectedNewService}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Выберите услугу..." />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            <div className="flex justify-between items-center gap-4">
                              <span>{service.name}</span>
                              <span className="text-muted-foreground text-xs">
                                {Number(service.price).toLocaleString('ru-RU')} сум
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      size="icon" 
                      onClick={handleAddService}
                      disabled={!selectedNewService}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Treatment Plan Section */}
                {plans.length > 0 && (
                  <Collapsible open={showPlanSection} onOpenChange={setShowPlanSection}>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        <div className="flex items-center gap-2">
                          <ClipboardList className="h-4 w-4" />
                          Добавить из плана лечения
                        </div>
                        <ChevronDown className={`h-4 w-4 transition-transform ${showPlanSection ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3 space-y-3">
                      {plans.map(plan => (
                        <div key={plan.id} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="font-medium text-sm">{plan.title}</span>
                            <Badge variant={plan.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                              {plan.status === 'active' ? 'Активный' : 'Черновик'}
                            </Badge>
                          </div>

                          {plan.stages.map(stage => (
                            <div key={stage.id} className="ml-4 space-y-1">
                              <p className="text-xs text-muted-foreground font-medium">
                                Этап {stage.stage_number}: {stage.title}
                              </p>
                              <div className="space-y-1">
                                {stage.items.map(item => (
                                  <label
                                    key={item.id}
                                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Checkbox 
                                        checked={selectedPlanItems.includes(item.id)}
                                        onCheckedChange={() => handleTogglePlanItem(item)}
                                      />
                                      <div>
                                        <span className="text-sm">{item.service_name}</span>
                                        {item.tooth_number && (
                                          <span className="text-xs text-muted-foreground ml-1">
                                            (зуб {item.tooth_number})
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <CurrencyDisplay amount={item.total_price} size="sm" />
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}

                <Separator />

                {/* Notes */}
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
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Услуг: {selectedServices.length}</p>
              {summary && summary.current_debt > 0 && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" />
                  Текущий долг: <CurrencyDisplay amount={summary.current_debt} size="sm" />
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Итого:</p>
              <CurrencyDisplay amount={total} size="lg" className="font-bold" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleComplete}
              disabled={saving || selectedServices.length === 0}
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
        onPaymentComplete={handlePaymentComplete}
      />
    </>
  );
}