import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface DroppableTimeSlotProps {
  id: string;
  hour: number;
  doctorId?: string;
  slotHeight: number;
  children?: React.ReactNode;
}

export function DroppableTimeSlot({
  id,
  hour,
  doctorId,
  slotHeight,
  children,
}: DroppableTimeSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: { hour, doctorId },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "border-b transition-colors relative",
        isOver && "bg-primary/10"
      )}
      style={{ height: `${slotHeight}px` }}
    >
      {/* Half-hour line */}
      <div 
        className="absolute left-0 right-0 border-b border-dashed border-muted-foreground/20"
        style={{ top: `${slotHeight / 2}px` }}
      />
      {children}
    </div>
  );
}
