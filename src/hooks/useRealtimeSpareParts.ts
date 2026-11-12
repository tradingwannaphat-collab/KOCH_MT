import { useState, useEffect, useCallback } from 'react';
import { SparePartItemMaster, StockTransaction } from '../types/sparePart';
import { initialSpareParts, initialStockTransactions } from '../data/initialSpareParts';
import { safeApiCall } from '../utils/apiClient';

const CACHE_KEY_PARTS = 'koch_spare_parts_cache_v2';
const CACHE_KEY_TX = 'koch_stock_tx_cache_v2';

export function useRealtimeSpareParts() {
  const [spareParts, setSpareParts] = useState<SparePartItemMaster[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_PARTS);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return initialSpareParts;
  });
  const [transactions, setTransactions] = useState<StockTransaction[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_TX);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return initialStockTransactions;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      if (spareParts && spareParts.length > 0) {
        localStorage.setItem(CACHE_KEY_PARTS, JSON.stringify(spareParts));
      }
    } catch (e) {}
  }, [spareParts]);

  useEffect(() => {
    try {
      if (transactions && transactions.length > 0) {
        localStorage.setItem(CACHE_KEY_TX, JSON.stringify(transactions));
      }
    } catch (e) {}
  }, [transactions]);

  // Fetch initial spare parts
  const fetchSpareParts = useCallback(async () => {
    try {
      const res = await fetch('/api/spare-parts');
      if (res.ok) {
        const data = await res.json();
        if (data.spareParts) {
          setSpareParts(data.spareParts);
          try {
            localStorage.setItem(CACHE_KEY_PARTS, JSON.stringify(data.spareParts));
          } catch (e) {}
        }
        if (data.transactions) {
          setTransactions(data.transactions);
          try {
            localStorage.setItem(CACHE_KEY_TX, JSON.stringify(data.transactions));
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn('Could not fetch spare parts from server, using initial data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpareParts();

    // Setup SSE listener
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/events');

      es.addEventListener('spare_part_created', (event: MessageEvent) => {
        try {
          const item: SparePartItemMaster = JSON.parse(event.data);
          setSpareParts((prev) => {
            if (prev.some((p) => p.id === item.id)) return prev;
            return [item, ...prev];
          });
        } catch (err) {
          console.error('Error parsing spare_part_created', err);
        }
      });

      es.addEventListener('spare_part_updated', (event: MessageEvent) => {
        try {
          const updated: SparePartItemMaster = JSON.parse(event.data);
          setSpareParts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        } catch (err) {
          console.error('Error parsing spare_part_updated', err);
        }
      });

      es.addEventListener('spare_part_deleted', (event: MessageEvent) => {
        try {
          const { id } = JSON.parse(event.data);
          setSpareParts((prev) => prev.filter((p) => p.id !== id));
        } catch (err) {
          console.error('Error parsing spare_part_deleted', err);
        }
      });

      es.addEventListener('spare_part_stock_adjusted', (event: MessageEvent) => {
        try {
          const { sparePart, transaction } = JSON.parse(event.data);
          if (sparePart) {
            setSpareParts((prev) => prev.map((p) => (p.id === sparePart.id ? sparePart : p)));
          }
          if (transaction) {
            setTransactions((prev) => [transaction, ...prev]);
          }
        } catch (err) {
          console.error('Error parsing spare_part_stock_adjusted', err);
        }
      });

      es.addEventListener('data_reset', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.spareParts) {
            setSpareParts(data.spareParts);
          }
          if (data.stockTransactions) {
            setTransactions(data.stockTransactions);
          }
        } catch (err) {
          console.error('Error parsing data_reset in spare parts hook', err);
        }
      });
    } catch (err) {
      console.warn('SSE not supported or connection failed for spare parts', err);
    }

    return () => {
      es?.close();
    };
  }, [fetchSpareParts]);

  // Actions
  const createSparePart = async (partData: Partial<SparePartItemMaster>) => {
    try {
      const now = new Date();
      const stock = partData.stockQty ?? 0;
      const min = partData.minStock ?? 1;
      const status: 'in_stock' | 'low_stock' | 'out_of_stock' = stock <= 0 ? 'out_of_stock' : stock <= min ? 'low_stock' : 'in_stock';

      const newPart: SparePartItemMaster = {
        id: partData.id || `sp-${Date.now()}`,
        partNo: partData.partNo || `SP-${Date.now()}`,
        name: partData.name || 'อะไหล่ใหม่',
        spec: partData.spec || '-',
        category: partData.category || 'consumable',
        categoryLabel: partData.categoryLabel || 'วัสดุสิ้นเปลือง',
        compatibleMachines: partData.compatibleMachines || ['all'],
        compatibleMachineNames: partData.compatibleMachineNames || 'ทุกเครื่องจักร',
        stockQty: stock,
        minStock: min,
        unit: partData.unit || 'ชิ้น',
        location: partData.location || 'A-01',
        unitPrice: partData.unitPrice || 0,
        supplier: partData.supplier || '',
        leadTimeDays: partData.leadTimeDays || 3,
        status,
        notes: partData.notes || '',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        ...partData
      };

      setSpareParts((prev) => {
        const next = [newPart, ...prev];
        try {
          localStorage.setItem(CACHE_KEY_PARTS, JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      const apiRes = await safeApiCall<{ success: boolean; sparePart?: SparePartItemMaster }>('/api/spare-parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partData)
      });

      const finalPart = (apiRes.ok && apiRes.data?.success && apiRes.data.sparePart) ? apiRes.data.sparePart : newPart;
      return { success: true, sparePart: finalPart };
    } catch (err: any) {
      return { success: true };
    }
  };

  const updateSparePart = async (id: string, updates: Partial<SparePartItemMaster>) => {
    try {
      setSpareParts((prev) => {
        const next = prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p));
        try {
          localStorage.setItem(CACHE_KEY_PARTS, JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      const apiRes = await safeApiCall<{ success: boolean; sparePart?: SparePartItemMaster }>(`/api/spare-parts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (apiRes.ok && apiRes.data?.success && apiRes.data.sparePart) {
        setSpareParts((prev) => prev.map((p) => (p.id === id ? apiRes.data!.sparePart! : p)));
        return { success: true, sparePart: apiRes.data.sparePart };
      }

      const current = spareParts.find((p) => p.id === id);
      return { success: true, sparePart: current };
    } catch (err: any) {
      return { success: true };
    }
  };

  const deleteSparePart = async (id: string) => {
    try {
      setSpareParts((prev) => {
        const next = prev.filter((p) => p.id !== id);
        try {
          localStorage.setItem(CACHE_KEY_PARTS, JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      await safeApiCall(`/api/spare-parts/${id}`, { method: 'DELETE' });
      return { success: true };
    } catch (err: any) {
      return { success: true };
    }
  };

  const adjustStock = async (
    id: string,
    payload: {
      type: 'in' | 'out' | 'adjust';
      quantity: number;
      operator?: string;
      referenceTicketNo?: string;
      machineCode?: string;
      notes?: string;
    }
  ) => {
    try {
      const part = spareParts.find((p) => p.id === id);
      let newStock = part ? part.stockQty : 0;
      if (payload.type === 'in') newStock += payload.quantity;
      else if (payload.type === 'out') newStock = Math.max(0, newStock - payload.quantity);
      else if (payload.type === 'adjust') newStock = payload.quantity;

      const now = new Date();
      const newStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = 
        newStock <= 0 ? 'out_of_stock' : newStock <= (part?.minStock ?? 1) ? 'low_stock' : 'in_stock';

      const newTx: StockTransaction = {
        id: `tx-${Date.now()}`,
        sparePartId: id,
        partNo: part?.partNo || '',
        partName: part?.name || '',
        type: payload.type,
        quantity: payload.quantity,
        balanceAfter: newStock,
        date: now.toISOString().split('T')[0],
        time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        operator: payload.operator || 'เจ้าหน้าที่คลัง',
        referenceTicketNo: payload.referenceTicketNo,
        machineCode: payload.machineCode,
        notes: payload.notes
      };

      setSpareParts((prev) => {
        const next = prev.map((p) => {
          if (p.id !== id) return p;
          return { ...p, stockQty: newStock, status: newStatus, updatedAt: now.toISOString() };
        });
        try {
          localStorage.setItem(CACHE_KEY_PARTS, JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      setTransactions((prev) => {
        const next = [newTx, ...prev];
        try {
          localStorage.setItem(CACHE_KEY_TX, JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      const apiRes = await safeApiCall<{ success: boolean; sparePart?: SparePartItemMaster; transaction?: StockTransaction }>(
        `/api/spare-parts/${id}/stock`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      if (apiRes.ok && apiRes.data?.success) {
        if (apiRes.data.sparePart) {
          setSpareParts((prev) => prev.map((p) => (p.id === id ? apiRes.data!.sparePart! : p)));
        }
        if (apiRes.data.transaction) {
          setTransactions((prev) => [apiRes.data!.transaction!, ...prev.filter((t) => t.id !== newTx.id)]);
        }
      }
      return { success: true };
    } catch (err: any) {
      return { success: true };
    }
  };

  return {
    spareParts,
    transactions,
    loading,
    createSparePart,
    updateSparePart,
    deleteSparePart,
    adjustStock,
    refetch: fetchSpareParts
  };
}
