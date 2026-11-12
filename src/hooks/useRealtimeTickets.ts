import { useState, useEffect, useCallback, useRef } from 'react';
import { MaintenanceTicket, ProgressLog, TicketStatus, RootCauseType, SparePartItem, MachineAsset } from '../types/ticket';
import { initialMachines } from '../data/initialMachines';
import { initialTickets } from '../data/initialTickets';

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
    try {
      const cached = localStorage.getItem(CACHE_KEY_TICKETS);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return initialTickets;
  });

  const [machines, setMachines] = useState<MachineAsset[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_MACHINES);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return initialMachines;
  });

  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [recentNotification, setRecentNotification] = useState<{ message: string; time: string } | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  // Persist tickets to localStorage
  useEffect(() => {
    try {
      if (tickets && tickets.length > 0) {
        localStorage.setItem(CACHE_KEY_TICKETS, JSON.stringify(tickets));
      }
    } catch (e) {}
  }, [tickets]);

  // Persist machines to localStorage
  useEffect(() => {
    try {
      if (machines && machines.length > 0) {
        localStorage.setItem(CACHE_KEY_MACHINES, JSON.stringify(machines));
      }
    } catch (e) {}
  }, [machines]);

  // Fetch initial list
  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch('/api/tickets');
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.tickets && data.tickets.length > 0) {
          setTickets(data.tickets);
          try {
            localStorage.setItem(CACHE_KEY_TICKETS, JSON.stringify(data.tickets));
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMachines = useCallback(async () => {
    try {
      const res = await fetch('/api/machines');
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.machines && data.machines.length > 0) {
          setMachines(data.machines);
          try {
            localStorage.setItem(CACHE_KEY_MACHINES, JSON.stringify(data.machines));
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn('Failed to fetch machines:', err);
    }
  }, []);

  // Connect SSE
  useEffect(() => {
    fetchTickets();

    let retryTimeout: NodeJS.Timeout;

    function connectSSE() {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource('/api/events');
      eventSourceRef.current = es;

      es.onopen = () => {
        setIsConnected(true);
      };

      es.addEventListener('connected', () => {
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
        // Retry connection after 5 seconds
        retryTimeout = setTimeout(connectSSE, 5000);
      };
    }

    fetchMachines();
    connectSSE();

    // Fallback polling every 10s to ensure consistency
    const pollInterval = setInterval(() => {
      fetchTickets();
      fetchMachines();
    }, 10000);

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
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketData)
      });
      const data = await res.json();
      if (data.success && data.ticket) {
        // Optimistic update
        setTickets((prev) => {
          if (prev.some((t) => t.id === data.ticket.id)) return prev;
          return [data.ticket, ...prev];
        });
        return { success: true, ticket: data.ticket };
      }
      return { success: false, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  // Update ticket
  const updateTicket = async (ticketId: string, updates: Partial<MaintenanceTicket>) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success && data.ticket) {
        setTickets((prev) =>
          prev.map((t) => (t.id === data.ticket.id ? data.ticket : t))
        );
        return { success: true, ticket: data.ticket };
      }
      return { success: false, message: data.message };
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
      const res = await fetch(`/api/tickets/${ticketId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && data.ticket) {
        setTickets((prev) =>
          prev.map((t) => (t.id === data.ticket.id ? data.ticket : t))
        );
        return { success: true, ticket: data.ticket, log: data.log };
      }
      return { success: false, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  // Delete progress log (สำหรับฉันเท่านั้น / Admin Delete)
  const deleteProgressLog = async (ticketId: string, logId: string) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/progress/${logId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success && data.ticket) {
        setTickets((prev) =>
          prev.map((t) => (t.id === data.ticket.id ? data.ticket : t))
        );
        return { success: true, ticket: data.ticket };
      }
      return { success: false, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  // Machine Actions
  const createMachine = async (machineData: Partial<MachineAsset>) => {
    try {
      const res = await fetch('/api/machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(machineData)
      });
      const data = await res.json();
      if (data.success && data.machine) {
        setMachines((prev) => {
          if (prev.some((m) => m.id === data.machine.id)) return prev;
          return [...prev, data.machine];
        });
        return { success: true, machine: data.machine };
      }
      return { success: false, message: data.message || 'เกิดข้อผิดพลาดในการเพิ่มเครื่องจักร' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const updateMachine = async (id: string, updates: Partial<MachineAsset>) => {
    try {
      const res = await fetch(`/api/machines/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success && data.machine) {
        setMachines((prev) => prev.map((m) => (m.id === id ? data.machine : m)));
        return { success: true, machine: data.machine };
      }
      return { success: false, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const deleteMachine = async (id: string) => {
    try {
      const res = await fetch(`/api/machines/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setMachines((prev) => prev.filter((m) => m.id !== id));
        return { success: true };
      }
      return { success: false, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  // Reset to initial mock data
  const resetDemoData = async () => {
    try {
      const res = await fetch('/api/reset-data', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.tickets) {
        setTickets(data.tickets);
      }
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
