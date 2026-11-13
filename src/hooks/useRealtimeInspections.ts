import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MachineMonthlyCheckSheet, InspectionResult, DayCheckRecord } from '../types/inspection';
import { initialMachines } from '../data/initialMachines';
import { generateInitialCheckSheets, createEmptyMonthSheet } from '../data/initialInspections';
import { safeApiCall } from '../utils/apiClient';
import { savePersistentCache, loadSyncCache, loadAsyncCache } from '../utils/clientStorage';

const CACHE_KEY_SHEETS = 'koch_inspection_sheets_cache_v2';
const CACHE_KEY_SELECTED_MONTH = 'koch_inspections_selected_month';
const CACHE_KEY_SELECTED_MACHINE = 'koch_inspections_selected_machine';

function buildSheetForMachineMonth(
  existingSheets: MachineMonthlyCheckSheet[],
  machineId: string,
  month: string
): MachineMonthlyCheckSheet {
  const newSheet = createEmptyMonthSheet(machineId, month);
  // Inherit any customized checklist items from an existing sheet for the same machine
  const referenceSheet = existingSheets.find((s) => s.machineId === machineId && Array.isArray(s.items) && s.items.length > 0);
  if (referenceSheet) {
    newSheet.items = JSON.parse(JSON.stringify(referenceSheet.items));
    const freshDays: Record<number, DayCheckRecord> = {};
    for (let d = 1; d <= 31; d++) {
      const results: Record<number, InspectionResult> = {};
      for (const it of newSheet.items) {
        results[it.no] = null;
      }
      freshDays[d] = {
        day: d,
        results,
        ticketNos: {},
        inspectorName: '',
        supervisorName: '',
        notes: ''
      };
    }
    newSheet.days = freshDays;
  }
  return newSheet;
}

function mergeSheetsById(
  current: MachineMonthlyCheckSheet[],
  incoming: MachineMonthlyCheckSheet[]
): MachineMonthlyCheckSheet[] {
  const map = new Map<string, MachineMonthlyCheckSheet>();
  for (const s of current) {
    map.set(s.id, s);
  }
  for (const s of incoming) {
    map.set(s.id, s);
  }
  return Array.from(map.values());
}

