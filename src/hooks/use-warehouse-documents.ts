import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { useAuth } from '@/contexts/AuthContext';
import type { WarehouseDocument, WarehouseDocumentItem } from '@/types/database';
import { toast } from 'sonner';

export function useWarehouseDocuments() {
  const { clinic, profile } = useAuth();
  const [documents, setDocuments] = useState<WarehouseDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    if (!clinic?.id) return;
    const { data, error } = await supabase
      .from('warehouse_documents')
      .select('*')
      .eq('clinic_id', clinic.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching warehouse documents:', error);
      return;
    }
    setDocuments(data || []);
  }, [clinic?.id]);

  useEffect(() => {
    if (clinic?.id) {
      setLoading(true);
      fetchDocuments().finally(() => setLoading(false));
    }
  }, [clinic?.id, fetchDocuments]);

  const createDocument = async (data: {
    type: string;
    supplier?: string;
    notes?: string;
    items: { inventory_id?: string; name?: string; quantity: number; price: number }[];
  }) => {
    if (!clinic?.id) return null;

    // Generate document number
    const count = documents.length + 1;
    const prefix = data.type === 'receipt' ? 'ПН' : data.type === 'writeoff' ? 'РН' : data.type === 'transfer' ? 'ПМ' : 'ИН';
    const docNumber = `${prefix}-${String(count).padStart(4, '0')}`;
    const totalAmount = data.items.reduce((s, i) => s + i.quantity * i.price, 0);

    const { data: doc, error } = await supabase
      .from('warehouse_documents')
      .insert({
        clinic_id: clinic.id,
        document_number: docNumber,
        type: data.type,
        supplier: data.supplier || null,
        notes: data.notes || null,
        total_amount: totalAmount,
        created_by: profile?.user_id || null,
      })
      .select()
      .single();

    if (error) {
      toast.error('Ошибка создания документа: ' + error.message);
      return null;
    }

    // Insert items
    if (data.items.length > 0) {
      const items = data.items.map(i => ({
        document_id: doc.id,
        inventory_id: i.inventory_id || null,
        name: i.name || null,
        quantity: i.quantity,
        price: i.price,
        total: i.quantity * i.price,
      }));

      const { error: itemsError } = await supabase
        .from('warehouse_document_items')
        .insert(items);

      if (itemsError) {
        console.error('Error inserting document items:', itemsError);
      }
    }

    toast.success('Документ создан');
    await fetchDocuments();
    return doc;
  };

  const confirmDocument = async (docId: string) => {
    if (!clinic?.id) return false;

    // Fetch document with items
    const { data: doc, error: docError } = await supabase
      .from('warehouse_documents')
      .select('*, items:warehouse_document_items(*)')
      .eq('id', docId)
      .single();

    if (docError || !doc) {
      if (docError) console.error('Error fetching document:', docError);
      return false;
    }

    // Update inventory quantities based on document type
    for (const item of (doc.items || []) as any[]) {
      if (!item.inventory_id) continue;

      if (doc.type === 'receipt') {
        // Increase stock
        const { data: inv } = await supabase
          .from('inventory')
          .select('quantity')
          .eq('id', item.inventory_id)
          .single();

        if (inv) {
          const newQty = Number(inv.quantity) + Number(item.quantity);
          await supabase.from('inventory').update({ quantity: newQty }).eq('id', item.inventory_id);

          await supabase.from('inventory_movements').insert({
            clinic_id: clinic.id,
            inventory_id: item.inventory_id,
            movement_type: 'in',
            quantity: item.quantity,
            quantity_before: inv.quantity,
            quantity_after: newQty,
            reference_type: 'warehouse_document',
            reference_id: docId,
            notes: `Приходная накладная ${doc.document_number}`,
          });
        }
      } else if (doc.type === 'writeoff') {
        // Decrease stock
        const { data: inv } = await supabase
          .from('inventory')
          .select('quantity')
          .eq('id', item.inventory_id)
          .single();

        if (inv) {
          const newQty = Math.max(0, Number(inv.quantity) - Number(item.quantity));
          await supabase.from('inventory').update({ quantity: newQty }).eq('id', item.inventory_id);

          await supabase.from('inventory_movements').insert({
            clinic_id: clinic.id,
            inventory_id: item.inventory_id,
            movement_type: 'out',
            quantity: item.quantity,
            quantity_before: inv.quantity,
            quantity_after: newQty,
            reference_type: 'warehouse_document',
            reference_id: docId,
            notes: `Расходная накладная ${doc.document_number}`,
          });
        }
      }
    }

    // Mark as confirmed
    const { error } = await supabase
      .from('warehouse_documents')
      .update({
        status: 'confirmed',
        confirmed_by: profile?.user_id || null,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', docId);

    if (error) {
      toast.error('Ошибка подтверждения: ' + error.message);
      return false;
    }

    toast.success('Документ подтверждён, остатки обновлены');
    await fetchDocuments();
    return true;
  };

  const cancelDocument = async (docId: string) => {
    const { error } = await supabase
      .from('warehouse_documents')
      .update({ status: 'cancelled' })
      .eq('id', docId);

    if (error) {
      toast.error('Ошибка отмены: ' + error.message);
      return false;
    }

    toast.success('Документ отменён');
    await fetchDocuments();
    return true;
  };

  return {
    documents,
    loading,
    createDocument,
    confirmDocument,
    cancelDocument,
    fetchDocuments,
  };
}
