import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, FileSpreadsheet, Loader2, AlertTriangle, Check } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

interface ImportRow {
  full_name: string;
  phone: string;
  birth_date?: string;
  gender?: string;
  address?: string;
  notes?: string;
  isDuplicate?: boolean;
}

export function ImportPatientsDialog({ open, onOpenChange, onImportComplete }: Props) {
  const { clinic } = useAuth();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

    // Map columns (support Russian and English headers)
    const mapped: ImportRow[] = json.map((row) => ({
      full_name: row['ФИО'] || row['Имя'] || row['full_name'] || row['name'] || '',
      phone: String(row['Телефон'] || row['phone'] || row['tel'] || '').replace(/\D/g, ''),
      birth_date: row['Дата рождения'] || row['birth_date'] || undefined,
      gender: (row['Пол'] || row['gender'] || '').toLowerCase().includes('м') ? 'male' : (row['Пол'] || row['gender'] || '').toLowerCase().includes('ж') ? 'female' : undefined,
      address: row['Адрес'] || row['address'] || undefined,
      notes: row['Заметки'] || row['notes'] || undefined,
    })).filter(r => r.full_name);

    // Check for duplicates by phone
    if (clinic?.id && mapped.length > 0) {
      const phones = mapped.map(r => r.phone).filter(Boolean);
      if (phones.length > 0) {
        const { data: existing } = await supabase
          .from('patients')
          .select('phone')
          .eq('clinic_id', clinic.id)
          .in('phone', phones);
        const existingPhones = new Set((existing || []).map(p => p.phone));
        mapped.forEach(r => {
          if (existingPhones.has(r.phone)) r.isDuplicate = true;
        });
      }
    }

    setRows(mapped);
    setStep('preview');
  };

  const handleImport = async () => {
    if (!clinic?.id) return;
    setImporting(true);

    const toImport = rows.filter(r => !r.isDuplicate && r.full_name);
    let count = 0;

    // Batch insert
    const batch = toImport.map(r => ({
      clinic_id: clinic.id,
      full_name: r.full_name,
      phone: r.phone || '',
      birth_date: r.birth_date || null,
      gender: r.gender || null,
      address: r.address || null,
      notes: r.notes || null,
      balance: 0,
      is_active: true,
    }));

    // Insert in chunks of 50
    for (let i = 0; i < batch.length; i += 50) {
      const chunk = batch.slice(i, i + 50);
      const { error } = await supabase.from('patients').insert(chunk);
      if (error) {
        console.error('Import batch error:', error);
      } else {
        count += chunk.length;
      }
    }

    setImported(count);
    setStep('done');
    setImporting(false);
    toast.success(`Импортировано ${count} пациентов`);
    onImportComplete?.();
  };

  const handleClose = () => {
    setRows([]);
    setStep('upload');
    setImported(0);
    onOpenChange(false);
  };

  const duplicateCount = rows.filter(r => r.isDuplicate).length;
  const validCount = rows.filter(r => !r.isDuplicate && r.full_name).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Импорт пациентов</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="text-center py-10">
            <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              Загрузите Excel-файл с колонками: ФИО, Телефон, Дата рождения, Пол, Адрес, Заметки
            </p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
            <Button onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Выбрать файл
            </Button>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Badge variant="secondary">Всего: {rows.length}</Badge>
              <Badge variant="default">К импорту: {validCount}</Badge>
              {duplicateCount > 0 && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Дубликаты: {duplicateCount}
                </Badge>
              )}
            </div>

            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ФИО</TableHead>
                    <TableHead>Телефон</TableHead>
                    <TableHead>Д.р.</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 100).map((row, i) => (
                    <TableRow key={i} className={row.isDuplicate ? 'opacity-50' : ''}>
                      <TableCell className="text-sm">{row.full_name}</TableCell>
                      <TableCell className="text-sm">{row.phone}</TableCell>
                      <TableCell className="text-xs">{row.birth_date || '—'}</TableCell>
                      <TableCell>
                        {row.isDuplicate ? (
                          <Badge variant="destructive" className="text-xs">Дубликат</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Новый</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-10">
            <Check className="h-16 w-16 mx-auto mb-4 text-success" />
            <p className="text-lg font-medium">Импорт завершён</p>
            <p className="text-sm text-muted-foreground">Добавлено {imported} пациентов</p>
          </div>
        )}

        <DialogFooter>
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => { setStep('upload'); setRows([]); }}>Назад</Button>
              <Button onClick={handleImport} disabled={importing || validCount === 0}>
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : `Импортировать (${validCount})`}
              </Button>
            </>
          )}
          {step === 'done' && <Button onClick={handleClose}>Закрыть</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
