import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

interface TimeSlotHoverPreviewProps {
  slotHeight: number;
  workStart: number;
  onTimeClick: (hour: number, minutes: number) => void;
  doctorId?: string;
}

export function TimeSlotHoverPreview({
  slotHeight,
  workStart,
  onTimeClick,
  doctorId,
}: TimeSlotHoverPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverInfo, setHoverInfo] = useState<{ y: number; time: string; hour: number; minutes: number } | null>(null);

  const calculateTime = useCallback((clientY: number) => {
    if (!containerRef.current) return null;

    const rect = containerRef.current.getBoundingClientRect();
    const relativeY = clientY - rect.top;
    
    // Calculate time from position
    const totalMinutes = (relativeY / slotHeight) * 60;
    const hour = Math.floor(totalMinutes / 60) + workStart;
    const rawMinutes = totalMinutes % 60;
    
    // Snap to 15-minute intervals
    const snappedMinutes = Math.round(rawMinutes / 15) * 15;
    const adjustedMinutes = snappedMinutes >= 60 ? 0 : snappedMinutes;
    const adjustedHour = snappedMinutes >= 60 ? hour + 1 : hour;
    
    // Calculate snapped Y position
    const snappedY = ((adjustedHour - workStart) * 60 + adjustedMinutes) / 60 * slotHeight;

    const timeString = `${adjustedHour.toString().padStart(2, '0')}:${adjustedMinutes.toString().padStart(2, '0')}`;

    return { y: snappedY, time: timeString, hour: adjustedHour, minutes: adjustedMinutes };
  }, [slotHeight, workStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const info = calculateTime(e.clientY);
    if (info && info.hour >= workStart && info.hour < 21) {
      setHoverInfo(info);
    } else {
      setHoverInfo(null);
    }
  }, [calculateTime, workStart]);

  const handleMouseLeave = useCallback(() => {
    setHoverInfo(null);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hoverInfo) {
      onTimeClick(hoverInfo.hour, hoverInfo.minutes);
    }
  }, [hoverInfo, onTimeClick]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Hover Preview Block */}
      {hoverInfo && (
        <div
          className={cn(
            "absolute left-1 right-1 rounded-md border-2 border-dashed",
            "border-primary/40 bg-primary/5 backdrop-blur-[1px]",
            "flex items-center justify-center gap-2 cursor-pointer",
            "transition-all duration-75 ease-out",
            "hover:border-primary/60 hover:bg-primary/10"
          )}
          style={{
            top: `${hoverInfo.y}px`,
            height: `${slotHeight / 2}px`, // 30 min default
          }}
        >
          <Plus className="h-4 w-4 text-primary/70" />
          <span className="text-sm font-medium text-primary/70">
            {hoverInfo.time}
          </span>
        </div>
      )}
    </div>
  );
}
