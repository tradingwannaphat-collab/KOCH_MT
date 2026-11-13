import { useState, useEffect, useCallback, useRef } from 'react';
import { SparePartItemMaster, StockTransaction } from '../types/sparePart';
import { initialSpareParts, initialStockTransactions } from '../data/initialSpareParts';
import { safeApiCall } from '../utils/apiClient';
import { savePersistentCache, loadSyncCache, loadAsyncCache } from '../utils/clientStorage';

const CACHE_KEY_PARTS = 'koch_spare_parts_cache_v2';
const CACHE_KEY_TX = 'koch_stock_tx_cache_v2';

export function useRealtimeSpareParts() {
  const [spareParts, setSpareParts] = useState<SparePartItemMaster[]>(() => {
    const cached = loadSyncCache<SparePartItemMaster[]>(CACHE_KEY_PARTS);
    if (Array.isArray(cached) && cached.length > 0) return cached;
    return initialSpareParts;
  });
  const [transactions, setTransactions] = useState<StockTransaction[]>(() => {
    const cached = loadSyncCache<StockTransaction[]>(CACHE_KEY_TX);
    if (Array.isArray(cached) && cached.length > 0) return cached;
    return initialStockTransactions;
  });
  const [loading, setLoading] = useState(false);

  const hasLocalMutationRef = useRef(false);
  const hasBackendSyncedRef = useRef(false);

  // Hydrate from IndexedDB on mount
  useEffect(() => {
    let active = true;
    loadAsyncCache<SparePartItemMaster[]>(CACHE_KEY_PARTS).then((stored) => {
      if (!active) return;
      if (
        Array.isArray(stored) &&
        stored.length > 0 &&
        !hasLocalMutationRef.current &&
        !hasBackendSyncedRef.current
      ) {
        setSpareParts(stored);
      }
    });
    loadAsyncCache<StockTransaction[]>(CACHE_KEY_TX).then((stored) => {
      if (!active) return;
      if (
        Array.isArray(stored) &&
        stored.length > 0 &&
        !hasLocalMutationRef.current &&
        !hasBackendSyncedRef.current
      ) {
        setTransactions(stored);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (spareParts && spareParts.length > 0) {
      savePersistentCache(CACHE_KEY_PARTS, spareParts, true);
    }
  }, [spareParts]);

  useEffect(() => {
    if (transactions && transactions.length > 0) {
      savePersistentCache(CACHE_KEY_TX, transactions, true);
    }
  }, [transactions]);

  // Fetch initial spare parts
  const fetchSpareParts = useCallback(async () => {
    try {
      const apiRes = await safeApiCall<{ spareParts?: SparePartItemMaster[]; transactions?: StockTransaction[] }>(
        '/api/spare-parts'
      );
      if (apiRes.ok && apiRes.data) {
        hasBackendSyncedRef.current = true;
        if (apiRes.data.spareParts) {
          setSpareParts(apiRes.data.spareParts);
          savePersistentCache(CACHE_KEY_PARTS, apiRes.data.spareParts, true);
        }
        if (apiRes.data.transactions) {
          setTransactions(apiRes.data.transactions);
          savePersistentCache(CACHE_KEY_TX, apiRes.data.transactions, true);
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
            savePersistentCache(CACHE_KEY_PARTS, data.spareParts, true);
          }
          if (data.stockTransactions) {
            setTransactions(data.stockTransactions);
            savePersistentCache(CACHE_KEY_TX, data.stockTransactions, true);
          }
        } catch (err) {
          console.error('Error parsing data_reset in spare parts hook', err);
        }
      });

      es.onerror = () => {
        es?.close();
      };
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
      hasLocalMutationRef.current = true;
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
        savePersistentCache(CACHE_KEY_PARTS, next, true);
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
      hasLocalMutationRef.current = true;
      setSpareParts((prev) => {
        const next = prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p));
        savePersistentCache(CACHE_KEY_PARTS, next, true);
        return next;
      });

      const apiRes = await safeApiCall<{ success: boolean; sparePart?: SparePartItemMaster }>(`/api/spare-parts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (apiRes.ok && apiRes.data?.success && apiRes.data.sparePart) {
        setSpareParts((prev) => {
          const next = prev.map((p) => (p.id === id ? apiRes.data!.sparePart! : p));
          savePersistentCache(CACHE_KEY_PARTS, next, true);
          return next;
        });
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
      hasLocalMutationRef.current = true;
      setSpareParts((prev) => {
        const next = prev.filter((p) => p.id !== id);
        savePersistentCache(CACHE_KEY_PARTS, next, true);
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
      hasLocalMutationRef.current = true;
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
        savePersistentCache(CACHE_KEY_PARTS, next, true);
        return next;
      });

      setTransactions((prev) => {
        const next = [newTx, ...prev];
        savePersistentCache(CACHE_KEY_TX, next, true);
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
          setSpareParts((prev) => {
            const next = prev.map((p) => (p.id === id ? apiRes.data!.sparePart! : p));
            savePersistentCache(CACHE_KEY_PARTS, next, true);
            return next;
          });
        }
        if (apiRes.data.transaction) {
          setTransactions((prev) => {
            const next = [apiRes.data!.transaction!, ...prev.filter((t) => t.id !== newTx.id)];
            savePersistentCache(CACHE_KEY_TX, next, true);
            return next;
          });
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
