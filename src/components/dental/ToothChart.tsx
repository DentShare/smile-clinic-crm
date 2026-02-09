import { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ToothStatus } from '@/types/database';
import AnatomicalTooth from './AnatomicalTooth';
import ToothStatusLegend from './ToothStatusLegend';
import ToothStatusEditor from './ToothStatusEditor';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
interface ToothChartProps {
  patientId: string;
  readOnly?: boolean;
  patientBirthDate?: string; // for auto-selection
}

type DentitionMode = 'permanent' | 'deciduous' | 'mixed';

// FDI tooth numbering system - Permanent teeth (11-48)
const permanentUpperRightTeeth = [18, 17, 16, 15, 14, 13, 12, 11];
const permanentUpperLeftTeeth = [21, 22, 23, 24, 25, 26, 27, 28];
const permanentLowerLeftTeeth = [31, 32, 33, 34, 35, 36, 37, 38];
const permanentLowerRightTeeth = [48, 47, 46, 45, 44, 43, 42, 41];

// FDI tooth numbering system - Deciduous teeth (51-85)
const deciduousUpperRightTeeth = [55, 54, 53, 52, 51];
const deciduousUpperLeftTeeth = [61, 62, 63, 64, 65];
const deciduousLowerLeftTeeth = [71, 72, 73, 74, 75];
const deciduousLowerRightTeeth = [85, 84, 83, 82, 81];

// Mixed dentition mapping: which permanent teeth replace which deciduous
const deciduousToPermanentMap: Record<number, number> = {
  51: 11, 52: 12, 53: 13, 54: 14, 55: 15,
  61: 21, 62: 22, 63: 23, 64: 24, 65: 25,
  71: 31, 72: 32, 73: 33, 74: 34, 75: 35,
  81: 41, 82: 42, 83: 43, 84: 44, 85: 45,
};

