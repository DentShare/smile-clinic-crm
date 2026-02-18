import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Users, UserPlus, Loader2, Gift, ArrowRight } from 'lucide-react';

interface ReferralTrackerProps {
  patientId: string;
}

interface ReferralInfo {
  referredBy?: { id: string; full_name: string } | null;
  referrals: { id: string; full_name: string; created_at: string }[];
  rewards: { id: string; reward_type: string; reward_value: number; is_claimed: boolean; referred?: { full_name: string } }[];
}

export function ReferralTracker({ patientId }: ReferralTrackerProps) {
  const { clinic } = useAuth();
  const [info, setInfo] = useState<ReferralInfo>({ referrals: [], rewards: [] });
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; full_name: string; phone: string }[]>([]);

  useEffect(() => {
    if (clinic?.id && patientId) fetchReferralData();
  }, [clinic?.id, patientId]);

  const fetchReferralData = async () => {
    if (!clinic?.id) return;

    const [patientRes, referralsRes, rewardsRes] = await Promise.all([
      supabase
        .from('patients')
        .select('referred_by')
        .eq('id', patientId)
        .single(),
      supabase
        .from('patients')
        .select('id, full_name, created_at')
        .eq('clinic_id', clinic.id)
        .eq('referred_by', patientId)
        .order('created_at', { ascending: false }),
      supabase
        .from('referral_rewards')
        .select('*, referred:referred_id(full_name)')
        .eq('clinic_id', clinic.id)
        .eq('referrer_id', patientId),
    ]);

    if (patientRes.error) console.error('Error fetching patient:', patientRes.error);

    let referredBy = null;
    if (patientRes.data?.referred_by) {
      const { data: referrer, error: refErr } = await supabase
        .from('patients')
        .select('id, full_name')
        .eq('id', patientRes.data.referred_by)
        .single();
      if (refErr) console.error('Error fetching referrer:', refErr);
      referredBy = referrer;
    }

    setInfo({
      referredBy,
      referrals: referralsRes.data || [],
      rewards: (rewardsRes.data || []) as any,
    });
    setLoading(false);
  };

  const searchPatients = async (query: string) => {
    setSearchQuery(query);
    if (!clinic?.id || query.length < 2) {
      setSearchResults([]);
      return;
    }
    const { data, error } = await supabase
      .from('patients')
      .select('id, full_name, phone')
      .eq('clinic_id', clinic.id)
      .neq('id', patientId)
      .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(5);
    if (!error) setSearchResults(data || []);
  };

  const linkReferrer = async (referrerId: string) => {
    setLinking(true);
    const { error } = await supabase
      .from('patients')
      .update({ referred_by: referrerId, referral_source: 'patient' })
      .eq('id', patientId);

    if (error) {
      toast.error('Ошибка: ' + error.message);
    } else {
      toast.success('Реферал привязан');
      setSearchQuery('');
      setSearchResults([]);
      await fetchReferralData();
    }
    setLinking(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Users className="h-5 w-5" />
        Рефералы
      </h3>

      {/* Referred by */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <p className="text-sm text-muted-foreground mb-2">Кто привёл этого пациента:</p>
          {info.referredBy ? (
            <Link
              to={`/patients/${info.referredBy.id}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              {info.referredBy.full_name}
            </Link>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Не указан</p>
              <Input
                placeholder="Найти пациента-реферала..."
                value={searchQuery}
                onChange={e => searchPatients(e.target.value)}
                className="max-w-sm"
              />
              {searchResults.length > 0 && (
                <div className="border rounded-md max-h-32 overflow-y-auto">
                  {searchResults.map(p => (
                    <button
                      key={p.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between"
                      onClick={() => linkReferrer(p.id)}
                      disabled={linking}
                    >
                      <span>{p.full_name} — {p.phone}</span>
                      <UserPlus className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referrals made by this patient */}
      {info.referrals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Привёл пациентов ({info.referrals.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="space-y-2">
              {info.referrals.map(ref => (
                <div key={ref.id} className="flex items-center justify-between text-sm">
                  <Link
                    to={`/patients/${ref.id}`}
                    className="text-primary hover:underline"
                  >
                    {ref.full_name}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {new Date(ref.created_at).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rewards */}
      {info.rewards.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Награды за рефералов
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="space-y-2">
              {info.rewards.map(r => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <span>
                    {r.reward_type === 'bonus' && `+${r.reward_value} бонусов`}
                    {r.reward_type === 'discount' && `${r.reward_value}% скидка`}
                    {r.reward_type === 'service' && 'Бесплатная услуга'}
                    {r.referred?.full_name && (
                      <span className="text-muted-foreground"> за {r.referred.full_name}</span>
                    )}
                  </span>
                  <Badge variant={r.is_claimed ? 'default' : 'outline'}>
                    {r.is_claimed ? 'Использовано' : 'Доступно'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
