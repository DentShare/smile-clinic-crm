import { useAdminAlerts, AdminAlert } from '@/hooks/use-admin-alerts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  Phone, 
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  XCircle,
  MessageCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

const severityConfig = {
  critical: {
    bg: 'bg-destructive/10 border-destructive/30',
    icon: XCircle,
    iconClass: 'text-destructive',
    badge: 'destructive' as const
  },
  warning: {
    bg: 'bg-orange-500/10 border-orange-500/30',
    icon: AlertTriangle,
    iconClass: 'text-orange-500',
    badge: 'outline' as const
  },
  info: {
    bg: 'bg-blue-500/10 border-blue-500/30',
    icon: Clock,
    iconClass: 'text-blue-500',
    badge: 'secondary' as const
  }
};

const AlertCard = ({ alert }: { alert: AdminAlert }) => {
  const config = severityConfig[alert.severity];
  const Icon = config.icon;

  const handleWhatsApp = () => {
    if (alert.data?.ownerPhone) {
      const phone = alert.data.ownerPhone.replace(/\D/g, '');
      window.open(`https://wa.me/${phone}`, '_blank');
    }
  };

  const handleTelegram = () => {
    if (alert.data?.ownerPhone) {
      const phone = alert.data.ownerPhone.replace(/\D/g, '');
      window.open(`https://t.me/+${phone}`, '_blank');
    }
  };

  return (
    <Card className={cn('border', config.bg)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={cn('mt-0.5', config.iconClass)}>
            <Icon className="h-5 w-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-foreground">{alert.title}</h4>
              <Badge variant={config.badge} className="text-xs">
                {alert.severity === 'critical' ? 'Критично' : 
                 alert.severity === 'warning' ? 'Внимание' : 'Инфо'}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3">
              {alert.description}
            </p>

            <div className="flex items-center gap-2 flex-wrap">
              {alert.data?.ownerPhone && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5"
                    onClick={handleWhatsApp}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5"
                    onClick={handleTelegram}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Telegram
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1.5 ml-auto"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Выполнено
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(alert.createdAt, { addSuffix: true, locale: ru })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const AdminAlerts = () => {
  const { alerts, isLoading, refetch } = useAdminAlerts();

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;
  const infoCount = alerts.filter(a => a.severity === 'info').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Алерты и уведомления</h1>
          <p className="text-slate-400">Мониторинг критических событий платформы</p>
        </div>
        <Button
          variant="outline"
          className="gap-2 border-slate-600 text-slate-300"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-4 w-4" />
          Обновить
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-destructive/10 border-destructive/30">
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="h-8 w-8 text-destructive" />
            <div>
              <p className="text-2xl font-bold text-destructive">{criticalCount}</p>
              <p className="text-sm text-destructive/80">Критических</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-500/10 border-orange-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold text-orange-500">{warningCount}</p>
              <p className="text-sm text-orange-500/80">Предупреждений</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <Bell className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold text-blue-500">{infoCount}</p>
              <p className="text-sm text-blue-500/80">Информационных</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert List */}
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <Card className="border-slate-700 bg-slate-800/50">
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-white mb-1">Всё в порядке!</h3>
              <p className="text-slate-400">Нет активных алертов требующих внимания</p>
            </CardContent>
          </Card>
        ) : (
          alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))
        )}
      </div>
    </div>
  );
};

export default AdminAlerts;
