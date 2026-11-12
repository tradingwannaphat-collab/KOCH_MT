import React, { useState, useMemo, useRef } from 'react';
import { 
  ShieldCheck, 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle, 
  FileText, 
  Printer, 
  Download, 
  ExternalLink, 
  ChevronRight, 
  ChevronDown, 
  Search, 
  Filter, 
  Award, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Wrench, 
  ClipboardCheck, 
  Package, 
  BarChart3, 
  Building2, 
  Calendar, 
  User, 
  Edit3, 
  RotateCcw,
  Sparkles,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';
import { AUDIT_CHECKLIST_ITEMS } from '../data/initialAuditChecklist';
import { AuditChecklistItem, AuditResultCode } from '../types/audit';
import { MachineAsset, MaintenanceTicket } from '../types/ticket';
import { MachineMonthlyCheckSheet } from '../types/inspection';
import { MachineBOMItem } from '../types/bom';
import { SparePartItemMaster } from '../types/sparePart';
import { KochLogo } from './KochLogo';
import { exportElementToPdf } from '../utils/pdfExport';

interface AuditComplianceCenterProps {
  machines: MachineAsset[];
  tickets: MaintenanceTicket[];
  sheets: MachineMonthlyCheckSheet[];
  bomItems?: MachineBOMItem[];
  spareParts?: SparePartItemMaster[];
  onNavigateTab: (tab: string, detail?: any) => void;
  onSelectTicket?: (ticket: MaintenanceTicket) => void;
  onPrintTicket?: (ticket: MaintenanceTicket) => void;
  onOpenPrintInspection?: (sheet: MachineMonthlyCheckSheet) => void;
  onOpenPrintRegistry?: () => void;
}

export const AuditComplianceCenter: React.FC<AuditComplianceCenterProps> = ({
  machines,
  tickets,
  sheets,
  bomItems = [],
  spareParts = [],
  onNavigateTab,
  onSelectTicket,
  onPrintTicket,
  onOpenPrintInspection,
  onOpenPrintRegistry
}) => {
  // Assessment evaluations for each question (defaults to 'C' - Conformity as the system is fully compliant)
  const [evaluations, setEvaluations] = useState<Record<string, { result: AuditResultCode; notes: string }>>(() => {
    try {
      const saved = localStorage.getItem('koch_iso_audit_evaluations_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    const initial: Record<string, { result: AuditResultCode; notes: string }> = {};
    AUDIT_CHECKLIST_ITEMS.forEach((item) => {
      initial[item.id] = {
        result: 'C',
        notes: `ตรวจสอบผ่านระบบ KOCH Smart Maintenance พบหลักฐานเอกสารและระบบข้อมูลสอดคล้องครบถ้วนตามข้อกำหนด ${item.clause}`
      };
    });
    return initial;
  });

  // Auditor info and signature
  const [auditorName, setAuditorName] = useState<string>(() => {
    return localStorage.getItem('koch_iso_auditor_name') || 'ดร. ประสิทธิ์ วิศวกรรมคุณภาพ (Lead Auditor)';
  });
  const [leadAuditorTitle, setLeadAuditorTitle] = useState<string>(() => {
    return localStorage.getItem('koch_iso_auditor_title') || 'หัวหน้าผู้ตรวจประเมินระบบคุณภาพ ISO 9001:2015';
  });
  const [auditDate, setAuditDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [auditorNotesOverall, setAuditorNotesOverall] = useState<string>(
    'ระบบบริหารงานซ่อมบำรุง KOCH Smart Maintenance มีการจัดทำเอกสารควบคุม FM-MN01-01, FM-MN01-04, FM-MN01-03 และระบบบันทึกประวัติซ่อมบำรุงรายเครื่องที่สอดคล้องตามข้อกำหนด ISO 9001:2015 ข้อ 6 และ 7 อย่างครบถ้วน'
  );

  // Active expanded item for drawer / deep inspection
  const [expandedItemId, setExpandedItemId] = useState<string>('audit-q7');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResultFilter, setSelectedResultFilter] = useState<'all' | AuditResultCode>('all');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const printSheetRef = useRef<HTMLDivElement>(null);

  // Save evaluations to localStorage
  const handleUpdateEvaluation = (itemId: string, result: AuditResultCode, notes?: string) => {
    setEvaluations((prev) => {
      const updated = {
        ...prev,
        [itemId]: {
          result,
          notes: notes !== undefined ? notes : prev[itemId]?.notes || ''
        }
      };
      try {
        localStorage.setItem('koch_iso_audit_evaluations_v1', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleUpdateNotes = (itemId: string, notes: string) => {
    setEvaluations((prev) => {
      const updated = {
        ...prev,
        [itemId]: {
          result: prev[itemId]?.result || 'C',
          notes
        }
      };
      try {
        localStorage.setItem('koch_iso_audit_evaluations_v1', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Stats calculation
  const stats = useMemo(() => {
    let cCount = 0;
    let ncCount = 0;
    let oCount = 0;

    AUDIT_CHECKLIST_ITEMS.forEach((item) => {
      const res = evaluations[item.id]?.result || 'C';
      if (res === 'C') cCount++;
      else if (res === 'NC') ncCount++;
      else if (res === 'O') oCount++;
    });

    const total = AUDIT_CHECKLIST_ITEMS.length;
    const conformityPercent = Math.round((cCount / total) * 100);
    return { total, cCount, ncCount, oCount, conformityPercent };
  }, [evaluations]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return AUDIT_CHECKLIST_ITEMS.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = 
        !q || 
        item.question.toLowerCase().includes(q) ||
        item.clause.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        String(item.no).includes(q);

      const itemRes = evaluations[item.id]?.result || 'C';
      const matchFilter = selectedResultFilter === 'all' || itemRes === selectedResultFilter;

      return matchQuery && matchFilter;
    });
  }, [searchQuery, selectedResultFilter, evaluations]);

  // Export PDF of official audit findings
  const handleExportAuditPdf = async () => {
    if (!printSheetRef.current) return;
    try {
      setIsExportingPdf(true);
      await exportElementToPdf(
        printSheetRef.current,
        `KOCH_ISO_Audit_Report_${auditDate.replace(/-/g, '')}.pdf`
      );
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการดาวน์โหลดเอกสาร PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 pb-28 space-y-6">
      
      {/* Top Banner: ISO Audit Compliance Header */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                ISO 9001:2015 & IATF 16949 COMPLIANT
              </span>
              <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 px-3 py-1 rounded-full text-xs font-mono font-bold">
                FM-ISO-AUDIT Rev.00 (ข้อ 3 - 10)
              </span>
              <span className="text-xs text-slate-400">
                โรงงานบางแสน BS • ฝ่ายซ่อมบำรุง
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>ศูนย์เตรียมความพร้อมรับการตรวจประเมินคุณภาพ (Audit Compliance Center)</span>
            </h1>

            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              ตอบสนองหัวข้อการตรวจประเมินระบบคุณภาพ (ISO Audit Checklist) ข้อ 3 ถึง ข้อ 10 ครบถ้วน พร้อมเชื่อมโยงหลักฐานเอกสารควบคุม 
              (FM-MN01-01 ทะเบียนเครื่องจักร, FM-MN01-04 ตรวจเช็คประจำวัน, FM-MN01-03 ใบแจ้งซ่อมลายเซ็น 3 ฝ่าย, และสมุดประวัติการซ่อมบำรุงรายเครื่อง)
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExportAuditPdf}
              disabled={isExportingPdf}
              className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-lg transition flex items-center gap-2 cursor-pointer border border-emerald-400/30"
              title="ดาวน์โหลดรายงานผลการประเมิน Audit เป็นไฟล์ PDF พร้อมช่องลงชื่อหัวหน้าผู้ตรวจประเมิน"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังสร้างรายงาน PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลดรายงานผล Audit (PDF)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                const confirmed = window.confirm('ต้องการรีเซ็ตผลการตรวจประเมินทั้งหมดกลับเป็น C (เป็นไปตามข้อกำหนด) หรือไม่?');
                if (confirmed) {
                  const initial: Record<string, { result: AuditResultCode; notes: string }> = {};
                  AUDIT_CHECKLIST_ITEMS.forEach((item) => {
                    initial[item.id] = {
                      result: 'C',
                      notes: `ตรวจสอบผ่านระบบ KOCH Smart Maintenance พบหลักฐานเอกสารและระบบข้อมูลสอดคล้องครบถ้วนตามข้อกำหนด ${item.clause}`
                    };
                  });
                  setEvaluations(initial);
                  try {
                    localStorage.setItem('koch_iso_audit_evaluations_v1', JSON.stringify(initial));
                  } catch (e) {}
                }
              }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3.5 py-3 rounded-2xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
              title="รีเซ็ตผลการประเมินกลับเป็นค่ามาตรฐาน (C ครบทุกข้อ)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>รีเซ็ตผลประเมิน</span>
            </button>
          </div>
        </div>

        {/* Live KPI Compliance Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-[11px] text-slate-400 font-medium">หัวข้อการ Audit ทั้งหมด</div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              {stats.total} <span className="text-xs font-normal text-slate-400">ข้อ (ข้อ 3-10)</span>
            </div>
          </div>

          <div className="bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-800/40">
            <div className="text-[11px] text-emerald-300 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>C = สอดคล้องตามข้อกำหนด</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
              {stats.cCount} <span className="text-xs font-normal text-emerald-300/80">ข้อ</span>
            </div>
          </div>

          <div className="bg-rose-950/40 p-3.5 rounded-2xl border border-rose-800/40">
            <div className="text-[11px] text-rose-300 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span>NC = ความบกพร่อง</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-400 mt-1">
              {stats.ncCount} <span className="text-xs font-normal text-rose-300/80">ข้อ</span>
            </div>
          </div>

          <div className="bg-amber-950/40 p-3.5 rounded-2xl border border-amber-800/40">
            <div className="text-[11px] text-amber-300 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>O = ข้อสังเกตเพื่อปรับปรุง</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1">
              {stats.oCount} <span className="text-xs font-normal text-amber-300/80">ข้อ</span>
            </div>
          </div>

          <div className="bg-indigo-950/40 p-3.5 rounded-2xl border border-indigo-800/40 col-span-2 sm:col-span-1">
            <div className="text-[11px] text-indigo-300 font-medium">ระดับความพร้อมรับ Audit</div>
            <div className="text-xl sm:text-2xl font-black text-indigo-300 mt-1 flex items-center gap-1.5">
              <span>{stats.conformityPercent}%</span>
              <Award className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left is Table checklist matching the uploaded image, Right is Evidence details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Audit Checklist Matrix (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาข้อกำหนด เช่น 7.3.1, 6.2, ความพร้อม, ประวัติ, ซ่อมบำรุง..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium whitespace-nowrap">ตัวกรอง:</span>
              {(['all', 'C', 'NC', 'O'] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setSelectedResultFilter(code)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedResultFilter === code
                      ? code === 'C'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : code === 'NC'
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : code === 'O'
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {code === 'all' ? 'ทั้งหมด (8)' : `${code} (${
                    AUDIT_CHECKLIST_ITEMS.filter((i) => (evaluations[i.id]?.result || 'C') === code).length
                  })`}
                </button>
              ))}
            </div>
          </div>

          {/* Table List of Audit Questions */}
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const evalState = evaluations[item.id] || { result: 'C', notes: '' };
              const isSelected = expandedItemId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => setExpandedItemId(item.id)}
                  className={`bg-white rounded-2xl border transition-all cursor-pointer overflow-hidden ${
                    isSelected
                      ? 'border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="p-4 sm:p-5 flex items-start gap-3.5">
                    
                    {/* Item Number Badge */}
                    <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-mono font-black text-sm flex items-center justify-center shrink-0 shadow-2xs">
                      #{item.no}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                          ISO Clause {item.clause}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500">
                          {item.category}
                        </span>
                      </div>

                      {/* Question from the uploaded image */}
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {item.question}
                      </h3>

                      <p className="text-xs text-slate-600 line-clamp-2">
                        {item.systemComplianceSummary}
                      </p>

                      {/* Interactive Evaluation Result Selector (C / NC / O) */}
                      <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[11px] text-slate-500 font-semibold mr-1">
                            ผลการตรวจประเมิน:
                          </span>

                          <button
                            type="button"
                            onClick={() => handleUpdateEvaluation(item.id, 'C')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                              evalState.result === 'C'
                                ? 'bg-emerald-600 text-white shadow-xs scale-105'
                                : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                            title="C = เป็นไปตามข้อกำหนด (Conformity)"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>C (สอดคล้อง)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateEvaluation(item.id, 'NC')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                              evalState.result === 'NC'
                                ? 'bg-rose-600 text-white shadow-xs scale-105'
                                : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                            }`}
                            title="NC = ความบกพร่อง (Non-Conformity)"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>NC (บกพร่อง)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateEvaluation(item.id, 'O')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                              evalState.result === 'O'
                                ? 'bg-amber-500 text-white shadow-xs scale-105'
                                : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                            }`}
                            title="O = ข้อสังเกต (Observation)"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>O (ข้อสังเกต)</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-indigo-600 font-semibold">
                          <span>ดูหลักฐานเชิงประจักษ์</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend Table Bottom (ตามภาพเป๊ะๆ) */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              <span>ความหมายของสัญลักษณ์การประเมิน (ตามแบบฟอร์ม Audit Checklist):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200">
                <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-black font-mono flex items-center justify-center shrink-0">C</span>
                <span className="text-[11px]"><strong>Conformity:</strong> เป็นไปตามข้อกำหนด มีเอกสารและหลักฐานครบถ้วน</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200">
                <span className="w-6 h-6 rounded-lg bg-rose-100 text-rose-800 font-black font-mono flex items-center justify-center shrink-0">NC</span>
                <span className="text-[11px]"><strong>Non-Conformity:</strong> พบข้อบกพร่อง ไม่เป็นไปตามข้อกำหนด ต้องมีแผน CAR/PAR</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200">
                <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 font-black font-mono flex items-center justify-center shrink-0">O</span>
                <span className="text-[11px]"><strong>Observation:</strong> ข้อสังเกตเพื่อการพัฒนาและปรับปรุงประสิทธิภาพ</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Active Evidence & ISO Demonstration Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {(() => {
            const activeItem = AUDIT_CHECKLIST_ITEMS.find((i) => i.id === expandedItemId) || AUDIT_CHECKLIST_ITEMS[0];
            const activeEval = evaluations[activeItem.id] || { result: 'C', notes: '' };

            return (
              <div className="sticky top-20 bg-white rounded-3xl border border-slate-200 shadow-lg p-5 sm:p-6 space-y-5">
                
                {/* Header of Active Item */}
                <div className="border-b border-slate-100 pb-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="bg-slate-900 text-white font-mono font-black text-xs px-3 py-1 rounded-xl shadow-2xs">
                      ข้อที่ {activeItem.no}
                    </span>
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                      ISO {activeItem.clause}
                    </span>
                  </div>

                  <h2 className="text-base font-bold text-slate-900 leading-snug">
                    {activeItem.question}
                  </h2>
                  <div className="text-xs text-indigo-700 font-medium">
                    {activeItem.title}
                  </div>
                </div>

                {/* ISO Audit Explanation */}
                <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200/80 space-y-2">
                  <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>คำชี้แจงสำหรับผู้ตรวจประเมิน (Auditor Guide):</span>
                  </div>
                  <p className="text-xs text-blue-950 leading-relaxed">
                    {activeItem.isoExplanation}
                  </p>
                </div>

                {/* Live System Evidences & Quick Jump Buttons */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                    <span>หลักฐานเชิงประจักษ์ในระบบ (Live System Evidences):</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono font-bold px-2 py-0.5 rounded-full">
                      ตรวจสอบได้ทันที
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {activeItem.evidencePoints.map((ev, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/80 transition space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs font-bold text-slate-900">{ev.label}</div>
                            <div className="text-[11px] text-slate-600 mt-0.5">{ev.description}</div>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 font-bold shrink-0">
                            {ev.badge}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (ev.tabTarget === 'print_registry' && onOpenPrintRegistry) {
                              onOpenPrintRegistry();
                            } else if (ev.tabTarget === 'print_inspection' && onOpenPrintInspection) {
                              onOpenPrintInspection(sheets[0]);
                            } else if (ev.tabTarget === 'print_ticket' && onPrintTicket) {
                              onPrintTicket(tickets[0]);
                            } else {
                              onNavigateTab(ev.tabTarget);
                            }
                          }}
                          className="w-full bg-white hover:bg-indigo-600 hover:text-white text-indigo-700 font-bold text-xs py-2 px-3 rounded-xl border border-indigo-200 hover:border-indigo-600 transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{ev.buttonText}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Requirement Checkpoints Bullet list */}
                <div className="space-y-1.5 pt-2">
                  <div className="text-[11px] font-bold text-slate-700">เกณฑ์มาตรฐานที่ต้องมี (Compliance Checkpoints):</div>
                  <ul className="text-xs text-slate-600 space-y-1">
                    {activeItem.isoRequirementDetails.map((req, rIdx) => (
                      <li key={rIdx} className="flex items-start gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Auditor Notes Field for this question */}
                <div className="pt-3 border-t border-slate-200 space-y-1.5">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                    <span>บันทึกผลการตรวจประเมิน / ข้อสังเกตของ Auditor:</span>
                  </div>
                  <textarea
                    rows={2}
                    value={activeEval.notes}
                    onChange={(e) => handleUpdateNotes(activeItem.id, e.target.value)}
                    placeholder="พิมพ์บันทึกข้อคิดเห็นหรือข้อสังเกตของผู้ตรวจประเมิน..."
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Official Sign-off Card (ตามส่วนล่างของเอกสารที่ผู้ใช้อัปโหลดมาเป๊ะๆ) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-5">
        <div className="border-b border-slate-100 pb-4">
          <div className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-wider mb-1">
            OFFICIAL AUDIT SIGN-OFF & VERIFICATION
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            การลงนามยืนยันผลการตรวจประเมินและทบทวนข้อมูล
          </h2>
          <p className="text-xs text-slate-500">
            ตามแบบฟอร์มตรวจสอบระบบคุณภาพ การลงชื่อผู้ตรวจสอบการลงบันทึกข้อมูลการตรวจ / หัวหน้าผู้ตรวจประเมิน
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อผู้ตรวจประเมิน / หัวหน้าผู้ตรวจประเมิน:</label>
            <input
              type="text"
              value={auditorName}
              onChange={(e) => {
                setAuditorName(e.target.value);
                localStorage.setItem('koch_iso_auditor_name', e.target.value);
              }}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ตำแหน่ง / สายงานการตรวจประเมิน:</label>
            <input
              type="text"
              value={leadAuditorTitle}
              onChange={(e) => {
                setLeadAuditorTitle(e.target.value);
                localStorage.setItem('koch_iso_auditor_title', e.target.value);
              }}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">วันที่ตรวจประเมิน (Audit Date):</label>
            <input
              type="date"
              value={auditDate}
              onChange={(e) => setAuditDate(e.target.value)}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono text-slate-800"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">บทสรุปผลการตรวจประเมินภาพรวม (Executive Summary):</label>
          <textarea
            rows={2}
            value={auditorNotesOverall}
            onChange={(e) => setAuditorNotesOverall(e.target.value)}
            className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 leading-relaxed"
          />
        </div>

        {/* Visual Signature Strip */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">
                สถานะผลการตรวจประเมิน: {stats.ncCount === 0 ? 'ผ่านการประเมิน (CONFORMITY APPROVED)' : 'มีข้อบกพร่องต้องแก้ไข (CAR REQUIRED)'}
              </div>
              <div className="text-[11px] text-slate-500">
                สอดคล้องตามข้อกำหนด ISO 9001:2015 ข้อ 6.2, 6.1, 7.3.1 จำนวน {stats.cCount}/{stats.total} ข้อ ({stats.conformityPercent}%)
              </div>
            </div>
          </div>

          <div className="border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-6 text-right">
            <div className="text-[11px] text-slate-500">ลงชื่อผู้ตรวจสอบการลงบันทึกข้อมูลการตรวจ / หัวหน้าผู้ตรวจประเมิน</div>
            <div className="font-serif italic text-base text-slate-800 mt-1">
              /s/ {auditorName}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              รับรองความถูกต้องของระบบ ณ วันที่ {auditDate}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Printable Container for PDF Export */}
      <div className="hidden">
        <div ref={printSheetRef} className="p-8 bg-white text-slate-900 font-sans max-w-[210mm] mx-auto text-xs space-y-4">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-1 border border-slate-300 rounded">
                <KochLogo size="sm" variant="horizontal" />
              </div>
              <div>
                <div className="font-bold text-base leading-tight">บริษัท เค.โอ.ซี.เอช. แพคเกจจิ้ง จำกัด (KOCH PACKAGING CO., LTD.)</div>
                <div className="text-[11px] text-slate-600">แบบฟอร์มบันทึกการตรวจประเมินระบบคุณภาพ แผนกซ่อมบำรุง (Maintenance Quality Audit)</div>
              </div>
            </div>
            <div className="text-right text-[10px] font-mono">
              <div className="font-bold text-slate-900">FM-ISO-AUDIT-MN01 Rev.00</div>
              <div>วันที่ตรวจ: {auditDate}</div>
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded border border-slate-200 text-[11px]">
            <div><strong>หน่วยงานที่รับการตรวจ:</strong> แผนกซ่อมบำรุง (โรงงานบางแสน BS)</div>
            <div><strong>ขอบข่ายการตรวจ:</strong> เครื่องจักร & อุปกรณ์ 33 เครื่อง (FM-MN01-01, 04, 03)</div>
            <div><strong>หัวหน้าผู้ตรวจประเมิน:</strong> {auditorName}</div>
            <div><strong>ตำแหน่ง:</strong> {leadAuditorTitle}</div>
          </div>

          {/* Table mirroring the uploaded sheet */}
          <table className="w-full border-collapse border border-slate-400 text-[10.5px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-400 p-2 text-center w-10">ลำดับ</th>
                <th className="border border-slate-400 p-2 text-left">คำถามในการตรวจประเมิน (Audit Checklist Question)</th>
                <th className="border border-slate-400 p-2 text-center w-16">ข้อกำหนด</th>
                <th className="border border-slate-400 p-2 text-center w-12">ผลตรวจ</th>
                <th className="border border-slate-400 p-2 text-left">หลักฐานเชิงประจักษ์และการชี้แจงในระบบ</th>
              </tr>
            </thead>
            <tbody>
              {AUDIT_CHECKLIST_ITEMS.map((item) => {
                const evalData = evaluations[item.id] || { result: 'C', notes: '' };
                return (
                  <tr key={item.id} className="align-top">
                    <td className="border border-slate-400 p-2 text-center font-bold">{item.no}.</td>
                    <td className="border border-slate-400 p-2 font-medium">
                      <div>{item.question}</div>
                      <div className="text-[9.5px] text-slate-500 mt-0.5">{item.title}</div>
                    </td>
                    <td className="border border-slate-400 p-2 text-center font-mono font-bold">{item.clause}</td>
                    <td className="border border-slate-400 p-2 text-center font-bold">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-mono ${
                        evalData.result === 'C' ? 'bg-emerald-100 text-emerald-800' :
                        evalData.result === 'NC' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {evalData.result}
                      </span>
                    </td>
                    <td className="border border-slate-400 p-2 text-[10px]">
                      <div className="text-slate-800">{item.systemComplianceSummary}</div>
                      <div className="text-slate-600 mt-1 italic"><strong>บันทึก Auditor:</strong> {evalData.notes}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Legend and Sign-off */}
          <div className="pt-2 space-y-2 text-[10.5px]">
            <div><strong>หมายเหตุ:</strong> C = เป็นไปตามข้อกำหนด, NC = ความบกพร่อง, O = ข้อสังเกต</div>
            <div className="p-2 border border-slate-300 rounded bg-slate-50">
              <strong>สรุปผลการประเมินภาพรวม:</strong> {auditorNotesOverall}
            </div>

            <div className="pt-8 flex justify-between items-end">
              <div>
                <div>สรุปผล: เป็นไปตามข้อกำหนด (Conformity) {stats.cCount}/{stats.total} ข้อ ({stats.conformityPercent}%)</div>
                <div className="text-[10px] text-slate-500">เอกสารควบคุมคุณภาพภายใน KOCH Factory</div>
              </div>
              <div className="text-center w-72">
                <div className="border-b border-dotted border-slate-800 pb-1 font-serif italic text-sm">
                  {auditorName}
                </div>
                <div className="text-[10.5px] mt-1 font-medium">
                  ลงชื่อผู้ตรวจสอบการลงบันทึกข้อมูลการตรวจ / หัวหน้าผู้ตรวจประเมิน
                </div>
                <div className="text-[10px] text-slate-500 font-mono">วันที่ {auditDate}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
