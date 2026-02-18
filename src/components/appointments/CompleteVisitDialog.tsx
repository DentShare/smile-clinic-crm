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
import { Input } from '@/components/ui/input';
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
  ClipboardList,
  Pencil,
  Check,
  Gift,
  Ticket
} from 'lucide-react';
import { PaymentDialog } from '@/components/finance/PaymentDialog';
import { CategoryGroupedServiceSelect } from '@/components/services/CategoryGroupedServiceSelect';
import type { Service, ServiceCategory } from '@/types/database';

interface SelectedService {
  id: string; // unique key for UI
  service_id: string;
  service_name: string;
  price: number;
  quantity: number;
  discount_percent: number;
  tooth_number?: number | null;
  fromPlan?: boolean;
  treatment_plan_item_id?: string;
  isEditing?: boolean;
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
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [notes, setNotes] = useState('');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [completedAmount, setCompletedAmount] = useState(0);
  
  // Treatment plan state
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [showPlanSection, setShowPlanSection] = useState(false);
  const [selectedPlanItems, setSelectedPlanItems] = useState<string[]>([]);

  // Loyalty discount
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(0);

  // Patient packages
  const [patientPackages, setPatientPackages] = useState<any[]>([]);
  const [packageUsage, setPackageUsage] = useState<Record<string, Record<string, number>>>({});

  // Discount card
  const [discountCard, setDiscountCard] = useState<{ discount_percent: number; card_number: string } | null>(null);

  // Vouchers
  const [availableVouchers, setAvailableVouchers] = useState<any[]>([]);

  // Additional service selection
  const [selectedNewService, setSelectedNewService] = useState('');
  const [selectedNewToothNumber, setSelectedNewToothNumber] = useState<string>('');

  // Tooth numbers for selection
  const toothNumbers = [
    // Upper right (18-11)
    18, 17, 16, 15, 14, 13, 12, 11,
    // Upper left (21-28)
    21, 22, 23, 24, 25, 26, 27, 28,
    // Lower left (38-31)
    38, 37, 36, 35, 34, 33, 32, 31,
    // Lower right (41-48)
    41, 42, 43, 44, 45, 46, 47, 48
  ];

  useEffect(() => {
    if (open && patientId && clinic) {
      fetchAppointmentService();
      fetchServices();
      fetchPlans();
      fetchSummary();
      fetchLoyaltyAndPackages();
    }
  }, [open, patientId, clinic]);

