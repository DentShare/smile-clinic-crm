import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import type { Profile } from '@/types/database';

interface DaySchedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working: boolean;
}

interface DoctorSchedule {
  doctor_id: string;
  schedules: DaySchedule[];
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Понедельник', short: 'Пн' },
  { value: 2, label: 'Вторник', short: 'Вт' },
  { value: 3, label: 'Среда', short: 'Ср' },
  { value: 4, label: 'Четверг', short: 'Чт' },
  { value: 5, label: 'Пятница', short: 'Пт' },
  { value: 6, label: 'Суббота', short: 'Сб' },
  { value: 0, label: 'Воскресенье', short: 'Вс' },
];

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => 
  `${i.toString().padStart(2, '0')}:00`
);

const DEFAULT_SCHEDULE: DaySchedule[] = DAYS_OF_WEEK.map(day => ({
  day_of_week: day.value,
  start_time: '09:00',
  end_time: '18:00',
  is_working: day.value >= 1 && day.value <= 5,
}));

export function WorkScheduleSettings() {
  const { clinic } = useAuth();
  const [doctors, setDoctors] = useState<Profile[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('clinic');
  const [schedules, setSchedules] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchDoctors = async () => {
    if (!clinic?.id) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('clinic_id', clinic.id)
      .eq('is_active', true)
      .order('full_name');
    if (error) console.error('Error fetching doctors:', error);

    if (data) {
      setDoctors(data as Profile[]);
    }
  };

  const fetchSchedules = async () => {
    if (!clinic?.id) return;
    setIsLoading(true);

    // For clinic schedule, use the null UUID
    // For doctors, use their user_id (not profile id)
    const doctorUserId = selectedDoctor === 'clinic' 
      ? '00000000-0000-0000-0000-000000000000' 
      : selectedDoctor;

    const { data, error } = await supabase
      .from('doctor_schedules')
      .select('*')
      .eq('clinic_id', clinic.id)
      .eq('doctor_id', doctorUserId);

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching schedules:', error);
    }

    if (data && data.length > 0) {
      const mappedSchedules = DAYS_OF_WEEK.map(day => {
        const existing = data.find(s => s.day_of_week === day.value);
        return existing ? {
          day_of_week: existing.day_of_week,
          start_time: existing.start_time,
          end_time: existing.end_time,
          is_working: existing.is_working,
        } : {
          day_of_week: day.value,
          start_time: '09:00',
          end_time: '18:00',
          is_working: day.value >= 1 && day.value <= 5,
        };
      });
      setSchedules(mappedSchedules);
    } else {
      setSchedules(DEFAULT_SCHEDULE);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchDoctors();
  }, [clinic?.id]);

  useEffect(() => {
    fetchSchedules();
  }, [clinic?.id, selectedDoctor]);

  const updateSchedule = (dayOfWeek: number, field: keyof DaySchedule, value: any) => {
    setSchedules(prev => prev.map(s => 
      s.day_of_week === dayOfWeek ? { ...s, [field]: value } : s
    ));
  };

  const handleSave = async () => {
    if (!clinic?.id) return;
    setIsSaving(true);

    try {
      // For clinic schedule, use the null UUID
      // For doctors, use their user_id
      const doctorUserId = selectedDoctor === 'clinic' 
        ? '00000000-0000-0000-0000-000000000000' 
        : selectedDoctor;

      // Delete existing schedules
      await supabase
        .from('doctor_schedules')
        .delete()
        .eq('clinic_id', clinic.id)
        .eq('doctor_id', doctorUserId);

      // Insert new schedules
      const schedulesToInsert = schedules.map(s => ({
        clinic_id: clinic.id,
        doctor_id: doctorUserId,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        is_working: s.is_working,
      }));

      const { error } = await supabase
        .from('doctor_schedules')
        .insert(schedulesToInsert);

      if (error) throw error;

      toast.success('График работы сохранён');
    } catch (error) {
      console.error('Error saving schedules:', error);
      toast.error('Ошибка при сохранении');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>График работы</CardTitle>
        <CardDescription>
          Настройте рабочие часы для клиники или отдельных врачей
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Doctor/Clinic selector */}
        <div className="flex items-center gap-4">
          <Label>График для:</Label>
          <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
            <SelectTrigger className="w-[250px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="clinic">Клиника (по умолчанию)</SelectItem>
              {doctors.map(doctor => (
                <SelectItem key={doctor.user_id} value={doctor.user_id}>
                  {doctor.full_name} {doctor.specialization && `(${doctor.specialization})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {DAYS_OF_WEEK.map(day => {
              const schedule = schedules.find(s => s.day_of_week === day.value);
              if (!schedule) return null;

              return (
                <div 
                  key={day.value}
                  className="flex items-center gap-4 p-3 rounded-lg border bg-card"
                >
                  <div className="w-28 flex items-center gap-2">
                    <Switch
                      checked={schedule.is_working}
                      onCheckedChange={(checked) => updateSchedule(day.value, 'is_working', checked)}
                    />
                    <span className={schedule.is_working ? 'font-medium' : 'text-muted-foreground'}>
                      {day.label}
                    </span>
                  </div>

                  {schedule.is_working && (
                    <div className="flex items-center gap-2 flex-1">
                      <Select 
                        value={schedule.start_time}
                        onValueChange={(v) => updateSchedule(day.value, 'start_time', v)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map(time => (
                            <SelectItem key={time} value={time}>{time}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <span className="text-muted-foreground">—</span>

                      <Select 
                        value={schedule.end_time}
                        onValueChange={(v) => updateSchedule(day.value, 'end_time', v)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map(time => (
                            <SelectItem key={time} value={time}>{time}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {!schedule.is_working && (
                    <span className="text-sm text-muted-foreground">Выходной</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Сохранить
        </Button>
      </CardContent>
    </Card>
  );
}
