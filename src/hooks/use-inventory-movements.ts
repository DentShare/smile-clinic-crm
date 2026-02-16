import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import type { InventoryMovement, InventoryMovementType } from '@/types/database';

export function useInventoryMovements(inventoryId?: string) {
  const { clinic, profile } = useAuth();
  const clinicId = clinic?.id;
  const queryClient = useQueryClient();

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['inventory-movements', clinicId, inventoryId],
    queryFn: async () => {
      if (!clinicId) return [];

      let query = supabase
        .from('inventory_movements')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (inventoryId) {
        query = query.eq('inventory_id', inventoryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as InventoryMovement[];
    },
    enabled: !!clinicId,
  });

  const addMovement = useMutation({
    mutationFn: async (params: {
      inventoryId: string;
      movementType: InventoryMovementType;
      quantity: number;
      notes?: string;
    }) => {
      if (!clinicId || !profile?.id) throw new Error('Missing context');

      // Get current quantity
      const { data: item, error: fetchError } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('id', params.inventoryId)
        .single();

      if (fetchError) throw fetchError;

      const currentQty = Number(item.quantity);
      const delta = params.movementType === 'in' || params.movementType === 'return'
        ? params.quantity
        : -params.quantity;
      const newQty = Math.max(0, currentQty + delta);

      // Update inventory
      const { error: updateError } = await supabase
        .from('inventory')
        .update({ quantity: newQty, updated_at: new Date().toISOString() })
        .eq('id', params.inventoryId);

      if (updateError) throw updateError;

      // Record movement
      const { error: insertError } = await supabase
        .from('inventory_movements')
        .insert({
          clinic_id: clinicId,
          inventory_id: params.inventoryId,
          movement_type: params.movementType,
          quantity: params.quantity,
          quantity_before: currentQty,
          quantity_after: newQty,
          notes: params.notes,
          created_by: profile.id,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });

  return { movements, isLoading, addMovement };
}
