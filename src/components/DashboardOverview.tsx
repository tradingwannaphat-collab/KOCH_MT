import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Wrench, 
  Layers, 
  Activity, 
  PieChart, 
  ArrowUpRight,
  TrendingDown,
  Building2,
  Cog,
  FileText
} from 'lucide-react';
import { MaintenanceTicket, RootCauseType, MachineAsset } from '../types/ticket';
import { getStatusText, getStatusColor, getRootCauseText } from '../hooks/useRealtimeTickets';

interface DashboardOverviewProps {
  tickets: MaintenanceTicket[];
  machines?: MachineAsset[];
  onSelectTicket: (ticket: MaintenanceTicket) => void;
  onNewTicket: () => void;
  onPrintTicket?: (ticket: MaintenanceTicket) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  tickets,
  machines = [],
  onSelectTicket,
  onNewTicket,
  onPrintTicket
}) => {
  // Filter status for the quick jobs table
  const [filterStatus, setFilterStatus] = useState<'all' | 'emergency' | 'in_progress' | 'waiting_parts' | 'completed'>('all');

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = tickets.length;
    const pending = tickets.filter((t) => t.status === 'pending').length;
    const inProgress = tickets.filter((t) => t.status === 'in_progress').length;
    const waitingParts = tickets.filter((t) => t.status === 'waiting_parts').length;
    const completed = tickets.filter((t) => ['completed', 'closed'].includes(t.status)).length;
    // CRITICAL: Only count active/open emergency jobs that are NOT yet completed or closed!
    const emergency = tickets.filter((t) => t.urgency === 'emergency' && !['completed', 'closed'].includes(t.status)).length;

    // Categories
    const machineCount = tickets.filter((t) => t.category === 'machine').length;
    const infraCount = tickets.filter((t) => t.category === 'infrastructure').length;

    // Root Cause counts
    const causes: Record<RootCauseType, number> = {
      lack_of_maintenance: 0,
      substandard_parts: 0,
      misuse: 0,
      other: 0
    };
    tickets.forEach((t) => {
      if (t.rootCause && causes[t.rootCause] !== undefined) {
        causes[t.rootCause]++;
      }
    });

    // Department counts
    const departments: Record<string, number> = {};
    tickets.forEach((t) => {
      departments[t.department] = (departments[t.department] || 0) + 1;
    });

    return {
      total,
      pending,
      inProgress,
      waitingParts,
      completed,
      emergency,
      machineCount,
      infraCount,
      causes,
      departments
    };
  }, [tickets]);

  // Filtered tickets based on selected KPI card or tab
  const displayedTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (filterStatus === 'emergency') {
        return t.urgency === 'emergency' && !['completed', 'closed'].includes(t.status);
      }
      if (filterStatus === 'in_progress') {
        return t.status === 'in_progress';
      }
      if (filterStatus === 'waiting_parts') {
        return t.status === 'waiting_parts';
      }
      if (filterStatus === 'completed') {
        return ['completed', 'closed'].includes(t.status);
      }
      return true; // 'all'
    });
  }, [tickets, filterStatus]);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 pb-24 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              แดชบอร์ดซ่อมบำรุงภาพรวม (Maintenance KPI)
            </h1>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              Live Feed
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            สถิติงานซ่อมแซม วิเคราะห์สาเหตุความเสียหายตามแบบฟอร์ม FM-MN01-03
          </p>
        </div>

        <button
          onClick={onNewTicket}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition shrink-0"
        >
          <span>+ สร้างใบแจ้งซ่อม</span>
        </button>
      </div>

      {/* KPI Stat Cards Grid - Clickable to filter jobs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total */}
        <button
          type="button"
          onClick={() => setFilterStatus('all')}
          className={`text-left p-4 rounded-2xl border shadow-2xs transition-all cursor-pointer ${
            filterStatus === 'all'
              ? 'ring-2 ring-blue-500 bg-blue-50/70 border-blue-300 shadow-xs'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">งานทั้งหมด</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
            {metrics.total}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">ใบแจ้งซ่อมในระบบ</div>
        </button>

        {/* Emergency / Line Stop */}
        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'emergency' ? 'all' : 'emergency')}
          className={`text-left p-4 rounded-2xl border shadow-2xs transition-all cursor-pointer ${
            filterStatus === 'emergency'
              ? 'ring-2 ring-rose-500 bg-rose-100/90 border-rose-300 shadow-xs'
              : metrics.emergency > 0
              ? 'bg-rose-50/80 border-rose-200 hover:bg-rose-100/60'
              : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/60'
          }`}
        >
          <div className="flex items-center justify-between text-rose-700 mb-2">
            <span className={`text-xs font-semibold ${metrics.emergency > 0 ? 'text-rose-700' : 'text-slate-600'}`}>
              🚨 ฉุกเฉิน-หยุดไลน์
            </span>
            <AlertTriangle className={`w-4 h-4 ${metrics.emergency > 0 ? 'text-rose-600 animate-bounce' : 'text-slate-400'}`} />
          </div>
          <div className={`text-2xl sm:text-3xl font-extrabold font-mono ${metrics.emergency > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
            {metrics.emergency}
          </div>
          <div className={`text-[11px] mt-1 font-medium ${metrics.emergency > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
            {metrics.emergency > 0 ? `ต้องเข้าตรวจทันที (${metrics.emergency})` : 'ไม่มีงานคั่งค้าง (ปกติ)'}
          </div>
        </button>

        {/* In Progress */}
        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'in_progress' ? 'all' : 'in_progress')}
          className={`text-left p-4 rounded-2xl border shadow-2xs transition-all cursor-pointer ${
            filterStatus === 'in_progress'
              ? 'ring-2 ring-indigo-500 bg-indigo-100/80 border-indigo-300 shadow-xs'
              : metrics.inProgress > 0
              ? 'bg-indigo-50/70 border-indigo-200 hover:bg-indigo-100/50'
              : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/60'
          }`}
        >
          <div className="flex items-center justify-between text-indigo-700 mb-2">
            <span className={`text-xs font-semibold ${metrics.inProgress > 0 ? 'text-indigo-700' : 'text-slate-600'}`}>
              ⚡ กำลังซ่อมแซม
            </span>
            <Wrench className={`w-4 h-4 ${metrics.inProgress > 0 ? 'text-indigo-600' : 'text-slate-400'}`} />
          </div>
          <div className={`text-2xl sm:text-3xl font-extrabold font-mono ${metrics.inProgress > 0 ? 'text-indigo-700' : 'text-slate-700'}`}>
            {metrics.inProgress}
          </div>
          <div className={`text-[11px] mt-1 ${metrics.inProgress > 0 ? 'text-indigo-600 font-medium' : 'text-slate-400'}`}>
            {metrics.inProgress > 0 ? 'ช่างกำลังปฏิบัติงาน' : 'ไม่มีงานค้างซ่อม'}
          </div>
        </button>

        {/* Waiting Parts */}
        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'waiting_parts' ? 'all' : 'waiting_parts')}
          className={`text-left p-4 rounded-2xl border shadow-2xs transition-all cursor-pointer ${
            filterStatus === 'waiting_parts'
              ? 'ring-2 ring-purple-500 bg-purple-100/80 border-purple-300 shadow-xs'
              : metrics.waitingParts > 0
              ? 'bg-purple-50/70 border-purple-200 hover:bg-purple-100/50'
              : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/60'
          }`}
        >
          <div className="flex items-center justify-between text-purple-700 mb-2">
            <span className={`text-xs font-semibold ${metrics.waitingParts > 0 ? 'text-purple-700' : 'text-slate-600'}`}>
              📦 รออะไหล่
            </span>
            <Clock className={`w-4 h-4 ${metrics.waitingParts > 0 ? 'text-purple-600' : 'text-slate-400'}`} />
          </div>
          <div className={`text-2xl sm:text-3xl font-extrabold font-mono ${metrics.waitingParts > 0 ? 'text-purple-700' : 'text-slate-700'}`}>
            {metrics.waitingParts}
          </div>
          <div className={`text-[11px] mt-1 ${metrics.waitingParts > 0 ? 'text-purple-600 font-medium' : 'text-slate-400'}`}>
            {metrics.waitingParts > 0 ? 'รอเบิก/จัดซื้อ' : 'ไม่มีอะไหล่รอเบิก'}
          </div>
        </button>

        {/* Completed */}
        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'completed' ? 'all' : 'completed')}
          className={`text-left p-4 rounded-2xl border shadow-2xs col-span-2 lg:col-span-1 transition-all cursor-pointer ${
            filterStatus === 'completed'
              ? 'ring-2 ring-emerald-500 bg-emerald-100/90 border-emerald-300 shadow-xs'
              : 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100/50'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-semibold">✅ ซ่อมเสร็จ/ปิดงาน</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono">
            {metrics.completed}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 font-medium">
            รวมงานที่ปิดแล้ว ({metrics.completed}) • สำเร็จ {metrics.total > 0 ? Math.round((metrics.completed / metrics.total) * 100) : 0}%
          </div>
        </button>
      </div>

      {/* Analytics Charts & Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Cause Analysis (ตามแบบฟอร์มเอกสาร KOCH) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                วิเคราะห์สาเหตุความเสียหาย (Root Cause Analysis)
              </h3>
              <p className="text-xs text-slate-500">จำแนกตามหัวข้อในใบแจ้งซ่อม FM-MN01-03</p>
            </div>
            <PieChart className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-3.5">
            {[
              { key: 'lack_of_maintenance', label: 'ขาดการบำรุงรักษา', color: 'bg-amber-500' },
              { key: 'substandard_parts', label: 'อะไหล่ไม่มีคุณภาพ', color: 'bg-rose-500' },
              { key: 'misuse', label: 'ใช้งานผิดประเภท', color: 'bg-blue-500' },
              { key: 'other', label: 'อื่นๆ', color: 'bg-slate-400' }
            ].map((item) => {
              const count = metrics.causes[item.key as RootCauseType] || 0;
              const percent = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;

              return (
                <div key={item.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{item.label}</span>
                    <span className="text-slate-500 font-mono">
                      {count} งาน ({percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color} transition-all duration-500`}
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category & Department Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              หมวดหมู่งาน (เครื่องจักร VS โครงสร้างพื้นฐาน)
            </h3>
            <p className="text-xs text-slate-500 mb-3">เปรียบเทียบประเภททรัพย์สินที่แจ้งปัญหา</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg">
                  <Cog className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500">เครื่องจักร</div>
                  <div className="text-xl font-bold text-slate-800 font-mono">{metrics.machineCount} งาน</div>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500">โครงสร้างพื้นฐาน</div>
                  <div className="text-xl font-bold text-slate-800 font-mono">{metrics.infraCount} งาน</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 mb-2">จำแนกตามแผนกที่แจ้ง:</h4>
            <div className="space-y-1.5">
              {Object.entries(metrics.departments).map(([dept, cnt]) => (
                <div key={dept} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50">
                  <span className="text-slate-700 font-medium">{dept}</span>
                  <span className="font-mono font-bold text-blue-600">{cnt} จ็อบ</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Work List & Inspection Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <span>
                {filterStatus === 'completed'
                  ? 'ประวัติงานที่ซ่อมเสร็จสิ้น & ปิดงานแล้ว (Completed / Closed Jobs)'
                  : filterStatus === 'emergency'
                  ? 'รายการงานฉุกเฉิน-หยุดไลน์ (Active Emergency Tickets)'
                  : filterStatus === 'in_progress'
                  ? 'รายการงานที่กำลังซ่อมแซม (In Progress Jobs)'
                  : filterStatus === 'waiting_parts'
                  ? 'รายการงานที่รออะไหล่ (Waiting Parts)'
                  : 'รายการงานซ่อมบำรุงหน้างาน (Maintenance Jobs)'}
              </span>
              {filterStatus !== 'completed' && metrics.inProgress > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              คลิกที่บัตรเพื่อดูขั้นตอนการแก้ไข, การอัปเดตของช่าง, ลายเซ็น 3 ฝ่าย หรือพิมพ์แบบฟอร์ม FM-MN01-03
            </p>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition border ${
                filterStatus === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              ทั้งหมด ({metrics.total})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('in_progress')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition border ${
                filterStatus === 'in_progress'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
              }`}
            >
              ⚡ ซ่อมอยู่ ({metrics.inProgress})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('emergency')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition border ${
                filterStatus === 'emergency'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              }`}
            >
              🚨 ฉุกเฉิน ({metrics.emergency})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('waiting_parts')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition border ${
                filterStatus === 'waiting_parts'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                  : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
              }`}
            >
              📦 รออะไหล่ ({metrics.waitingParts})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('completed')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition border ${
                filterStatus === 'completed'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              ✅ ซ่อมเสร็จ/ปิดงาน ({metrics.completed})
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {displayedTickets.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
              <div className="font-semibold text-slate-700">
                {filterStatus === 'emergency'
                  ? '✓ ไม่มีงานฉุกเฉินคั่งค้าง ทุกเครื่องจักรทำงานปกติในโรงงานบางแสน BS!'
                  : filterStatus === 'completed'
                  ? 'ยังไม่มีงานที่บันทึกปิดงาน'
                  : 'ไม่พบรายการงานตามสถานะที่เลือก'}
              </div>
              <p className="text-[11px] text-slate-400">
                {filterStatus !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setFilterStatus('all')}
                    className="text-blue-600 underline font-medium hover:text-blue-700"
                  >
                    คลิกเพื่อดูงานทั้งหมด ({metrics.total} งาน)
                  </button>
                )}
              </p>
            </div>
          ) : (
            displayedTickets.map((ticket) => {
              const statusColor = getStatusColor(ticket.status);
              const isDone = ['completed', 'closed'].includes(ticket.status);
              const latestLog = ticket.progressLogs && ticket.progressLogs.length > 0 
                ? ticket.progressLogs[ticket.progressLogs.length - 1] 
                : null;

              // Find matching machine photo
              const matchedMachine = machines.find(
                (m) => m.code === ticket.machineNo || m.tagCode === ticket.machineNo || m.name === ticket.machineNo
              );

              return (
                <div
                  key={ticket.id}
                  onClick={() => onSelectTicket(ticket)}
                  className={`p-4 rounded-2xl border transition cursor-pointer space-y-3 ${
                    isDone 
                      ? 'bg-emerald-50/30 border-emerald-200 hover:border-emerald-400 hover:shadow-xs' 
                      : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Machine Photo thumbnail if available */}
                      {matchedMachine?.imageUrl ? (
                        <img
                          src={matchedMachine.imageUrl}
                          alt={matchedMachine.name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                          <Cog className="w-6 h-6 text-slate-300" />
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded">
                            {ticket.ticketNo}
                          </span>
                          <strong className="text-sm font-bold text-slate-900">{ticket.machineNo}</strong>
                          <span className="text-xs text-slate-500 font-medium">({ticket.location})</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>
                            {getStatusText(ticket.status)}
                          </span>
                          {ticket.urgency === 'emergency' && !isDone && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                              🚨 งานด่วน
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          ผู้แจ้ง: {ticket.requesterName} ({ticket.department}) • แจ้งเมื่อ {ticket.requestDate} {ticket.requestTime} น.
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {onPrintTicket && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPrintTicket(ticket);
                          }}
                          className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1 shadow-2xs transition"
                          title="พิมพ์แบบฟอร์ม FM-MN01-03"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          <span>พิมพ์เอกสาร</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl border flex items-center gap-1 transition ${
                          isDone
                            ? 'text-emerald-700 bg-emerald-100 border-emerald-300 hover:bg-emerald-200'
                            : 'text-blue-600 hover:text-blue-700 bg-blue-50 border-blue-200'
                        }`}
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>{isDone ? 'ดูรายงานปิดงาน' : 'อัปเดตงาน & บันทึกช่าง'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Problem Description */}
                  <div className="text-xs text-slate-700 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-800">อาการปัญหา: </span>
                      <span>{ticket.problemDescription}</span>
                    </div>
                  </div>

                  {/* If Completed / Closed: Handover Success Card */}
                  {isDone && (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-emerald-900 font-bold">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span>การส่งมอบเครื่องจักร: ซ่อมเสร็จสมบูรณ์ พร้อมใช้งาน 100%</span>
                        </span>
                        <span className="text-[11px] font-mono text-emerald-700">
                          เสร็จเมื่อ: {ticket.endDate || ticket.requestDate} {ticket.endTime || ''} น.
                        </span>
                      </div>
                      {ticket.testRunResult && (
                        <div className="text-emerald-800 text-[11px]">
                          <strong>ผลการทดสอบเดินเครื่อง (Trial Run):</strong> {ticket.testRunResult}
                        </div>
                      )}
                      {ticket.technicians && ticket.technicians.filter(Boolean).length > 0 && (
                        <div className="text-[11px] text-slate-600">
                          <strong>ช่างผู้ดำเนินการ:</strong> {ticket.technicians.filter(Boolean).join(', ')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Latest Maintenance Update / Corrective Action Step */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-0.5">
                    {/* Latest Progress Update */}
                    <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100">
                      <div className="text-[11px] font-bold text-blue-900 flex items-center justify-between mb-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-blue-600" />
                          <span>การอัพเดทล่าสุดของทีมซ่อมบำรุง:</span>
                        </span>
                        {latestLog?.timestamp && (
                          <span className="font-mono text-[10px] text-slate-400">{latestLog.timestamp}</span>
                        )}
                      </div>
                      {latestLog ? (
                        <div className="text-slate-700">
                          <strong>{latestLog.action}</strong>
                          {latestLog.notes && <div className="text-[11px] text-slate-500 mt-0.5">{latestLog.notes}</div>}
                          <div className="text-[10px] text-slate-400 mt-0.5">โดย {latestLog.author} ({latestLog.role})</div>
                        </div>
                      ) : (
                        <div className="text-slate-400 italic text-[11px]">
                          ยังไม่มีการอัปเดตจากช่าง (คลิกเพื่อบันทึกรับงาน)
                        </div>
                      )}
                    </div>

                    {/* Corrective Action Steps */}
                    <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                      <div className="text-[11px] font-bold text-emerald-900 flex items-center justify-between mb-1">
                        <span className="flex items-center gap-1">
                          <Wrench className="w-3 h-3 text-emerald-600" />
                          <span>ขั้นตอนการแก้ไข (Corrective Steps):</span>
                        </span>
                        {ticket.spareParts && ticket.spareParts.length > 0 && (
                          <span className="text-[10px] text-emerald-700 font-bold">
                            อะไหล่ {ticket.spareParts.length} ชิ้น
                          </span>
                        )}
                      </div>
                      {ticket.correctiveSteps || ticket.repairDetails ? (
                        <div className="text-slate-700 truncate max-w-sm">
                          {ticket.correctiveSteps || ticket.repairDetails}
                        </div>
                      ) : ticket.troubleshootingSteps ? (
                        <div className="text-slate-700 truncate max-w-sm">
                          {ticket.troubleshootingSteps}
                        </div>
                      ) : (
                        <div className="text-slate-400 italic text-[11px]">
                          ยังไม่ได้ระบุขั้นตอนการแก้ไข (คลิกเพื่อลงบันทึก)
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
};
