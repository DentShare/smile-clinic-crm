import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Link2, Unlink, Loader2, Stethoscope, HeartHandshake } from 'lucide-react';

interface StaffMember {
  id: string;
  full_name: string;
  user_id: string;
  specialization: string | null;
}

interface DoctorAssistantLink {
  id: string;
  doctor_id: string;
  assistant_id: string;
  doctor?: StaffMember;
  assistant?: StaffMember;
}

export function AssistantDoctorLinks() {
  const { clinic } = useAuth();
  const [doctors, setDoctors] = useState<StaffMember[]>([]);
  const [assistants, setAssistants] = useState<StaffMember[]>([]);
  const [links, setLinks] = useState<DoctorAssistantLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [selectedAssistant, setSelectedAssistant] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (clinic?.id) fetchAll();
  }, [clinic?.id]);

  const fetchAll = async () => {
    if (!clinic?.id) return;
    setIsLoading(true);

    // Get all profiles with their roles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, user_id, specialization')
      .eq('clinic_id', clinic.id)
      .eq('is_active', true)
      .order('full_name');

    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role');

    const roleMap = new Map<string, string[]>();
    (roles || []).forEach(r => {
      const existing = roleMap.get(r.user_id) || [];
      existing.push(r.role);
      roleMap.set(r.user_id, existing);
    });

    const doctorList = (profiles || []).filter(p => (roleMap.get(p.user_id) || []).includes('doctor'));
    const assistantList = (profiles || []).filter(p => (roleMap.get(p.user_id) || []).includes('nurse'));

    setDoctors(doctorList);
    setAssistants(assistantList);

    // Get existing links
    const { data: linkData } = await supabase
      .from('doctor_assistants')
      .select('*')
      .eq('clinic_id', clinic.id);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    const enrichedLinks = (linkData || []).map(l => ({
      ...l,
      doctor: profileMap.get(l.doctor_id),
      assistant: profileMap.get(l.assistant_id),
    }));

    setLinks(enrichedLinks);
    setIsLoading(false);
  };

  const handleAddLink = async () => {
    if (!clinic?.id || !selectedDoctor || !selectedAssistant) return;

    // Check if link already exists
    const exists = links.some(l => l.doctor_id === selectedDoctor && l.assistant_id === selectedAssistant);
    if (exists) {
      toast.error('Эта привязка уже существует');
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from('doctor_assistants')
      .insert({
        clinic_id: clinic.id,
        doctor_id: selectedDoctor,
        assistant_id: selectedAssistant,
      });

    if (error) {
      console.error('Error adding link:', error);
      toast.error('Ошибка при привязке');
    } else {
      toast.success('Ассистент привязан к врачу');
      setSelectedDoctor('');
      setSelectedAssistant('');
      fetchAll();
    }
    setIsSaving(false);
  };

  const handleRemoveLink = async (linkId: string) => {
    const { error } = await supabase
      .from('doctor_assistants')
      .delete()
      .eq('id', linkId);

    if (error) {
      toast.error('Ошибка при удалении привязки');
    } else {
      toast.success('Привязка удалена');
      fetchAll();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (doctors.length === 0 || assistants.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {doctors.length === 0 && assistants.length === 0
            ? 'Нет врачей и ассистентов для привязки'
            : doctors.length === 0
            ? 'Нет врачей для привязки'
            : 'Нет ассистентов для привязки'}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Привязка ассистентов к врачам
        </CardTitle>
        <CardDescription>
          Ассистент видит записи и дашборд привязанных врачей
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new link */}
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <label className="text-sm font-medium">Врач</label>
            <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите врача" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-3 w-3" />
                      {d.full_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 space-y-1.5">
            <label className="text-sm font-medium">Ассистент</label>
            <Select value={selectedAssistant} onValueChange={setSelectedAssistant}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите ассистента" />
              </SelectTrigger>
              <SelectContent>
                {assistants.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    <div className="flex items-center gap-2">
                      <HeartHandshake className="h-3 w-3" />
                      {a.full_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleAddLink}
            disabled={!selectedDoctor || !selectedAssistant || isSaving}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4 mr-1" />}
            Привязать
          </Button>
        </div>

        {/* Existing links */}
        {links.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Врач</TableHead>
                <TableHead>Ассистент</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map(link => (
                <TableRow key={link.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1">
                        <Stethoscope className="h-3 w-3" />
                        {link.doctor?.full_name || 'Неизвестно'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1">
                        <HeartHandshake className="h-3 w-3" />
                        {link.assistant?.full_name || 'Неизвестно'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveLink(link.id)}
                    >
                      <Unlink className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {links.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Нет привязок. Привяжите ассистента к врачу для ограничения видимости.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
