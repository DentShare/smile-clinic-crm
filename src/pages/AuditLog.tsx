import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Shield, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAuditLog, getTableLabel, getActionLabel, type AuditLogEntry } from '@/hooks/use-audit-log';

const AuditLog = () => {
  const [action, setAction] = useState('');
  const [tableName, setTableName] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const pageSize = 50;

  const filters = {
    action: action || undefined,
    tableName: tableName || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const { data, isLoading } = useAuditLog(filters, page, pageSize);
  const entries = data?.data || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const actionVariant = (act: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (act === 'DELETE') return 'destructive';
    if (act === 'CREATE') return 'default';
    if (act === 'UPDATE') return 'secondary';
    return 'outline';
  };

  const renderChanges = (entry: AuditLogEntry) => {
    if (entry.action === 'CREATE' && entry.new_values) {
      return (
        <div className="space-y-1">
          <p className="text-sm font-medium mb-2">Созданная запись:</p>
          <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-[400px]">
            {JSON.stringify(entry.new_values, null, 2)}
          </pre>
        </div>
      );
    }

    if (entry.action === 'DELETE' && entry.old_values) {
      return (
        <div className="space-y-1">
          <p className="text-sm font-medium mb-2">Удалённая запись:</p>
          <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-[400px]">
            {JSON.stringify(entry.old_values, null, 2)}
          </pre>
        </div>
      );
    }

    if (entry.action === 'UPDATE' && entry.old_values && entry.new_values) {
      const changes: { field: string; from: unknown; to: unknown }[] = [];
      const newVals = entry.new_values as Record<string, unknown>;
      const oldVals = entry.old_values as Record<string, unknown>;
      for (const key of Object.keys(newVals)) {
        if (key === 'updated_at') continue;
        if (JSON.stringify(oldVals[key]) !== JSON.stringify(newVals[key])) {
          changes.push({ field: key, from: oldVals[key], to: newVals[key] });
        }
      }

      if (changes.length === 0) {
        return <p className="text-sm text-muted-foreground">Нет видимых изменений</p>;
      }

      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Поле</TableHead>
              <TableHead>Было</TableHead>
              <TableHead>Стало</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {changes.map((c) => (
              <TableRow key={c.field}>
                <TableCell className="font-mono text-xs">{c.field}</TableCell>
                <TableCell className="text-xs text-red-600 max-w-[200px] truncate">
                  {c.from === null ? 'null' : String(c.from)}
                </TableCell>
                <TableCell className="text-xs text-green-600 max-w-[200px] truncate">
                  {c.to === null ? 'null' : String(c.to)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }

    return <p className="text-sm text-muted-foreground">Нет деталей</p>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Журнал аудита
        </h1>
        <p className="text-muted-foreground">История всех изменений в системе</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select value={action} onValueChange={(v) => { setAction(v === 'all' ? '' : v); setPage(0); }}>
              <SelectTrigger>
                <SelectValue placeholder="Все действия" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все действия</SelectItem>
                <SelectItem value="CREATE">Создание</SelectItem>
                <SelectItem value="UPDATE">Изменение</SelectItem>
                <SelectItem value="DELETE">Удаление</SelectItem>
              </SelectContent>
            </Select>

            <Select value={tableName} onValueChange={(v) => { setTableName(v === 'all' ? '' : v); setPage(0); }}>
              <SelectTrigger>
                <SelectValue placeholder="Все таблицы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все таблицы</SelectItem>
                <SelectItem value="patients">Пациенты</SelectItem>
                <SelectItem value="appointments">Приёмы</SelectItem>
                <SelectItem value="payments">Платежи</SelectItem>
                <SelectItem value="performed_works">Выполненные работы</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
              placeholder="Дата от"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
              placeholder="Дата до"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Записи ({totalCount})</span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page + 1} / {totalPages}
                </span>
                <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Нет записей за выбранный период
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата/Время</TableHead>
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Действие</TableHead>
                    <TableHead>Таблица</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(entry.created_at), 'dd.MM.yyyy HH:mm:ss', { locale: ru })}
                      </TableCell>
                      <TableCell className="text-sm">{entry.user_name}</TableCell>
                      <TableCell>
                        <Badge variant={actionVariant(entry.action)}>
                          {getActionLabel(entry.action)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{getTableLabel(entry.table_name)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedEntry(entry)} title="Подробнее">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Детали записи
              {selectedEntry && (
                <Badge variant={actionVariant(selectedEntry.action)}>
                  {getActionLabel(selectedEntry.action)}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Дата:</span>{' '}
                  {format(new Date(selectedEntry.created_at), 'dd.MM.yyyy HH:mm:ss', { locale: ru })}
                </div>
                <div>
                  <span className="text-muted-foreground">Пользователь:</span>{' '}
                  {selectedEntry.user_name}
                </div>
                <div>
                  <span className="text-muted-foreground">Таблица:</span>{' '}
                  {getTableLabel(selectedEntry.table_name)}
                </div>
                <div>
                  <span className="text-muted-foreground">ID записи:</span>{' '}
                  <code className="text-xs">{selectedEntry.record_id || '—'}</code>
                </div>
              </div>
              {renderChanges(selectedEntry)}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLog;
