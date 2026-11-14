import React, { useState, useMemo, useRef } from 'react';
import {
  Activity,
  Thermometer,
  Zap,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  TrendingUp,
  Plus,
  Search,
  Wrench,
  Download,
  Loader2,
  Info,
  X,
  Trash2,
  Volume2,
  Droplets,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { MachineAsset, MaintenanceTicket } from '../types/ticket';
import { MachineMonthlyCheckSheet } from '../types/inspection';
import { MachineAnnualPMPlan } from '../types/pm';
import { MachineBOMItem } from '../types/bom';
import { ConditionReading, MachinePdMAssessment, NoiseStatus, OilConditionStatus, PdMRiskLevel } from '../types/pdm';
import { KochLogo } from './KochLogo';
import { exportElementToPdf } from '../utils/pdfExport';

interface PredictiveMaintenanceManagerProps {
  machines: MachineAsset[];
  tickets: MaintenanceTicket[];
  sheets: MachineMonthlyCheckSheet[];
  pmPlans: MachineAnnualPMPlan[];
  bomItems: MachineBOMItem[];
  readings: ConditionReading[];
  onAddReading: (payload: Omit<ConditionReading, 'id'>) => Promise<any>;
  onDeleteReading: (id: string) => Promise<any>;
  onOpenReportTicket: (machine: MachineAsset, notes?: string) => void;
}

export const PredictiveMaintenanceManager: React.FC<PredictiveMaintenanceManagerProps> = ({
  machines,
  tickets,
  sheets,
  pmPlans,
  bomItems,
  readings,
  onAddReading,
  onDeleteReading,
  onOpenReportTicket
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | PdMRiskLevel>('all');
  const [selectedMachineId, setSelectedMachineId] = useState<string>('m-05');
  const [showConceptGuide, setShowConceptGuide] = useState<boolean>(true);
  const [showRecordModal, setShowRecordModal] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const pdfReportRef = useRef<HTMLDivElement>(null);

  // Modal Form state
  const [formMachineId, setFormMachineId] = useState<string>('m-01');
  const [formInspector, setFormInspector] = useState<string>('นายประสิทธิ์ (ทีม PdM)');
  const [formVibration, setFormVibration] = useState<string>('2.2');
  const [formTemp, setFormTemp] = useState<string>('54');
  const [formCurrentAmp, setFormCurrentAmp] = useState<string>('10.5');
  const [formRatedAmp, setFormRatedAmp] = useState<string>('14.0');
  const [formPressure, setFormPressure] = useState<string>('6.0');
  const [formNoise, setFormNoise] = useState<NoiseStatus>('normal');
  const [formOil, setFormOil] = useState<OilConditionStatus>('clean');
  const [formNotes, setFormNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Compute live Health Score & Failure Prediction across all machines
  const assessments = useMemo<MachinePdMAssessment[]>(() => {
    return machines.map((m) => {
      const mReadings = readings
        .filter((r) => r.machineId === m.id || r.machineCode === m.code)
        .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));

      const latest = mReadings[mReadings.length - 1];

      // Abnormal daily checks count ('X') from FM-MN01-04
      let abnormalCheckCount = 0;
      sheets
        .filter((s) => s.machineId === m.id || s.machineNo === m.code)
        .forEach((s) => {
          Object.values(s.days || {}).forEach((d) => {
            Object.values(d.results || {}).forEach((val) => {
              if (val === 'abnormal') abnormalCheckCount++;
            });
          });
        });

      // Breakdown / Repair Ticket history from FM-MN01-03
      const mTickets = tickets.filter(
        (t) =>
          t.machineNo === m.code ||
          (m.tagCode && t.machineNo === m.tagCode) ||
          t.machineNo === m.name
      );
      const openCriticalTickets = mTickets.filter(
        (t) => !['completed', 'closed'].includes(t.status)
      ).length;

      // Delayed PM tasks from FM-MN01-02
      let delayedPmCount = 0;
      pmPlans
        .filter((p) => p.machineId === m.id || p.machineCode === m.code)
        .forEach((p) => {
          Object.values(p.months || {}).forEach((rec) => {
            if (rec.status === 'delayed') delayedPmCount++;
          });
        });

      // BOM items count
      const mBoms = bomItems.filter((b) => b.machineId === m.id || b.machineCode === m.code);

      let score = 98;
      const signals: string[] = [];
      let primaryComponent = 'สภาพรวมปกติ (Normal Operation)';
      let recommended = 'ตรวจเช็คประจำวัน (FM-MN01-04) และวัดแนวโน้มรอบถัดไปใน 14 วัน';

      if (latest) {
        // 1. Vibration ISO 10816-3 check
        if (latest.vibrationRms > 4.5) {
          score -= 36;
          signals.push(`แรงสั่นสะเทือน ${latest.vibrationRms.toFixed(1)} mm/s เกินเกณฑ์อันตราย (>4.5)`);
          primaryComponent = 'ตลับลูกปืน / เพลาขับ / ชุดเกียร์หลัก (Bearing & Shaft Alignment)';
          recommended = 'วางแผนหยุดเครื่องเปลี่ยนตลับลูกปืนและตั้งศูนย์เพลาภายใน 3-5 วัน';
        } else if (latest.vibrationRms >= 2.8) {
          score -= 18;
          signals.push(`แรงสั่นสะเทือน ${latest.vibrationRms.toFixed(1)} mm/s เข้าโซนเฝ้าระวัง (2.8-4.5)`);
          primaryComponent = 'ตลับลูกปืนเพลา / ความตึงสายพาน (Bearing / Belt)';
          recommended = 'อัดจาระบีเพิ่ม ตรวจสอบความตึงสายพาน และวัดซ้ำภายใน 7 วัน';
        }

        // 2. Bearing / Motor Temperature check
        if (latest.temperatureC > 80) {
          score -= 28;
          signals.push(`อุณหภูมิมอเตอร์/เกียร์สูง ${latest.temperatureC}°C (>80°C)`);
          if (primaryComponent.startsWith('สภาพรวม')) {
            primaryComponent = 'ขดลวดมอเตอร์ / ชุดหล่อเย็น / ห้องเกียร์';
            recommended = 'ตรวจเช็คระดับน้ำมันเกียร์ การระบายความร้อน และโหลดกระแสไฟทันที';
          }
        } else if (latest.temperatureC >= 65) {
          score -= 13;
          signals.push(`อุณหภูมิเริ่มสูง ${latest.temperatureC}°C (โซนเฝ้าระวัง 65-80°C)`);
        }

        // 3. Motor Current overload ratio
        if (latest.ratedAmp && latest.ratedAmp > 0) {
          const ratio = latest.currentAmp / latest.ratedAmp;
          if (ratio >= 1.0) {
            score -= 15;
            signals.push(`กระแสมอเตอร์ ${latest.currentAmp}A เกินพิกัด Rated (${latest.ratedAmp}A)`);
          } else if (ratio >= 0.9) {
            score -= 7;
            signals.push(`โหลดกระแสสูง ${(ratio * 100).toFixed(0)}% (${latest.currentAmp}/${latest.ratedAmp}A)`);
          }
        }

        // 4. Pneumatic / Hydraulic Pressure drift
        if (typeof latest.pressureBar === 'number' && latest.pressureBar > 0 && latest.pressureBar < 4.8) {
          score -= 14;
          signals.push(`แรงดันลม/ไฮดรอลิกต่ำ ${latest.pressureBar.toFixed(1)} bar (<5.0)`);
        }

        // 5. Oil / Debris condition
        if (latest.oilCondition === 'metal_debris') {
          score -= 22;
          signals.push('พบเศษโลหะปนเปื้อนในน้ำมันหล่อลื่น/จาระบี');
        } else if (latest.oilCondition === 'dark') {
          score -= 7;
          signals.push('น้ำมันหล่อลื่น/จาระบีเริ่มเสื่อมสภาพมีสีคล้ำ');
        }

        // 6. Acoustic Noise check
        if (latest.noiseStatus === 'abnormal') {
          score -= 14;
          signals.push('พบเสียงดังผิดปกติ / เสียงหอนจากชุดขับเคลื่อน');
        } else if (latest.noiseStatus === 'moderate') {
          score -= 5;
          signals.push('มีเสียงเสียดสีเบาๆ เริ่มต้น');
        }
      }

      // Cross-module signals from real history
      if (abnormalCheckCount > 0) {
        score -= Math.min(abnormalCheckCount * 6, 18);
        signals.push(`พบจุดผิดปกติ (X) ในแบบตรวจประจำวัน ${abnormalCheckCount} ครั้ง`);
        if (primaryComponent.startsWith('สภาพรวม')) {
          primaryComponent = 'อุปกรณ์ที่ถูกพบผิดปกติ (X) ในตรวจเช็คประจำวัน';
          recommended = 'ตรวจสอบหัวข้อที่มีสัญลักษณ์ (X) และเตรียมอะไหล่สำรองในคลัง';
        }
      }

      if (openCriticalTickets > 0) {
        score -= Math.min(openCriticalTickets * 10, 20);
        signals.push(`มีใบแจ้งซ่อมค้างดำเนินการ ${openCriticalTickets} ใบ`);
      } else if (mTickets.length > 0) {
        score -= Math.min(mTickets.length * 4, 12);
        signals.push(`มีประวัติแจ้งซ่อมย้อนหลัง ${mTickets.length} ครั้ง`);
      }

      if (delayedPmCount > 0) {
        score -= Math.min(delayedPmCount * 6, 12);
        signals.push(`มีรอบแผน PM ล่าช้า ${delayedPmCount} รอบเดือน`);
      }

      if (signals.length === 0) {
        signals.push('พารามิเตอร์ทั้งหมดและประวัติซ่อมบำรุงอยู่ในเกณฑ์มาตรฐาน');
      }

      const clampedScore = Math.max(12, Math.min(100, Math.round(score)));
      const riskLevel: PdMRiskLevel =
        clampedScore < 55 ? 'critical' : clampedScore < 80 ? 'watch' : 'healthy';

      const estimatedRulDays =
        clampedScore < 55
          ? Math.max(3, Math.round(clampedScore / 5))
          : clampedScore < 80
          ? Math.round(15 + (clampedScore - 55) * 1.4)
          : Math.round(60 + (clampedScore - 80) * 3);

      return {
        machineId: m.id,
        tagCode: m.tagCode || m.code,
        code: m.code,
        name: m.name,
        department: m.department,
        healthScore: clampedScore,
        riskLevel,
        estimatedRulDays,
        predictedComponent: primaryComponent,
        recommendedAction: recommended,
        signals,
        latestReading: latest,
        historyReadings: mReadings,
        abnormalCheckCount,
        recentTicketCount: mTickets.length,
        overdueBomCount: mBoms.length
      };
    }).sort((a, b) => a.healthScore - b.healthScore);
  }, [machines, readings, sheets, tickets, pmPlans, bomItems]);

  const stats = useMemo(() => {
    const total = assessments.length;
    const healthy = assessments.filter((a) => a.riskLevel === 'healthy').length;
    const watch = assessments.filter((a) => a.riskLevel === 'watch').length;
    const critical = assessments.filter((a) => a.riskLevel === 'critical').length;
    const avgHealth =
      total > 0
        ? Math.round(assessments.reduce((acc, a) => acc + a.healthScore, 0) / total)
        : 100;
    return { total, healthy, watch, critical, avgHealth };
  }, [assessments]);

  const filteredAssessments = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return assessments.filter((a) => {
      const matchRisk = riskFilter === 'all' || a.riskLevel === riskFilter;
      const matchQuery =
        !q ||
        a.tagCode.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.department.toLowerCase().includes(q) ||
        a.predictedComponent.toLowerCase().includes(q);
      return matchRisk && matchQuery;
    });
  }, [assessments, riskFilter, searchQuery]);

  const selectedAssessment = useMemo(() => {
    return (
      assessments.find((a) => a.machineId === selectedMachineId) ||
      filteredAssessments[0] ||
      assessments[0]
    );
  }, [assessments, filteredAssessments, selectedMachineId]);

  const openModalForMachine = (machineId: string) => {
    setFormMachineId(machineId);
    const existing = assessments.find((a) => a.machineId === machineId)?.latestReading;
    if (existing) {
      setFormVibration(String(existing.vibrationRms));
      setFormTemp(String(existing.temperatureC));
      setFormCurrentAmp(String(existing.currentAmp));
      setFormRatedAmp(String(existing.ratedAmp || 14));
      setFormPressure(String(existing.pressureBar || 6.0));
      setFormNoise(existing.noiseStatus);
      setFormOil(existing.oilCondition);
    } else {
      setFormVibration('1.8');
      setFormTemp('48');
      setFormCurrentAmp('8.0');
      setFormRatedAmp('12.0');
      setFormPressure('6.0');
      setFormNoise('normal');
      setFormOil('clean');
    }
    setFormNotes('');
    setShowRecordModal(true);
  };

  const handleSaveReading = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetMachine = machines.find((m) => m.id === formMachineId);
    if (!targetMachine) return;
    setIsSaving(true);
    try {
      const now = new Date();
      const recordedAt = `${now.toISOString().split('T')[0]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      await onAddReading({
        machineId: targetMachine.id,
        machineCode: targetMachine.code,
        machineName: targetMachine.name,
        recordedAt,
        inspectorName: formInspector.trim() || 'เจ้าหน้าที่ซ่อมบำรุง',
        vibrationRms: Math.max(0, parseFloat(formVibration) || 0),
        temperatureC: Math.max(0, parseFloat(formTemp) || 0),
        currentAmp: Math.max(0, parseFloat(formCurrentAmp) || 0),
        ratedAmp: Math.max(0, parseFloat(formRatedAmp) || 0) || undefined,
        pressureBar: Math.max(0, parseFloat(formPressure) || 0) || undefined,
        noiseStatus: formNoise,
        oilCondition: formOil,
        notes: formNotes.trim()
      });
      setSelectedMachineId(targetMachine.id);
      setShowRecordModal(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPdf = async () => {
    if (!pdfReportRef.current) return;
    setIsExportingPdf(true);
    try {
      await exportElementToPdf(
        pdfReportRef.current,
        'FM-MN01-09_รายงานการบำรุงรักษาเชิงพยากรณ์_Predictive_Maintenance.pdf',
        { orientation: 'landscape', fitToOnePage: true, marginMm: 5 }
      );
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleCreatePredictiveTicket = (assessment: MachinePdMAssessment) => {
    const machine = machines.find((m) => m.id === assessment.machineId);
    if (!machine) return;
    const readingText = assessment.latestReading
      ? `ค่าล่าสุด: สั่น ${assessment.latestReading.vibrationRms} mm/s, อุณหภูมิ ${assessment.latestReading.temperatureC}°C, กระแส ${assessment.latestReading.currentAmp}A`
      : 'ประเมินจากสถิติความผิดปกติสะสม';
    const note = `[ใบแจ้งซ่อมเชิงพยากรณ์ล่วงหน้า PdM] ดัชนีสุขภาพ: ${assessment.healthScore}% (คาดการณ์เหลือ ~${assessment.estimatedRulDays} วัน) | จุดเสื่อมที่พยากรณ์: ${assessment.predictedComponent} | ${readingText} | ข้อแนะนำ: ${assessment.recommendedAction}`;
    onOpenReportTicket(machine, note);
  };

  const renderRiskBadge = (risk: PdMRiskLevel) => {
    if (risk === 'critical') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md whitespace-nowrap">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>เสี่ยงสูง (วางแผนซ่อม)</span>
        </span>
      );
    }
    if (risk === 'watch') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>เฝ้าระวัง (ติดตาม)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>ปกติ (Healthy)</span>
      </span>
    );
  };

  // Pure SVG Trend Chart points for selected machine
  const trendChart = useMemo(() => {
    if (!selectedAssessment) return null;
    const pts = selectedAssessment.historyReadings;
    if (pts.length === 0) return null;

    const width = 460;
    const height = 165;
    const padX = 36;
    const padY = 20;
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;

    const maxVib = Math.max(6, ...pts.map((p) => p.vibrationRms + 0.5));
    const maxTemp = Math.max(100, ...pts.map((p) => p.temperatureC + 10));

    const getX = (idx: number) =>
      pts.length === 1 ? padX + innerW / 2 : padX + (idx / (pts.length - 1)) * innerW;

    const vibY = (v: number) => padY + innerH - (v / maxVib) * innerH;
    const tempY = (t: number) => padY + innerH - (t / maxTemp) * innerH;

    const vibPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${vibY(p.vibrationRms)}`).join(' ');
    const tempPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${tempY(p.temperatureC)}`).join(' ');

    return {
      width,
      height,
      padX,
      padY,
      pts,
      getX,
      vibY,
      tempY,
      vibPath,
      tempPath,
      watchLineY: vibY(2.8),
      critLineY: vibY(4.5)
    };
  }, [selectedAssessment]);

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 pb-28 space-y-5">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-300 font-mono mb-1">
              <span>FM-MN01-09</span>
              <span aria-hidden="true">·</span>
              <span>ISO 10816-3 &amp; ISO 9001:2015</span>
              <span aria-hidden="true">·</span>
              <span>โรงงานบางแสน BS</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2.5">
              <Activity className="w-6 h-6 text-emerald-400 shrink-0" />
              <span>ศูนย์บำรุงรักษาเชิงพยากรณ์ (Predictive Maintenance — PdM)</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              ติดตามสภาพจริงของเครื่องจักร (ความสั่นสะเทือน · อุณหภูมิ · กระแสไฟ · แรงดัน) ร่วมกับสถิติตรวจประจำวัน เพื่อคาดการณ์ก่อนเครื่องเสีย
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openModalForMachine(selectedAssessment?.machineId || machines[0]?.id || 'm-01')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>+ บันทึกค่าตรวจวัดสภาพ</span>
            </button>

            <button
              type="button"
              disabled={isExportingPdf}
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer whitespace-nowrap"
            >
              {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{isExportingPdf ? 'กำลังสร้าง PDF...' : 'บันทึกเป็น PDF (FM-MN01-09)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Educational Explanation Card: What is PdM & How it compares to CM/PM */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <button
          type="button"
          onClick={() => setShowConceptGuide((v) => !v)}
          className="w-full px-5 py-3.5 flex items-center justify-between gap-3 text-left bg-slate-50/70 hover:bg-slate-100/70 transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-sm font-bold text-slate-900">
              การบำรุงรักษาเชิงพยากรณ์ (Predictive Maintenance : PdM) คืออะไร? ต่างจาก CM และ PM อย่างไร?
            </span>
          </div>
          {showConceptGuide ? (
            <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
          )}
        </button>

        {showConceptGuide && (
          <div className="p-5 border-t border-slate-200 space-y-4">
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              <strong className="text-slate-900">การบำรุงรักษาเชิงพยากรณ์ (PdM)</strong> คือ การตรวจวัดค่าทางกายภาพของเครื่องจักร<strong>ขณะกำลังเดินเครื่อง</strong> (เช่น ความสั่นสะเทือน, อุณหภูมิตลับลูกปืน, กระแสไฟฟ้ามอเตอร์, แรงดันลม และสภาพน้ำมัน/เสียงดัง) ร่วมกับประวัติความผิดปกติ เพื่อนำมาวิเคราะห์<strong>แนวโน้มการเสื่อมสภาพล่วงหน้า</strong> ช่วยให้ทีมช่างเปลี่ยนอะไหล่ได้ <em>&quot;ก่อนเครื่องจักรจะหยุดกะทันหัน&quot;</em> และไม่เปลี่ยนทิ้งเร็วเกินความจำเป็น
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
                <div className="font-bold text-slate-900">1. CM (ซ่อมเมื่อเสีย — Corrective)</div>
                <div className="text-slate-600">รอเครื่องพังก่อนแล้วค่อยซ่อมตามใบแจ้งซ่อม (FM-MN01-03) เสี่ยงไลน์ผลิตหยุดกะทันหันและค่าเสียหายสูง</div>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
                <div className="font-bold text-slate-900">2. PM (ซ่อมตามรอบเวลา — Preventive)</div>
                <div className="text-slate-600">ตรวจเช็คและเปลี่ยนอะไหล่ตามปฏิทินทุกเดือน/ปี (FM-MN01-02) ลดโอกาสพังได้ แต่อาจเปลี่ยนก่อนถึงเวลา</div>
              </div>
              <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 space-y-1">
                <div className="font-bold text-blue-900">3. PdM (เชิงพยากรณ์ — Predictive)</div>
                <div className="text-slate-700">วัดสภาพจริงและใช้สถิติทำนายจุดเสื่อมล่วงหน้า วางแผนหยุดซ่อมเฉพาะเครื่องที่มีสัญญาณเตือน ไม่เสียโอกาสการผลิต</div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px] pt-1">
              <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-blue-600" /> สั่นสะเทือน (ISO 10816)
                </div>
                <div className="text-slate-600 font-mono mt-0.5">&lt;2.8 ปกติ · 2.8-4.5 ระวัง · &gt;4.5 อันตราย</div>
              </div>
              <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <Thermometer className="w-3.5 h-3.5 text-rose-600" /> อุณหภูมิมอเตอร์/ลูกปืน
                </div>
                <div className="text-slate-600 font-mono mt-0.5">&lt;65°C ปกติ · 65-80°C ระวัง · &gt;80°C อันตราย</div>
              </div>
              <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-600" /> กระแสไฟฟ้า (Ampere)
                </div>
                <div className="text-slate-600 font-mono mt-0.5">&lt;90% ปกติ · ≥90% โหลดสูง · ≥100% เกินพิกัด</div>
              </div>
              <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-indigo-600" /> น้ำมัน / เสียง / แรงดัน
                </div>
                <div className="text-slate-600 font-mono mt-0.5">ตรวจเศษโลหะ + เสียงหอน + แรงดัน &lt;5 bar</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KPI Summary Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setRiskFilter('all')}
          className={`text-left bg-white p-4 rounded-xl border transition cursor-pointer ${
            riskFilter === 'all' ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs text-slate-500 font-medium">ดัชนีสุขภาพเฉลี่ยโรงงาน (Health Index)</div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 mt-1 tabular-nums">{stats.avgHealth}%</div>
          <div className="text-[11px] text-slate-500 mt-0.5">ติดตามทั้งหมด {stats.total} เครื่อง</div>
        </button>

        <button
          type="button"
          onClick={() => setRiskFilter('critical')}
          className={`text-left bg-white p-4 rounded-xl border transition cursor-pointer ${
            riskFilter === 'critical' ? 'border-rose-500 ring-2 ring-rose-100' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>เสี่ยงสูง · ต้องวางแผนซ่อม (&lt;55%)</span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-rose-600 mt-1 tabular-nums">{stats.critical} เครื่อง</div>
          <div className="text-[11px] text-rose-700 mt-0.5">ควรเปิดใบแจ้งซ่อมล่วงหน้า</div>
        </button>

        <button
          type="button"
          onClick={() => setRiskFilter('watch')}
          className={`text-left bg-white p-4 rounded-xl border transition cursor-pointer ${
            riskFilter === 'watch' ? 'border-amber-500 ring-2 ring-amber-100' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>เฝ้าระวังแนวโน้มเสื่อม (55-79%)</span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-amber-700 mt-1 tabular-nums">{stats.watch} เครื่อง</div>
          <div className="text-[11px] text-amber-700 mt-0.5">ตรวจวัดซ้ำภายใน 7 วัน</div>
        </button>

        <button
          type="button"
          onClick={() => setRiskFilter('healthy')}
          className={`text-left bg-white p-4 rounded-xl border transition cursor-pointer ${
            riskFilter === 'healthy' ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>สภาพปกติสมบูรณ์ (≥80%)</span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-700 mt-1 tabular-nums">{stats.healthy} เครื่อง</div>
          <div className="text-[11px] text-emerald-700 mt-0.5">เดินเครื่องผลิตได้ต่อเนื่อง</div>
        </button>
      </div>

      {/* Main Split Workspace: Risk Priority List + Detail & Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Risk-Sorted Machine Assessment Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">ลำดับความเสี่ยงและพยากรณ์ความเสื่อมเครื่องจักร</h2>
              <p className="text-[11px] text-slate-500">เรียงจากคะแนนสุขภาพต่ำสุด (เสี่ยงมากสุด) ไปหาปกติ · คลิกแถวเพื่อดูกราฟแนวโน้ม</p>
            </div>
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหา Tag, ชื่อเครื่อง, อาการ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200 z-10">
                <tr>
                  <th className="py-2.5 px-3 font-bold">เครื่องจักร</th>
                  <th className="py-2.5 px-2 font-bold text-center">Health Index</th>
                  <th className="py-2.5 px-2 font-bold text-center">ค่าตรวจล่าสุด</th>
                  <th className="py-2.5 px-3 font-bold">การคาดการณ์ / จุดเสี่ยง</th>
                  <th className="py-2.5 px-3 font-bold text-right">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssessments.map((item) => {
                  const isSelected = selectedAssessment?.machineId === item.machineId;
                  return (
                    <tr
                      key={item.machineId}
                      onClick={() => setSelectedMachineId(item.machineId)}
                      className={`cursor-pointer transition ${
                        isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                            {item.tagCode}
                          </span>
                          <span className="truncate max-w-[130px]">{item.name}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                          {item.code} · {item.department}
                        </div>
                      </td>

                      <td className="py-2.5 px-2 text-center">
                        <div className="font-mono font-extrabold text-sm tabular-nums text-slate-900">
                          {item.healthScore}%
                        </div>
                        <div className="w-16 h-1.5 bg-slate-200 rounded-full mx-auto mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.riskLevel === 'critical'
                                ? 'bg-rose-600'
                                : item.riskLevel === 'watch'
                                ? 'bg-amber-500'
                                : 'bg-emerald-600'
                            }`}
                            style={{ width: `${item.healthScore}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-2.5 px-2 text-center font-mono text-[11px] tabular-nums">
                        {item.latestReading ? (
                          <div className="space-y-0.5">
                            <div className="text-slate-800 font-semibold">
                              {item.latestReading.vibrationRms.toFixed(1)} mm/s
                            </div>
                            <div className="text-slate-500">
                              {item.latestReading.temperatureC}°C · {item.latestReading.currentAmp}A
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">ยังไม่มีค่าวัด</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800 line-clamp-1">{item.predictedComponent}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5 tabular-nums">
                          RUL ~{item.estimatedRulDays} วัน · X:{item.abnormalCheckCount} · งานซ่อม:{item.recentTicketCount}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        {renderRiskBadge(item.riskLevel)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Selected Machine Deep Analysis + Trend Chart + Logs */}
        {selectedAssessment && (
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="text-xs font-mono text-slate-500">
                  {selectedAssessment.tagCode} · {selectedAssessment.code} · {selectedAssessment.department}
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
                  {selectedAssessment.name}
                </h3>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-black font-mono tabular-nums text-slate-900">
                  {selectedAssessment.healthScore}%
                </div>
                {renderRiskBadge(selectedAssessment.riskLevel)}
              </div>
            </div>

            {/* Prediction Summary */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">คาดการณ์ชิ้นส่วนเสี่ยงเสื่อม:</span>
                <span className="font-mono font-bold text-blue-700 tabular-nums">
                  อายุใช้งานคงเหลือ ~{selectedAssessment.estimatedRulDays} วัน
                </span>
              </div>
              <div className="font-bold text-slate-900">{selectedAssessment.predictedComponent}</div>
              <div className="text-slate-600">
                <span className="font-semibold text-slate-800">คำแนะนำเชิงพยากรณ์:</span> {selectedAssessment.recommendedAction}
              </div>
              <div className="pt-1 border-t border-slate-200 space-y-1">
                {selectedAssessment.signals.map((sig, idx) => (
                  <div key={idx} className="text-[11px] text-slate-700 flex items-start gap-1.5">
                    <span className="text-slate-400 font-bold">•</span>
                    <span>{sig}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pure SVG Trend Chart (Vibration + Temperature) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span>แนวโน้มความสั่น (mm/s) และอุณหภูมิ (°C)</span>
                </span>
                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <span className="text-blue-700 font-bold">— สั่น mm/s</span>
                  <span className="text-rose-600 font-bold">— อุณหภูมิ °C</span>
                </div>
              </div>

              {trendChart ? (
                <div className="border border-slate-200 rounded-xl p-2 bg-slate-50/40">
                  <svg viewBox={`0 0 ${trendChart.width} ${trendChart.height}`} className="w-full h-40">
                    {/* ISO 10816 Critical 4.5 mm/s Threshold */}
                    <line
                      x1={trendChart.padX}
                      y1={trendChart.critLineY}
                      x2={trendChart.width - trendChart.padX}
                      y2={trendChart.critLineY}
                      stroke="#dc2626"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text x={trendChart.padX} y={trendChart.critLineY - 3} fontSize="9" fill="#dc2626" fontWeight="bold">
                      เกณฑ์อันตราย 4.5 mm/s
                    </text>

                    {/* ISO 10816 Watch 2.8 mm/s Threshold */}
                    <line
                      x1={trendChart.padX}
                      y1={trendChart.watchLineY}
                      x2={trendChart.width - trendChart.padX}
                      y2={trendChart.watchLineY}
                      stroke="#d97706"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                    <text x={trendChart.padX} y={trendChart.watchLineY - 3} fontSize="9" fill="#d97706" fontWeight="bold">
                      เกณฑ์เฝ้าระวัง 2.8 mm/s
                    </text>

                    {/* Temperature Line */}
                    <path d={trendChart.tempPath} fill="none" stroke="#e11d48" strokeWidth="2" />
                    {trendChart.pts.map((p, i) => (
                      <g key={`t-${p.id}`}>
                        <circle cx={trendChart.getX(i)} cy={trendChart.tempY(p.temperatureC)} r="3.5" fill="#e11d48" />
                        <text
                          x={trendChart.getX(i)}
                          y={trendChart.tempY(p.temperatureC) - 7}
                          textAnchor="middle"
                          fontSize="9"
                          fill="#be123c"
                          fontWeight="bold"
                        >
                          {p.temperatureC}°
                        </text>
                      </g>
                    ))}

                    {/* Vibration Line */}
                    <path d={trendChart.vibPath} fill="none" stroke="#2563eb" strokeWidth="2.5" />
                    {trendChart.pts.map((p, i) => (
                      <g key={`v-${p.id}`}>
                        <circle cx={trendChart.getX(i)} cy={trendChart.vibY(p.vibrationRms)} r="4" fill="#2563eb" />
                        <text
                          x={trendChart.getX(i)}
                          y={trendChart.vibY(p.vibrationRms) + 12}
                          textAnchor="middle"
                          fontSize="9"
                          fill="#1d4ed8"
                          fontWeight="bold"
                        >
                          {p.vibrationRms.toFixed(1)}
                        </text>
                        <text
                          x={trendChart.getX(i)}
                          y={trendChart.height - 4}
                          textAnchor="middle"
                          fontSize="8"
                          fill="#64748b"
                        >
                          {p.recordedAt.slice(5, 10)}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              ) : (
                <div className="border border-dashed border-slate-300 rounded-xl p-5 text-center text-xs text-slate-500">
                  ยังไม่มีประวัติการตรวจวัดสภาพด้วยเครื่องมือสำหรับเครื่องนี้ กดปุ่ม &quot;+ บันทึกค่าตรวจวัด&quot; เพื่อเริ่มเก็บแนวโน้ม
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openModalForMachine(selectedAssessment.machineId)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                <Gauge className="w-4 h-4" />
                <span>+ บันทึกค่าตรวจวัดเครื่องนี้</span>
              </button>

              <button
                type="button"
                onClick={() => handleCreatePredictiveTicket(selectedAssessment)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                <Wrench className="w-4 h-4" />
                <span>ออกใบซ่อมล่วงหน้า (FM-MN01-03)</span>
              </button>
            </div>

            {/* History Logs for Selected Machine */}
            {selectedAssessment.historyReadings.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-800">
                  ประวัติการวัดสภาพล่าสุด ({selectedAssessment.historyReadings.length} ครั้ง)
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                  {[...selectedAssessment.historyReadings].reverse().map((r) => (
                    <div key={r.id} className="p-2.5 text-[11px] flex items-start justify-between gap-2 bg-white">
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-mono font-bold text-slate-900 tabular-nums">
                          {r.recordedAt} · สั่น {r.vibrationRms} mm/s · {r.temperatureC}°C · {r.currentAmp}A
                          {typeof r.pressureBar === 'number' ? ` · ${r.pressureBar} bar` : ''}
                        </div>
                        <div className="text-slate-500">
                          ผู้ตรวจ: {r.inspectorName} · เสียง:{' '}
                          {r.noiseStatus === 'abnormal' ? 'ผิดปกติ' : r.noiseStatus === 'moderate' ? 'เริ่มดัง' : 'ปกติ'} · น้ำมัน:{' '}
                          {r.oilCondition === 'metal_debris' ? 'พบเศษโลหะ' : r.oilCondition === 'dark' ? 'สีคล้ำ' : 'ใสปกติ'}
                        </div>
                        {r.notes && <div className="text-slate-700">{r.notes}</div>}
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteReading(r.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer shrink-0"
                        title="ลบรายการวัดนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================
          RECORD CONDITION READING MODAL
         ======================================================================== */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm sm:text-base font-extrabold">บันทึกค่าตรวจวัดสภาพเครื่องจักร (PdM Inspection)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRecordModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveReading} className="p-5 space-y-3.5 overflow-y-auto text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">เครื่องจักรที่ตรวจวัด *</label>
                <select
                  value={formMachineId}
                  onChange={(e) => setFormMachineId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 font-semibold text-slate-900"
                >
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.tagCode ? `${m.tagCode} - ` : ''}{m.name} ({m.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ความสั่นสะเทือน (mm/s RMS) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={formVibration}
                    onChange={(e) => setFormVibration(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono"
                  />
                  <span className="text-[10px] text-slate-500">&lt;2.8 ปกติ · ≥2.8 เฝ้าระวัง · &gt;4.5 อันตราย</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    อุณหภูมิมอเตอร์/แบริ่ง (°C) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={formTemp}
                    onChange={(e) => setFormTemp(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono"
                  />
                  <span className="text-[10px] text-slate-500">&lt;65°C ปกติ · 65-80°C ระวัง · &gt;80°C อันตราย</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">กระแสจริง (A)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formCurrentAmp}
                    onChange={(e) => setFormCurrentAmp(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">พิกัด Rated (A)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formRatedAmp}
                    onChange={(e) => setFormRatedAmp(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">แรงดันลม (Bar)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formPressure}
                    onChange={(e) => setFormPressure(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5 text-slate-500" /> สภาพเสียงเครื่องจักร
                  </label>
                  <select
                    value={formNoise}
                    onChange={(e) => setFormNoise(e.target.value as NoiseStatus)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  >
                    <option value="normal">ปกติ (Normal)</option>
                    <option value="moderate">เริ่มมีเสียงเสียดสี/ดังขึ้น</option>
                    <option value="abnormal">เสียงหอน/กระแทกผิดปกติ</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-slate-500" /> สภาพน้ำมัน/จาระบี
                  </label>
                  <select
                    value={formOil}
                    onChange={(e) => setFormOil(e.target.value as OilConditionStatus)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  >
                    <option value="clean">ใส/สะอาด ปกติ</option>
                    <option value="dark">สีคล้ำ/เสื่อมสภาพ</option>
                    <option value="metal_debris">พบเศษโลหะปนเปื้อน (สึกหรอ)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ผู้ตรวจวัด / วิศวกร</label>
                <input
                  type="text"
                  required
                  value={formInspector}
                  onChange={(e) => setFormInspector(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">หมายเหตุ / จุดที่พบความผิดปกติ</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="ระบุตำแหน่งตลับลูกปืน มอเตอร์ หรือข้อเสนอแนะ..."
                  className="w-full border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                >
                  {isSaving ? 'กำลังบันทึก...' : 'บันทึกผลการตรวจวัด'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================
          HIDDEN 1-PAGE A4 LANDSCAPE PDF REPORT (FM-MN01-09)
         ======================================================================== */}
      <div className="hidden" aria-hidden="true">
        <div ref={pdfReportRef} className="w-[1122px] bg-white p-6 text-slate-900 font-sans">
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2.5 mb-3">
            <KochLogo size="md" variant="full" textColor="dark" />
            <div className="text-center flex-1 px-3">
              <div className="text-lg font-extrabold">รายงานการบำรุงรักษาเชิงพยากรณ์ (PREDICTIVE MAINTENANCE REPORT)</div>
              <div className="text-xs text-slate-600">
                โรงงานบางแสน BS · วิเคราะห์สภาพเครื่องจักร ISO 10816-3 &amp; แนวโน้มความเสื่อมล่วงหน้า
              </div>
            </div>
            <div className="border border-slate-900 rounded px-2.5 py-1.5 text-[10px] leading-tight min-w-[190px]">
              <div className="flex justify-between gap-2 border-b border-slate-300 pb-0.5 mb-0.5">
                <span className="font-semibold">หมายเลขเอกสาร:</span>
                <span className="font-mono font-bold">FM-MN01-09</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>แก้ไขครั้งที่:</span>
                <span className="font-mono font-semibold">Rev.00 · 19/10/2026</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>ดัชนีสุขภาพเฉลี่ย:</span>
                <span className="font-mono font-bold">{stats.avgHealth}% (หน้า 1 / 1)</span>
              </div>
            </div>
          </div>

          <table className="w-full border-collapse border border-slate-900 text-[10px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-900 py-1.5 px-1.5 w-14 text-center">Tag</th>
                <th className="border border-slate-900 py-1.5 px-2 w-36 text-left">ชื่อเครื่องจักร / รหัส</th>
                <th className="border border-slate-900 py-1.5 px-1.5 w-16 text-center">Health %</th>
                <th className="border border-slate-900 py-1.5 px-1.5 w-16 text-center">สั่น mm/s</th>
                <th className="border border-slate-900 py-1.5 px-1.5 w-14 text-center">อุณหภูมิ</th>
                <th className="border border-slate-900 py-1.5 px-1.5 w-16 text-center">RUL (วัน)</th>
                <th className="border border-slate-900 py-1.5 px-2 text-left">จุดเสื่อมที่คาดการณ์</th>
                <th className="border border-slate-900 py-1.5 px-2 text-left">แนวทางแก้ไขเชิงพยากรณ์</th>
                <th className="border border-slate-900 py-1.5 px-1.5 w-24 text-center">ระดับความเสี่ยง</th>
              </tr>
            </thead>
            <tbody>
              {assessments.slice(0, 16).map((a) => (
                <tr key={a.machineId}>
                  <td className="border border-slate-900 py-1.5 px-1.5 text-center font-mono font-bold">{a.tagCode}</td>
                  <td className="border border-slate-900 py-1.5 px-2">
                    <div className="font-bold">{a.name}</div>
                    <div className="text-[9px] font-mono text-slate-600">{a.code}</div>
                  </td>
                  <td className="border border-slate-900 py-1.5 px-1.5 text-center font-mono font-bold">{a.healthScore}%</td>
                  <td className="border border-slate-900 py-1.5 px-1.5 text-center font-mono">
                    {a.latestReading ? a.latestReading.vibrationRms.toFixed(1) : '-'}
                  </td>
                  <td className="border border-slate-900 py-1.5 px-1.5 text-center font-mono">
                    {a.latestReading ? `${a.latestReading.temperatureC}°C` : '-'}
                  </td>
                  <td className="border border-slate-900 py-1.5 px-1.5 text-center font-mono">~{a.estimatedRulDays}</td>
                  <td className="border border-slate-900 py-1.5 px-2">{a.predictedComponent}</td>
                  <td className="border border-slate-900 py-1.5 px-2">{a.recommendedAction}</td>
                  <td className="border border-slate-900 py-1.5 px-1.5 text-center font-bold">
                    {a.riskLevel === 'critical' ? 'เสี่ยงสูง' : a.riskLevel === 'watch' ? 'เฝ้าระวัง' : 'ปกติ'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-3 gap-6 pt-4 mt-4 border-t border-slate-300 text-[10px] text-center">
            <div>
              <div className="border-b border-dotted border-slate-700 h-5 mx-6 mb-1"></div>
              <div className="font-bold">ผู้ตรวจวัดสภาพ (ทีมวิศวกรรมซ่อมบำรุง PdM)</div>
            </div>
            <div>
              <div className="border-b border-dotted border-slate-700 h-5 mx-6 mb-1"></div>
              <div className="font-bold">หัวหน้าแผนกซ่อมบำรุง</div>
            </div>
            <div>
              <div className="border-b border-dotted border-slate-700 h-5 mx-6 mb-1"></div>
              <div className="font-bold">ผู้จัดการโรงงาน (ผู้อนุมัติ)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
