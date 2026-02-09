import { ToothStatus } from '@/types/database';

// Status descriptions with crown/root targeting info
interface StatusInfo {
  label: string;
  crownColor: string;
  rootColor: string;
  target: 'crown' | 'root' | 'both';
}

export const toothStatusInfo: Record<ToothStatus, StatusInfo> = {
  healthy: {
    label: 'Здоров',
    crownColor: 'hsl(var(--background))',
    rootColor: 'hsl(var(--background))',
    target: 'both',
  },
  caries: {
    label: 'Кариес',
    crownColor: 'hsl(var(--destructive))',
    rootColor: 'hsl(var(--background))',
    target: 'crown',
  },
  filled: {
    label: 'Пломба',
    crownColor: 'hsl(var(--chart-4))',
    rootColor: 'hsl(var(--background))',
    target: 'crown',
  },
  crown: {
    label: 'Коронка',
    crownColor: 'hsl(var(--chart-1))',
    rootColor: 'hsl(var(--background))',
    target: 'crown',
  },
  implant: {
    label: 'Имплант',
    crownColor: 'hsl(var(--background))',
    rootColor: 'hsl(var(--chart-5))',
    target: 'root',
  },
  missing: {
    label: 'Отсутствует',
    crownColor: 'transparent',
    rootColor: 'transparent',
    target: 'both',
  },
  root_canal: {
    label: 'Эндодонтия',
    crownColor: 'hsl(var(--background))',
    rootColor: 'hsl(var(--chart-3))',
    target: 'root',
  },
  bridge: {
    label: 'Мост',
    crownColor: 'hsl(var(--primary))',
    rootColor: 'hsl(var(--background))',
    target: 'crown',
  },
};

// Legacy exports for compatibility
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

export const toothStatusLabels: Record<ToothStatus, string> = Object.fromEntries(
  Object.entries(toothStatusInfo).map(([key, info]) => [key, info.label])
) as Record<ToothStatus, string>;

const ToothStatusLegend = () => {
  const statuses = Object.keys(toothStatusInfo) as ToothStatus[];

  return (
    <div className="flex flex-wrap gap-3 p-3 bg-card rounded-lg border text-xs">
      {statuses.map((status) => {
        const info = toothStatusInfo[status];
        const isMissing = status === 'missing';
        
        return (
          <div key={status} className="flex items-center gap-1.5">
            {/* Mini tooth indicator */}
            <div className="relative w-4 h-5 flex flex-col">
              {/* Root */}
              <div 
                className="flex-1 rounded-t-sm border border-b-0"
                style={{ 
                  backgroundColor: isMissing ? 'transparent' : info.rootColor,
                  borderColor: 'hsl(var(--border))'
                }}
              />
              {/* Crown */}
              <div 
                className="flex-[1.5] rounded-b border"
                style={{ 
                  backgroundColor: isMissing ? 'transparent' : info.crownColor,
                  borderColor: 'hsl(var(--border))'
                }}
              />
              {isMissing && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-[8px]">✕</div>
              )}
            </div>
            <span className="text-muted-foreground">
              {info.label}
              {info.target !== 'both' && (
                <span className="text-[10px] ml-0.5 opacity-60">
                  ({info.target === 'crown' ? 'к' : 'р'})
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default ToothStatusLegend;
