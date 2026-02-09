import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import type { Service, ServiceCategory } from '@/types/database';

interface ServiceWithCategory extends Service {
  category?: ServiceCategory | null;
}

interface CategoryGroupedServiceSelectProps {
  services: ServiceWithCategory[];
  categories?: ServiceCategory[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  showPrice?: boolean;
  disabled?: boolean;
}

export function CategoryGroupedServiceSelect({
  services,
  categories = [],
  value,
  onValueChange,
  placeholder = 'Выберите услугу...',
  className,
  showPrice = true,
  disabled = false,
}: CategoryGroupedServiceSelectProps) {
  // Group services by category
  const groupedServices = useMemo(() => {
    const groups = new Map<string, { name: string; sortOrder: number; services: ServiceWithCategory[] }>();
    const uncategorized: ServiceWithCategory[] = [];

    // Create category map for ordering
    const categoryMap = new Map<string, { name: string; sort_order: number }>();
    categories.forEach(cat => {
      categoryMap.set(cat.id, { name: cat.name, sort_order: cat.sort_order });
    });

    // Group services
    services.forEach(service => {
      if (service.category_id && categoryMap.has(service.category_id)) {
        const cat = categoryMap.get(service.category_id)!;
        if (!groups.has(service.category_id)) {
          groups.set(service.category_id, {
            name: cat.name,
            sortOrder: cat.sort_order,
            services: []
          });
        }
        groups.get(service.category_id)!.services.push(service);
      } else if (service.category) {
        // If service has embedded category data
        const catId = (service.category as any).id || 'embedded';
        if (!groups.has(catId)) {
          groups.set(catId, {
            name: (service.category as any).name || 'Без категории',
            sortOrder: (service.category as any).sort_order || 999,
            services: []
          });
        }
        groups.get(catId)!.services.push(service);
      } else {
        uncategorized.push(service);
      }
    });

    // Sort categories by sort_order
    const sortedGroups = Array.from(groups.entries())
      .sort((a, b) => a[1].sortOrder - b[1].sortOrder)
      .map(([id, group]) => ({
        id,
        name: group.name,
        services: group.services.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
      }));

    // Add uncategorized at the end if any
    if (uncategorized.length > 0) {
      sortedGroups.push({
        id: 'uncategorized',
        name: 'Без категории',
        services: uncategorized.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
      });
    }

    return sortedGroups;
  }, [services, categories]);

  // If no categories, render flat list
  const hasCategories = groupedServices.length > 0 && 
    !(groupedServices.length === 1 && groupedServices[0].id === 'uncategorized');

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {hasCategories ? (
          groupedServices.map(group => (
            <SelectGroup key={group.id}>
              <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-primary/80 bg-muted/50">
                {group.name}
              </SelectLabel>
              {group.services.map(service => (
                <SelectItem key={service.id} value={service.id}>
                  <div className="flex items-center justify-between w-full gap-4">
                    <span className="truncate">{service.name}</span>
                    {showPrice && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {Number(service.price).toLocaleString('ru-RU')} сум
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          ))
        ) : (
          services.map(service => (
            <SelectItem key={service.id} value={service.id}>
              <div className="flex items-center justify-between w-full gap-4">
                <span className="truncate">{service.name}</span>
                {showPrice && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {Number(service.price).toLocaleString('ru-RU')} сум
                  </span>
                )}
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
