import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import type { PatientTag } from '@/types/database';

interface Props {
  patientId: string;
  editable?: boolean;
}

export function PatientTagBadges({ patientId, editable = false }: Props) {
  const { clinic } = useAuth();
  const [assignedTags, setAssignedTags] = useState<PatientTag[]>([]);
  const [allTags, setAllTags] = useState<PatientTag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (clinic?.id && patientId) fetchTags();
  }, [clinic?.id, patientId]);

  const fetchTags = async () => {
    if (!clinic?.id) return;
    const [assignedRes, allRes] = await Promise.all([
      supabase
        .from('patient_tag_assignments')
        .select('tag:patient_tags(*)')
        .eq('patient_id', patientId),
      supabase
        .from('patient_tags')
        .select('*')
        .eq('clinic_id', clinic.id)
        .order('name'),
    ]);
    setAssignedTags((assignedRes.data || []).map((r: any) => r.tag).filter(Boolean));
    setAllTags(allRes.data || []);
  };

  const assignTag = async (tagId: string) => {
    const { error } = await supabase
      .from('patient_tag_assignments')
      .insert({ patient_id: patientId, tag_id: tagId });
    if (error && !error.message.includes('duplicate')) {
      toast.error('Ошибка: ' + error.message);
      return;
    }
    await fetchTags();
  };

  const removeTag = async (tagId: string) => {
    await supabase
      .from('patient_tag_assignments')
      .delete()
      .eq('patient_id', patientId)
      .eq('tag_id', tagId);
    await fetchTags();
  };

  const createAndAssign = async () => {
    if (!clinic?.id || !newTagName.trim()) return;
    const { data, error } = await supabase
      .from('patient_tags')
      .insert({ clinic_id: clinic.id, name: newTagName.trim() })
      .select()
      .single();
    if (error) {
      toast.error('Ошибка: ' + error.message);
      return;
    }
    setNewTagName('');
    await assignTag(data.id);
  };

  const unassigned = allTags.filter(t => !assignedTags.find(a => a.id === t.id));

  return (
    <div className="flex flex-wrap items-center gap-1">
      {assignedTags.map(tag => (
        <Badge
          key={tag.id}
          variant="secondary"
          style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color + '40' }}
          className="text-xs border"
        >
          {tag.name}
          {editable && (
            <button onClick={() => removeTag(tag.id)} className="ml-1 hover:text-destructive">
              <X className="h-2.5 w-2.5" />
            </button>
          )}
        </Badge>
      ))}
      {editable && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
              <Plus className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            <div className="space-y-1">
              {unassigned.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => { assignTag(tag.id); setOpen(false); }}
                  className="w-full text-left text-sm px-2 py-1 rounded hover:bg-accent flex items-center gap-2"
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                </button>
              ))}
              <div className="flex gap-1 pt-1 border-t">
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Новый тег"
                  className="h-7 text-xs"
                  onKeyDown={(e) => e.key === 'Enter' && createAndAssign()}
                />
                <Button size="sm" className="h-7 px-2" onClick={createAndAssign} disabled={!newTagName.trim()}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
