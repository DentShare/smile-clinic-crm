import { cn } from '@/lib/utils';

interface ToothGridProps {
  selected: Set<number>;
  onToggle: (tooth: number) => void;
  disabled?: Set<number>; // teeth that already have implants
  readOnly?: boolean;
}

// FDI quadrants
const Q1 = [18, 17, 16, 15, 14, 13, 12, 11]; // upper right
const Q2 = [21, 22, 23, 24, 25, 26, 27, 28]; // upper left
const Q3 = [48, 47, 46, 45, 44, 43, 42, 41]; // lower right
const Q4 = [31, 32, 33, 34, 35, 36, 37, 38]; // lower left

export function ToothGrid({ selected, onToggle, disabled = new Set(), readOnly }: ToothGridProps) {
  const renderTooth = (num: number) => {
    const isSelected = selected.has(num);
    const isDisabled = disabled.has(num);

    return (
      <button
        key={num}
        type="button"
        disabled={readOnly || isDisabled}
        onClick={() => onToggle(num)}
        className={cn(
          'w-7 h-7 text-xs font-medium rounded border transition-all',
          isSelected
            ? 'bg-primary text-primary-foreground border-primary'
            : isDisabled
              ? 'bg-muted text-muted-foreground border-muted cursor-not-allowed opacity-50'
              : 'bg-background hover:bg-muted border-border hover:border-primary/50',
        )}
      >
        {num}
      </button>
    );
  };

  return (
    <div className="space-y-1">
      {/* Upper jaw */}
      <div className="flex justify-center gap-1">
        <div className="flex gap-0.5">{Q1.map(renderTooth)}</div>
        <div className="w-px bg-border mx-0.5" />
        <div className="flex gap-0.5">{Q2.map(renderTooth)}</div>
      </div>
      {/* Divider */}
      <div className="border-t border-dashed" />
      {/* Lower jaw */}
      <div className="flex justify-center gap-1">
        <div className="flex gap-0.5">{Q3.map(renderTooth)}</div>
        <div className="w-px bg-border mx-0.5" />
        <div className="flex gap-0.5">{Q4.map(renderTooth)}</div>
      </div>
    </div>
  );
}
