import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToothStatus, ToothStatusRecord } from '@/types/database';
import Tooth from './Tooth';
import ToothStatusLegend from './ToothStatusLegend';
import ToothStatusEditor from './ToothStatusEditor';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ToothChartProps {
  patientId: string;
  readOnly?: boolean;
}

// FDI tooth numbering system
const upperRightTeeth = [18, 17, 16, 15, 14, 13, 12, 11];
const upperLeftTeeth = [21, 22, 23, 24, 25, 26, 27, 28];
const lowerLeftTeeth = [31, 32, 33, 34, 35, 36, 37, 38];
const lowerRightTeeth = [48, 47, 46, 45, 44, 43, 42, 41];

const ToothChart = ({ patientId, readOnly = false }: ToothChartProps) => {
  const { clinic } = useAuth();
  const [toothStatuses, setToothStatuses] = useState<Map<number, { status: ToothStatus; notes?: string }>>(new Map());
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (patientId && clinic) {
      fetchToothStatuses();
    }
  }, [patientId, clinic]);

  const fetchToothStatuses = async () => {
    if (!clinic) return;
    
    try {
      const { data, error } = await supabase
        .from('tooth_status')
        .select('*')
        .eq('patient_id', patientId)
        .eq('clinic_id', clinic.id);

      if (error) throw error;

      const statusMap = new Map<number, { status: ToothStatus; notes?: string }>();
      data?.forEach((record) => {
        statusMap.set(record.tooth_number, {
          status: record.status as ToothStatus,
          notes: record.notes || undefined,
        });
      });
      setToothStatuses(statusMap);
    } catch (error) {
      console.error('Error fetching tooth statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const getToothStatus = (toothNumber: number): ToothStatus => {
    return toothStatuses.get(toothNumber)?.status || 'healthy';
  };

  const getToothNotes = (toothNumber: number): string => {
    return toothStatuses.get(toothNumber)?.notes || '';
  };

  const handleToothClick = (toothNumber: number) => {
    if (readOnly) return;
    setSelectedTooth(toothNumber);
    setIsEditorOpen(true);
  };

  const handleSaveStatus = async (status: ToothStatus, notes: string) => {
    if (!selectedTooth || !clinic) return;

    const oldStatus = toothStatuses.get(selectedTooth)?.status || null;

    try {
      const existingRecord = await supabase
        .from('tooth_status')
        .select('id')
        .eq('patient_id', patientId)
        .eq('clinic_id', clinic.id)
        .eq('tooth_number', selectedTooth)
        .single();

      if (existingRecord.data) {
        // Update existing record
        const { error } = await supabase
          .from('tooth_status')
          .update({ status, notes, updated_at: new Date().toISOString() })
          .eq('id', existingRecord.data.id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('tooth_status')
          .insert({
            clinic_id: clinic.id,
            patient_id: patientId,
            tooth_number: selectedTooth,
            status,
            notes,
          });

        if (error) throw error;
      }

      // Save to history if status changed
      if (oldStatus !== status) {
        await supabase.from('tooth_status_history').insert({
          clinic_id: clinic.id,
          patient_id: patientId,
          tooth_number: selectedTooth,
          old_status: oldStatus,
          new_status: status,
          notes,
        });
      }

      // Update local state
      setToothStatuses((prev) => {
        const newMap = new Map(prev);
        newMap.set(selectedTooth, { status, notes });
        return newMap;
      });

      toast.success(`Статус зуба ${selectedTooth} обновлён`);
    } catch (error) {
      console.error('Error saving tooth status:', error);
      toast.error('Ошибка сохранения статуса');
    }
  };

  const renderToothRow = (teeth: number[], label: string) => (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground w-8 text-center">{label}</span>
      <div className="flex gap-1">
        {teeth.map((number) => (
          <Tooth
            key={number}
            number={number}
            status={getToothStatus(number)}
            onClick={handleToothClick}
            isSelected={selectedTooth === number}
          />
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-48">
            <div className="animate-pulse text-muted-foreground">Загрузка...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🦷 Зубная формула
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upper jaw */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-center text-muted-foreground mb-2">
            Верхняя челюсть
          </div>
          <div className="flex justify-center">
            <div className="flex gap-4">
              {renderToothRow(upperRightTeeth, 'ПВ')}
              <div className="w-px bg-border" />
              {renderToothRow(upperLeftTeeth, 'ЛВ')}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed" />

        {/* Lower jaw */}
        <div className="space-y-2">
          <div className="flex justify-center">
            <div className="flex gap-4">
              {renderToothRow(lowerRightTeeth, 'ПН')}
              <div className="w-px bg-border" />
              {renderToothRow(lowerLeftTeeth, 'ЛН')}
            </div>
          </div>
          <div className="text-sm font-medium text-center text-muted-foreground mt-2">
            Нижняя челюсть
          </div>
        </div>

        {/* Legend */}
        <ToothStatusLegend />

        {/* Status Editor Dialog */}
        {!readOnly && (
          <ToothStatusEditor
            open={isEditorOpen}
            onOpenChange={setIsEditorOpen}
            toothNumber={selectedTooth}
            currentStatus={selectedTooth ? getToothStatus(selectedTooth) : 'healthy'}
            currentNotes={selectedTooth ? getToothNotes(selectedTooth) : ''}
            onSave={handleSaveStatus}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default ToothChart;
