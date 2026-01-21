import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { CreditCard, Banknote, Smartphone, Plus, X } from "lucide-react";

type PaymentMethod = 'cash' | 'terminal' | 'click' | 'payme' | 'uzum';

interface PaymentSplit {
  method: PaymentMethod;
  amount: number;
}

interface PaymentMethodSelectorProps {
  totalAmount: number;
  value?: PaymentSplit[];
  onChange?: (splits: PaymentSplit[]) => void;
  className?: string;
}

const paymentMethods: { id: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { id: 'cash', label: 'Наличные', icon: Banknote },
  { id: 'terminal', label: 'Терминал', icon: CreditCard },
  { id: 'click', label: 'Click', icon: Smartphone },
  { id: 'payme', label: 'Payme', icon: Smartphone },
  { id: 'uzum', label: 'Uzum', icon: Smartphone },
];

/**
 * Payment method selector with split payment support
 * Supports: Cash, Terminal (Visa/UzCard/Humo), Click, Payme, Uzum
 */
const PaymentMethodSelector = ({
  totalAmount,
  value = [],
  onChange,
  className,
}: PaymentMethodSelectorProps) => {
  const [splits, setSplits] = React.useState<PaymentSplit[]>(
    value.length > 0 ? value : [{ method: 'cash', amount: totalAmount }]
  );

  const allocatedAmount = splits.reduce((sum, split) => sum + split.amount, 0);
  const remainingAmount = totalAmount - allocatedAmount;

  const handleMethodSelect = (method: PaymentMethod) => {
    // If only one split and clicking different method, change it
    if (splits.length === 1 && splits[0].method !== method) {
      const newSplits = [{ method, amount: totalAmount }];
      setSplits(newSplits);
      onChange?.(newSplits);
      return;
    }

    // Check if method already exists
    const existingIndex = splits.findIndex(s => s.method === method);
    if (existingIndex >= 0) return;

    // Add new split with remaining amount
    const newSplits = [...splits, { method, amount: Math.max(0, remainingAmount) }];
    setSplits(newSplits);
    onChange?.(newSplits);
  };

  const handleAmountChange = (index: number, amount: number) => {
    const newSplits = [...splits];
    newSplits[index].amount = Math.max(0, amount);
    setSplits(newSplits);
    onChange?.(newSplits);
  };

  const handleRemoveSplit = (index: number) => {
    if (splits.length <= 1) return;
    const newSplits = splits.filter((_, i) => i !== index);
    // Reallocate remaining to first split
    if (newSplits.length > 0) {
      const allocated = newSplits.reduce((sum, s) => sum + s.amount, 0);
      if (allocated < totalAmount) {
        newSplits[0].amount += totalAmount - allocated;
      }
    }
    setSplits(newSplits);
    onChange?.(newSplits);
  };

  const usedMethods = splits.map(s => s.method);
  const availableMethods = paymentMethods.filter(m => !usedMethods.includes(m.id));

  return (
    <div className={cn("space-y-4", className)}>
      {/* Method buttons */}
      <div className="flex flex-wrap gap-2">
        {paymentMethods.map((method) => {
          const isSelected = usedMethods.includes(method.id);
          const Icon = method.icon;
          return (
            <Button
              key={method.id}
              type="button"
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => handleMethodSelect(method.id)}
              className={cn(
                "gap-2",
                isSelected && "ring-2 ring-primary ring-offset-2"
              )}
            >
              <Icon className="h-4 w-4" />
              {method.label}
            </Button>
          );
        })}
      </div>

      {/* Split amounts */}
      {splits.length > 0 && (
        <div className="space-y-3">
          {splits.map((split, index) => {
            const methodInfo = paymentMethods.find(m => m.id === split.method);
            if (!methodInfo) return null;
            const Icon = methodInfo.icon;

            return (
              <div key={split.method} className="flex items-center gap-3">
                <div className="flex items-center gap-2 min-w-[120px]">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm">{methodInfo.label}</Label>
                </div>
                <Input
                  type="number"
                  value={split.amount}
                  onChange={(e) => handleAmountChange(index, parseInt(e.target.value) || 0)}
                  className="w-32 text-right"
                  min={0}
                  max={totalAmount}
                />
                <span className="text-sm text-muted-foreground">so'm</span>
                {splits.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleRemoveSplit(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add split button */}
      {availableMethods.length > 0 && splits.length > 0 && splits.length < 3 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => handleMethodSelect(availableMethods[0].id)}
        >
          <Plus className="h-4 w-4" />
          Разделить оплату
        </Button>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between pt-3 border-t">
        <span className="text-sm text-muted-foreground">Итого к оплате:</span>
        <CurrencyDisplay amount={totalAmount} size="lg" />
      </div>
      
      {Math.abs(remainingAmount) > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className={remainingAmount > 0 ? "text-destructive" : "text-warning"}>
            {remainingAmount > 0 ? 'Не распределено:' : 'Переплата:'}
          </span>
          <CurrencyDisplay 
            amount={Math.abs(remainingAmount)} 
            colorBySign={false}
            className={remainingAmount > 0 ? "text-destructive" : "text-warning"}
          />
        </div>
      )}
    </div>
  );
};

PaymentMethodSelector.displayName = "PaymentMethodSelector";

export { PaymentMethodSelector };
export type { PaymentMethod, PaymentSplit };
