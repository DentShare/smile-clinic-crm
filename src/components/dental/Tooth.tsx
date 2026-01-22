import { ToothStatus } from '@/types/database';
import { toothStatusColors } from './ToothStatusLegend';
import { cn } from '@/lib/utils';

interface ToothProps {
  number: number;
  status: ToothStatus;
  onClick: (number: number) => void;
  isSelected?: boolean;
}

// Realistic tooth SVG paths for each tooth class
const getToothPath = (type: 'molar' | 'premolar' | 'canine' | 'incisor', isUpper: boolean): string => {
  // All paths designed for a 32x40 viewBox
  if (type === 'molar') {
    if (isUpper) {
      // Upper molar - wide with multiple cusps and roots going up
      return `M4,36 
              L4,20 Q4,16 6,14 L8,8 Q9,4 10,4 L10,14 
              Q12,12 16,12 Q20,12 22,14 
              L22,4 Q23,4 24,8 L26,14 Q28,16 28,20 
              L28,36 Q28,38 26,38 L6,38 Q4,38 4,36 Z`;
    } else {
      // Lower molar - roots going down
      return `M4,4 
              L4,20 Q4,24 6,26 L8,32 Q9,36 10,36 L10,26 
              Q12,28 16,28 Q20,28 22,26 
              L22,36 Q23,36 24,32 L26,26 Q28,24 28,20 
              L28,4 Q28,2 26,2 L6,2 Q4,2 4,4 Z`;
    }
  }
  
  if (type === 'premolar') {
    if (isUpper) {
      // Upper premolar - two cusps with single root
      return `M6,36 
              L6,18 Q6,14 8,12 L10,6 Q12,2 14,2 
              Q16,2 18,2 Q20,2 22,6 L24,12 Q26,14 26,18 
              L26,36 Q26,38 24,38 L8,38 Q6,38 6,36 Z`;
    } else {
      return `M6,4 
              L6,22 Q6,26 8,28 L10,34 Q12,38 14,38 
              Q16,38 18,38 Q20,38 22,34 L24,28 Q26,26 26,22 
              L26,4 Q26,2 24,2 L8,2 Q6,2 6,4 Z`;
    }
  }
  
  if (type === 'canine') {
    if (isUpper) {
      // Upper canine - pointed with long root
      return `M8,36 
              L8,22 Q8,16 10,12 L14,4 Q16,2 16,2 
              Q16,2 18,4 L22,12 Q24,16 24,22 
              L24,36 Q24,38 22,38 L10,38 Q8,38 8,36 Z`;
    } else {
      return `M8,4 
              L8,18 Q8,24 10,28 L14,36 Q16,38 16,38 
              Q16,38 18,36 L22,28 Q24,24 24,18 
              L24,4 Q24,2 22,2 L10,2 Q8,2 8,4 Z`;
    }
  }
  
  // Incisor - flat, chisel-shaped
  if (isUpper) {
    return `M9,36 
            L9,18 Q9,10 11,6 L13,4 Q15,2 16,2 
            Q17,2 19,4 L21,6 Q23,10 23,18 
            L23,36 Q23,38 21,38 L11,38 Q9,38 9,36 Z`;
  } else {
    return `M9,4 
            L9,22 Q9,30 11,34 L13,36 Q15,38 16,38 
            Q17,38 19,36 L21,34 Q23,30 23,22 
            L23,4 Q23,2 21,2 L11,2 Q9,2 9,4 Z`;
  }
};

const Tooth = ({ number, status, onClick, isSelected }: ToothProps) => {
  const isMolar = [18, 17, 16, 28, 27, 26, 38, 37, 36, 48, 47, 46].includes(number);
  const isPremolar = [15, 14, 25, 24, 35, 34, 45, 44].includes(number);
  const isCanine = [13, 23, 33, 43].includes(number);
  
  // Upper jaw: 11-28, Lower jaw: 31-48
  const isUpper = number >= 11 && number <= 28;

  const getToothType = (): 'molar' | 'premolar' | 'canine' | 'incisor' => {
    if (isMolar) return 'molar';
    if (isPremolar) return 'premolar';
    if (isCanine) return 'canine';
    return 'incisor';
  };

  const fillColor = toothStatusColors[status];
  const isMissing = status === 'missing';
  const toothPath = getToothPath(getToothType(), isUpper);

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-muted-foreground font-medium">{number}</span>
      <svg
        width={32}
        height={40}
        viewBox="0 0 32 40"
        className={cn(
          "cursor-pointer transition-all duration-200",
          isSelected && "ring-2 ring-primary ring-offset-2 rounded",
          !isMissing && "hover:scale-110"
        )}
        onClick={() => onClick(number)}
      >
        <path
          d={toothPath}
          fill={fillColor}
          stroke="hsl(var(--border))"
          strokeWidth="1.5"
          opacity={isMissing ? 0.3 : 1}
        />

        {/* Status indicator for implant */}
        {status === 'implant' && (
          <circle
            cx={16}
            cy={20}
            r="5"
            fill="hsl(var(--background))"
            stroke="hsl(var(--chart-5))"
            strokeWidth="2"
          />
        )}

        {/* Status indicator for crown */}
        {status === 'crown' && (
          <circle
            cx={16}
            cy={20}
            r="4"
            fill="hsl(var(--background))"
          />
        )}

        {/* X mark for missing teeth */}
        {isMissing && (
          <>
            <line
              x1="6"
              y1="6"
              x2="26"
              y2="34"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="2"
            />
            <line
              x1="26"
              y1="6"
              x2="6"
              y2="34"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="2"
            />
          </>
        )}
      </svg>
    </div>
  );
};

export default Tooth;
