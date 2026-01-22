import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Trash2, GripVertical, Save } from 'lucide-react';

interface TreatmentPlanEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  existingPlan?: any;
  onSave: () => void;
}

interface Stage {
  id?: string;
  stage_number: number;
  title: string;
  description: string;
  items: StageItem[];
}

interface StageItem {
  id?: string;
  service_id?: string;
  service_name: string;
  tooth_number?: number;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  total_price: number;
  notes: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
}

const TreatmentPlanEditor = ({
  open,
  onOpenChange,
  patientId,
  existingPlan,
  onSave,
}: TreatmentPlanEditorProps) => {
  const { clinic, user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stages, setStages] = useState<Stage[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && clinic) {
      fetchServices();

      if (existingPlan) {
        setTitle(existingPlan.title);
        setDescription(existingPlan.description || '');
        // Convert existing plan stages to editable format
        const convertedStages: Stage[] = (existingPlan.stages || []).map((s: any) => ({
          id: s.id,
          stage_number: s.stage_number,
          title: s.title,
          description: s.description || '',
          items: (s.items || []).map((item: any) => ({
            id: item.id,
            service_id: item.service_id,
            service_name: item.service_name,
            tooth_number: item.tooth_number,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_percent: item.discount_percent || 0,
            total_price: item.total_price,
            notes: item.notes || '',
          })),
        }));
        setStages(convertedStages.length > 0 ? convertedStages : [createEmptyStage(1)]);
      } else {
        setTitle('');
        setDescription('');
        setStages([createEmptyStage(1)]);
      }
    }
  }, [open, existingPlan, clinic]);

  const fetchServices = async () => {
    if (!clinic) return;

    const { data, error } = await supabase
      .from('services')
      .select('id, name, price')
      .eq('clinic_id', clinic.id)
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      setServices(data);
    }
  };

  const createEmptyStage = (stageNumber: number): Stage => ({
    stage_number: stageNumber,
    title: `Этап ${stageNumber}`,
    description: '',
    items: [],
  });

  const createEmptyItem = (): StageItem => ({
    service_name: '',
    quantity: 1,
    unit_price: 0,
    discount_percent: 0,
    total_price: 0,
    notes: '',
  });

  const addStage = () => {
    setStages([...stages, createEmptyStage(stages.length + 1)]);
  };

  const removeStage = (index: number) => {
    if (stages.length <= 1) return;
    const newStages = stages.filter((_, i) => i !== index);
    // Renumber stages
    newStages.forEach((s, i) => {
      s.stage_number = i + 1;
      s.title = s.title.startsWith('Этап') ? `Этап ${i + 1}` : s.title;
    });
    setStages(newStages);
  };

  const updateStage = (index: number, field: keyof Stage, value: any) => {
    const newStages = [...stages];
    (newStages[index] as any)[field] = value;
    setStages(newStages);
  };

  const addItem = (stageIndex: number) => {
    const newStages = [...stages];
    newStages[stageIndex].items.push(createEmptyItem());
    setStages(newStages);
  };

  const removeItem = (stageIndex: number, itemIndex: number) => {
    const newStages = [...stages];
    newStages[stageIndex].items = newStages[stageIndex].items.filter((_, i) => i !== itemIndex);
    setStages(newStages);
  };

  const updateItem = (stageIndex: number, itemIndex: number, field: keyof StageItem, value: any) => {
    const newStages = [...stages];
    const item = newStages[stageIndex].items[itemIndex];
    (item as any)[field] = value;

    // Recalculate total
    if (field === 'quantity' || field === 'unit_price' || field === 'discount_percent') {
      const qty = field === 'quantity' ? Number(value) : item.quantity;
      const price = field === 'unit_price' ? Number(value) : item.unit_price;
      const discount = field === 'discount_percent' ? Number(value) : item.discount_percent;
      item.total_price = qty * price * (1 - discount / 100);
    }

    setStages(newStages);
  };

  const selectService = (stageIndex: number, itemIndex: number, serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;

    const newStages = [...stages];
    const item = newStages[stageIndex].items[itemIndex];
    item.service_id = serviceId;
    item.service_name = service.name;
    item.unit_price = service.price;
    item.total_price = item.quantity * service.price * (1 - item.discount_percent / 100);
    setStages(newStages);
  };

  const calculateTotalPrice = (): number => {
    return stages.reduce((total, stage) => {
      return total + stage.items.reduce((stageTotal, item) => stageTotal + item.total_price, 0);
    }, 0);
  };

  const handleSave = async () => {
    if (!clinic || !title.trim()) {
      toast.error('Введите название плана');
      return;
    }

    setSaving(true);

    try {
      let planId = existingPlan?.id;

      if (planId) {
        // Update existing plan
        const { error } = await (supabase as any)
          .from('treatment_plans')
          .update({
            title,
            description,
            total_price: calculateTotalPrice(),
          })
          .eq('id', planId);

        if (error) throw error;

        // Delete existing stages and items
        await (supabase as any).from('treatment_plan_stages').delete().eq('treatment_plan_id', planId);
      } else {
        // Create new plan
        const { data, error } = await (supabase as any)
          .from('treatment_plans')
          .insert({
            clinic_id: clinic.id,
            patient_id: patientId,
            title,
            description,
            total_price: calculateTotalPrice(),
            created_by: user?.id,
          })
          .select()
          .single();

        if (error) throw error;
        planId = data.id;
      }

      // Create stages and items
      for (const stage of stages) {
        const { data: stageData, error: stageError } = await (supabase as any)
          .from('treatment_plan_stages')
          .insert({
            clinic_id: clinic.id,
            treatment_plan_id: planId,
            stage_number: stage.stage_number,
            title: stage.title,
            description: stage.description,
            estimated_price: stage.items.reduce((t, i) => t + i.total_price, 0),
          })
          .select()
          .single();

        if (stageError) throw stageError;

        // Create items for this stage
        if (stage.items.length > 0) {
          const itemsToInsert = stage.items.map((item) => ({
            clinic_id: clinic.id,
            stage_id: stageData.id,
            service_id: item.service_id || null,
            service_name: item.service_name,
            tooth_number: item.tooth_number || null,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_percent: item.discount_percent,
            total_price: item.total_price,
            notes: item.notes,
          }));

          const { error: itemsError } = await (supabase as any)
            .from('treatment_plan_items')
            .insert(itemsToInsert);

          if (itemsError) throw itemsError;
        }
      }

      toast.success(existingPlan ? 'План обновлён' : 'План создан');
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving treatment plan:', error);
      toast.error('Ошибка сохранения плана');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col">
        <SheetHeader>
          <SheetTitle>
            {existingPlan ? 'Редактирование плана лечения' : 'Новый план лечения'}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {/* Plan info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Название плана *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Например: Комплексное лечение"
                />
              </div>
              <div className="space-y-2">
                <Label>Описание</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Описание плана лечения..."
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* Stages */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Этапы лечения</h3>
                <Button size="sm" variant="outline" onClick={addStage}>
                  <Plus className="h-4 w-4 mr-1" />
                  Добавить этап
                </Button>
              </div>

              {stages.map((stage, stageIndex) => (
                <Card key={stageIndex}>
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <Input
                          value={stage.title}
                          onChange={(e) => updateStage(stageIndex, 'title', e.target.value)}
                          className="h-8 w-48"
                        />
                      </div>
                      {stages.length > 1 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeStage(stageIndex)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    <Textarea
                      value={stage.description}
                      onChange={(e) => updateStage(stageIndex, 'description', e.target.value)}
                      placeholder="Описание этапа..."
                      rows={1}
                      className="text-sm"
                    />

                    {/* Items */}
                    <div className="space-y-2">
                      {stage.items.map((item, itemIndex) => (
                        <div
                          key={itemIndex}
                          className="grid grid-cols-12 gap-2 items-center p-2 bg-muted/50 rounded-lg"
                        >
                          <div className="col-span-4">
                            <Select
                              value={item.service_id || ''}
                              onValueChange={(v) => selectService(stageIndex, itemIndex, v)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Выберите услугу" />
                              </SelectTrigger>
                              <SelectContent>
                                {services.map((s) => (
                                  <SelectItem key={s.id} value={s.id} className="text-xs">
                                    {s.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="number"
                              value={item.tooth_number || ''}
                              onChange={(e) =>
                                updateItem(
                                  stageIndex,
                                  itemIndex,
                                  'tooth_number',
                                  e.target.value ? Number(e.target.value) : undefined
                                )
                              }
                              placeholder="Зуб"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="col-span-1">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(stageIndex, itemIndex, 'quantity', e.target.value)
                              }
                              className="h-8 text-xs"
                              min={1}
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="number"
                              value={item.unit_price}
                              onChange={(e) =>
                                updateItem(stageIndex, itemIndex, 'unit_price', e.target.value)
                              }
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="col-span-2 flex items-center gap-1">
                            <CurrencyDisplay amount={item.total_price} size="sm" />
                          </div>
                          <div className="col-span-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => removeItem(stageIndex, itemIndex)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full"
                        onClick={() => addItem(stageIndex)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Добавить услугу
                      </Button>
                    </div>

                    <div className="flex justify-end">
                      <div className="text-sm">
                        Итого этапа:{' '}
                        <CurrencyDisplay
                          amount={stage.items.reduce((t, i) => t + i.total_price, 0)}
                          size="sm"
                          className="font-medium inline"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">Общая стоимость:</span>
            <CurrencyDisplay amount={calculateTotalPrice()} size="lg" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              <Save className="h-4 w-4 mr-1" />
              {saving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TreatmentPlanEditor;