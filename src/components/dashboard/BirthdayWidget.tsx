import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { Cake, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface BirthdayPatient {
  id: string;
  full_name: string;
  birth_date: string;
  phone: string;
  isToday: boolean;
}

export function BirthdayWidget() {
  const { clinic } = useAuth();
  const [patients, setPatients] = useState<BirthdayPatient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clinic?.id) fetchBirthdays();
  }, [clinic?.id]);

  const fetchBirthdays = async () => {
    if (!clinic?.id) return;
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    // Get patients with birthdays today or in the next 7 days
    const { data, error } = await supabase
      .from('patients')
      .select('id, full_name, birth_date, phone')
      .eq('clinic_id', clinic.id)
      .eq('is_active', true)
      .not('birth_date', 'is', null);

    if (error) {
      console.error('Error fetching birthdays:', error);
      setLoading(false);
      return;
    }

    const upcoming = (data || [])
      .filter(p => {
        if (!p.birth_date) return false;
        const bd = new Date(p.birth_date);
        const bdMonth = bd.getMonth() + 1;
        const bdDay = bd.getDate();
        // Check next 7 days
        for (let i = 0; i < 7; i++) {
          const check = new Date(today);
          check.setDate(check.getDate() + i);
          if (check.getMonth() + 1 === bdMonth && check.getDate() === bdDay) return true;
        }
        return false;
      })
      .map(p => {
        const bd = new Date(p.birth_date!);
        const isToday = bd.getMonth() + 1 === month && bd.getDate() === day;
        return { ...p, birth_date: p.birth_date!, isToday };
      })
      .sort((a, b) => {
        if (a.isToday && !b.isToday) return -1;
        if (!a.isToday && b.isToday) return 1;
        return 0;
      });

    setPatients(upcoming);
    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (patients.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Cake className="h-4 w-4 text-pink-500" />
          Дни рождения
          <Badge variant="secondary" className="ml-auto">{patients.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {patients.slice(0, 5).map(p => (
            <Link
              key={p.id}
              to={`/patients/${p.id}`}
              className="flex items-center justify-between py-1 hover:text-primary transition-colors text-sm"
            >
              <span className="truncate">
                {p.full_name}
                {p.isToday && <Badge variant="default" className="ml-2 text-xs">Сегодня!</Badge>}
              </span>
              <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                {format(new Date(p.birth_date), 'dd MMM', { locale: ru })}
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
