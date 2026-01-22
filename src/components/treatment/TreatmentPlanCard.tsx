import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Plus,
  Lock,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  ChevronRight,
  Printer,
  Bell,
} from 'lucide-react';
import TreatmentPlanEditor from './TreatmentPlanEditor';
import TreatmentPlanPrint from './TreatmentPlanPrint';
import SendNotificationDialog from './SendNotificationDialog';

interface TreatmentPlan {
  id: string;
  title: string;
  description?: string;
  total_price: number;
  locked_price?: number;
  status: string;
  locked_at?: string;
  created_at: string;
  stages?: TreatmentStage[];
}

interface TreatmentStage {
  id: string;
  stage_number: number;
  title: string;
  description?: string;
  estimated_price: number;
  actual_price?: number;
  status: string;
  items?: TreatmentItem[];
}

interface TreatmentItem {
  id: string;
  service_name: string;
  tooth_number?: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_completed: boolean;
}

interface TreatmentPlanCardProps {
  patientId: string;
  patientName?: string;
  patientPhone?: string;
  patientBirthDate?: string;
  readOnly?: boolean;
}

const statusConfig = {
  draft: { label: 'Черновик', icon: FileText, color: 'bg-muted text-muted-foreground' },
  active: { label: 'Активный', icon: Clock, color: 'bg-primary/10 text-primary' },
  completed: { label: 'Завершён', icon: CheckCircle2, color: 'bg-success/10 text-success' },
  cancelled: { label: 'Отменён', icon: AlertCircle, color: 'bg-destructive/10 text-destructive' },
};

const stageStatusConfig = {
  pending: { label: 'Ожидает', color: 'bg-muted' },
  in_progress: { label: 'В работе', color: 'bg-primary' },
  completed: { label: 'Завершён', color: 'bg-success' },
  skipped: { label: 'Пропущен', color: 'bg-muted-foreground' },
};

