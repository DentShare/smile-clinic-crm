import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { Loader2, Sparkles } from 'lucide-react';
import { defaultDentalServices, serviceCategories, DefaultService } from '@/data/defaultDentalServices';
import { cn } from '@/lib/utils';

interface LoadTemplateServicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicId: string;
  onSuccess: () => void;
}

export function LoadTemplateServicesDialog({
  open,
  onOpenChange,
  clinicId,
  onSuccess,
}: LoadTemplateServicesDialogProps) {
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price);
  };

  const toggleCategory = (category: string) => {
    const newCategories = new Set(selectedCategories);
    const newServices = new Set(selectedServices);
    
    if (newCategories.has(category)) {
      newCategories.delete(category);
      // Remove all services in this category
      defaultDentalServices
        .filter(s => s.category === category)
        .forEach(s => newServices.delete(s.name));
    } else {
      newCategories.add(category);
      // Add all services in this category
      defaultDentalServices
        .filter(s => s.category === category)
        .forEach(s => newServices.add(s.name));
    }
    
    setSelectedCategories(newCategories);
    setSelectedServices(newServices);
  };

  const toggleService = (service: DefaultService) => {
    const newServices = new Set(selectedServices);
    
    if (newServices.has(service.name)) {
      newServices.delete(service.name);
    } else {
      newServices.add(service.name);
    }
    
    setSelectedServices(newServices);
    
    // Update category selection
    const categoryServices = defaultDentalServices.filter(s => s.category === service.category);
    const allSelected = categoryServices.every(s => newServices.has(s.name));
    
    const newCategories = new Set(selectedCategories);
    if (allSelected) {
      newCategories.add(service.category);
    } else {
      newCategories.delete(service.category);
    }
    setSelectedCategories(newCategories);
  };

  const selectAll = () => {
    setSelectedServices(new Set(defaultDentalServices.map(s => s.name)));
    setSelectedCategories(new Set(serviceCategories));
  };

  const deselectAll = () => {
    setSelectedServices(new Set());
    setSelectedCategories(new Set());
  };

  const handleLoad = async () => {
    if (selectedServices.size === 0) {
      toast.error('Выберите хотя бы одну услугу');
      return;
    }

    setIsLoading(true);

    try {
      // Get selected services data
      const servicesToAdd = defaultDentalServices.filter(s => selectedServices.has(s.name));
      const categoriesToAdd = [...new Set(servicesToAdd.map(s => s.category))];

      // Create categories first
      const { data: existingCategories } = await supabase
        .from('service_categories')
        .select('name')
        .eq('clinic_id', clinicId);

      const existingNames = new Set(existingCategories?.map(c => c.name) || []);
      const newCategories = categoriesToAdd.filter(name => !existingNames.has(name));

      if (newCategories.length > 0) {
        await supabase.from('service_categories').insert(
          newCategories.map((name, index) => ({
            clinic_id: clinicId,
            name,
            sort_order: serviceCategories.indexOf(name),
          }))
        );
      }

      // Get all categories for mapping
      const { data: allCategories } = await supabase
        .from('service_categories')
        .select('id, name')
        .eq('clinic_id', clinicId);

      const categoryMap = new Map(allCategories?.map(c => [c.name, c.id]) || []);

      // Insert services
      const { error } = await supabase.from('services').insert(
        servicesToAdd.map(s => ({
          clinic_id: clinicId,
          name: s.name,
          price: s.price,
          duration_minutes: s.duration_minutes,
          category_id: categoryMap.get(s.category) || null,
          description: s.description || null,
        }))
      );

      if (error) throw error;

      toast.success(`Добавлено ${servicesToAdd.length} услуг`);
      setSelectedServices(new Set());
      setSelectedCategories(new Set());
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error loading services:', error);
      toast.error('Ошибка загрузки услуг');
    } finally {
      setIsLoading(false);
    }
  };

  const groupedServices = serviceCategories.map(category => ({
    category,
    services: defaultDentalServices.filter(s => s.category === category),
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-warning" />
            Шаблон услуг
          </DialogTitle>
          <DialogDescription>
            Выберите базовые стоматологические услуги для добавления в прайс-лист. Цены указаны ориентировочные.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 border-b">
          <div className="text-sm">
            Выбрано: <strong>{selectedServices.size}</strong> из {defaultDentalServices.length}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={selectAll}>
              Выбрать все
            </Button>
            <Button variant="ghost" size="sm" onClick={deselectAll}>
              Сбросить
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-2">
            {groupedServices.map(({ category, services }) => (
              <div key={category} className="space-y-2">
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-md -mx-2"
                  onClick={() => toggleCategory(category)}
                >
                  <Checkbox 
                    checked={selectedCategories.has(category)} 
                    onCheckedChange={() => toggleCategory(category)}
                  />
                  <span className="font-medium">{category}</span>
                  <Badge variant="outline" className="ml-auto">
                    {services.filter(s => selectedServices.has(s.name)).length}/{services.length}
                  </Badge>
                </div>
                
                <div className="ml-6 space-y-1">
                  {services.map((service) => (
                    <div
                      key={service.name}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                        selectedServices.has(service.name) ? "bg-primary/5" : "hover:bg-muted/50"
                      )}
                      onClick={() => toggleService(service)}
                    >
                      <Checkbox 
                        checked={selectedServices.has(service.name)}
                        onCheckedChange={() => toggleService(service)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{service.name}</p>
                        {service.description && (
                          <p className="text-xs text-muted-foreground truncate">{service.description}</p>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground shrink-0">
                        {service.duration_minutes} мин
                      </div>
                      <div className="text-sm font-medium shrink-0 w-28 text-right">
                        {formatPrice(service.price)} сум
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button 
            onClick={handleLoad} 
            disabled={isLoading || selectedServices.size === 0}
            className="flex-1"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Добавить {selectedServices.size} услуг
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
