import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Pill, Plus, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { Prescription, Medication } from '@/types/database';
import { PrescriptionEditor } from './PrescriptionEditor';

interface PrescriptionListProps {
  patientId: string;
}

export function PrescriptionList({ patientId }: PrescriptionListProps) {
  const { clinic } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    if (clinic?.id && patientId) fetchPrescriptions();
  }, [clinic?.id, patientId]);

  const fetchPrescriptions = async () => {
    if (!clinic?.id) return;
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*, doctor:profiles!prescriptions_doctor_id_fkey(full_name)')
      .eq('clinic_id', clinic.id)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching prescriptions:', error);
    }
    setPrescriptions((data || []) as any);
    setLoading(false);
  };

  const handlePrint = (prescription: Prescription) => {
    const meds = (prescription.medications || []) as Medication[];
    const printContent = `
      <html>
      <head><title>Рецепт</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; font-size: 14px; }
        h2 { text-align: center; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background: #f5f5f5; }
        .notes { margin-top: 15px; padding: 10px; border: 1px solid #eee; }
        .footer { margin-top: 30px; display: flex; justify-content: space-between; }
      </style>
      </head>
      <body>
        <h2>РЕЦЕПТ</h2>
        <p>Дата: ${format(new Date(prescription.created_at), 'dd.MM.yyyy', { locale: ru })}</p>
        <p>Врач: ${(prescription as any).doctor?.full_name || '—'}</p>
        <table>
          <thead>
            <tr><th>Препарат</th><th>Дозировка</th><th>Частота</th><th>Длительность</th><th>Примечание</th></tr>
          </thead>
          <tbody>
            ${meds.map(m => `<tr><td>${m.name}</td><td>${m.dosage}</td><td>${m.frequency}</td><td>${m.duration}</td><td>${m.notes || ''}</td></tr>`).join('')}
          </tbody>
        </table>
        ${prescription.notes ? `<div class="notes"><strong>Указания:</strong> ${prescription.notes}</div>` : ''}
        <div class="footer">
          <div>Подпись врача: _______________</div>
          <div>Печать</div>
        </div>
      </body></html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
      win.print();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Рецепты
          </h3>
          <Button size="sm" onClick={() => setEditorOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Новый рецепт
          </Button>
        </div>

        {prescriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Нет рецептов
          </p>
        ) : (
          <div className="space-y-3">
            {prescriptions.map(rx => {
              const meds = (rx.medications || []) as Medication[];
              return (
                <Card key={rx.id}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium">
                          {format(new Date(rx.created_at), 'dd.MM.yyyy', { locale: ru })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Врач: {(rx as any).doctor?.full_name || '—'}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handlePrint(rx)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {meds.map((m, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="text-xs shrink-0">{i + 1}</Badge>
                          <span className="font-medium">{m.name}</span>
                          <span className="text-muted-foreground">{m.dosage}, {m.frequency}, {m.duration}</span>
                        </div>
                      ))}
                    </div>
                    {rx.notes && (
                      <p className="text-xs text-muted-foreground mt-2 italic">{rx.notes}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <PrescriptionEditor
        patientId={patientId}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSaved={fetchPrescriptions}
      />
    </>
  );
}
