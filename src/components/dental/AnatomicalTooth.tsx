import { ToothStatus } from '@/types/database';
import { getToothPaths } from './tooth-paths';
import { cn } from '@/lib/utils';

interface AnatomicalToothProps {
  number: number;
  status: ToothStatus;
  onClick: (number: number) => void;
  isSelected?: boolean;
  isDeciduous?: boolean;
}

// Status colors for crown and root
const crownColors: Record<ToothStatus, string> = {
  healthy: 'hsl(var(--background))',
  caries: 'hsl(var(--destructive))',
  filled: 'hsl(var(--chart-4))',
  crown: 'hsl(var(--chart-1))',
  implant: 'hsl(var(--background))', // Crown is normal for implant
  missing: 'transparent',
  root_canal: 'hsl(var(--background))', // Crown is normal for endo
  bridge: 'hsl(var(--primary))',
};

const rootColors: Record<ToothStatus, string> = {
  healthy: 'hsl(var(--background))',
  caries: 'hsl(var(--background))', // Root is normal for caries
  filled: 'hsl(var(--background))', // Root is normal for filling
  crown: 'hsl(var(--background))', // Root is normal for crown
  implant: 'hsl(var(--chart-5))', // Root is implant colored
  missing: 'transparent',
  root_canal: 'hsl(var(--chart-3))', // Root is endo colored
  bridge: 'hsl(var(--background))', // Root is normal for bridge
};

const AnatomicalTooth = ({ 
  number, 
  status, 
  onClick, 
  isSelected, 
  isDeciduous = false 
}: AnatomicalToothProps) => {
  const paths = getToothPaths(number, isDeciduous);
  const isMissing = status === 'missing';
  
  const crownFill = crownColors[status];
  const rootFill = rootColors[status];
  
  const strokeColor = isDeciduous 
    ? 'hsl(var(--info))' 
    : 'hsl(var(--foreground))';
  
  const strokeWidth = isDeciduous ? 1.5 : 1.2;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={cn(
        "text-[10px] font-medium leading-none",
        isDeciduous ? "text-info" : "text-muted-foreground"
      )}>
        {number}
      </span>
      <svg
        width={28}
        height={32}
        viewBox={paths.viewBox}
        className={cn(
          "cursor-pointer transition-all duration-200",
          isSelected && "ring-2 ring-primary ring-offset-1 rounded",
          !isMissing && "hover:scale-110 hover:drop-shadow-md"
        )}
        onClick={() => onClick(number)}
      >
        {!isMissing && (
          <>
            {/* Root - drawn first (behind) */}
            <path
              d={paths.root}
              fill={rootFill}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Crown - drawn second (in front) */}
            <path
              d={paths.crown}
              fill={crownFill}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Implant screw indicator */}
            {status === 'implant' && (
              <>
                <line
                  x1="14"
                  y1="6"
                  x2="18"
                  y2="6"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth="1"
                />
                <line
                  x1="13"
                  y1="9"
                  x2="19"
                  y2="9"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth="1"
                />
                <line
                  x1="14"
                  y1="12"
                  x2="18"
                  y2="12"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth="1"
                />
              </>
            )}
            
            {/* Crown prosthesis indicator */}
            {status === 'crown' && (
              <path
                d="M12,20 Q16,18 20,20"
                fill="none"
                stroke="hsl(var(--background))"
                strokeWidth="1.5"
              />
            )}
            
            {/* Root canal indicator - fill pattern */}
            {status === 'root_canal' && (
              <line
                x1="16"
                y1="4"
                x2="16"
                y2="12"
                stroke="hsl(var(--background))"
                strokeWidth="1.5"
                strokeDasharray="2,2"
              />
            )}
          </>
        )}

        {/* X mark for missing teeth */}
        {isMissing && (
          <>
            <line
              x1="8"
              y1="6"
              x2="24"
              y2="28"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="1.5"
              opacity="0.5"
            />
            <line
              x1="24"
              y1="6"
              x2="8"
              y2="28"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="1.5"
              opacity="0.5"
            />
          </>
        )}
      </svg>
    </div>
  );
};

export default AnatomicalTooth;
