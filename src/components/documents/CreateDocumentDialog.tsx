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
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, FileText, FileCheck, FilePenLine } from 'lucide-react';

interface DocumentTemplate {
  id: string;
  name: string;
  type: string | null;
  content: string;
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
  const { profile } = useAuth();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'template' | 'custom'>('template');
  
  // Form fields
  const [title, setTitle] = useState('');
  const [type, setType] = useState('contract');
  const [content, setContent] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchTemplates();
      resetForm();
    }
  }, [open, clinicId]);

  const resetForm = () => {
    setTitle('');
    setType('contract');
    setContent('');
    setSelectedTemplateId(null);
    setActiveTab('template');
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

  const selectTemplate = (template: DocumentTemplate) => {
    setSelectedTemplateId(template.id);
    setTitle(template.name);
    setType(template.type || 'contract');
    // Replace placeholders in content
    let filledContent = template.content;
    filledContent = filledContent.replace(/\{\{patient_name\}\}/g, patientName);
    filledContent = filledContent.replace(/\{\{date\}\}/g, new Date().toLocaleDateString('ru-RU'));
    setContent(filledContent);
  };

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
                  Создайте шаблоны в настройках клиники
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
          <div className="space-y-2 mt-4">
            <Label htmlFor="content">Содержание</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Текст документа..."
              className="min-h-[150px]"
            />
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
