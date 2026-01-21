import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Download, Upload, FileSpreadsheet, Loader2, Check, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportServicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicId: string;
  onSuccess: () => void;
}

interface ParsedService {
  name: string;
  price: number;
  duration_minutes: number;
  category?: string;
  description?: string;
  isValid: boolean;
  error?: string;
}

export function ImportServicesDialog({
  open,
  onOpenChange,
  clinicId,
  onSuccess,
}: ImportServicesDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedServices, setParsedServices] = useState<ParsedService[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');

  const downloadTemplate = () => {
    const templateData = [
      {
        'Название': 'Консультация',
        'Цена (сум)': 50000,
        'Длительность (мин)': 30,
        'Категория': 'Консультация',
        'Описание': 'Первичный осмотр'
      },
      {
        'Название': 'Чистка зубов',
        'Цена (сум)': 200000,
        'Длительность (мин)': 45,
        'Категория': 'Гигиена',
        'Описание': 'Ультразвуковая чистка'
      },
      {
        'Название': 'Лечение кариеса',
        'Цена (сум)': 350000,
        'Длительность (мин)': 60,
        'Категория': 'Терапия',
        'Описание': ''
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 30 }, // Название
      { wch: 15 }, // Цена
      { wch: 18 }, // Длительность
      { wch: 20 }, // Категория
      { wch: 40 }, // Описание
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Услуги');
    
    XLSX.writeFile(workbook, 'шаблон_услуги.xlsx');
    toast.success('Шаблон скачан');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const parsed: ParsedService[] = jsonData.map((row: any) => {
        const name = row['Название'] || row['название'] || row['Name'] || row['name'] || '';
        const price = parseFloat(row['Цена (сум)'] || row['Цена'] || row['цена'] || row['Price'] || row['price'] || 0);
        const duration = parseInt(row['Длительность (мин)'] || row['Длительность'] || row['длительность'] || row['Duration'] || row['duration'] || 30);
        const category = row['Категория'] || row['категория'] || row['Category'] || row['category'] || '';
        const description = row['Описание'] || row['описание'] || row['Description'] || row['description'] || '';

        let isValid = true;
        let error = '';

        if (!name.trim()) {
          isValid = false;
          error = 'Нет названия';
        } else if (isNaN(price) || price <= 0) {
          isValid = false;
          error = 'Неверная цена';
        }

        return {
          name: name.trim(),
          price,
          duration_minutes: isNaN(duration) ? 30 : duration,
          category: category.trim(),
          description: description.trim(),
          isValid,
          error,
        };
      });

      setParsedServices(parsed);
      setStep('preview');
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Ошибка чтения файла');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    const validServices = parsedServices.filter(s => s.isValid);
    if (validServices.length === 0) {
      toast.error('Нет валидных услуг для импорта');
      return;
    }

    setIsImporting(true);

    try {
      // Create categories first
      const uniqueCategories = [...new Set(validServices.map(s => s.category).filter(Boolean))];
      
      if (uniqueCategories.length > 0) {
        const { data: existingCategories } = await supabase
          .from('service_categories')
          .select('name')
          .eq('clinic_id', clinicId);

        const existingNames = new Set(existingCategories?.map(c => c.name) || []);
        const newCategories = uniqueCategories.filter(name => !existingNames.has(name));

        if (newCategories.length > 0) {
          await supabase.from('service_categories').insert(
            newCategories.map((name, index) => ({
              clinic_id: clinicId,
              name,
              sort_order: index,
            }))
          );
        }
      }

      // Get all categories for mapping
      const { data: allCategories } = await supabase
        .from('service_categories')
        .select('id, name')
        .eq('clinic_id', clinicId);

      const categoryMap = new Map(allCategories?.map(c => [c.name, c.id]) || []);

      // Insert services
      const servicesToInsert = validServices.map(s => ({
        clinic_id: clinicId,
        name: s.name,
        price: s.price,
        duration_minutes: s.duration_minutes,
        category_id: s.category ? categoryMap.get(s.category) || null : null,
        description: s.description || null,
      }));

      const { error } = await supabase.from('services').insert(servicesToInsert);

      if (error) throw error;

      toast.success(`Импортировано ${validServices.length} услуг`);
      setParsedServices([]);
      setStep('upload');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error importing services:', error);
      toast.error('Ошибка импорта');
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = parsedServices.filter(s => s.isValid).length;
  const invalidCount = parsedServices.filter(s => !s.isValid).length;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) {
        setParsedServices([]);
        setStep('upload');
      }
      onOpenChange(o);
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Импорт услуг из Excel</DialogTitle>
          <DialogDescription>
            Загрузите файл Excel с услугами или скачайте шаблон для заполнения
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' ? (
          <div className="space-y-6">
            {/* Download Template */}
            <div className="p-4 border rounded-lg bg-muted/30">
              <div className="flex items-start gap-4">
                <FileSpreadsheet className="h-10 w-10 text-success shrink-0" />
                <div className="flex-1">
                  <h3 className="font-medium">Шаблон Excel</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Скачайте шаблон, заполните его данными вашего прайс-листа и загрузите обратно
                  </p>
                  <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                    <Download className="h-4 w-4" />
                    Скачать шаблон
                  </Button>
                </div>
              </div>
            </div>

            {/* Upload Area */}
            <div 
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                "hover:border-primary hover:bg-primary/5"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">Нажмите для загрузки файла</p>
              <p className="text-sm text-muted-foreground">
                Поддерживаются форматы: .xlsx, .xls, .csv
              </p>
            </div>

            {/* Format Info */}
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium">Обязательные колонки:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li><strong>Название</strong> — название услуги</li>
                <li><strong>Цена (сум)</strong> — стоимость услуги</li>
              </ul>
              <p className="font-medium mt-2">Опциональные колонки:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li><strong>Длительность (мин)</strong> — время приёма (по умолчанию 30)</li>
                <li><strong>Категория</strong> — группа услуг</li>
                <li><strong>Описание</strong> — дополнительная информация</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="gap-1">
                <Check className="h-3 w-3" />
                {validCount} валидных
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <X className="h-3 w-3" />
                  {invalidCount} с ошибками
                </Badge>
              )}
            </div>

            {/* Preview Table */}
            <ScrollArea className="h-[300px] border rounded-lg">
              <div className="p-2 space-y-1">
                {parsedServices.map((service, index) => (
                  <div
                    key={index}
                    className={cn(
                      "p-2 rounded-md flex items-center gap-3",
                      service.isValid ? "bg-muted/30" : "bg-destructive/10"
                    )}
                  >
                    {service.isValid ? (
                      <Check className="h-4 w-4 text-success shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{service.name || '(без названия)'}</p>
                      <p className="text-xs text-muted-foreground">
                        {service.category && <span>{service.category} • </span>}
                        {service.duration_minutes} мин
                        {service.error && <span className="text-destructive ml-2">— {service.error}</span>}
                      </p>
                    </div>
                    <div className="text-sm font-medium shrink-0">
                      {formatPrice(service.price)} сум
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                setParsedServices([]);
                setStep('upload');
              }}>
                Назад
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={isImporting || validCount === 0}
                className="flex-1"
              >
                {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Импортировать {validCount} услуг
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
