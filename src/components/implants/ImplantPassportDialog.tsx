import { useState, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Plus, CalendarPlus, X } from 'lucide-react';
import { ToothGrid } from './ToothGrid';
import type { ImplantPassport, ImplantStage } from '@/types/database';

// ── Props ──

interface ImplantPassportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  toothNumber?: number;
  existingPassport?: ImplantPassport | null;
  onSaved?: () => void;
  onScheduleVisit?: (text: string) => void;
}

// ── Constants ──

const STAGE_LABELS: Record<ImplantStage, string> = {
  placed: 'Установлен',
  healing: 'Заживление',
  abutment: 'Абатмент',
  prosthetic: 'Протезирование',
  completed: 'Завершено',
  failed: 'Отторжение',
};

const MANUFACTURERS = [
  'Straumann', 'Nobel Biocare', 'Osstem', 'Dentium', 'MegaGen',
  'BioHorizons', 'Zimmer Biomet', 'Dentsply Sirona', 'Neodent',
  'Alpha-Bio', 'MIS', 'Adin', 'Anthogyr', 'SGS Dental',
];

const BONE_TYPES = [
  { value: 'D1', label: 'D1 — Плотная' },
  { value: 'D2', label: 'D2 — Средняя' },
  { value: 'D3', label: 'D3 — Рыхлая' },
  { value: 'D4', label: 'D4 — Очень рыхлая' },
];

const CONSTRUCTION_TYPES = [
  { value: 'single_crown', label: 'Одиночная коронка' },
  { value: 'bridge', label: 'Мост' },
  { value: 'overdenture', label: 'Покрывной протез' },
  { value: 'bar', label: 'Балочная конструкция' },
  { value: 'temporary', label: 'Временная' },
];

const MATERIALS = [
  { value: 'zirconia', label: 'Цирконий' },
  { value: 'metal_ceramic', label: 'Металлокерамика' },
  { value: 'emax', label: 'E.max' },
  { value: 'composite', label: 'Композит' },
  { value: 'acrylic', label: 'Акрил' },
  { value: 'metal', label: 'Металл' },
];

const VISIT_TEMPLATES = [
  'Контрольный осмотр имплантов',
  'Снятие швов после имплантации',
  'Установка формирователя десны',
  'Установка абатмента',
  'Снятие слепков для протезирования',
  'Фиксация конструкции на имплантах',
];

// ── Types ──

interface ImplantForm {
  manufacturer: string;
  model: string;
  diameter: string;
  length: string;
  serial_number: string;
  batch_number: string;
  surface_type: string;
  platform_type: string;
  installation_date: string;
  torque_value: string;
  bone_type: string;
  surgical_protocol: string;
  initial_stability: string;
  bone_graft_material: string;
  membrane: string;
  doctor_id: string;
  notes: string;
}

interface Construction {
  id: string;
  construction_type: string;
  material: string;
  fixation_type: string;
  prosthetic_date: string;
  lab_name: string;
  notes: string;
  implant_ids: string[];
}

const defaultImplantForm: ImplantForm = {
  manufacturer: '',
  model: '',
  diameter: '',
  length: '',
  serial_number: '',
  batch_number: '',
  surface_type: '',
  platform_type: '',
  installation_date: new Date().toISOString().slice(0, 10),
  torque_value: '',
  bone_type: '',
  surgical_protocol: 'two_stage',
  initial_stability: '',
  bone_graft_material: '',
  membrane: '',
  doctor_id: '',
  notes: '',
};

// ── Component ──

