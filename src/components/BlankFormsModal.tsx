import React, { useRef, useState } from 'react';
import {
  X,
  Download,
  Printer,
  FileSpreadsheet,
  Loader2,
  ClipboardList,
  Calendar,
  History,
  Wrench,
  CheckSquare,
  Package,
  Layers,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { MachineAsset } from '../types/ticket';
import { DEFAULT_INSPECTION_ITEMS, SLOT_INSPECTION_ITEMS, CUTTING_INSPECTION_ITEMS } from '../types/inspection';
import { AUDIT_CHECKLIST_ITEMS } from '../data/initialAuditChecklist';
import { KochLogo } from './KochLogo';
import { exportElementToPdf, printElementOnly } from '../utils/pdfExport';

interface BlankFormsModalProps {
  onClose: () => void;
  machines?: MachineAsset[];
}

type BlankFormKey =
  | 'fm_mn01_01'
  | 'fm_mn01_02_pm'
  | 'fm_mn01_02_history'
  | 'fm_mn01_03'
  | 'fm_mn01_04'
  | 'fm_mn01_06'
  | 'fm_mn01_07'
  | 'fm_iso_audit';

interface FormCatalogItem {
  key: BlankFormKey;
  code: string;
  title: string;
  subtitle: string;
  orientation: 'portrait' | 'landscape';
  fileName: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  icon: React.ReactNode;
}

const FORM_CATALOG: FormCatalogItem[] = [
  {
    key: 'fm_mn01_01',
    code: 'FM-MN01-01',
    title: 'ทะเบียนเครื่องมือ-เครื่องจักร',
    subtitle: 'ตารางบันทึกข้อมูลรหัสทรัพย์สิน ชื่อเครื่อง รุ่น และ Serial No.',
    orientation: 'portrait',
    fileName: 'FM-MN01-01_แบบฟอร์มเปล่า_ทะเบียนเครื่องมือเครื่องจักร.pdf',
    accentBg: 'bg-blue-50',
    accentText: 'text-blue-700',
    accentBorder: 'border-blue-200',
    icon: <ClipboardList className="w-4 h-4 text-blue-600" />
  },
  {
    key: 'fm_mn01_02_pm',
    code: 'FM-MN01-02 (PM)',
    title: 'แผนบำรุงรักษาเครื่องจักรประจำปี (Plan vs Act)',
    subtitle: 'ตารางแผนซ่อมบำรุงเชิงป้องกัน 12 เดือน (ม.ค. - ธ.ค.) แถว P / A',
    orientation: 'landscape',
    fileName: 'FM-MN01-02_แบบฟอร์มเปล่า_แผนPMประจำปี.pdf',
    accentBg: 'bg-indigo-50',
    accentText: 'text-indigo-700',
    accentBorder: 'border-indigo-200',
    icon: <Calendar className="w-4 h-4 text-indigo-600" />
  },
  {
    key: 'fm_mn01_02_history',
    code: 'FM-MN01-02 (History)',
    title: 'ใบประวัติการซ่อมบำรุงและบริการเครื่องจักร',
    subtitle: 'บันทึกข้อมูลเครื่องจักร อาการเสีย การแก้ไข อะไหล่ และผู้ตรวจรับ',
    orientation: 'portrait',
    fileName: 'FM-MN01-02_แบบฟอร์มเปล่า_ประวัติการซ่อมเครื่องจักร.pdf',
    accentBg: 'bg-sky-50',
    accentText: 'text-sky-700',
    accentBorder: 'border-sky-200',
    icon: <History className="w-4 h-4 text-sky-600" />
  },
  {
    key: 'fm_mn01_03',
    code: 'FM-MN01-03',
    title: 'ใบแจ้งซ่อม (Maintenance Repair Request)',
    subtitle: 'แบบฟอร์มแจ้งซ่อมหน้างาน วิเคราะห์สาเหตุ อะไหล่ และลายเซ็น 3 ฝ่าย',
    orientation: 'portrait',
    fileName: 'FM-MN01-03_แบบฟอร์มเปล่า_ใบแจ้งซ่อม.pdf',
    accentBg: 'bg-rose-50',
    accentText: 'text-rose-700',
    accentBorder: 'border-rose-200',
    icon: <Wrench className="w-4 h-4 text-rose-600" />
  },
  {
    key: 'fm_mn01_04',
    code: 'FM-MN01-04',
    title: 'ใบตรวจเช็คเครื่องจักรประจำวัน (วันที่ 1-31)',
    subtitle: 'แบบฟอร์มตรวจเช็คสภาพก่อนเดินเครื่อง 31 วัน (เลือกหัวข้อตามเครื่องได้)',
    orientation: 'landscape',
    fileName: 'FM-MN01-04_แบบฟอร์มเปล่า_ตรวจเช็คประจำวัน.pdf',
    accentBg: 'bg-emerald-50',
    accentText: 'text-emerald-700',
    accentBorder: 'border-emerald-200',
    icon: <CheckSquare className="w-4 h-4 text-emerald-600" />
  },
  {
    key: 'fm_mn01_06',
    code: 'FM-MN01-06',
    title: 'ใบตรวจนับสต็อกและเบิก-รับสแปร์พาร์ท',
    subtitle: 'ตารางบันทึกยอดยกมา รับเข้า เบิกออก และคงเหลืออะไหล่หน้าคลัง',
    orientation: 'landscape',
    fileName: 'FM-MN01-06_แบบฟอร์มเปล่า_สต็อกและเบิกสแปร์พาร์ท.pdf',
    accentBg: 'bg-amber-50',
    accentText: 'text-amber-700',
    accentBorder: 'border-amber-200',
    icon: <Package className="w-4 h-4 text-amber-600" />
  },
  {
    key: 'fm_mn01_07',
    code: 'FM-MN01-07',
    title: 'รายการอะไหล่ประจำเครื่องจักร (Machine BOM)',
    subtitle: 'ตารางรายการอะไหล่สำคัญประจำเครื่อง รอบเปลี่ยน และบันทึกการเปลี่ยน',
    orientation: 'landscape',
    fileName: 'FM-MN01-07_แบบฟอร์มเปล่า_รายการอะไหล่ประจำเครื่อง.pdf',
    accentBg: 'bg-teal-50',
    accentText: 'text-teal-700',
    accentBorder: 'border-teal-200',
    icon: <Layers className="w-4 h-4 text-teal-600" />
  },
  {
    key: 'fm_iso_audit',
    code: 'FM-ISO-AUDIT-MN01',
    title: 'แบบประเมินความพร้อม ISO 9001:2015 Audit',
    subtitle: 'รายการตรวจประเมิน 8 ข้อ (Clause 6.1, 6.2, 7.3.1) พร้อมช่องบันทึกผล C/O/NC',
    orientation: 'portrait',
    fileName: 'FM-ISO-AUDIT-MN01_แบบฟอร์มเปล่า_ประเมินISO9001.pdf',
    accentBg: 'bg-violet-50',
    accentText: 'text-violet-700',
    accentBorder: 'border-violet-200',
    icon: <ShieldCheck className="w-4 h-4 text-violet-600" />
  }
];

const MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const DAYS_31 = Array.from({ length: 31 }, (_, i) => i + 1);

export const BlankFormsModal: React.FC<BlankFormsModalProps> = ({ onClose, machines = [] }) => {
  const [busyKey, setBusyKey] = useState<BlankFormKey | null>(null);
  const [doneKey, setDoneKey] = useState<BlankFormKey | null>(null);
  const [selectedDailyMachineId, setSelectedDailyMachineId] = useState<string>('standard');

  const refs: Record<BlankFormKey, React.RefObject<HTMLDivElement | null>> = {
    fm_mn01_01: useRef<HTMLDivElement>(null),
    fm_mn01_02_pm: useRef<HTMLDivElement>(null),
    fm_mn01_02_history: useRef<HTMLDivElement>(null),
    fm_mn01_03: useRef<HTMLDivElement>(null),
    fm_mn01_04: useRef<HTMLDivElement>(null),
    fm_mn01_06: useRef<HTMLDivElement>(null),
    fm_mn01_07: useRef<HTMLDivElement>(null),
    fm_iso_audit: useRef<HTMLDivElement>(null)
  };

  const selectedDailyMachine = machines.find((m) => m.id === selectedDailyMachineId);
  const dailyTemplateItems = React.useMemo(() => {
    if (selectedDailyMachineId === 'blank_rows') {
      return Array.from({ length: 10 }, (_, idx) => ({
        no: idx + 1,
        description: '',
        criteria: '',
        frequency: ''
      }));
    }
    if (selectedDailyMachine) {
      const mName = `${selectedDailyMachine.tagCode || ''} ${selectedDailyMachine.name}`.toLowerCase();
      if (mName.includes('slot') || selectedDailyMachine.code === 'MA2312014') {
        return SLOT_INSPECTION_ITEMS;
      }
      if (mName.includes('cutting') || selectedDailyMachine.code === 'MA2312001') {
        return CUTTING_INSPECTION_ITEMS;
      }
    }
    return DEFAULT_INSPECTION_ITEMS;
  }, [selectedDailyMachineId, selectedDailyMachine]);

  const handleDownloadBlankPdf = async (item: FormCatalogItem) => {
    const el = refs[item.key].current;
    if (!el) return;
    setBusyKey(item.key);
    try {
      await exportElementToPdf(el, item.fileName, {
        orientation: item.orientation,
        fitToOnePage: true,
        marginMm: item.orientation === 'landscape' ? 5 : 6
      });
      setDoneKey(item.key);
      setTimeout(() => setDoneKey((prev) => (prev === item.key ? null : prev)), 2500);
    } finally {
      setBusyKey(null);
    }
  };

  const handlePrintBlank = (item: FormCatalogItem) => {
    const el = refs[item.key].current;
    if (!el) return;
    printElementOnly(el, item.fileName.replace('.pdf', ''), item.orientation);
  };

  const DocControlBox = ({
    code,
    rev = 'Rev.00',
    effDate = '19/10/2026'
  }: {
    code: string;
    rev?: string;
    effDate?: string;
  }) => (
    <div className="border border-slate-900 rounded px-2.5 py-1.5 text-[10px] leading-tight shrink-0 bg-white text-slate-900 min-w-[195px]">
      <div className="flex justify-between gap-2 border-b border-slate-300 pb-0.5 mb-0.5">
        <span className="font-semibold text-slate-600">หมายเลขเอกสาร:</span>
        <span className="font-mono font-bold text-slate-900">{code}</span>
      </div>
      <div className="flex justify-between gap-2">
        <span className="text-slate-600">แก้ไขครั้งที่ / วันที่มีผล:</span>
        <span className="font-mono font-semibold">{rev} • {effDate}</span>
      </div>
      <div className="flex justify-between gap-2 text-slate-500 mt-0.5">
        <span>สถานะฟอร์ม:</span>
        <span className="font-mono font-bold">แบบฟอร์มเปล่า (1 / 1)</span>
      </div>
    </div>
  );

  const SignatureRow = ({
    left,
    center,
    right
  }: {
    left: string;
    center: string;
    right: string;
  }) => (
    <div className="grid grid-cols-3 gap-6 pt-3 mt-3 border-t border-slate-300 text-[10px] text-center text-slate-800">
      <div>
        <div className="border-b border-dotted border-slate-700 h-5 mx-4 mb-1"></div>
        <div>(......................................................)</div>
        <div className="font-bold mt-0.5">{left}</div>
        <div className="text-slate-500">วันที่ ........../........../..........</div>
      </div>
      <div>
        <div className="border-b border-dotted border-slate-700 h-5 mx-4 mb-1"></div>
        <div>(......................................................)</div>
        <div className="font-bold mt-0.5">{center}</div>
        <div className="text-slate-500">วันที่ ........../........../..........</div>
      </div>
      <div>
        <div className="border-b border-dotted border-slate-700 h-5 mx-4 mb-1"></div>
        <div>(......................................................)</div>
        <div className="font-bold mt-0.5">{right}</div>
        <div className="text-slate-500">วันที่ ........../........../..........</div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white px-5 py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl shrink-0">
              <FileSpreadsheet className="w-6 h-6 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight truncate">
                ดาวน์โหลดแบบฟอร์มเปล่า KOCH (Blank Forms Center)
              </h2>
              <p className="text-xs text-slate-300 truncate">
                แบบฟอร์มเปล่าขนาด A4 (1 หน้า) ครบทุกเอกสารซ่อมบำรุง สำหรับพิมพ์หรือโหลด PDF นำไปกรอกข้อมูลภาคสนาม
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer shrink-0"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Daily Form Machine Option Strip */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="text-xs text-slate-600 flex items-center gap-1.5">
            <span className="font-bold text-slate-800">ตั้งค่าหัวข้อใบตรวจเช็คประจำวัน (FM-MN01-04):</span>
            <span>เลือกรูปแบบช่องตรวจก่อนดาวน์โหลดได้</span>
          </div>
          <select
            value={selectedDailyMachineId}
            onChange={(e) => setSelectedDailyMachineId(e.target.value)}
            className="text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            <option value="standard">หัวข้อมาตรฐานกลาง KOCH (10 ข้อมาตรฐาน • ช่องวันที่ว่าง)</option>
            <option value="blank_rows">ตารางเปล่าล้วน 10 แถว (ไม่ระบุหัวข้อ • เขียนเอง)</option>
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                ระบุชื่อเครื่อง: {m.tagCode ? `${m.tagCode} - ` : ''}{m.name} ({m.code})
              </option>
            ))}
          </select>
        </div>

        {/* Form Cards Grid */}
        <div className="p-4 sm:p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-slate-100/60">
          {FORM_CATALOG.map((item) => {
            const isBusy = busyKey === item.key;
            const isDone = doneKey === item.key;
            return (
              <div
                key={item.key}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:shadow-md transition flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`p-2.5 rounded-xl border ${item.accentBg} ${item.accentBorder} shrink-0`}>
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className={`text-[11px] font-mono font-extrabold px-2 py-0.5 rounded-md border ${item.accentBg} ${item.accentText} ${item.accentBorder}`}>
                          {item.code}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                          {item.orientation === 'landscape' ? 'A4 แนวนอน (1 หน้า)' : 'A4 แนวตั้ง (1 หน้า)'}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">{item.title}</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{item.subtitle}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleDownloadBlankPdf(item)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      isDone
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                    } disabled:opacity-60`}
                  >
                    {isBusy ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>กำลังสร้าง PDF...</span>
                      </>
                    ) : isDone ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ดาวน์โหลด PDF แล้ว</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>ดาวน์โหลด PDF ฟอร์มเปล่า</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePrintBlank(item)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition cursor-pointer shrink-0"
                    title="สั่งพิมพ์แบบฟอร์มเปล่าทันที"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>พิมพ์</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>ทุกแบบฟอร์มถูกจัดหน้าเป็น 1 หน้ากระดาษ A4 อัตโนมัติ พร้อมช่องกรอกและช่องลงนามตามมาตรฐาน KOCH</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>

      {/* ========================================================================
          HIDDEN OFF-SCREEN PRINTABLE BLANK A4 TEMPLATES (Captured by html2canvas / printElementOnly)
         ======================================================================== */}
      <div className="hidden" aria-hidden="true">
        {/* 1. FM-MN01-01 ทะเบียนเครื่องมือ-เครื่องจักร (A4 Portrait) */}
        <div ref={refs.fm_mn01_01} className="w-[794px] bg-white p-6 text-slate-900 font-sans">
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2.5 mb-3">
            <KochLogo size="md" variant="full" textColor="dark" />
            <div className="text-center flex-1 px-2">
              <div className="text-base font-extrabold">ทะเบียนเครื่องมือ - เครื่องจักร (แบบฟอร์มเปล่า)</div>
              <div className="text-[11px] font-semibold text-slate-600">MACHINE &amp; EQUIPMENT REGISTRY FORM • โรงงานบางแสน BS</div>
            </div>
            <DocControlBox code="FM-MN01-01" />
          </div>
          <div className="flex justify-between text-[11px] mb-2 font-semibold">
            <span>แผนก / พื้นที่: ...................................................................</span>
            <span>ประจำปี / รอบตรวจ: .................................</span>
          </div>
          <table className="w-full border-collapse border border-slate-900 text-[11px]">
            <thead>
              <tr className="bg-slate-100 text-slate-900">
                <th className="border border-slate-900 py-1.5 px-1.5 w-10 text-center">ลำดับ</th>
                <th className="border border-slate-900 py-1.5 px-2 w-24 text-center">รหัสเครื่อง (Tag)</th>
                <th className="border border-slate-900 py-1.5 px-2 text-left">ชื่อเครื่องมือ / เครื่องจักร</th>
                <th className="border border-slate-900 py-1.5 px-2 w-28 text-center">รุ่น (Model)</th>
                <th className="border border-slate-900 py-1.5 px-2 w-28 text-center">รหัสทรัพย์สิน / S/N</th>
                <th className="border border-slate-900 py-1.5 px-2 w-28 text-center">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 20 }, (_, i) => (
                <tr key={i}>
                  <td className="border border-slate-900 h-7 text-center font-mono">{i + 1}</td>
                  <td className="border border-slate-900"></td>
                  <td className="border border-slate-900"></td>
                  <td className="border border-slate-900"></td>
                  <td className="border border-slate-900"></td>
                  <td className="border border-slate-900"></td>
                </tr>
              ))}
            </tbody>
          </table>
          <SignatureRow left="ผู้จัดทำ / ช่างซ่อมบำรุง" center="หัวหน้าแผนกซ่อมบำรุง" right="ผู้จัดการโรงงาน / ผู้อนุมัติ" />
        </div>

        {/* 2. FM-MN01-02 (PM) แผน PM ประจำปี Plan vs Act (A4 Landscape) */}
        <div ref={refs.fm_mn01_02_pm} className="w-[1122px] bg-white p-5 text-slate-900 font-sans">
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-2.5">
            <KochLogo size="md" variant="full" textColor="dark" />
            <div className="text-center flex-1 px-2">
              <div className="text-base font-extrabold">แผนการบำรุงรักษาเครื่องจักรและอุปกรณ์ประจำปี (ANNUAL PREVENTIVE MAINTENANCE SCHEDULE)</div>
              <div className="text-[11px] font-semibold text-slate-600">โรงงานบางแสน BS • ประจำปี พ.ศ. ................. (ค.ศ. .............) • สัญลักษณ์: P = Plan (แผน) | A = Act (ทำจริง)</div>
            </div>
            <DocControlBox code="FM-MN01-02" />
          </div>
          <table className="w-full border-collapse border border-slate-900 text-[10px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-900 py-1 px-1 w-8 text-center">No.</th>
                <th className="border border-slate-900 py-1 px-1.5 w-20 text-center">รหัส (Tag)</th>
                <th className="border border-slate-900 py-1 px-2 w-48 text-left">ชื่อเครื่องจักร / รหัสทรัพย์สิน</th>
                <th className="border border-slate-900 py-1 px-1 w-14 text-center">รอบ PM</th>
                <th className="border border-slate-900 py-1 px-1 w-10 text-center">P / A</th>
                {MONTHS_SHORT.map((m) => (
                  <th key={m} className="border border-slate-900 py-1 px-1 text-center">{m}</th>
                ))}
                <th className="border border-slate-900 py-1 px-1.5 w-16 text-center">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 13 }, (_, idx) => (
                <React.Fragment key={idx}>
                  <tr>
                    <td rowSpan={2} className="border border-slate-900 text-center font-mono">{idx + 1}</td>
                    <td rowSpan={2} className="border border-slate-900"></td>
                    <td rowSpan={2} className="border border-slate-900"></td>
                    <td rowSpan={2} className="border border-slate-900"></td>
                    <td className="border border-slate-900 text-center font-bold bg-blue-50 h-4">P</td>
                    {MONTHS_SHORT.map((m) => (
                      <td key={`p-${m}`} className="border border-slate-900 h-4"></td>
                    ))}
                    <td rowSpan={2} className="border border-slate-900"></td>
                  </tr>
                  <tr>
                    <td className="border border-slate-900 text-center font-bold bg-emerald-50 h-4">A</td>
                    {MONTHS_SHORT.map((m) => (
                      <td key={`a-${m}`} className="border border-slate-900 h-4"></td>
                    ))}
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
          <SignatureRow left="ผู้จัดทำแผน (เจ้าหน้าที่ซ่อมบำรุง)" center="ผู้ทบทวน (หัวหน้าแผนกซ่อมบำรุง)" right="ผู้อนุมัติ (ผู้จัดการโรงงาน)" />
        </div>

        {/* 3. FM-MN01-02 (History) ใบประวัติการซ่อมบำรุงและบริการเครื่องจักร (A4 Portrait) */}
        <div ref={refs.fm_mn01_02_history} className="w-[794px] bg-white p-6 text-slate-900 font-sans">
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2.5 mb-3">
            <KochLogo size="md" variant="full" textColor="dark" />
            <div className="text-center flex-1 px-2">
              <div className="text-base font-extrabold">ใบประวัติการซ่อมบำรุงและบริการเครื่องจักร</div>
              <div className="text-[11px] font-semibold text-slate-600">MACHINE MAINTENANCE SERVICE RECORD (แบบฟอร์มเปล่า)</div>
            </div>
            <DocControlBox code="FM-MN01-02" />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 border border-slate-900 rounded p-3 mb-3 text-[11px] bg-slate-50/50">
            <div>รหัสประจำเครื่อง (Tag): ....................................................</div>
            <div>รหัสทรัพย์สิน (Code): ......................................................</div>
            <div>ชื่อเครื่องจักร: ...................................................................</div>
            <div>แผนก / สถานที่ติดตั้ง: ..................................................</div>
            <div>รุ่น (Model) / ยี่ห้อ: ..........................................................</div>
            <div>ระบบไฟฟ้า / สเปกมอเตอร์: ............................................</div>
          </div>
          <table className="w-full border-collapse border border-slate-900 text-[10px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-900 py-1.5 px-1 w-8 text-center">No.</th>
                <th className="border border-slate-900 py-1.5 px-1.5 w-20 text-center">วันที่ / เวลา</th>
                <th className="border border-slate-900 py-1.5 px-1.5 w-24 text-center">เลขที่ใบแจ้งซ่อม</th>
                <th className="border border-slate-900 py-1.5 px-2 text-left">อาการเสีย / รายละเอียดปัญหา</th>
                <th className="border border-slate-900 py-1.5 px-2 text-left">สาเหตุ &amp; การแก้ไข</th>
                <th className="border border-slate-900 py-1.5 px-2 w-28 text-left">อะไหล่ที่เปลี่ยน</th>
                <th className="border border-slate-900 py-1.5 px-1.5 w-20 text-center">ผู้ซ่อม / รับรอง</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 13 }, (_, i) => (
                <tr key={i}>
                  <td className="border border-slate-900 h-10 text-center font-mono">{i + 1}</td>
                  <td className="border border-slate-900"></td>
                  <td className="border border-slate-900"></td>
                  <td className="border border-slate-900"></td>
                  <td className="border border-slate-900"></td>
                  <td className="border border-slate-900"></td>
                  <td className="border border-slate-900"></td>
                </tr>
              ))}
            </tbody>
          </table>
          <SignatureRow left="ผู้บันทึกข้อมูลประวัติ (ช่างซ่อมบำรุง)" center="หัวหน้าแผนกซ่อมบำรุง" right="ผู้จัดการโรงงาน / ผู้มีอำนาจอนุมัติ" />
        </div>

        {/* 4. FM-MN01-03 ใบแจ้งซ่อม (A4 Portrait) */}
        <div ref={refs.fm_mn01_03} className="w-[794px] bg-white p-6 text-slate-900 font-sans">
          <div className="border-2 border-black p-4">
            <div className="grid grid-cols-12 border-b-2 border-black pb-2.5">
              <div className="col-span-3 flex items-center">
                <KochLogo size="md" variant="full" textColor="dark" />
              </div>
              <div className="col-span-5 flex flex-col items-center justify-center">
                <div className="text-2xl font-extrabold">ใบแจ้งซ่อม</div>
                <div className="text-[10px] font-mono text-slate-600">MAINTENANCE REPAIR REQUEST</div>
              </div>
              <div className="col-span-4 border-l-2 border-black pl-3 text-[11px] space-y-0.5 flex flex-col justify-center">
                <div><span className="font-semibold">หมายเลขเอกสาร :</span> <span className="font-mono font-bold">FM-MN01-03 (Rev.00)</span></div>
                <div><span className="font-semibold">เลขที่ใบแจ้งซ่อม :</span> <span className="font-mono font-bold">MN-________-___</span></div>
                <div className="text-[10px] text-slate-600 flex justify-between"><span>สำหรับเจ้าหน้าที่ซ่อมบำรุง</span><span>หน้าที่ 1 / 1</span></div>
              </div>
            </div>

            {/* Section 1 */}
            <div className="border-b-2 border-black py-2.5 text-xs grid grid-cols-12 gap-3">
              <div className="col-span-7 space-y-2">
                <div>วันที่ : .........................................................................................</div>
                <div>ชื่อผู้แจ้ง : .................................................................................</div>
                <div>แผนก : .......................................................................................</div>
              </div>
              <div className="col-span-5 space-y-2">
                <div className="flex items-center gap-4 font-bold">
                  <span>[ &nbsp; ] เครื่องจักร</span>
                  <span>[ &nbsp; ] โครงสร้างพื้นฐาน</span>
                </div>
                <div>หมายเลขเครื่อง : ...........................................................</div>
                <div>สถานที่ / Line : ............................................................</div>
              </div>
            </div>

            {/* Section 2: Problem */}
            <div className="border-b-2 border-black py-2.5 text-xs space-y-2">
              <div className="font-bold">อาการเสีย / รายละเอียดปัญหาที่พบ :</div>
              <div className="border-b border-dotted border-black h-5"></div>
              <div className="border-b border-dotted border-black h-5"></div>
              <div className="flex flex-wrap gap-6 pt-1">
                <span>ระดับความเร่งด่วน:</span>
                <span>[ &nbsp; ] ฉุกเฉิน (หยุดไลน์)</span>
                <span>[ &nbsp; ] ด่วนมาก</span>
                <span>[ &nbsp; ] ปกติ</span>
                <span>เวลาแจ้ง : ............... น.</span>
              </div>
            </div>

            {/* Section 3: Root Cause & Action */}
            <div className="border-b-2 border-black py-2.5 text-xs space-y-2">
              <div className="font-bold">การตรวจสอบและสาเหตุความเสียหาย (สำหรับช่างซ่อมบำรุง) :</div>
              <div className="flex flex-wrap gap-5">
                <span>[ &nbsp; ] ขาดการบำรุงรักษา</span>
                <span>[ &nbsp; ] อะไหล่ไม่มีคุณภาพ</span>
                <span>[ &nbsp; ] ใช้งานผิดประเภท</span>
                <span>[ &nbsp; ] อื่นๆ ......................................</span>
              </div>
              <div className="font-bold pt-1">รายละเอียดการซ่อมแซมและอะไหล่ที่ใช้เปลี่ยน :</div>
              <div className="border-b border-dotted border-black h-5"></div>
              <div className="border-b border-dotted border-black h-5"></div>
              <div className="border-b border-dotted border-black h-5"></div>
            </div>

            {/* Section 4: Completion & Testing */}
            <div className="border-b-2 border-black py-2.5 text-xs space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>วันที่ซ่อมเสร็จ : ........../........../.......... เวลา : .............. น.</div>
                <div>ระยะเวลาหยุดเครื่อง (Downtime) : ....................... นาที</div>
              </div>
              <div className="flex flex-wrap gap-6">
                <span className="font-bold">ผลการทดสอบหลังซ่อม :</span>
                <span>[ &nbsp; ] ปกติ พร้อมใช้งาน</span>
                <span>[ &nbsp; ] ติดตามอาการต่อ</span>
                <span>[ &nbsp; ] รออะไหล่สั่งซื้อ</span>
              </div>
            </div>

            {/* Section 5: 3-Party Signatures */}
            <div className="grid grid-cols-3 gap-4 pt-4 text-[11px] text-center">
              <div className="border-r border-slate-300 pr-2">
                <div className="font-bold mb-6">1. ผู้แจ้ง / ผู้ตรวจรับมอบงาน</div>
                <div>ลงชื่อ ....................................................</div>
                <div className="mt-1">(....................................................)</div>
                <div className="text-[10px] text-slate-600 mt-1">วันที่ ........../........../..........</div>
              </div>
              <div className="border-r border-slate-300 px-2">
                <div className="font-bold mb-6">2. ช่างซ่อมบำรุงผู้ดำเนินการ</div>
                <div>ลงชื่อ ....................................................</div>
                <div className="mt-1">(....................................................)</div>
                <div className="text-[10px] text-slate-600 mt-1">วันที่ ........../........../..........</div>
              </div>
              <div className="pl-2">
                <div className="font-bold mb-6">3. หัวหน้าแผนก / ผู้อนุมัติปิดงาน</div>
                <div>ลงชื่อ ....................................................</div>
                <div className="mt-1">(....................................................)</div>
                <div className="text-[10px] text-slate-600 mt-1">วันที่ ........../........../..........</div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. FM-MN01-04 ใบตรวจเช็คเครื่องจักรประจำวัน (A4 Landscape) */}
        <div ref={refs.fm_mn01_04} className="w-[1122px] bg-white p-5 text-slate-900 font-sans">
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-2">
            <KochLogo size="md" variant="full" textColor="dark" />
            <div className="text-center flex-1 px-2">
              <div className="text-base font-extrabold">ใบตรวจสอบเครื่องจักร / อุปกรณ์ประจำวัน (PREVENTIVE MAINTENANCE RECORD)</div>
              <div className="text-[11px] font-semibold text-slate-600">โรงงานบางแสน BS • สัญลักษณ์บันทึกผล: / = ปกติ , X = ผิดปกติ (ออกใบแจ้งซ่อม) , ■ = ไม่ได้เดินเครื่อง</div>
            </div>
            <DocControlBox code="FM-MN01-04" />
          </div>
          <div className="grid grid-cols-4 gap-2 text-[11px] font-semibold mb-2 bg-slate-50 border border-slate-300 px-3 py-1.5 rounded">
            <div>เครื่องจักร: <span className="font-mono font-bold">{selectedDailyMachine ? `${selectedDailyMachine.tagCode ? `${selectedDailyMachine.tagCode} ` : ''}${selectedDailyMachine.name}` : '.........................................'}</span></div>
            <div>รหัสทรัพย์สิน: <span className="font-mono">{selectedDailyMachine ? selectedDailyMachine.code : '.............................'}</span></div>
            <div>แผนก: <span className="font-normal">{selectedDailyMachine ? selectedDailyMachine.department : '.....................................'}</span></div>
            <div>ประจำเดือน / ปี: .............................</div>
          </div>
          <table className="w-full border-collapse border border-slate-900 text-[9px]">
            <thead>
              <tr className="bg-slate-100">
                <th rowSpan={2} className="border border-slate-900 px-1 py-1 w-7 text-center">No.</th>
                <th rowSpan={2} className="border border-slate-900 px-1.5 py-1 text-left w-52">หัวข้อตรวจสอบ</th>
                <th rowSpan={2} className="border border-slate-900 px-1.5 py-1 text-left w-36">เกณฑ์มาตรฐาน</th>
                <th rowSpan={2} className="border border-slate-900 px-1 py-1 w-8 text-center">ถี่</th>
                <th colSpan={31} className="border border-slate-900 py-0.5 text-center">ผลการตรวจสอบประจำวันที่ 1 - 31</th>
              </tr>
              <tr className="bg-slate-50">
                {DAYS_31.map((d) => (
                  <th key={d} className="border border-slate-900 py-0.5 text-center w-5 font-mono">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dailyTemplateItems.map((item) => (
                <tr key={item.no}>
                  <td className="border border-slate-900 h-6 text-center font-mono">{item.no}</td>
                  <td className="border border-slate-900 px-1.5">{item.description}</td>
                  <td className="border border-slate-900 px-1.5 text-slate-600">{item.criteria}</td>
                  <td className="border border-slate-900 text-center font-mono">{item.frequency}</td>
                  {DAYS_31.map((d) => (
                    <td key={d} className="border border-slate-900"></td>
                  ))}
                </tr>
              ))}
              <tr>
                <td colSpan={4} className="border border-slate-900 px-2 py-1 font-bold text-right bg-slate-50">ลงชื่อย่อผู้ตรวจ</td>
                {DAYS_31.map((d) => (
                  <td key={d} className="border border-slate-900 h-6"></td>
                ))}
              </tr>
              <tr>
                <td colSpan={4} className="border border-slate-900 px-2 py-1 font-bold text-right bg-slate-50">หัวหน้างานทบทวน</td>
                {DAYS_31.map((d) => (
                  <td key={d} className="border border-slate-900 h-6"></td>
                ))}
              </tr>
            </tbody>
          </table>
          <SignatureRow left="ผู้ตรวจเช็ค (Operator / ช่างซ่อมบำรุง)" center="หัวหน้าแผนกผลิต / ซ่อมบำรุง" right="ผู้จัดการโรงงาน (ผู้อนุมัติ)" />
        </div>

        {/* 6. FM-MN01-06 ใบตรวจนับและเบิก-รับสแปร์พาร์ท (A4 Landscape) */}
        <div ref={refs.fm_mn01_06} className="w-[1122px] bg-white p-5 text-slate-900 font-sans">
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-2.5">
            <KochLogo size="md" variant="full" textColor="dark" />
            <div className="text-center flex-1 px-2">
              <div className="text-base font-extrabold">แบบฟอร์มตรวจนับสต็อกและบันทึกการเบิก-รับสแปร์พาร์ท (SPARE PARTS STOCK &amp; REQUISITION)</div>
              <div className="text-[11px] font-semibold text-slate-600">โรงงานบางแสน BS • สำหรับตรวจนับคลังอะไหล่และบันทึกการเบิกใช้หน้างาน</div>
            </div>
            <DocControlBox code="FM-MN01-06" />
          </div>
          <div className="flex justify-between text-[11px] font-semibold mb-2">
            <span>วันที่ตรวจนับ / เบิก-รับ: ........../........../..........</span>
            <span>คลังจัดเก็บ / ตู้: ....................................................</span>
            <span>ผู้รับผิดชอบคลังอะไหล่: ....................................................</span>
          </div>
          <table className="w-full border-collapse border border-slate-900 text-[10px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-900 py-1.5 px-1 w-9 text-center">ลำดับ</th>
                <th className="border border-slate-900 py-1.5 px-1.5 w-24 text-center">รหัสอะไหล่</th>
                <th className="border border-slate-900 py-1.5 px-2 text-left">ชื่ออะไหล่ / สเปกทางเทคนิค</th>
                <th className="border border-slate-900 py-1.5 px-1.5 w-20 text-center">Location</th>
                <th className="border border-slate-900 py-1.5 px-1.5 w-16 text-center">ยกมา</th>
                <th className="border border-slate-900 py-1.5 px-1.5 w-16 text-center">รับเข้า (+)</th>
                <th className="border border-slate-900 py-1.5 px-1.5 w-16 text-center">เบิกออก (-)</th>
                <th className="border border-slate-900 py-1.5 px-1.5 w-16 text-center">คงเหลือ</th>
                <th className="border border-slate-900 py-1.5 px-1.5 w-24 text-center">เลขที่ใบแจ้งซ่อม</th>
                <th className="border border-slate-900 py-1.5 px-2 w-28 text-center">ผู้เบิก / หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 15 }, (_, i) => (
                <tr key={i}>
                  <td className="border border-slate-900 h-7 text-center font-mono">{i + 1}</td>
                  <td className="border border-slate-900"></td>
                  <td className="border border-slate-900"></td>
                  <td className="border border-slate-900"></td>
                  <td className="border border-slate-900"></td>
                  <td className="border border-slate-900"></td>
                  <td className="border border-slate-900"></td>
                  <td className="border border-slate-900"></td>
                  <td className="border border-slate-900"></td>
                  <td className="border border-slate-900"></td>
                </tr>
              ))}
            </tbody>
          </table>
          <SignatureRow left="ผู้ตรวจนับ / เจ้าหน้าที่สโตร์" center="ช่างผู้เบิก / ผู้รับของ" right="หัวหน้าแผนกซ่อมบำรุง (ผู้อนุมัติ)" />
        </div>

        {/* 7. FM-MN01-07 รายการอะไหล่ประจำเครื่องจักร Machine BOM (A4 Landscape) */}
        <div ref={refs.fm_mn01_07} className="w-[1122px] bg-white p-5 text-slate-900 font-sans">
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-2.5">
            <KochLogo size="md" variant="full" textColor="dark" />
            <div className="text-center flex-1 px-2">
              <div className="text-base font-extrabold">บัญชีรายการอะไหล่ประจำเครื่องจักร และบันทึกการเปลี่ยนชิ้นส่วน (MACHINE BOM &amp; REPLACEMENT RECORD)</div>
              <div className="text-[11px] font-semibold text-slate-600">โรงงานบางแสน BS • แบบฟอร์มเปล่าสำหรับสำรวจชิ้นส่วนหน้าเครื่อง</div>
            </div>
            <DocControlBox code="FM-MN01-07" />
          </div>
          <div className="grid grid-cols-3 gap-4 text-[11px] font-semibold mb-2 bg-slate-50 border border-slate-300 px-3 py-1.5 rounded">
            <div>รหัสเครื่องจักร (Tag / Code): ............................................</div>
            <div>ชื่อเครื่องจักร: ...................................................................</div>
            <div>แผนก / ผู้สำรวจ: ...............................................................</div>
          </div>
          <table className="w-full border-collapse border border-slate-900 text-[10px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-900 py-1.5 px-1 w-9 text-center">No.</th>
                <th className="border border-slate-900 py-1.5 px-1.5 w-24 text-center">รหัสอะไหล่</th>
                <th className="border border-slate-900 py-1.5 px-2 text-left">ชื่ออะไหล่ / ชิ้นส่วนสำคัญ</th>
                <th className="border border-slate-900 py-1.5 px-2 w-40 text-left">รุ่น / สเปก (Spec)</th>
                <th className="border border-slate-900 py-1.5 px-1.5 w-16 text-center">จำนวน/เครื่อง</th>
                <th className="border border-slate-900 py-1.5 px-1.5 w-20 text-center">รอบเปลี่ยน (ชม./เดือน)</th>
                <th className="border border-slate-900 py-1.5 px-1.5 w-24 text-center">วันที่เปลี่ยนล่าสุด</th>
                <th className="border border-slate-900 py-1.5 px-2 w-28 text-center">เลขที่ใบซ่อม / หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 14 }, (_, i) => (
                <tr key={i}>
                  <td className="border border-slate-900 h-7 text-center font-mono">{i + 1}</td>
                  <td className="border border-slate-900"></td>
                  <td className="border border-slate-900"></td>
                  <td className="border border-slate-900"></td>
                  <td className="border border-slate-900"></td>
                  <td className="border border-slate-900"></td>
                  <td className="border border-slate-900"></td>
                  <td className="border border-slate-900"></td>
                </tr>
              ))}
            </tbody>
          </table>
          <SignatureRow left="ผู้สำรวจ / ช่างซ่อมบำรุง" center="หัวหน้าแผนกซ่อมบำรุง" right="ผู้จัดการโรงงาน / ผู้อนุมัติ" />
        </div>

        {/* 8. FM-ISO-AUDIT-MN01 แบบประเมิน ISO 9001:2015 (A4 Portrait) */}
        <div ref={refs.fm_iso_audit} className="w-[794px] bg-white p-6 text-slate-900 font-sans">
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-2.5">
            <KochLogo size="md" variant="full" textColor="dark" />
            <div className="text-center flex-1 px-2">
              <div className="text-base font-extrabold">แบบบันทึกการตรวจประเมินระบบคุณภาพ ISO 9001:2015</div>
              <div className="text-[11px] font-semibold text-slate-600">แผนกซ่อมบำรุง (Maintenance Department) • แบบฟอร์มเปล่า (Blank Checklist)</div>
            </div>
            <DocControlBox code="FM-ISO-AUDIT-MN01" />
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold mb-2 bg-slate-50 border border-slate-300 px-3 py-1.5 rounded">
            <div>วันที่ตรวจประเมิน: ........../........../..........</div>
            <div>ผู้ตรวจประเมิน (Auditor): .............................</div>
            <div>ผู้รับตรวจ (Auditee): ...................................</div>
          </div>
          <table className="w-full border-collapse border border-slate-900 text-[10px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-900 py-1.5 px-1 w-9 text-center">ข้อ</th>
                <th className="border border-slate-900 py-1.5 px-1 w-14 text-center">Clause</th>
                <th className="border border-slate-900 py-1.5 px-2 text-left">ประเด็นคำถามตรวจประเมิน</th>
                <th className="border border-slate-900 py-1.5 px-1.5 w-24 text-center">ผลการประเมิน</th>
                <th className="border border-slate-900 py-1.5 px-2 w-48 text-left">หลักฐาน / บันทึกของ Auditor</th>
              </tr>
            </thead>
            <tbody>
              {AUDIT_CHECKLIST_ITEMS.map((q) => (
                <tr key={q.id}>
                  <td className="border border-slate-900 py-2 px-1 text-center font-mono font-bold align-top">{q.no}</td>
                  <td className="border border-slate-900 py-2 px-1 text-center font-mono align-top">{q.clause}</td>
                  <td className="border border-slate-900 py-2 px-2 align-top">
                    <div className="font-bold text-slate-900">{q.title}</div>
                    <div className="text-[9px] text-slate-600 mt-0.5">{q.question}</div>
                  </td>
                  <td className="border border-slate-900 py-2 px-1.5 align-top font-mono text-[9px] space-y-1">
                    <div>[ &nbsp; ] C (ผ่าน)</div>
                    <div>[ &nbsp; ] O (สังเกต)</div>
                    <div>[ &nbsp; ] NC (แก้ไข)</div>
                  </td>
                  <td className="border border-slate-900 py-2 px-2 align-top">
                    <div className="border-b border-dotted border-slate-400 h-4"></div>
                    <div className="border-b border-dotted border-slate-400 h-4"></div>
                    <div className="border-b border-dotted border-slate-400 h-4"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-[9px] text-slate-600 mt-2">หมายเหตุ: C = Conforming (สอดคล้อง), O = Observation (ข้อสังเกต), NC = Non-Conformity (ไม่สอดคล้อง/ออกใบ CAR)</div>
          <SignatureRow left="ผู้ตรวจประเมิน (Lead Auditor)" center="ผู้รับตรวจ (หัวหน้าแผนกซ่อมบำรุง)" right="ตัวแทนฝ่ายบริหาร (QMR / ผู้อนุมัติ)" />
        </div>
      </div>
    </div>
  );
};
