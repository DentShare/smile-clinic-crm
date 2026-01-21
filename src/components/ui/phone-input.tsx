import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * Phone input with Uzbekistan format mask: +998 (XX) XXX-XX-XX
 */
const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value = "", onChange, ...props }, ref) => {
    const formatValue = (input: string): string => {
      // Remove all non-digits
      const digits = input.replace(/\D/g, '');
      
      // Remove 998 prefix if present for formatting
      let localDigits = digits;
      if (digits.startsWith('998')) {
        localDigits = digits.slice(3);
      }
      
      // Limit to 9 digits (local number)
      localDigits = localDigits.slice(0, 9);
      
      // Build formatted string
      let formatted = '+998';
      
      if (localDigits.length > 0) {
        formatted += ` (${localDigits.slice(0, 2)}`;
      }
      if (localDigits.length >= 2) {
        formatted += ')';
      }
      if (localDigits.length > 2) {
        formatted += ` ${localDigits.slice(2, 5)}`;
      }
      if (localDigits.length > 5) {
        formatted += `-${localDigits.slice(5, 7)}`;
      }
      if (localDigits.length > 7) {
        formatted += `-${localDigits.slice(7, 9)}`;
      }
      
      return formatted;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatValue(e.target.value);
      onChange?.(formatted);
    };

    const displayValue = value ? formatValue(value) : '+998';

    return (
      <Input
        ref={ref}
        type="tel"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder="+998 (XX) XXX-XX-XX"
        className={cn("font-mono", className)}
        {...props}
      />
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
