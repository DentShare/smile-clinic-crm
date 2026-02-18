import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';
import type { StaffTask, TaskPriority, TaskStatus, Profile } from '@/types/database';

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  low: { label: 'Низкий', variant: 'outline' },
  normal: { label: 'Обычный', variant: 'secondary' },
  high: { label: 'Высокий', variant: 'default' },
  urgent: { label: 'Срочно', variant: 'destructive' },
};

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: typeof Circle }> = {
  pending: { label: 'Ожидает', icon: Circle },
  in_progress: { label: 'В работе', icon: Clock },
  completed: { label: 'Выполнена', icon: CheckCircle2 },
  cancelled: { label: 'Отменена', icon: AlertCircle },
};

const Tasks = () => {
  const { clinic, profile } = useAuth();
  const [tasks, setTasks] = useState<(StaffTask & { assignee_name?: string })[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'my' | 'pending' | 'completed'>('all');
  const [form, setForm] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'normal' as TaskPriority,
    due_date: '',
  });

  useEffect(() => {
    if (clinic?.id) fetchData();
  }, [clinic?.id]);

  const fetchData = async () => {
    if (!clinic?.id) return;
    setLoading(true);

    const [tasksRes, staffRes] = await Promise.all([
      supabase
        .from('staff_tasks')
        .select('*')
        .eq('clinic_id', clinic.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('*')
        .eq('clinic_id', clinic.id)
        .eq('is_active', true),
    ]);

    const staffList = staffRes.data || [];
    setStaff(staffList);

    const tasksList = (tasksRes.data || []).map(t => ({
      ...t,
      assignee_name: staffList.find(s => s.user_id === t.assigned_to)?.full_name,
    }));
    setTasks(tasksList);
    setLoading(false);
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'my') return t.assigned_to === profile?.user_id;
    if (filter === 'pending') return t.status === 'pending' || t.status === 'in_progress';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  const handleCreate = async () => {
    if (!clinic?.id || !form.title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('staff_tasks').insert({
      clinic_id: clinic.id,
      title: form.title.trim(),
      description: form.description || null,
      assigned_to: form.assigned_to || null,
      created_by: profile?.user_id || null,
      priority: form.priority,
      due_date: form.due_date || null,
    });
    if (error) {
      toast.error('Ошибка: ' + error.message);
    } else {
      toast.success('Задача создана');
      setForm({ title: '', description: '', assigned_to: '', priority: 'normal', due_date: '' });
      setShowCreate(false);
      await fetchData();
    }
    setSaving(false);
  };

  const updateStatus = async (id: string, status: TaskStatus) => {
    const update: any = { status };
    if (status === 'completed') update.completed_at = new Date().toISOString();
    const { error } = await supabase.from('staff_tasks').update(update).eq('id', id);
    if (error) {
      toast.error('Ошибка: ' + error.message);
    } else {
      await fetchData();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Задачи</h1>
          <p className="text-muted-foreground">Управление задачами команды</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Новая задача
        </Button>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="all">Все ({tasks.length})</TabsTrigger>
          <TabsTrigger value="my">Мои</TabsTrigger>
          <TabsTrigger value="pending">Активные</TabsTrigger>
          <TabsTrigger value="completed">Выполненные</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-2">
        {filteredTasks.length > 0 ? (
          filteredTasks.map(task => {
            const StatusIcon = STATUS_CONFIG[task.status as TaskStatus]?.icon || Circle;
            const priorityConfig = PRIORITY_CONFIG[task.priority as TaskPriority] || PRIORITY_CONFIG.normal;
            return (
              <Card key={task.id}>
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  <button
                    onClick={() => updateStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                    className="shrink-0"
                  >
                    <StatusIcon className={`h-5 w-5 ${task.status === 'completed' ? 'text-success' : 'text-muted-foreground'}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {task.assignee_name && (
                        <span className="text-xs text-muted-foreground">{task.assignee_name}</span>
                      )}
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground">
                          до {format(new Date(task.due_date), 'dd.MM', { locale: ru })}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant={priorityConfig.variant} className="text-xs shrink-0">
                    {priorityConfig.label}
                  </Badge>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Нет задач</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Task Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новая задача</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Заголовок</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Что нужно сделать"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Подробности"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Исполнитель</Label>
                <Select value={form.assigned_to} onValueChange={(v) => setForm(f => ({ ...f, assigned_to: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Не назначен" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map(s => (
                      <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Приоритет</Label>
                <Select value={form.priority} onValueChange={(v) => setForm(f => ({ ...f, priority: v as TaskPriority }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Низкий</SelectItem>
                    <SelectItem value="normal">Обычный</SelectItem>
                    <SelectItem value="high">Высокий</SelectItem>
                    <SelectItem value="urgent">Срочно</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Срок</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm(f => ({ ...f, due_date: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Отмена</Button>
            <Button onClick={handleCreate} disabled={saving || !form.title.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tasks;
