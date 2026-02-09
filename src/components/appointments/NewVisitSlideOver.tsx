import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription,
  SheetFooter 
} from '@/components/ui/sheet';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Search, 
  User, 
  Calendar as CalendarIcon, 
  Clock, 
  Star,
  Loader2,
  Check,
  ChevronsUpDown
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { formatPhone } from '@/lib/formatters';
import type { Patient, Profile, Service, ServiceCategory } from '@/types/database';
import { CategoryGroupedServiceSelect } from '@/components/services/CategoryGroupedServiceSelect';

interface NewVisitSlideOverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
  selectedTime?: string;
  selectedDoctorId?: string;
  preSelectedPatientId?: string;
  preSelectedPatientName?: string;
  onSuccess?: () => void;
}

// Service durations in minutes
const serviceDurations: Record<string, number> = {
  'Консультация': 30,
  'Чистка': 45,
  'Лечение кариеса': 60,
  'Удаление зуба': 45,
  'Имплантация': 90,
  'Протезирование': 60,
  'Отбеливание': 60,
};

const favoriteServices = ['Консультация', 'Чистка', 'Лечение кариеса'];

const NewVisitSlideOver = ({ open, onOpenChange, selectedDate, selectedTime, selectedDoctorId, preSelectedPatientId, preSelectedPatientName, onSuccess }: NewVisitSlideOverProps) => {
  const { clinic } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);

  // Form state
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Profile[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  
  const [patientSearch, setPatientSearch] = useState(preSelectedPatientName || '');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(
    preSelectedPatientId ? { id: preSelectedPatientId, full_name: preSelectedPatientName || '' } as Patient : null
  );
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [date, setDate] = useState<Date>(selectedDate || new Date());
  const [time, setTime] = useState(selectedTime || '10:00');
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState('');

  // New patient form
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');

  const [patientPopoverOpen, setPatientPopoverOpen] = useState(false);

  useEffect(() => {
    if (open && clinic) {
      fetchData();
    }
  }, [open, clinic]);

  useEffect(() => {
    if (selectedDate) {
      setDate(selectedDate);
    }
    if (selectedTime) {
      setTime(selectedTime);
    }
    if (selectedDoctorId) {
      setSelectedDoctor(selectedDoctorId);
    }
  }, [selectedDate, selectedTime, selectedDoctorId]);

  const fetchData = async () => {
    if (!clinic) return;
    setIsLoading(true);

    try {
      const [patientsRes, doctorsRes, servicesRes, categoriesRes] = await Promise.all([
        supabase.from('patients').select('*').eq('clinic_id', clinic.id).order('full_name'),
        supabase.from('profiles').select('*').eq('clinic_id', clinic.id).not('specialization', 'is', null),
        supabase.from('services').select('*').eq('clinic_id', clinic.id).eq('is_active', true),
        supabase.from('service_categories').select('*').eq('clinic_id', clinic.id).order('sort_order'),
      ]);

      if (patientsRes.data) setPatients(patientsRes.data as Patient[]);
      if (doctorsRes.data) setDoctors(doctorsRes.data as Profile[]);
      if (servicesRes.data) setServices(servicesRes.data as Service[]);
      if (categoriesRes.data) setCategories(categoriesRes.data as ServiceCategory[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.full_name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.phone.includes(patientSearch)
  ).slice(0, 10);

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId);
    // Find service and use its duration or fallback to defaults
    const service = services.find(s => s.id === serviceId);
    if (service) {
      setDuration(service.duration_minutes || serviceDurations[service.name] || 30);
    }
  };

  const handleSubmit = async () => {
    if (!clinic || !selectedPatient) {
      toast.error('Выберите пациента');
      return;
    }

    setIsSaving(true);

    try {
      const [hours, minutes] = time.split(':').map(Number);
      const startTime = new Date(date);
      startTime.setHours(hours, minutes, 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + duration);

      // Service ID is already stored as ID now
      const { error } = await supabase.from('appointments').insert({
        clinic_id: clinic.id,
        patient_id: selectedPatient.id,
        doctor_id: selectedDoctor || null,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'scheduled',
        complaints: notes || null,
        service_id: selectedService || null,
      });

      if (error) throw error;

      toast.success('Запись создана');
      resetForm();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('Ошибка создания записи');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedPatient(null);
    setSelectedDoctor('');
    setSelectedService('');
    setTime('10:00');
    setDuration(30);
    setNotes('');
    setPatientSearch('');
    setIsCreatingPatient(false);
    setNewPatientName('');
    setNewPatientPhone('');
  };

  const handleCreatePatient = async () => {
    if (!clinic || !newPatientName.trim() || !newPatientPhone.trim()) {
      toast.error('Введите имя и телефон пациента');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('patients')
        .insert({
          clinic_id: clinic.id,
          full_name: newPatientName.trim(),
          phone: newPatientPhone.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      setPatients(prev => [...prev, data as Patient]);
      setSelectedPatient(data as Patient);
      setIsCreatingPatient(false);
      setNewPatientName('');
      setNewPatientPhone('');
      toast.success('Пациент создан');
    } catch (error) {
      console.error('Error creating patient:', error);
      toast.error('Ошибка создания пациента');
    }
  };

  // Time slots
  const timeSlots = [];
  for (let h = 9; h <= 20; h++) {
    for (let m = 0; m < 60; m += 30) {
      timeSlots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b shrink-0">
          <SheetTitle>Новая запись</SheetTitle>
          <SheetDescription>
            Создайте новую запись на приём
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Patient Search or Create */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Пациент *</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => {
                        setIsCreatingPatient(!isCreatingPatient);
                        setSelectedPatient(null);
                      }}
                    >
                      {isCreatingPatient ? 'Выбрать из базы' : '+ Новый пациент'}
                    </Button>
                  </div>

                  {isCreatingPatient ? (
                    <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
                      <div className="space-y-2">
                        <Label className="text-xs">ФИО</Label>
                        <Input
                          placeholder="Иванов Иван Иванович"
                          value={newPatientName}
                          onChange={(e) => setNewPatientName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Телефон</Label>
                        <Input
                          placeholder="+998 90 123 45 67"
                          value={newPatientPhone}
                          onChange={(e) => setNewPatientPhone(e.target.value)}
                        />
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={handleCreatePatient}
                        disabled={!newPatientName.trim() || !newPatientPhone.trim()}
                      >
                        Создать пациента
                      </Button>
                    </div>
                  ) : (
                    <Popover open={patientPopoverOpen} onOpenChange={setPatientPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !selectedPatient && "text-muted-foreground"
                          )}
                        >
                          {selectedPatient ? (
                            <div className="flex items-center gap-2 truncate">
                              <User className="h-4 w-4 shrink-0" />
                              <span className="truncate">{selectedPatient.full_name}</span>
                            </div>
                          ) : (
                            "Поиск по имени или телефону..."
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[350px] p-0" align="start">
                        <Command>
                          <CommandInput 
                            placeholder="Введите имя или телефон..." 
                            value={patientSearch}
                            onValueChange={setPatientSearch}
                          />
                          <CommandList>
                            <CommandEmpty>
                              <div className="py-2 text-center">
                                <p className="text-sm text-muted-foreground mb-2">Пациент не найден</p>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setIsCreatingPatient(true);
                                    setNewPatientName(patientSearch);
                                    setPatientPopoverOpen(false);
                                  }}
                                >
                                  Создать нового пациента
                                </Button>
                              </div>
                            </CommandEmpty>
                            <CommandGroup>
                              {filteredPatients.map((patient) => (
                                <CommandItem
                                  key={patient.id}
                                  value={patient.full_name}
                                  onSelect={() => {
                                    setSelectedPatient(patient);
                                    setPatientPopoverOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedPatient?.id === patient.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span>{patient.full_name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {formatPhone(patient.phone)}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>

                {/* Service Selection */}
                <div className="space-y-2">
                  <Label>Услуга</Label>
                  
                  {/* Quick favorites - map to service IDs */}
                  <div className="flex flex-wrap gap-2">
                    {services
                      .filter(s => favoriteServices.includes(s.name))
                      .slice(0, 3)
                      .map((service) => (
                        <Button
                          key={service.id}
                          variant={selectedService === service.id ? "default" : "outline"}
                          size="sm"
                          className="gap-1"
                          onClick={() => handleServiceSelect(service.id)}
                        >
                          <Star className="h-3 w-3" />
                          {service.name}
                        </Button>
                      ))}
                  </div>

                  {/* Grouped service list */}
                  <CategoryGroupedServiceSelect
                    services={services}
                    categories={categories}
                    value={selectedService}
                    onValueChange={handleServiceSelect}
                    placeholder="Выберите услугу"
                    showPrice={true}
                  />
                </div>

                <Separator />

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Дата</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          {format(date, 'd MMM', { locale: ru })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={(d) => d && setDate(d)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Время</Label>
                    <Select value={time} onValueChange={setTime}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((slot) => (
                          <SelectItem key={slot} value={slot}>
                            {slot}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <Label>Длительность (мин)</Label>
                  <div className="flex gap-2">
                    {[30, 45, 60, 90].map((d) => (
                      <Button
                        key={d}
                        variant={duration === d ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDuration(d)}
                      >
                        {d}
                      </Button>
                    ))}
                    <Input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                      className="w-20"
                      min={15}
                      max={240}
                      step={15}
                    />
                  </div>
                </div>

                {/* Doctor */}
                <div className="space-y-2">
                  <Label>Врач</Label>
                  <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите врача" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          <div className="flex flex-col">
                            <span>{doctor.full_name}</span>
                            <span className="text-xs text-muted-foreground">{doctor.specialization}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Примечания</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Жалобы, комментарии..."
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="p-4 border-t shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || !selectedPatient}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Создать запись
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default NewVisitSlideOver;
