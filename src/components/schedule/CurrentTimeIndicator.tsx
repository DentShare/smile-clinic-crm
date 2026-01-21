import { useCurrentTime } from '@/hooks/use-current-time';
import { cn } from '@/lib/utils';

interface CurrentTimeIndicatorProps {
  workStartHour?: number;
  workEndHour?: number;
  slotHeight?: number;
  className?: string;
}

export function CurrentTimeIndicator({
  workStartHour = 9,
  workEndHour = 20,
  slotHeight = 60,
  className,
}: CurrentTimeIndicatorProps) {
  const currentTime = useCurrentTime(60000); // Update every minute
  
  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  
  // Check if current time is within working hours
  if (hours < workStartHour || hours >= workEndHour) {
    return null;
  }

  // Calculate position
  const top = (hours - workStartHour) * slotHeight + (minutes / 60) * slotHeight;

  return (
    <div
      className={cn(
        "absolute left-0 right-0 z-20 pointer-events-none flex items-center",
        className
      )}
      style={{ top: `${top}px` }}
    >
      {/* Red dot */}
      <div className="w-2.5 h-2.5 rounded-full bg-destructive shrink-0 -ml-1 shadow-sm" />
      {/* Red line */}
      <div className="flex-1 h-0.5 bg-destructive" />
    </div>
  );
}