export function useRealtimeInspections() {
  const [sheets, setSheets] = useState<MachineMonthlyCheckSheet[]>(() => {
    const cached = loadSyncCache<MachineMonthlyCheckSheet[]>(CACHE_KEY_SHEETS);
    if (Array.isArray(cached) && cached.length > 0) return cached;
    return generateInitialCheckSheets();
  });

  const [selectedMachineId, setSelectedMachineIdState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(CACHE_KEY_SELECTED_MACHINE);
      if (saved) return saved;
    } catch (e) {}
    return initialMachines[0]?.id || 'm-01';
  });

  const [selectedMonth, setSelectedMonthState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(CACHE_KEY_SELECTED_MONTH);
      if (saved && /^\d{4}-\d{2}$/.test(saved)) return saved;
    } catch (e) {}
    return '2026-10';
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const hasLocalMutationRef = useRef(false);
  const hasBackendSyncedRef = useRef(false);

  const setSelectedMachineId = useCallback((id: string) => {
    setSelectedMachineIdState(id);
    try {
      localStorage.setItem(CACHE_KEY_SELECTED_MACHINE, id);
    } catch (e) {}
  }, []);

  const setSelectedMonth = useCallback((month: string) => {
    setSelectedMonthState(month);
    try {
      localStorage.setItem(CACHE_KEY_SELECTED_MONTH, month);
    } catch (e) {}
  }, []);

  // Hydrate from IndexedDB on initial mount (handles large multi-month datasets beyond 5MB localStorage limit)
  useEffect(() => {
    let active = true;
    loadAsyncCache<MachineMonthlyCheckSheet[]>(CACHE_KEY_SHEETS).then((stored) => {
      if (!active) return;
      if (Array.isArray(stored) && stored.length > 0 && !hasLocalMutationRef.current && !hasBackendSyncedRef.current) {
        setSheets((prev) => mergeSheetsById(prev, stored));
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Persist sheets to IndexedDB + localStorage whenever sheets changes
  useEffect(() => {
    if (sheets && sheets.length > 0) {
      savePersistentCache(CACHE_KEY_SHEETS, sheets, true);
    }
  }, [sheets]);

  // Ensure a sheet exists in state whenever user selects a new machine or month (e.g. 2026-11, 2027-01)
  useEffect(() => {
    setSheets((prev) => {
      const exists = prev.some((s) => s.machineId === selectedMachineId && s.month === selectedMonth);
      if (exists) return prev;
      const created = buildSheetForMachineMonth(prev, selectedMachineId, selectedMonth);
      const next = [...prev, created];
      savePersistentCache(CACHE_KEY_SHEETS, next, true);
      return next;
    });
  }, [selectedMachineId, selectedMonth]);

  const fetchInspections = useCallback(async (month: string = selectedMonth) => {
    try {
      const apiRes = await safeApiCall<{ success: boolean; inspections?: MachineMonthlyCheckSheet[] }>(
        `/api/inspections?month=${encodeURIComponent(month)}`
      );
      if (apiRes.ok && apiRes.data?.inspections && apiRes.data.inspections.length > 0) {
        hasBackendSyncedRef.current = true;
        setSheets((prev) => {
          const merged = mergeSheetsById(prev, apiRes.data!.inspections!);
          savePersistentCache(CACHE_KEY_SHEETS, merged, true);
          return merged;
        });
      }
    } catch (err) {
      console.warn('Failed to fetch inspections:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchInspections(selectedMonth);

    // Listen for SSE events only if backend is reachable
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/events');

      es.addEventListener('inspection_updated', (event: MessageEvent) => {
        try {
          const updatedSheet: MachineMonthlyCheckSheet = JSON.parse(event.data);
          setSheets((prev) => {
            const index = prev.findIndex((s) => s.id === updatedSheet.id);
            if (index >= 0) {
              const next = [...prev];
              next[index] = updatedSheet;
              return next;
            }
            return [...prev, updatedSheet];
          });
        } catch (e) {
          console.error('Error handling inspection_updated', e);
        }
      });

      es.addEventListener('inspection_created', (event: MessageEvent) => {
        try {
          const newSheet: MachineMonthlyCheckSheet = JSON.parse(event.data);
          setSheets((prev) => {
            if (prev.some((s) => s.id === newSheet.id)) return prev;
            return [...prev, newSheet];
          });
        } catch (e) {
          console.error('Error handling inspection_created', e);
        }
      });

      es.addEventListener('inspection_items_updated', (event: MessageEvent) => {
        try {
          const { machineId, items } = JSON.parse(event.data);
          setSheets((prev) =>
            prev.map((s) => (s.machineId === machineId ? { ...s, items } : s))
          );
        } catch (e) {
          console.error('Error handling inspection_items_updated', e);
        }
      });

      es.addEventListener('data_reset', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.inspections) {
            setSheets(data.inspections);
            savePersistentCache(CACHE_KEY_SHEETS, data.inspections, true);
          }
        } catch (e) {
          console.error('Error handling data_reset for inspections', e);
        }
      });

      es.onerror = () => {
        // Close gracefully on static hosts (like Vercel) without spamming reconnect loops
        es?.close();
      };
    } catch (e) {}

    return () => {
      es?.close();
    };
  }, [fetchInspections, selectedMonth]);

  // Current active sheet strictly matching selected machine AND selected month
  const currentSheet = useMemo(() => {
    const exact = sheets.find(
      (s) => s.machineId === selectedMachineId && s.month === selectedMonth
    );
    if (exact) return exact;
    return buildSheetForMachineMonth(sheets, selectedMachineId, selectedMonth);
  }, [sheets, selectedMachineId, selectedMonth]);

  // Save an entire day inspection (from Quick Today modal)
  const saveDayCheck = async (
    machineId: string,
    month: string,
    day: number,
    results: Record<number, InspectionResult>,
    inspectorName: string = '',
    supervisorName: string = '',
    notes: string = ''
  ) => {
    try {
      setSaving(true);
      hasLocalMutationRef.current = true;

      // 1. Optimistically update (or auto-create then update) local sheets state
      setSheets((prev) => {
        const exists = prev.some((s) => s.machineId === machineId && s.month === month);
        const workingList = exists
          ? prev
          : [...prev, buildSheetForMachineMonth(prev, machineId, month)];

        const next = workingList.map((sheet) => {
          if (sheet.machineId === machineId && sheet.month === month) {
            const days = { ...sheet.days };
            const existingDay = days[day] || { day, results: {} };
            days[day] = {
              ...existingDay,
              day,
              results: { ...(existingDay.results || {}), ...results },
              ticketNos: existingDay.ticketNos || {},
              inspectorName: inspectorName !== undefined ? inspectorName : (existingDay.inspectorName || ''),
              supervisorName: supervisorName !== undefined ? supervisorName : (existingDay.supervisorName || ''),
              notes: notes !== undefined ? notes : (existingDay.notes || ''),
              updatedAt: new Date().toISOString()
            };
            return { ...sheet, days, updatedAt: new Date().toISOString() };
          }
          return sheet;
        });

        savePersistentCache(CACHE_KEY_SHEETS, next, true);
        return next;
      });

      // 2. Background sync with backend if available
      await safeApiCall('/api/inspections/save-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId,
          month,
          day,
          results,
          inspectorName,
          supervisorName,
          notes
        })
      });

      return true;
    } catch (err) {
      console.error('Failed to save day check:', err);
      return true;
    } finally {
      setSaving(false);
    }
  };

  // Quick toggle single cell
  const toggleCell = async (
    machineId: string,
    month: string,
    day: number,
    itemNo: number,
    currentStatus: InspectionResult
  ) => {
    hasLocalMutationRef.current = true;

    // Cycle: null -> 'pass' -> 'abnormal' -> 'off' -> null
    let nextStatus: InspectionResult = 'pass';
    if (currentStatus === 'pass') nextStatus = 'abnormal';
    else if (currentStatus === 'abnormal') nextStatus = 'off';
    else if (currentStatus === 'off') nextStatus = null;
    else nextStatus = 'pass';

    // Optimistic UI update (auto-creates month sheet if not in list yet)
    setSheets((prev) => {
      const exists = prev.some((s) => s.machineId === machineId && s.month === month);
      const workingList = exists
        ? prev
        : [...prev, buildSheetForMachineMonth(prev, machineId, month)];

      const next = workingList.map((sheet) => {
        if (sheet.machineId === machineId && sheet.month === month) {
          const days = { ...sheet.days };
          const dayRec = days[day] || { day, results: {}, ticketNos: {}, inspectorName: '', supervisorName: '', notes: '' };
          days[day] = {
            ...dayRec,
            results: {
              ...dayRec.results,
              [itemNo]: nextStatus
            },
            updatedAt: new Date().toISOString()
          };
          return { ...sheet, days, updatedAt: new Date().toISOString() };
        }
        return sheet;
      });

      savePersistentCache(CACHE_KEY_SHEETS, next, true);
      return next;
    });

    try {
      await safeApiCall('/api/inspections/toggle-cell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId,
          month,
          day,
          itemNo,
          status: nextStatus
        })
      });
      return true;
    } catch (err) {
      return true;
    }
  };

  // Update remarks and approver info
  const updateSheetDetails = async (
    sheetId: string,
    remarks: string,
    approverName: string,
    approvedDate: string
  ) => {
    try {
      hasLocalMutationRef.current = true;
      setSheets((prev) => {
        const exists = prev.some((s) => s.id === sheetId);
        const workingList = exists
          ? prev
          : [...prev, buildSheetForMachineMonth(prev, selectedMachineId, selectedMonth)];

        const next = workingList.map((s) =>
          (s.id === sheetId || (s.machineId === selectedMachineId && s.month === selectedMonth))
            ? { ...s, remarks, approverName, approvedDate, updatedAt: new Date().toISOString() }
            : s
        );
        savePersistentCache(CACHE_KEY_SHEETS, next, true);
        return next;
      });

      await safeApiCall(`/api/inspections/${sheetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks, approverName, approvedDate })
      });
      return true;
    } catch (err) {
      return true;
    }
  };

  // Update customized checklist items for a machine
  const updateMachineItems = async (machineId: string, month: string, items: any[]) => {
    try {
      setSaving(true);
      hasLocalMutationRef.current = true;

      setSheets((prev) => {
        const exists = prev.some((s) => s.machineId === machineId && s.month === month);
        const workingList = exists
          ? prev
          : [...prev, buildSheetForMachineMonth(prev, machineId, month)];

        const next = workingList.map((s) =>
          s.machineId === machineId
            ? { ...s, items, updatedAt: new Date().toISOString() }
            : s
        );
        savePersistentCache(CACHE_KEY_SHEETS, next, true);
        return next;
      });

      await safeApiCall('/api/inspections/update-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machineId, month, items })
      });
      return true;
    } catch (err) {
      return true;
    } finally {
      setSaving(false);
    }
  };

  return {
    sheets,
    currentSheet,
    selectedMachineId,
    setSelectedMachineId,
    selectedMonth,
    setSelectedMonth,
    loading,
    saving,
    fetchInspections,
    saveDayCheck,
    toggleCell,
    updateSheetDetails,
    updateMachineItems
  };
}
