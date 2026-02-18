import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { ImplantPassportDialog } from './ImplantPassportDialog';
import { Loader2, Plus, Cuboid, ChevronRight, CalendarDays, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { ImplantPassport, ImplantStage } from '@/types/database';

interface ImplantPassportCardProps {
  patientId: string;
  readOnly?: boolean;
  onScheduleVisit?: (text: string) => void;
}

const STAGE_LABELS: Record<ImplantStage, string> = {
  placed: 'Установлен',
  healing: 'Заживление',
  abutment: 'Абатмент',
  prosthetic: 'Протезирование',
  completed: 'Завершено',
  failed: 'Отторжение',
};

const STAGE_VARIANTS: Record<ImplantStage, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  placed: 'secondary',
  healing: 'outline',
  abutment: 'outline',
  prosthetic: 'outline',
  completed: 'default',
  failed: 'destructive',
};

export function ImplantPassportCard({ patientId, readOnly = false, onScheduleVisit }: ImplantPassportCardProps) {
  const { clinic } = useAuth();
  const [passports, setPassports] = useState<ImplantPassport[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (patientId && clinic?.id) {
      fetchPassports();
    }
  }, [patientId, clinic?.id]);

  const fetchPassports = async () => {
    if (!clinic?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('implant_passports')
        .select('*, doctor:doctor_id(full_name)')
        .eq('patient_id', patientId)
        .eq('clinic_id', clinic.id)
        .order('tooth_number');

      if (error) throw error;
      setPassports((data || []) as unknown as ImplantPassport[]);
    } catch (err) {
      console.error('Error fetching implant passports:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      return format(new Date(dateStr), 'd MMM yyyy', { locale: ru });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (passports.length === 0 && readOnly) return null;

  return (
    <>
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Cuboid className="h-4 w-4" />
              Импланты
              {passports.length > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">{passports.length}</Badge>
              )}
            </CardTitle>
            {!readOnly && (
              <Button variant="ghost" size="sm" onClick={() => setIsDialogOpen(true)} className="h-7 gap-1 text-xs">
                <Plus className="h-3 w-3" />
                {passports.length > 0 ? 'Управление' : 'Добавить'}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-0">
          {passports.length === 0 ? (
            <div className="text-center py-4 space-y-2">
              <Cuboid className="h-7 w-7 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Нет имплантов</p>
              {!readOnly && (
                <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)} className="gap-1 text-xs">
                  <Plus className="h-3 w-3" />
                  Добавить
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              {passports.map((p, idx) => {
                const stage = (p.stage || 'placed') as ImplantStage;
                const doctorName = (p.doctor as unknown as { full_name: string })?.full_name;
                return (
                  <div key={p.id}>
                    {idx > 0 && <Separator className="my-1.5" />}
                    <button
                      className="w-full text-left p-1.5 rounded-md hover:bg-muted/50 transition-colors group"
                      onClick={() => setIsDialogOpen(true)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-sm">Зуб {p.tooth_number}</span>
                            <Badge variant={STAGE_VARIANTS[stage]} className="text-[10px] h-4">
                              {STAGE_LABELS[stage]}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {p.manufacturer}{p.model ? ` ${p.model}` : ''}
                            {p.diameter && p.length ? ` ${p.diameter}x${p.length}` : ''}
                            {doctorName && ` | ${doctorName}`}
                            {' | '}{formatDate(p.installation_date)}
                          </p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ImplantPassportDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        patientId={patientId}
        onSaved={fetchPassports}
        onScheduleVisit={onScheduleVisit}
      />
    </>
  );
}
