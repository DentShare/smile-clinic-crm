import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import type { ServiceMaterial } from '@/types/database';

export function useServiceMaterials(serviceId?: string) {
  const { clinic } = useAuth();
  const clinicId = clinic?.id;
  const queryClient = useQueryClient();

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['service-materials', clinicId, serviceId],
    queryFn: async () => {
      if (!clinicId || !serviceId) return [];

      const { data, error } = await supabase
        .from('service_materials')
        .select('*, inventory:inventory_id(*)')
        .eq('clinic_id', clinicId)
        .eq('service_id', serviceId);

      if (error) throw error;
      return (data || []) as ServiceMaterial[];
    },
    enabled: !!clinicId && !!serviceId,
  });

  const addMaterial = useMutation({
    mutationFn: async (params: { inventoryId: string; quantityPerUnit: number; isRequired?: boolean }) => {
      if (!clinicId || !serviceId) throw new Error('Missing clinic or service');

      const { error } = await supabase.from('service_materials').insert({
        clinic_id: clinicId,
        service_id: serviceId,
        inventory_id: params.inventoryId,
        quantity_per_unit: params.quantityPerUnit,
        is_required: params.isRequired ?? true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-materials', clinicId, serviceId] });
    },
  });

  const removeMaterial = useMutation({
    mutationFn: async (materialId: string) => {
      const { error } = await supabase
        .from('service_materials')
        .delete()
        .eq('id', materialId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-materials', clinicId, serviceId] });
    },
  });

  const updateQuantity = useMutation({
    mutationFn: async (params: { materialId: string; quantityPerUnit: number }) => {
      const { error } = await supabase
        .from('service_materials')
        .update({ quantity_per_unit: params.quantityPerUnit })
        .eq('id', params.materialId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-materials', clinicId, serviceId] });
    },
  });

  return {
    materials,
    isLoading,
    addMaterial,
    removeMaterial,
    updateQuantity,
  };
}
