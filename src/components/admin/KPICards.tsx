import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Building2, Clock, AlertTriangle, DollarSign } from 'lucide-react';
import type { SuperAdminKPIs } from '@/types/superAdmin';
import { cn } from '@/lib/utils';

interface KPICardsProps {
  kpis: SuperAdminKPIs;
  loading?: boolean;
}

export function KPICards({ kpis, loading }: KPICardsProps) {
  const cards = [
    {
      title: 'MRR',
      value: `${kpis.mrr.toLocaleString('ru-RU')} сум`,
      change: kpis.mrrGrowth,
      changeLabel: 'vs прошлый месяц',
      icon: DollarSign,
      color: 'text-chart-2',
      bgColor: 'bg-chart-2/10',
    },
    {
      title: 'Активные клиники',
      value: kpis.activeClinics.toString(),
      subtitle: `из ${kpis.totalClinics} всего`,
      icon: Building2,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Trial истекает',
      value: kpis.trialExpiring.toString(),
      subtitle: 'в ближайшие 3 дня',
      icon: Clock,
      color: 'text-chart-4',
      bgColor: 'bg-chart-4/10',
      urgent: kpis.trialExpiring > 0,
    },
    {
      title: 'Churn Rate',
      value: `${kpis.churnRate}%`,
      icon: AlertTriangle,
      color: kpis.churnRate > 5 ? 'text-destructive' : 'text-chart-3',
      bgColor: kpis.churnRate > 5 ? 'bg-destructive/10' : 'bg-chart-3/10',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-4">
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card 
          key={card.title} 
          className={cn(
            "transition-all hover:shadow-md",
            card.urgent && "ring-2 ring-chart-4/50"
          )}
        >
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-bold tracking-tight">{card.value}</p>
                {card.change !== undefined && (
                  <div className="flex items-center gap-1 text-xs">
                    {card.change >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-chart-2" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-destructive" />
                    )}
                    <span className={card.change >= 0 ? 'text-chart-2' : 'text-destructive'}>
                      {card.change >= 0 ? '+' : ''}{card.change}%
                    </span>
                    <span className="text-muted-foreground">{card.changeLabel}</span>
                  </div>
                )}
                {card.subtitle && (
                  <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                )}
              </div>
              <div className={cn("p-2 rounded-lg", card.bgColor)}>
                <card.icon className={cn("h-5 w-5", card.color)} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
