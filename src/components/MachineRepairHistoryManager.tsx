import React, { useState, useMemo, useRef } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Wrench, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Printer, 
  ChevronRight, 
  Calendar, 
  User, 
  FileText, 
  Package, 
  Layers, 
  ExternalLink, 
  ArrowUpRight,
  TrendingUp,
  Download,
  ShieldCheck,
  CheckCircle2,
  Tag,
  Zap,
  Droplets,
  Wind,
  Cog,
  FileCheck2,
  Sparkles
} from 'lucide-react';
import { MachineAsset, MaintenanceTicket, TicketStatus } from '../types/ticket';
import { getStatusText, getStatusColor, getUrgencyInfo, getRootCauseText } from '../hooks/useRealtimeTickets';
import { KochLogo } from './KochLogo';
import { exportElementToPdf } from '../utils/pdfExport';

interface MachineRepairHistoryManagerProps {
  machines: MachineAsset[];
  tickets: MaintenanceTicket[];
  initialSelectedMachineId?: string;
  onSelectTicket?: (ticket: MaintenanceTicket) => void;
  onPrintTicket?: (ticket: MaintenanceTicket) => void;
  onReportIssueForMachine?: (machine: MachineAsset) => void;
  onViewChecklist?: (machine: MachineAsset) => void;
}

