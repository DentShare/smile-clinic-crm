import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toothStatusColors, toothStatusLabels } from './ToothStatusLegend';
import { ToothStatus } from '@/types/database';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ToothStatusHistoryEntry {
  id: string;
  tooth_number: number;
  old_status: string | null;
  new_status: string;
  notes: string | null;
  created_at: string;
  changed_by: string | null;
}

interface ToothStatusHistoryProps {
  patientId: string;
  selectedTooth?: number | null;
}

const ToothStatusHistory = ({ patientId, selectedTooth }: ToothStatusHistoryProps) => {
  const { clinic } = useAuth();
  const [history, setHistory] = useState<ToothStatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (patientId && clinic) {
      fetchHistory();
    }
  }, [patientId, clinic, selectedTooth]);

  const fetchHistory = async () => {
    if (!clinic) return;

    try {
      let query = supabase
        .from('tooth_status_history')
        .select('*')
        .eq('patient_id', patientId)
        .eq('clinic_id', clinic.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (selectedTooth) {
        query = query.eq('tooth_number', selectedTooth);
      }

      const { data, error } = await query;

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching tooth status history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const color = toothStatusColors[status as ToothStatus] || 'hsl(var(--muted))';
    const label = toothStatusLabels[status as ToothStatus] || status;
    
    return (
      <Badge 
        variant="outline" 
        style={{ 
          borderColor: color,
          backgroundColor: `${color}20`,
          color: 'hsl(var(--foreground))'
        }}
      >
        {label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-pulse text-muted-foreground text-sm">Загрузка истории...</div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        {selectedTooth 
          ? `Нет истории изменений для зуба ${selectedTooth}`
          : 'Нет истории изменений'
        }
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-3 pr-4">
        {history.map((entry) => (
          <div 
            key={entry.id} 
            className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
              {entry.tooth_number}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {entry.old_status && (
                  <>
                    {getStatusBadge(entry.old_status)}
                    <span className="text-muted-foreground">→</span>
                  </>
                )}
                {getStatusBadge(entry.new_status)}
              </div>
              {entry.notes && (
                <p className="text-sm text-muted-foreground mt-1 truncate">
                  {entry.notes}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(entry.created_at), 'dd MMM yyyy, HH:mm', { locale: ru })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default ToothStatusHistory;
