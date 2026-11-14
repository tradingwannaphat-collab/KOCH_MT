import React, { useState, useMemo, useRef } from 'react';
import { 
  Calendar, 
  Wrench, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  AlertCircle, 
  Search, 
  Filter, 
  Printer, 
  Download, 
  Plus, 
  Edit3, 
  X, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  TrendingUp, 
  Layers, 
  Package, 
  User, 
  ShieldCheck, 
  FileSpreadsheet, 
  Activity, 
  Loader2, 
  RotateCcw,
  Sliders,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { MachineAnnualPMPlan, PMMonthRecord, PMTaskStatus, PMFrequency, PMTaskItem, PMReplacedPart } from '../types/pm';
import { MachineAsset } from '../types/ticket';
import { SparePartItemMaster } from '../types/sparePart';
import { THAI_MONTH_NAMES, THAI_MONTH_SHORT, STANDARD_PM_TASKS } from '../data/initialPMPlans';
import { KochLogo } from './KochLogo';
import { exportElementToPdf, printElementOnly } from '../utils/pdfExport';

interface AnnualPMPlanManagerProps {
  machines: MachineAsset[];
  pmPlans: MachineAnnualPMPlan[];
  selectedYear: number;
  onSelectYear: (year: number) => void;
  onRecordActualPM: (planId: string, month: number, payload: Partial<PMMonthRecord>) => Promise<any>;
  onUpdatePlan: (planId: string, updates: Partial<MachineAnnualPMPlan>) => Promise<any>;
  spareParts?: SparePartItemMaster[];
  onOpenReportTicket?: (machine: MachineAsset, notes?: string) => void;
  onViewMachineHistory?: (machine: MachineAsset) => void;
}

export const AnnualPMPlanManager: React.FC<AnnualPMPlanManagerProps> = ({
  machines,
  pmPlans,
  selectedYear,
  onSelectYear,
  onRecordActualPM,
  onUpdatePlan,
  spareParts = [],
  onOpenReportTicket,
  onViewMachineHistory
}) => {
  // Navigation & View Mode: 'matrix' (Annual Plan vs Act Grid) | 'monthly' (Cards by Month) | 'printable' (A4 Landscape)
  const [activeViewMode, setActiveViewMode] = useState<'matrix' | 'monthly' | 'printable'>('matrix');
  const [selectedMonthForView, setSelectedMonthForView] = useState<number>(11); // Default November
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'machine' | 'infrastructure' | 'office'>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'delayed' | 'completed' | 'in_progress'>('all');

  // Modal State for editing a specific month's Plan & Actual execution
  const [editingModal, setEditingModal] = useState<{
    plan: MachineAnnualPMPlan;
    month: number;
    record: PMMonthRecord;
  } | null>(null);

  // Form state inside modal
  const [formIsPlanned, setFormIsPlanned] = useState<boolean>(true);
  const [formPlannedWeek, setFormPlannedWeek] = useState<number>(1);
  const [formPlannedDate, setFormPlannedDate] = useState<string>('');
  const [formPlannedScope, setFormPlannedScope] = useState<string>('');
  const [formStatus, setFormStatus] = useState<PMTaskStatus>('completed');
  const [formActualDate, setFormActualDate] = useState<string>('');
  const [formTechLead, setFormTechLead] = useState<string>('นายประสิทธิ์ วิศวกร');
  const [formTechAssistant, setFormTechAssistant] = useState<string>('นายเปา (ช่างไฟฟ้า)');
  const [formSupervisor, setFormSupervisor] = useState<string>('นายเกียรติศักดิ์ พ. (ผจก.ซ่อมบำรุง)');
  const [formDurationHours, setFormDurationHours] = useState<string>('2.0');
  const [formFindings, setFormFindings] = useState<string>('');
  const [formCorrectiveAction, setFormCorrectiveAction] = useState<string>('');
  const [formTasks, setFormTasks] = useState<PMTaskItem[]>([]);
  const [formReplacedParts, setFormReplacedParts] = useState<PMReplacedPart[]>([]);
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Print PDF ref
  const printSheetRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Available Thai years (เหลือเฉพาะปี 2569 และ 2570 ตามคำสั่ง)
  const availableYears = [
    { year: 2026, thaiYear: 2569, label: 'ปี 2569 (2026)' },
    { year: 2027, thaiYear: 2570, label: 'ปี 2570 (2027)' }
  ];

  // Ensure selected year is restricted to 2026 (2569) or 2027 (2570)
  React.useEffect(() => {
    if (selectedYear !== 2026 && selectedYear !== 2027) {
      onSelectYear(2026);
    }
  }, [selectedYear, onSelectYear]);

  // Open modal to view/edit Plan vs Act for a machine on a month
  const openEditModal = (plan: MachineAnnualPMPlan, month: number) => {
    const record = plan.months[month] || {
      month,
      monthLabel: THAI_MONTH_SHORT[month - 1],
      isPlanned: true,
      status: 'planned'
    };

    setEditingModal({ plan, month, record });
    setFormIsPlanned(record.isPlanned);
    setFormPlannedWeek(record.plannedWeek || 1);
    setFormPlannedDate(record.plannedDate || `${selectedYear}-${String(month).padStart(2, '0')}-15`);
    setFormPlannedScope(record.plannedScope || 'PM ประจำเดือน (1M Routine)');
    setFormStatus(record.status || (record.isPlanned ? 'completed' : 'unplanned'));
    setFormActualDate(record.actualDate || new Date().toISOString().split('T')[0]);
    setFormTechLead(record.actualTechnicians?.[0] || 'นายประสิทธิ์ วิศวกร');
    setFormTechAssistant(record.actualTechnicians?.[1] || 'นายเปา (ช่างไฟฟ้า)');
    setFormSupervisor(record.supervisorName || 'นายเกียรติศักดิ์ พ.');
    setFormDurationHours(record.durationHours ? String(record.durationHours) : '2.0');
    setFormFindings(record.findings || 'ตรวจเช็คตามเกณฑ์มาตรฐาน ระบบทำงานปกติ ไม่พบการชำรุดรุนแรง');
    setFormCorrectiveAction(record.correctiveAction || 'อัดจาระบีลูกปืน ตรวจความตึงสายพาน และทำความสะอาดตู้คอนโทรล');
    setFormTasks(
      record.tasks && record.tasks.length > 0
        ? JSON.parse(JSON.stringify(record.tasks))
        : [
            ...STANDARD_PM_TASKS.mechanical,
            ...STANDARD_PM_TASKS.lubrication,
            ...STANDARD_PM_TASKS.electrical,
            ...STANDARD_PM_TASKS.pneumatic,
            ...STANDARD_PM_TASKS.safety
          ]
    );
    setFormReplacedParts(record.replacedParts ? JSON.parse(JSON.stringify(record.replacedParts)) : []);
    setSaveSuccessMsg(null);
  };

  // Handle save in modal
  const handleSaveModal = async () => {
    if (!editingModal) return;
    try {
      setIsSavingRecord(true);
      const actualTechs = [formTechLead, formTechAssistant].filter(Boolean);
      const payload: Partial<PMMonthRecord> = {
        isPlanned: formIsPlanned,
        plannedWeek: formPlannedWeek,
        plannedDate: formPlannedDate,
        plannedScope: formPlannedScope,
        status: formIsPlanned ? formStatus : 'unplanned',
        actualDate: formStatus === 'completed' || formStatus === 'delayed' ? formActualDate : undefined,
        actualTechnicians: actualTechs,
        supervisorName: formSupervisor,
        durationHours: parseFloat(formDurationHours) || 0,
        findings: formFindings,
        correctiveAction: formCorrectiveAction,
        tasks: formTasks,
        replacedParts: formReplacedParts
      };

      await onRecordActualPM(editingModal.plan.id, editingModal.month, payload);
      setSaveSuccessMsg('บันทึกแผนและผลการซ่อมจริง (Plan vs Act) สำเร็จเรียบร้อย');
      setTimeout(() => {
        setSaveSuccessMsg(null);
        setEditingModal(null);
      }, 1000);
    } catch (e) {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSavingRecord(false);
    }
  };

  // Add spare part to replaced list
  const handleAddPartToRecord = (part: SparePartItemMaster) => {
    setFormReplacedParts((prev) => [
      ...prev,
      {
        partId: part.id,
        partName: part.name,
        partNo: part.partNo,
        quantity: 1,
        unit: part.unit || 'ชิ้น'
      }
    ]);
  };

  // Remove spare part
  const handleRemovePartFromRecord = (index: number) => {
    setFormReplacedParts((prev) => prev.filter((_, i) => i !== index));
  };

  // Toggle task status in modal checklist
  const handleToggleTaskStatus = (taskId: string) => {
    setFormTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const nextStatus = t.status === 'pass' ? 'replaced' : t.status === 'replaced' ? 'abnormal' : 'pass';
          return { ...t, status: nextStatus };
        }
        return t;
      })
    );
  };

  // Statistics calculation across all 33 machines for the selected year
  const stats = useMemo(() => {
    let totalPlanned = 0;
    let totalCompleted = 0;
    let totalDelayed = 0;
    let totalInProgress = 0;
    let totalUpcoming = 0;
    let totalDowntime = 0;

    pmPlans.forEach((plan) => {
      for (let m = 1; m <= 12; m++) {
        const rec = plan.months[m];
        if (rec && rec.isPlanned) {
          totalPlanned++;
          if (rec.status === 'completed') {
            totalCompleted++;
            if (rec.durationHours) totalDowntime += rec.durationHours;
          } else if (rec.status === 'delayed') {
            totalDelayed++;
            if (rec.durationHours) totalDowntime += rec.durationHours;
          } else if (rec.status === 'in_progress') {
            totalInProgress++;
          } else {
            totalUpcoming++;
          }
        }
      }
    });

    const achievementRate = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 1000) / 10 : 0;
    const onTimeRate = (totalCompleted + totalDelayed) > 0 
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
      totalDowntime: Math.round(totalDowntime * 10) / 10
    };
  }, [pmPlans]);

  // Filtered plans
  const filteredPlans = useMemo(() => {
    return pmPlans.filter((plan) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        plan.machineTag.toLowerCase().includes(q) ||
        plan.machineCode.toLowerCase().includes(q) ||
        plan.machineName.toLowerCase().includes(q) ||
        plan.processName.toLowerCase().includes(q);

      const matchCategory = selectedCategory === 'all' || plan.category === selectedCategory;

      let matchStatus = true;
      if (selectedStatusFilter === 'delayed') {
        matchStatus = Object.values(plan.months).some((m) => m.isPlanned && m.status === 'delayed');
      } else if (selectedStatusFilter === 'completed') {
        matchStatus = Object.values(plan.months).some((m) => m.isPlanned && m.status === 'completed');
      } else if (selectedStatusFilter === 'in_progress') {
        matchStatus = Object.values(plan.months).some((m) => m.isPlanned && m.status === 'in_progress');
      }

      return matchQuery && matchCategory && matchStatus;
    });
  }, [pmPlans, searchQuery, selectedCategory, selectedStatusFilter]);

  // Export PDF (1 Page A4 Landscape)
  const handleExportPdf = async () => {
    if (!printSheetRef.current) return;
    try {
      setIsExportingPdf(true);
      await exportElementToPdf(
        printSheetRef.current,
        `KOCH_Annual_PM_Plan_${selectedYear}_FM_MN01_02.pdf`,
        { orientation: 'landscape', fitToOnePage: true, marginMm: 5 }
      );
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการดาวน์โหลดเอกสาร PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Helper for status badge styling
  const getActBadge = (record: PMMonthRecord | undefined) => {
    if (!record || !record.isPlanned) {
      return (
        <span className="text-[10px] text-slate-300 font-mono">-</span>
      );
    }

    switch (record.status) {
      case 'completed':
        return (
          <span 
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs cursor-pointer hover:bg-emerald-200"
            title={`ซ่อมจริงสำเร็จ: ${record.actualDate || ''} โดย ${record.actualTechnicians?.join(', ') || 'ทีมช่าง'} (${record.durationHours || 2} ชม.)`}
          >
            <Check className="w-3 h-3 text-emerald-700" />
            <span>DONE</span>
          </span>
        );
      case 'in_progress':
        return (
          <span 
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse cursor-pointer hover:bg-amber-200"
            title="กำลังดำเนินการซ่อมบำรุงในสัปดาห์นี้"
          >
            <Clock className="w-3 h-3 text-amber-700" />
            <span>PROG</span>
          </span>
        );
      case 'delayed':
        return (
          <span 
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 cursor-pointer hover:bg-rose-200"
            title="หลุดแผน / ล่าช้ากว่ากำหนดเดิม"
          >
            <AlertTriangle className="w-3 h-3 text-rose-700" />
            <span>DELAY</span>
          </span>
        );
      case 'planned':
      default:
        return (
          <span 
            className="inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 cursor-pointer hover:bg-slate-200"
            title={`มีแผนกำหนดการ: สัปดาห์ ${record.plannedWeek || 1} (${record.plannedScope || ''})`}
          >
            PLAN
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 pb-28 space-y-6 print:max-w-none print:p-0 print:m-0 print:space-y-0">
      
      {/* Top Banner: Master Annual PM Schedule (FM-MN01-02) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-indigo-500/20 relative overflow-hidden print:hidden no-print">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-3 py-0.5 rounded-full text-xs font-mono font-bold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                ANNUAL PREVENTIVE MAINTENANCE (PM)
              </span>
              <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 px-3 py-0.5 rounded-full text-xs font-mono font-bold">
                FM-MN01-02 Rev.00
              </span>
              <span className="text-xs text-slate-300">
                โรงงานบางแสน BS (33 เครื่อง)
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>แผน PM ประจำปี • แผนการซ่อม (Plan) VS การซ่อมจริง (Act.)</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              ตารางกำหนดการบำรุงรักษาเชิงป้องกันประจำปี 12 เดือน ติดตามผลการซ่อมจริง (Actual Execution) เปรียบเทียบกับแผน (Plan) 
              พร้อมบันทึกรายการอะไหล่ที่เปลี่ยน ชั่วโมง Downtime และความสำเร็จตามมาตรฐาน TPM & ISO 9001:2015
            </p>
          </div>

          {/* Action buttons & Year Selector */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Year Switcher */}
            <div className="bg-slate-800/90 p-1 rounded-2xl border border-slate-700 flex items-center gap-1">
              {availableYears.map((y) => (
                <button
                  key={y.year}
                  type="button"
                  onClick={() => onSelectYear(y.year)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    selectedYear === y.year
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  {y.label}
                </button>
              ))}
            </div>

            {/* Direct PDF Download button */}
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer border border-emerald-400/30"
              title="ดาวน์โหลดเอกสารแผน PM ประจำปีฉบับทางการ A4 แนวนอน (FM-MN01-02)"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังสร้าง PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>บันทึกเป็น PDF (FM-MN01-02)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Plan vs Act KPI Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-800">
          <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-[11px] text-slate-400 font-medium">แผนการซ่อมทั้งปี (Plan)</div>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5">
              {stats.totalPlanned} <span className="text-xs font-normal text-slate-400">รอบ</span>
            </div>
          </div>

          <div className="bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-800/40">
            <div className="text-[11px] text-emerald-300 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>ซ่อมจริงสำเร็จ (Act. Done)</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5">
              {stats.totalCompleted} <span className="text-xs font-normal text-emerald-300/80">รอบ</span>
            </div>
          </div>

          <div className="bg-amber-950/40 p-3.5 rounded-2xl border border-amber-800/40">
            <div className="text-[11px] text-amber-300 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>กำลังทำ / สัปดาห์นี้</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-400 mt-0.5">
              {stats.totalInProgress} <span className="text-xs font-normal text-amber-300/80">รอบ</span>
            </div>
          </div>

          <div className="bg-rose-950/40 p-3.5 rounded-2xl border border-rose-800/40">
            <div className="text-[11px] text-rose-300 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span>ล่าช้า / หลุดแผน</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-400 mt-0.5">
              {stats.totalDelayed} <span className="text-xs font-normal text-rose-300/80">รอบ</span>
            </div>
          </div>

          <div className="bg-indigo-950/40 p-3.5 rounded-2xl border border-indigo-800/40">
            <div className="text-[11px] text-indigo-300 font-medium">ความสำเร็จตามแผน (KPI)</div>
            <div className="text-xl sm:text-2xl font-black text-indigo-300 mt-0.5 flex items-center gap-1">
              <span>{stats.achievementRate}%</span>
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </div>
          </div>

          <div className="bg-blue-950/40 p-3.5 rounded-2xl border border-blue-800/40">
            <div className="text-[11px] text-blue-300 font-medium">รวมชั่วโมงซ่อม PM</div>
            <div className="text-xl sm:text-2xl font-black text-blue-300 mt-0.5">
              {stats.totalDowntime} <span className="text-xs font-normal text-blue-300/80">ชม.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation & View Mode Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2 print:hidden no-print">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs sm:text-sm font-semibold">
          <button
            type="button"
            onClick={() => setActiveViewMode('matrix')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition cursor-pointer ${
              activeViewMode === 'matrix'
                ? 'bg-white text-indigo-700 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ตารางแผนทั้งปี (Plan vs Act Matrix)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewMode('monthly')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition cursor-pointer ${
              activeViewMode === 'monthly'
                ? 'bg-white text-indigo-700 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>งาน PM ประจำเดือน (Monthly Execution)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewMode('printable')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition cursor-pointer ${
              activeViewMode === 'printable'
                ? 'bg-white text-indigo-700 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Printer className="w-4 h-4 text-emerald-600" />
            <span>หน้าพิมพ์แบบฟอร์ม FM-MN01-02 (A4 แนวนอน)</span>
          </button>
        </div>

        {/* Legend for P and A */}
        <div className="flex items-center gap-2 text-xs text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="font-bold text-slate-800">สัญลักษณ์:</span>
          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono font-bold border border-blue-200">P = Plan (แผน)</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono font-bold border border-emerald-200">A = Act (ซ่อมจริง)</span>
          <span className="flex items-center gap-1 font-semibold text-emerald-700"><Check className="w-3 h-3" /> เสร็จสมบูรณ์</span>
          <span className="flex items-center gap-1 font-semibold text-rose-700"><AlertTriangle className="w-3 h-3" /> หลุดแผน</span>
        </div>
      </div>

      {/* VIEW 1: ANNUAL PLAN VS ACT MATRIX GRID */}
      {activeViewMode === 'matrix' && (
        <div className="space-y-4 print:hidden no-print">
          
          {/* Filter & Search Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อเครื่อง, แท็ก เช่น BS-01, Slot, Cutting, ปั๊มลม..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Category Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                {(['all', 'machine', 'office', 'infrastructure'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-white text-slate-900 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat === 'all' ? 'ทุกประเภท' : cat === 'machine' ? 'ฝ่ายผลิต' : cat === 'office' ? 'Office' : 'สาธารณูปโภค'}
                  </button>
                ))}
              </div>

              {/* Status filter */}
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                className="p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
              >
                <option value="all">สถานะทั้งหมด</option>
                <option value="delayed">⚠️ เฉพาะที่มีงานหลุดแผน (Delayed)</option>
                <option value="in_progress">⚡ เฉพาะกำลังดำเนินการ (In Progress)</option>
                <option value="completed">✅ เฉพาะที่ทำเสร็จแล้ว (Completed)</option>
              </select>
            </div>
          </div>

          {/* Master Matrix Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs min-w-[1100px]">
                <thead>
                  <tr className="bg-slate-900 text-white border-b border-slate-800">
                    <th className="py-3 px-3 text-center w-14 font-bold">แท็ก</th>
                    <th className="py-3 px-3 font-bold w-48">เครื่องจักร & กระบวนการ</th>
                    <th className="py-3 px-2 text-center w-20 font-bold">รอบความถี่</th>
                    <th className="py-3 px-1 text-center w-8 font-bold">เกณฑ์</th>
                    {THAI_MONTH_SHORT.map((mName, idx) => (
                      <th key={idx} className="py-3 px-1.5 text-center font-bold border-l border-slate-800">
                        <div className="font-mono text-[11px]">{mName}</div>
                        <div className="text-[9px] text-slate-400 font-normal">M{idx + 1}</div>
                      </th>
                    ))}
                    <th className="py-3 px-3 text-center font-bold w-24 border-l border-slate-800">สำเร็จ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPlans.map((plan) => {
                    // Count plan vs act for this machine
                    let plannedCount = 0;
                    let completedCount = 0;
                    for (let m = 1; m <= 12; m++) {
                      const rec = plan.months[m];
                      if (rec && rec.isPlanned) {
                        plannedCount++;
                        if (rec.status === 'completed' || rec.status === 'delayed') completedCount++;
                      }
                    }

                    return (
                      <tr key={plan.id} className="hover:bg-blue-50/40 transition-colors">
                        
                        {/* Tag */}
                        <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900">
                          <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                            {plan.machineTag}
                          </span>
                        </td>

                        {/* Machine Name & Process */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{plan.machineName}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {plan.machineCode} • {plan.processName}
                          </div>
                        </td>

                        {/* Default Frequency */}
                        <td className="py-2.5 px-2 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                            plan.defaultFrequency === '1M' ? 'bg-blue-100 text-blue-800' :
                            plan.defaultFrequency === '3M' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {plan.defaultFrequency}
                          </span>
                        </td>

                        {/* Row indicator for P vs A */}
                        <td className="py-2 px-1 text-center font-mono text-[10px] font-bold text-slate-400">
                          <div className="text-blue-600">P</div>
                          <div className="text-emerald-700 mt-1">A</div>
                        </td>

                        {/* 12 Months Cells */}
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((mNum) => {
                          const record = plan.months[mNum];
                          const isPlanned = record?.isPlanned;

                          return (
                            <td 
                              key={mNum} 
                              onClick={() => openEditModal(plan, mNum)}
                              className={`py-2 px-1.5 text-center border-l border-slate-100 cursor-pointer transition group ${
                                isPlanned ? 'hover:bg-indigo-100/60' : 'hover:bg-slate-100'
                              }`}
                              title={isPlanned ? `คลิกเพื่อดูหรือบันทึกผล PM เดือน ${mNum} ของ ${plan.machineTag}` : `คลิกเพื่อเพิ่มแผน PM เดือน ${mNum}`}
                            >
                              {/* Plan row */}
                              <div className="text-[10px] font-mono leading-none">
                                {isPlanned ? (
                                  <span className="font-bold text-blue-700 bg-blue-50/90 px-1 rounded border border-blue-200">
                                    W{record?.plannedWeek || 1}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </div>

                              {/* Act. row */}
                              <div className="mt-1 leading-none">
                                {getActBadge(record)}
                              </div>
                            </td>
                          );
                        })}

                        {/* Machine Completion Ratio */}
                        <td className="py-2.5 px-3 text-center border-l border-slate-100 font-mono font-bold">
                          <div className="text-xs text-slate-800">
                            {completedCount}/{plannedCount}
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                            <div 
                              className="bg-emerald-500 h-full rounded-full transition-all"
                              style={{ width: `${plannedCount > 0 ? (completedCount / plannedCount) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: MONTHLY OPERATIONAL VIEW (CARDS BY MONTH) */}
      {activeViewMode === 'monthly' && (
        <div className="space-y-4 print:hidden no-print">
          
          {/* Month Navigator Header */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">เลือกเดือนที่ต้องการดูงาน PM:</span>
            </div>

            {/* 12 Month Selector Buttons */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
              {THAI_MONTH_SHORT.map((mName, idx) => {
                const mNum = idx + 1;
                return (
                  <button
                    key={mNum}
                    type="button"
                    onClick={() => setSelectedMonthForView(mNum)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      selectedMonthForView === mNum
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{mName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Monthly Machine Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlans.map((plan) => {
              const record = plan.months[selectedMonthForView];
              const isPlanned = record?.isPlanned;

              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-3xl border transition-all p-5 shadow-2xs space-y-4 ${
                    isPlanned
                      ? record?.status === 'completed'
                        ? 'border-emerald-200 hover:border-emerald-400'
                        : record?.status === 'delayed'
                        ? 'border-rose-200 hover:border-rose-400'
                        : 'border-blue-200 hover:border-blue-400'
                      : 'border-slate-200 opacity-60'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black px-2.5 py-1 bg-slate-900 text-white rounded-xl shadow-2xs">
                        {plan.machineTag}
                      </span>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 leading-tight">{plan.machineName}</h3>
                        <span className="text-[10px] text-slate-500 font-mono">{plan.machineCode}</span>
                      </div>
                    </div>

                    <div>
                      {getActBadge(record)}
                    </div>
                  </div>

                  {/* Plan vs Act Details */}
                  {isPlanned ? (
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="font-medium text-[11px]">แผนที่วางไว้ (Plan):</span>
                        <span className="font-mono font-bold text-blue-700">สัปดาห์ที่ {record.plannedWeek || 1} ({record.plannedDate || '-'})</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="font-medium text-[11px]">การซ่อมจริง (Act.):</span>
                        <span className="font-mono font-bold text-slate-800">{record.actualDate || 'ยังไม่ได้ระบุ'}</span>
                      </div>

                      {record.actualTechnicians && record.actualTechnicians.length > 0 && (
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="font-medium text-[11px]">ช่างผู้ปฏิบัติงาน:</span>
                          <span className="text-slate-800 truncate max-w-[180px]">{record.actualTechnicians.join(', ')}</span>
                        </div>
                      )}

                      {record.replacedParts && record.replacedParts.length > 0 && (
                        <div className="pt-1 border-t border-slate-200 text-[11px] text-slate-700">
                          <div className="font-bold text-amber-800 flex items-center gap-1">
                            <Package className="w-3 h-3 text-amber-600" />
                            <span>อะไหล่ที่เปลี่ยน ({record.replacedParts.length} รายการ):</span>
                          </div>
                          <div className="mt-1 space-y-0.5">
                            {record.replacedParts.map((p, idx) => (
                              <div key={idx} className="text-[10.5px] text-slate-600 flex justify-between">
                                <span>• {p.partName}</span>
                                <span className="font-mono font-bold">{p.quantity} {p.unit}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center text-xs text-slate-400">
                      ไม่มีแผน PM ในเดือนนี้ (รอบความถี่ {plan.defaultFrequency})
                    </div>
                  )}

                  {/* Card Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(plan, selectedMonthForView)}
                      className="flex-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 hover:border-indigo-400 font-bold text-xs py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isPlanned ? 'บันทึกผลการทำจริง' : 'กำหนดแผนใหม่'}</span>
                    </button>

                    {onViewMachineHistory && (
                      <button
                        type="button"
                        onClick={() => {
                          const matched = machines.find((m) => m.id === plan.machineId || m.code === plan.machineCode);
                          if (matched) onViewMachineHistory(matched);
                        }}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition"
                        title="ดูประวัติการซ่อมย้อนหลังทั้งหมดของเครื่องนี้"
                      >
                        <Activity className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: PRINTABLE A4 LANDSCAPE MASTER PM SCHEDULE (FM-MN01-02) — Always mounted for 1-click PDF from any tab */}
      <div className={activeViewMode === 'printable' ? 'space-y-4 print:space-y-0' : 'hidden print:block'}>
        <style>{`@media print { @page { size: A4 landscape; margin: 5mm; } }`}</style>
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs print:hidden no-print">
          <div>
            <h3 className="font-bold text-sm text-slate-900">ตัวอย่างเอกสารก่อนพิมพ์ A4 แนวนอน (Print Preview - 1 หน้า)</h3>
            <p className="text-xs text-slate-500">หมายเลขเอกสาร: FM-MN01-02 Rev.00 • จัดพอดีกระดาษ A4 แนวนอนอัตโนมัติ</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{isExportingPdf ? 'กำลังสร้าง PDF...' : 'บันทึกเป็น PDF (1 หน้า)'}</span>
            </button>
            <button
              type="button"
              onClick={() =>
                printElementOnly(
                  printSheetRef.current,
                  `KOCH_Annual_PM_Plan_${selectedYear}_FM_MN01_02`,
                  'landscape'
                )
              }
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์เอกสาร</span>
            </button>
          </div>
        </div>

        {/* Printable Layout Container */}
        <div className="bg-slate-100 p-4 sm:p-6 rounded-3xl overflow-x-auto flex justify-center print:bg-white print:p-0 print:overflow-visible">
          <div 
            ref={printSheetRef}
            className="bg-white text-slate-900 p-6 shadow-2xl rounded-sm w-[297mm] text-[9.5px] space-y-2.5 font-sans print:p-0 print:shadow-none print:w-full"
          >
            {/* Document Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2.5">
              <div className="flex items-center gap-3">
                <div className="p-1 border border-slate-300 rounded">
                  <KochLogo size="sm" variant="horizontal" />
                </div>
                <div>
                  <div className="font-bold text-sm leading-tight">บริษัท เค.โอ.ซี.เอช. แพคเกจจิ้ง จำกัด (KOCH PACKAGING CO., LTD.)</div>
                  <div className="text-[11px] font-bold text-blue-900">
                    แผนการบำรุงรักษาเครื่องจักรและอุปกรณ์ประจำปี (ANNUAL PREVENTIVE MAINTENANCE SCHEDULE)
                  </div>
                  <div className="text-[9.5px] text-slate-500">โรงงานบางแสน BS • ประจำปี พ.ศ. {selectedYear + 543} (ค.ศ. {selectedYear})</div>
                </div>
              </div>

              <div className="text-right text-[9.5px] font-mono border border-slate-800 px-3 py-1.5 rounded bg-slate-50 shrink-0 space-y-0.5">
                <div className="font-bold text-slate-900 text-[10.5px]">หมายเลขเอกสาร: FM-MN01-02</div>
                <div>แก้ไขครั้งที่: Rev.00 • บังคับใช้: 19/10/2026</div>
                <div className="text-slate-600">หน้าที่: 1 / 1</div>
              </div>
            </div>

              {/* Table of 33 machines */}
              <table className="w-full border-collapse border border-slate-400 text-[9.5px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 border-b border-slate-400">
                    <th className="border border-slate-400 p-1 text-center w-8">No.</th>
                    <th className="border border-slate-400 p-1 text-center w-12">แท็ก</th>
                    <th className="border border-slate-400 p-1 text-left w-36">ชื่อเครื่องจักร / รหัสทรัพย์สิน</th>
                    <th className="border border-slate-400 p-1 text-center w-14">รอบ PM</th>
                    <th className="border border-slate-400 p-1 text-center w-6">เกณฑ์</th>
                    {THAI_MONTH_SHORT.map((mName, idx) => (
                      <th key={idx} className="border border-slate-400 p-1 text-center font-bold">
                        <div>{mName}</div>
                      </th>
                    ))}
                    <th className="border border-slate-400 p-1 text-center w-14">สำเร็จ</th>
                  </tr>
                </thead>
                <tbody>
                  {pmPlans.map((plan, pIdx) => {
                    let plannedCount = 0;
                    let completedCount = 0;
                    for (let m = 1; m <= 12; m++) {
                      const rec = plan.months[m];
                      if (rec && rec.isPlanned) {
                        plannedCount++;
                        if (rec.status === 'completed' || rec.status === 'delayed') completedCount++;
                      }
                    }

                    return (
                      <tr key={plan.id} className="border-b border-slate-300">
                        <td className="border border-slate-400 p-1 text-center font-mono">{pIdx + 1}</td>
                        <td className="border border-slate-400 p-1 text-center font-bold font-mono">{plan.machineTag}</td>
                        <td className="border border-slate-400 p-1">
                          <div className="font-bold leading-tight">{plan.machineName}</div>
                          <div className="text-[8.5px] text-slate-500 font-mono">{plan.machineCode}</div>
                        </td>
                        <td className="border border-slate-400 p-1 text-center font-mono font-bold">{plan.defaultFrequency}</td>
                        <td className="border border-slate-400 p-1 text-center font-mono text-[8.5px] font-bold">
                          <div className="text-blue-700">P</div>
                          <div className="text-emerald-700">A</div>
                        </td>

                        {Array.from({ length: 12 }, (_, i) => i + 1).map((mNum) => {
                          const record = plan.months[mNum];
                          const isPlanned = record?.isPlanned;

                          return (
                            <td key={mNum} className="border border-slate-400 p-0.5 text-center font-mono text-[8.5px]">
                              {/* Plan row */}
                              <div className="leading-tight">
                                {isPlanned ? (
                                  <span className="font-bold text-blue-700">W{record?.plannedWeek || 1}</span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </div>
                              {/* Act row */}
                              <div className="leading-tight">
                                {isPlanned ? (
                                  record?.status === 'completed' ? (
                                    <span className="font-bold text-emerald-700">✓</span>
                                  ) : record?.status === 'delayed' ? (
                                    <span className="font-bold text-rose-700">⚠️</span>
                                  ) : record?.status === 'in_progress' ? (
                                    <span className="font-bold text-amber-700">⚡</span>
                                  ) : (
                                    <span className="text-slate-400">○</span>
                                  )
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </div>
                            </td>
                          );
                        })}

                        <td className="border border-slate-400 p-1 text-center font-mono font-bold">
                          {completedCount}/{plannedCount}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Legend and Signatures */}
              <div className="pt-2 flex justify-between items-end text-[9.5px]">
                <div className="space-y-1">
                  <div><strong>คำอธิบายสัญลักษณ์:</strong> P = แผนงาน (Plan กำหนดสัปดาห์ W1-W4), A = ผลการซ่อมจริง (Act. ✓ = สำเร็จ, ⚠️ = ล่าช้า, ○ = รอถึงรอบ)</div>
                  <div><strong>สรุปผลงานภาพรวม:</strong> แผน {stats.totalPlanned} รอบ • ทำจริงเสร็จแล้ว {stats.totalCompleted} รอบ ({stats.achievementRate}%) • เวลาหยุดเครื่องรวม {stats.totalDowntime} ชม.</div>
                </div>

                {/* 3-Party Approval Boxes */}
                <div className="flex gap-4 text-center">
                  <div className="border border-slate-400 p-2 rounded w-44">
                    <div className="h-8 border-b border-dotted border-slate-400 flex items-end justify-center font-serif italic text-[10.5px]">
                      /s/ นายประสิทธิ์ วิศวกร
                    </div>
                    <div className="mt-1 font-bold">ผู้จัดทำแผน (Prepared by)</div>
                    <div className="text-[8.5px] text-slate-500">วิศวกรซ่อมบำรุง KOCH</div>
                  </div>

                  <div className="border border-slate-400 p-2 rounded w-44">
                    <div className="h-8 border-b border-dotted border-slate-400 flex items-end justify-center font-serif italic text-[10.5px]">
                      /s/ นายเกียรติศักดิ์ พ.
                    </div>
                    <div className="mt-1 font-bold">ผู้ตรวจสอบ (Reviewed by)</div>
                    <div className="text-[8.5px] text-slate-500">หัวหน้าฝ่ายซ่อมบำรุง</div>
                  </div>

                  <div className="border border-slate-400 p-2 rounded w-44">
                    <div className="h-8 border-b border-dotted border-slate-400 flex items-end justify-center font-serif italic text-[10.5px]">
                      /s/ ดร. สมเกียรติ ม.
                    </div>
                    <div className="mt-1 font-bold">ผู้อนุมัติ (Approved by)</div>
                    <div className="text-[8.5px] text-slate-500">ผู้จัดการโรงงานบางแสน BS</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* MODAL: EDIT PLAN & ACTUAL MAINTENANCE RECORD */}
      {editingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-xs">
                  <Wrench className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs font-black bg-slate-800 text-indigo-300 px-2.5 py-0.5 rounded-lg border border-slate-700">
                      {editingModal.plan.machineTag}
                    </span>
                    <span className="text-xs text-slate-300">
                      เดือน {THAI_MONTH_NAMES[editingModal.month - 1]} ({selectedYear})
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <span>{editingModal.plan.machineName}</span>
                    <span className="text-xs font-normal text-slate-400">({editingModal.plan.machineCode})</span>
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingModal(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-800">
              
              {/* Success Notification Alert */}
              {saveSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {/* Section 1: Plan Settings (ข้อมูลแผนที่วางไว้) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>ส่วนที่ 1: กำหนดการและแผนงาน (Plan Settings)</span>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsPlanned}
                      onChange={(e) => setFormIsPlanned(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300"
                    />
                    <span className="text-xs font-bold text-slate-700">มีแผนในเดือนนี้ (Is Planned)</span>
                  </label>
                </div>

                {formIsPlanned && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">สัปดาห์ตามแผน (Week):</label>
                      <select
                        value={formPlannedWeek}
                        onChange={(e) => setFormPlannedWeek(parseInt(e.target.value, 10))}
                        className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                      >
                        <option value={1}>สัปดาห์ที่ 1 (W1: วันที่ 1-7)</option>
                        <option value={2}>สัปดาห์ที่ 2 (W2: วันที่ 8-14)</option>
                        <option value={3}>สัปดาห์ที่ 3 (W3: วันที่ 15-21)</option>
                        <option value={4}>สัปดาห์ที่ 4 (W4: วันที่ 22-28)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">วันที่ตามแผน (Planned Date):</label>
                      <input
                        type="date"
                        value={formPlannedDate}
                        onChange={(e) => setFormPlannedDate(e.target.value)}
                        className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl font-mono text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">ขอบเขตงาน (PM Scope):</label>
                      <input
                        type="text"
                        value={formPlannedScope}
                        onChange={(e) => setFormPlannedScope(e.target.value)}
                        placeholder="เช่น PM ประจำเดือน (1M), รอบใหญ่ 6 เดือน"
                        className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Actual Execution Record (การลงมือซ่อมบำรุงจริง - Act.) */}
              {formIsPlanned && (
                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-200/80 space-y-4">
                  <div className="text-xs font-bold text-indigo-900 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-indigo-600" />
                      <span>ส่วนที่ 2: บันทึกการลงมือซ่อมบำรุงจริง (Actual Execution - Act.)</span>
                    </div>

                    <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full font-mono">
                      FM-MN01-02 ACTUAL LOG
                    </span>
                  </div>

                  {/* Status, Date, Duration */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">ผลการดำเนินการจริง (Status):</label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as any)}
                        className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
                      >
                        <option value="completed">🟢 ซ่อมจริงสำเร็จ (Completed / Done)</option>
                        <option value="in_progress">🟡 กำลังดำเนินการ (In Progress)</option>
                        <option value="delayed">🔴 ล่าช้ากว่าแผน (Delayed / Overdue)</option>
                        <option value="planned">⚪ รอดำเนินการตามรอบ (Planned)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">วันที่ทำจริง (Actual Date):</label>
                      <input
                        type="date"
                        value={formActualDate}
                        onChange={(e) => setFormActualDate(e.target.value)}
                        className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl font-mono text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">เวลาซ่อมจริง (Downtime ชั่วโมง):</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={formDurationHours}
                        onChange={(e) => setFormDurationHours(e.target.value)}
                        className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Technicians & Supervisor */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">ช่างผู้รับผิดชอบหลัก:</label>
                      <input
                        type="text"
                        value={formTechLead}
                        onChange={(e) => setFormTechLead(e.target.value)}
                        className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">ช่างผู้ร่วมปฏิบัติงาน:</label>
                      <input
                        type="text"
                        value={formTechAssistant}
                        onChange={(e) => setFormTechAssistant(e.target.value)}
                        className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">หัวหน้างานผู้ตรวจรับรอง:</label>
                      <input
                        type="text"
                        value={formSupervisor}
                        onChange={(e) => setFormSupervisor(e.target.value)}
                        className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Findings & Corrective Action */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">ผลการตรวจพบ (Findings):</label>
                      <textarea
                        rows={2}
                        value={formFindings}
                        onChange={(e) => setFormFindings(e.target.value)}
                        placeholder="บันทึกสภาพเครื่องจักรที่ตรวจพบ เช่น สายพานเริ่มหย่อน, อุณหภูมิมอเตอร์ปกติ..."
                        className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">การแก้ไขและบำรุงรักษา (Action Taken):</label>
                      <textarea
                        rows={2}
                        value={formCorrectiveAction}
                        onChange={(e) => setFormCorrectiveAction(e.target.value)}
                        placeholder="บันทึกการแก้ไข เช่น อัดจาระบีครบจุด, ขันแน่นน็อต, ปรับความตึงสายพาน..."
                        className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* Replaced Spare Parts during PM */}
                  <div className="pt-2 border-t border-indigo-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-amber-600" />
                        <span>อะไหล่ที่เปลี่ยนระหว่างรอบ PM (Replaced Parts):</span>
                      </div>

                      {/* Dropdown to pick spare part */}
                      {spareParts.length > 0 && (
                        <div className="flex items-center gap-1">
                          <select
                            onChange={(e) => {
                              const found = spareParts.find((sp) => sp.id === e.target.value);
                              if (found) handleAddPartToRecord(found);
                              e.target.value = '';
                            }}
                            className="p-1.5 text-[11px] bg-white border border-slate-200 rounded-lg text-slate-700 cursor-pointer font-medium"
                          >
                            <option value="">+ เลือกเบิกอะไหล่จากคลัง...</option>
                            {spareParts.map((sp) => (
                              <option key={sp.id} value={sp.id}>
                                [{sp.partNo}] {sp.name} (คงเหลือ: {sp.stockQty} {sp.unit})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {formReplacedParts.length > 0 ? (
                      <div className="space-y-1.5 bg-white p-2.5 rounded-xl border border-slate-200">
                        {formReplacedParts.map((part, pIdx) => (
                          <div key={pIdx} className="flex items-center justify-between gap-2 text-xs p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                            <div>
                              <span className="font-bold text-slate-900">{part.partName}</span>
                              {part.partNo && <span className="text-[10px] text-slate-500 font-mono ml-1.5">[{part.partNo}]</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="1"
                                value={part.quantity}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10) || 1;
                                  setFormReplacedParts((prev) =>
                                    prev.map((pt, i) => (i === pIdx ? { ...pt, quantity: val } : pt))
                                  );
                                }}
                                className="w-16 p-1 text-xs border border-slate-200 rounded text-center font-mono font-bold"
                              />
                              <span className="text-[11px] text-slate-600">{part.unit}</span>
                              <button
                                type="button"
                                onClick={() => handleRemovePartFromRecord(pIdx)}
                                className="text-rose-500 hover:text-rose-700 p-1"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 italic p-2 bg-white/60 rounded-xl border border-dashed border-slate-200 text-center">
                        ไม่มีการเปลี่ยนอะไหล่ในรอบนี้ (บำรุงรักษาและตรวจสภาพตามปกติ)
                      </div>
                    )}
                  </div>

                  {/* PM Standard Checklist Toggle */}
                  <div className="pt-2 border-t border-indigo-200/80 space-y-2">
                    <div className="text-xs font-bold text-slate-900">
                      รายการตรวจเช็คมาตรฐาน (PM Checklist Tasks):
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {formTasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => handleToggleTaskStatus(task.id)}
                          className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 hover:border-blue-300 cursor-pointer text-xs transition"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-4 h-4 rounded flex items-center justify-center font-mono font-bold text-[10px] ${
                              task.status === 'pass' ? 'bg-emerald-100 text-emerald-800' :
                              task.status === 'replaced' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {task.status === 'pass' ? '✓' : task.status === 'replaced' ? 'R' : '!'}
                            </span>
                            <span className="font-medium text-slate-800">{task.name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">{task.standardCriteria}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setEditingModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                onClick={handleSaveModal}
                disabled={isSavingRecord}
                className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                {isSavingRecord ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังบันทึกข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>บันทึกผลการทำจริง (Save Actual PM)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
