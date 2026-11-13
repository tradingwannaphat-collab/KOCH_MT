import React, { useState, useEffect, useRef } from 'react';
import { MachineAsset } from '../types/ticket';
import { 
  MachineMonthlyCheckSheet, 
  InspectionResult, 
  DailyCheckItem, 
  DEFAULT_INSPECTION_ITEMS,
  SLOT_INSPECTION_ITEMS,
  CUTTING_INSPECTION_ITEMS
} from '../types/inspection';
import { KochLogo } from './KochLogo';
import { PrintableInspectionDocument, PrintableInspectionDocumentHandle } from './PrintableInspectionDocument';
import { Language, translations, SUPPORTED_LANGUAGES, DEFAULT_ITEMS_I18N } from '../i18n/translations';
import { 
  ClipboardCheck, 
  Calendar, 
  Printer, 
  CheckCircle2, 
  XCircle, 
  MinusSquare, 
  AlertTriangle, 
  Plus, 
  Wrench, 
  Check, 
  X, 
  Info,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Building2,
  FileSpreadsheet,
  Settings2,
  Globe,
  Trash2,
  Sparkles,
  ShieldCheck,
  Clock,
  BookOpen,
  Download,
  Loader2
} from 'lucide-react';

export interface InspectionMonthInfo {
  num: string;
  thaiName: string;
  shortName: string;
  enName: string;
}

export const THAI_MONTHS_LIST: InspectionMonthInfo[] = [
  { num: '01', thaiName: 'มกราคม', shortName: 'ม.ค.', enName: 'January' },
  { num: '02', thaiName: 'กุมภาพันธ์', shortName: 'ก.พ.', enName: 'February' },
  { num: '03', thaiName: 'มีนาคม', shortName: 'มี.ค.', enName: 'March' },
  { num: '04', thaiName: 'เมษายน', shortName: 'เม.ย.', enName: 'April' },
  { num: '05', thaiName: 'พฤษภาคม', shortName: 'พ.ค.', enName: 'May' },
  { num: '06', thaiName: 'มิถุนายน', shortName: 'มิ.ย.', enName: 'June' },
  { num: '07', thaiName: 'กรกฎาคม', shortName: 'ก.ค.', enName: 'July' },
  { num: '08', thaiName: 'สิงหาคม', shortName: 'ส.ค.', enName: 'August' },
  { num: '09', thaiName: 'กันยายน', shortName: 'ก.ย.', enName: 'September' },
  { num: '10', thaiName: 'ตุลาคม', shortName: 'ต.ค.', enName: 'October' },
  { num: '11', thaiName: 'พฤศจิกายน', shortName: 'พ.ย.', enName: 'November' },
  { num: '12', thaiName: 'ธันวาคม', shortName: 'ธ.ค.', enName: 'December' },
];

export const AVAILABLE_INSPECTION_YEARS = [
  { year: 2024, thaiYear: 2567, label: 'พ.ศ. 2567 (2024)' },
  { year: 2025, thaiYear: 2568, label: 'พ.ศ. 2568 (2025)' },
  { year: 2026, thaiYear: 2569, label: 'พ.ศ. 2569 (2026)' },
  { year: 2027, thaiYear: 2570, label: 'พ.ศ. 2570 (2027) ★', highlighted: true },
  { year: 2028, thaiYear: 2571, label: 'พ.ศ. 2571 (2028) ★', highlighted: true },
  { year: 2029, thaiYear: 2572, label: 'พ.ศ. 2572 (2029)' },
  { year: 2030, thaiYear: 2573, label: 'พ.ศ. 2573 (2030)' },
  { year: 2031, thaiYear: 2574, label: 'พ.ศ. 2574 (2031)' },
  { year: 2032, thaiYear: 2575, label: 'พ.ศ. 2575 (2032)' },
];

interface DailyInspectionManagerProps {
  machines: MachineAsset[];
  sheets: MachineMonthlyCheckSheet[];
  currentSheet?: MachineMonthlyCheckSheet;
  selectedMachineId: string;
  selectedMonth: string;
  currentLang: Language;
  onSelectLang: (lang: Language) => void;
  onSelectMachine: (machineId: string) => void;
  onSelectMonth: (month: string) => void;
  onToggleCell: (machineId: string, month: string, day: number, itemNo: number, currentStatus: InspectionResult) => void;
  onSaveDayCheck: (
    machineId: string,
    month: string,
    day: number,
    results: Record<number, InspectionResult>,
    inspectorName?: string,
    supervisorName?: string,
    notes?: string
  ) => Promise<boolean>;
  onUpdateSheetDetails: (sheetId: string, remarks: string, approverName: string, approvedDate: string) => Promise<boolean>;
  onUpdateMachineItems: (machineId: string, month: string, items: DailyCheckItem[]) => Promise<boolean>;
  onOpenReportTicket: (machine: MachineAsset, problemNotes: string) => void;
  onOpenPrintInspection: (sheet: MachineMonthlyCheckSheet) => void;
  onUpdateMachine?: (id: string, updates: Partial<MachineAsset>) => Promise<any>;
  onOpenGuide?: () => void;
}

