import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MachineAnnualPMPlan, PMMonthRecord, AnnualPMStats } from '../types/pm';
import { initialAnnualPMPlans, generateInitialAnnualPMPlans } from '../data/initialPMPlans';
import { safeApiCall } from '../utils/apiClient';
import { savePersistentCache, loadSyncCache, loadAsyncCache } from '../utils/clientStorage';

const CACHE_KEY_PREFIX = 'koch_pm_plans_';

export function useRealtimePM(initialYear: number = 2026) {
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [pmPlans, setPmPlans] = useState<MachineAnnualPMPlan[]>(() => {
    const cached = loadSyncCache<MachineAnnualPMPlan[]>(`${CACHE_KEY_PREFIX}${initialYear}`);
    if (Array.isArray(cached) && cached.length > 0) return cached;
    return initialYear === 2026 ? initialAnnualPMPlans : generateInitialAnnualPMPlans(initialYear);
  });
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedYearRef = useRef(selectedYear);
  selectedYearRef.current = selectedYear;
  const pmPlansRef = useRef(pmPlans);
  pmPlansRef.current = pmPlans;

  // Fetch plans from backend or IndexedDB/localStorage for the selected year
  const fetchPlans = useCallback(async (year: number) => {
    try {
      setLoading(true);
      setError(null);

      // First try IndexedDB/localStorage immediately so user edits show up without delay
      const cached = await loadAsyncCache<MachineAnnualPMPlan[]>(`${CACHE_KEY_PREFIX}${year}`);
      if (Array.isArray(cached) && cached.length > 0 && selectedYearRef.current === year) {
        setPmPlans(cached);
      }

      // Then check backend API if running
      const apiRes = await safeApiCall<{ success: boolean; pmPlans?: MachineAnnualPMPlan[] }>(
        `/api/pm-plans?year=${year}`
      );
      if (apiRes.ok && apiRes.data?.success && Array.isArray(apiRes.data.pmPlans) && apiRes.data.pmPlans.length > 0) {
        savePersistentCache(`${CACHE_KEY_PREFIX}${year}`, apiRes.data.pmPlans, true);
        if (selectedYearRef.current === year) {
          setPmPlans(apiRes.data.pmPlans);
        }
        return;
      }

      // If cached data was present, keep it
      if (Array.isArray(cached) && cached.length > 0) {
        return;
      }

      // Otherwise fallback: generate default plan for the year and persist it
      const generated = year === 2026 ? initialAnnualPMPlans : generateInitialAnnualPMPlans(year);
      savePersistentCache(`${CACHE_KEY_PREFIX}${year}`, generated, true);
      if (selectedYearRef.current === year) {
        setPmPlans(generated);
      }
    } catch (err: any) {
      console.warn('[KOCH PM] Error fetching plans from API:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans(selectedYear);
  }, [selectedYear, fetchPlans]);

  // Listen to SSE broadcast for realtime updates across browsers
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');

      eventSource.addEventListener('pm_plan_updated', (event: MessageEvent) => {
        try {
          const updatedPlan: MachineAnnualPMPlan = JSON.parse(event.data);
          if (updatedPlan.year === selectedYearRef.current) {
            setPmPlans((prev) => {
              const index = prev.findIndex((p) => p.id === updatedPlan.id);
              const clone = index === -1 ? [...prev, updatedPlan] : [...prev];
              if (index !== -1) clone[index] = updatedPlan;
              savePersistentCache(`${CACHE_KEY_PREFIX}${updatedPlan.year}`, clone, true);
              return clone;
            });
          }
        } catch (e) {}
      });

      eventSource.addEventListener('data_reset', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (Array.isArray(data.pmPlans)) {
            const forYear = data.pmPlans.filter((p: any) => p.year === selectedYearRef.current);
            if (forYear.length > 0) {
              setPmPlans(forYear);
              savePersistentCache(`${CACHE_KEY_PREFIX}${selectedYearRef.current}`, forYear, true);
            }
          }
        } catch (e) {}
      });

      eventSource.onerror = () => {
        eventSource?.close();
      };
    } catch (e) {}

    return () => {
      eventSource?.close();
    };
  }, [selectedYear]);

  // Record actual execution (Act.) for a specific machine and month
  const recordActualPM = useCallback(async (planId: string, month: number, payload: Partial<PMMonthRecord>) => {
    try {
      setIsSaving(true);
      let optimisticUpdatedPlan: MachineAnnualPMPlan | undefined;

      // Optimistic update + persist to IndexedDB
      setPmPlans((prev) => {
        const next = prev.map((plan) => {
          if (plan.id === planId) {
            const existing = plan.months[month] || { month, monthLabel: `เดือน ${month}`, isPlanned: true, status: 'completed' };
            const updatedMonth: PMMonthRecord = {
              ...existing,
              ...payload,
              month
            };
            optimisticUpdatedPlan = {
              ...plan,
              months: {
                ...plan.months,
                [month]: updatedMonth
              },
              updatedAt: new Date().toISOString()
            };
            return optimisticUpdatedPlan;
          }
          return plan;
        });

        const yearToSave = optimisticUpdatedPlan?.year || next[0]?.year || selectedYearRef.current;
        savePersistentCache(`${CACHE_KEY_PREFIX}${yearToSave}`, next, true);
        return next;
      });

      const apiRes = await safeApiCall<{ success: boolean; plan?: MachineAnnualPMPlan }>(
        `/api/pm-plans/${planId}/record-actual`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            month,
            ...payload
          })
        }
      );

      if (apiRes.ok && apiRes.data?.success && apiRes.data.plan) {
        const serverPlan = apiRes.data.plan;
        setPmPlans((prev) => {
          const next = prev.map((p) => (p.id === serverPlan.id ? serverPlan : p));
          savePersistentCache(`${CACHE_KEY_PREFIX}${serverPlan.year}`, next, true);
          return next;
        });
        return { success: true, plan: serverPlan };
      }

      return { success: true, plan: optimisticUpdatedPlan || pmPlansRef.current.find((p) => p.id === planId) };
    } catch (err: any) {
      console.error('[KOCH PM] Error recording actual PM:', err);
      return { success: true };
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Update a full plan or month details
  const updatePlan = useCallback(async (planId: string, updates: Partial<MachineAnnualPMPlan>) => {
    try {
      setIsSaving(true);
      let optimisticPlan: MachineAnnualPMPlan | undefined;

      setPmPlans((prev) => {
        const next = prev.map((p) => {
          if (p.id === planId) {
            optimisticPlan = { ...p, ...updates, updatedAt: new Date().toISOString() };
            return optimisticPlan;
          }
          return p;
        });
        const yearToSave = optimisticPlan?.year || next[0]?.year || selectedYearRef.current;
        savePersistentCache(`${CACHE_KEY_PREFIX}${yearToSave}`, next, true);
        return next;
      });

      const apiRes = await safeApiCall<{ success: boolean; plan?: MachineAnnualPMPlan }>(
        `/api/pm-plans/${planId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        }
      );

      if (apiRes.ok && apiRes.data?.success && apiRes.data.plan) {
        const serverPlan = apiRes.data.plan;
        setPmPlans((prev) => {
          const next = prev.map((p) => (p.id === planId ? serverPlan : p));
          savePersistentCache(`${CACHE_KEY_PREFIX}${serverPlan.year}`, next, true);
          return next;
        });
        return { success: true, plan: serverPlan };
      }
      return { success: true, plan: optimisticPlan };
    } catch (err: any) {
      return { success: true };
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Compute stats across all 33 machines for the year
  const stats: AnnualPMStats = useMemo(() => {
    let totalPlanned = 0;
    let totalCompleted = 0;
    let totalDelayed = 0;
    let totalInProgress = 0;
    let totalUpcoming = 0;
    let totalDowntimeHours = 0;

    pmPlans.forEach((plan) => {
      for (let m = 1; m <= 12; m++) {
        const rec = plan.months[m];
        if (rec && rec.isPlanned) {
          totalPlanned++;
          if (rec.status === 'completed') {
            totalCompleted++;
            if (rec.durationHours) totalDowntimeHours += rec.durationHours;
          } else if (rec.status === 'delayed') {
            totalDelayed++;
            if (rec.durationHours) totalDowntimeHours += rec.durationHours;
          } else if (rec.status === 'in_progress') {
            totalInProgress++;
          } else {
            totalUpcoming++;
          }
        }
      }
    });

    const achievementRate = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 1000) / 10 : 0;
    const onTimeRate = totalCompleted + totalDelayed > 0 
      ? Math.round((totalCompleted / (totalCompleted + totalDelayed)) * 1000) / 10 
      : 100;

    return {
      totalMachines: pmPlans.length,
      totalPlanned,
      totalCompleted,
      totalDelayed,
      totalInProgress,
      totalUpcoming,
      achievementRate,
      onTimeRate,
      totalDowntimeHours: Math.round(totalDowntimeHours * 10) / 10
    };
  }, [pmPlans]);

  return {
    selectedYear,
    setSelectedYear,
    pmPlans,
    loading,
    isSaving,
    error,
    stats,
    recordActualPM,
    updatePlan,
    refetch: () => fetchPlans(selectedYear)
  };
}
