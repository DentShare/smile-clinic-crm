import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { UserPlus, Users, Stethoscope, UserCog, HeartHandshake, Loader2, Phone, Clock, Send, Copy, Trash2, Mail, Pencil, Shield, Info } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { StaffProfileEditor } from './StaffProfileEditor';
import type { Profile } from '@/types/database';

type AppRole = 'clinic_admin' | 'doctor' | 'reception' | 'nurse';

const fallbackRoleConfig = { label: 'Роль', icon: Shield, color: 'bg-muted text-muted-foreground', description: 'Неизвестная роль', permissions: [] };

const doctorSpecializations = [
  'Терапевт',
  'Ортопед',
  'Гнатолог',
  'Челюстно-лицевой хирург',
  'Ортодонт',
  'Детский стоматолог',
  'Имплантолог',
  'Эндодонтист',
  'Гигиенист',
  'Пародонтолог',
];

interface StaffMember extends Profile {
  roles: AppRole[];
  email?: string;
}

interface StaffLimits {
  maxDoctors: number;
  maxStaff: number;
  currentDoctors: number;
  currentStaff: number;
}

interface Invitation {
  id: string;
  email: string;
  role: AppRole;
  created_at: string;
  expires_at: string;
  token: string;
}

const roleConfig: Record<AppRole, { label: string; icon: React.ElementType; color: string; description: string; permissions: string[] }> = {
  clinic_admin: { 
    label: 'Директор', icon: UserCog, color: 'bg-primary text-primary-foreground',
    description: 'Полный доступ ко всем функциям клиники',
    permissions: ['Управление сотрудниками и ролями', 'Финансы и аналитика', 'Настройки клиники', 'Пациенты, расписание, услуги', 'Документы, склад, планы лечения']
  },
  reception: { 
    label: 'Администратор', icon: Users, color: 'bg-info text-info-foreground',
    description: 'Управление пациентами и расписанием',
    permissions: ['Пациенты (CRUD)', 'Расписание и записи', 'Приём платежей', 'Склад и услуги', 'Приглашение врачей и ассистентов']
  },
  doctor: { 
    label: 'Врач', icon: Stethoscope, color: 'bg-success text-success-foreground',
    description: 'Клиническая работа с пациентами',
    permissions: ['Просмотр пациентов и записей', 'Планы лечения (создание/редактирование)', 'Зубная формула', 'Выполненные работы', 'Создание записей на приём']
  },
  nurse: { 
    label: 'Ассистент', icon: HeartHandshake, color: 'bg-warning text-warning-foreground',
    description: 'Помощь врачу, просмотр данных',
    permissions: ['Просмотр пациентов', 'Просмотр расписания', 'Просмотр услуг и склада', 'Без права редактирования']
  },
};

