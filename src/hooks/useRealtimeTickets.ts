import { useState, useEffect, useCallback, useRef } from 'react';
import { MaintenanceTicket, ProgressLog, TicketStatus, RootCauseType, SparePartItem, MachineAsset } from '../types/ticket';
import { initialMachines } from '../data/initialMachines';
import { initialTickets } from '../data/initialTickets';
import { safeApiCall } from '../utils/apiClient';

import { savePersistentCache, loadSyncCache, loadAsyncCache, idbDelete } from '../utils/clientStorage';

// Simple sound synthesis for notifications on real-time events
function playNotificationSound(type: 'new' | 'update' = 'update') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'new') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    // AudioContext might be blocked before user gesture
  }
}

const CACHE_KEY_TICKETS = 'koch_tickets_cache_v2';
const CACHE_KEY_MACHINES = 'koch_machines_cache_v2';

export function useRealtimeTickets() {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>(() => {
    const cached = loadSyncCache<MaintenanceTicket[]>(CACHE_KEY_TICKETS);
    if (Array.isArray(cached) && cached.length > 0) return cached;
    return initialTickets;
  });

  const [machines, setMachines] = useState<MachineAsset[]>(() => {
    const cached = loadSyncCache<MachineAsset[]>(CACHE_KEY_MACHINES);
    if (Array.isArray(cached) && cached.length > 0) return cached;
    return initialMachines;
  });

  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [recentNotification, setRecentNotification] = useState<{ message: string; time: string } | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const hasLocalTicketsMutationRef = useRef(false);
  const hasBackendTicketsSyncedRef = useRef(false);
  const hasLocalMachinesMutationRef = useRef(false);
  const hasBackendMachinesSyncedRef = useRef(false);
  const isStaticHostRef = useRef(false);

  // Hydrate from IndexedDB on mount (handles larger datasets with photos beyond 5MB localStorage limit)
  useEffect(() => {
    let active = true;
    loadAsyncCache<MaintenanceTicket[]>(CACHE_KEY_TICKETS).then((stored) => {
      if (!active) return;
      if (
        Array.isArray(stored) &&
        stored.length > 0 &&
        !hasLocalTicketsMutationRef.current &&
        !hasBackendTicketsSyncedRef.current
      ) {
        setTickets(stored);
      }
    });
    loadAsyncCache<MachineAsset[]>(CACHE_KEY_MACHINES).then((stored) => {
      if (!active) return;
      if (
        Array.isArray(stored) &&
        stored.length > 0 &&
        !hasLocalMachinesMutationRef.current &&
        !hasBackendMachinesSyncedRef.current
      ) {
        setMachines(stored);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Persist tickets to IndexedDB + localStorage
  useEffect(() => {
    if (tickets && tickets.length > 0) {
      savePersistentCache(CACHE_KEY_TICKETS, tickets, true);
    }
  }, [tickets]);

  // Persist machines to IndexedDB + localStorage
  useEffect(() => {
    if (machines && machines.length > 0) {
      savePersistentCache(CACHE_KEY_MACHINES, machines, true);
    }
  }, [machines]);

  // Fetch initial list
  const fetchTickets = useCallback(async () => {
    try {
      const apiRes = await safeApiCall<{ tickets?: MaintenanceTicket[] }>('/api/tickets');
      if (apiRes.ok && apiRes.data?.tickets && apiRes.data.tickets.length > 0) {
        hasBackendTicketsSyncedRef.current = true;
        isStaticHostRef.current = false;
        setTickets(apiRes.data.tickets);
        savePersistentCache(CACHE_KEY_TICKETS, apiRes.data.tickets, true);
      } else if (!apiRes.ok) {
        isStaticHostRef.current = true;
      }
    } catch (err) {
      console.warn('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMachines = useCallback(async () => {
    try {
      const apiRes = await safeApiCall<{ machines?: MachineAsset[] }>('/api/machines');
      if (apiRes.ok && apiRes.data?.machines && apiRes.data.machines.length > 0) {
        hasBackendMachinesSyncedRef.current = true;
        setMachines(apiRes.data.machines);
        savePersistentCache(CACHE_KEY_MACHINES, apiRes.data.machines, true);
      }
    } catch (err) {
      console.warn('Failed to fetch machines:', err);
    }
  }, []);

  // Connect SSE
  useEffect(() => {
    let retryTimeout: ReturnType<typeof setTimeout>;
    let pollInterval: ReturnType<typeof setInterval>;

    function connectSSE() {
      if (isStaticHostRef.current) return;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource('/api/events');
      eventSourceRef.current = es;

      es.onopen = () => {
        isStaticHostRef.current = false;
        setIsConnected(true);
      };

      es.addEventListener('connected', () => {
        isStaticHostRef.current = false;
        setIsConnected(true);
      });

      es.addEventListener('ticket_created', (event: MessageEvent) => {
        try {
          const newTicket: MaintenanceTicket = JSON.parse(event.data);
          setTickets((prev) => {
            const exists = prev.some((t) => t.id === newTicket.id);
            if (exists) return prev;
            return [newTicket, ...prev];
          });

          if (soundEnabledRef.current) {
            playNotificationSound('new');
          }
          setRecentNotification({
            message: `ใบแจ้งซ่อมใหม่: ${newTicket.ticketNo} (${newTicket.machineNo})`,
            time: new Date().toLocaleTimeString('th-TH')
          });
        } catch (err) {
          console.error('Error parsing ticket_created', err);
        }
      });

      es.addEventListener('ticket_updated', (event: MessageEvent) => {
        try {
          const updatedTicket: MaintenanceTicket = JSON.parse(event.data);
          setTickets((prev) =>
            prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t))
          );

          if (soundEnabledRef.current) {
            playNotificationSound('update');
          }
          setRecentNotification({
            message: `อัปเดตงาน: ${updatedTicket.ticketNo} สถานะ [${getStatusText(updatedTicket.status)}]`,
            time: new Date().toLocaleTimeString('th-TH')
          });
        } catch (err) {
          console.error('Error parsing ticket_updated', err);
        }
      });

      es.addEventListener('machine_created', (event: MessageEvent) => {
        try {
          const newMachine: MachineAsset = JSON.parse(event.data);
          setMachines((prev) => {
            if (prev.some((m) => m.id === newMachine.id)) return prev;
            return [...prev, newMachine];
          });
          setRecentNotification({
            message: `เพิ่มเครื่องจักรใหม่: ${newMachine.code} (${newMachine.name})`,
            time: new Date().toLocaleTimeString('th-TH')
          });
        } catch (err) {
          console.error('Error parsing machine_created', err);
        }
      });

      es.addEventListener('machine_updated', (event: MessageEvent) => {
        try {
          const updatedMachine: MachineAsset = JSON.parse(event.data);
          setMachines((prev) =>
            prev.map((m) => (m.id === updatedMachine.id ? updatedMachine : m))
          );
        } catch (err) {
          console.error('Error parsing machine_updated', err);
        }
      });

      es.addEventListener('machine_deleted', (event: MessageEvent) => {
        try {
          const { id } = JSON.parse(event.data);
          setMachines((prev) => prev.filter((m) => m.id !== id));
        } catch (err) {
          console.error('Error parsing machine_deleted', err);
        }
      });

      es.addEventListener('data_reset', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (Array.isArray(data)) {
            setTickets(data);
          } else {
            if (data.tickets) setTickets(data.tickets);
            if (data.machines) setMachines(data.machines);
          }
        } catch (err) {
          console.error('Error parsing data_reset', err);
        }
      });

      es.onerror = () => {
        setIsConnected(false);
        es.close();
        // On static hosts (like Vercel) without backend API, do not spam reconnect loops
        if (!isStaticHostRef.current) {
          retryTimeout = setTimeout(connectSSE, 5000);
        }
      };
    }

    fetchTickets().then(() => {
      if (!isStaticHostRef.current) {
        fetchMachines();
        connectSSE();
        // Fallback polling every 10s only when backend API is reachable
        pollInterval = setInterval(() => {
          fetchTickets();
          fetchMachines();
        }, 10000);
      }
    });

    return () => {
      clearTimeout(retryTimeout);
      clearInterval(pollInterval);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [fetchTickets, fetchMachines]);

  // Create ticket
  const createTicket = async (ticketData: Partial<MaintenanceTicket>) => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const count = (tickets.length + 1).toString().padStart(3, '0');
      const ticketNo = `MN-${year}${month}-${count}`;
      const id = `ticket-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const newTicket: MaintenanceTicket = {
        id,
        ticketNo,
        formCode: 'FM-MN01-03 Rev.00 Date 19/10/2026',
        requestDate: ticketData.requestDate || `${year}-${month}-${day}`,
        requestTime: ticketData.requestTime || timeStr,
        requesterName: ticketData.requesterName || '',
        department: ticketData.department || 'ฝ่ายผลิต',
        category: ticketData.category || 'machine',
        machineNo: ticketData.machineNo || '',
        location: ticketData.location || 'บางแสน BS (โรงงาน)',
        urgency: ticketData.urgency || 'normal',
        problemDescription: ticketData.problemDescription || '',
        photos: ticketData.photos || [],
        requesterSign: ticketData.requesterSign || {
          name: ticketData.requesterName || '',
          date: `${year}-${month}-${day}`,
          time: timeStr,
          isSigned: true,
          signatureDataUrl: ''
        },
        receiverSign: ticketData.receiverSign || {
          name: 'ประสิทธิ์ วิศวกร (ทีมซ่อมบำรุง)',
          date: `${year}-${month}-${day}`,
          time: timeStr,
          isSigned: true
        },
        status: ticketData.status || 'pending',
        rootCause: ticketData.rootCause || 'lack_of_maintenance',
        rootCauseDetail: ticketData.rootCauseDetail || '',
        repairDetails: ticketData.repairDetails || '',
        troubleshootingSteps: ticketData.troubleshootingSteps || '',
        correctiveSteps: ticketData.correctiveSteps || '',
        testRunResult: ticketData.testRunResult || '',
        spareParts: ticketData.spareParts || [],
        startDate: ticketData.startDate || `${year}-${month}-${day}`,
        startTime: ticketData.startTime || timeStr,
        endDate: ticketData.endDate || '',
        endTime: ticketData.endTime || '',
        durationText: ticketData.durationText || '',
        technicians: (ticketData.technicians && ticketData.technicians.length === 3
          ? ticketData.technicians
          : ['ประสิทธิ์ วิศวกร', 'นายเปา (ช่างไฟฟ้า)', 'สมเกียรติ มั่นคง']) as [string, string, string],
        requesterApproval: ticketData.requesterApproval || {
          name: ticketData.requesterName || '',
          date: '',
          time: '',
          isSigned: false
        },
        technicianApproval: ticketData.technicianApproval || {
          name: 'ประสิทธิ์ วิศวกร',
          date: '',
          time: '',
          isSigned: false
        },
        supervisorApproval: ticketData.supervisorApproval || {
          name: '',
          date: '',
          time: '',
          isSigned: false
        },
        progressLogs: ticketData.progressLogs || [
          {
            id: `log-${Date.now()}`,
            timestamp: `${year}-${month}-${day} ${timeStr}`,
            author: ticketData.requesterName || 'ผู้แจ้งซ่อม',
            role: 'ผู้แจ้งซ่อม',
            action: 'สร้างใบแจ้งซ่อมใหม่ (FM-MN01-03)',
            notes: ticketData.problemDescription || 'แจ้งปัญหาหน้างาน',
            statusChange: 'pending'
          }
        ],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        ...ticketData
      };

      // Try background sync with backend if running
      const apiRes = await safeApiCall<{ success: boolean; ticket?: MaintenanceTicket }>('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketData)
      });

      const finalTicket = (apiRes.ok && apiRes.data?.success && apiRes.data.ticket) ? apiRes.data.ticket : newTicket;

      hasLocalTicketsMutationRef.current = true;
      setTickets((prev) => {
        const next = [finalTicket, ...prev.filter((t) => t.id !== finalTicket.id)];
        savePersistentCache(CACHE_KEY_TICKETS, next, true);
        return next;
      });

      if (soundEnabledRef.current) {
        playNotificationSound('new');
      }

      return { success: true, ticket: finalTicket };
    } catch (err: any) {
      console.warn('Error in createTicket fallback:', err);
      return { success: false, message: err.message || 'เกิดข้อผิดพลาดในการสร้างใบแจ้งซ่อม' };
    }
  };

  // Update ticket
  const updateTicket = async (ticketId: string, updates: Partial<MaintenanceTicket>) => {
    try {
      hasLocalTicketsMutationRef.current = true;
      setTickets((prev) => {
        const next = prev.map((t) => (t.id === ticketId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t));
        savePersistentCache(CACHE_KEY_TICKETS, next, true);
        return next;
      });

      const apiRes = await safeApiCall<{ success: boolean; ticket?: MaintenanceTicket }>(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (apiRes.ok && apiRes.data?.success && apiRes.data.ticket) {
        setTickets((prev) => {
          const next = prev.map((t) => (t.id === ticketId ? apiRes.data!.ticket! : t));
          savePersistentCache(CACHE_KEY_TICKETS, next, true);
          return next;
        });
        return { success: true, ticket: apiRes.data.ticket };
      }

      const current = tickets.find((t) => t.id === ticketId);
      return { success: true, ticket: current ? { ...current, ...updates } : undefined };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  // Add progress log
  const addProgressLog = async (
    ticketId: string,
    payload: {
      author: string;
      role: string;
      action: string;
      notes?: string;
      statusChange?: TicketStatus;
      photoUrl?: string;
    }
  ) => {
    try {
      hasLocalTicketsMutationRef.current = true;
      const now = new Date();
      const newLog: ProgressLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: now.toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }),
        author: payload.author,
        role: payload.role,
        action: payload.action,
        notes: payload.notes || '',
        statusChange: payload.statusChange,
        photoUrl: payload.photoUrl
      };

      setTickets((prev) => {
        const next = prev.map((t) => {
          if (t.id !== ticketId) return t;
          const updatedLogs = [...(t.progressLogs || []), newLog];
          const newStatus = payload.statusChange || t.status;
          return {
            ...t,
            status: newStatus,
            progressLogs: updatedLogs,
            updatedAt: now.toISOString()
          };
        });
        savePersistentCache(CACHE_KEY_TICKETS, next, true);
        return next;
      });

      const apiRes = await safeApiCall<{ success: boolean; ticket?: MaintenanceTicket; log?: ProgressLog }>(
        `/api/tickets/${ticketId}/progress`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      if (apiRes.ok && apiRes.data?.success && apiRes.data.ticket) {
        setTickets((prev) => {
          const next = prev.map((t) => (t.id === ticketId ? apiRes.data!.ticket! : t));
          savePersistentCache(CACHE_KEY_TICKETS, next, true);
          return next;
        });
        return { success: true, ticket: apiRes.data.ticket, log: apiRes.data.log || newLog };
      }

      const updated = tickets.find((t) => t.id === ticketId);
      return { success: true, ticket: updated, log: newLog };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  // Delete progress log
  const deleteProgressLog = async (ticketId: string, logId: string) => {
    try {
      hasLocalTicketsMutationRef.current = true;
      setTickets((prev) => {
        const next = prev.map((t) => {
          if (t.id !== ticketId) return t;
          return {
            ...t,
            progressLogs: (t.progressLogs || []).filter((l) => l.id !== logId),
            updatedAt: new Date().toISOString()
          };
        });
        savePersistentCache(CACHE_KEY_TICKETS, next, true);
        return next;
      });

      await safeApiCall(`/api/tickets/${ticketId}/progress/${logId}`, { method: 'DELETE' });
      const current = tickets.find((t) => t.id === ticketId);
      return { success: true, ticket: current };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  // Machine Actions
  const createMachine = async (machineData: Partial<MachineAsset>) => {
    try {
      hasLocalMachinesMutationRef.current = true;
      const newMach: MachineAsset = {
        id: machineData.id || `m-${Date.now()}`,
        no: machineData.no || (machines.length + 1),
        tagCode: machineData.tagCode || `EQ-${machines.length + 1}`,
        code: machineData.code || `MA-${Date.now()}`,
        name: machineData.name || 'เครื่องจักรใหม่',
        model: machineData.model || '-',
        serialNo: machineData.serialNo || '-',
        processName: machineData.processName || machineData.name || '-',
        category: machineData.category || 'machine',
        machineType: machineData.machineType || 'other',
        machineTypeLabel: machineData.machineTypeLabel || machineData.name || 'เครื่องจักร',
        location: machineData.location || 'บางแสน BS (โรงงาน)',
        department: machineData.department || 'ฝ่ายผลิต',
        status: machineData.status || 'active',
        dimensions: machineData.dimensions || '-',
        power: machineData.power || '-',
        kwHp: machineData.kwHp || '-',
        airWater: machineData.airWater || 'No',
        motorSpec: machineData.motorSpec || '-',
        notes: machineData.notes || '',
        imageUrl: machineData.imageUrl || ''
      };

      setMachines((prev) => {
        const next = [...prev, newMach];
        savePersistentCache(CACHE_KEY_MACHINES, next, true);
        return next;
      });

      const apiRes = await safeApiCall<{ success: boolean; machine?: MachineAsset }>('/api/machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(machineData)
      });

      const finalMach = (apiRes.ok && apiRes.data?.success && apiRes.data.machine) ? apiRes.data.machine : newMach;
      return { success: true, machine: finalMach };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const updateMachine = async (id: string, updates: Partial<MachineAsset>) => {
    try {
      hasLocalMachinesMutationRef.current = true;
      setMachines((prev) => {
        const next = prev.map((m) => (m.id === id ? { ...m, ...updates } : m));
        savePersistentCache(CACHE_KEY_MACHINES, next, true);
        return next;
      });

      const apiRes = await safeApiCall<{ success: boolean; machine?: MachineAsset }>(`/api/machines/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (apiRes.ok && apiRes.data?.success && apiRes.data.machine) {
        setMachines((prev) => {
          const next = prev.map((m) => (m.id === id ? apiRes.data!.machine! : m));
          savePersistentCache(CACHE_KEY_MACHINES, next, true);
          return next;
        });
        return { success: true, machine: apiRes.data.machine };
      }

      const current = machines.find((m) => m.id === id);
      return { success: true, machine: current };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const deleteMachine = async (id: string) => {
    try {
      hasLocalMachinesMutationRef.current = true;
      setMachines((prev) => {
        const next = prev.filter((m) => m.id !== id);
        savePersistentCache(CACHE_KEY_MACHINES, next, true);
        return next;
      });

      await safeApiCall(`/api/machines/${id}`, { method: 'DELETE' });
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  // Reset to initial mock data
  const resetDemoData = async () => {
    try {
      await safeApiCall('/api/reset-data', { method: 'POST' });
      hasLocalTicketsMutationRef.current = true;
      hasLocalMachinesMutationRef.current = true;
      setTickets(initialTickets);
      setMachines(initialMachines);

      const allCacheKeys = [
        CACHE_KEY_TICKETS,
        CACHE_KEY_MACHINES,
        'koch_inspection_sheets_cache_v2',
        'koch_inspections_selected_month',
        'koch_inspections_selected_machine',
        'koch_bom_items_cache_v2',
        'koch_spare_parts_cache_v2',
        'koch_stock_tx_cache_v2',
        'koch_pm_plans_2026',
        'koch_pm_plans_2027'
      ];
      await Promise.all(allCacheKeys.map((k) => idbDelete(k)));
      for (const k of allCacheKeys) {
        try {
          localStorage.removeItem(k);
        } catch (e) {}
      }

      await Promise.all([
        savePersistentCache(CACHE_KEY_TICKETS, initialTickets, true),
        savePersistentCache(CACHE_KEY_MACHINES, initialMachines, true)
      ]);
      window.location.reload();
    } catch (err) {
      console.error('Failed to reset demo data:', err);
    }
  };

  return {
    tickets,
    machines,
    loading,
    isConnected,
    soundEnabled,
    setSoundEnabled,
    recentNotification,
    setRecentNotification,
    createTicket,
    updateTicket,
    addProgressLog,
    deleteProgressLog,
    createMachine,
    updateMachine,
    deleteMachine,
    resetDemoData,
    refreshTickets: fetchTickets,
    refreshMachines: fetchMachines
  };
}

export function getStatusText(status: TicketStatus): string {
  switch (status) {
    case 'pending':
      return 'รอดำเนินการ';
    case 'acknowledged':
      return 'รับแจ้งแล้ว';
    case 'in_progress':
      return 'กำลังซ่อมแซม';
    case 'waiting_parts':
      return 'รออะไหล่';
    case 'testing':
      return 'ทดสอบระบบ';
    case 'completed':
      return 'ซ่อมเสร็จสิ้น';
    case 'closed':
      return 'ปิดงานสมบูรณ์';
    default:
      return status;
  }
}

export function getStatusColor(status: TicketStatus): { bg: string; text: string; border: string; badge: string } {
  switch (status) {
    case 'pending':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', badge: 'bg-amber-500' };
    case 'acknowledged':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', badge: 'bg-blue-500' };
    case 'in_progress':
      return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-300', badge: 'bg-indigo-600' };
    case 'waiting_parts':
      return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300', badge: 'bg-purple-600' };
    case 'testing':
      return { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-300', badge: 'bg-teal-600' };
    case 'completed':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300', badge: 'bg-emerald-600' };
    case 'closed':
      return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', badge: 'bg-slate-600' };
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300', badge: 'bg-gray-500' };
  }
}

export function getUrgencyInfo(urgency: string) {
  switch (urgency) {
    case 'emergency':
      return { label: 'ฉุกเฉิน (หยุดไลน์ผลิต)', color: 'bg-rose-100 text-rose-800 border-rose-300', dot: 'bg-rose-600 animate-ping' };
    case 'high':
      return { label: 'ด่วนมาก', color: 'bg-orange-100 text-orange-800 border-orange-300', dot: 'bg-orange-500' };
    case 'normal':
      return { label: 'ปกติ', color: 'bg-blue-100 text-blue-800 border-blue-300', dot: 'bg-blue-500' };
    case 'low':
      return { label: 'ตามรอบซ่อมบำรุง', color: 'bg-gray-100 text-gray-800 border-gray-300', dot: 'bg-gray-400' };
    default:
      return { label: urgency, color: 'bg-gray-100 text-gray-800 border-gray-300', dot: 'bg-gray-400' };
  }
}

export function getRootCauseText(cause: RootCauseType): string {
  switch (cause) {
    case 'lack_of_maintenance':
      return 'ขาดการบำรุงรักษา';
    case 'substandard_parts':
      return 'อะไหล่ไม่มีคุณภาพ';
    case 'misuse':
      return 'ใช้งานผิดประเภท';
    case 'other':
      return 'อื่นๆ';
    default:
      return cause;
  }
}
