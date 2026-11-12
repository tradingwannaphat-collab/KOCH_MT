import { useState, useEffect, useCallback, useMemo } from 'react';
import { MachineAnnualPMPlan, PMMonthRecord, AnnualPMStats } from '../types/pm';
import { initialAnnualPMPlans, generateInitialAnnualPMPlans } from '../data/initialPMPlans';

const CACHE_KEY_PREFIX = 'koch_pm_plans_';

export function useRealtimePM(initialYear: number = 2026) {
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [pmPlans, setPmPlans] = useState<MachineAnnualPMPlan[]>(() => {
    try {
      const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${initialYear}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return initialAnnualPMPlans;
  });
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch plans from backend for the selected year
  const fetchPlans = useCallback(async (year: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/pm-plans?year=${year}`);
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && Array.isArray(data.pmPlans) && data.pmPlans.length > 0) {
          setPmPlans(data.pmPlans);
          try {
            localStorage.setItem(`${CACHE_KEY_PREFIX}${year}`, JSON.stringify(data.pmPlans));
          } catch (e) {}
          return;
        }
      }

      // If backend didn't supply, check localStorage or generate locally
      try {
        const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${year}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPmPlans(parsed);
            return;
          }
        }
      } catch (e) {}

      // Fallback: generate default plan for the year
      const generated = year === 2026 ? initialAnnualPMPlans : generateInitialAnnualPMPlans(year);
      setPmPlans(generated);
      try {
        localStorage.setItem(`${CACHE_KEY_PREFIX}${year}`, JSON.stringify(generated));
      } catch (e) {}
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
    const eventSource = new EventSource('/api/events');

    eventSource.addEventListener('pm_plan_updated', (event: any) => {
      try {
        const updatedPlan: MachineAnnualPMPlan = JSON.parse(event.data);
        if (updatedPlan.year === selectedYear) {
          setPmPlans((prev) => {
            const index = prev.findIndex((p) => p.id === updatedPlan.id);
            if (index === -1) return [...prev, updatedPlan];
            const clone = [...prev];
            clone[index] = updatedPlan;
            try {
              localStorage.setItem(`${CACHE_KEY_PREFIX}${selectedYear}`, JSON.stringify(clone));
            } catch (e) {}
            return clone;
          });
        }
      } catch (e) {}
    });

    eventSource.addEventListener('data_reset', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        if (Array.isArray(data.pmPlans)) {
          const forYear = data.pmPlans.filter((p: any) => p.year === selectedYear);
          if (forYear.length > 0) setPmPlans(forYear);
        }
      } catch (e) {}
    });

    return () => {
      eventSource.close();
    };
  }, [selectedYear]);

  // Record actual execution (Act.) for a specific machine and month
  const recordActualPM = useCallback(async (planId: string, month: number, payload: Partial<PMMonthRecord>) => {
    try {
      setIsSaving(true);
      // Optimistic update
      setPmPlans((prev) => {
        return prev.map((plan) => {
          if (plan.id === planId) {
            const existing = plan.months[month] || { month, monthLabel: `เดือน ${month}`, isPlanned: true, status: 'completed' };
            const updatedMonth: PMMonthRecord = {
              ...existing,
              ...payload,
              month
            };
            return {
              ...plan,
              months: {
                ...plan.months,
                [month]: updatedMonth
              },
              updatedAt: new Date().toISOString()
            };
          }
          return plan;
        });
      });

      const res = await fetch(`/api/pm-plans/${planId}/record-actual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          ...payload
        })
      });

      const data = await res.json();
      if (data.success && data.plan) {
        setPmPlans((prev) => prev.map((p) => (p.id === data.plan.id ? data.plan : p)));
        try {
          localStorage.setItem(`${CACHE_KEY_PREFIX}${selectedYear}`, JSON.stringify(pmPlans));
        } catch (e) {}
        return { success: true, plan: data.plan };
      }
      return { success: false, message: data.message };
    } catch (err: any) {
      console.error('[KOCH PM] Error recording actual PM:', err);
      return { success: false, message: err.message };
    } finally {
      setIsSaving(false);
    }
  }, [selectedYear, pmPlans]);

  // Update a full plan or month details
  const updatePlan = useCallback(async (planId: string, updates: Partial<MachineAnnualPMPlan>) => {
    try {
      setIsSaving(true);
      const res = await fetch(`/api/pm-plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success && data.plan) {
        setPmPlans((prev) => prev.map((p) => (p.id === data.plan.id ? data.plan : p)));
        return { success: true, plan: data.plan };
      }
      return { success: false };
    } catch (err: any) {
      return { success: false, message: err.message };
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
