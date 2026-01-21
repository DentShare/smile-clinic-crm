import { ToothStatus } from '@/types/database';
import { toothStatusColors } from './ToothStatusLegend';
import { cn } from '@/lib/utils';

interface ToothProps {
  number: number;
  status: ToothStatus;
  onClick: (number: number) => void;
  isSelected?: boolean;
}

const Tooth = ({ number, status, onClick, isSelected }: ToothProps) => {
  const isMolar = [18, 17, 16, 28, 27, 26, 38, 37, 36, 48, 47, 46].includes(number);
  const isPremolar = [15, 14, 25, 24, 35, 34, 45, 44].includes(number);
  const isCanine = [13, 23, 33, 43].includes(number);
  const isIncisor = [12, 11, 21, 22, 32, 31, 41, 42].includes(number);

  // Size based on tooth type
  const getToothSize = () => {
    if (isMolar) return { width: 28, height: 32 };
    if (isPremolar) return { width: 22, height: 28 };
    if (isCanine) return { width: 18, height: 30 };
    return { width: 16, height: 26 }; // Incisor
  };

  const size = getToothSize();
  const fillColor = toothStatusColors[status];
  const isMissing = status === 'missing';

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-muted-foreground font-medium">{number}</span>
      <svg
        width={size.width}
        height={size.height}
        viewBox={`0 0 ${size.width} ${size.height}`}
        className={cn(
          "cursor-pointer transition-all duration-200",
          isSelected && "ring-2 ring-primary ring-offset-2 rounded",
          !isMissing && "hover:scale-110"
        )}
        onClick={() => onClick(number)}
      >
        {isMolar ? (
          // Molar shape - wider with multiple cusps
          <path
            d={`M4,${size.height - 4} 
                Q2,${size.height / 2} 4,4 
                Q${size.width / 4},2 ${size.width / 2},4 
                Q${size.width * 3 / 4},2 ${size.width - 4},4 
                Q${size.width - 2},${size.height / 2} ${size.width - 4},${size.height - 4} 
                Q${size.width / 2},${size.height} 4,${size.height - 4}`}
            fill={fillColor}
            stroke="hsl(var(--border))"
            strokeWidth="1.5"
            opacity={isMissing ? 0.3 : 1}
          />
        ) : isPremolar ? (
          // Premolar shape - medium with two cusps
          <path
            d={`M3,${size.height - 3} 
                Q2,${size.height / 2} 3,3 
                Q${size.width / 2},1 ${size.width - 3},3 
                Q${size.width - 2},${size.height / 2} ${size.width - 3},${size.height - 3} 
                Q${size.width / 2},${size.height} 3,${size.height - 3}`}
            fill={fillColor}
            stroke="hsl(var(--border))"
            strokeWidth="1.5"
            opacity={isMissing ? 0.3 : 1}
          />
        ) : isCanine ? (
          // Canine shape - pointed
          <path
            d={`M3,${size.height - 3} 
                Q2,${size.height * 0.6} 4,3 
                Q${size.width / 2},1 ${size.width - 4},3 
                Q${size.width - 2},${size.height * 0.6} ${size.width - 3},${size.height - 3} 
                Q${size.width / 2},${size.height} 3,${size.height - 3}`}
            fill={fillColor}
            stroke="hsl(var(--border))"
            strokeWidth="1.5"
            opacity={isMissing ? 0.3 : 1}
          />
        ) : (
          // Incisor shape - flat and narrow
          <rect
            x="2"
            y="2"
            width={size.width - 4}
            height={size.height - 4}
            rx="3"
            fill={fillColor}
            stroke="hsl(var(--border))"
            strokeWidth="1.5"
            opacity={isMissing ? 0.3 : 1}
          />
        )}

        {/* Status indicator for implant */}
        {status === 'implant' && (
          <circle
            cx={size.width / 2}
            cy={size.height / 2}
            r="4"
            fill="hsl(var(--background))"
            stroke="hsl(var(--chart-5))"
            strokeWidth="2"
          />
        )}

        {/* Status indicator for crown */}
        {status === 'crown' && (
          <circle
            cx={size.width / 2}
            cy={size.height / 2}
            r="3"
            fill="hsl(var(--background))"
          />
        )}

        {/* X mark for missing teeth */}
        {isMissing && (
          <>
            <line
              x1="4"
              y1="4"
              x2={size.width - 4}
              y2={size.height - 4}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="2"
            />
            <line
              x1={size.width - 4}
              y1="4"
              x2="4"
              y2={size.height - 4}
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
