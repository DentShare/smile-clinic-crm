import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  Plus, 
  FileCheck,
  FilePenLine,
  Download,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CreateDocumentDialog } from './CreateDocumentDialog';
import { ViewDocumentDialog } from './ViewDocumentDialog';

interface Document {
  id: string;
  title: string;
  type: string | null;
  status: string | null;
  signed_at: string | null;
  created_at: string;
  content: string | null;
  file_url: string | null;
  signature_data: string | null;
  signed_ip: string | null;
  signed_device: string | null;
}

interface PatientDocumentsCardProps {
  patientId: string;
  patientName: string;
  clinicId: string;
}

const documentTypeLabels: Record<string, string> = {
  contract: 'Договор',
  consent: 'Согласие',
  treatment_plan: 'План лечения',
  act: 'Акт',
  invoice: 'Счёт'
};

const documentStatusLabels: Record<string, string> = {
  draft: 'Черновик',
  sent: 'Отправлен',
  signed: 'Подписан',
  archived: 'Архив'
};

export function PatientDocumentsCard({ patientId, patientName, clinicId }: PatientDocumentsCardProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewDocument, setViewDocument] = useState<Document | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [patientId]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id, title, type, status, signed_at, created_at, content, file_url, signature_data, signed_ip, signed_device')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'signed':
        return <Badge variant="default" className="bg-success text-success-foreground">Подписан</Badge>;
      case 'sent':
        return <Badge variant="secondary">Отправлен</Badge>;
      case 'archived':
        return <Badge variant="outline">Архив</Badge>;
      default:
        return <Badge variant="outline">Черновик</Badge>;
    }
  };

  const getTypeIcon = (type: string | null) => {
    switch (type) {
      case 'consent':
        return <FileCheck className="h-4 w-4 text-primary" />;
      case 'treatment_plan':
        return <FilePenLine className="h-4 w-4 text-primary" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Документы
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Документы
            </span>
            {documents.length > 0 && (
              <Badge variant="secondary" className="font-normal">
                {documents.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-2">
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">
              Нет документов
            </p>
          ) : (
            documents.slice(0, 5).map((doc) => (
              <div 
                key={doc.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer group"
                onClick={() => setViewDocument(doc)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {getTypeIcon(doc.type)}
                  <div className="min-w-0">
                    <span className="text-sm truncate block">{doc.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(doc.created_at), 'd MMM yyyy', { locale: ru })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {getStatusBadge(doc.status)}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewDocument(doc);
                    }}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Добавить документ
          </Button>
        </CardContent>
      </Card>

      <CreateDocumentDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        patientId={patientId}
        patientName={patientName}
        clinicId={clinicId}
        onDocumentCreated={fetchDocuments}
      />

      {viewDocument && (
        <ViewDocumentDialog
          open={!!viewDocument}
          onOpenChange={(open) => !open && setViewDocument(null)}
          document={viewDocument}
          onDocumentUpdated={fetchDocuments}
        />
      )}
    </>
  );
}
