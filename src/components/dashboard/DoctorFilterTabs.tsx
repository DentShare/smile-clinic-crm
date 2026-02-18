import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Profile } from '@/types/database';
import { getDoctorColor } from '@/lib/doctor-colors';

interface DoctorFilterTabsProps {
  doctors: Pick<Profile, 'id' | 'full_name' | 'specialization'>[];
  selectedDoctorId: string | null;
  onSelect: (doctorId: string | null) => void;
}

export function DoctorFilterTabs({ doctors, selectedDoctorId, onSelect }: DoctorFilterTabsProps) {
  return (
    <Tabs
      value={selectedDoctorId ?? '__all__'}
      onValueChange={(v) => onSelect(v === '__all__' ? null : v)}
    >
      <TabsList className="h-auto flex-wrap gap-1">
        <TabsTrigger value="__all__" className="text-xs px-3 py-1.5">
          Общее
        </TabsTrigger>
        {doctors.map((doc, idx) => {
          const color = getDoctorColor(idx);
          return (
            <TabsTrigger key={doc.id} value={doc.id} className="text-xs px-3 py-1.5 gap-1.5">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: color.dot }}
              />
              {doc.full_name.split(' ').slice(0, 2).join(' ')}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
