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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { SignDocumentDialog } from './SignDocumentDialog';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
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
  patient_id?: string;
  created_by?: string | null;
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
  const { clinic } = useAuth();
  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [doctorName, setDoctorName] = useState('');

  useEffect(() => {
    if (open && document) {
      fetchDocumentMeta();
    }
  }, [open, document]);

  const fetchDocumentMeta = async () => {
    // Fetch patient name
    if (document.patient_id) {
      const { data: patient } = await supabase
        .from('patients')
        .select('full_name')
        .eq('id', document.patient_id)
        .single();
      if (patient) setPatientName(patient.full_name);
    }
    // Fetch doctor/creator name
    if (document.created_by) {
      const { data: creator } = await supabase
        .from('profiles')
        .select('full_name, specialization')
        .eq('id', document.created_by)
        .single();
      if (creator) setDoctorName(creator.full_name + (creator.specialization ? `, ${creator.specialization}` : ''));
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const clinicName = clinic?.name || '';
      const clinicAddress = clinic?.address || '';
      const clinicPhone = clinic?.phone || '';
      const createdDate = format(new Date(document.created_at), 'd MMMM yyyy г.', { locale: ru });

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${document.title}</title>
            <style>
              @page { margin: 20mm; }
              body { 
                font-family: 'Times New Roman', Times, serif; 
                padding: 0; 
                margin: 0;
                line-height: 1.6;
                color: #1a1a1a;
                font-size: 14px;
              }
              .header {
                text-align: center;
                border-bottom: 2px solid #1a1a1a;
                padding-bottom: 16px;
                margin-bottom: 24px;
              }
              .header .clinic-name {
                font-size: 20px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 4px;
              }
              .header .clinic-info {
                font-size: 12px;
                color: #444;
              }
              .meta-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 20px;
                font-size: 12px;
                color: #666;
              }
              .doc-title {
                text-align: center;
                font-size: 18px;
                font-weight: bold;
                text-transform: uppercase;
                margin: 24px 0;
                letter-spacing: 0.5px;
              }
              .info-block {
                border: 1px solid #ccc;
                border-radius: 4px;
                padding: 12px 16px;
                margin-bottom: 20px;
                font-size: 13px;
              }
              .info-block .row {
                display: flex;
                gap: 24px;
                margin-bottom: 4px;
              }
              .info-block .label {
                font-weight: bold;
                min-width: 120px;
              }
              .content {
                white-space: pre-wrap;
                font-size: 14px;
                line-height: 1.8;
              }
              .signature-section {
                margin-top: 60px;
                border-top: 1px solid #ccc;
                padding-top: 20px;
              }
              .signature-image {
                max-width: 250px;
                margin: 10px 0;
              }
              .signature-meta {
                font-size: 11px;
                color: #666;
              }
              .signatures-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 40px;
                margin-top: 60px;
              }
              .sig-line {
                border-bottom: 1px solid #1a1a1a;
                height: 50px;
                margin-bottom: 4px;
              }
              .sig-label {
                font-size: 12px;
                color: #666;
              }
              .footer {
                margin-top: 40px;
                text-align: center;
                font-size: 10px;
                color: #999;
                border-top: 1px solid #ddd;
                padding-top: 8px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="clinic-name">${clinicName}</div>
              ${clinicAddress ? `<div class="clinic-info">${clinicAddress}</div>` : ''}
              ${clinicPhone ? `<div class="clinic-info">Тел: ${clinicPhone}</div>` : ''}
            </div>

            <div class="meta-row">
              <span>${createdDate}</span>
              <span>${documentTypeLabels[document.type || ''] || 'Документ'}</span>
            </div>

            <div class="doc-title">${document.title}</div>

            <div class="info-block">
              <div class="row">
                <span class="label">Пациент:</span>
                <span>${patientName || '—'}</span>
              </div>
              ${doctorName ? `<div class="row"><span class="label">Лечащий врач:</span><span>${doctorName}</span></div>` : ''}
              <div class="row">
                <span class="label">Дата:</span>
                <span>${createdDate}</span>
              </div>
            </div>

            <div class="content">${document.content || ''}</div>
            
            ${document.status === 'signed' ? `
              <div class="signature-section">
                <p><strong>Документ подписан электронной подписью</strong></p>
                ${document.signature_data ? `<img src="${document.signature_data}" class="signature-image" alt="Подпись" />` : ''}
                <div class="signature-meta">
                  <p>Дата: ${document.signed_at ? format(new Date(document.signed_at), 'd MMMM yyyy, HH:mm:ss', { locale: ru }) : ''}</p>
                  <p>IP: ${document.signed_ip || '—'}</p>
                  <p>Устройство: ${document.signed_device ? (document.signed_device.includes('Mobile') ? 'Мобильное' : 'ПК') : '—'}</p>
                </div>
              </div>
            ` : `
              <div class="signatures-grid">
                <div>
                  <div class="sig-line"></div>
                  <div class="sig-label">Врач: ________________________</div>
                </div>
                <div>
                  <div class="sig-line"></div>
                  <div class="sig-label">Пациент: ________________________</div>
                </div>
              </div>
            `}

            <div class="footer">
              Документ сформирован ${clinicName} • ${format(new Date(), 'dd.MM.yyyy HH:mm', { locale: ru })}
            </div>
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
                
                {document.signature_data && (
                  <div className="mb-3 p-2 bg-white rounded border">
                    <img 
                      src={document.signature_data} 
                      alt="Подпись пациента" 
                      className="max-h-20 mx-auto"
                    />
                  </div>
                )}

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
