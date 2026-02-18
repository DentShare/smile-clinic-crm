import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { Gift, Package, CreditCard, Wallet, Loader2 } from 'lucide-react';

interface PatientLoyaltyWidgetProps {
  patientId: string;
}

export function PatientLoyaltyWidget({ patientId }: PatientLoyaltyWidgetProps) {
  const { clinic } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loyalty, setLoyalty] = useState<any>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [discountCard, setDiscountCard] = useState<any>(null);
  const [depositBalance, setDepositBalance] = useState(0);

  useEffect(() => {
    if (patientId && clinic?.id) fetchData();
  }, [patientId, clinic?.id]);

  const fetchData = async () => {
    if (!clinic?.id) return;
    const [loyaltyRes, pkgRes, cardRes, depositRes] = await Promise.all([
      supabase.from('patient_loyalty')
        .select('bonus_balance, current_discount_percent, total_spent')
        .eq('patient_id', patientId).eq('clinic_id', clinic.id).maybeSingle(),
      supabase.from('patient_packages')
        .select('*, package:package_id(name, items:service_package_items(service_id, quantity, service:service_id(name))), usage:patient_package_usage(service_id, quantity)')
        .eq('patient_id', patientId).eq('clinic_id', clinic.id)
        .eq('status', 'active').gte('expires_at', new Date().toISOString()),
      supabase.from('discount_cards')
        .select('card_number, discount_percent, valid_until')
        .eq('patient_id', patientId).eq('clinic_id', clinic.id).eq('is_active', true)
        .limit(1).maybeSingle(),
      supabase.from('patient_deposits')
        .select('balance')
        .eq('patient_id', patientId).eq('clinic_id', clinic.id).maybeSingle(),
    ]);

    setLoyalty(loyaltyRes.data);
    setPackages(pkgRes.data || []);
    setDiscountCard(cardRes.data);
    setDepositBalance(depositRes.data?.balance || 0);
    setLoading(false);
  };

  const hasData = loyalty || packages.length > 0 || discountCard || depositBalance > 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!hasData) return null;

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Gift className="h-4 w-4" />
          Лояльность и пакеты
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {/* Bonus balance */}
        {loyalty && loyalty.bonus_balance > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Gift className="h-3.5 w-3.5" />Бонусы
            </span>
            <CurrencyDisplay amount={loyalty.bonus_balance} size="sm" className="font-semibold text-primary" />
          </div>
        )}

        {/* Discount percent from loyalty */}
        {loyalty && loyalty.current_discount_percent > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Скидка лояльности</span>
            <Badge variant="secondary">{loyalty.current_discount_percent}%</Badge>
          </div>
        )}

        {/* Discount card */}
        {discountCard && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />Карта {discountCard.card_number}
            </span>
            <Badge>{discountCard.discount_percent}%</Badge>
          </div>
        )}

        {/* Deposit */}
        {depositBalance > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" />Депозит
            </span>
            <CurrencyDisplay amount={depositBalance} size="sm" className="font-semibold" />
          </div>
        )}

        {/* Active packages with remaining services */}
        {packages.length > 0 && (
          <div className="space-y-2 pt-1 border-t">
            {packages.map((pp: any) => {
              const items = pp.package?.items || [];
              const usage = pp.usage || [];

              // Build usage map
              const usageMap: Record<string, number> = {};
              for (const u of usage) {
                usageMap[u.service_id] = (usageMap[u.service_id] || 0) + u.quantity;
              }

              return (
                <div key={pp.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5" />
                      {pp.package?.name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      до {new Date(pp.expires_at).toLocaleDateString('ru-RU')}
                    </Badge>
                  </div>
                  {items.map((item: any) => {
                    const used = usageMap[item.service_id] || 0;
                    const total = item.quantity;
                    const pct = Math.min(100, Math.round((used / total) * 100));
                    return (
                      <div key={item.service_id} className="pl-5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground truncate">{item.service?.name}</span>
                          <span className={used >= total ? 'text-destructive' : 'text-foreground'}>
                            {used}/{total}
                          </span>
                        </div>
                        <Progress value={pct} className="h-1 mt-0.5" />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
