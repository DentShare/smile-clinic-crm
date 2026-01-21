import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Phone, 
  Calendar, 
  User, 
  FileText, 
  CreditCard,
  MessageCircle,
  Plus,
  Printer,
  Send,
  Clock,
  Activity,
  ChevronRight
} from 'lucide-react';
import ToothChart from '@/components/dental/ToothChart';
import ToothStatusHistory from '@/components/dental/ToothStatusHistory';
import type { Patient } from '@/types/database';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { formatPhone } from '@/lib/formatters';

const PatientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { clinic, isDoctor, isClinicAdmin } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && clinic) {
      fetchPatient();
    }
  }, [id, clinic]);

  const fetchPatient = async () => {
    if (!clinic || !id) return;

    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .eq('clinic_id', clinic.id)
        .single();

      if (error) throw error;
      setPatient(data as Patient);
    } catch (error) {
      console.error('Error fetching patient:', error);
      toast.error('Пациент не найден');
      navigate('/patients');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  if (!patient) {
    return null;
  }

  const canEditToothChart = isDoctor || isClinicAdmin;
  const initials = patient.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Compact Header */}
      <div className="flex items-center gap-3 pb-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/patients')} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold truncate">{patient.full_name}</h1>
      </div>

      {/* 3-Column Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        {/* LEFT COLUMN - Patient Info (Static) */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardContent className="p-4">
              {/* Avatar and Name */}
              <div className="flex flex-col items-center text-center mb-4">
                <Avatar className="h-20 w-20 mb-3">
                  <AvatarImage src="" alt={patient.full_name} />
                  <AvatarFallback className="text-xl bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <h2 className="font-semibold text-lg">{patient.full_name}</h2>
                {patient.birth_date && (
                  <p className="text-sm text-muted-foreground">
                    {calculateAge(patient.birth_date)} лет
                  </p>
                )}
              </div>

              <Separator className="my-4" />

              {/* Contact Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Телефон</p>
                    <p className="text-sm font-medium truncate">{formatPhone(patient.phone)}</p>
                  </div>
                </div>

                {/* Telegram link */}
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-info/10">
                    <MessageCircle className="h-4 w-4 text-info" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Telegram</p>
                    <a href={`https://t.me/+${patient.phone.replace(/\D/g, '')}`} 
                       className="text-sm font-medium text-primary hover:underline truncate block"
                       target="_blank" rel="noopener noreferrer">
                      Написать
                    </a>
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Balance - Highlighted */}
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground mb-1">Баланс</p>
                <CurrencyDisplay 
                  amount={patient.balance} 
                  size="lg" 
                  colorBySign={true}
                />
              </div>

              <Separator className="my-4" />

              {/* Additional Info */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Пол</span>
                  <span>{patient.gender === 'male' ? 'М' : patient.gender === 'female' ? 'Ж' : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Источник</span>
                  <span className="truncate ml-2">{patient.source || '—'}</span>
                </div>
                {patient.pinfl && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ПИНФЛ</span>
                    <span className="font-mono text-xs">{patient.pinfl}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Карта создана</span>
                  <span>{format(new Date(patient.created_at), 'dd.MM.yy')}</span>
                </div>
              </div>

              {/* Notes */}
              {patient.notes && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Заметки</p>
                    <p className="text-sm">{patient.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* CENTER COLUMN - Tooth Chart & Timeline (Dynamic) */}
        <div className="lg:col-span-6 flex flex-col gap-4 min-h-0">
          {/* Tooth Chart - Always Visible */}
          <Card className="shrink-0">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                🦷 Зубная формула
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <ToothChart patientId={patient.id} readOnly={!canEditToothChart} />
            </CardContent>
          </Card>

          {/* Timeline - Scrollable */}
          <Card className="flex-1 min-h-0 flex flex-col">
            <CardHeader className="py-3 px-4 shrink-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                История лечения
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0">
              <ScrollArea className="h-full max-h-[400px]">
                <div className="p-4 space-y-3">
                  {/* Timeline items - Mixed visits, payments, x-rays */}
                  <TimelineItem 
                    type="visit"
                    date="21.01.2026"
                    title="Консультация"
                    description="Первичный осмотр, составлен план лечения"
                    doctor="Dr. Иванов"
                  />
                  <TimelineItem 
                    type="payment"
                    date="21.01.2026"
                    title="Оплата"
                    description="Консультация"
                    amount={150000}
                  />
                  <TimelineItem 
                    type="history"
                    date="21.01.2026"
                    title="Изменение статуса зуба #16"
                    description="Здоров → Кариес"
                  />
                  
                  {/* Tooth Status History */}
                  <ToothStatusHistory patientId={patient.id} />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN - Quick Actions */}
        <div className="lg:col-span-3 space-y-4">
          {/* Primary Actions */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base">Действия</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              <Button className="w-full justify-start gap-2" size="sm">
                <Plus className="h-4 w-4" />
                Создать визит
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                <Printer className="h-4 w-4" />
                Печать счёта
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                <Send className="h-4 w-4" />
                SMS напоминание
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                <CreditCard className="h-4 w-4" />
                Принять оплату
              </Button>
            </CardContent>
          </Card>

          {/* Upcoming Appointments */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Предстоящие визиты
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-sm text-muted-foreground text-center py-4">
                Нет запланированных визитов
              </div>
            </CardContent>
          </Card>

          {/* Debts */}
          {patient.balance < 0 && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-base text-destructive flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Задолженность
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <CurrencyDisplay 
                  amount={Math.abs(patient.balance)} 
                  size="lg"
                  className="text-destructive"
                />
                <Button variant="destructive" size="sm" className="w-full mt-3">
                  Запросить оплату
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Документы
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              <DocumentLink title="Согласие на лечение" date="21.01.2026" />
              <DocumentLink title="Договор" date="21.01.2026" />
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground">
                <Plus className="h-4 w-4" />
                Добавить документ
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Timeline item component
interface TimelineItemProps {
  type: 'visit' | 'payment' | 'xray' | 'history';
  date: string;
  title: string;
  description?: string;
  doctor?: string;
  amount?: number;
}

const TimelineItem = ({ type, date, title, description, doctor, amount }: TimelineItemProps) => {
  const icons = {
    visit: <Calendar className="h-3 w-3" />,
    payment: <CreditCard className="h-3 w-3" />,
    xray: <FileText className="h-3 w-3" />,
    history: <Clock className="h-3 w-3" />,
  };

  const colors = {
    visit: 'bg-primary/10 text-primary',
    payment: 'bg-success/10 text-success',
    xray: 'bg-info/10 text-info',
    history: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="flex gap-3 group cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-2 rounded-lg transition-colors">
      <div className={`p-1.5 rounded-full shrink-0 ${colors[type]}`}>
        {icons[type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate">{title}</p>
          <span className="text-xs text-muted-foreground shrink-0">{date}</span>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        )}
        {doctor && (
          <p className="text-xs text-muted-foreground">{doctor}</p>
        )}
        {amount !== undefined && (
          <CurrencyDisplay amount={amount} size="sm" className="text-success" />
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 self-center" />
    </div>
  );
};

// Document link component
const DocumentLink = ({ title, date }: { title: string; date: string }) => (
  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer group">
    <div className="flex items-center gap-2 min-w-0">
      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-sm truncate">{title}</span>
    </div>
    <span className="text-xs text-muted-foreground shrink-0">{date}</span>
  </div>
);

export default PatientDetail;
