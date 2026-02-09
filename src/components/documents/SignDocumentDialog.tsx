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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { SignatureCanvas } from './SignatureCanvas';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
  Loader2, 
  FileText, 
  Shield,
  Clock,
  Globe,
  Smartphone
} from 'lucide-react';

interface Document {
  id: string;
  title: string;
  type: string | null;
  content: string | null;
}

interface SignDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document;
  onDocumentSigned: () => void;
}

export function SignDocumentDialog({
  open,
  onOpenChange,
  document,
  onDocumentSigned
}: SignDocumentDialogProps) {
  const [signing, setSigning] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [clientInfo, setClientInfo] = useState({
    ip: 'Определение...',
    device: '',
    timestamp: new Date()
  });

  useEffect(() => {
    if (open) {
      // Reset state
      setSignatureData(null);
      setAgreedToTerms(false);
      setClientInfo({
        ip: 'Определение...',
        device: navigator.userAgent.substring(0, 150),
        timestamp: new Date()
      });

      // Get IP address
      fetchClientIP();
    }
  }, [open]);

  const fetchClientIP = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      setClientInfo(prev => ({ ...prev, ip: data.ip }));
    } catch (err) {
      console.error('Error fetching IP:', err);
      setClientInfo(prev => ({ ...prev, ip: 'Не определён' }));
    }
  };

  const handleSign = async () => {
    if (!signatureData) {
      toast.error('Поставьте подпись');
      return;
    }

    if (!agreedToTerms) {
      toast.error('Подтвердите согласие с условиями');
      return;
    }

    setSigning(true);
    try {
      const signedAt = new Date().toISOString();

      const { error } = await supabase
        .from('documents')
        .update({
          status: 'signed',
          signature_data: signatureData,
          signed_at: signedAt,
          signed_ip: clientInfo.ip,
          signed_device: clientInfo.device
        })
        .eq('id', document.id);

      if (error) throw error;

      toast.success('Документ успешно подписан');
      onDocumentSigned();
      onOpenChange(false);
    } catch (err) {
      console.error('Error signing document:', err);
      toast.error('Ошибка при подписании документа');
    } finally {
      setSigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Электронная подпись
          </DialogTitle>
          <DialogDescription>
            Подпись документа: {document.title}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[200px] border rounded-lg p-4 bg-muted/30">
          <pre className="whitespace-pre-wrap font-sans text-sm">
            {document.content || 'Нет содержания документа'}
          </pre>
        </ScrollArea>

        <Separator />

        {/* Signature area */}
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium">Ваша подпись</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Используйте мышь или палец для подписи
            </p>
            <SignatureCanvas onSignatureChange={setSignatureData} />
          </div>

          {/* Terms agreement */}
          <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
            <Checkbox
              id="agree-terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
            />
            <Label htmlFor="agree-terms" className="text-sm leading-relaxed cursor-pointer">
              Я подтверждаю, что ознакомился(ась) с содержанием документа и согласен(на) 
              с его условиями. Моя электронная подпись имеет юридическую силу.
            </Label>
          </div>

          {/* Signing metadata */}
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Время</p>
                <p className="font-medium">
                  {format(clientInfo.timestamp, 'd MMM yyyy, HH:mm:ss', { locale: ru })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">IP-адрес</p>
                <p className="font-medium font-mono">{clientInfo.ip}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Устройство</p>
                <p className="font-medium truncate" title={clientInfo.device}>
                  {clientInfo.device.includes('Mobile') ? 'Мобильное' : 'Компьютер'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button 
            onClick={handleSign} 
            disabled={signing || !signatureData || !agreedToTerms}
          >
            {signing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Shield className="mr-2 h-4 w-4" />
            )}
            Подписать документ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
