import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Plus, Loader2, Sparkles, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { ImportServicesDialog } from '@/components/services/ImportServicesDialog';
import { LoadTemplateServicesDialog } from '@/components/services/LoadTemplateServicesDialog';
import type { Service, ServiceCategory } from '@/types/database';

const Services = () => {
  const { clinic, isClinicAdmin } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
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

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return null;
    return categories.find(c => c.id === categoryId)?.name;
  };

  // Group services by category
  const groupedServices = categories.length > 0
    ? categories.map(cat => ({
        category: cat,
        services: services.filter(s => s.category_id === cat.id)
      })).concat([{
        category: { id: '', name: 'Без категории', clinic_id: '', sort_order: 999, created_at: '' },
        services: services.filter(s => !s.category_id)
      }]).filter(g => g.services.length > 0)
    : [{ category: null, services }];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Услуги</h1>
          <p className="text-muted-foreground">Прайс-лист клиники</p>
        </div>

        {isClinicAdmin && (
          <div className="flex gap-2">
            {/* Quick Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Импорт
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsTemplateDialogOpen(true)}>
                  <Sparkles className="mr-2 h-4 w-4 text-warning" />
                  Загрузить шаблон услуг
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsImportDialogOpen(true)}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Импорт из Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Add Single Service */}
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
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <div className="text-muted-foreground">
            <p className="text-lg font-medium">Нет услуг</p>
            <p className="text-sm">Добавьте услуги вручную или загрузите из шаблона</p>
          </div>
          {isClinicAdmin && (
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => setIsTemplateDialogOpen(true)} className="gap-2">
                <Sparkles className="h-4 w-4 text-warning" />
                Загрузить шаблон
              </Button>
              <Button variant="outline" onClick={() => setIsImportDialogOpen(true)} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Импорт из Excel
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {groupedServices.map(({ category, services: categoryServices }) => (
            <div key={category?.id || 'uncategorized'} className="space-y-2">
              {category && categories.length > 0 && (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{category.name}</h2>
                  <Badge variant="secondary">{categoryServices.length}</Badge>
                </div>
              )}
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
                    {categoryServices.map((service) => (
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
            </div>
          ))}
        </div>
      )}

      {/* Import Dialogs */}
      {clinic && (
        <>
          <ImportServicesDialog
            open={isImportDialogOpen}
            onOpenChange={setIsImportDialogOpen}
            clinicId={clinic.id}
            onSuccess={fetchData}
          />
          <LoadTemplateServicesDialog
            open={isTemplateDialogOpen}
            onOpenChange={setIsTemplateDialogOpen}
            clinicId={clinic.id}
            onSuccess={fetchData}
          />
        </>
      )}
    </div>
  );
};

export default Services;
