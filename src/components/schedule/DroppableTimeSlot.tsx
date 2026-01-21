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
      {/* 15-minute line */}
      <div 
        className="absolute left-0 right-0 border-b border-dotted border-muted-foreground/10"
        style={{ top: `${slotHeight / 4}px` }}
      />
      {/* 30-minute line (more visible) */}
      <div 
        className="absolute left-0 right-0 border-b border-dashed border-muted-foreground/25"
        style={{ top: `${slotHeight / 2}px` }}
      />
      {/* 45-minute line */}
      <div 
        className="absolute left-0 right-0 border-b border-dotted border-muted-foreground/10"
        style={{ top: `${(slotHeight / 4) * 3}px` }}
      />
      {children}
    </div>
  );
}
