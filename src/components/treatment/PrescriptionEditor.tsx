import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, X, Loader2, Pill } from 'lucide-react';
import type { Medication } from '@/types/database';

interface PrescriptionEditorProps {
  patientId: string;
  appointmentId?: string;
  onSaved?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrescriptionEditor({ patientId, appointmentId, onSaved, open, onOpenChange }: PrescriptionEditorProps) {
  const { clinic, profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [medications, setMedications] = useState<Medication[]>([
    { name: '', dosage: '', frequency: '', duration: '' },
  ]);

  const addMedication = () => {
    setMedications(m => [...m, { name: '', dosage: '', frequency: '', duration: '' }]);
  };

  const removeMedication = (idx: number) => {
    setMedications(m => m.filter((_, i) => i !== idx));
  };

  const updateMedication = (idx: number, field: keyof Medication, value: string) => {
    setMedications(m => m.map((med, i) =>
      i === idx ? { ...med, [field]: value } : med
    ));
  };

  const handleSave = async () => {
    if (!clinic?.id) return;
    const validMeds = medications.filter(m => m.name.trim());
    if (validMeds.length === 0) {
      toast.error('Добавьте хотя бы один препарат');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('prescriptions').insert({
      clinic_id: clinic.id,
      patient_id: patientId,
      doctor_id: profile?.user_id || null,
      appointment_id: appointmentId || null,
      medications: validMeds,
      notes: notes || null,
    });

    if (error) {
      toast.error('Ошибка: ' + error.message);
    } else {
      toast.success('Рецепт сохранён');
      setMedications([{ name: '', dosage: '', frequency: '', duration: '' }]);
      setNotes('');
      onOpenChange(false);
      onSaved?.();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Новый рецепт
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-3">
            {medications.map((med, idx) => (
              <Card key={idx}>
                <CardContent className="pt-4 pb-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Препарат {idx + 1}</span>
                    {medications.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeMedication(idx)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Название</Label>
                      <Input
                        value={med.name}
                        onChange={e => updateMedication(idx, 'name', e.target.value)}
                        placeholder="Амоксициллин"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Дозировка</Label>
                      <Input
                        value={med.dosage}
                        onChange={e => updateMedication(idx, 'dosage', e.target.value)}
                        placeholder="500 мг"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Частота приёма</Label>
                      <Input
                        value={med.frequency}
                        onChange={e => updateMedication(idx, 'frequency', e.target.value)}
                        placeholder="3 раза в день"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Длительность</Label>
                      <Input
                        value={med.duration}
                        onChange={e => updateMedication(idx, 'duration', e.target.value)}
                        placeholder="7 дней"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Примечание</Label>
                    <Input
                      value={med.notes || ''}
                      onChange={e => updateMedication(idx, 'notes', e.target.value)}
                      placeholder="После еды"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" size="sm" onClick={addMedication} className="w-full">
              <Plus className="h-4 w-4 mr-1" />
              Добавить препарат
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Общие указания</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Дополнительные рекомендации..."
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Сохранить рецепт'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
