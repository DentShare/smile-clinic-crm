import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Calendar, Clock, User, Phone, CheckCircle, Loader2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { format, addDays, startOfDay, isSameDay, getDay, parse } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ClinicInfo {
  id: string; name: string; phone: string | null; address: string | null; logo_url: string | null;
}
interface ServiceInfo {
  id: string; name: string; price: number; duration_minutes: number;
}
interface DoctorInfo {
  id: string; full_name: string; specialization: string | null; avatar_url: string | null;
}
interface ScheduleInfo {
  doctor_id: string; day_of_week: number; start_time: string; end_time: string; is_working: boolean | null;
}
interface BookedSlot {
  doctor_id: string | null; start_time: string; end_time: string;
}

type Step = 'service' | 'doctor' | 'datetime' | 'info' | 'success';

const PublicBooking = () => {
  const { subdomain } = useParams<{ subdomain: string }>();
  const [step, setStep] = useState<Step>('service');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Data from API
  const [clinic, setClinic] = useState<ClinicInfo | null>(null);
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [doctors, setDoctors] = useState<DoctorInfo[]>([]);
  const [schedules, setSchedules] = useState<ScheduleInfo[]>([]);
  const [bookedSlots, setBoostedSlots] = useState<BookedSlot[]>([]);

  // Selection state
  const [selectedService, setSelectedService] = useState<ServiceInfo | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorInfo | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedTime, setSelectedTime] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [complaints, setComplaints] = useState('');
  const [appointmentId, setAppointmentId] = useState('');

  // Fetch clinic data
  useEffect(() => {
    if (!subdomain) return;
    fetchClinicData();
  }, [subdomain]);

  // Fetch booked slots when date changes
  useEffect(() => {
    if (!subdomain || !selectedDate) return;
    fetchBookedSlots(format(selectedDate, 'yyyy-MM-dd'));
  }, [subdomain, selectedDate]);

  const fetchClinicData = async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase.functions.invoke('public-booking', {
        method: 'GET',
        body: undefined,
        headers: { 'Content-Type': 'application/json' },
      });

      // Workaround: GET with query params via function invoke
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || 'https://vdihwysnyyipkvaevzyp.supabase.co'}/functions/v1/public-booking?subdomain=${subdomain}`,
        { headers: { 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkaWh3eXNueXlpcGt2YWV2enlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc0NDIyMzMsImV4cCI6MjA1MzAxODIzM30.UxN93RRaZrqFD-ImANZLZy-6KfU8236v0j11gXjCAbE' } },
      );
      const json = await res.json();

      if (json.error) {
        setError(json.error);
        return;
      }

      setClinic(json.clinic);
      setServices(json.services || []);
      setDoctors(json.doctors || []);
      setSchedules(json.schedules || []);
    } catch {
      setError('Не удалось загрузить данные клиники');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookedSlots = async (date: string) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || 'https://vdihwysnyyipkvaevzyp.supabase.co'}/functions/v1/public-booking?subdomain=${subdomain}&date=${date}`,
        { headers: { 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkaWh3eXNueXlpcGt2YWV2enlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc0NDIyMzMsImV4cCI6MjA1MzAxODIzM30.UxN93RRaZrqFD-ImANZLZy-6KfU8236v0j11gXjCAbE' } },
      );
      const json = await res.json();
      setBoostedSlots(json.bookedSlots || []);
    } catch { /* ignore */ }
  };

  // Calculate available time slots
  const availableSlots = useMemo(() => {
    if (!selectedDate || !selectedDoctor) return [];

    const dayOfWeek = getDay(selectedDate);
    const duration = selectedService?.duration_minutes || 30;

    // Find doctor schedule for this day
    let schedule = schedules.find(
      s => s.doctor_id === selectedDoctor.id && s.day_of_week === dayOfWeek
    );

    // Fallback to clinic-wide schedule
    if (!schedule) {
      schedule = schedules.find(
        s => s.doctor_id === '00000000-0000-0000-0000-000000000000' && s.day_of_week === dayOfWeek
      );
    }

    if (!schedule || schedule.is_working === false) return [];

    const startHour = parseInt(schedule.start_time.split(':')[0]);
    const startMin = parseInt(schedule.start_time.split(':')[1] || '0');
    const endHour = parseInt(schedule.end_time.split(':')[0]);
    const endMin = parseInt(schedule.end_time.split(':')[1] || '0');

    const slots: string[] = [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    for (let h = startHour; h < endHour || (h === endHour && 0 < endMin); h++) {
      for (let m = (h === startHour ? startMin : 0); m < 60; m += 15) {
        if (h === endHour && m >= endMin) break;

        const slotStart = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const slotStartTime = new Date(`${dateStr}T${slotStart}:00`);
        const slotEndTime = new Date(slotStartTime.getTime() + duration * 60 * 1000);

        // Skip past times
        if (isSameDay(selectedDate, new Date()) && slotStartTime <= new Date()) continue;

        // Check conflicts
        const isBooked = bookedSlots.some(b => {
          if (b.doctor_id && b.doctor_id !== selectedDoctor.id) return false;
          const bStart = new Date(b.start_time);
          const bEnd = new Date(b.end_time);
          return slotStartTime < bEnd && slotEndTime > bStart;
        });

        if (!isBooked) {
          slots.push(slotStart);
        }
      }
    }

    return slots;
  }, [selectedDate, selectedDoctor, selectedService, schedules, bookedSlots]);

  // Date navigation (next 14 days)
  const dateOptions = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < 14; i++) {
      dates.push(addDays(startOfDay(new Date()), i));
    }
    return dates;
  }, []);

  const handleSubmit = async () => {
    if (!selectedService || !selectedDoctor || !selectedTime || !patientName || !patientPhone) return;
    setSubmitting(true);

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const duration = selectedService.duration_minutes || 30;
    const startTime = new Date(`${dateStr}T${selectedTime}:00`);
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || 'https://vdihwysnyyipkvaevzyp.supabase.co'}/functions/v1/public-booking`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkaWh3eXNueXlpcGt2YWV2enlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc0NDIyMzMsImV4cCI6MjA1MzAxODIzM30.UxN93RRaZrqFD-ImANZLZy-6KfU8236v0j11gXjCAbE',
          },
          body: JSON.stringify({
            subdomain,
            patientName,
            patientPhone,
            serviceId: selectedService.id,
            doctorId: selectedDoctor.id,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            complaints,
          }),
        },
      );

      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setAppointmentId(json.appointmentId);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Ошибка записи');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !clinic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <p className="text-destructive font-medium">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">Клиника не найдена или недоступна</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{clinic?.name}</h1>
            <p className="text-xs text-muted-foreground">{clinic?.address || 'Онлайн-запись'}</p>
          </div>
          {clinic?.phone && (
            <a href={`tel:${clinic.phone}`} className="text-sm text-primary hover:underline flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" />
              {clinic.phone}
            </a>
          )}
        </div>
      </div>

      {/* Steps indicator */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center gap-2 text-sm mb-6">
          {(['service', 'doctor', 'datetime', 'info'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <Badge
                variant={step === s ? 'default' : step === 'success' || (['service', 'doctor', 'datetime', 'info'].indexOf(step) > i) ? 'secondary' : 'outline'}
                className="text-xs"
              >
                {s === 'service' ? 'Услуга' : s === 'doctor' ? 'Врач' : s === 'datetime' ? 'Дата и время' : 'Данные'}
              </Badge>
            </div>
          ))}
        </div>

        {error && step !== 'success' && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Step 1: Select Service */}
        {step === 'service' && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Выберите услугу</h2>
            <div className="grid gap-2">
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedService(s); setStep('doctor'); }}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-lg border-2 text-left transition-all',
                    selectedService?.id === s.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.duration_minutes} мин</p>
                  </div>
                  <span className="font-semibold text-primary">{s.price.toLocaleString('ru-RU')} so'm</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Doctor */}
        {step === 'doctor' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setStep('service')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-semibold">Выберите врача</h2>
            </div>
            <div className="grid gap-2">
              {doctors.map((d) => (
                <button
                  key={d.id}
                  onClick={() => { setSelectedDoctor(d); setStep('datetime'); }}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-all',
                    selectedDoctor?.id === d.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{d.full_name}</p>
                    {d.specialization && <p className="text-xs text-muted-foreground">{d.specialization}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Date & Time */}
        {step === 'datetime' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setStep('doctor')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-semibold">Выберите дату и время</h2>
            </div>

            {/* Date selector */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Calendar className="h-4 w-4" />Дата</Label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {dateOptions.map((d) => (
                  <button
                    key={d.toISOString()}
                    onClick={() => { setSelectedDate(d); setSelectedTime(''); }}
                    className={cn(
                      'flex flex-col items-center px-3 py-2 rounded-lg border-2 min-w-[70px] transition-all flex-shrink-0',
                      isSameDay(d, selectedDate)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <span className="text-xs text-muted-foreground capitalize">
                      {format(d, 'EEE', { locale: ru })}
                    </span>
                    <span className="font-semibold">{format(d, 'd')}</span>
                    <span className="text-xs text-muted-foreground">{format(d, 'MMM', { locale: ru })}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Time slots */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Clock className="h-4 w-4" />Время</Label>
              {availableSlots.length > 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {availableSlots.map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={cn(
                        'py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all',
                        selectedTime === time
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Нет доступных слотов на этот день
                </p>
              )}
            </div>

            {selectedTime && (
              <Button className="w-full" onClick={() => setStep('info')}>
                Далее
              </Button>
            )}
          </div>
        )}

        {/* Step 4: Patient info */}
        {step === 'info' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setStep('datetime')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-semibold">Ваши данные</h2>
            </div>

            {/* Summary */}
            <Card className="bg-muted/50">
              <CardContent className="p-4 space-y-1 text-sm">
                <p><strong>Услуга:</strong> {selectedService?.name}</p>
                <p><strong>Врач:</strong> {selectedDoctor?.full_name}</p>
                <p><strong>Дата:</strong> {format(selectedDate, 'dd MMMM yyyy', { locale: ru })}, {selectedTime}</p>
                <p><strong>Стоимость:</strong> {selectedService?.price.toLocaleString('ru-RU')} so'm</p>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Ваше имя *</Label>
                <Input
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Иван Иванов"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Телефон *</Label>
                <Input
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Жалобы / комментарий</Label>
                <Textarea
                  value={complaints}
                  onChange={(e) => setComplaints(e.target.value)}
                  placeholder="Опишите проблему..."
                  rows={3}
                />
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              disabled={!patientName || !patientPhone || submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {submitting ? 'Запись...' : 'Записаться'}
            </Button>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 'success' && (
          <div className="text-center space-y-4 py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">Вы записаны!</h2>
            <Card className="bg-muted/50 text-left">
              <CardContent className="p-4 space-y-1 text-sm">
                <p><strong>Услуга:</strong> {selectedService?.name}</p>
                <p><strong>Врач:</strong> {selectedDoctor?.full_name}</p>
                <p><strong>Дата:</strong> {format(selectedDate, 'dd MMMM yyyy', { locale: ru })}, {selectedTime}</p>
                <p><strong>Клиника:</strong> {clinic?.name}</p>
              </CardContent>
            </Card>
            <p className="text-sm text-muted-foreground">
              Мы отправим вам напоминание перед приёмом.
              {clinic?.phone && (
                <> Если нужно отменить — позвоните: <a href={`tel:${clinic.phone}`} className="text-primary">{clinic.phone}</a></>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicBooking;
