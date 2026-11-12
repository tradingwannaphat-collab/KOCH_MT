import { useState, useEffect, useCallback } from 'react';
import { SparePartItemMaster, StockTransaction } from '../types/sparePart';
import { initialSpareParts, initialStockTransactions } from '../data/initialSpareParts';

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
      const res = await fetch('/api/spare-parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partData)
      });
      const data = await res.json();
      if (data.success && data.sparePart) {
        setSpareParts((prev) => {
          if (prev.some((p) => p.id === data.sparePart.id)) return prev;
          return [data.sparePart, ...prev];
        });
      }
      return data;
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const updateSparePart = async (id: string, updates: Partial<SparePartItemMaster>) => {
    try {
      const res = await fetch(`/api/spare-parts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success && data.sparePart) {
        setSpareParts((prev) => prev.map((p) => (p.id === id ? data.sparePart : p)));
      }
      return data;
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const deleteSparePart = async (id: string) => {
    try {
      const res = await fetch(`/api/spare-parts/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSpareParts((prev) => prev.filter((p) => p.id !== id));
      }
      return data;
    } catch (err: any) {
      return { success: false, message: err.message };
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
      const res = await fetch(`/api/spare-parts/${id}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        if (data.sparePart) {
          setSpareParts((prev) => prev.map((p) => (p.id === id ? data.sparePart : p)));
        }
        if (data.transaction) {
          setTransactions((prev) => [data.transaction, ...prev]);
        }
      }
      return data;
    } catch (err: any) {
      return { success: false, message: err.message };
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
