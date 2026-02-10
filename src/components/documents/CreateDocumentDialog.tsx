import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, FileText, FileCheck, FilePenLine, ListChecks } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface DocumentTemplate {
  id: string;
  name: string;
  type: string | null;
  content: string;
}

interface PerformedWork {
  id: string;
  service_name: string;
  price: number;
  quantity: number;
  discount_percent: number | null;
  total: number;
  tooth_number: number | null;
}

interface CreateDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  clinicId: string;
  onDocumentCreated: () => void;
}

const documentTypes = [
  { value: 'contract', label: 'Договор', icon: FileText },
  { value: 'consent', label: 'Согласие', icon: FileCheck },
  { value: 'treatment_plan', label: 'План лечения', icon: FilePenLine },
  { value: 'act', label: 'Акт выполненных работ', icon: FileText },
  { value: 'invoice', label: 'Счёт', icon: FileText },
];

export function CreateDocumentDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
  clinicId,
  onDocumentCreated
}: CreateDocumentDialogProps) {
  const { profile, clinic } = useAuth();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'template' | 'custom'>('template');
  const [includeServices, setIncludeServices] = useState(false);
  const [performedWorks, setPerformedWorks] = useState<PerformedWork[]>([]);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [type, setType] = useState('contract');
  const [content, setContent] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchTemplates();
      fetchPerformedWorks();
      resetForm();
    }
  }, [open, clinicId]);

  const resetForm = () => {
    setTitle('');
    setType('contract');
    setContent('');
    setSelectedTemplateId(null);
    setActiveTab('template');
    setIncludeServices(false);
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('document_templates')
        .select('id, name, type, content')
        .eq('clinic_id', clinicId)
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformedWorks = async () => {
    try {
      const { data, error } = await supabase
        .from('performed_works')
        .select(`
          id,
          price,
          quantity,
          discount_percent,
          total,
          tooth_number,
          service_id,
          services ( name )
        `)
        .eq('patient_id', patientId)
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const works: PerformedWork[] = (data || []).map((w: any) => ({
        id: w.id,
        service_name: w.services?.name || 'Услуга',
        price: w.price,
        quantity: w.quantity || 1,
        discount_percent: w.discount_percent,
        total: w.total,
        tooth_number: w.tooth_number,
      }));
      setPerformedWorks(works);
    } catch (err) {
      console.error('Error fetching performed works:', err);
    }
  };

  const replacePlaceholders = (text: string): string => {
    let result = text;
    result = result.replace(/\{\{patient_name\}\}/g, patientName);
    result = result.replace(/\{\{date\}\}/g, new Date().toLocaleDateString('ru-RU'));
    result = result.replace(/\{\{clinic_name\}\}/g, clinic?.name || '');
    result = result.replace(/\{\{clinic_address\}\}/g, clinic?.address || '');
    result = result.replace(/\{\{clinic_phone\}\}/g, clinic?.phone || '');
    result = result.replace(/\{\{doctor_name\}\}/g, profile?.full_name || '');
    return result;
  };

  const buildServicesTable = (): string => {
    if (performedWorks.length === 0) return '\n\nОказанные услуги: нет данных\n';
    
    let table = '\n\n───────────────────────────────────────────────────\n';
    table += 'ОКАЗАННЫЕ УСЛУГИ\n';
    table += '───────────────────────────────────────────────────\n\n';

    let totalSum = 0;
    let totalDiscount = 0;

    performedWorks.forEach((w, i) => {
      const originalPrice = w.price * w.quantity;
      const discount = w.discount_percent ? (originalPrice * w.discount_percent / 100) : 0;
      totalDiscount += discount;
      totalSum += w.total;

      table += `${i + 1}. ${w.service_name}`;
      if (w.tooth_number) table += ` (зуб №${w.tooth_number})`;
      table += '\n';
      table += `   Цена: ${formatCurrency(w.price)}`;
      if (w.quantity > 1) table += ` × ${w.quantity}`;
      if (w.discount_percent) {
        table += ` | Скидка: ${w.discount_percent}%`;
      }
      table += ` | Итого: ${formatCurrency(w.total)}\n`;
    });

    table += '\n───────────────────────────────────────────────────\n';
    if (totalDiscount > 0) {
      table += `Скидка: ${formatCurrency(totalDiscount)}\n`;
    }
    table += `ИТОГО К ОПЛАТЕ: ${formatCurrency(totalSum)}\n`;
    table += '───────────────────────────────────────────────────\n';

    return table;
  };

  const selectTemplate = (template: DocumentTemplate) => {
    setSelectedTemplateId(template.id);
    setTitle(template.name);
    setType(template.type || 'contract');
    const filledContent = replacePlaceholders(template.content);
    setContent(filledContent);
  };

  // Re-apply services table when toggle changes
  useEffect(() => {
    if (!selectedTemplateId && activeTab !== 'custom') return;
    
    // Remove old services table if present
    const marker = '───────────────────────────────────────────────────';
    const firstMarker = content.indexOf(marker);
    const baseContent = firstMarker > -1 ? content.substring(0, firstMarker).trimEnd() : content;
    
    if (includeServices) {
      setContent(baseContent + buildServicesTable());
    } else {
      setContent(baseContent);
    }
  }, [includeServices]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Введите название документа');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('documents').insert({
        clinic_id: clinicId,
        patient_id: patientId,
        template_id: selectedTemplateId,
        title: title.trim(),
        type,
        content,
        status: 'draft',
        created_by: profile?.id
      });

      if (error) throw error;

      toast.success('Документ создан');
      onDocumentCreated();
      onOpenChange(false);
    } catch (err) {
      console.error('Error creating document:', err);
      toast.error('Ошибка при создании документа');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Создать документ</DialogTitle>
          <DialogDescription>
            Для пациента: {patientName}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'template' | 'custom')} className="flex-1 min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="template">Из шаблона</TabsTrigger>
            <TabsTrigger value="custom">Свой документ</TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="mt-4 flex-1 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Нет шаблонов</p>
                <p className="text-sm text-muted-foreground">
                  Создайте шаблоны в разделе «Документы»
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2 pr-4">
                  {templates.map((template) => (
                    <Card 
                      key={template.id}
                      className={`cursor-pointer transition-colors ${
                        selectedTemplateId === template.id 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => selectTemplate(template)}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{template.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {documentTypes.find(t => t.value === template.type)?.label || 'Документ'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="custom" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Название</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Договор на оказание услуг"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Тип документа</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((dt) => (
                      <SelectItem key={dt.value} value={dt.value}>
                        {dt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {(selectedTemplateId || activeTab === 'custom') && (
          <div className="space-y-3 mt-4">
            {/* Include services toggle */}
            {performedWorks.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Добавить оказанные услуги ({performedWorks.length})</span>
                </div>
                <Switch checked={includeServices} onCheckedChange={setIncludeServices} />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="content">Содержание</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Текст документа..."
                className="min-h-[150px] font-mono text-sm"
              />
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !title.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Создать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
