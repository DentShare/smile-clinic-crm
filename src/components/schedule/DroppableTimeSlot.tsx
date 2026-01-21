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
        "border-b border-dashed transition-colors",
        isOver && "bg-primary/10"
      )}
      style={{ height: `${slotHeight}px` }}
    >
      {children}
    </div>
  );
}
