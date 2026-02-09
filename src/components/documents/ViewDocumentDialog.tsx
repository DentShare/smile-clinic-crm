import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
  Loader2, 
  FileText, 
  FileCheck,
  Printer,
  Download,
  CheckCircle,
  PenLine
} from 'lucide-react';

interface Document {
  id: string;
  title: string;
  type: string | null;
  status: string | null;
  signed_at: string | null;
  created_at: string;
  content: string | null;
  file_url: string | null;
}

interface ViewDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document;
  onDocumentUpdated: () => void;
}

const documentTypeLabels: Record<string, string> = {
  contract: 'Договор',
  consent: 'Согласие',
  treatment_plan: 'План лечения',
  act: 'Акт',
  invoice: 'Счёт'
};

export function ViewDocumentDialog({
  open,
  onOpenChange,
  document,
  onDocumentUpdated
}: ViewDocumentDialogProps) {
  const [signing, setSigning] = useState(false);

  const handleSign = async () => {
    setSigning(true);
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString(),
          signed_ip: 'клиника', // In real app, get actual IP
          signed_device: navigator.userAgent.substring(0, 100)
        })
        .eq('id', document.id);

      if (error) throw error;

      toast.success('Документ подписан');
      onDocumentUpdated();
      onOpenChange(false);
    } catch (err) {
      console.error('Error signing document:', err);
      toast.error('Ошибка при подписании');
    } finally {
      setSigning(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${document.title}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                padding: 40px; 
                line-height: 1.6;
              }
              h1 { 
                font-size: 18px; 
                margin-bottom: 20px; 
              }
              .content {
                white-space: pre-wrap;
              }
              .signature {
                margin-top: 60px;
                border-top: 1px solid #ccc;
                padding-top: 10px;
              }
            </style>
          </head>
          <body>
            <h1>${document.title}</h1>
            <div class="content">${document.content || ''}</div>
            ${document.status === 'signed' ? `
              <div class="signature">
                <p>Подписано: ${document.signed_at ? format(new Date(document.signed_at), 'd MMMM yyyy, HH:mm', { locale: ru }) : ''}</p>
              </div>
            ` : ''}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'signed':
        return (
          <Badge variant="default" className="bg-success text-success-foreground gap-1">
            <CheckCircle className="h-3 w-3" />
            Подписан
          </Badge>
        );
      case 'sent':
        return <Badge variant="secondary">Отправлен</Badge>;
      case 'archived':
        return <Badge variant="outline">Архив</Badge>;
      default:
        return <Badge variant="outline">Черновик</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {document.title}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {documentTypeLabels[document.type || ''] || 'Документ'} • 
                {' '}Создан {format(new Date(document.created_at), 'd MMMM yyyy', { locale: ru })}
              </DialogDescription>
            </div>
            {getStatusBadge(document.status)}
          </div>
        </DialogHeader>

        <Separator />

        <ScrollArea className="flex-1 min-h-0 max-h-[400px]">
          <div className="p-4 bg-muted/30 rounded-lg">
            {document.content ? (
              <pre className="whitespace-pre-wrap font-sans text-sm">
                {document.content}
              </pre>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Нет содержания
              </p>
            )}
          </div>
        </ScrollArea>

        {document.status === 'signed' && document.signed_at && (
          <div className="p-3 bg-success/10 rounded-lg flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-success" />
            <span>
              Подписано {format(new Date(document.signed_at), 'd MMMM yyyy в HH:mm', { locale: ru })}
            </span>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Печать
          </Button>
          
          {document.status !== 'signed' && (
            <Button onClick={handleSign} disabled={signing}>
              {signing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PenLine className="mr-2 h-4 w-4" />
              )}
              Подписать
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
