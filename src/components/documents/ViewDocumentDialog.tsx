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
import { SignDocumentDialog } from './SignDocumentDialog';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
  FileText, 
  Printer,
  CheckCircle,
  PenLine,
  Clock,
  Globe,
  Smartphone
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
  signature_data?: string | null;
  signed_ip?: string | null;
  signed_device?: string | null;
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
  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);

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
              .signature-section {
                margin-top: 60px;
                border-top: 1px solid #ccc;
                padding-top: 20px;
              }
              .signature-image {
                max-width: 300px;
                margin: 10px 0;
              }
              .signature-meta {
                font-size: 12px;
                color: #666;
              }
            </style>
          </head>
          <body>
            <h1>${document.title}</h1>
            <div class="content">${document.content || ''}</div>
            ${document.status === 'signed' ? `
              <div class="signature-section">
                <p><strong>Документ подписан электронной подписью</strong></p>
                ${document.signature_data ? `<img src="${document.signature_data}" class="signature-image" alt="Подпись" />` : ''}
                <div class="signature-meta">
                  <p>Дата и время: ${document.signed_at ? format(new Date(document.signed_at), 'd MMMM yyyy, HH:mm:ss', { locale: ru }) : ''}</p>
                  <p>IP-адрес: ${document.signed_ip || 'Не указан'}</p>
                  <p>Устройство: ${document.signed_device ? (document.signed_device.includes('Mobile') ? 'Мобильное устройство' : 'Компьютер') : 'Не указано'}</p>
                </div>
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
    <>
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

          <ScrollArea className="flex-1 min-h-0 max-h-[300px]">
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

          {/* Signature display for signed documents */}
          {document.status === 'signed' && (
            <div className="space-y-3">
              <Separator />
              
              <div className="p-4 bg-success/5 border border-success/20 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="font-medium text-success">Документ подписан</span>
                </div>
                
                {/* Signature image */}
                {document.signature_data && (
                  <div className="mb-3 p-2 bg-white rounded border">
                    <img 
                      src={document.signature_data} 
                      alt="Подпись пациента" 
                      className="max-h-20 mx-auto"
                    />
                  </div>
                )}

                {/* Signing metadata */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Время подписания</p>
                      <p className="font-medium">
                        {document.signed_at 
                          ? format(new Date(document.signed_at), 'd MMM yyyy, HH:mm', { locale: ru })
                          : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">IP-адрес</p>
                      <p className="font-medium font-mono">{document.signed_ip || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Устройство</p>
                      <p className="font-medium">
                        {document.signed_device 
                          ? (document.signed_device.includes('Mobile') ? 'Мобильное' : 'Компьютер')
                          : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Печать
            </Button>
            
            {document.status !== 'signed' && (
              <Button onClick={() => setIsSignDialogOpen(true)}>
                <PenLine className="mr-2 h-4 w-4" />
                Подписать
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Signing dialog */}
      <SignDocumentDialog
        open={isSignDialogOpen}
        onOpenChange={setIsSignDialogOpen}
        document={document}
        onDocumentSigned={() => {
          onDocumentUpdated();
          onOpenChange(false);
        }}
      />
    </>
  );
}
