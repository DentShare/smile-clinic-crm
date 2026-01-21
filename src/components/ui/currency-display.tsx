import * as React from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";

interface CurrencyDisplayProps extends React.HTMLAttributes<HTMLSpanElement> {
  amount: number;
  showSign?: boolean;
  colorBySign?: boolean;
  showCurrency?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Display currency in Uzbek Sum format
 * Automatically shows red for negative, green for positive when colorBySign is true
 */
const CurrencyDisplay = React.forwardRef<HTMLSpanElement, CurrencyDisplayProps>(
  ({ 
    amount, 
    showSign = false, 
    colorBySign = false,
    showCurrency = true,
    size = 'md',
    className, 
    ...props 
  }, ref) => {
    const isNegative = amount < 0;
    const isPositive = amount > 0;
    
    const sizeClasses = {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg font-semibold',
    };

    const colorClasses = colorBySign
      ? isNegative
        ? 'text-destructive'
        : isPositive
        ? 'text-success'
        : ''
      : '';

    const displayAmount = Math.abs(amount);
    const sign = showSign ? (isNegative ? '−' : isPositive ? '+' : '') : (isNegative ? '−' : '');

    return (
      <span
        ref={ref}
        className={cn(
          "tabular-nums",
          sizeClasses[size],
          colorClasses,
          className
        )}
        {...props}
      >
        {sign}{formatCurrency(displayAmount, showCurrency)}
      </span>
    );
  }
);

CurrencyDisplay.displayName = "CurrencyDisplay";

export { CurrencyDisplay };
