import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Phone, 
  FileText, 
  CreditCard,
  MessageCircle,
  Plus,
  Printer,
  Send
} from 'lucide-react';
import ToothChart from '@/components/dental/ToothChart';
import { ImplantPassportCard } from '@/components/implants/ImplantPassportCard';
import TreatmentPlanCard from '@/components/treatment/TreatmentPlanCard';
import NewVisitSlideOver from '@/components/appointments/NewVisitSlideOver';
import { PatientFinanceSummary } from '@/components/finance/PatientFinanceSummary';
import { PaymentDialog } from '@/components/finance/PaymentDialog';
import { PatientUpcomingVisits } from '@/components/patient/PatientUpcomingVisits';
import { PatientHistoryTimeline } from '@/components/patient/PatientHistoryTimeline';
import { PatientDocumentsCard } from '@/components/documents/PatientDocumentsCard';
import { PatientNotificationHistory } from '@/components/patient/PatientNotificationHistory';
import { PrescriptionList } from '@/components/treatment/PrescriptionList';
import { ReferralTracker } from '@/components/patients/ReferralTracker';
import { PatientTagBadges } from '@/components/patients/PatientTagBadges';
import { PatientLoyaltyWidget } from '@/components/patient/PatientLoyaltyWidget';
import type { Patient } from '@/types/database';
import { format } from 'date-fns';
import { formatPhone } from '@/lib/formatters';

const PatientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { clinic, isDoctor, isClinicAdmin } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewVisitOpen, setIsNewVisitOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [financeRefreshKey, setFinanceRefreshKey] = useState(0);
  const [visitsRefreshKey, setVisitsRefreshKey] = useState(0);

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
                <div className="mt-2">
                  <PatientTagBadges patientId={patient.id} editable={isClinicAdmin} />
                </div>
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

          {/* History Timeline */}
          <PatientHistoryTimeline
            patientId={patient.id}
            patientName={patient.full_name}
            onRefresh={() => {
              fetchPatient();
              setFinanceRefreshKey(prev => prev + 1);
            }}
          />

          {/* Referrals */}
          <Card>
            <CardContent className="pt-4">
              <ReferralTracker patientId={patient.id} />
            </CardContent>
          </Card>
        </div>

        {/* CENTER COLUMN - Tooth Chart & Clinical (Dynamic) */}
        <div className="lg:col-span-6 flex flex-col gap-4 min-h-0">
          {/* Tooth Chart - Always Visible */}
          <ToothChart
            patientId={patient.id}
            readOnly={!canEditToothChart}
            patientBirthDate={patient.birth_date}
          />

          {/* Implant Passports */}
          <ImplantPassportCard
            patientId={patient.id}
            readOnly={!canEditToothChart}
            onScheduleVisit={(text) => {
              setIsNewVisitOpen(true);
            }}
          />

          {/* Treatment Plans */}
          <TreatmentPlanCard
            patientId={patient.id}
            patientName={patient.full_name}
            patientPhone={patient.phone}
            patientBirthDate={patient.birth_date}
            readOnly={!canEditToothChart}
          />

          {/* Prescriptions */}
          <Card>
            <CardContent className="pt-4">
              <PrescriptionList patientId={patient.id} />
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
              <Button 
                className="w-full justify-start gap-2" 
                size="sm"
                onClick={() => setIsNewVisitOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Создать визит
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2" 
                size="sm"
                onClick={() => {
                  toast.info('Функция печати счёта будет добавлена');
                }}
              >
                <Printer className="h-4 w-4" />
                Печать счёта
              </Button>
              {/* SMS button removed — use Notification History card below */}
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2" 
                size="sm"
                onClick={() => setIsPaymentOpen(true)}
              >
                <CreditCard className="h-4 w-4" />
                Принять оплату
              </Button>
            </CardContent>
          </Card>

          {/* Finance Summary */}
          <PatientFinanceSummary
            patientId={patient.id}
            key={financeRefreshKey}
          />

          {/* Loyalty, Packages, Deposits, Cards */}
          <PatientLoyaltyWidget patientId={patient.id} />

          {/* Upcoming Appointments - Real data */}
          <PatientUpcomingVisits
            patientId={patient.id}
            refreshKey={visitsRefreshKey}
            onCreateVisit={() => setIsNewVisitOpen(true)}
          />

          {/* Notification History */}
          <PatientNotificationHistory
            patientId={patient.id}
            patientName={patient.full_name}
            patientPhone={patient.phone}
          />

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

          {/* Documents - Dynamic from database */}
          <PatientDocumentsCard 
            patientId={patient.id}
            patientName={patient.full_name}
            clinicId={clinic?.id || ''}
          />
        </div>
      </div>

      {/* New Visit SlideOver */}
      <NewVisitSlideOver
        open={isNewVisitOpen}
        onOpenChange={setIsNewVisitOpen}
        preSelectedPatientId={patient.id}
        preSelectedPatientName={patient.full_name}
        onSuccess={() => setVisitsRefreshKey(k => k + 1)}
      />

      {/* Payment Dialog */}
      <PaymentDialog
        open={isPaymentOpen}
        onOpenChange={setIsPaymentOpen}
        patientId={patient.id}
        patientName={patient.full_name}
        currentDebt={patient.balance < 0 ? Math.abs(patient.balance) : 0}
        onPaymentComplete={() => {
          fetchPatient();
          setFinanceRefreshKey(prev => prev + 1);
        }}
        onCreateVisit={() => setIsNewVisitOpen(true)}
      />
    </div>
  );
};

export default PatientDetail;
