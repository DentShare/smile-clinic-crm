import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { useStaffScope } from '@/hooks/use-staff-scope';
import { DoctorFilterTabs } from '@/components/dashboard/DoctorFilterTabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Search, Loader2 } from 'lucide-react';
import type { Patient } from '@/types/database';

const Patients = () => {
  const navigate = useNavigate();
  const { clinic } = useAuth();
  const { hasFullAccess, allStaff, selectedDoctorId, setSelectedDoctorId, effectiveDoctorIds, isLoading: scopeLoading } = useStaffScope();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({
    full_name: '',
    phone: '',
    birth_date: '',
    gender: '',
    source: ''
  });

  const fetchPatients = async () => {
    if (!clinic?.id) return;

    try {
      // FIXED: Optimized to use a single query instead of N+1
      if (effectiveDoctorIds !== null) {
        if (effectiveDoctorIds.length === 0) {
          setPatients([]);
          setIsLoading(false);
          return;
        }

        // Use a single query with JOIN to get patients who have appointments with specific doctors
        // This is more efficient than fetching appointments first, then fetching patients
        const { data: appointmentsWithPatients, error } = await supabase
          .from('appointments')
          .select('patient:patients(*)')
          .eq('clinic_id', clinic.id)
          .in('doctor_id', effectiveDoctorIds);

        if (error) {
          toast.error('Ошибка загрузки пациентов');
          console.error('[Patients] Error fetching patients with JOIN:', error);
          setPatients([]);
        } else {
          // Extract unique patients from the joined data
          const patientsMap = new Map();
          (appointmentsWithPatients || []).forEach((appt: any) => {
            if (appt.patient && appt.patient.id) {
              patientsMap.set(appt.patient.id, appt.patient);
            }
          });

          // Convert map to array and sort by created_at
          const uniquePatients = Array.from(patientsMap.values()) as Patient[];
          uniquePatients.sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );

          setPatients(uniquePatients);
        }
      } else {
        // Full access - show all patients
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .eq('clinic_id', clinic.id)
          .order('created_at', { ascending: false });

        if (error) {
          toast.error('Ошибка загрузки пациентов');
          console.error('[Patients] Error fetching all patients:', error);
          setPatients([]);
        } else {
          setPatients(data as Patient[]);
        }
      }
    } catch (err) {
      console.error('[Patients] Unexpected error:', err);
      toast.error('Неожиданная ошибка при загрузке пациентов');
      setPatients([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!scopeLoading) {
      fetchPatients();
    }
  }, [clinic?.id, effectiveDoctorIds, scopeLoading]);

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic?.id) return;

    const { error } = await supabase.from('patients').insert({
      clinic_id: clinic.id,
      full_name: newPatient.full_name,
      phone: newPatient.phone,
      birth_date: newPatient.birth_date || null,
      gender: newPatient.gender || null,
      source: newPatient.source || null
    });

    if (error) {
      toast.error('Ошибка создания пациента');
      console.error(error);
    } else {
      toast.success('Пациент добавлен');
      setIsDialogOpen(false);
      setNewPatient({ full_name: '', phone: '', birth_date: '', gender: '', source: '' });
      fetchPatients();
    }
  };

  const filteredPatients = patients.filter(
    (p) =>
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Пациенты</h1>
          <p className="text-muted-foreground">Управление базой пациентов</p>
        </div>

        {/* Doctor filter tabs (for admin/director) */}
        {hasFullAccess && allStaff.length > 0 && (
          <DoctorFilterTabs
            doctors={allStaff}
            selectedDoctorId={selectedDoctorId}
            onSelect={setSelectedDoctorId}
          />
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Добавить пациента
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новый пациент</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreatePatient} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">ФИО *</Label>
                <Input
                  id="full_name"
                  value={newPatient.full_name}
                  onChange={(e) => setNewPatient({ ...newPatient, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Телефон *</Label>
                <Input
                  id="phone"
                  placeholder="+998901234567"
                  value={newPatient.phone}
                  onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birth_date">Дата рождения</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={newPatient.birth_date}
                    onChange={(e) => setNewPatient({ ...newPatient, birth_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Пол</Label>
                  <select
                    id="gender"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={newPatient.gender}
                    onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                  >
                    <option value="">Не указан</option>
                    <option value="male">Мужской</option>
                    <option value="female">Женский</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Источник</Label>
                <Input
                  id="source"
                  placeholder="Instagram, рекомендация..."
                  value={newPatient.source}
                  onChange={(e) => setNewPatient({ ...newPatient, source: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">
                Добавить
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени или телефону..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          {searchQuery ? 'Пациенты не найдены' : 'Нет пациентов. Добавьте первого!'}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ФИО</TableHead>
                <TableHead>Телефон</TableHead>
                <TableHead>Дата рождения</TableHead>
                <TableHead>Источник</TableHead>
                <TableHead>Баланс</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.map((patient) => (
                <TableRow 
                  key={patient.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/patients/${patient.id}`)}
                >
                  <TableCell className="font-medium">{patient.full_name}</TableCell>
                  <TableCell>{patient.phone}</TableCell>
                  <TableCell>
                    {patient.birth_date
                      ? new Date(patient.birth_date).toLocaleDateString('ru-RU')
                      : '—'}
                  </TableCell>
                  <TableCell>{patient.source || '—'}</TableCell>
                  <TableCell
                    className={patient.balance < 0 ? 'text-destructive' : 'text-success'}
                  >
                    {patient.balance.toLocaleString()} сум
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default Patients;