const ToothChart = ({ patientId, readOnly = false, patientBirthDate }: ToothChartProps) => {
  const { clinic } = useAuth();
  const [toothStatuses, setToothStatuses] = useState<Map<number, { status: ToothStatus; notes?: string }>>(new Map());
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dentitionMode, setDentitionMode] = useState<DentitionMode>('permanent');

  // Calculate patient age and set default dentition mode
  useEffect(() => {
    if (patientBirthDate) {
      const birthDate = new Date(patientBirthDate);
      const today = new Date();
      const ageInYears = (today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

      if (ageInYears < 6) {
        setDentitionMode('deciduous');
      } else if (ageInYears < 12) {
        setDentitionMode('mixed');
      } else {
        setDentitionMode('permanent');
      }
    }
  }, [patientBirthDate]);

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
        const { error } = await supabase
          .from('tooth_status')
          .update({ status, notes, updated_at: new Date().toISOString() })
          .eq('id', existingRecord.data.id);

        if (error) throw error;
      } else {
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

  // Determine which teeth to show based on mixed mode
  const getMixedTeethForQuadrant = (
    permanentTeeth: number[],
    deciduousTeeth: number[]
  ): { number: number; isDeciduous: boolean }[] => {
    if (dentitionMode === 'permanent') {
      return permanentTeeth.map((n) => ({ number: n, isDeciduous: false }));
    }
    if (dentitionMode === 'deciduous') {
      return deciduousTeeth.map((n) => ({ number: n, isDeciduous: true }));
    }

    // Mixed mode: show deciduous if present, otherwise permanent
    const result: { number: number; isDeciduous: boolean }[] = [];

    // Molars 6-8 are always permanent (no deciduous equivalent)
    const permanentMolars = permanentTeeth.filter((n) => {
      const lastDigit = n % 10;
      return lastDigit >= 6;
    });
    permanentMolars.forEach((n) => result.push({ number: n, isDeciduous: false }));

    // For teeth 1-5, check if deciduous or permanent
    deciduousTeeth.forEach((deciduousNum) => {
      const permanentNum = deciduousToPermanentMap[deciduousNum];
      const deciduousStatus = getToothStatus(deciduousNum);
      const permanentStatus = getToothStatus(permanentNum);

      // If deciduous tooth is missing or has status, show permanent
      if (deciduousStatus === 'missing' || permanentStatus !== 'healthy') {
        result.push({ number: permanentNum, isDeciduous: false });
      } else {
        result.push({ number: deciduousNum, isDeciduous: true });
      }
    });

    // Sort by position
    return result.sort((a, b) => {
      const aPos = a.number % 10;
      const bPos = b.number % 10;
      // Descending for right quadrants, ascending for left
      if (permanentTeeth[0] > permanentTeeth[1]) {
        return bPos - aPos;
      }
      return aPos - bPos;
    });
  };

  const renderToothRow = (
    teeth: { number: number; isDeciduous: boolean }[],
    label: string
  ) => (
    <div className="flex items-center gap-0.5">
      <span className="text-[10px] text-muted-foreground w-6 text-center font-medium">{label}</span>
      <div className="flex gap-0">
        {teeth.map(({ number, isDeciduous }) => (
          <AnatomicalTooth
            key={number}
            number={number}
            status={getToothStatus(number)}
            onClick={handleToothClick}
            isSelected={selectedTooth === number}
            isDeciduous={isDeciduous}
          />
        ))}
      </div>
    </div>
  );

  const upperRightTeeth = useMemo(
    () => getMixedTeethForQuadrant(permanentUpperRightTeeth, deciduousUpperRightTeeth),
    [dentitionMode, toothStatuses]
  );
  const upperLeftTeeth = useMemo(
    () => getMixedTeethForQuadrant(permanentUpperLeftTeeth, deciduousUpperLeftTeeth),
    [dentitionMode, toothStatuses]
  );
  const lowerLeftTeeth = useMemo(
    () => getMixedTeethForQuadrant(permanentLowerLeftTeeth, deciduousLowerLeftTeeth),
    [dentitionMode, toothStatuses]
  );
  const lowerRightTeeth = useMemo(
    () => getMixedTeethForQuadrant(permanentLowerRightTeeth, deciduousLowerRightTeeth),
    [dentitionMode, toothStatuses]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-pulse text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dentition Mode Selector */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <ToggleGroup
          type="single"
          value={dentitionMode}
          onValueChange={(value) => value && setDentitionMode(value as DentitionMode)}
          className="justify-start"
        >
          <ToggleGroupItem value="permanent" aria-label="Постоянные зубы" className="text-xs">
            Постоянные
          </ToggleGroupItem>
          <ToggleGroupItem value="deciduous" aria-label="Молочные зубы" className="text-xs">
            Молочные
          </ToggleGroupItem>
          <ToggleGroupItem value="mixed" aria-label="Смешанный прикус" className="text-xs">
            Смешанный
          </ToggleGroupItem>
        </ToggleGroup>

        {patientBirthDate && (
          <Badge variant="outline" className="text-xs">
            Авто: {dentitionMode === 'deciduous' ? 'до 6 лет' : dentitionMode === 'mixed' ? '6-12 лет' : 'старше 12'}
          </Badge>
        )}
      </div>

      {/* Upper jaw */}
      <div className="space-y-1">
        <div className="text-xs font-medium text-center text-muted-foreground">
          Верхняя челюсть
        </div>
        <div className="flex justify-center">
          <div className="flex gap-2">
            {renderToothRow(upperRightTeeth, 'ПВ')}
            <div className="w-px bg-border" />
            {renderToothRow(upperLeftTeeth, 'ЛВ')}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-dashed my-2" />

      {/* Lower jaw */}
      <div className="space-y-1">
        <div className="flex justify-center">
          <div className="flex gap-2">
            {renderToothRow(lowerRightTeeth, 'ПН')}
            <div className="w-px bg-border" />
            {renderToothRow(lowerLeftTeeth, 'ЛН')}
          </div>
        </div>
        <div className="text-xs font-medium text-center text-muted-foreground">
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
    </div>
  );
};

export default ToothChart;