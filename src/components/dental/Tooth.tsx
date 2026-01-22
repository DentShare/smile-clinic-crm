import { ToothStatus } from '@/types/database';
import { toothStatusColors } from './ToothStatusLegend';
import { cn } from '@/lib/utils';

interface ToothProps {
  number: number;
  status: ToothStatus;
  onClick: (number: number) => void;
  isSelected?: boolean;
  isDeciduous?: boolean; // молочный зуб
}

// Realistic tooth SVG paths for each tooth class
const getToothPath = (
  type: 'molar' | 'premolar' | 'canine' | 'incisor',
  isUpper: boolean,
  isDeciduous: boolean = false
): string => {
  // For deciduous teeth - slightly smaller, more rounded shapes
  if (isDeciduous) {
    if (type === 'molar') {
      if (isUpper) {
        return `M6,34 
                L6,18 Q6,12 9,10 L11,6 Q14,3 16,3 
                Q18,3 21,6 L23,10 Q26,12 26,18 
                L26,34 Q26,36 24,36 L8,36 Q6,36 6,34 Z`;
      } else {
        return `M6,6 
                L6,22 Q6,28 9,30 L11,34 Q14,37 16,37 
                Q18,37 21,34 L23,30 Q26,28 26,22 
                L26,6 Q26,4 24,4 L8,4 Q6,4 6,6 Z`;
      }
    }
    // Deciduous canine
    if (type === 'canine') {
      if (isUpper) {
        return `M10,34 
                L10,20 Q10,14 12,10 L15,5 Q16,3 16,3 
                Q16,3 17,5 L20,10 Q22,14 22,20 
                L22,34 Q22,36 20,36 L12,36 Q10,36 10,34 Z`;
      } else {
        return `M10,6 
                L10,20 Q10,26 12,30 L15,35 Q16,37 16,37 
                Q16,37 17,35 L20,30 Q22,26 22,20 
                L22,6 Q22,4 20,4 L12,4 Q10,4 10,6 Z`;
      }
    }
    // Deciduous incisor
    if (isUpper) {
      return `M10,34 
              L10,18 Q10,12 12,8 L14,5 Q15,3 16,3 
              Q17,3 18,5 L20,8 Q22,12 22,18 
              L22,34 Q22,36 20,36 L12,36 Q10,36 10,34 Z`;
    } else {
      return `M10,6 
              L10,22 Q10,28 12,32 L14,35 Q15,37 16,37 
              Q17,37 18,35 L20,32 Q22,28 22,22 
              L22,6 Q22,4 20,4 L12,4 Q10,4 10,6 Z`;
    }
  }

  // Permanent teeth paths
  if (type === 'molar') {
    if (isUpper) {
      return `M4,36 
              L4,20 Q4,16 6,14 L8,8 Q9,4 10,4 L10,14 
              Q12,12 16,12 Q20,12 22,14 
              L22,4 Q23,4 24,8 L26,14 Q28,16 28,20 
              L28,36 Q28,38 26,38 L6,38 Q4,38 4,36 Z`;
    } else {
      return `M4,4 
              L4,20 Q4,24 6,26 L8,32 Q9,36 10,36 L10,26 
              Q12,28 16,28 Q20,28 22,26 
              L22,36 Q23,36 24,32 L26,26 Q28,24 28,20 
              L28,4 Q28,2 26,2 L6,2 Q4,2 4,4 Z`;
    }
  }

  if (type === 'premolar') {
    if (isUpper) {
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

  // Incisor
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

const Tooth = ({ number, status, onClick, isSelected, isDeciduous = false }: ToothProps) => {
  // Determine tooth type based on FDI number
  const getToothType = (): 'molar' | 'premolar' | 'canine' | 'incisor' => {
    if (isDeciduous) {
      // Deciduous teeth: 51-55, 61-65, 71-75, 81-85
      // Molars: *4, *5
      // Canines: *3
      // Incisors: *1, *2
      const lastDigit = number % 10;
      if (lastDigit >= 4) return 'molar';
      if (lastDigit === 3) return 'canine';
      return 'incisor';
    } else {
      // Permanent teeth
      const isMolar = [18, 17, 16, 28, 27, 26, 38, 37, 36, 48, 47, 46].includes(number);
      const isPremolar = [15, 14, 25, 24, 35, 34, 45, 44].includes(number);
      const isCanine = [13, 23, 33, 43].includes(number);

      if (isMolar) return 'molar';
      if (isPremolar) return 'premolar';
      if (isCanine) return 'canine';
      return 'incisor';
    }
  };

  // Determine if upper or lower jaw
  const getIsUpper = (): boolean => {
    if (isDeciduous) {
      // Upper: 51-55, 61-65; Lower: 71-75, 81-85
      return number >= 51 && number <= 65;
    }
    return number >= 11 && number <= 28;
  };

  const fillColor = toothStatusColors[status];
  const isMissing = status === 'missing';
  const isUpper = getIsUpper();
  const toothType = getToothType();
  const toothPath = getToothPath(toothType, isUpper, isDeciduous);

  return (
    <div className="flex flex-col items-center gap-1">
      <span className={cn(
        "text-xs font-medium",
        isDeciduous ? "text-info" : "text-muted-foreground"
      )}>
        {number}
      </span>
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
          stroke={isDeciduous ? "hsl(var(--info))" : "hsl(var(--border))"}
          strokeWidth={isDeciduous ? "2" : "1.5"}
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