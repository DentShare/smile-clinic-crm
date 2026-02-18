import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, DoorOpen, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Room } from '@/types/database';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export function RoomManager() {
  const { clinic } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', color: '#3b82f6' });

  useEffect(() => {
    if (clinic?.id) fetchRooms();
  }, [clinic?.id]);

  const fetchRooms = async () => {
    if (!clinic?.id) return;
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('clinic_id', clinic.id)
      .order('created_at');
    if (error) { console.error('Error fetching rooms:', error); }
    setRooms(data || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!clinic?.id || !form.name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('rooms').insert({
      clinic_id: clinic.id,
      name: form.name.trim(),
      color: form.color,
    });
    if (error) toast.error('Ошибка: ' + error.message);
    else {
      toast.success('Кабинет создан');
      setForm({ name: '', color: '#3b82f6' });
      setShowCreate(false);
      await fetchRooms();
    }
    setSaving(false);
  };

  const toggleRoom = async (id: string, active: boolean) => {
    const { error } = await supabase.from('rooms').update({ is_active: active }).eq('id', id);
    if (error) toast.error('Ошибка: ' + error.message);
    await fetchRooms();
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <DoorOpen className="h-5 w-5" />
            Кабинеты
          </span>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Добавить
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rooms.length > 0 ? (
          <div className="space-y-2">
            {rooms.map(room => (
              <div key={room.id} className="flex items-center gap-3 py-2 px-3 rounded-lg border">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: room.color }} />
                <span className="text-sm font-medium flex-1">{room.name}</span>
                <Badge variant={room.is_active ? 'default' : 'secondary'} className="text-xs">
                  {room.is_active ? 'Активный' : 'Неактивный'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleRoom(room.id, !room.is_active)}
                >
                  {room.is_active ? 'Выкл' : 'Вкл'}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Кабинеты не созданы</p>
        )}
      </CardContent>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Новый кабинет</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Кабинет 1"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Цвет</Label>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Отмена</Button>
            <Button onClick={handleCreate} disabled={saving || !form.name.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
