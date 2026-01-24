import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowUpCircle, 
  ArrowDownCircle,
  ExternalLink,
  Receipt,
  ChevronDown
} from 'lucide-react';
import { usePatientFinance, LedgerEntry } from '@/hooks/use-patient-finance';
import { formatCurrency, formatDateTime } from '@/lib/formatters';

interface PatientLedgerProps {
  patientId: string;
  maxHeight?: string;
  showHeader?: boolean;
}

export function PatientLedger({ 
  patientId, 
  maxHeight = '400px',
  showHeader = true 
}: PatientLedgerProps) {
  const { ledger, loading, fetchLedger } = usePatientFinance(patientId);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchLedger();
  }, [patientId, fetchLedger]);

  if (loading && ledger.length === 0) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <CardTitle className="text-lg">Журнал операций</CardTitle>
          </CardHeader>
        )}
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (ledger.length === 0) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <CardTitle className="text-lg">Журнал операций</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Нет финансовых операций
          </p>
        </CardContent>
      </Card>
    );
  }

  const displayedLedger = expanded ? ledger : ledger.slice(0, 5);

  return (
    <Card>
      {showHeader && (
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            Журнал операций
            <Badge variant="secondary">{ledger.length}</Badge>
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ScrollArea style={{ maxHeight: expanded ? maxHeight : 'auto' }}>
          <div className="space-y-1">
            {displayedLedger.map((entry, index) => (
              <LedgerRow key={entry.id} entry={entry} isLast={index === displayedLedger.length - 1} />
            ))}
          </div>
        </ScrollArea>
        
        {ledger.length > 5 && !expanded && (
          <Button 
            variant="ghost" 
            className="w-full mt-2" 
            onClick={() => setExpanded(true)}
          >
            <ChevronDown className="h-4 w-4 mr-2" />
            Показать все ({ledger.length - 5} ещё)
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function LedgerRow({ entry, isLast }: { entry: LedgerEntry; isLast: boolean }) {
  const isCredit = entry.type === 'credit';
  
  return (
    <div className={`flex items-center justify-between py-3 ${!isLast ? 'border-b border-border/50' : ''}`}>
      <div className="flex items-center gap-3">
        {isCredit ? (
          <ArrowUpCircle className="h-8 w-8 text-emerald-500" />
        ) : (
          <ArrowDownCircle className="h-8 w-8 text-orange-500" />
        )}
        <div>
          <p className="font-medium text-sm">{entry.description}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatDateTime(entry.date)}</span>
            {entry.tooth_number && (
              <Badge variant="outline" className="text-xs py-0 px-1">
                Зуб {entry.tooth_number}
              </Badge>
            )}
            {entry.is_fiscalized && (
              <Badge variant="secondary" className="text-xs py-0 px-1 gap-1">
                <Receipt className="h-3 w-3" />
                Фискализировано
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      <div className="text-right">
        <p className={`font-semibold ${isCredit ? 'text-emerald-600' : 'text-foreground'}`}>
          {isCredit ? '+' : ''}{formatCurrency(entry.amount)}
        </p>
        <p className="text-xs text-muted-foreground">
          Баланс: {formatCurrency(entry.balance_after)}
        </p>
        {entry.fiscal_url && (
          <a 
            href={entry.fiscal_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            Чек <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}
