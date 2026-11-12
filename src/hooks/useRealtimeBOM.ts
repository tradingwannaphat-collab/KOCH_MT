import { useState, useEffect, useCallback } from 'react';
import { MachineBOMItem, BOMChangeLog, ReplacementReason } from '../types/bom';
import { initialBOMItems } from '../data/initialBOM';

const CACHE_KEY_BOM = 'koch_bom_items_cache_v2';

export function useRealtimeBOM() {
  const [bomItems, setBomItems] = useState<MachineBOMItem[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_BOM);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return initialBOMItems;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (bomItems && bomItems.length > 0) {
        localStorage.setItem(CACHE_KEY_BOM, JSON.stringify(bomItems));
      }
    } catch (e) {}
  }, [bomItems]);

  const fetchBOM = useCallback(async () => {
    try {
      const res = await fetch('/api/bom');
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && Array.isArray(data.bomItems)) {
          setBomItems(data.bomItems);
          try {
            localStorage.setItem(CACHE_KEY_BOM, JSON.stringify(data.bomItems));
          } catch (e) {}
        }
      }
    } catch (err: any) {
      console.warn('Failed to load BOM items from server:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBOM();
  }, [fetchBOM]);

  // Listen to SSE events
  useEffect(() => {
    const eventSource = new EventSource('/api/events');

    eventSource.addEventListener('bom_created', (e: MessageEvent) => {
      try {
        const newItem = JSON.parse(e.data);
        setBomItems((prev) => [newItem, ...prev.filter((b) => b.id !== newItem.id)]);
      } catch (err) {}
    });

    eventSource.addEventListener('bom_updated', (e: MessageEvent) => {
      try {
        const updatedItem = JSON.parse(e.data);
        setBomItems((prev) =>
          prev.map((b) => (b.id === updatedItem.id ? updatedItem : b))
        );
      } catch (err) {}
    });

    eventSource.addEventListener('bom_replaced', (e: MessageEvent) => {
      try {
        const { bomItem } = JSON.parse(e.data);
        if (bomItem) {
          setBomItems((prev) =>
            prev.map((b) => (b.id === bomItem.id ? bomItem : b))
          );
        }
      } catch (err) {}
    });

    eventSource.addEventListener('bom_deleted', (e: MessageEvent) => {
      try {
        const { id } = JSON.parse(e.data);
        setBomItems((prev) => prev.filter((b) => b.id !== id));
      } catch (err) {}
    });

    eventSource.addEventListener('data_reset', (e: MessageEvent) => {
      try {
        const { bomItems: resetItems } = JSON.parse(e.data);
        if (Array.isArray(resetItems)) {
          setBomItems(resetItems);
        }
      } catch (err) {}
    });

    return () => {
      eventSource.close();
    };
  }, []);

  // Action: Record part replacement & change log
  const recordReplacement = async (
    bomItemId: string,
    payload: {
      replacedDate: string;
      technician: string;
      quantity?: number;
      reason: ReplacementReason;
      reasonLabel?: string;
      notes: string;
      photoUrl?: string;
      ticketId?: string;
    }
  ) => {
    try {
      const res = await fetch(`/api/bom/${bomItemId}/replace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && data.bomItem) {
        setBomItems((prev) =>
          prev.map((b) => (b.id === data.bomItem.id ? data.bomItem : b))
        );
        return { success: true, bomItem: data.bomItem, changeLog: data.changeLog };
      }
      return { success: false, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  // Action: Create new BOM item
  const createBOMItem = async (itemData: Partial<MachineBOMItem>) => {
    try {
      const res = await fetch('/api/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
      });
      const data = await res.json();
      if (data.success && data.bomItem) {
        setBomItems((prev) => [data.bomItem, ...prev]);
        return { success: true, bomItem: data.bomItem };
      }
      return { success: false, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  // Action: Update BOM item
  const updateBOMItem = async (id: string, updates: Partial<MachineBOMItem>) => {
    try {
      const res = await fetch(`/api/bom/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success && data.bomItem) {
        setBomItems((prev) =>
          prev.map((b) => (b.id === data.bomItem.id ? data.bomItem : b))
        );
        return { success: true, bomItem: data.bomItem };
      }
      return { success: false, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  // Action: Delete BOM item
  const deleteBOMItem = async (id: string) => {
    try {
      const res = await fetch(`/api/bom/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setBomItems((prev) => prev.filter((b) => b.id !== id));
        return { success: true };
      }
      return { success: false, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  return {
    bomItems,
    isLoading,
    error,
    refreshBOM: fetchBOM,
    recordReplacement,
    createBOMItem,
    updateBOMItem,
    deleteBOMItem
  };
}
