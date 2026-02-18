import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import type { FunnelStage } from '@/types/database';

const STAGES: { key: FunnelStage; label: string; color: string }[] = [
  { key: 'new', label: 'Новый', color: '#3b82f6' },
  { key: 'consultation', label: 'Консультация', color: '#8b5cf6' },
  { key: 'treatment_plan', label: 'План лечения', color: '#f59e0b' },
  { key: 'in_treatment', label: 'В лечении', color: '#10b981' },
  { key: 'completed', label: 'Завершён', color: '#6b7280' },
  { key: 'lost', label: 'Потерян', color: '#ef4444' },
];

interface KanbanPatient {
  id: string;
  full_name: string;
  phone: string;
  funnel_stage: FunnelStage;
  balance: number;
}

export function PatientKanban() {
  const { clinic } = useAuth();
  const [patients, setPatients] = useState<KanbanPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedPatient, setDraggedPatient] = useState<string | null>(null);

  useEffect(() => {
    if (clinic?.id) fetchPatients();
  }, [clinic?.id]);

  const fetchPatients = async () => {
    if (!clinic?.id) return;
    const { data, error } = await supabase
      .from('patients')
      .select('id, full_name, phone, funnel_stage, balance')
      .eq('clinic_id', clinic.id)
      .eq('is_active', true)
      .order('full_name');

    if (error) {
      console.error('Error fetching patients for kanban:', error);
      setLoading(false);
      return;
    }

    setPatients((data || []).map(p => ({
      ...p,
      funnel_stage: (p.funnel_stage || 'new') as FunnelStage,
    })));
    setLoading(false);
  };

  const movePatient = async (patientId: string, newStage: FunnelStage) => {
    const { error } = await supabase
      .from('patients')
      .update({ funnel_stage: newStage, funnel_updated_at: new Date().toISOString() })
      .eq('id', patientId);

    if (error) {
      toast.error('Ошибка: ' + error.message);
      return;
    }

    setPatients(prev => prev.map(p =>
      p.id === patientId ? { ...p, funnel_stage: newStage } : p
    ));
  };

  const handleDragStart = (e: React.DragEvent, patientId: string) => {
    setDraggedPatient(patientId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, stage: FunnelStage) => {
    e.preventDefault();
    if (draggedPatient) {
      movePatient(draggedPatient, stage);
      setDraggedPatient(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {STAGES.map(stage => {
        const stagePatients = patients.filter(p => p.funnel_stage === stage.key);
        return (
          <div
            key={stage.key}
            className="min-w-[220px] w-[220px] shrink-0"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.key)}
          >
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
              <span className="text-sm font-medium">{stage.label}</span>
              <Badge variant="secondary" className="ml-auto text-xs">{stagePatients.length}</Badge>
            </div>
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {stagePatients.map(patient => (
                  <Card
                    key={patient.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, patient.id)}
                    className="cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors"
                  >
                    <CardContent className="p-3">
                      <Link
                        to={`/patients/${patient.id}`}
                        className="text-sm font-medium hover:text-primary transition-colors block truncate"
                      >
                        {patient.full_name}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-1">{patient.phone}</p>
                      {patient.balance < 0 && (
                        <Badge variant="destructive" className="text-xs mt-1">
                          Долг: {Math.abs(patient.balance).toLocaleString('ru-RU')}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {stagePatients.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-8 border border-dashed rounded-lg">
                    Перетащите сюда
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