const TreatmentPlanCard = ({ 
  patientId, 
  patientName = '', 
  patientPhone = '', 
  patientBirthDate,
  readOnly = false 
}: TreatmentPlanCardProps) => {
  const { clinic, isDoctor, isClinicAdmin } = useAuth();
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<TreatmentPlan | null>(null);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<TreatmentStage | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const canManage = isDoctor || isClinicAdmin;

  useEffect(() => {
    if (patientId && clinic) {
      fetchPlans();
    }
  }, [patientId, clinic]);

  const fetchPlans = async () => {
    if (!clinic) return;

    try {
      // Using any type since tables are newly created and types not yet regenerated
      const { data: plansData, error: plansError } = await (supabase as any)
        .from('treatment_plans')
        .select('*')
        .eq('patient_id', patientId)
        .eq('clinic_id', clinic.id)
        .order('created_at', { ascending: false });

      if (plansError) throw plansError;

      // Fetch stages and items for each plan
      const plansWithDetails = await Promise.all(
        (plansData || []).map(async (plan: any) => {
          const { data: stagesData } = await (supabase as any)
            .from('treatment_plan_stages')
            .select('*')
            .eq('treatment_plan_id', plan.id)
            .order('stage_number', { ascending: true });

          const stagesWithItems = await Promise.all(
            (stagesData || []).map(async (stage: any) => {
              const { data: itemsData } = await (supabase as any)
                .from('treatment_plan_items')
                .select('*')
                .eq('stage_id', stage.id)
                .order('created_at', { ascending: true });

              return { ...stage, items: itemsData || [] };
            })
          );

          return { ...plan, stages: stagesWithItems };
        })
      );

      setPlans(plansWithDetails as TreatmentPlan[]);
    } catch (error) {
      console.error('Error fetching treatment plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLockPlan = async (planId: string) => {
    if (!clinic) return;

    try {
      const plan = plans.find((p) => p.id === planId);
      if (!plan) return;

      const { error } = await (supabase as any)
        .from('treatment_plans')
        .update({
          status: 'active',
          locked_price: plan.total_price,
          locked_at: new Date().toISOString(),
        })
        .eq('id', planId);

      if (error) throw error;

      toast.success('План лечения активирован и цена зафиксирована');
      fetchPlans();
    } catch (error) {
      console.error('Error locking plan:', error);
      toast.error('Ошибка при активации плана');
    }
  };

  const handleCreatePlan = () => {
    setSelectedPlan(null);
    setIsEditorOpen(true);
  };

  const handleEditPlan = (plan: TreatmentPlan) => {
    setSelectedPlan(plan);
    setIsEditorOpen(true);
  };

  const handlePrint = (plan: TreatmentPlan) => {
    // Create a printable view
    const printContent = `
      <html>
        <head>
          <title>План лечения - ${plan.title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20mm; }
            h1 { text-align: center; margin-bottom: 20px; }
            h2 { text-align: center; margin-bottom: 30px; }
            .patient-info { border: 1px solid #ccc; padding: 15px; margin-bottom: 20px; }
            .stage { margin-bottom: 20px; }
            .stage-title { background: #f5f5f5; padding: 10px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f9f9f9; }
            .text-right { text-align: right; }
            .total { font-weight: bold; font-size: 18px; text-align: right; margin-top: 20px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
            .signature-box { width: 45%; }
            .signature-line { border-bottom: 1px solid black; height: 50px; margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <h1>${clinic?.name || 'Клиника'}</h1>
          <h2>ПЛАН ЛЕЧЕНИЯ</h2>
          <div class="patient-info">
            <div><strong>Пациент:</strong> ${patientName}</div>
            <div><strong>Телефон:</strong> ${patientPhone}</div>
            <div><strong>Дата:</strong> ${new Date().toLocaleDateString('ru-RU')}</div>
          </div>
          <h3>${plan.title}</h3>
          ${plan.description ? `<p>${plan.description}</p>` : ''}
          ${plan.stages?.map((stage, i) => `
            <div class="stage">
              <div class="stage-title">Этап ${i + 1}: ${stage.title}</div>
              ${stage.description ? `<p style="padding: 0 10px;">${stage.description}</p>` : ''}
              <table>
                <thead>
                  <tr>
                    <th>№</th>
                    <th>Услуга</th>
                    <th>Зуб</th>
                    <th class="text-right">Кол-во</th>
                    <th class="text-right">Цена</th>
                    <th class="text-right">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  ${stage.items?.map((item, j) => `
                    <tr>
                      <td>${j + 1}</td>
                      <td>${item.service_name}</td>
                      <td>${item.tooth_number || '—'}</td>
                      <td class="text-right">${item.quantity}</td>
                      <td class="text-right">${item.unit_price.toLocaleString('ru-RU')} сум</td>
                      <td class="text-right">${item.total_price.toLocaleString('ru-RU')} сум</td>
                    </tr>
                  `).join('') || ''}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="5" class="text-right"><strong>Итого по этапу:</strong></td>
                    <td class="text-right"><strong>${stage.estimated_price.toLocaleString('ru-RU')} сум</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          `).join('') || ''}
          <div class="total">ОБЩАЯ СТОИМОСТЬ: ${(plan.locked_price || plan.total_price).toLocaleString('ru-RU')} сум</div>
          <div class="signatures">
            <div class="signature-box">
              <div class="signature-line"></div>
              <div>Врач: _______________________</div>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <div>Пациент: _______________________</div>
            </div>
          </div>
          <div style="margin-top: 30px;">Дата: «____» ______________ 20___ г.</div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 250);
    }
  };

  const handleNotifyStage = (plan: TreatmentPlan) => {
    // Find the first pending stage
    const pendingStage = plan.stages?.find(s => s.status === 'pending' || s.status === 'in_progress');
    setSelectedStage(pendingStage || null);
    setSelectedPlan(plan);
    setNotificationDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-pulse text-muted-foreground">Загрузка...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Планы лечения
            </CardTitle>
            {canManage && !readOnly && (
              <Button size="sm" onClick={handleCreatePlan}>
                <Plus className="h-4 w-4 mr-1" />
                Новый план
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {plans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Нет планов лечения</p>
              {canManage && !readOnly && (
                <Button variant="outline" size="sm" className="mt-3" onClick={handleCreatePlan}>
                  Создать план
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="max-h-[250px]">
              <Accordion type="single" collapsible className="w-full">
                {plans.map((plan) => {
                  const config = statusConfig[plan.status as keyof typeof statusConfig] || statusConfig.draft;
                  const StatusIcon = config.icon;

                  return (
                    <AccordionItem key={plan.id} value={plan.id}>
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center gap-3 w-full pr-2">
                          <div className={`p-1.5 rounded-full ${config.color}`}>
                            <StatusIcon className="h-3 w-3" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium text-sm">{plan.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {plan.stages?.length || 0} этапов
                            </p>
                          </div>
                          <div className="text-right">
                            <CurrencyDisplay
                              amount={plan.locked_price || plan.total_price}
                              size="sm"
                            />
                            {plan.locked_price && (
                              <Lock className="h-3 w-3 text-muted-foreground inline-block ml-1" />
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          {plan.description && (
                            <p className="text-sm text-muted-foreground">{plan.description}</p>
                          )}

                          {/* Stages */}
                          <div className="space-y-2">
                            {plan.stages?.map((stage) => {
                              const stageConfig =
                                stageStatusConfig[stage.status as keyof typeof stageStatusConfig] ||
                                stageStatusConfig.pending;

                              return (
                                <div
                                  key={stage.id}
                                  className="p-3 rounded-lg bg-muted/50 space-y-2"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={`w-2 h-2 rounded-full ${stageConfig.color}`}
                                      />
                                      <span className="font-medium text-sm">
                                        Этап {stage.stage_number}: {stage.title}
                                      </span>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      {stageConfig.label}
                                    </Badge>
                                  </div>

                                  {/* Items in stage */}
                                  {stage.items && stage.items.length > 0 && (
                                    <div className="ml-4 space-y-1">
                                      {stage.items.map((item) => (
                                        <div
                                          key={item.id}
                                          className="flex items-center justify-between text-xs"
                                        >
                                          <div className="flex items-center gap-2">
                                            {item.is_completed ? (
                                              <CheckCircle2 className="h-3 w-3 text-success" />
                                            ) : (
                                              <div className="w-3 h-3 rounded-full border border-muted-foreground" />
                                            )}
                                            <span className={item.is_completed ? 'line-through opacity-60' : ''}>
                                              {item.service_name}
                                              {item.tooth_number && ` (зуб ${item.tooth_number})`}
                                            </span>
                                          </div>
                                          <CurrencyDisplay amount={item.total_price} size="sm" />
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  <div className="flex justify-end">
                                    <CurrencyDisplay
                                      amount={stage.actual_price || stage.estimated_price}
                                      size="sm"
                                      className="font-medium"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Actions */}
                          {canManage && !readOnly && (
                            <div className="flex flex-wrap gap-2 pt-2">
                              {plan.status === 'draft' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditPlan(plan)}
                                  >
                                    Редактировать
                                  </Button>
                                  <Button size="sm" onClick={() => handleLockPlan(plan.id)}>
                                    <Lock className="h-3 w-3 mr-1" />
                                    Активировать
                                  </Button>
                                </>
                              )}
                              {plan.status === 'active' && (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => handleEditPlan(plan)}>
                                    <ChevronRight className="h-3 w-3 mr-1" />
                                    Открыть
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handlePrint(plan)}
                                  >
                                    <Printer className="h-3 w-3 mr-1" />
                                    Печать
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleNotifyStage(plan)}
                                  >
                                    <Bell className="h-3 w-3 mr-1" />
                                    Напомнить
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Editor */}
      <TreatmentPlanEditor
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        patientId={patientId}
        existingPlan={selectedPlan}
        onSave={fetchPlans}
      />

      {/* Notification Dialog */}
      {notificationDialogOpen && selectedPlan && clinic && (
        <SendNotificationDialog
          open={notificationDialogOpen}
          onOpenChange={setNotificationDialogOpen}
          patientId={patientId}
          patientName={patientName}
          patientPhone={patientPhone}
          clinicId={clinic.id}
          treatmentPlanId={selectedPlan.id}
          stageId={selectedStage?.id}
          stageName={selectedStage?.title}
        />
      )}

      {/* Hidden print component */}
      <div className="hidden">
        <TreatmentPlanPrint
          ref={printRef}
          plan={selectedPlan || plans[0]}
          patient={{
            full_name: patientName,
            phone: patientPhone,
            birth_date: patientBirthDate,
          }}
          clinic={{
            name: clinic?.name || '',
            address: clinic?.address,
            phone: clinic?.phone,
          }}
        />
      </div>
    </>
  );
};

export default TreatmentPlanCard;