import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Activity, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface SystemStatus {
  api: 'up' | 'down' | 'checking';
  database: 'up' | 'down' | 'checking';
  apiLatency: number | null;
  dbLatency: number | null;
  lastChecked: Date | null;
}

interface SystemLog {
  id: string;
  clinic_id: string | null;
  level: string;
  message: string;
  details: any;
  source: string | null;
  created_at: string;
  clinic_name?: string;
}

const AdminSystemHealth = () => {
  const [status, setStatus] = useState<SystemStatus>({
    api: 'checking', database: 'checking', apiLatency: null, dbLatency: null, lastChecked: null,
  });
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>('all');

  const checkHealth = useCallback(async () => {
    setStatus(prev => ({ ...prev, api: 'checking', database: 'checking' }));
    const apiStart = Date.now();
    let apiStatus: 'up' | 'down' = 'down';
    let apiLatency = 0;
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
        headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      });
      apiLatency = Date.now() - apiStart;
      apiStatus = response.ok ? 'up' : 'down';
    } catch {
      apiLatency = Date.now() - apiStart;
    }
    const dbStart = Date.now();
    let dbStatus: 'up' | 'down' = 'down';
    let dbLatency = 0;
    try {
      const { error } = await supabase.from('clinics').select('id').limit(1);
      dbLatency = Date.now() - dbStart;
      dbStatus = error ? 'down' : 'up';
    } catch {
      dbLatency = Date.now() - dbStart;
    }
    setStatus({ api: apiStatus, database: dbStatus, apiLatency, dbLatency, lastChecked: new Date() });
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      let query = supabase.from('system_logs').select('*, clinics(name)').order('created_at', { ascending: false }).limit(100);
      if (levelFilter !== 'all') query = query.eq('level', levelFilter);
      const { data, error } = await query;
      if (error) throw error;
      setLogs((data || []).map((log: any) => ({ ...log, clinic_name: log.clinics?.name || null })));
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLogsLoading(false);
    }
  }, [levelFilter]);

  useEffect(() => { checkHealth(); fetchLogs(); }, [checkHealth, fetchLogs]);

  const StatusIndicator = ({ state, label, latency }: { state: 'up' | 'down' | 'checking'; label: string; latency: number | null }) => (
    <Card className={cn(
      'border-2',
      state === 'up' && 'border-chart-2/50 bg-chart-2/5',
      state === 'down' && 'border-destructive/50 bg-destructive/5',
      state === 'checking' && 'border-muted'
    )}>
      <CardContent className="p-6 flex items-center gap-4">
        {state === 'up' && <CheckCircle2 className="h-10 w-10 text-chart-2" />}
        {state === 'down' && <XCircle className="h-10 w-10 text-destructive" />}
        {state === 'checking' && <RefreshCw className="h-10 w-10 text-muted-foreground animate-spin" />}
        <div>
          <p className="text-lg font-semibold text-foreground">{label}</p>
          <p className={cn('text-sm', state === 'up' && 'text-chart-2', state === 'down' && 'text-destructive', state === 'checking' && 'text-muted-foreground')}>
            {state === 'up' ? 'Работает' : state === 'down' ? 'Недоступен' : 'Проверка...'}
          </p>
          {latency !== null && <p className="text-xs text-muted-foreground mt-1">Задержка: {latency}ms</p>}
        </div>
      </CardContent>
    </Card>
  );

  const levelConfig: Record<string, { icon: typeof AlertTriangle; color: string; label: string }> = {
    error: { icon: XCircle, color: 'text-destructive', label: 'Ошибка' },
    warning: { icon: AlertTriangle, color: 'text-orange-500', label: 'Предупреждение' },
    info: { icon: Activity, color: 'text-blue-500', label: 'Инфо' },
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Состояние системы</h1>
          <p className="text-muted-foreground">Мониторинг работоспособности платформы</p>
        </div>
        <div className="flex items-center gap-3">
          {status.lastChecked && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Проверено: {format(status.lastChecked, 'HH:mm:ss', { locale: ru })}
            </span>
          )}
          <Button variant="outline" className="gap-2" onClick={() => { checkHealth(); fetchLogs(); }}>
            <RefreshCw className="h-4 w-4" />
            Проверить
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatusIndicator state={status.api} label="API (REST)" latency={status.apiLatency} />
        <StatusIndicator state={status.database} label="База данных" latency={status.dbLatency} />
      </div>

      <Card className={cn('border-2', status.api === 'up' && status.database === 'up' ? 'border-chart-2/30 bg-chart-2/5' : 'border-destructive/30 bg-destructive/5')}>
        <CardContent className="p-4 flex items-center justify-center gap-3">
          {status.api === 'up' && status.database === 'up' ? (
            <><CheckCircle2 className="h-6 w-6 text-chart-2" /><span className="text-lg font-semibold text-chart-2">Все системы работают нормально</span></>
          ) : (
            <><XCircle className="h-6 w-6 text-destructive" /><span className="text-lg font-semibold text-destructive">Обнаружены проблемы</span></>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Журнал событий</CardTitle>
              <CardDescription>Последние системные события и ошибки</CardDescription>
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все уровни</SelectItem>
                <SelectItem value="error">Ошибки</SelectItem>
                <SelectItem value="warning">Предупреждения</SelectItem>
                <SelectItem value="info">Информация</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Загрузка журнала...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-chart-2 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-foreground mb-1">Чисто!</h3>
              <p className="text-muted-foreground">Нет записей в журнале</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Уровень</TableHead>
                    <TableHead className="w-[160px]">Дата</TableHead>
                    <TableHead>Сообщение</TableHead>
                    <TableHead>Клиника</TableHead>
                    <TableHead>Источник</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const config = levelConfig[log.level] || levelConfig.info;
                    const Icon = config.icon;
                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge variant={log.level === 'error' ? 'destructive' : 'outline'} className="gap-1">
                            <Icon className={cn('h-3 w-3', config.color)} />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(log.created_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate text-sm">{log.message}</TableCell>
                        <TableCell className="text-sm">{log.clinic_name || (log.clinic_id ? log.clinic_id.slice(0, 8) + '...' : '—')}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{log.source || '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSystemHealth;