export function ImplantPassportDialog({
  open,
  onOpenChange,
  patientId,
  toothNumber,
  existingPassport,
  onSaved,
  onScheduleVisit,
}: ImplantPassportDialogProps) {
  const { clinic } = useAuth();

  // Implants tab
  const [selectedTeeth, setSelectedTeeth] = useState<Set<number>>(new Set());
  const [implantForm, setImplantForm] = useState<ImplantForm>(defaultImplantForm);
  const [existingImplants, setExistingImplants] = useState<ImplantPassport[]>([]);
  const [occupiedTeeth, setOccupiedTeeth] = useState<Set<number>>(new Set());
  const [doctors, setDoctors] = useState<{ id: string; full_name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  // Healing tab
  const [healingData, setHealingData] = useState<Record<string, {
    healing_cap_date: string;
    osseointegration_date: string;
    isq_value: string;
    stage: string;
    next_checkup: string;
    notes: string;
  }>>({});

  // Prosthetic tab
  const [constructions, setConstructions] = useState<Construction[]>([]);
  const [newConstruction, setNewConstruction] = useState<Omit<Construction, 'id'>>({
    construction_type: '',
    material: '',
    fixation_type: '',
    prosthetic_date: '',
    lab_name: '',
    notes: '',
    implant_ids: [],
  });

  // Visit scheduling
  const [visitText, setVisitText] = useState('');

  // ── Data loading ──

  const fetchData = useCallback(async () => {
    if (!clinic?.id || !patientId) return;

    const [implantsRes, doctorsRes, constructionsRes] = await Promise.all([
      supabase
        .from('implant_passports')
        .select('*')
        .eq('patient_id', patientId)
        .eq('clinic_id', clinic.id)
        .order('tooth_number'),
      supabase
        .from('profiles')
        .select('id:user_id, full_name')
        .eq('clinic_id', clinic.id)
        .eq('role', 'doctor'),
      supabase
        .from('implant_constructions')
        .select('*')
        .eq('patient_id', patientId)
        .eq('clinic_id', clinic.id)
        .order('created_at', { ascending: false }),
    ]);

    const implants = (implantsRes.data || []) as unknown as ImplantPassport[];
    setExistingImplants(implants);
    setOccupiedTeeth(new Set(implants.map(i => i.tooth_number)));
    setDoctors(doctorsRes.data || []);

    // Populate healing data
    const hd: typeof healingData = {};
    implants.forEach(imp => {
      hd[imp.id] = {
        healing_cap_date: imp.healing_cap_date || '',
        osseointegration_date: imp.osseointegration_date || '',
        isq_value: imp.isq_value?.toString() || '',
        stage: imp.stage || 'placed',
        next_checkup: imp.next_checkup || '',
        notes: '',
      };
    });
    setHealingData(hd);

    // Populate constructions
    const constrs = (constructionsRes.data || []) as { id: string; construction_type: string; material: string; fixation_type: string; prosthetic_date: string; lab_name: string; notes: string }[];
    const constrWithImplants: Construction[] = constrs.map(c => ({
      ...c,
      construction_type: c.construction_type || '',
      material: c.material || '',
      fixation_type: c.fixation_type || '',
      prosthetic_date: c.prosthetic_date || '',
      lab_name: c.lab_name || '',
      notes: c.notes || '',
      implant_ids: implants.filter(i => (i as any).construction_id === c.id).map(i => i.id),
    }));
    setConstructions(constrWithImplants);
  }, [clinic?.id, patientId]);

  useEffect(() => {
    if (open) {
      fetchData();
      setSelectedTeeth(new Set(toothNumber ? [toothNumber] : []));
      setImplantForm(defaultImplantForm);
      setVisitText('');
      setNewConstruction({
        construction_type: '',
        material: '',
        fixation_type: '',
        prosthetic_date: '',
        lab_name: '',
        notes: '',
        implant_ids: [],
      });

      // If editing existing passport, pre-fill form
      if (existingPassport) {
        setSelectedTeeth(new Set([existingPassport.tooth_number]));
        setImplantForm({
          manufacturer: existingPassport.manufacturer || '',
          model: existingPassport.model || '',
          diameter: existingPassport.diameter?.toString() || '',
          length: existingPassport.length?.toString() || '',
          serial_number: existingPassport.serial_number || '',
          batch_number: existingPassport.batch_number || '',
          surface_type: existingPassport.surface_type || '',
          platform_type: existingPassport.platform_type || '',
          installation_date: existingPassport.installation_date || new Date().toISOString().slice(0, 10),
          torque_value: existingPassport.torque_value?.toString() || '',
          bone_type: existingPassport.bone_type || '',
          surgical_protocol: existingPassport.surgical_protocol || 'two_stage',
          initial_stability: existingPassport.initial_stability || '',
          bone_graft_material: existingPassport.bone_graft_material || '',
          membrane: existingPassport.membrane || '',
          doctor_id: existingPassport.doctor_id || '',
          notes: existingPassport.notes || '',
        });
      }
    }
  }, [open, toothNumber, existingPassport]);

  // ── Handlers ──

  const toggleTooth = (tooth: number) => {
    setSelectedTeeth(prev => {
      const next = new Set(prev);
      if (next.has(tooth)) next.delete(tooth);
      else next.add(tooth);
      return next;
    });
  };

  const updateForm = (field: keyof ImplantForm, value: string) => {
    setImplantForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateImplants = async () => {
    if (!clinic?.id) return;
    if (selectedTeeth.size === 0) {
      toast.error('Выберите зубы на схеме');
      return;
    }
    if (!implantForm.manufacturer || !implantForm.serial_number) {
      toast.error('Заполните производителя и серийный номер');
      return;
    }

    setSaving(true);
    try {
      const teeth = Array.from(selectedTeeth);
      const records = teeth.map(tooth => ({
        clinic_id: clinic.id,
        patient_id: patientId,
        tooth_number: tooth,
        manufacturer: implantForm.manufacturer,
        model: implantForm.model || null,
        diameter: implantForm.diameter ? parseFloat(implantForm.diameter) : null,
        length: implantForm.length ? parseFloat(implantForm.length) : null,
        serial_number: implantForm.serial_number,
        batch_number: implantForm.batch_number || null,
        surface_type: implantForm.surface_type || null,
        platform_type: implantForm.platform_type || null,
        installation_date: implantForm.installation_date,
        torque_value: implantForm.torque_value ? parseInt(implantForm.torque_value) : null,
        bone_type: implantForm.bone_type || null,
        surgical_protocol: implantForm.surgical_protocol || null,
        initial_stability: implantForm.initial_stability || null,
        bone_graft_material: implantForm.bone_graft_material || null,
        membrane: implantForm.membrane || null,
        doctor_id: implantForm.doctor_id || null,
        notes: implantForm.notes || null,
        stage: 'placed',
      }));

      const { error } = await supabase.from('implant_passports').insert(records);
      if (error) throw error;

      toast.success(`Создано ${teeth.length} имплант(ов)`);
      setSelectedTeeth(new Set());
      setImplantForm(defaultImplantForm);
      await fetchData();
      onSaved?.();
    } catch (err: any) {
      console.error('Error creating implants:', err);
      toast.error(err?.message || 'Ошибка создания');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHealing = async (implantId: string) => {
    const data = healingData[implantId];
    if (!data) return;

    try {
      const { error } = await supabase
        .from('implant_passports')
        .update({
          healing_cap_date: data.healing_cap_date || null,
          osseointegration_date: data.osseointegration_date || null,
          isq_value: data.isq_value ? parseInt(data.isq_value) : null,
          stage: data.stage || 'placed',
          next_checkup: data.next_checkup || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', implantId);

      if (error) throw error;
      toast.success('Данные заживления сохранены');
      await fetchData();
      onSaved?.();
    } catch (err: any) {
      toast.error(err?.message || 'Ошибка сохранения');
    }
  };

  const updateHealing = (implantId: string, field: string, value: string) => {
    setHealingData(prev => ({
      ...prev,
      [implantId]: { ...prev[implantId], [field]: value },
    }));
  };

  const toggleConstructionImplant = (implantId: string) => {
    setNewConstruction(prev => {
      const ids = prev.implant_ids.includes(implantId)
        ? prev.implant_ids.filter(id => id !== implantId)
        : [...prev.implant_ids, implantId];
      return { ...prev, implant_ids: ids };
    });
  };

  const handleCreateConstruction = async () => {
    if (!clinic?.id) return;
    if (!newConstruction.construction_type) {
      toast.error('Выберите тип конструкции');
      return;
    }
    if (newConstruction.implant_ids.length === 0) {
      toast.error('Выберите импланты для конструкции');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('implant_constructions')
        .insert({
          clinic_id: clinic.id,
          patient_id: patientId,
          construction_type: newConstruction.construction_type,
          material: newConstruction.material || null,
          fixation_type: newConstruction.fixation_type || null,
          prosthetic_date: newConstruction.prosthetic_date || null,
          lab_name: newConstruction.lab_name || null,
          notes: newConstruction.notes || null,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Link implants to construction
      const { error: linkError } = await supabase
        .from('implant_passports')
        .update({
          construction_id: data.id,
          stage: 'prosthetic',
          updated_at: new Date().toISOString(),
        })
        .in('id', newConstruction.implant_ids);

      if (linkError) throw linkError;

      toast.success('Конструкция создана');
      setNewConstruction({
        construction_type: '',
        material: '',
        fixation_type: '',
        prosthetic_date: '',
        lab_name: '',
        notes: '',
        implant_ids: [],
      });
      await fetchData();
      onSaved?.();
    } catch (err: any) {
      toast.error(err?.message || 'Ошибка создания конструкции');
    } finally {
      setSaving(false);
    }
  };

  const handleScheduleVisit = () => {
    if (!visitText.trim()) {
      toast.error('Выберите или введите текст визита');
      return;
    }
    onScheduleVisit?.(visitText.trim());
  };

  const getImplantLabel = (imp: ImplantPassport) =>
    `${imp.tooth_number} — ${imp.manufacturer}${imp.model ? ' ' + imp.model : ''}${imp.diameter && imp.length ? ` (${imp.diameter}x${imp.length})` : ''}`;

  // ── Render ──

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] p-0 flex flex-col">
        <SheetHeader className="p-4 pb-2">
          <SheetTitle className="flex items-center gap-2">
            Имплантология
            {existingImplants.length > 0 && (
              <Badge variant="secondary">{existingImplants.length} имплант(ов)</Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="implants" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 grid grid-cols-3">
            <TabsTrigger value="implants" className="text-xs">Импланты</TabsTrigger>
            <TabsTrigger value="healing" className="text-xs">Заживление</TabsTrigger>
            <TabsTrigger value="prosthetic" className="text-xs">Протезирование</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            {/* ═══ TAB 1: IMPLANTS ═══ */}
            <TabsContent value="implants" className="p-4 space-y-4 mt-0">
              {/* Tooth selection grid */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Выберите зубы для имплантации</Label>
                <ToothGrid
                  selected={selectedTeeth}
                  onToggle={toggleTooth}
                  disabled={occupiedTeeth}
                />
                {selectedTeeth.size > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {Array.from(selectedTeeth).sort().map(t => (
                      <Badge key={t} variant="default" className="gap-1 text-xs">
                        {t}
                        <button onClick={() => toggleTooth(t)} className="ml-0.5 hover:text-destructive">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Compact implant form */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Производитель *</Label>
                  <Select value={implantForm.manufacturer} onValueChange={v => updateForm('manufacturer', v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {MANUFACTURERS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Модель / линейка</Label>
                  <Input className="h-8 text-xs" value={implantForm.model} onChange={e => updateForm('model', e.target.value)} placeholder="BLX, TS III..." />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">D мм</Label>
                  <Input className="h-8 text-xs" type="number" step="0.1" value={implantForm.diameter} onChange={e => updateForm('diameter', e.target.value)} placeholder="3.3" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">L мм</Label>
                  <Input className="h-8 text-xs" type="number" step="0.5" value={implantForm.length} onChange={e => updateForm('length', e.target.value)} placeholder="10" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">S/N *</Label>
                  <Input className="h-8 text-xs" value={implantForm.serial_number} onChange={e => updateForm('serial_number', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">LOT</Label>
                  <Input className="h-8 text-xs" value={implantForm.batch_number} onChange={e => updateForm('batch_number', e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Дата *</Label>
                  <Input className="h-8 text-xs" type="date" value={implantForm.installation_date} onChange={e => updateForm('installation_date', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Торк Нсм</Label>
                  <Input className="h-8 text-xs" type="number" value={implantForm.torque_value} onChange={e => updateForm('torque_value', e.target.value)} placeholder="35" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Кость</Label>
                  <Select value={implantForm.bone_type} onValueChange={v => updateForm('bone_type', v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {BONE_TYPES.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Протокол</Label>
                  <Select value={implantForm.surgical_protocol} onValueChange={v => updateForm('surgical_protocol', v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="two_stage">2-этапный</SelectItem>
                      <SelectItem value="one_stage">1-этапный</SelectItem>
                      <SelectItem value="immediate">Немедленный</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Стабильность</Label>
                  <Select value={implantForm.initial_stability} onValueChange={v => updateForm('initial_stability', v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">Высокая</SelectItem>
                      <SelectItem value="medium">Средняя</SelectItem>
                      <SelectItem value="low">Низкая</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Хирург</Label>
                  <Select value={implantForm.doctor_id} onValueChange={v => updateForm('doctor_id', v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Костный материал</Label>
                  <Input className="h-8 text-xs" value={implantForm.bone_graft_material} onChange={e => updateForm('bone_graft_material', e.target.value)} placeholder="Bio-Oss..." />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Мембрана</Label>
                  <Input className="h-8 text-xs" value={implantForm.membrane} onChange={e => updateForm('membrane', e.target.value)} placeholder="Bio-Gide..." />
                </div>
              </div>

              <Button
                onClick={handleCreateImplants}
                disabled={saving || selectedTeeth.size === 0}
                className="w-full"
                size="sm"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                Создать {selectedTeeth.size > 0 ? `(${selectedTeeth.size} зуб.)` : ''}
              </Button>

              {/* Existing implants list */}
              {existingImplants.length > 0 && (
                <>
                  <Separator />
                  <p className="text-xs font-medium text-muted-foreground">Существующие импланты</p>
                  <div className="space-y-1">
                    {existingImplants.map(imp => (
                      <div key={imp.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-xs">
                        <span>
                          <strong>Зуб {imp.tooth_number}</strong> — {imp.manufacturer} {imp.model || ''}
                          {imp.diameter && imp.length ? ` (${imp.diameter}x${imp.length})` : ''}
                        </span>
                        <Badge variant="outline" className="text-[10px] h-4">
                          {STAGE_LABELS[(imp.stage || 'placed') as ImplantStage]}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            {/* ═══ TAB 2: HEALING ═══ */}
            <TabsContent value="healing" className="p-4 space-y-3 mt-0">
              {existingImplants.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Сначала создайте импланты
                </div>
              ) : (
                <Accordion type="multiple" className="space-y-1">
                  {existingImplants.map(imp => {
                    const hd = healingData[imp.id];
                    if (!hd) return null;
                    return (
                      <AccordionItem key={imp.id} value={imp.id} className="border rounded-lg px-3">
                        <AccordionTrigger className="py-2 text-sm hover:no-underline">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Зуб {imp.tooth_number}</span>
                            <span className="text-muted-foreground text-xs">{imp.manufacturer} {imp.model || ''}</span>
                            <Badge variant="outline" className="text-[10px] h-4 ml-auto">
                              {STAGE_LABELS[(hd.stage || 'placed') as ImplantStage]}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-3 space-y-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Этап</Label>
                            <Select value={hd.stage} onValueChange={v => updateHealing(imp.id, 'stage', v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(STAGE_LABELS).map(([val, label]) => (
                                  <SelectItem key={val} value={val}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Формирователь десны</Label>
                              <Input className="h-8 text-xs" type="date" value={hd.healing_cap_date} onChange={e => updateHealing(imp.id, 'healing_cap_date', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Остеоинтеграция</Label>
                              <Input className="h-8 text-xs" type="date" value={hd.osseointegration_date} onChange={e => updateHealing(imp.id, 'osseointegration_date', e.target.value)} />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">ISQ</Label>
                              <Input className="h-8 text-xs" type="number" min={0} max={99} value={hd.isq_value} onChange={e => updateHealing(imp.id, 'isq_value', e.target.value)} placeholder="65-80" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Сл. осмотр</Label>
                              <Input className="h-8 text-xs" type="date" value={hd.next_checkup} onChange={e => updateHealing(imp.id, 'next_checkup', e.target.value)} />
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs h-7"
                            onClick={() => handleSaveHealing(imp.id)}
                          >
                            Сохранить
                          </Button>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </TabsContent>

            {/* ═══ TAB 3: PROSTHETIC ═══ */}
            <TabsContent value="prosthetic" className="p-4 space-y-4 mt-0">
              {/* Existing constructions */}
              {constructions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Конструкции</p>
                  {constructions.map(c => (
                    <Card key={c.id} className="border">
                      <CardContent className="p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {CONSTRUCTION_TYPES.find(ct => ct.value === c.construction_type)?.label || c.construction_type}
                          </span>
                          {c.material && (
                            <Badge variant="outline" className="text-xs">
                              {MATERIALS.find(m => m.value === c.material)?.label || c.material}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Зубы: {c.implant_ids.map(id => {
                            const imp = existingImplants.find(i => i.id === id);
                            return imp?.tooth_number;
                          }).filter(Boolean).join(', ')}
                          {c.prosthetic_date && ` | ${c.prosthetic_date}`}
                          {c.lab_name && ` | ${c.lab_name}`}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Separator />
                </div>
              )}

              {/* New construction form */}
              {existingImplants.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Сначала создайте импланты
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Новая конструкция</p>

                  {/* Select implants */}
                  <div className="space-y-1">
                    <Label className="text-xs">Выберите импланты</Label>
                    <div className="space-y-1">
                      {existingImplants.map(imp => (
                        <label key={imp.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer text-xs">
                          <Checkbox
                            checked={newConstruction.implant_ids.includes(imp.id)}
                            onCheckedChange={() => toggleConstructionImplant(imp.id)}
                          />
                          <span>{getImplantLabel(imp)}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Тип конструкции *</Label>
                      <Select value={newConstruction.construction_type} onValueChange={v => setNewConstruction(p => ({ ...p, construction_type: v }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {CONSTRUCTION_TYPES.map(ct => <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Материал</Label>
                      <Select value={newConstruction.material} onValueChange={v => setNewConstruction(p => ({ ...p, material: v }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {MATERIALS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Фиксация</Label>
                      <Select value={newConstruction.fixation_type} onValueChange={v => setNewConstruction(p => ({ ...p, fixation_type: v }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cement">Цемент</SelectItem>
                          <SelectItem value="screw">Винт</SelectItem>
                          <SelectItem value="combined">Комбо</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Дата</Label>
                      <Input className="h-8 text-xs" type="date" value={newConstruction.prosthetic_date} onChange={e => setNewConstruction(p => ({ ...p, prosthetic_date: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Лаборатория</Label>
                      <Input className="h-8 text-xs" value={newConstruction.lab_name} onChange={e => setNewConstruction(p => ({ ...p, lab_name: e.target.value }))} />
                    </div>
                  </div>

                  <Button
                    onClick={handleCreateConstruction}
                    disabled={saving || !newConstruction.construction_type || newConstruction.implant_ids.length === 0}
                    className="w-full"
                    size="sm"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                    Создать конструкцию
                  </Button>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Schedule visit footer */}
        <div className="p-3 border-t space-y-2">
          <div className="flex gap-1 flex-wrap">
            {VISIT_TEMPLATES.map(tpl => (
              <Badge
                key={tpl}
                variant={visitText === tpl ? 'default' : 'outline'}
                className="cursor-pointer text-[10px] h-5"
                onClick={() => setVisitText(visitText === tpl ? '' : tpl)}
              >
                {tpl}
              </Badge>
            ))}
          </div>
          {onScheduleVisit && (
            <div className="flex gap-2">
              <Input
                className="h-8 text-xs flex-1"
                placeholder="Текст визита..."
                value={visitText}
                onChange={e => setVisitText(e.target.value)}
              />
              <Button size="sm" variant="outline" className="h-8 gap-1 text-xs shrink-0" onClick={handleScheduleVisit} disabled={!visitText.trim()}>
                <CalendarPlus className="h-3 w-3" />
                Визит
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
