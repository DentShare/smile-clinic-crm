import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
import type { Service, ServiceCategory } from '@/types/database';

const Services = () => {
  const { clinic, isClinicAdmin } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newService, setNewService] = useState({
    name: '',
    price: '',
    duration_minutes: '30',
    category_id: '',
    description: ''
  });

  const fetchData = async () => {
    if (!clinic?.id) return;

    const [servicesRes, categoriesRes] = await Promise.all([
      supabase
        .from('services')
        .select('*')
        .eq('clinic_id', clinic.id)
        .order('name'),
      supabase
        .from('service_categories')
        .select('*')
        .eq('clinic_id', clinic.id)
        .order('sort_order')
    ]);

    if (servicesRes.data) setServices(servicesRes.data as Service[]);
    if (categoriesRes.data) setCategories(categoriesRes.data as ServiceCategory[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [clinic?.id]);

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic?.id) return;

    const { error } = await supabase.from('services').insert({
      clinic_id: clinic.id,
      name: newService.name,
      price: parseFloat(newService.price),
      duration_minutes: parseInt(newService.duration_minutes),
      category_id: newService.category_id || null,
      description: newService.description || null
    });

    if (error) {
      toast.error('Ошибка создания услуги');
      console.error(error);
    } else {
      toast.success('Услуга добавлена');
      setIsDialogOpen(false);
      setNewService({ name: '', price: '', duration_minutes: '30', category_id: '', description: '' });
      fetchData();
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price) + ' сум';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Услуги</h1>
          <p className="text-muted-foreground">Прайс-лист клиники</p>
        </div>

        {isClinicAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Добавить услугу
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Новая услуга</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateService} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Название *</Label>
                  <Input
                    id="name"
                    value={newService.name}
                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Цена (сум) *</Label>
                    <Input
                      id="price"
                      type="number"
                      value={newService.price}
                      onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Длительность (мин)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={newService.duration_minutes}
                      onChange={(e) => setNewService({ ...newService, duration_minutes: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Описание</Label>
                  <Input
                    id="description"
                    value={newService.description}
                    onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full">
                  Добавить
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          Нет услуг. Добавьте первую!
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead>Длительность</TableHead>
                <TableHead className="text-right">Цена</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {service.description || '—'}
                  </TableCell>
                  <TableCell>{service.duration_minutes} мин</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(service.price)}
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

export default Services;