export const DailyInspectionManager: React.FC<DailyInspectionManagerProps> = ({
  machines,
  sheets,
  currentSheet,
  selectedMachineId,
  selectedMonth,
  currentLang,
  onSelectLang,
  onSelectMachine,
  onSelectMonth,
  onToggleCell,
  onSaveDayCheck,
  onUpdateSheetDetails,
  onUpdateMachineItems,
  onOpenReportTicket,
  onOpenPrintInspection,
  onUpdateMachine,
  onOpenGuide
}) => {
  const t = translations[currentLang] || translations.th;
  const currentMachine = machines.find((m) => m.id === selectedMachineId) || machines[0];
  const today = new Date();
  const currentDayNum = today.getDate(); // 1..31

  // View Mode: 'matrix' (ตารางตรวจ) vs 'print' (หน้าพิมพ์แบบตรวจเช็ค FM-MN01-04)
  const [activeView, setActiveView] = useState<'matrix' | 'print'>('matrix');
  const printableDocRef = useRef<PrintableInspectionDocumentHandle>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleDirectExportPdf = async () => {
    if (!printableDocRef.current) return;
    setIsExportingPdf(true);
    try {
      await printableDocRef.current.exportPdf();
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Modal State for Quick Daily Check
  const [showQuickCheckModal, setShowQuickCheckModal] = useState(false);
  const [checkDay, setCheckDay] = useState<number>(Math.min(currentDayNum, 31));
  const [modalResults, setModalResults] = useState<Record<number, InspectionResult>>({});
  const [inspectorName, setInspectorName] = useState('สมเกียรติ มั่นคง');
  const [inspectorRole, setInspectorRole] = useState<'maintenance' | 'production'>('maintenance');
  const [supervisorName, setSupervisorName] = useState('เกียรติศักดิ์ พรหมดี');
  const [dayNotes, setDayNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal State for Customizing Checklist Items
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [editingItems, setEditingItems] = useState<DailyCheckItem[]>([]);
  const [isSavingItems, setIsSavingItems] = useState(false);

  // Remarks and Approver edit state
  const [remarksInput, setRemarksInput] = useState(currentSheet?.remarks || '');
  const [approverInput, setApproverInput] = useState(currentSheet?.approverName || 'สิรภพ ชูสิทธิ์ (ผู้จัดการโรงงาน บางแสน BS)');
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  // Machine thumbnail fallback state & save confirmation toast
  const [imageError, setImageError] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const triggerSaveToast = (message: string) => {
    setSaveToast(message);
    setTimeout(() => setSaveToast(null), 2500);
  };

  useEffect(() => {
    setImageError(false);
  }, [currentMachine?.id, currentMachine?.imageUrl]);

  // Sync inputs if currentSheet changes
  useEffect(() => {
    if (currentSheet) {
      setRemarksInput(currentSheet.remarks || '');
      setApproverInput(currentSheet.approverName || 'สิรภพ ชูสิทธิ์ (ผู้จัดการโรงงาน บางแสน BS)');
    }
  }, [currentSheet]);

  const rawItems = currentSheet?.items && currentSheet.items.length > 0
    ? currentSheet.items
    : DEFAULT_INSPECTION_ITEMS;

  // Helper to get localized description for check items
  const getItemDescription = (it: DailyCheckItem): string => {
    // If language is Thai, ALWAYS return the item's actual description from the sheet
    if (currentLang === 'th' || !it.translations) {
      return it.description || `รายการที่ ${it.no}`;
    }
    // If user selected foreign language (English, Burmese, Lao), check item translations first
    if (it.translations[currentLang]) {
      return it.translations[currentLang]!;
    }
    // Fallback to default translations only if it's a generic item and user is on a foreign language
    const defaultTrans = DEFAULT_ITEMS_I18N[it.no];
    if (defaultTrans && defaultTrans[currentLang]) {
      return defaultTrans[currentLang];
    }
    return it.description || `รายการที่ ${it.no}`;
  };

  const getItemCriteria = (it: DailyCheckItem): string => {
    if (it.criteria && it.criteria.trim() !== '') {
      return it.criteria;
    }
    return 'ไม่แตกหัก , หลวมคลอน, พร้อมใช้งาน';
  };

  const daysRecord = currentSheet?.days || {};

  // Count abnormal issues in this month sheet
  let abnormalCount = 0;
  const abnormalList: { day: number; itemNo: number; itemDesc: string }[] = [];
  Object.entries(daysRecord).forEach(([dayStr, dayRec]) => {
    const d = Number(dayStr);
    Object.entries(dayRec.results || {}).forEach(([itemNoStr, status]) => {
      if (status === 'abnormal') {
        abnormalCount++;
        const itemNo = Number(itemNoStr);
        const matchedItem = rawItems.find((it) => it.no === itemNo);
        const itemDesc = matchedItem ? getItemDescription(matchedItem) : `ข้อ ${itemNo}`;
        abnormalList.push({ day: d, itemNo, itemDesc });
      }
    });
  });

  // Open Quick Check Modal for specific day
  const handleOpenDayModal = (day: number) => {
    setCheckDay(day);
    const existing = daysRecord[day];
    const initialRes: Record<number, InspectionResult> = {};
    rawItems.forEach((it) => {
      initialRes[it.no] = existing?.results?.[it.no] || 'pass'; // default to pass
    });
    setModalResults(initialRes);
    setInspectorName(existing?.inspectorName || 'สมเกียรติ มั่นคง');
    setSupervisorName(existing?.supervisorName || 'เกียรติศักดิ์ พรหมดี');
    setDayNotes(existing?.notes || '');
    setShowQuickCheckModal(true);
  };

  // Quick 1-click set all items to pass
  const handleSetAll = (status: InspectionResult) => {
    const next: Record<number, InspectionResult> = {};
    rawItems.forEach((it) => {
      next[it.no] = status;
    });
    setModalResults(next);
  };

  // Submit quick check modal
  const handleSaveModal = async () => {
    if (!currentMachine) return;
    setIsSubmitting(true);
    const success = await onSaveDayCheck(
      currentMachine.id,
      selectedMonth,
      checkDay,
      modalResults,
      inspectorName,
      supervisorName,
      dayNotes
    );
    setIsSubmitting(false);
    if (success) {
      setShowQuickCheckModal(false);
      triggerSaveToast(`บันทึกผลการตรวจเช็ควันที่ ${checkDay} เรียบร้อยแล้ว`);
    }
  };

  // Open customize items modal
  const handleOpenCustomizeModal = () => {
    setEditingItems(JSON.parse(JSON.stringify(rawItems)));
    setShowCustomizeModal(true);
  };

  // Add new item in customize modal
  const handleAddItem = () => {
    const nextNo = editingItems.length + 1;
    setEditingItems([
      ...editingItems,
      {
        no: nextNo,
        description: `รายการตรวจสอบที่ ${nextNo}`,
        criteria: 'ไม่แตกหัก , หลวมคลอน, พร้อมใช้งาน',
        frequency: 'D',
        time: '08:00'
      }
    ]);
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    const updated = editingItems.filter((_, idx) => idx !== index).map((it, idx) => ({
      ...it,
      no: idx + 1
    }));
    setEditingItems(updated);
  };

  // Update item field
  const handleUpdateItemField = (index: number, field: keyof DailyCheckItem, value: any) => {
    const updated = [...editingItems];
    updated[index] = { ...updated[index], [field]: value };
    setEditingItems(updated);
  };

  // Load preset for specific machine type
  const handleLoadPreset = (presetType: string) => {
    if (presetType === 'slot') {
      setEditingItems(JSON.parse(JSON.stringify(SLOT_INSPECTION_ITEMS)));
    } else if (presetType === 'cutting') {
      setEditingItems(JSON.parse(JSON.stringify(CUTTING_INSPECTION_ITEMS)));
    } else if (presetType === 'flexo') {
      setEditingItems([
        { no: 1, description: 'ความสะอาดชุดพิมพ์ ลูกกลิ้งอนิล็อกซ์ (Anilox Roll) และถาดรับหมึก', criteria: 'ไม่มีคราบหมึกแห้งเกาะ ล้างสะอาด', frequency: 'D', time: '08:00' },
        { no: 2, description: 'ระดับความหนืดและค่าความเป็นกรดด่าง (pH) ของหมึกพิมพ์แต่ละป้อม', criteria: 'ความหนืดได้เกณฑ์ pH 8.5-9.5', frequency: 'D', time: '08:00' },
        { no: 3, description: 'สภาพใบมีดปาดหมึก (Doctor Blade) และซีลยางกันหมึกรั่วซึม', criteria: 'ใบมีดคมเรียบ ไม่บิ่น ไม่รั่วซึม', frequency: 'D', time: '08:00' },
        { no: 4, description: 'แรงดันลมระบบนิวเมติกส์และลูกกลิ้งส่งกระดาษ (5-7 bar)', criteria: 'แรงดัน 5-7 bar สม่ำเสมอ', frequency: 'D', time: '08:00' },
        { no: 5, description: 'ปุ่มหยุดฉุกเฉิน (Emergency Stop) และ Safety Interlock หน้าตู้', criteria: 'กดหยุดทำงานทันที ระบบล็อคแน่น', frequency: 'D', time: '08:00' },
        { no: 6, description: 'การทำงานของปั๊มหมึกไดอะแฟรมและระบบท่อส่งหมึก', criteria: 'หมึกไหลเวียนราบรื่น ท่อไม่อุดตัน', frequency: 'D', time: '08:00' },
        { no: 7, description: 'ความตึงและรอยสึกหรอของสายพานขับเคลื่อนลูกกลิ้งพิมพ์', criteria: 'สายพานตึงพอดี ไม่แตกหรือหย่อน', frequency: 'D', time: '08:00' },
        { no: 8, description: 'สภาพบล็อกพิมพ์ยาง (Flexo Plate) และเทปติดเพลท', criteria: 'ติดแน่น ไม่หลุดล่อน ลายพิมพ์คม', frequency: 'D', time: '08:00' },
        { no: 9, description: 'ระบบเป่าแห้งลมร้อนและระบบระบายไอด่าง', criteria: 'อุณหภูมิลมร้อนตามเกณฑ์ พัดลมระบายดี', frequency: 'D', time: '08:00' },
        { no: 10, description: 'ทดสอบพิมพ์ตัวอย่างเทียบสี (Trial Print) ก่อนรันงานจริง', criteria: 'สีตรงตามตัวอย่าง ไม่มีลายเส้นเกย', frequency: 'D', time: '08:15' }
      ]);
    } else if (presetType === 'diecut') {
      setEditingItems([
        { no: 1, description: 'ความสะอาดรอบแท่นตัดและถังดูดเศษกระดาษไดคัท', criteria: 'ไม่มีเศษกระดาษอุดตัน สะอาด', frequency: 'D', time: '08:00' },
        { no: 2, description: 'ระดับน้ำมันหล่อลื่นส่วนแบริ่งและชุดคลัตช์เบรก', criteria: 'ระดับปกติ ไม่รั่วซึม หล่อลื่นดี', frequency: 'D', time: '08:00' },
        { no: 3, description: 'สภาพแผ่นยางรองตัด (Anvil Blanket) การสึกหรอและการหมุนตำแหน่ง', criteria: 'ผิวเรียบ สึกหรอสม่ำเสมอ หมุนรอบถูกต้อง', frequency: 'D', time: '08:00' },
        { no: 4, description: 'สภาพใบมีดตัด (Cutting Rule) และมีดพับรอย (Creasing Rule)', criteria: 'มีดคม ไม่บิ่น ไม่งอ รอยพับชัดเจน', frequency: 'D', time: '08:00' },
        { no: 5, description: 'ระบบ Safety Bar, Photo Sensor และปุ่มหยุดฉุกเฉิน', criteria: 'เซ็นเซอร์ตัดการทำงานทันที ปลอดภัย', frequency: 'D', time: '08:00' },
        { no: 6, description: 'เสียงและการสั่นสะเทือนของมอเตอร์หลักและชุดเกียร์ทด', criteria: 'ไม่มีเสียงกระแทก เดินเครื่องเรียบ', frequency: 'D', time: '08:00' },
        { no: 7, description: 'ความตึงโซ่ขับเคลื่อนและชุดป้อนชีทหน้าแท่น', criteria: 'ตึงพอดี โซ่มีจาระบีหล่อลื่น', frequency: 'D', time: '08:00' },
        { no: 8, description: 'ระบบล็อคบล็อกไม้ไดคัท (Chase Clamping) แน่นหนา ไม่คลอน', criteria: 'ล็อคแน่นสนิท ไม่เคลื่อนตัว', frequency: 'D', time: '08:00' },
        { no: 9, description: 'ระบบลมเป่าแยกแผ่นและเซ็นเซอร์นับจำนวนกล่อง', criteria: 'ลมเป่าสม่ำเสมอ เซ็นเซอร์นับแม่นยำ', frequency: 'D', time: '08:00' },
        { no: 10, description: 'ทดสอบปั๊มชิ้นงานตัวอย่าง 1-2 แผ่น ตรวจแนวตัดและรอยพับ', criteria: 'ตัดขาดสนิท รอยพับไม่แตก รูปร่างตรง', frequency: 'D', time: '08:15' }
      ]);
    } else if (presetType === 'autostitch') {
      setEditingItems([
        { no: 1, description: 'ความสะอาดบริเวณหัวตอกลวดและรางป้อนลวดเย็บ', criteria: 'ไม่มีเศษลวดหักหรือผงกระดาษติด', frequency: 'D', time: '08:00' },
        { no: 2, description: 'ระดับน้ำมันหล่อลื่นหัวตอก (Stitching Head Lubrication)', criteria: 'ระดับน้ำมันเพียงพอ หยอดจุดหมุนครบ', frequency: 'D', time: '08:00' },
        { no: 3, description: 'ม้วนลวดเย็บกล่อง ความตึงและการคลายตัว ไม่พันกัน', criteria: 'ลวดไม่เป็นสนิม คลายตัวลื่นไหล', frequency: 'D', time: '08:00' },
        { no: 4, description: 'สภาพใบมีดตัดลวดและตัวดัดขาเย็บ (Wire Cutter & Clincher)', criteria: 'ใบมีดตัดคม ขาลวดพับแนบสนิท', frequency: 'D', time: '08:00' },
        { no: 5, description: 'ปุ่มหยุดฉุกเฉิน เซ็นเซอร์ฝาครอบ และแป้นเหยียบเท้า (Foot Switch)', criteria: 'พร้อมใช้งาน ระบบหยุดฉุกเฉินตัดทันที', frequency: 'D', time: '08:00' },
        { no: 6, description: 'การทำงานของเซอร์โวมอเตอร์ปรับระยะห่างการตอกลวด', criteria: 'ปรับระยะตรงตามสเปค เดินเรียบ', frequency: 'D', time: '08:00' },
        { no: 7, description: 'ความตึงสายพานลำเลียงกล่องและลูกกลิ้งรีด', criteria: 'สายพานไม่ลื่น ส่งกล่องตรงแนว', frequency: 'D', time: '08:00' },
        { no: 8, description: 'แรงดันลมระบบผลักกล่องและการเรียงตั้งกล่อง', criteria: 'กระบอกลมทำงานคล่อง ไม่ติดขัด', frequency: 'D', time: '08:00' },
        { no: 9, description: 'ระบบเซ็นเซอร์ตรวจจับการติดขัดของกล่อง (Jam Detection)', criteria: 'เซ็นเซอร์แจ้งเตือนและหยุดทันทีเมื่อติดขัด', frequency: 'D', time: '08:00' },
        { no: 10, description: 'ทดสอบเย็บกล่องตัวอย่าง ตรวจความแน่นของขาลวด 1-2 กล่อง', criteria: 'ขาลวดเย็บแน่น ได้ระยะห่างมาตรฐาน', frequency: 'D', time: '08:15' }
      ]);
    } else if (presetType === 'office') {
      setEditingItems([
        { no: 1, description: 'ความสะอาดแผ่นกรองอากาศ (Air Filter) และหน้ากากแอร์', criteria: 'ไม่มีฝุ่นสะสม ล้างทำความสะอาด', frequency: 'D', time: '08:00' },
        { no: 2, description: 'การทำงานของมอเตอร์พัดลมกรงกระรอกและเสียงรบกวน', criteria: 'หมุนเงียบ ไม่มีเสียงดังผิดปกติ', frequency: 'D', time: '08:00' },
        { no: 3, description: 'ระบบท่อน้ำทิ้งแอร์ ไม่อุดตัน และไม่มีน้ำหยดรั่วซึม', criteria: 'ระบายน้ำได้ดี ไม่มีหยดลงพื้น', frequency: 'D', time: '08:00' },
        { no: 4, description: 'อุณหภูมิลมจ่ายหน้าเครื่องเย็นปกติ (16-24 °C)', criteria: 'ลมเย็นสม่ำเสมอตามที่ตั้งไว้', frequency: 'D', time: '08:00' },
        { no: 5, description: 'รีโมทคอนโทรล แผงรับสัญญาณ และไฟสถานะ LED', criteria: 'สั่งการได้ปกติ ตัวเลขแสดงชัดเจน', frequency: 'D', time: '08:00' },
        { no: 6, description: 'สภาพคอยล์ร้อน (CDU) ภายนอก พัดลมระบายความร้อนหมุนราบรื่น', criteria: 'พัดลมหมุนราบรื่น แผงไม่ล้มอุดตัน', frequency: 'D', time: '08:00' },
        { no: 7, description: 'แรงดันน้ำยาทำความเย็นและระดับกระแสไฟฟ้า (Ampere)', criteria: 'กระแสไฟและแรงดันตามเนมเพลท', frequency: 'D', time: '08:00' },
        { no: 8, description: 'การสั่นสะเทือนของคอมเพรสเซอร์และโครงสร้างยึด', criteria: 'ขายึดแน่น ยางรองไม่เสื่อมสภาพ', frequency: 'D', time: '08:00' },
        { no: 9, description: 'สายไฟหลัก เบรกเกอร์ และระบบสายดิน ไม่ร้อนผิดปกติ', criteria: 'จุดขันแน่น ไม่ร้อน สายดินสมบูรณ์', frequency: 'D', time: '08:00' },
        { no: 10, description: 'ทดสอบตั้งเวลา เปิด-ปิด และระบบควบคุมอัตโนมัติ', criteria: 'เปิด-ปิดตามโปรแกรมปกติ', frequency: 'D', time: '08:15' }
      ]);
    } else {
      // General Corrugated Box standard
      setEditingItems(JSON.parse(JSON.stringify(DEFAULT_INSPECTION_ITEMS)));
    }
  };

  // Save customized items
  const handleSaveCustomItems = async () => {
    if (!currentMachine) return;
    setIsSavingItems(true);
    const success = await onUpdateMachineItems(currentMachine.id, selectedMonth, editingItems);
    setIsSavingItems(false);
    if (success) {
      setShowCustomizeModal(false);
      triggerSaveToast(`บันทึกรายการตรวจของเครื่อง ${currentMachine.tagCode || currentMachine.name} แล้ว`);
    }
  };

  // Save remarks and approver
  const handleSaveSheetDetails = async () => {
    if (!currentSheet) return;
    setIsSavingDetails(true);
    const success = await onUpdateSheetDetails(
      currentSheet.id,
      remarksInput,
      approverInput,
      new Date().toISOString().split('T')[0]
    );
    setIsSavingDetails(false);
    if (success) {
      triggerSaveToast('บันทึกหมายเหตุและการรับรองเรียบร้อยแล้ว');
    }
  };

  // Parse selectedMonth (e.g. "2027-01", "2028-12", "2026-10")
  const [selectedYearStr, selectedMonthNumStr] = (selectedMonth || '2026-10').split('-');
  const currentYear = parseInt(selectedYearStr, 10) || 2026;
  const currentThaiYear = currentYear + 543;
  const currentMonthNum = selectedMonthNumStr ? selectedMonthNumStr.padStart(2, '0') : '10';
  const currentMonthIndex = Math.max(0, Math.min(11, parseInt(currentMonthNum, 10) - 1));
  const currentMonthInfo = THAI_MONTHS_LIST[currentMonthIndex] || THAI_MONTHS_LIST[9];

  const handleSelectYear = (year: number) => {
    onSelectMonth(`${year}-${currentMonthNum}`);
  };

  const handleSelectMonthNum = (monthNum: string) => {
    onSelectMonth(`${currentYear}-${monthNum}`);
  };

  const handlePrevYear = () => {
    handleSelectYear(currentYear - 1);
  };

  const handleNextYear = () => {
    handleSelectYear(currentYear + 1);
  };

  const daysArray = Array.from({ length: 31 }, (_, i) => i + 1);

  const sheetToUse = currentSheet || sheets.find((s) => s.machineId === selectedMachineId) || sheets[0];

  return (
    <>
      {sheetToUse && (
        <div className={activeView === 'print' ? 'space-y-4 print:space-y-0' : 'hidden'}>
          {/* Sub-tab navigation inside Daily Inspection */}
          <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-4 flex flex-wrap items-center justify-between gap-3 print:hidden no-print">
            <div className="flex items-center gap-1.5 bg-slate-200/90 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setActiveView('matrix')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium text-slate-700 hover:text-slate-900 transition cursor-pointer"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>ตารางตรวจเช็ค (Matrix Grid)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('print')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold bg-white text-blue-600 shadow-xs transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>หน้าพิมพ์แบบตรวจเช็ค (FM-MN01-04)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setActiveView('matrix')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>กลับไปยังตารางตรวจเช็ค</span>
            </button>
          </div>

          <PrintableInspectionDocument
            ref={printableDocRef}
            sheet={sheetToUse}
            allMachines={machines}
            allSheets={sheets}
            onSelectSheet={(s) => {
              onSelectMachine(s.machineId);
              onSelectMonth(s.month);
            }}
            selectedMonth={selectedMonth}
            onSelectMonth={onSelectMonth}
            onBack={() => setActiveView('matrix')}
            onUpdateMachine={onUpdateMachine}
          />
        </div>
      )}

      <div className={activeView === 'matrix' ? 'max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4' : 'hidden'}>
      
      {/* Sub-tab switcher inside Daily Inspection */}
      <div className="flex items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs print:hidden no-print">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setActiveView('matrix')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold bg-white text-blue-600 shadow-2xs transition cursor-pointer"
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>ตารางบันทึกประจำวัน (Matrix Grid)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('print')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>หน้าพิมพ์แบบตรวจเช็ค (FM-MN01-04)</span>
          </button>
        </div>

        <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
          FM-MN01-04 Rev.00 Date 19/10/2026
        </span>
      </div>

      {/* 1-Month Maintenance Pilot Banner (Formal Notice) */}
      <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 text-white rounded-2xl p-3 sm:p-4 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/20 backdrop-blur-xs rounded-xl shrink-0">
            <ShieldCheck className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase tracking-wider font-extrabold bg-white/25 px-2 py-0.5 rounded-md font-mono">
                {t.pilotNoticeTitle}
              </span>
              <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-md">
                1 เดือนชั่วคราว • ก่อนส่งมอบแผนกผลิต
              </span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-white/95 mt-1 leading-snug">
              📢 <strong>{t.pilotNoticeText}</strong>
            </p>
          </div>
        </div>

        {/* Language selector in banner */}
        <div className="flex items-center gap-1.5 bg-black/25 backdrop-blur-xs p-1 rounded-xl self-end md:self-auto border border-white/20">
          <Globe className="w-3.5 h-3.5 text-white/80 ml-1.5" />
          {SUPPORTED_LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => onSelectLang(l.code)}
              className={`px-2 py-1 text-xs font-bold rounded-lg transition ${
                currentLang === l.code
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-white/80 hover:text-white'
              }`}
              title={l.label}
            >
              <span>{l.flag}</span> <span className="hidden sm:inline">{l.nativeLabel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Save Confirmation Toast */}
      {saveToast && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Top Banner: Official Form Identifier */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          {currentMachine?.imageUrl && !imageError ? (
            <img
              src={currentMachine.imageUrl}
              alt={currentMachine.name}
              onError={() => setImageError(true)}
              className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-xs shrink-0"
            />
          ) : (
            <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl shrink-0">
              <ClipboardCheck className="w-6 h-6 text-blue-600" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {t.formDailyTitle}
              </h1>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                {t.formDailyCode}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.systemSubtitle} • {currentMachine?.tagCode} ({currentMachine?.name})
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Customize machine checklist items button */}
          <button
            onClick={handleOpenCustomizeModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-300 transition cursor-pointer"
            title="ตั้งค่าข้อตรวจเช็คเฉพาะเครื่องนี้"
          >
            <Settings2 className="w-4 h-4 text-slate-600" />
            <span>{t.customizeItemsButton}</span>
          </button>

          {/* Quick Check Today */}
          <button
            onClick={() => handleOpenDayModal(currentDayNum <= 31 ? currentDayNum : 1)}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{t.todayCheckButton} ({t.modalDateLabel} {currentDayNum})</span>
          </button>

          {/* Direct PDF Export + Print View switch */}
          {(currentSheet || sheetToUse) && (
            <>
              <button
                type="button"
                onClick={handleDirectExportPdf}
                disabled={isExportingPdf}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                title="บันทึกแบบตรวจเช็คประจำวัน FM-MN01-04 เป็นไฟล์ PDF (1 หน้า) ทันที"
              >
                {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>{isExportingPdf ? 'กำลังสร้าง PDF...' : 'บันทึกเป็น PDF (FM-MN01-04)'}</span>
              </button>
              <button
                onClick={() => setActiveView('print')}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
                title="พิมพ์แบบตรวจเช็ค FM-MN01-04"
              >
                <Printer className="w-4 h-4" />
                <span>{t.printA4Button}</span>
              </button>
            </>
          )}

          {/* Guide SOP Button */}
          {onOpenGuide && (
            <button
              type="button"
              onClick={onOpenGuide}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200 shadow-2xs transition cursor-pointer"
              title="ดูคู่มือขั้นตอนการตรวจเช็คและแจ้งซ่อม (SOP User Guide)"
            >
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>ขั้นตอนการใช้ระบบ</span>
            </button>
          )}
        </div>
      </div>

      {/* Year & 12-Month Selector Bar (รอบการตรวจสอบประจำปี 2570-2571 และทุกปี 12 เดือน) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-4 space-y-3">
        {/* Top row: Header, Highlighted Year Pills (including 2570-2571), and Year Stepper */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  รอบปีและเดือนในการตรวจเช็ค (Inspection Period)
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-600 text-white shadow-2xs">
                  {currentMonthInfo.thaiName} พ.ศ. {currentThaiYear} ({currentYear})
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                เลือกปี พ.ศ. 2570 - 2571 หรือทุกปี พร้อมแถบทางลัด 12 เดือน (ม.ค. - ธ.ค.)
              </p>
            </div>
          </div>

          {/* Year Switcher with Fast Pills & Stepper */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Year Badges (specifically featuring 2570 and 2571) */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
              {[
                { y: 2026, ty: 2569, label: 'ปี 2569 (2026)' },
                { y: 2027, ty: 2570, label: '★ ปี 2570 (2027)', featured: true },
                { y: 2028, ty: 2571, label: '★ ปี 2571 (2028)', featured: true },
                { y: 2029, ty: 2572, label: 'ปี 2572 (2029)' }
              ].map((item) => {
                const isActive = currentYear === item.y;
                return (
                  <button
                    key={item.y}
                    type="button"
                    onClick={() => handleSelectYear(item.y)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      isActive
                        ? item.featured
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white text-slate-900 shadow-xs'
                        : item.featured
                        ? 'text-blue-700 hover:bg-blue-50 font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title={`เลือกตรวจเช็คปี พ.ศ. ${item.ty} (ค.ศ. ${item.y})`}
                  >
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Stepper + Full Year Dropdown (2567 - 2575) */}
            <div className="flex items-center bg-slate-50 border border-slate-300 rounded-xl px-1.5 py-1">
              <button
                type="button"
                onClick={handlePrevYear}
                className="p-1 hover:bg-slate-200 rounded text-slate-600 transition cursor-pointer"
                title="ปีก่อนหน้า"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <select
                value={currentYear}
                onChange={(e) => handleSelectYear(Number(e.target.value))}
                className="text-xs font-bold text-slate-800 bg-transparent border-0 focus:outline-hidden cursor-pointer px-1.5"
              >
                {AVAILABLE_INSPECTION_YEARS.map((y) => (
                  <option key={y.year} value={y.year}>
                    {y.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleNextYear}
                className="p-1 hover:bg-slate-200 rounded text-slate-600 transition cursor-pointer"
                title="ปีถัดไป"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 12 Months Navigation Pills Bar (มกราคม ถึง ธันวาคม) */}
        <div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-1.5">
            {THAI_MONTHS_LIST.map((m) => {
              const isSelected = m.num === currentMonthNum;
              return (
                <button
                  key={m.num}
                  type="button"
                  onClick={() => handleSelectMonthNum(m.num)}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition cursor-pointer border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-300'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                  title={`เดือน ${m.thaiName} (${m.enName})`}
                >
                  <span className={`text-[10px] font-mono leading-none ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                    {m.num}
                  </span>
                  <span className="text-xs font-bold mt-0.5">
                    {m.shortName}
                  </span>
                  <span className={`text-[9px] truncate max-w-full hidden lg:block leading-none mt-0.5 ${
                    isSelected ? 'text-blue-100' : 'text-slate-400'
                  }`}>
                    {m.thaiName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Machine Selector Bar: Horizontal Chips for all 33 Machines */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 px-1">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {t.selectMachineTitle} ({machines.length} รายการ)
            </span>
          </div>

          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <span>ตารางประจำเดือน:</span>
            <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              {currentMonthInfo.thaiName} {currentThaiYear}
            </span>
          </div>
        </div>

        {/* Scrollable list of machines */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
          {machines.map((m) => {
            const isSelected = m.id === selectedMachineId;
            const isOffice = m.category === 'office';
            return (
              <button
                key={m.id}
                onClick={() => onSelectMachine(m.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left transition shrink-0 border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span
                  className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : isOffice
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : 'bg-white text-slate-800 border border-slate-200'
                  }`}
                >
                  {m.tagCode || `BS-${String(m.no || 0).padStart(2, '0')}`}
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold leading-tight truncate max-w-[130px]">
                    {m.name}
                  </span>
                  <span
                    className={`text-[10px] truncate max-w-[130px] font-mono ${
                      isSelected ? 'text-blue-100' : 'text-slate-500'
                    }`}
                  >
                    {m.model && m.model !== '-' ? m.model : m.code}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Abnormal Alert (if any defects detected in this sheet) */}
      {abnormalCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-900 flex items-center gap-2 flex-wrap">
                <span>{t.abnormalFoundTitle} (X) {abnormalCount} {t.abnormalItemsUnit}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 font-medium font-mono">
                  {currentMachine?.tagCode} - {currentMachine?.name}
                </span>
              </div>
              <p className="text-[11px] text-amber-700 mt-0.5">
                {abnormalList.map((a) => `${t.modalDateLabel} ${a.day} (${a.itemDesc})`).join(', ')}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const notes = abnormalList.map((a) => `พบจุดผิดปกติจากการตรวจเช็คประจำวัน FM-MN01-04 วันที่ ${a.day}: ${a.itemDesc}`).join('\n');
              onOpenReportTicket(currentMachine, notes);
            }}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition shrink-0"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>{t.createTicketNow}</span>
          </button>
        </div>
      )}

      {/* Official Checklist Matrix Table matching FM-MN01-04 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Subheader */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <span className="text-slate-500 font-medium">{t.machineLabel}: </span>
              <strong className="text-slate-900 font-bold">
                {currentMachine?.name} ({currentMachine?.code})
              </strong>
              {currentMachine?.model && currentMachine.model !== '-' && (
                <span className="ml-1.5 font-mono text-slate-500">[{currentMachine.model}]</span>
              )}
            </div>
            <div>
              <span className="text-slate-500 font-medium">{t.departmentLabel}: </span>
              <strong className="text-slate-900">{currentMachine?.department || t.productionDept} ({t.factoryLocation})</strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const nextRole = inspectorRole === 'maintenance' ? 'production' : 'maintenance';
                setInspectorRole(nextRole);
                triggerSaveToast(
                  nextRole === 'maintenance'
                    ? 'เปลี่ยนผู้ตรวจสอบเป็น: ทีมซ่อมบำรุง (ตรวจสอบชั่วคราว)'
                    : 'เปลี่ยนผู้ตรวจสอบเป็น: แผนกผลิต (หลังส่งมอบงาน)'
                );
              }}
              title="คลิกเพื่อสลับสถานะผู้ตรวจสอบ (ทีมซ่อมบำรุง / แผนกผลิต)"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                inspectorRole === 'maintenance'
                  ? 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>
                {inspectorRole === 'maintenance' ? t.inspectedByMaintenance : t.inspectedByProduction}
              </span>
            </button>
          </div>
        </div>

        {/* Matrix Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px]">
                <th rowSpan={2} className="py-2.5 px-2 text-center w-9 border-r border-slate-800">
                  {t.colNo}
                </th>
                <th rowSpan={2} className="py-2.5 px-3 min-w-[200px] border-r border-slate-800">
                  <div className="flex items-center justify-between">
                    <span>{t.colDescription} ({rawItems.length} ข้อ)</span>
                    <button
                      onClick={handleOpenCustomizeModal}
                      className="text-[10px] text-blue-300 hover:text-white underline cursor-pointer"
                    >
                      แก้ไข
                    </button>
                  </div>
                </th>
                <th rowSpan={2} className="py-2.5 px-3 min-w-[190px] border-r border-slate-800 font-semibold text-blue-200">
                  {t.colCriteria}
                </th>
                <th rowSpan={2} className="py-2.5 px-1.5 text-center w-11 border-r border-slate-800 leading-tight">
                  <div>ความ</div>
                  <div>ถี่</div>
                </th>
                <th colSpan={31} className="py-2 px-2 text-center border-b border-slate-800 bg-slate-950 font-bold">
                  {t.resultsMonthLabel} {currentMonthInfo.thaiName} พ.ศ. {currentThaiYear} ({currentMonthInfo.enName} {currentYear})
                </th>
                <th rowSpan={2} className="py-2.5 px-2 text-center min-w-[95px] border-l border-slate-800 font-mono">
                  {t.colTicketNo}
                </th>
              </tr>
              <tr className="bg-slate-800 text-white text-[10px] font-mono">
                {daysArray.map((d) => {
                  const isCurrentDay = d === currentDayNum;
                  return (
                    <th
                      key={d}
                      onClick={() => handleOpenDayModal(d)}
                      title={`คลิกเพื่อบันทึกการตรวจเช็คทั้งหมดสำหรับวันที่ ${d}`}
                      className={`py-1.5 px-0.5 text-center w-7 border-r border-slate-700 cursor-pointer transition hover:bg-blue-600 ${
                        isCurrentDay ? 'bg-blue-600 font-black text-white' : ''
                      }`}
                    >
                      {d}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {rawItems.map((item) => (
                <tr key={item.no} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2 px-2 text-center font-bold text-slate-500 border-r border-slate-200 bg-slate-50/50">
                    {item.no}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200 leading-tight">
                    <span className="font-semibold text-slate-900">{getItemDescription(item)}</span>
                    {currentLang !== 'th' && (
                      <span className="block text-[10px] text-slate-400 mt-0.5 font-sans">
                        {item.description}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200 text-slate-700 text-[11px] leading-tight bg-slate-50/40">
                    {item.criteria || 'ไม่แตกหัก , หลวมคลอน, พร้อมใช้งาน'}
                  </td>
                  <td className="py-2 px-1 text-center font-bold text-slate-700 border-r border-slate-200">
                    <span className="inline-block px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono">
                      {item.frequency || 'D'}
                    </span>
                  </td>

                  {/* 31 days check cells */}
                  {daysArray.map((d) => {
                    const status = daysRecord[d]?.results?.[item.no];
                    const isToday = d === currentDayNum;

                    return (
                      <td
                        key={d}
                        onClick={() => {
                          if (currentMachine) {
                            const currentVal = status || null;
                            onToggleCell(currentMachine.id, selectedMonth, d, item.no, currentVal);
                            const nextLabel =
                              currentVal === 'pass'
                                ? '✕ ผิดปกติ (x)'
                                : currentVal === 'abnormal'
                                ? '■ ไม่ตรวจ'
                                : currentVal === 'off'
                                ? '· ล้างค่า'
                                : '✓ ปกติ (/)';
                            triggerSaveToast(`วันที่ ${d} ข้อ ${item.no} → ${nextLabel}`);
                          }
                        }}
                        title={`วันที่ ${d} - ข้อ ${item.no}: คลิกเพื่อเปลี่ยนสถานะ (ปกติ / ผิดปกติ / ไม่ตรวจ)`}
                        className={`p-0 text-center border-r border-slate-200 cursor-pointer select-none transition ${
                          isToday ? 'bg-blue-50/40' : ''
                        } hover:bg-blue-100/60`}
                      >
                        <div className="h-8 flex items-center justify-center">
                          {status === 'pass' && (
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs">
                              /
                            </span>
                          )}
                          {status === 'abnormal' && (
                            <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-black flex items-center justify-center text-xs animate-bounce shadow-xs">
                              x
                            </span>
                          )}
                          {status === 'off' && (
                            <span className="w-4 h-4 rounded-xs bg-slate-300 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                              ■
                            </span>
                          )}
                          {!status && (
                            <span className="text-slate-300 text-xs hover:text-slate-400">·</span>
                          )}
                        </div>
                      </td>
                    );
                  })}

                  {/* เลขที่ใบแจ้งซ่อม Column */}
                  <td className="py-1 px-1.5 text-center border-l border-slate-200 text-[10px] font-mono">
                    {item.repairTicketNo ? (
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold border border-rose-200 inline-block shadow-2xs text-[9.5px]">
                        {item.repairTicketNo}
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                </tr>
              ))}

              {/* Inspector Sign Row (ผู้ตรวจ) */}
              <tr className="bg-slate-50 font-medium text-[11px] border-t-2 border-slate-300">
                <td colSpan={4} className="py-2.5 px-3 text-right font-bold text-slate-700 border-r border-slate-200">
                  {t.colInspector} ({t.inspectedByMaintenance})
                </td>
                {daysArray.map((d) => {
                  const inspector = daysRecord[d]?.inspectorName;
                  return (
                    <td
                      key={d}
                      onClick={() => handleOpenDayModal(d)}
                      className="py-1 px-0.5 text-center border-r border-slate-200 text-[9px] font-medium text-slate-600 truncate max-w-[32px] cursor-pointer hover:bg-blue-50"
                      title={inspector ? `ผู้ตรวจ: ${inspector}` : `คลิกเพื่อลงชื่อผู้ตรวจวันที่ ${d}`}
                    >
                      {inspector ? inspector.split(' ')[0] : '-'}
                    </td>
                  );
                })}
                <td className="border-l border-slate-200 bg-slate-50"></td>
              </tr>

              {/* Supervisor Sign Row (หัวหน้าฝ่าย) */}
              <tr className="bg-slate-50 font-medium text-[11px]">
                <td colSpan={4} className="py-2 px-3 text-right font-bold text-slate-700 border-r border-slate-200">
                  {t.colSupervisor} (รับรอง)
                </td>
                {daysArray.map((d) => {
                  const supervisor = daysRecord[d]?.supervisorName;
                  return (
                    <td
                      key={d}
                      onClick={() => handleOpenDayModal(d)}
                      className="py-1 px-0.5 text-center border-r border-slate-200 text-[9px] font-medium text-slate-600 truncate max-w-[32px] cursor-pointer hover:bg-blue-50"
                      title={supervisor ? `หัวหน้าฝ่าย: ${supervisor}` : `คลิกเพื่อลงชื่อหัวหน้าฝ่ายวันที่ ${d}`}
                    >
                      {supervisor ? supervisor.split(' ')[0] : '-'}
                    </td>
                  );
                })}
                <td className="border-l border-slate-200 bg-slate-50"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Legend and Table Footer matching KOCH Standard */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-slate-700">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-4 font-semibold text-slate-800 border-r border-slate-200 pr-4">
              <span><strong className="text-blue-600">D</strong> = ตรวจประจำวัน</span>
              <span><strong className="text-blue-600">W</strong> = ตรวจรายสัปดาห์</span>
              <span><strong className="text-blue-600">M</strong> = ตรวจรายเดือน</span>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="font-bold text-slate-900">การบันทึกผล :</span>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs">
                  /
                </span>
                <span><strong>= ปกติ</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-bold flex items-center justify-center text-xs">
                  x
                </span>
                <span><strong>= ผิดปกติ</strong> (รายละเอียดระบุในใบแจ้งซ่อม ตามเลขที่ใบแจ้งซ่อม)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 bg-slate-300 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                  ■
                </span>
                <span><strong>= ไม่ทำการตรวจ</strong></span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400">
            {t.clickToCycleHint}
          </div>
        </div>
      </div>

      {/* Remarks & Approver Section matching image_acfb214d.png */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Remarks input */}
          <div className="lg:col-span-2 space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>{t.remarksTitle} :</span>
              <span className="text-[11px] text-slate-400 font-normal">บันทึกข้อเสนอแนะประจำเดือน</span>
            </label>
            <textarea
              rows={3}
              value={remarksInput}
              onChange={(e) => setRemarksInput(e.target.value)}
              placeholder={t.remarksPlaceholder}
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl p-3 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Approver Sign-off Section */}
          <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>{t.colApprover} :</span>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                  อนุมัติผ่านระบบ
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                สำหรับผู้มีอำนาจลงนามและปรินเอกสารเสนอเซ็น
              </p>

              <div className="mt-2.5">
                <input
                  type="text"
                  value={approverInput}
                  onChange={(e) => setApproverInput(e.target.value)}
                  placeholder="ชื่อ-นามสกุล และตำแหน่งผู้อนุมัติ..."
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400">
                {t.formDailyCode}
              </span>
              <button
                type="button"
                onClick={handleSaveSheetDetails}
                disabled={isSavingDetails}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition"
              >
                {isSavingDetails ? 'กำลังบันทึก...' : t.saveRemarksButton}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Modal: Quick Daily Inspection Check (สำหรับผู้ตรวจหน้างาน) */}
      {/* ============================================================ */}
      {showQuickCheckModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                    {checkDay}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {t.modalQuickCheckTitle}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {t.modalDateLabel} {checkDay} {currentMonthInfo.thaiName} พ.ศ. {currentThaiYear} ({currentYear}) • {currentMachine?.tagCode} ({currentMachine?.name})
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowQuickCheckModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick 1-click batch actions */}
            <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-600 font-medium">ตั้งค่าด่วนทั้ง 10 ข้อ:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSetAll('pass')}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px] transition"
                >
                  {t.modalSetAllPass}
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAll('off')}
                  className="px-2.5 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold text-[11px] transition"
                >
                  {t.modalSetAllOff}
                </button>
              </div>
            </div>

            {/* Checklist items rows */}
            <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
              {rawItems.map((it) => {
                const currentVal = modalResults[it.no];
                return (
                  <div key={it.no} className="pt-2 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded shrink-0 mt-0.5">
                        #{it.no}
                      </span>
                      <div>
                        <div className="text-xs font-semibold text-slate-900">
                          {getItemDescription(it)}
                        </div>
                        {it.criteria && (
                          <div className="text-[11px] text-blue-800 bg-blue-50 border border-blue-200/80 rounded px-2 py-0.5 mt-0.5 font-medium inline-block">
                            <span className="font-bold">เกณฑ์มาตรฐาน:</span> {it.criteria}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>เวลาตรวจ {it.time || '08:00'}</span>
                          </span>
                          <span className="px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 font-mono font-semibold">
                            ความถี่: {it.frequency || 'D'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status radio buttons */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => setModalResults((prev) => ({ ...prev, [it.no]: 'pass' }))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                          currentVal === 'pass'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>✓ ปกติ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalResults((prev) => ({ ...prev, [it.no]: 'abnormal' }))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                          currentVal === 'abnormal'
                            ? 'bg-rose-600 text-white shadow-xs animate-pulse'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>✕ ผิดปกติ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalResults((prev) => ({ ...prev, [it.no]: 'off' }))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                          currentVal === 'off'
                            ? 'bg-slate-800 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span>■ ไม่ตรวจ</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Inspector and Supervisor fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {t.modalInspectorLabel} :
                </label>
                <input
                  type="text"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  placeholder="เช่น สมเกียรติ มั่นคง (ช่างซ่อมบำรุง)"
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {t.modalSupervisorLabel} :
                </label>
                <input
                  type="text"
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                  placeholder="เช่น เกียรติศักดิ์ พรหมดี"
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {t.modalNotesLabel} :
                </label>
                <input
                  type="text"
                  value={dayNotes}
                  onChange={(e) => setDayNotes(e.target.value)}
                  placeholder={t.modalNotesPlaceholder}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowQuickCheckModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                {t.modalCancel}
              </button>
              <button
                type="button"
                onClick={handleSaveModal}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
              >
                {isSubmitting ? 'กำลังบันทึก...' : t.modalSave}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Modal: Customize Checklist Items (แก้ไขรายการเฉพาะเครื่อง) */}
      {/* ============================================================ */}
      {showCustomizeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-blue-600" />
                  <span>{t.customizeModalTitle}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  เครื่องจักร: <strong className="text-slate-800">{currentMachine?.tagCode} - {currentMachine?.name}</strong> ({currentMachine?.processName})
                </p>
              </div>
              <button
                onClick={() => setShowCustomizeModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Presets Selector */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>{t.loadPresetLabel} (แบบฟอร์มมาตรฐาน KOCH)</span>
                <span className="text-[11px] text-blue-600 font-normal">คลิกเพื่อโหลดเกณฑ์มาตรฐาน</span>
              </span>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleLoadPreset('slot')}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-2xs transition cursor-pointer flex items-center gap-1"
                >
                  <span>⭐️ แบบฟอร์ม SLOT (MA2312014)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPreset('cutting')}
                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-2xs transition cursor-pointer flex items-center gap-1"
                >
                  <span>⭐️ แบบฟอร์ม CUTTING (MA2312001)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPreset('general')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-lg border border-slate-300 transition cursor-pointer"
                >
                  {t.presetGeneral} (10 ข้อ)
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPreset('flexo')}
                  className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 font-semibold rounded-lg border border-purple-200 transition cursor-pointer"
                >
                  {t.presetFlexo}
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPreset('diecut')}
                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded-lg border border-emerald-200 transition cursor-pointer"
                >
                  {t.presetDieCut}
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPreset('autostitch')}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded-lg border border-amber-200 transition cursor-pointer"
                >
                  {t.presetAutoStitch}
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPreset('office')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg border border-slate-300 transition cursor-pointer"
                >
                  เครื่องปรับอากาศ Office (FCU/CDU)
                </button>
              </div>
            </div>

            {/* Editable Items list */}
            <div className="max-h-[420px] overflow-y-auto space-y-2.5 pr-1">
              {editingItems.map((it, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 hover:border-blue-400 transition shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>

                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={it.description}
                        onChange={(e) => handleUpdateItemField(idx, 'description', e.target.value)}
                        placeholder="หัวข้อตรวจสอบ (เช่น สวิตช์เปิดปิด, มอเตอร์)..."
                        className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Frequency selector */}
                    <div className="w-20 shrink-0">
                      <select
                        value={it.frequency || 'D'}
                        onChange={(e) => handleUpdateItemField(idx, 'frequency', e.target.value)}
                        className="w-full text-xs font-mono font-bold text-center bg-slate-50 border border-slate-300 rounded-lg px-1 py-1.5"
                        title="ความถี่: D=ตรวจประจำวัน, W=ตรวจรายสัปดาห์, M=ตรวจรายเดือน"
                      >
                        <option value="D">D (วัน)</option>
                        <option value="W">W (สัปดาห์)</option>
                        <option value="M">M (เดือน)</option>
                      </select>
                    </div>

                    <div className="w-20 shrink-0">
                      <input
                        type="text"
                        value={it.time || '08:00'}
                        onChange={(e) => handleUpdateItemField(idx, 'time', e.target.value)}
                        placeholder="08:00"
                        className="w-full text-xs text-center font-mono bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5"
                        title="เวลาตรวจสอบ"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                      title="ลบข้อนี้"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Second row: เกณฑ์มาตรฐานการตรวจสอบ & เลขที่ใบแจ้งซ่อม */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pl-8">
                    <div className="sm:col-span-8">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-blue-700 shrink-0">เกณฑ์มาตรฐาน:</span>
                        <input
                          type="text"
                          value={it.criteria || ''}
                          onChange={(e) => handleUpdateItemField(idx, 'criteria', e.target.value)}
                          placeholder="เช่น ไม่แตกหัก , หลวมคลอน,ชำรุด / พร้อมใช้งาน / ไม่มีคราบสกปรก"
                          className="w-full text-[11px] bg-blue-50/50 border border-blue-200 rounded-lg px-2.5 py-1 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-rose-700 shrink-0">ใบแจ้งซ่อม:</span>
                        <input
                          type="text"
                          value={it.repairTicketNo || ''}
                          onChange={(e) => handleUpdateItemField(idx, 'repairTicketNo', e.target.value)}
                          placeholder="เช่น MN-202610-001"
                          className="w-full text-[11px] font-mono bg-rose-50/40 border border-rose-200 rounded-lg px-2 py-1 text-rose-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add item button */}
            <button
              type="button"
              onClick={handleAddItem}
              className="w-full py-2 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl text-xs font-bold text-slate-600 hover:text-blue-600 transition flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addItemButton}</span>
            </button>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => handleLoadPreset('general')}
                className="text-xs text-slate-500 hover:text-slate-800 underline"
              >
                {t.resetDefaultButton}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomizeModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  {t.modalCancel}
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomItems}
                  disabled={isSavingItems}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
                >
                  {isSavingItems ? 'กำลังบันทึก...' : t.saveItemsButton}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};
