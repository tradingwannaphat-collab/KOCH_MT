import { useState, useEffect, useCallback, useRef } from 'react';
import { MachineMonthlyCheckSheet, InspectionResult, DayCheckRecord } from '../types/inspection';
import { initialMachines } from '../data/initialMachines';
import { generateInitialCheckSheets } from '../data/initialInspections';
import { safeApiCall } from '../utils/apiClient';

const CACHE_KEY_SHEETS = 'koch_inspection_sheets_cache_v2';

export function useRealtimeInspections() {
  const [sheets, setSheets] = useState<MachineMonthlyCheckSheet[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_SHEETS);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return generateInitialCheckSheets();
  });
  const [selectedMachineId, setSelectedMachineId] = useState<string>(initialMachines[0]?.id || 'm-01');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      if (sheets && sheets.length > 0) {
        localStorage.setItem(CACHE_KEY_SHEETS, JSON.stringify(sheets));
      }
    } catch (e) {}
  }, [sheets]);

  const fetchInspections = useCallback(async (month: string = selectedMonth) => {
    try {
      const res = await fetch(`/api/inspections?month=${encodeURIComponent(month)}`);
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.inspections && data.inspections.length > 0) {
          setSheets(data.inspections);
          try {
            localStorage.setItem(CACHE_KEY_SHEETS, JSON.stringify(data.inspections));
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn('Failed to fetch inspections:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchInspections(selectedMonth);

    // Listen for SSE events
    const es = new EventSource('/api/events');

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
        }
      } catch (e) {
        console.error('Error handling data_reset for inspections', e);
      }
    });

    return () => {
      es.close();
    };
  }, [fetchInspections, selectedMonth]);

  // Current active sheet for selected machine and month
  const currentSheet = sheets.find(
    (s) => s.machineId === selectedMachineId && s.month === selectedMonth
  ) || sheets.find((s) => s.machineId === selectedMachineId);

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
      // 1. Optimistically update local sheets state
      setSheets((prev) => {
        const next = prev.map((sheet) => {
          if (sheet.machineId === machineId && sheet.month === month) {
            const days = { ...sheet.days };
            const existingDay = days[day] || { day, results: {} };
            days[day] = {
              ...existingDay,
              day,
              results: { ...(existingDay.results || {}), ...results },
              ticketNos: existingDay.ticketNos || {},
              inspectorName: inspectorName || existingDay.inspectorName || '',
              supervisorName: supervisorName || existingDay.supervisorName || '',
              notes: notes !== undefined ? notes : existingDay.notes || ''
            };
            return { ...sheet, days, updatedAt: new Date().toISOString() };
          }
          return sheet;
        });
        try {
          localStorage.setItem(CACHE_KEY_SHEETS, JSON.stringify(next));
        } catch (e) {}
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
      return true; // Still true because client state was updated!
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
    // Cycle: null -> 'pass' -> 'abnormal' -> 'off' -> null
    let nextStatus: InspectionResult = 'pass';
    if (currentStatus === 'pass') nextStatus = 'abnormal';
    else if (currentStatus === 'abnormal') nextStatus = 'off';
    else if (currentStatus === 'off') nextStatus = null;
    else nextStatus = 'pass';

    // Optimistic UI update
    setSheets((prev) => {
      const next = prev.map((sheet) => {
        if (sheet.machineId === machineId && sheet.month === month) {
          const days = { ...sheet.days };
          const dayRec = days[day] || { day, results: {} };
          days[day] = {
            ...dayRec,
            results: {
              ...dayRec.results,
              [itemNo]: nextStatus
            }
          };
          return { ...sheet, days };
        }
        return sheet;
      });
      try {
        localStorage.setItem(CACHE_KEY_SHEETS, JSON.stringify(next));
      } catch (e) {}
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
      setSheets((prev) => {
        const next = prev.map((s) => (s.id === sheetId ? { ...s, remarks, approverName, approvedDate, updatedAt: new Date().toISOString() } : s));
        try {
          localStorage.setItem(CACHE_KEY_SHEETS, JSON.stringify(next));
        } catch (e) {}
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
      setSheets((prev) => {
        const next = prev.map((s) => (s.machineId === machineId && s.month === month ? { ...s, items, updatedAt: new Date().toISOString() } : s));
        try {
          localStorage.setItem(CACHE_KEY_SHEETS, JSON.stringify(next));
        } catch (e) {}
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
