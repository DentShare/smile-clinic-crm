import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePatientFinance, type LedgerEntry } from '@/hooks/use-patient-finance';
import { formatCurrency } from '@/lib/formatters';
import { Loader2, ArrowDownCircle } from 'lucide-react';

const LEDGER_PAGE_SIZE = 25;

interface PatientFinanceTimelineProps {
  patientId: string;
  maxHeight?: string;
}

function getEventTypeLabel(eventType: LedgerEntry['event_type']): string {
  switch (eventType) {
    case 'charge':
      return 'Списание';
    case 'payment':
      return 'Оплата';
    case 'refund':
      return 'Возврат';
    case 'adjustment':
      return 'Корректировка';
    case 'plan_created':
      return 'План';
    default:
      return eventType;
  }
}

function getEventTypeColor(eventType: LedgerEntry['event_type']): string {
  switch (eventType) {
    case 'charge':
      return 'text-destructive';
    case 'payment':
      return 'text-success';
    case 'refund':
      return 'text-muted-foreground';
    case 'adjustment':
      return 'text-primary';
    default:
      return '';
  }
}

export function PatientFinanceTimeline({ patientId, maxHeight = '300px' }: PatientFinanceTimelineProps) {
  const {
    ledger,
    ledgerTotal,
    loading,
    fetchLedger,
    loadMoreLedger,
  } = usePatientFinance(patientId);

  useEffect(() => {
    if (patientId) {
      fetchLedger(patientId, LEDGER_PAGE_SIZE, 0);
    }
  }, [patientId, fetchLedger]);

  const hasMore = ledger.length < ledgerTotal;
  const isLoadingMore = loading && ledger.length > 0;

  return (
    <div className="flex flex-col gap-2">
      <ScrollArea style={{ maxHeight }} className="pr-4">
        <div className="space-y-2">
          {loading && ledger.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : ledger.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Нет операций</p>
          ) : (
            ledger.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-2 py-2 border-b border-border/50 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{entry.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {getEventTypeLabel(entry.event_type)} •{' '}
                    {entry.created_at
                      ? new Date(entry.created_at).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span
                    className={`text-sm font-medium ${getEventTypeColor(entry.event_type)}`}
                  >
                    {entry.event_type === 'charge' || entry.event_type === 'refund'
                      ? `-${formatCurrency(Math.abs(entry.amount), false)}`
                      : `+${formatCurrency(entry.amount, false)}`}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full gap-2"
          onClick={() => loadMoreLedger(patientId, LEDGER_PAGE_SIZE, ledger.length)}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowDownCircle className="h-4 w-4" />
          )}
          Загрузить ещё ({ledger.length} из {ledgerTotal})
        </Button>
      )}
    </div>
  );
}
