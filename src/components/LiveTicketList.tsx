import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Wrench, 
  Clock, 
  MapPin, 
  User, 
  ChevronRight, 
  Plus, 
  AlertCircle, 
  Printer, 
  CheckCircle2, 
  Activity, 
  Camera,
  Layers,
  Sparkles
} from 'lucide-react';
import { MaintenanceTicket, TicketStatus, UrgencyLevel, MachineAsset } from '../types/ticket';
import { getStatusText, getStatusColor, getUrgencyInfo } from '../hooks/useRealtimeTickets';

interface LiveTicketListProps {
  tickets: MaintenanceTicket[];
  machines?: MachineAsset[];
  onSelectTicket: (ticket: MaintenanceTicket) => void;
  onNewTicket: () => void;
  onPrintTicket: (ticket: MaintenanceTicket) => void;
}

export const LiveTicketList: React.FC<LiveTicketListProps> = ({
  tickets,
  machines = [],
  onSelectTicket,
  onNewTicket,
  onPrintTicket
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('all');

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        t.ticketNo.toLowerCase().includes(q) ||
        t.machineNo.toLowerCase().includes(q) ||
        t.requesterName.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q) ||
        t.problemDescription.toLowerCase().includes(q);

      // Status
      const matchStatus = selectedStatus === 'all' || t.status === selectedStatus;

      // Category
      const matchCategory = selectedCategory === 'all' || t.category === selectedCategory;

      // Urgency
      const matchUrgency = selectedUrgency === 'all' || t.urgency === selectedUrgency;

      return matchSearch && matchStatus && matchCategory && matchUrgency;
    });
  }, [tickets, searchQuery, selectedStatus, selectedCategory, selectedUrgency]);

  // Counts
  const counts = useMemo(() => {
    return {
      all: tickets.length,
      pending: tickets.filter((t) => t.status === 'pending').length,
      in_progress: tickets.filter((t) => t.status === 'in_progress').length,
      waiting_parts: tickets.filter((t) => t.status === 'waiting_parts').length,
      completed: tickets.filter((t) => ['completed', 'closed'].includes(t.status)).length
    };
  }, [tickets]);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-24 space-y-5">
      
      {/* Top Banner / Mobile Quick Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              รายการแจ้งซ่อมหน้างานสด
            </h1>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              ซิงก์เรียลไทม์
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            ติดตามงานและอัปเดตความคืบหน้าหน้างานของช่างเทคนิคได้ทันที
          </p>
        </div>

        <button
          onClick={onNewTicket}
          className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ แจ้งปัญหาใหม่</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหา หมายเลขเครื่องจักร, เลขที่ใบแจ้งซ่อม, ผู้แจ้ง, สถานที่..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              ล้าง
            </button>
          )}
        </div>

        {/* Status Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition border ${
              selectedStatus === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            ทั้งหมด ({counts.all})
          </button>

          <button
            onClick={() => setSelectedStatus('pending')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition border ${
              selectedStatus === 'pending'
                ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
            }`}
          >
            รอดำเนินการ ({counts.pending})
          </button>

          <button
            onClick={() => setSelectedStatus('in_progress')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition border ${
              selectedStatus === 'in_progress'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            กำลังซ่อม ({counts.in_progress})
          </button>

          <button
            onClick={() => setSelectedStatus('waiting_parts')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition border ${
              selectedStatus === 'waiting_parts'
                ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
            }`}
          >
            รออะไหล่ ({counts.waiting_parts})
          </button>

          <button
            onClick={() => setSelectedStatus('completed')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition border ${
              selectedStatus === 'completed'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            เสร็จสิ้น ({counts.completed})
          </button>
        </div>

        {/* Secondary Category Filters */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[11px]">หมวดหมู่:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 text-xs"
            >
              <option value="all">ทั้งหมด (เครื่องจักร & โครงสร้าง)</option>
              <option value="machine">เฉพาะ เครื่องจักร</option>
              <option value="infrastructure">เฉพาะ โครงสร้างพื้นฐาน</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[11px]">ความเร่งด่วน:</span>
            <select
              value={selectedUrgency}
              onChange={(e) => setSelectedUrgency(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 text-xs"
            >
              <option value="all">ทุกระดับ</option>
              <option value="emergency">🚨 ฉุกเฉิน</option>
              <option value="high">⚠️ ด่วนมาก</option>
              <option value="normal">🟡 ปกติ</option>
              <option value="low">🟢 ตามรอบ</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {filteredTickets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500 space-y-3">
            <AlertCircle className="w-10 h-10 mx-auto text-slate-300" />
            <div className="font-semibold text-slate-700 text-sm">ไม่พบรายการใบแจ้งซ่อมตามเงื่อนไข</div>
            <p className="text-xs text-slate-400">ลองเปลี่ยนคำค้นหา หรือกดปุ่มแจ้งปัญหาใหม่</p>
            <button
              onClick={onNewTicket}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
            >
              + แจ้งปัญหาหน้างานใหม่
            </button>
          </div>
        ) : (
          filteredTickets.map((ticket) => {
            const urgency = getUrgencyInfo(ticket.urgency);
            const statusColor = getStatusColor(ticket.status);
            const latestLog = ticket.progressLogs && ticket.progressLogs.length > 0
              ? ticket.progressLogs[ticket.progressLogs.length - 1]
              : null;

            return (
              <div
                key={ticket.id}
                onClick={() => onSelectTicket(ticket)}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-blue-400 hover:shadow-md transition-all p-4 sm:p-5 cursor-pointer relative group"
              >
                {/* Top Row: Ticket No, Category, Urgency, Status */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                      {ticket.ticketNo}
                    </span>
                    <span className="text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 font-medium">
                      {ticket.category === 'machine' ? '⚙️ เครื่องจักร' : '🏢 โครงสร้างพื้นฐาน'}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${urgency.color}`}>
                      {urgency.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>
                      {ticket.status === 'in_progress' && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
                      )}
                      {getStatusText(ticket.status)}
                    </span>
                  </div>
                </div>

                {/* Main Machine / Asset & Problem */}
                {(() => {
                  const mach = machines.find((m) => m.code === ticket.machineNo);
                  const runningNoStr = mach?.no ? String(mach.no).padStart(2, '0') : null;
                  const tag = mach?.tagCode || (runningNoStr ? `BS-${runningNoStr}` : null);

                  return (
                    <div className="mb-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {runningNoStr && (
                            <span className="font-mono font-bold text-[11px] bg-slate-900 text-white px-1.5 py-0.5 rounded shadow-2xs">
                              #{runningNoStr}
                            </span>
                          )}
                          {tag && (
                            <span className="font-mono font-black text-xs bg-blue-600 text-white px-2 py-0.5 rounded shadow-2xs">
                              {tag}
                            </span>
                          )}
                          <span className="font-mono font-bold text-sm sm:text-base text-slate-900">
                            {ticket.machineNo}
                          </span>
                          {mach?.name && (
                            <span className="text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                              {mach.name}
                            </span>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition shrink-0" />
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 mt-1.5 leading-relaxed">
                        {ticket.problemDescription}
                      </p>
                    </div>
                  );
                })()}

                {/* Latest Real-time Progress Log Banner */}
                {latestLog && (
                  <div className="mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-xs flex items-start gap-2">
                    <div className="p-1 bg-blue-100 text-blue-700 rounded-md shrink-0 mt-0.5">
                      <Activity className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-0.5">
                        <span className="font-semibold text-slate-700">อัปเดตล่าสุด: {latestLog.author}</span>
                        <span className="font-mono">{latestLog.timestamp}</span>
                      </div>
                      <div className="text-slate-800 font-medium truncate">
                        {latestLog.action}
                      </div>
                      {latestLog.notes && (
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {latestLog.notes}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Bottom Row: Location, Requester, Time, Print Action */}
                <div className="flex flex-wrap items-center justify-between pt-2.5 border-t border-slate-100 text-xs text-slate-500 gap-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{ticket.location}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{ticket.requesterName} ({ticket.department})</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPrintTicket(ticket);
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition flex items-center gap-1 cursor-pointer"
                      title="บันทึกเป็น PDF / พิมพ์ใบแจ้งซ่อม FM-MN01-03"
                    >
                      <Printer className="w-3 h-3" />
                      <span>บันทึก PDF / พิมพ์</span>
                    </button>
                    <span className="text-blue-600 font-semibold text-xs flex items-center gap-0.5 group-hover:underline">
                      เปิดดู & อัปเดตงาน
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