  const fetchLoyaltyAndPackages = async () => {
    if (!clinic) return;
    const [loyaltyRes, pkgRes, cardRes, voucherRes] = await Promise.all([
      supabase.from('patient_loyalty').select('current_discount_percent').eq('patient_id', patientId).eq('clinic_id', clinic.id).maybeSingle(),
      supabase.from('patient_packages')
        .select('*, package:package_id(name, items:service_package_items(service_id, quantity)), usage:patient_package_usage(service_id, quantity)')
        .eq('patient_id', patientId)
        .eq('clinic_id', clinic.id)
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString()),
      supabase.from('discount_cards')
        .select('discount_percent, card_number')
        .eq('patient_id', patientId)
        .eq('clinic_id', clinic.id)
        .eq('is_active', true)
        .or(`valid_until.is.null,valid_until.gte.${new Date().toISOString().split('T')[0]}`)
        .limit(1)
        .maybeSingle(),
      supabase.from('vouchers')
        .select('id, code, type, service_id, amount, service:service_id(name)')
        .eq('clinic_id', clinic.id)
        .eq('is_used', false)
        .or(`patient_id.is.null,patient_id.eq.${patientId}`)
        .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString().split('T')[0]}`),
    ]);

    const discount = loyaltyRes.data?.current_discount_percent || 0;
    setLoyaltyDiscount(discount);

    const pkgs = pkgRes.data || [];
    setPatientPackages(pkgs);

    // Build usage map: { packageId: { serviceId: usedQty } }
    const usageMap: Record<string, Record<string, number>> = {};
    for (const pkg of pkgs) {
      usageMap[pkg.id] = {};
      for (const u of (pkg.usage || [])) {
        usageMap[pkg.id][u.service_id] = (usageMap[pkg.id][u.service_id] || 0) + u.quantity;
      }
    }
    setPackageUsage(usageMap);

    setDiscountCard(cardRes.data || null);
    setAvailableVouchers(voucherRes.data || []);
  };

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
          .maybeSingle();

        if (service) {
          initialServices.push({
            id: `scheduled-${service.id}`,
            service_id: service.id,
            service_name: service.name,
            price: Number(service.price),
            quantity: 1,
            discount_percent: 0,
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

    const [servicesRes, categoriesRes] = await Promise.all([
      supabase
        .from('services')
        .select('*')
        .eq('clinic_id', clinic.id)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('service_categories')
        .select('*')
        .eq('clinic_id', clinic.id)
        .order('sort_order'),
    ]);

    if (servicesRes.data) setServices(servicesRes.data as Service[]);
    if (categoriesRes.data) setCategories(categoriesRes.data as ServiceCategory[]);
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

  // Check remaining package quantity for a service
  const getPackageRemaining = (serviceId: string): { pkg: any; remaining: number } | null => {
    for (const pp of patientPackages) {
      const item = pp.package?.items?.find((i: any) => i.service_id === serviceId);
      if (!item) continue;
      const used = packageUsage[pp.id]?.[serviceId] || 0;
      // Also count services already added in this session
      const sessionUsed = selectedServices.filter(s => s.service_id === serviceId && s.service_name.includes('📦')).reduce((sum, s) => sum + s.quantity, 0);
      const remaining = item.quantity - used - sessionUsed;
      if (remaining > 0) return { pkg: pp, remaining };
    }
    return null;
  };

  const handleAddService = () => {
    if (!selectedNewService) return;

    const service = services.find(s => s.id === selectedNewService);
    if (!service) return;

    const toothNum = selectedNewToothNumber ? parseInt(selectedNewToothNumber) : null;

    // Check if this service is covered by any active package with remaining qty
    const pkgInfo = getPackageRemaining(service.id);
    const isCoveredByPackage = !!pkgInfo;

    // Determine discount: package > discount card > loyalty
    const effectiveDiscount = isCoveredByPackage ? 0
      : discountCard ? discountCard.discount_percent
      : loyaltyDiscount;

    setSelectedServices(prev => [...prev, {
      id: `manual-${service.id}-${Date.now()}`,
      service_id: service.id,
      service_name: service.name + (isCoveredByPackage ? ` 📦 (ост. ${pkgInfo!.remaining})` : ''),
      price: isCoveredByPackage ? 0 : Number(service.price),
      quantity: 1,
      discount_percent: effectiveDiscount,
      tooth_number: toothNum,
      fromPlan: false
    }]);
    setSelectedNewService('');
    setSelectedNewToothNumber('');
  };

  const handleUpdateService = (id: string, field: 'price' | 'quantity' | 'tooth_number' | 'discount_percent', value: number | null) => {
    setSelectedServices(prev => prev.map(s => {
      if (s.id !== id) return s;
      if (field === 'tooth_number') {
        return { ...s, tooth_number: value };
      }
      if (field === 'discount_percent') {
        const discountValue = Math.max(0, Math.min(100, value || 0));
        return { ...s, discount_percent: discountValue };
      }
      return { ...s, [field]: value };
    }));
  };

  const calculateServiceTotal = (service: SelectedService) => {
    const subtotal = service.price * service.quantity;
    const discount = subtotal * (service.discount_percent / 100);
    return subtotal - discount;
  };

  const handleToggleEdit = (id: string) => {
    setSelectedServices(prev => prev.map(s => 
      s.id === id ? { ...s, isEditing: !s.isEditing } : s
    ));
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
        discount_percent: 0,
        tooth_number: item.tooth_number,
        fromPlan: true,
        treatment_plan_item_id: item.id
      }]);
    }
  };

  const getTotal = () => {
    return selectedServices.reduce((sum, s) => sum + calculateServiceTotal(s), 0);
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
          .maybeSingle();

        const performedWorks = manualServices.map(s => ({
          clinic_id: clinic.id,
          appointment_id: appointmentId,
          patient_id: appt?.patient_id || patientId,
          doctor_id: currentDoctorId,
          service_id: s.service_id || null,
          tooth_number: s.tooth_number || null,
          quantity: s.quantity,
          price: s.price,
          total: calculateServiceTotal(s),
          discount_percent: s.discount_percent
        }));

        const { error: insertError } = await supabase
          .from('performed_works')
          .insert(performedWorks);

        if (insertError) throw insertError;

        const manualTotal = manualServices.reduce((sum, s) => sum + calculateServiceTotal(s), 0);
        totalAmount += manualTotal;

        // Track package usage for zero-price services from packages
        for (const s of manualServices) {
          if (s.service_name.includes('📦') && s.service_id) {
            const coveredPkg = patientPackages.find((pp: any) =>
              pp.package?.items?.some((item: any) => item.service_id === s.service_id)
            );
            if (coveredPkg) {
              await supabase.from('patient_package_usage').insert({
                patient_package_id: coveredPkg.id,
                service_id: s.service_id,
                quantity: s.quantity,
                appointment_id: appointmentId,
              });
            }
          }
        }

        // Mark applied vouchers as used
        for (const s of selectedServices) {
          if (s.id.startsWith('voucher-')) {
            const voucherId = s.id.replace('voucher-', '');
            await supabase.from('vouchers').update({
              is_used: true,
              used_at: new Date().toISOString(),
              used_appointment_id: appointmentId,
            }).eq('id', voucherId);
          }
        }

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
                          className="p-2 bg-muted/50 rounded-lg space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                              <div className="min-w-0">
                                <span className="text-sm truncate block">{service.service_name}</span>
                                {!service.isEditing && service.tooth_number && (
                                  <span className="text-xs text-muted-foreground">зуб {service.tooth_number}</span>
                                )}
                                {service.fromPlan && (
                                  <Badge variant="outline" className="ml-1 text-xs">Из плана</Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {!service.isEditing && (
                                <>
                                  <span className="text-xs text-muted-foreground">
                                    {service.quantity} × {service.price.toLocaleString('ru-RU')}
                                    {service.discount_percent > 0 && ` −${service.discount_percent}%`}
                                  </span>
                                  <CurrencyDisplay amount={calculateServiceTotal(service)} size="sm" className="font-medium" />
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleToggleEdit(service.id)}
                              >
                                {service.isEditing ? <Check className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
                              </Button>
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
                          
                          {service.isEditing && (
                            <div className="grid grid-cols-4 gap-2 pt-1">
                              <div>
                                <Label className="text-xs text-muted-foreground">Кол-во</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={service.quantity}
                                  onChange={(e) => handleUpdateService(service.id, 'quantity', parseInt(e.target.value) || 1)}
                                  className="h-8"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Цена</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={service.price}
                                  onChange={(e) => handleUpdateService(service.id, 'price', parseFloat(e.target.value) || 0)}
                                  className="h-8"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Скидка %</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={service.discount_percent}
                                  onChange={(e) => handleUpdateService(service.id, 'discount_percent', parseInt(e.target.value) || 0)}
                                  className="h-8"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Зуб</Label>
                                <Select 
                                  value={service.tooth_number?.toString() || 'none'} 
                                  onValueChange={(v) => handleUpdateService(service.id, 'tooth_number', v === 'none' ? null : parseInt(v))}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="—" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">—</SelectItem>
                                    {toothNumbers.map(num => (
                                      <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Service */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Добавить услугу</Label>
                  <div className="flex gap-2">
                    <CategoryGroupedServiceSelect
                      services={services}
                      categories={categories}
                      value={selectedNewService}
                      onValueChange={setSelectedNewService}
                      placeholder="Выберите услугу..."
                      className="flex-1"
                      showPrice={true}
                    />
                    <Select value={selectedNewToothNumber} onValueChange={setSelectedNewToothNumber}>
                      <SelectTrigger className="w-20">
                        <SelectValue placeholder="Зуб" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {toothNumbers.map(num => (
                          <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
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

                {/* Available Vouchers */}
                {availableVouchers.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1">
                      <Ticket className="h-3.5 w-3.5" />
                      Доступные ваучеры
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {availableVouchers.map(v => {
                        const alreadyApplied = selectedServices.some(s => s.id === `voucher-${v.id}`);
                        return (
                          <Button
                            key={v.id}
                            variant={alreadyApplied ? 'default' : 'outline'}
                            size="sm"
                            className="text-xs gap-1"
                            disabled={alreadyApplied}
                            onClick={() => {
                              if (v.type === 'service' && v.service_id) {
                                const svc = services.find(s => s.id === v.service_id);
                                setSelectedServices(prev => [...prev, {
                                  id: `voucher-${v.id}`,
                                  service_id: v.service_id,
                                  service_name: (svc?.name || v.service?.name || 'Услуга') + ' (ваучер)',
                                  price: 0,
                                  quantity: 1,
                                  discount_percent: 0,
                                  fromPlan: false,
                                }]);
                              } else if (v.type === 'amount' && v.amount > 0) {
                                setSelectedServices(prev => [...prev, {
                                  id: `voucher-${v.id}`,
                                  service_id: '',
                                  service_name: `Ваучер ${v.code} (−${v.amount.toLocaleString('ru-RU')})`,
                                  price: -v.amount,
                                  quantity: 1,
                                  discount_percent: 0,
                                  fromPlan: false,
                                }]);
                              }
                            }}
                          >
                            <Ticket className="h-3 w-3" />
                            {v.code}: {v.type === 'service' ? (v.service?.name || 'Услуга') : `${v.amount?.toLocaleString('ru-RU')} сум`}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

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
              {discountCard && (
                <p className="text-xs text-primary flex items-center gap-1 mt-0.5">
                  <Gift className="h-3 w-3" />
                  Карта {discountCard.card_number}: −{discountCard.discount_percent}%
                </p>
              )}
              {!discountCard && loyaltyDiscount > 0 && (
                <p className="text-xs text-primary flex items-center gap-1 mt-0.5">
                  <Gift className="h-3 w-3" />
                  Скидка лояльности: {loyaltyDiscount}%
                </p>
              )}
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