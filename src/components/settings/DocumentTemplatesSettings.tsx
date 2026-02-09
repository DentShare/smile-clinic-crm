import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  FileText, 
  FileCheck, 
  FilePenLine,
  Loader2,
  Copy,
  Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface DocumentTemplate {
  id: string;
  name: string;
  type: string | null;
  content: string;
  is_default: boolean;
  created_at: string;
}

const documentTypes = [
  { value: 'contract', label: 'Договор', icon: FileText },
  { value: 'consent', label: 'Согласие', icon: FileCheck },
  { value: 'treatment_plan', label: 'План лечения', icon: FilePenLine },
  { value: 'act', label: 'Акт выполненных работ', icon: FileText },
  { value: 'invoice', label: 'Счёт', icon: FileText },
];

const placeholders = [
  { key: '{{patient_name}}', description: 'ФИО пациента' },
  { key: '{{date}}', description: 'Текущая дата' },
  { key: '{{clinic_name}}', description: 'Название клиники' },
  { key: '{{doctor_name}}', description: 'ФИО врача' },
];

export function DocumentTemplatesSettings() {
  const { clinic } = useAuth();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<DocumentTemplate | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [type, setType] = useState('contract');
  const [content, setContent] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (clinic?.id) {
      fetchTemplates();
    }
  }, [clinic?.id]);

  const fetchTemplates = async () => {
    if (!clinic?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('clinic_id', clinic.id)
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
      toast.error('Ошибка загрузки шаблонов');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setName('');
    setType('contract');
    setContent('');
    setIsDefault(false);
    setIsDialogOpen(true);
  };

  const openEditDialog = (template: DocumentTemplate) => {
    setEditingTemplate(template);
    setName(template.name);
    setType(template.type || 'contract');
    setContent(template.content);
    setIsDefault(template.is_default);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!clinic?.id) return;
    if (!name.trim()) {
      toast.error('Введите название шаблона');
      return;
    }

    setSaving(true);
    try {
      if (editingTemplate) {
        // Update existing
        const { error } = await supabase
          .from('document_templates')
          .update({
            name: name.trim(),
            type,
            content,
            is_default: isDefault
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast.success('Шаблон обновлён');
      } else {
        // Create new
        const { error } = await supabase
          .from('document_templates')
          .insert({
            clinic_id: clinic.id,
            name: name.trim(),
            type,
            content,
            is_default: isDefault
          });

        if (error) throw error;
        toast.success('Шаблон создан');
      }

      setIsDialogOpen(false);
      fetchTemplates();
    } catch (err) {
      console.error('Error saving template:', err);
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTemplate) return;

    try {
      const { error } = await supabase
        .from('document_templates')
        .delete()
        .eq('id', deleteTemplate.id);

      if (error) throw error;
      toast.success('Шаблон удалён');
      setDeleteTemplate(null);
      fetchTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
      toast.error('Ошибка удаления');
    }
  };

  const duplicateTemplate = async (template: DocumentTemplate) => {
    if (!clinic?.id) return;

    try {
      const { error } = await supabase
        .from('document_templates')
        .insert({
          clinic_id: clinic.id,
          name: `${template.name} (копия)`,
          type: template.type,
          content: template.content,
          is_default: false
        });

      if (error) throw error;
      toast.success('Шаблон скопирован');
      fetchTemplates();
    } catch (err) {
      console.error('Error duplicating template:', err);
      toast.error('Ошибка копирования');
    }
  };

  const insertPlaceholder = (placeholder: string) => {
    setContent(prev => prev + placeholder);
  };

  const getTypeLabel = (typeValue: string | null) => {
    return documentTypes.find(t => t.value === typeValue)?.label || 'Документ';
  };

  const getTypeIcon = (typeValue: string | null) => {
    switch (typeValue) {
      case 'consent':
        return <FileCheck className="h-4 w-4" />;
      case 'treatment_plan':
        return <FilePenLine className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Шаблоны документов</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Шаблоны документов</CardTitle>
              <CardDescription>
                Создавайте шаблоны договоров, согласий и других документов
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Новый шаблон
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Нет шаблонов</p>
              <p className="text-sm text-muted-foreground mb-4">
                Создайте первый шаблон для быстрого оформления документов
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Создать шаблон
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Дата создания</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(template.type)}
                        <span className="font-medium">{template.name}</span>
                        {template.is_default && (
                          <Badge variant="secondary" className="text-xs">
                            По умолчанию
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getTypeLabel(template.type)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(template.created_at), 'd MMM yyyy', { locale: ru })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(template)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => duplicateTemplate(template)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTemplate(template)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Редактировать шаблон' : 'Новый шаблон'}
            </DialogTitle>
            <DialogDescription>
              Используйте переменные для автозаполнения данных пациента
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Название</Label>
                <Input
                  id="template-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Договор на оказание услуг"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-type">Тип документа</Label>
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

            {/* Placeholders help */}
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Переменные для автозаполнения:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {placeholders.map((p) => (
                  <Button
                    key={p.key}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => insertPlaceholder(p.key)}
                  >
                    {p.key}
                    <span className="ml-1 text-muted-foreground">({p.description})</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-content">Содержание шаблона</Label>
              <Textarea
                id="template-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Введите текст документа..."
                className="min-h-[250px] font-mono text-sm"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingTemplate ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTemplate} onOpenChange={(open) => !open && setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить шаблон?</AlertDialogTitle>
            <AlertDialogDescription>
              Шаблон «{deleteTemplate?.name}» будет удалён. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
