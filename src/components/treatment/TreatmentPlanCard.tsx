import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import TreatmentPlanEditor from './TreatmentPlanEditor';

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

const TreatmentPlanCard = ({ patientId, readOnly = false }: TreatmentPlanCardProps) => {
  const { clinic, isDoctor, isClinicAdmin } = useAuth();
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<TreatmentPlan | null>(null);

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
                            <div className="flex gap-2 pt-2">
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
                                <Button size="sm" variant="outline" onClick={() => handleEditPlan(plan)}>
                                  <ChevronRight className="h-3 w-3 mr-1" />
                                  Открыть
                                </Button>
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
    </>
  );
};

export default TreatmentPlanCard;