export function StaffManagement() {
  const { clinic, profile, isClinicAdmin, hasRole } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [limits, setLimits] = useState<StaffLimits | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<StaffMember | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [newInvite, setNewInvite] = useState({
    email: '',
    role: 'doctor' as AppRole,
    specialization: '' as string,
  });

  const canManageStaff = isClinicAdmin || hasRole('reception');
  const canAssignClinicAdmin = isClinicAdmin;

  useEffect(() => {
    if (clinic?.id) {
      fetchData();
    }
  }, [clinic?.id]);

  const fetchData = async () => {
    await Promise.all([fetchStaff(), fetchInvitations(), fetchLimits()]);
    setIsLoading(false);
  };

  const fetchStaff = async () => {
    if (!clinic?.id) return;
    
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('clinic_id', clinic.id)
        .order('full_name');

      if (profilesError) throw profilesError;

      const staffWithRoles: StaffMember[] = [];
      
      for (const p of profiles || []) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', p.user_id);
        
        // Get email from auth.users via a database function would be ideal,
        // but for now we'll just show the phone as contact
        staffWithRoles.push({
          ...p,
          roles: (roles || []).map(r => r.role as AppRole),
        });
      }

      setStaff(staffWithRoles);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchInvitations = async () => {
    if (!clinic?.id) return;

    try {
      const { data, error } = await supabase
        .from('staff_invitations')
        .select('*')
        .eq('clinic_id', clinic.id)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations((data || []) as Invitation[]);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  };

  const fetchLimits = async () => {
    if (!clinic?.id) return;

    try {
      const { data, error } = await supabase
        .from('clinic_subscriptions')
        .select(`
          subscription_plans (
            max_doctors,
            max_staff
          )
        `)
        .eq('clinic_id', clinic.id)
        .in('status', ['active', 'trial'])
        .maybeSingle();

      if (error) throw error;

      const plan = data?.subscription_plans as { max_doctors: number; max_staff: number } | null;
      
      const doctorCount = staff.filter(s => s.roles.includes('doctor')).length;
      const staffCount = staff.filter(s => 
        s.roles.includes('reception') || s.roles.includes('nurse')
      ).length;

      setLimits({
        maxDoctors: plan?.max_doctors || 999,
        maxStaff: plan?.max_staff || 999,
        currentDoctors: doctorCount,
        currentStaff: staffCount,
      });
    } catch (error) {
      console.error('Error fetching limits:', error);
    }
  };

  useEffect(() => {
    if (staff.length > 0) {
      fetchLimits();
    }
  }, [staff]);

  const checkLimit = (role: AppRole): boolean => {
    if (!limits) return true;
    
    if (role === 'doctor') {
      return limits.currentDoctors < limits.maxDoctors;
    } else if (role === 'reception' || role === 'nurse') {
      return limits.currentStaff < limits.maxStaff;
    }
    return true;
  };

  const handleSendInvitation = async () => {
    if (!clinic?.id || !canManageStaff || !profile) return;

    if (!checkLimit(newInvite.role)) {
      toast.error('Достигнут лимит сотрудников по подписке');
      return;
    }

    if (!canAssignClinicAdmin && newInvite.role === 'clinic_admin') {
      toast.error('Только директор может назначать других директоров');
      return;
    }

    // Check if already invited
    const existingInvite = invitations.find(i => i.email.toLowerCase() === newInvite.email.toLowerCase());
    if (existingInvite) {
      toast.error('Приглашение уже отправлено на этот email');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-staff-invitation', {
        body: {
          email: newInvite.email,
          role: newInvite.role,
          clinicId: clinic.id,
          clinicName: clinic.name,
          inviterName: profile.full_name,
          specialization: newInvite.role === 'doctor' ? newInvite.specialization : undefined,
        },
      });

      if (error) throw error;

      toast.success('Приглашение отправлено', {
        description: `Email отправлен на ${newInvite.email}`,
      });

      setIsDialogOpen(false);
      setNewInvite({ email: '', role: 'doctor', specialization: '' });
      fetchInvitations();
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast.error('Ошибка при отправке приглашения', {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async (invitation: Invitation) => {
    const link = `${window.location.origin}/accept-invitation?token=${invitation.token}`;
    await navigator.clipboard.writeText(link);
    setCopiedToken(invitation.token);
    toast.success('Ссылка скопирована');
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleDeleteInvitation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('staff_invitations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Приглашение отменено');
      fetchInvitations();
    } catch (error) {
      console.error('Error deleting invitation:', error);
      toast.error('Ошибка при отмене приглашения');
    }
  };

  const handleToggleActive = async (staffMember: StaffMember) => {
    if (!canManageStaff) return;
    
    if (staffMember.user_id === profile?.user_id) {
      toast.error('Нельзя деактивировать себя');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !staffMember.is_active })
        .eq('id', staffMember.id);

      if (error) throw error;
      toast.success(staffMember.is_active ? 'Сотрудник деактивирован' : 'Сотрудник активирован');
      fetchStaff();
    } catch (error) {
      console.error('Error toggling staff status:', error);
      toast.error('Ошибка при изменении статуса');
    }
  };

  const handleChangeRole = async (staffMember: StaffMember, newRole: AppRole) => {
    if (!canManageStaff) return;
    
    if (staffMember.user_id === profile?.user_id) {
      toast.error('Нельзя изменить свою роль');
      return;
    }

    if (newRole === 'clinic_admin' && !isClinicAdmin) {
      toast.error('Только директор может назначать директоров');
      return;
    }

    if (!checkLimit(newRole)) {
      toast.error('Достигнут лимит сотрудников по подписке');
      return;
    }

    try {
      // Delete existing roles for this user
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', staffMember.user_id);

      if (deleteError) throw deleteError;

      // Insert new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: staffMember.user_id, role: newRole });

      if (insertError) throw insertError;

      toast.success(`Роль изменена на "${roleConfig[newRole].label}"`);
      fetchStaff();
    } catch (error) {
      console.error('Error changing role:', error);
      toast.error('Ошибка при изменении роли');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const availableRoles: AppRole[] = canAssignClinicAdmin
    ? ['clinic_admin', 'reception', 'doctor', 'nurse']
    : ['reception', 'doctor', 'nurse'];

  return (
    <div className="space-y-6">
      {/* Limits Overview */}
      {limits && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                Врачи
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {limits.currentDoctors} / {limits.maxDoctors === 999 ? '∞' : limits.maxDoctors}
              </div>
              {limits.maxDoctors !== 999 && (
                <Progress 
                  value={(limits.currentDoctors / limits.maxDoctors) * 100} 
                  className="mt-2 h-2"
                />
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Персонал
              </CardTitle>
              <CardDescription>Администраторы и ассистенты</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {limits.currentStaff} / {limits.maxStaff === 999 ? '∞' : limits.maxStaff}
              </div>
              {limits.maxStaff !== 999 && (
                <Progress 
                  value={(limits.currentStaff / limits.maxStaff) * 100} 
                  className="mt-2 h-2"
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Role Permissions Reference */}
      {canManageStaff && (
        <Collapsible>
          <Card>
            <CardHeader className="pb-3">
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Справка по ролям и правам доступа
                </CardTitle>
                <Info className="h-4 w-4 text-muted-foreground" />
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {(Object.entries(roleConfig) as [AppRole, typeof roleConfig[AppRole]][]).map(([role, config]) => {
                    const Icon = config.icon;
                    return (
                      <div key={role} className="space-y-2 p-3 rounded-lg border">
                        <div className="flex items-center gap-2">
                          <Badge className={config.color}>
                            <Icon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{config.description}</p>
                        <ul className="space-y-1">
                          {config.permissions.map((perm, i) => (
                            <li key={i} className="text-xs flex items-start gap-1.5">
                              <span className="text-primary mt-0.5">•</span>
                              {perm}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Staff & Invitations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Команда</CardTitle>
            <CardDescription>Сотрудники и приглашения</CardDescription>
          </div>
          
          {canManageStaff && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Send className="h-4 w-4 mr-2" />
                  Пригласить
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Пригласить сотрудника</DialogTitle>
                  <DialogDescription>
                    Отправьте приглашение на email для регистрации в клинике
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newInvite.email}
                      onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                      placeholder="doctor@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Роль</Label>
                    <Select
                      value={newInvite.role}
                      onValueChange={(value) => setNewInvite({ ...newInvite, role: value as AppRole, specialization: value === 'doctor' ? newInvite.specialization : '' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((role) => {
                          const config = roleConfig[role];
                          const Icon = config.icon;
                          const disabled = !checkLimit(role);
                          return (
                            <SelectItem 
                              key={role} 
                              value={role}
                              disabled={disabled}
                            >
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {config.label}
                                {disabled && ' (лимит)'}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {newInvite.role === 'doctor' && (
                    <div className="space-y-2">
                      <Label htmlFor="specialization">Специализация</Label>
                      <Select
                        value={newInvite.specialization}
                        onValueChange={(value) => setNewInvite({ ...newInvite, specialization: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите специализацию" />
                        </SelectTrigger>
                        <SelectContent>
                          {doctorSpecializations.map((spec) => (
                            <SelectItem key={spec} value={spec}>
                              {spec}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Отмена
                  </Button>
                  <Button 
                    onClick={handleSendInvitation}
                    disabled={isSubmitting || !newInvite.email}
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Отправить приглашение
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="staff">
            <TabsList>
              <TabsTrigger value="staff">
                Сотрудники ({staff.length})
              </TabsTrigger>
              <TabsTrigger value="invitations">
                Приглашения ({invitations.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="staff" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Сотрудник</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Контакты</TableHead>
                    <TableHead>Статус</TableHead>
                    {canManageStaff && <TableHead className="w-[120px]">Действия</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((member) => {
                    const isCurrentUser = member.user_id === profile?.user_id;
                    
                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{member.full_name}</p>
                              {member.specialization && (
                                <p className="text-sm text-muted-foreground">{member.specialization}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {canManageStaff && !isCurrentUser ? (
                            <Select
                              value={member.roles[0] || 'doctor'}
                              onValueChange={(value) => handleChangeRole(member, value as AppRole)}
                            >
                              <SelectTrigger className="w-[160px] h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {availableRoles.map((role) => {
                                  const config = roleConfig[role];
                                  const Icon = config.icon;
                                  return (
                                    <SelectItem key={role} value={role}>
                                      <div className="flex items-center gap-2">
                                        <Icon className="h-4 w-4" />
                                        <div>
                                          <span>{config.label}</span>
                                          <span className="ml-2 text-xs text-muted-foreground">{config.description}</span>
                                        </div>
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {member.roles.map((role) => {
                                const config = roleConfig[role] || fallbackRoleConfig;
                                return (
                                  <Badge key={role} className={config.color}>
                                    {config.label}
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {member.phone && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {member.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={member.is_active ? 'default' : 'secondary'}>
                            {member.is_active ? 'Активен' : 'Неактивен'}
                          </Badge>
                        </TableCell>
                        {canManageStaff && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingProfile(member);
                                  setIsEditDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {!isCurrentUser && (
                                <Switch
                                  checked={member.is_active ?? false}
                                  onCheckedChange={() => handleToggleActive(member)}
                                />
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}

                  {staff.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Нет сотрудников
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="invitations" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Истекает</TableHead>
                    <TableHead className="w-[150px]">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => {
                    const config = roleConfig[invitation.role] || fallbackRoleConfig;
                    const Icon = config.icon;
                    
                    return (
                      <TableRow key={invitation.id}>
                        <TableCell className="font-medium">{invitation.email}</TableCell>
                        <TableCell>
                          <Badge className={config.color}>
                            <Icon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDate(invitation.expires_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyLink(invitation)}
                            >
                              {copiedToken === invitation.token ? (
                                <span className="text-success text-xs">Скопировано!</span>
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteInvitation(invitation.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {invitations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Нет активных приглашений
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Profile Editor Dialog */}
      <StaffProfileEditor
        profile={editingProfile}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSaved={fetchStaff}
      />
    </div>
  );
}