export const MachineRepairHistoryManager: React.FC<MachineRepairHistoryManagerProps> = ({
  machines,
  tickets,
  initialSelectedMachineId,
  onSelectTicket,
  onPrintTicket,
  onReportIssueForMachine,
  onViewChecklist
}) => {
  // Currently selected machine ID
  const [selectedMachineId, setSelectedMachineId] = useState<string>(() => {
    if (initialSelectedMachineId) return initialSelectedMachineId;
    return machines[0]?.id || '';
  });

  // Search machine in selector
  const [machineSearchQuery, setMachineSearchQuery] = useState('');

  // Filter within selected machine's repair history
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'waiting_parts' | 'emergency'>('all');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [activeViewMode, setActiveViewMode] = useState<'timeline' | 'parts_summary' | 'printable_sheet'>('timeline');

  // Currently selected machine object
  const currentMachine = useMemo(() => {
    return machines.find((m) => m.id === selectedMachineId) || machines[0];
  }, [machines, selectedMachineId]);

  // Robust ticket matcher: match code, tagCode, id, name, or location
  const isTicketForMachine = (ticket: MaintenanceTicket, machine: MachineAsset): boolean => {
    if (!ticket || !machine) return false;
    const targetCode = (machine.code || '').trim().toLowerCase();
    const targetTag = (machine.tagCode || '').trim().toLowerCase();
    const targetName = (machine.name || '').trim().toLowerCase();
    const targetId = (machine.id || '').trim().toLowerCase();

    const tMach = (ticket.machineNo || '').trim().toLowerCase();
    const tLoc = (ticket.location || '').trim().toLowerCase();

    return Boolean(
      (targetCode && tMach === targetCode) ||
      (targetTag && tMach === targetTag) ||
      (targetId && tMach === targetId) ||
      (targetName && tMach === targetName) ||
      (targetTag && tLoc.includes(targetTag)) ||
      (targetCode && tLoc.includes(targetCode)) ||
      (targetName && tLoc.includes(targetName))
    );
  };

  // Map of tickets count per machine
  const machineTicketCounts = useMemo(() => {
    const map: Record<string, { total: number; completed: number; active: number; emergency: number }> = {};
    machines.forEach((m) => {
      map[m.id] = { total: 0, completed: 0, active: 0, emergency: 0 };
    });

    tickets.forEach((t) => {
      machines.forEach((m) => {
        if (isTicketForMachine(t, m)) {
          if (!map[m.id]) {
            map[m.id] = { total: 0, completed: 0, active: 0, emergency: 0 };
          }
          map[m.id].total++;
          if (['completed', 'closed'].includes(t.status)) {
            map[m.id].completed++;
          } else {
            map[m.id].active++;
          }
          if (t.urgency === 'emergency') {
            map[m.id].emergency++;
          }
        }
      });
    });

    return map;
  }, [machines, tickets]);

  // Filtered machine list in selector
  const filteredMachines = useMemo(() => {
    const q = machineSearchQuery.toLowerCase().trim();
    if (!q) return machines;
    return machines.filter((m) => {
      return (
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        (m.tagCode && m.tagCode.toLowerCase().includes(q)) ||
        (m.processName && m.processName.toLowerCase().includes(q)) ||
        (m.department && m.department.toLowerCase().includes(q))
      );
    });
  }, [machines, machineSearchQuery]);

  // All tickets belonging to currentMachine
  const machineAllTickets = useMemo(() => {
    if (!currentMachine) return [];
    return tickets.filter((t) => isTicketForMachine(t, currentMachine));
  }, [tickets, currentMachine]);

  // Filtered tickets based on status and search query
  const filteredTickets = useMemo(() => {
    return machineAllTickets.filter((t) => {
      // Status filter
      if (statusFilter === 'completed' && !['completed', 'closed'].includes(t.status)) return false;
      if (statusFilter === 'in_progress' && t.status !== 'in_progress') return false;
      if (statusFilter === 'waiting_parts' && t.status !== 'waiting_parts') return false;
      if (statusFilter === 'emergency' && t.urgency !== 'emergency') return false;

      // Text search
      const q = historySearchQuery.toLowerCase().trim();
      if (!q) return true;

      const matchTicketNo = t.ticketNo.toLowerCase().includes(q);
      const matchProblem = t.problemDescription.toLowerCase().includes(q);
      const matchRepair = (t.repairDetails || '').toLowerCase().includes(q);
      const matchRootCause = (t.rootCauseDetail || '').toLowerCase().includes(q);
      const matchTech = (t.technicians || []).some((tech) => tech.toLowerCase().includes(q));
      const matchPart = (t.spareParts || []).some(
        (p) => p.name.toLowerCase().includes(q) || p.partNo.toLowerCase().includes(q)
      );

      return matchTicketNo || matchProblem || matchRepair || matchRootCause || matchTech || matchPart;
    });
  }, [machineAllTickets, statusFilter, historySearchQuery]);

  // Aggregated replaced spare parts on this machine
  const replacedPartsSummary = useMemo(() => {
    const list: Array<{
      id: string;
      partNo: string;
      name: string;
      quantity: number;
      unit: string;
      ticketNo: string;
      ticketId: string;
      date: string;
      technician: string;
    }> = [];

    machineAllTickets.forEach((t) => {
      (t.spareParts || []).forEach((p) => {
        list.push({
          id: `${t.id}-${p.id || p.partNo}`,
          partNo: p.partNo || '-',
          name: p.name || 'ไม่ระบุชื่ออะไหล่',
          quantity: p.quantity || 1,
          unit: p.unit || 'ชิ้น',
          ticketNo: t.ticketNo,
          ticketId: t.id,
          date: t.endDate || t.requestDate,
          technician: t.technicians?.[0] || t.receiverSign?.name || '-'
        });
      });
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [machineAllTickets]);

  // Overall KPIs for current machine
  const machineKpi = useMemo(() => {
    const total = machineAllTickets.length;
    const completed = machineAllTickets.filter((t) => ['completed', 'closed'].includes(t.status)).length;
    const active = total - completed;
    const emergency = machineAllTickets.filter((t) => t.urgency === 'emergency').length;
    const partsCount = replacedPartsSummary.reduce((acc, p) => acc + (p.quantity || 1), 0);

    return { total, completed, active, emergency, partsCount };
  }, [machineAllTickets, replacedPartsSummary]);

  // Print ref
  const printSheetRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportPdf = async () => {
    if (!printSheetRef.current || !currentMachine) return;
    setIsExportingPdf(true);
    await exportElementToPdf(
      printSheetRef.current,
      `ประวัติการซ่อมบำรุง_${currentMachine.tagCode || currentMachine.code}_${currentMachine.name}.pdf`
    );
    setIsExportingPdf(false);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Top Banner / Breadcrumb */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600/30 border border-blue-400/40 rounded-xl text-blue-300">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>ประวัติบันทึกการซ่อมย้อนหลังแต่ละเครื่อง</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30 font-mono">
                    KOCH Machine History Logbook
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                บันทึกประวัติการซ่อมแซม, การบำรุงรักษาเชิงแก้ไข, รายการอะไหล่ที่เคยเปลี่ยน และอาการเสียย้อนหลังทุกรอบการซ่อม
              </p>
            </div>
          </div>

          {/* Quick actions for current machine */}
          {currentMachine && (
            <div className="flex items-center gap-2 flex-wrap">
              {onReportIssueForMachine && (
                <button
                  type="button"
                  onClick={() => onReportIssueForMachine(currentMachine)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>+ แจ้งซ่อมเครื่องนี้</span>
                </button>
              )}
              {onViewChecklist && (
                <button
                  type="button"
                  onClick={() => onViewChecklist(currentMachine)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  <FileCheck2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>ตรวจเช็คประจำวัน</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveViewMode(activeViewMode === 'printable_sheet' ? 'timeline' : 'printable_sheet')}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl transition cursor-pointer border ${
                  activeViewMode === 'printable_sheet'
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{activeViewMode === 'printable_sheet' ? 'กลับสู่หน้าไทม์ไลน์' : 'พิมพ์ประวัติการซ่อม (A4)'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Machine Selector Carousel / Horizontal Pills */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Cog className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-800">
              เลือกเครื่องจักรเพื่อดูประวัติ ({machines.length} เครื่องในระบบ)
            </span>
          </div>

          {/* Quick search input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={machineSearchQuery}
              onChange={(e) => setMachineSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ, รหัส, BS Tag..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Machine Pills Horizontal Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {filteredMachines.map((m) => {
            const isSelected = m.id === selectedMachineId;
            const counts = machineTicketCounts[m.id] || { total: 0, completed: 0, active: 0, emergency: 0 };
            const hasActive = counts.active > 0;

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMachineId(m.id)}
                className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-left transition cursor-pointer border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {m.tagCode || `BS-${String(m.no || 0).padStart(2, '0')}`}
                    </span>
                    <span className="text-xs font-bold truncate max-w-[120px]">{m.name}</span>
                  </div>
                  <span
                    className={`text-[10px] truncate max-w-[130px] font-mono ${
                      isSelected ? 'text-blue-100' : 'text-slate-400'
                    }`}
                  >
                    {m.code}
                  </span>
                </div>

                {/* Repair counts badge */}
                <div className="shrink-0 flex items-center">
                  {counts.total > 0 ? (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
                        isSelected
                          ? 'bg-white text-blue-700'
                          : hasActive
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                      title={`ประวัติงานซ่อม ${counts.total} ครั้ง (กำลังซ่อม: ${counts.active}, เสร็จ: ${counts.completed})`}
                    >
                      <Wrench className="w-2.5 h-2.5" />
                      {counts.total}
                    </span>
                  ) : (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        isSelected ? 'bg-white/20 text-blue-100' : 'bg-slate-200/80 text-slate-500'
                      }`}
                    >
                      0
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {currentMachine && activeViewMode !== 'printable_sheet' && (
        <>
          {/* Selected Machine Header Card & KPIs */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-blue-600 shrink-0">
                  <Cog className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 text-xs font-mono font-bold bg-blue-100 text-blue-800 rounded-md border border-blue-200">
                      {currentMachine.tagCode || 'BS-XX'}
                    </span>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      {currentMachine.name}
                    </h2>
                    <span className="text-xs font-mono text-slate-500">
                      ({currentMachine.code})
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {currentMachine.department || 'ฝ่ายผลิต'} • {currentMachine.location || 'บางแสน BS'}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    {currentMachine.model && currentMachine.model !== '-' && (
                      <span><strong>รุ่น/Model:</strong> {currentMachine.model}</span>
                    )}
                    {currentMachine.kwHp && (
                      <span><strong>กำลังไฟ/มอเตอร์:</strong> {currentMachine.kwHp}</span>
                    )}
                    {currentMachine.power && (
                      <span><strong>ระบบไฟ:</strong> {currentMachine.power}</span>
                    )}
                    {currentMachine.airWater && (
                      <span><strong>ระบบลม/น้ำ:</strong> {currentMachine.airWater}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* View mode toggle tabs: 'timeline' vs 'parts_summary' */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 self-start lg:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveViewMode('timeline')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    activeViewMode === 'timeline'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>บันทึกการซ่อม ({machineAllTickets.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveViewMode('parts_summary')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    activeViewMode === 'parts_summary'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>อะไหล่ที่เคยเปลี่ยน ({replacedPartsSummary.length})</span>
                </button>
              </div>
            </div>

            {/* KPI Metric Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-slate-100 bg-slate-50/50">
              <div className="p-3 sm:p-4 text-center">
                <div className="text-[11px] text-slate-500 font-medium">งานซ่อมทั้งหมด</div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                  {machineKpi.total}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">ใบแจ้งซ่อมสะสม</div>
              </div>

              <div className="p-3 sm:p-4 text-center">
                <div className="text-[11px] text-slate-500 font-medium">ซ่อมเสร็จแล้ว</div>
                <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">
                  {machineKpi.completed}
                </div>
                <div className="text-[10px] text-emerald-700/80 mt-0.5">ปิดงานสมบูรณ์</div>
              </div>

              <div className="p-3 sm:p-4 text-center">
                <div className="text-[11px] text-slate-500 font-medium">กำลังซ่อม/รออะไหล่</div>
                <div className={`text-xl sm:text-2xl font-black mt-0.5 ${machineKpi.active > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                  {machineKpi.active}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">ค้างดำเนินการ</div>
              </div>

              <div className="p-3 sm:p-4 text-center">
                <div className="text-[11px] text-slate-500 font-medium">เหตุฉุกเฉิน</div>
                <div className={`text-xl sm:text-2xl font-black mt-0.5 ${machineKpi.emergency > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                  {machineKpi.emergency}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">เครื่องหยุดไลน์</div>
              </div>

              <div className="p-3 sm:p-4 text-center col-span-2 sm:col-span-1">
                <div className="text-[11px] text-slate-500 font-medium">อะไหล่ที่เปลี่ยน</div>
                <div className="text-xl sm:text-2xl font-black text-indigo-600 mt-0.5">
                  {machineKpi.partsCount}
                </div>
                <div className="text-[10px] text-indigo-700/80 mt-0.5">ชิ้นส่วนสแปร์พาร์ท</div>
              </div>
            </div>
          </div>

          {/* Sub-view 1: Repair Timeline & Detailed Record Cards */}
          {activeViewMode === 'timeline' && (
            <div className="space-y-4">
              {/* Filter and Search Bar for this machine's repairs */}
              <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                  <span className="text-xs text-slate-500 font-medium mr-1 flex items-center gap-1 shrink-0">
                    <Filter className="w-3.5 h-3.5" />
                    สถานะ:
                  </span>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition cursor-pointer shrink-0 ${
                      statusFilter === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ทั้งหมด ({machineAllTickets.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('completed')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition cursor-pointer shrink-0 ${
                      statusFilter === 'completed'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ซ่อมเสร็จแล้ว ({machineKpi.completed})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('in_progress')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition cursor-pointer shrink-0 ${
                      statusFilter === 'in_progress'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    กำลังซ่อมแซม ({machineAllTickets.filter((t) => t.status === 'in_progress').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('emergency')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition cursor-pointer shrink-0 ${
                      statusFilter === 'emergency'
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ฉุกเฉิน ({machineKpi.emergency})
                  </button>
                </div>

                {/* Search within this machine's repairs */}
                <div className="relative w-full md:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    placeholder="ค้นหาเลขที่ใบซ่อม, อาการ, ช่าง..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Tickets List */}
              {filteredTickets.length > 0 ? (
                <div className="space-y-4">
                  {filteredTickets.map((ticket, index) => {
                    const statusInfo = getStatusColor(ticket.status);
                    const urgencyInfo = getUrgencyInfo(ticket.urgency);

                    return (
                      <div
                        key={ticket.id}
                        className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-md transition-all overflow-hidden"
                      >
                        {/* Ticket Card Header */}
                        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-mono text-xs font-black px-2.5 py-1 bg-slate-900 text-white rounded-lg shadow-2xs">
                              {ticket.ticketNo}
                            </span>
                            <span className="text-xs font-mono text-slate-500">
                              {ticket.formCode || 'FM-MN01-03'}
                            </span>
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${urgencyInfo.color}`}>
                              {urgencyInfo.label}
                            </span>
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
                              {getStatusText(ticket.status)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>วันที่แจ้ง: <strong>{ticket.requestDate}</strong> ({ticket.requestTime || '08:00'})</span>
                          </div>
                        </div>

                        {/* Ticket Card Content */}
                        <div className="p-4 sm:p-5 space-y-4">
                          {/* Problem Description & Photos */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2 space-y-2">
                              <div>
                                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                                  อาการเสีย / ปัญหาที่แจ้งซ่อม:
                                </div>
                                <p className="text-sm font-semibold text-slate-900 mt-0.5 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                                  {ticket.problemDescription}
                                </p>
                              </div>

                              {/* Root Cause Analysis */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                                  <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                    <span>สาเหตุความเสียหาย:</span>
                                  </div>
                                  <div className="text-xs font-semibold text-amber-800 mt-1">
                                    {getRootCauseText(ticket.rootCause)}
                                  </div>
                                  {ticket.rootCauseDetail && (
                                    <p className="text-[11px] text-amber-900/80 mt-0.5 leading-normal">
                                      {ticket.rootCauseDetail}
                                    </p>
                                  )}
                                </div>

                                <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-200">
                                  <div className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
                                    <Wrench className="w-3.5 h-3.5 text-blue-600" />
                                    <span>การแก้ไข & การปฏิบัติงาน:</span>
                                  </div>
                                  <div className="text-xs text-slate-800 mt-1 leading-normal">
                                    {ticket.repairDetails || ticket.correctiveSteps || 'กำลังดำเนินการแก้ไขโดยช่างซ่อมบำรุง'}
                                  </div>
                                  {ticket.durationText && (
                                    <div className="text-[10px] text-blue-700 font-mono mt-1 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      เวลาหยุดซ่อม: {ticket.durationText}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Requester & Technician Info Column */}
                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                              <div>
                                <span className="text-[10px] text-slate-500 uppercase font-semibold">ผู้แจ้งปัญหา:</span>
                                <div className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                                  <User className="w-3.5 h-3.5 text-slate-500" />
                                  <span>{ticket.requesterName}</span>
                                </div>
                                <span className="text-[11px] text-slate-500">แผนก: {ticket.department}</span>
                              </div>

                              <div className="border-t border-slate-200 pt-2">
                                <span className="text-[10px] text-slate-500 uppercase font-semibold">ช่างผู้ปฏิบัติงาน:</span>
                                <div className="space-y-0.5 mt-0.5">
                                  {(ticket.technicians || []).filter(Boolean).length > 0 ? (
                                    ticket.technicians.filter(Boolean).map((tech, i) => (
                                      <div key={i} className="text-slate-800 font-medium flex items-center gap-1">
                                        <Wrench className="w-3 h-3 text-blue-500 shrink-0" />
                                        <span className="truncate">{tech}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-slate-400">ยังไม่ระบุช่าง</span>
                                  )}
                                </div>
                              </div>

                              {/* Progress Log Count Badge */}
                              <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[11px]">
                                <span className="text-slate-500 font-medium">บันทึกไทม์ไลน์ช่าง:</span>
                                <span className="font-bold font-mono px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md">
                                  ⚡ {ticket.progressLogs?.length || 0} รายการ
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Replaced Spare Parts Strip in this Ticket */}
                          {ticket.spareParts && ticket.spareParts.length > 0 && (
                            <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200">
                              <div className="text-[11px] font-bold text-indigo-900 flex items-center gap-1 mb-2">
                                <Package className="w-3.5 h-3.5 text-indigo-600" />
                                <span>รายการอะไหล่ที่เบิกเปลี่ยนในงานนี้ ({ticket.spareParts.length} รายการ):</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {ticket.spareParts.map((part, pIdx) => (
                                  <div
                                    key={pIdx}
                                    className="bg-white p-2 rounded-lg border border-indigo-100 flex items-center justify-between text-xs"
                                  >
                                    <div>
                                      <div className="font-bold text-slate-800">{part.name}</div>
                                      <div className="text-[10px] text-slate-500 font-mono">Part: {part.partNo}</div>
                                    </div>
                                    <span className="font-bold font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                      {part.quantity} {part.unit}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Action Buttons for this Ticket */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <span className="text-[11px] text-slate-400 font-mono">
                              ID: {ticket.id} • อัปเดตล่าสุด: {new Date(ticket.updatedAt || ticket.createdAt).toLocaleString('th-TH')}
                            </span>

                            <div className="flex items-center gap-2">
                              {onSelectTicket && (
                                <button
                                  type="button"
                                  onClick={() => onSelectTicket(ticket)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition cursor-pointer"
                                  title="เปิดดูรายละเอียดเต็ม, ลายเซ็น และไทม์ไลน์ความคืบหน้าของช่าง"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>เปิดดูไทม์ไลน์ / แก้ไข ({ticket.progressLogs?.length || 0})</span>
                                </button>
                              )}
                              {onPrintTicket && (
                                <button
                                  type="button"
                                  onClick={() => onPrintTicket(ticket)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
                                  title="พิมพ์ใบแจ้งซ่อม FM-MN01-03 ทางการ"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>พิมพ์ FM-MN01-03</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <CheckCircle className="w-7 h-7 text-emerald-500" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">
                    {historySearchQuery || statusFilter !== 'all'
                      ? 'ไม่พบประวัติการซ่อมตามเงื่อนไขที่ค้นหา'
                      : `เครื่องจักร ${currentMachine.tagCode || ''} ${currentMachine.name} ยังไม่มีประวัติการซ่อม`}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {historySearchQuery || statusFilter !== 'all'
                      ? 'ลองปรับคำค้นหาหรือเปลี่ยนตัวกรองสถานะ'
                      : 'เครื่องจักรนี้ยังไม่เคยมีบันทึกประวัติการแจ้งซ่อม สภาพเครื่องสมบูรณ์พร้อมเดินไลน์ผลิต'}
                  </p>
                  {onReportIssueForMachine && (
                    <button
                      type="button"
                      onClick={() => onReportIssueForMachine(currentMachine)}
                      className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>เปิดใบแจ้งซ่อมเครื่องนี้ใหม่ (FM-MN01-03)</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Sub-view 2: Replaced Spare Parts Summary Table */}
          {activeViewMode === 'parts_summary' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Package className="w-4 h-4 text-indigo-600" />
                    <span>สรุปประวัติอะไหล่ที่เคยเปลี่ยนในเครื่อง {currentMachine.name} ({currentMachine.tagCode})</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    รวบรวมชิ้นส่วนสแปร์พาร์ททุกชิ้นที่เคยเบิกเปลี่ยนในใบแจ้งซ่อมย้อนหลังทั้งหมด
                  </p>
                </div>
                <span className="text-xs font-bold font-mono px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full">
                  ทั้งหมด {replacedPartsSummary.length} รายการ
                </span>
              </div>

              {replacedPartsSummary.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[11px]">
                        <th className="py-2.5 px-3 font-semibold">ลำดับ</th>
                        <th className="py-2.5 px-3 font-semibold">รหัสอะไหล่ (Part No.)</th>
                        <th className="py-2.5 px-3 font-semibold">ชื่อรายการอะไหล่</th>
                        <th className="py-2.5 px-3 font-semibold text-center">จำนวนที่เปลี่ยน</th>
                        <th className="py-2.5 px-3 font-semibold">วันที่เปลี่ยน</th>
                        <th className="py-2.5 px-3 font-semibold">ใบแจ้งซ่อม</th>
                        <th className="py-2.5 px-3 font-semibold">ช่างผู้รับผิดชอบ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {replacedPartsSummary.map((p, idx) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 font-mono text-slate-400 font-bold">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{p.partNo}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{p.name}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="font-mono font-bold px-2 py-0.5 bg-indigo-50 text-indigo-800 rounded border border-indigo-200">
                              {p.quantity} {p.unit}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{p.date}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{p.ticketNo}</td>
                          <td className="py-2.5 px-3 text-slate-700">{p.technician}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  ยังไม่มีประวัติการเปลี่ยนอะไหล่ในเครื่องจักรนี้
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Sub-view 3: Printable Machine History Record Sheet (FM-MN01-01 / Service Log) */}
      {currentMachine && activeViewMode === 'printable_sheet' && (
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setActiveViewMode('timeline')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              ← กลับสู่มุมมองไทม์ไลน์
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExportingPdf ? 'กำลังสร้างไฟล์ PDF...' : 'ดาวน์โหลด PDF (A4)'}</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>พิมพ์เอกสารนี้</span>
              </button>
            </div>
          </div>

          {/* Printable Sheet Card */}
          <div className="flex justify-center p-2 sm:p-6 bg-slate-100 rounded-2xl border border-slate-200 overflow-x-auto">
            <div
              ref={printSheetRef}
              className="bg-white text-slate-900 p-6 sm:p-10 shadow-xl rounded-xl border border-slate-300 w-full max-w-4xl min-w-[700px] text-xs space-y-6"
              style={{ fontFamily: 'Sarabun, Tahoma, sans-serif' }}
            >
              {/* Document Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div className="flex items-center gap-3">
                  <KochLogo size="md" variant="horizontal" />
                  <div>
                    <h2 className="text-base font-black tracking-tight text-slate-900">
                      บริษัท ค็อค แพคเกจจิ้ง แอนด์ พาร์ทเกจ เซอร์วิสเซส จำกัด
                    </h2>
                    <h3 className="text-sm font-bold text-slate-700">
                      ใบประวัติการซ่อมบำรุงและบริการเครื่องจักร (MACHINE MAINTENANCE SERVICE RECORD)
                    </h3>
                  </div>
                </div>
                <div className="text-right text-[11px] font-mono">
                  <div className="font-bold text-slate-900">FM-MN01-01 / FM-MN01-03</div>
                  <div className="text-slate-500">Rev.00 Date: 19/10/2026</div>
                  <div className="text-slate-500">พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH')}</div>
                </div>
              </div>

              {/* Machine Specs Grid */}
              <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/50 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">รหัสประจำเครื่อง (Tag):</span>
                  <strong className="text-sm font-mono text-blue-900">{currentMachine.tagCode || '-'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">รหัสทรัพย์สิน (Code):</span>
                  <strong className="text-sm font-mono text-slate-900">{currentMachine.code}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">ชื่อเครื่องจักร (Name):</span>
                  <strong className="text-slate-900">{currentMachine.name}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">แผนก/สถานที่:</span>
                  <span className="text-slate-900">{currentMachine.department} ({currentMachine.location})</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">รุ่น/Model:</span>
                  <span className="font-mono">{currentMachine.model || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">ระบบไฟฟ้า (Power):</span>
                  <span className="font-mono">{currentMachine.power || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">สเปกมอเตอร์:</span>
                  <span className="font-mono">{currentMachine.kwHp || currentMachine.motorSpec || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">สถานะปัจจุบัน:</span>
                  <span className="font-bold text-emerald-700">พร้อมใช้งาน (Active)</span>
                </div>
              </div>

              {/* Repair History Table */}
              <div>
                <h4 className="font-bold text-sm text-slate-900 mb-2 flex items-center justify-between">
                  <span>ประวัติการแจ้งซ่อมและการแก้ไขย้อนหลัง ({machineAllTickets.length} ครั้ง)</span>
                  <span className="text-xs font-normal text-slate-500">เรียงตามวันที่ล่าสุด</span>
                </h4>

                <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="p-2 border border-slate-600 text-center w-8">No.</th>
                      <th className="p-2 border border-slate-600 w-24">วันที่แจ้ง/เวลา</th>
                      <th className="p-2 border border-slate-600 w-24">เลขที่ใบซ่อม</th>
                      <th className="p-2 border border-slate-600">อาการเสีย / รายละเอียดปัญหา</th>
                      <th className="p-2 border border-slate-600">สาเหตุ & ขั้นตอนการแก้ไข</th>
                      <th className="p-2 border border-slate-600 w-24">อะไหล่ที่เปลี่ยน</th>
                      <th className="p-2 border border-slate-600 w-20 text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 text-slate-900">
                    {machineAllTickets.length > 0 ? (
                      machineAllTickets.map((t, idx) => (
                        <tr key={t.id} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                          <td className="p-2 border border-slate-300 text-center font-bold text-slate-500">{idx + 1}</td>
                          <td className="p-2 border border-slate-300 font-mono">
                            <div>{t.requestDate}</div>
                            <div className="text-[10px] text-slate-500">{t.requestTime}</div>
                          </td>
                          <td className="p-2 border border-slate-300 font-mono font-bold text-blue-900">{t.ticketNo}</td>
                          <td className="p-2 border border-slate-300">
                            <div className="font-medium">{t.problemDescription}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">ผู้แจ้ง: {t.requesterName}</div>
                          </td>
                          <td className="p-2 border border-slate-300">
                            <div>{t.repairDetails || t.correctiveSteps || '-'}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              สาเหตุ: {getRootCauseText(t.rootCause)}
                            </div>
                          </td>
                          <td className="p-2 border border-slate-300">
                            {(t.spareParts || []).length > 0 ? (
                              <ul className="list-disc list-inside text-[10px]">
                                {t.spareParts.map((sp, sIdx) => (
                                  <li key={sIdx}>{sp.name} ({sp.quantity} {sp.unit})</li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-2 border border-slate-300 text-center font-bold">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                              ['completed', 'closed'].includes(t.status)
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {getStatusText(t.status)}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400">
                          ไม่มีประวัติการแจ้งซ่อมในระบบ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Signatures Footer */}
              <div className="pt-6 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-[11px]">
                <div className="space-y-8">
                  <div className="border-b border-slate-400 pb-1">ลงชื่อ........................................................</div>
                  <div>ผู้บันทึกข้อมูลประวัติ (ช่างซ่อมบำรุง)</div>
                </div>
                <div className="space-y-8">
                  <div className="border-b border-slate-400 pb-1">ลงชื่อ........................................................</div>
                  <div>หัวหน้าแผนกซ่อมบำรุง</div>
                </div>
                <div className="space-y-8">
                  <div className="border-b border-slate-400 pb-1">ลงชื่อ........................................................</div>
                  <div>ผู้จัดการโรงงาน / ผู้มีอำนาจอนุมัติ</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
