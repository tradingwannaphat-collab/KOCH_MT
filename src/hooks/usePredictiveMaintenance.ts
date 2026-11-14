import { useState, useEffect, useCallback, useRef } from 'react';
import { ConditionReading } from '../types/pdm';
import { initialPdmReadings } from '../data/initialPdmReadings';
import { safeApiCall } from '../utils/apiClient';
import { savePersistentCache, loadSyncCache, loadAsyncCache } from '../utils/clientStorage';

export const CACHE_KEY_PDM = 'koch_pdm_readings_cache_v1';

export function usePredictiveMaintenance() {
  const [readings, setReadings] = useState<ConditionReading[]>(() => {
    const cached = loadSyncCache<ConditionReading[]>(CACHE_KEY_PDM);
    if (Array.isArray(cached) && cached.length > 0) return cached;
    return initialPdmReadings;
  });

  const hasLocalMutationRef = useRef(false);
  const hasBackendSyncedRef = useRef(false);

  // Hydrate from IndexedDB on mount
  useEffect(() => {
    let active = true;
    loadAsyncCache<ConditionReading[]>(CACHE_KEY_PDM).then((stored) => {
      if (!active) return;
      if (
        Array.isArray(stored) &&
        stored.length > 0 &&
        !hasLocalMutationRef.current &&
        !hasBackendSyncedRef.current
      ) {
        setReadings(stored);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Persist to IndexedDB & localStorage on every update
  useEffect(() => {
    if (Array.isArray(readings)) {
      savePersistentCache(CACHE_KEY_PDM, readings, true);
    }
  }, [readings]);

  // Listen to full backup restore events
  useEffect(() => {
    const handleRestored = (e: any) => {
      const restored = e?.detail?.pdmReadings;
      if (Array.isArray(restored) && restored.length > 0) {
        hasLocalMutationRef.current = true;
        setReadings(restored);
      }
    };
    window.addEventListener('koch_data_restored', handleRestored);
    return () => window.removeEventListener('koch_data_restored', handleRestored);
  }, []);

  // Attempt optional backend sync (gracefully works offline / Vercel too)
  const fetchReadings = useCallback(async () => {
    try {
      const apiRes = await safeApiCall<{ success: boolean; pdmReadings?: ConditionReading[] }>('/api/pdm-readings');
      if (apiRes.ok && apiRes.data?.success && Array.isArray(apiRes.data.pdmReadings) && apiRes.data.pdmReadings.length > 0) {
        hasBackendSyncedRef.current = true;
        setReadings(apiRes.data.pdmReadings);
        savePersistentCache(CACHE_KEY_PDM, apiRes.data.pdmReadings, true);
      }
    } catch (err) {
      // Offline / static host mode: IndexedDB handles durability cleanly
    }
  }, []);

  useEffect(() => {
    fetchReadings();
  }, [fetchReadings]);

  const addReading = async (payload: Omit<ConditionReading, 'id'>) => {
    hasLocalMutationRef.current = true;
    const newReading: ConditionReading = {
      ...payload,
      id: `pdm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    };
    setReadings((prev) => [...prev, newReading]);

    try {
      await safeApiCall('/api/pdm-readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReading)
      });
    } catch {
      // Client persistence already saved
    }
    return { success: true, reading: newReading };
  };

  const deleteReading = async (id: string) => {
    hasLocalMutationRef.current = true;
    setReadings((prev) => prev.filter((r) => r.id !== id));
    try {
      await safeApiCall(`/api/pdm-readings/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
    } catch {
      // Client persistence already saved
    }
    return { success: true };
  };

  return {
    readings,
    addReading,
    deleteReading
  };
}
