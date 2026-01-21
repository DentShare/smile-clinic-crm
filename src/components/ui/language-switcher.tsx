import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Language = 'uz' | 'ru';

interface LanguageSwitcherProps {
  value?: Language;
  onChange?: (language: Language) => void;
  className?: string;
}

/**
 * Language switcher toggle: O'ZB | РУС
 */
const LanguageSwitcher = ({ 
  value = 'ru', 
  onChange, 
  className 
}: LanguageSwitcherProps) => {
  const handleClick = (lang: Language) => {
    if (lang !== value) {
      onChange?.(lang);
    }
  };

  return (
    <div className={cn("flex items-center rounded-lg border bg-muted p-0.5", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleClick('uz')}
        className={cn(
          "h-7 px-3 text-xs font-medium rounded-md transition-all",
          value === 'uz' 
            ? "bg-card text-foreground shadow-sm" 
            : "text-muted-foreground hover:text-foreground hover:bg-transparent"
        )}
      >
        O'ZB
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleClick('ru')}
        className={cn(
          "h-7 px-3 text-xs font-medium rounded-md transition-all",
          value === 'ru' 
            ? "bg-card text-foreground shadow-sm" 
            : "text-muted-foreground hover:text-foreground hover:bg-transparent"
        )}
      >
        РУС
      </Button>
    </div>
  );
};

LanguageSwitcher.displayName = "LanguageSwitcher";

export { LanguageSwitcher };
export type { Language };
