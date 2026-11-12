import { useState, useEffect, useCallback } from 'react';
import { MachineBOMItem, BOMChangeLog, ReplacementReason } from '../types/bom';
import { initialBOMItems } from '../data/initialBOM';
import { safeApiCall } from '../utils/apiClient';

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
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const newLog: BOMChangeLog = {
        id: `log-${Date.now()}`,
        bomItemId,
        replacedDate: today,
        replacedTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        technician: payload.technician,
        quantity: payload.quantity || 1,
        reason: payload.reason,
        reasonLabel: payload.reasonLabel || payload.reason,
        notes: payload.notes,
        photoUrl: payload.photoUrl,
        ticketId: payload.ticketId,
        createdAt: now.toISOString()
      };

      setBomItems((prev) => {
        const next = prev.map((b) => {
          if (b.id !== bomItemId) return b;
          return {
            ...b,
            lastReplacedDate: today,
            status: 'normal' as const,
            changeHistory: [newLog, ...(b.changeHistory || [])],
            updatedAt: now.toISOString()
          };
        });
        try {
          localStorage.setItem(CACHE_KEY_BOM, JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      const apiRes = await safeApiCall<{ success: boolean; bomItem?: MachineBOMItem; changeLog?: BOMChangeLog }>(
        `/api/bom/${bomItemId}/replace`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      if (apiRes.ok && apiRes.data?.success && apiRes.data.bomItem) {
        setBomItems((prev) => prev.map((b) => (b.id === apiRes.data!.bomItem!.id ? apiRes.data!.bomItem! : b)));
        return { success: true, bomItem: apiRes.data.bomItem, changeLog: apiRes.data.changeLog || newLog };
      }

      const current = bomItems.find((b) => b.id === bomItemId);
      return { success: true, bomItem: current, changeLog: newLog };
    } catch (err: any) {
      return { success: true };
    }
  };

  // Action: Create new BOM item
  const createBOMItem = async (itemData: Partial<MachineBOMItem>) => {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const newItem: MachineBOMItem = {
        id: itemData.id || `bom-${Date.now()}`,
        machineId: itemData.machineId || 'm-01',
        machineCode: itemData.machineCode || 'MA2312014',
        machineTag: itemData.machineTag || 'BS-01',
        machineName: itemData.machineName || 'เครื่องจักร',
        partName: itemData.partName || 'อะไหล่',
        partNo: itemData.partNo || `PART-${Date.now()}`,
        spec: itemData.spec || '-',
        category: itemData.category || 'mechanical',
        categoryLabel: itemData.categoryLabel || 'ระบบกลไก',
        quantity: itemData.quantity || 1,
        unit: itemData.unit || 'ชิ้น',
        replacementCycleDays: itemData.replacementCycleDays || 180,
        cycleLabel: itemData.cycleLabel || 'ทุก 6 เดือน',
        lastReplacedDate: itemData.lastReplacedDate || today,
        nextDueDate: itemData.nextDueDate || today,
        status: itemData.status || 'normal',
        changeHistory: [],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        ...itemData
      };

      setBomItems((prev) => {
        const next = [newItem, ...prev];
        try {
          localStorage.setItem(CACHE_KEY_BOM, JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      const apiRes = await safeApiCall<{ success: boolean; bomItem?: MachineBOMItem }>('/api/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
      });

      const finalItem = (apiRes.ok && apiRes.data?.success && apiRes.data.bomItem) ? apiRes.data.bomItem : newItem;
      return { success: true, bomItem: finalItem };
    } catch (err: any) {
      return { success: true };
    }
  };

  // Action: Update BOM item
  const updateBOMItem = async (id: string, updates: Partial<MachineBOMItem>) => {
    try {
      setBomItems((prev) => {
        const next = prev.map((b) => (b.id === id ? { ...b, ...updates } : b));
        try {
          localStorage.setItem(CACHE_KEY_BOM, JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      const apiRes = await safeApiCall<{ success: boolean; bomItem?: MachineBOMItem }>(`/api/bom/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (apiRes.ok && apiRes.data?.success && apiRes.data.bomItem) {
        setBomItems((prev) => prev.map((b) => (b.id === id ? apiRes.data!.bomItem! : b)));
        return { success: true, bomItem: apiRes.data.bomItem };
      }

      const current = bomItems.find((b) => b.id === id);
      return { success: true, bomItem: current };
    } catch (err: any) {
      return { success: true };
    }
  };

  // Action: Delete BOM item
  const deleteBOMItem = async (id: string) => {
    try {
      setBomItems((prev) => {
        const next = prev.filter((b) => b.id !== id);
        try {
          localStorage.setItem(CACHE_KEY_BOM, JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      await safeApiCall(`/api/bom/${id}`, { method: 'DELETE' });
      return { success: true };
    } catch (err: any) {
      return { success: true };
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
