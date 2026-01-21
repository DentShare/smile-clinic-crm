import { ToothStatus } from '@/types/database';

export const toothStatusColors: Record<ToothStatus, string> = {
  healthy: 'hsl(var(--chart-2))',
  caries: 'hsl(var(--destructive))',
  filled: 'hsl(var(--chart-4))',
  crown: 'hsl(var(--chart-1))',
  implant: 'hsl(var(--chart-5))',
  missing: 'hsl(var(--muted))',
  root_canal: 'hsl(var(--chart-3))',
  bridge: 'hsl(var(--primary))',
};

export const toothStatusLabels: Record<ToothStatus, string> = {
  healthy: 'Здоров',
  caries: 'Кариес',
  filled: 'Пломба',
  crown: 'Коронка',
  implant: 'Имплант',
  missing: 'Отсутствует',
  root_canal: 'Лечение канала',
  bridge: 'Мост',
};

const ToothStatusLegend = () => {
  const statuses = Object.keys(toothStatusColors) as ToothStatus[];

  return (
    <div className="flex flex-wrap gap-3 p-4 bg-card rounded-lg border">
      {statuses.map((status) => (
        <div key={status} className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-sm border"
            style={{ backgroundColor: toothStatusColors[status] }}
          />
          <span className="text-sm text-muted-foreground">
            {toothStatusLabels[status]}
          </span>
        </div>
      ))}
    </div>
  );
};

export default ToothStatusLegend;
