import React, { useState, useMemo, useRef } from 'react';
import { 
  Cog, 
  Plus, 
  Search, 
  Filter, 
  Wrench, 
  CheckCircle, 
  AlertTriangle, 
  Building2, 
  Trash2, 
  Edit3, 
  ChevronRight, 
  Layers, 
  Printer, 
  Scissors, 
  Boxes, 
  X,
  FileSpreadsheet,
  Activity,
  Zap,
  Wind,
  Droplets,
  Info,
  ExternalLink,
  Download,
  Loader2,
  Maximize2,
  ClipboardCheck,
  Table as TableIcon,
  Package,
  Camera,
  RotateCcw,
  Upload,
  Image as ImageIcon,
  FileUp,
  Check
} from 'lucide-react';
import { MachineAsset, MaintenanceTicket } from '../types/ticket';
import { MachineBOMItem } from '../types/bom';
import { SparePartItemMaster, StockTransaction } from '../types/sparePart';
import { MachineBOMManager } from './MachineBOMManager';
import { SparePartsManager } from './SparePartsManager';
import { MachineRepairHistoryManager } from './MachineRepairHistoryManager';
import { KochLogo } from './KochLogo';
import { exportElementToPdf } from '../utils/pdfExport';
import { History } from 'lucide-react';

interface MachineListManagerProps {
  machines: MachineAsset[];
  tickets: MaintenanceTicket[];
  onCreateMachine: (data: Partial<MachineAsset>) => Promise<any>;
  onUpdateMachine: (id: string, updates: Partial<MachineAsset>) => Promise<any>;
  onDeleteMachine: (id: string) => Promise<any>;
  onReportIssueForMachine: (machine: MachineAsset) => void;
  onFilterTicketsByMachine?: (machineCode: string) => void;
  onViewChecklist?: (machine: MachineAsset) => void;
  onOpenPrintRegistry?: () => void;
  onSelectTicket?: (ticket: MaintenanceTicket) => void;
  onPrintTicket?: (ticket: MaintenanceTicket) => void;
  bomItems?: MachineBOMItem[];
  onRecordReplacement?: (bomItemId: string, payload: any) => Promise<any>;
  onCreateBOMItem?: (itemData: Partial<MachineBOMItem>) => Promise<any>;
  onUpdateBOMItem?: (id: string, updates: Partial<MachineBOMItem>) => Promise<any>;
  onDeleteBOMItem?: (id: string) => Promise<any>;
  spareParts?: SparePartItemMaster[];
  transactions?: StockTransaction[];
  onCreateSparePart?: (data: Partial<SparePartItemMaster>) => Promise<any>;
  onUpdateSparePart?: (id: string, updates: Partial<SparePartItemMaster>) => Promise<any>;
  onDeleteSparePart?: (id: string) => Promise<any>;
  onAdjustStock?: (id: string, payload: any) => Promise<any>;
}

export const MachineListManager: React.FC<MachineListManagerProps> = ({
  machines,
  tickets,
  onCreateMachine,
  onUpdateMachine,
  onDeleteMachine,
  onReportIssueForMachine,
  onViewChecklist,
  onOpenPrintRegistry,
  onSelectTicket,
  onPrintTicket,
  bomItems = [],
  onRecordReplacement = async () => ({ success: true }),
  onCreateBOMItem = async () => ({ success: true }),
  onUpdateBOMItem = async () => ({ success: true }),
  onDeleteBOMItem = async () => ({ success: true }),
  spareParts = [],
  transactions = [],
  onCreateSparePart = async () => ({ success: true }),
  onUpdateSparePart = async () => ({ success: true }),
  onDeleteSparePart = async () => ({ success: true }),
  onAdjustStock = async () => ({ success: true })
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'machine' | 'office' | 'infrastructure'>('all');
  const [selectedProcess, setSelectedProcess] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  // Sub-tabs: 'table' (Machine Registry) or 'history' (Repair History) or 'bom' (Bill of Materials) or 'spare_parts' (Spare Parts Catalog)
  const [activeSubTab, setActiveSubTab] = useState<'table' | 'history' | 'bom' | 'spare_parts'>('table');
  const [historySelectedMachineId, setHistorySelectedMachineId] = useState<string>(machines[0]?.id || '');
  const [bomSelectedMachineId, setBomSelectedMachineId] = useState<string>('all');
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string } | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMachine, setEditingMachine] = useState<MachineAsset | null>(null);
  const [inspectingMachine, setInspectingMachine] = useState<MachineAsset | null>(null);

  // Form state
  const [formNo, setFormNo] = useState<number>(machines.length + 1);
  const [formTagCode, setFormTagCode] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formSerialNo, setFormSerialNo] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formProcess, setFormProcess] = useState('Cutting');
  const [formLocation, setFormLocation] = useState('บางแสน BS');
  const [formCategory, setFormCategory] = useState<'machine' | 'office' | 'infrastructure' | 'utility'>('machine');
  const [formDepartment, setFormDepartment] = useState('ฝ่ายผลิต');
  const [formDimensions, setFormDimensions] = useState('');
  const [formMinMaxSheet, setFormMinMaxSheet] = useState('');
  const [formPower, setFormPower] = useState('3Phase 380V 63A');
  const [formKwHp, setFormKwHp] = useState('');
  const [formAirWater, setFormAirWater] = useState('No');
  const [formMotorSpec, setFormMotorSpec] = useState('');
  const [formGearSpec, setFormGearSpec] = useState('');
  const [formSupplier, setFormSupplier] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'breakdown' | 'maintenance'>('active');
  const [formNotes, setFormNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // PDF Download ref & state
  const pdfExportRef = useRef<HTMLDivElement>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Computer Photo upload state & ref
  const machinePhotoInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [showUrlFallback, setShowUrlFallback] = useState(false);
  const [quickUploadSuccessId, setQuickUploadSuccessId] = useState<string | null>(null);

  const handleMachinePhotoFile = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง (PNG, JPG, JPEG, WEBP)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setFormImageUrl(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleQuickUploadForMachine = (machineId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง (PNG, JPG, JPEG, WEBP)');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        await onUpdateMachine(machineId, { imageUrl: event.target.result as string, photoUrl: event.target.result as string });
        setQuickUploadSuccessId(machineId);
        setTimeout(() => setQuickUploadSuccessId(null), 3000);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDownloadPdfTable = async () => {
    if (!pdfExportRef.current) return;
    setIsDownloadingPdf(true);
    await exportElementToPdf(
      pdfExportRef.current,
      'รายชื่อทะเบียนเครื่องมือ-เครื่องจักร_FM-MN01-01.pdf'
    );
    setIsDownloadingPdf(false);
  };

  // Map active tickets count per machine
  const activeTicketMap = useMemo(() => {
    const map: Record<string, { count: number; tickets: MaintenanceTicket[] }> = {};
    tickets.forEach((t) => {
      if (['pending', 'in_progress', 'waiting_parts'].includes(t.status)) {
        if (!map[t.machineNo]) {
          map[t.machineNo] = { count: 0, tickets: [] };
        }
        map[t.machineNo].count++;
        map[t.machineNo].tickets.push(t);
      }
    });
    return map;
  }, [tickets]);

  // Extract unique process names for filter
  const uniqueProcesses = useMemo(() => {
    const set = new Set<string>();
    machines.forEach((m) => {
      if (m.processName) set.add(m.processName);
    });
    return Array.from(set);
  }, [machines]);

  // Filtered list
  const filteredMachines = useMemo(() => {
    return machines
      .filter((m) => {
        const q = searchQuery.toLowerCase().trim();
        const matchSearch =
          !q ||
          (m.no && String(m.no).includes(q)) ||
          (m.no && String(m.no).padStart(2, '0').includes(q)) ||
          (m.tagCode && m.tagCode.toLowerCase().includes(q)) ||
          m.code.toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q) ||
          (m.model && m.model.toLowerCase().includes(q)) ||
          (m.serialNo && m.serialNo.toLowerCase().includes(q)) ||
          (m.processName && m.processName.toLowerCase().includes(q)) ||
          (m.motorSpec && m.motorSpec.toLowerCase().includes(q)) ||
          (m.notes && m.notes.toLowerCase().includes(q));

        const matchLoc = selectedLocation === 'all' || m.location === selectedLocation;
        const matchCategory = selectedCategory === 'all' || m.category === selectedCategory;
        const matchProcess = selectedProcess === 'all' || m.processName === selectedProcess;
        const matchStatus = selectedStatus === 'all' || m.status === selectedStatus;

        return matchSearch && matchLoc && matchCategory && matchProcess && matchStatus;
      })
      .sort((a, b) => (a.no || 0) - (b.no || 0));
  }, [machines, searchQuery, selectedLocation, selectedCategory, selectedProcess, selectedStatus]);

  // Summary counts
  const stats = useMemo(() => {
    const total = machines.length;
    const bsCount = machines.filter((m) => m.location.includes('บางแสน') || m.location.includes('BS')).length;
    const productionCount = machines.filter((m) => m.category === 'machine').length;
    const officeCount = machines.filter((m) => m.category === 'office').length;
    const utilityCount = machines.filter((m) => m.category === 'infrastructure' || m.category === 'utility').length;
    const activeCount = machines.filter((m) => m.status === 'active').length;
    const breakdownCount = Object.keys(activeTicketMap).length;
    return { total, bsCount, productionCount, officeCount, utilityCount, activeCount, breakdownCount };
  }, [machines, activeTicketMap]);

  const openAddModal = () => {
    const nextNo = machines.length + 1;
    setEditingMachine(null);
    setFormNo(nextNo);
    setFormTagCode(`BS-${String(nextNo).padStart(2, '0')}`);
    setFormCode(`MA23120${String(nextNo).padStart(2, '0')}`);
    setFormName('');
    setFormModel('');
    setFormSerialNo('-');
    setFormProcess('Cutting');
    setFormLocation('บางแสน BS (โรงงาน)');
    setFormCategory('machine');
    setFormDepartment('ฝ่ายผลิต');
    setFormDimensions('');
    setFormMinMaxSheet('');
    setFormPower('3Phase 380V 63A');
    setFormKwHp('');
    setFormAirWater('No');
    setFormMotorSpec('');
    setFormGearSpec('');
    setFormSupplier('');
    setFormImageUrl('');
    setFormStatus('active');
    setFormNotes('');
    setErrorMessage(null);
    setShowAddModal(true);
  };

  const openEditModal = (m: MachineAsset) => {
    setEditingMachine(m);
    setFormNo(m.no || 1);
    setFormTagCode(m.tagCode || `BS-${String(m.no || 1).padStart(2, '0')}`);
    setFormCode(m.code);
    setFormName(m.name);
    setFormModel(m.model && m.model !== '-' ? m.model : '');
    setFormSerialNo(m.serialNo && m.serialNo !== '-' ? m.serialNo : '');
    setFormImageUrl(m.imageUrl || '');
    setFormProcess(m.processName || 'Cutting');
    setFormLocation(m.location || 'บางแสน BS');
    setFormCategory(m.category || 'machine');
    setFormDepartment(m.department || 'ฝ่ายผลิต');
    setFormDimensions(m.dimensions || '');
    setFormMinMaxSheet(m.minMaxSheet || '');
    setFormPower(m.power || '');
    setFormKwHp(m.kwHp || '');
    setFormAirWater(m.airWater || 'No');
    setFormMotorSpec(m.motorSpec || '');
    setFormGearSpec(m.gearSpec || '');
    setFormSupplier(m.supplier || '');
    setFormStatus(m.status || 'active');
    setFormNotes(m.notes || '');
    setErrorMessage(null);
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim()) {
      setErrorMessage('กรุณาระบุรหัสเครื่องมือ (Code)');
      return;
    }
    if (!formName.trim()) {
      setErrorMessage('กรุณาระบุชื่อเครื่องจักร (Machine Name)');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const machineNumber = Number(formNo) || (machines.length + 1);
    const assignedTagCode = formTagCode.trim() || `BS-${String(machineNumber).padStart(2, '0')}`;

    const payload: Partial<MachineAsset> = {
      no: machineNumber,
      tagCode: assignedTagCode,
      code: formCode.trim().toUpperCase(),
      name: formName.trim(),
      model: formModel.trim() || '-',
      serialNo: formSerialNo.trim() || '-',
      imageUrl: formImageUrl.trim() || undefined,
      processName: formProcess.trim(),
      category: formCategory,
      machineType: formProcess.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      machineTypeLabel: formProcess,
      location: formLocation.trim(),
      department: formDepartment.trim(),
      dimensions: formDimensions.trim(),
      minMaxSheet: formMinMaxSheet.trim(),
      power: formPower.trim(),
      kwHp: formKwHp.trim(),
      airWater: formAirWater.trim(),
      motorSpec: formMotorSpec.trim(),
      gearSpec: formGearSpec.trim(),
      supplier: formSupplier.trim(),
      status: formStatus,
      notes: formNotes.trim()
    };

    let result;
    if (editingMachine) {
      result = await onUpdateMachine(editingMachine.id, payload);
    } else {
      result = await onCreateMachine(payload);
    }

    setIsSubmitting(false);

    if (result.success) {
      setShowAddModal(false);
    } else {
      setErrorMessage(result.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const handleDelete = async (id: string, code: string, name: string) => {
    if (window.confirm(`ยืนยันการลบเครื่องจักร [${code}] ${name} ออกจากระบบหรือไม่?`)) {
      await onDeleteMachine(id);
    }
  };

  const getProcessColor = (processName: string) => {
    switch (processName?.toLowerCase()) {
      case 'cutting':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'printing':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'die cut':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'printing&cutting':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'stitching':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'glueding':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'slot':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 pb-28 space-y-5">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-blue-500/30 text-blue-300 border border-blue-400/30 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold">
                MACHINE REPORT KOCH - โรงงานบางแสน BS
              </span>
              <span className="text-xs text-slate-300">ทะเบียนเครื่องจักรทางการ</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <TableIcon className="w-6 h-6 text-blue-400" />
              <span>ตารางข้อมูลเครื่องจักรโรงงาน (Machine Registry Table)</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              โรงงานบางแสน BS บันทึกสเปก ขนาด มอเตอร์ และส่งแจ้งซ่อมเรียลไทม์
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Direct Download PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPdfTable}
              disabled={isDownloadingPdf}
              className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
              title="ดาวน์โหลดตารางเป็น PDF ทันที: รายชื่อทะเบียนเครื่องมือ-เครื่องจักร FM-MN01-01 Rev.00 Date 19/10/2026"
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังสร้าง PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลดเป็น PDF (FM-MN01-01)</span>
                </>
              )}
            </button>

            {onOpenPrintRegistry && (
              <button
                type="button"
                onClick={onOpenPrintRegistry}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                title="เปิดหน้าตัวอย่างก่อนพิมพ์ A4 / บันทึกเป็น PDF"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>ตัวอย่างพิมพ์ FM-MN01-01</span>
              </button>
            )}

            <button
              onClick={openAddModal}
              className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ เพิ่มเครื่องใหม่</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Navigation: 1. Registry Table, 2. Repair History, 3. BOM, 4. Spare Parts */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('table')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer ${
            activeSubTab === 'table'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <TableIcon className="w-4 h-4" />
          <span>📋 ตารางทะเบียนเครื่องมือ-เครื่องจักร ({machines.length} เครื่อง)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('history')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer ${
            activeSubTab === 'history'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <History className="w-4 h-4" />
          <span>📜 ประวัติการซ่อมย้อนหลังแต่ละเครื่อง</span>
          <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold ${
            activeSubTab === 'history' ? 'bg-purple-800 text-purple-100' : 'bg-purple-100 text-purple-900'
          }`}>
            {tickets.length} งานซ่อม
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('bom')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer ${
            activeSubTab === 'bom'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>📦 BOM อะไหล่ประจำเครื่อง</span>
          <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold ${
            activeSubTab === 'bom' ? 'bg-amber-800 text-amber-100' : 'bg-amber-100 text-amber-900'
          }`}>
            {bomItems.length} ชิ้น
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('spare_parts')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer ${
            activeSubTab === 'spare_parts'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>🛒 คลังสแปร์พาร์ท</span>
          <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold ${
            activeSubTab === 'spare_parts' ? 'bg-indigo-800 text-indigo-100' : 'bg-indigo-100 text-indigo-900'
          }`}>
            {spareParts.length} รายการ
          </span>
        </button>
      </div>

      {activeSubTab === 'history' ? (
        <MachineRepairHistoryManager
          machines={machines}
          tickets={tickets}
          initialSelectedMachineId={historySelectedMachineId}
          onSelectTicket={onSelectTicket}
          onPrintTicket={onPrintTicket}
          onReportIssueForMachine={onReportIssueForMachine}
          onViewChecklist={onViewChecklist}
        />
      ) : activeSubTab === 'bom' ? (
        <MachineBOMManager
          bomItems={bomItems}
          machines={machines}
          onRecordReplacement={onRecordReplacement}
          onCreateBOMItem={onCreateBOMItem}
          onUpdateBOMItem={onUpdateBOMItem}
          onDeleteBOMItem={onDeleteBOMItem}
          selectedMachineId={bomSelectedMachineId}
          onSelectMachineId={(id) => setBomSelectedMachineId(id)}
        />
      ) : activeSubTab === 'spare_parts' ? (
        <SparePartsManager
          spareParts={spareParts}
          transactions={transactions}
          machines={machines}
          tickets={tickets}
          onCreatePart={onCreateSparePart}
          onUpdatePart={onUpdateSparePart}
          onDeletePart={onDeleteSparePart}
          onAdjustStock={onAdjustStock}
          onSelectMachine={(machineCode) => {
            const matched = machines.find((m) => m.code === machineCode);
            if (matched) {
              setSearchQuery(matched.name);
              setActiveSubTab('table');
            }
          }}
          onOpenNewTicketForPart={(part) => {
            onReportIssueForMachine(machines[0]);
          }}
        />
      ) : (
        <>
          {/* KPI Stats Bar with Office Equipment & Factory Machinery */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">ทะเบียนรวมทั้งหมด</div>
            <div className="text-xl font-bold font-mono text-slate-900">{stats.total} รายการ</div>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Cog className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">เครื่องจักรไลน์ผลิต</div>
            <div className="text-lg font-bold text-blue-700">{stats.productionCount} เครื่อง</div>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
            โรงงาน BS
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">เครื่องใน Office / แอร์</div>
            <div className="text-xl font-bold font-mono text-purple-600">{stats.officeCount} รายการ</div>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
            FCU/CDU
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">ปั๊มลม / สาธารณูปโภค</div>
            <div className="text-xl font-bold font-mono text-amber-600">{stats.utilityCount} เครื่อง</div>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
            Utility
          </span>
        </div>
      </div>

      {/* Filter and Search Bar with Category Switcher */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        {/* Category Tabs: All, Factory, Office, Utility */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-slate-400 text-[11px] whitespace-nowrap mr-1 font-bold">หมวดหมู่:</span>
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition border ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            📋 ทั้งหมด ({stats.total})
          </button>
          <button
            onClick={() => setSelectedCategory('machine')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition border ${
              selectedCategory === 'machine'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            🏭 เครื่องจักรไลน์ผลิต ({stats.productionCount})
          </button>
          <button
            onClick={() => setSelectedCategory('office')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition border ${
              selectedCategory === 'office'
                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                : 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
            }`}
          >
            🏢 เครื่องใน Office / ปรับอากาศ ({stats.officeCount})
          </button>
          <button
            onClick={() => setSelectedCategory('infrastructure')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition border ${
              selectedCategory === 'infrastructure'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
          >
            ⚙️ ระบบสาธารณูปโภค / ปั๊มลม ({stats.utilityCount})
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหา: รหัสเครื่องมือ (MA...), ชื่อเครื่อง, Model (AMENA / Haier), Serial No., สเปก..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
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

          {/* Location Filter: All, บางแสน BS */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto text-xs">
            <button
              onClick={() => setSelectedLocation('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                selectedLocation === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมด ({stats.total})
            </button>
            <button
              onClick={() => setSelectedLocation('บางแสน BS')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                selectedLocation === 'บางแสน BS'
                  ? 'bg-blue-600 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📍 โรงงานบางแสน BS ({stats.bsCount})
            </button>
          </div>
        </div>

        {/* Process Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar pt-1 border-t border-slate-100">
          <span className="text-slate-400 text-[11px] whitespace-nowrap mr-1">กระบวนการ:</span>
          <button
            onClick={() => setSelectedProcess('all')}
            className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition border ${
              selectedProcess === 'all'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            ทั้งหมด
          </button>
          {uniqueProcesses.map((p) => (
            <button
              key={p}
              onClick={() => setSelectedProcess(selectedProcess === p ? 'all' : p)}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition border ${
                selectedProcess === p
                  ? 'bg-blue-600 text-white border-blue-600 font-bold'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table: Machine Registry Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] sm:text-xs font-semibold uppercase tracking-wider divide-x divide-slate-800">
                <th className="py-3 px-3 w-14 text-center">ลำดับ</th>
                <th className="py-3 px-2 w-16 text-center">รูปเครื่อง</th>
                <th className="py-3 px-3 min-w-[130px]">รหัสเครื่องมือ</th>
                <th className="py-3 px-3 min-w-[160px]">ชื่อเครื่อง</th>
                <th className="py-3 px-3 min-w-[150px]">Model (ชื่อรุ่น)</th>
                <th className="py-3 px-3 min-w-[110px]">Serial No.</th>
                <th className="py-3 px-3 min-w-[120px]">หมวดหมู่ / แผนก</th>
                <th className="py-3 px-3 w-28 text-center">Location</th>
                <th className="py-3 px-3 min-w-[120px] text-center">สถานะซ่อมบำรุง</th>
                <th className="py-3 px-3 min-w-[170px] text-center">จัดการหน้างาน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
              {filteredMachines.map((m, idx) => {
                const active = activeTicketMap[m.code];
                const processBadge = getProcessColor(m.processName);
                const runningNoStr = String(m.no || idx + 1).padStart(2, '0');
                const tagCodeStr = m.tagCode || `BS-${runningNoStr}`;
                const isOffice = m.category === 'office';

                return (
                  <tr
                    key={m.id}
                    className={`hover:bg-blue-50/50 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                    }`}
                  >
                    {/* No. */}
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-lg bg-slate-900 text-white font-mono font-bold text-xs shadow-2xs">
                        #{runningNoStr}
                      </span>
                    </td>

                    {/* Machine Photo with direct PC upload */}
                    <td className="py-3 px-2 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {m.imageUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewPhoto({ url: m.imageUrl!, title: `[${tagCodeStr}] ${m.name}` })}
                            className="group relative inline-block rounded-lg overflow-hidden border border-slate-200 shadow-2xs hover:border-blue-500 transition cursor-pointer"
                            title="คลิกเพื่อขยายดูรูปเครื่องจักร"
                          >
                            <img
                              src={m.imageUrl}
                              alt={m.name}
                              className="w-11 h-11 object-cover group-hover:scale-110 transition duration-200"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <Camera className="w-3.5 h-3.5 text-white" />
                            </div>
                          </button>
                        ) : (
                          <div className="w-11 h-11 mx-auto rounded-lg bg-slate-100 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                            <Cog className="w-4 h-4 text-slate-300" />
                            <span className="text-[8px]">ไม่มีรูป</span>
                          </div>
                        )}

                        {/* Direct PC Upload for this machine */}
                        <label 
                          className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50/80 hover:bg-blue-100 px-1.5 py-0.5 rounded cursor-pointer transition border border-blue-200/60"
                          title="อัปโหลดรูปเครื่องจักรนี้จากคอมพิวเตอร์โดยตรง"
                        >
                          <Upload className="w-2.5 h-2.5" />
                          <span>{quickUploadSuccessId === m.id ? '✓ อัปแล้ว' : 'อัปรูปคอม'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleQuickUploadForMachine(m.id, e)}
                          />
                        </label>
                      </div>
                    </td>

                    {/* Machine Running Code & Tag */}
                    <td className="py-3 px-3">
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-mono font-black text-xs bg-blue-600 text-white px-2 py-0.5 rounded shadow-2xs tracking-wider">
                          {tagCodeStr}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {m.code}
                        </span>
                      </div>
                    </td>

                    {/* Machine Name */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 flex items-center gap-1">
                        <span>{m.name}</span>
                        {m.notes && (
                          <span
                            title={m.notes}
                            className="text-slate-400 hover:text-slate-600 cursor-help"
                          >
                            <Info className="w-3.5 h-3.5 inline" />
                          </span>
                        )}
                      </div>
                      {m.minMaxSheet && (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          ชีท: {m.minMaxSheet}
                        </div>
                      )}
                    </td>

                    {/* Model (ชื่อรุ่น) */}
                    <td className="py-3 px-3">
                      {m.model && m.model !== '-' ? (
                        <span className="inline-block font-medium text-xs text-slate-900 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                          {m.model}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">-</span>
                      )}
                    </td>

                    {/* Serial No. */}
                    <td className="py-3 px-3 font-mono text-xs text-slate-600">
                      {m.serialNo && m.serialNo !== '-' ? (
                        <span className="font-medium text-slate-800">{m.serialNo}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Category & Process Badge */}
                    <td className="py-3 px-3">
                      <div className="flex flex-col items-start gap-1">
                        {isOffice ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                            🏢 เครื่องใน Office
                          </span>
                        ) : m.category === 'infrastructure' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            ⚙️ สาธารณูปโภค
                          </span>
                        ) : (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${processBadge}`}>
                            🏭 {m.processName}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500">
                          {m.department || 'ฝ่ายผลิต'}
                        </span>
                      </div>
                    </td>

                    {/* Location (บางแสน BS) */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="inline-block font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                        {m.location || 'บางแสน BS'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center">
                      {active ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-300 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                          แจ้งซ่อม {active.count} งาน
                        </span>
                      ) : m.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                          พร้อมใช้งาน
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                          บำรุงรักษา
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Daily Inspection button */}
                        {onViewChecklist && (
                          <button
                            type="button"
                            onClick={() => onViewChecklist(m)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-2xs transition"
                            title="เปิดแบบตรวจเช็คประจำวัน FM-MN01-04 ของเครื่องนี้"
                          >
                            <ClipboardCheck className="w-3.5 h-3.5" />
                            <span>ตรวจประจำวัน</span>
                          </button>
                        )}

                        {/* Instant report issue button */}
                        <button
                          type="button"
                          onClick={() => onReportIssueForMachine(m)}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-2xs transition"
                          title="สร้างใบแจ้งซ่อมเครื่องนี้ทันที"
                        >
                          <Wrench className="w-3 h-3" />
                          <span>แจ้งซ่อม</span>
                        </button>

                        {/* BOM parts button */}
                        <button
                          type="button"
                          onClick={() => {
                            setBomSelectedMachineId(m.id);
                            setActiveSubTab('bom');
                          }}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-2xs transition"
                          title="เปิด BOM อุปกรณ์ & บันทึกการเปลี่ยนอะไหล่ของเครื่องนี้"
                        >
                          <Package className="w-3.5 h-3.5" />
                          <span>BOM อะไหล่</span>
                        </button>

                        {/* Repair history button */}
                        <button
                          type="button"
                          onClick={() => {
                            setHistorySelectedMachineId(m.id);
                            setActiveSubTab('history');
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-2xs transition"
                          title="ดูประวัติการซ่อมย้อนหลังทั้งหมดของเครื่องนี้ (Repair History)"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>ประวัติซ่อม</span>
                        </button>

                        {/* View full spec modal */}
                        <button
                          type="button"
                          onClick={() => setInspectingMachine(m)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                          title="ดูสเปกมอเตอร์และรายละเอียดฉบับเต็ม"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => openEditModal(m)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                          title="แก้ไขข้อมูลเครื่อง"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDelete(m.id, m.code, m.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="ลบเครื่องนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredMachines.length === 0 && (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <Cog className="w-10 h-10 mx-auto text-slate-300" />
            <div className="font-semibold text-slate-700">ไม่พบเครื่องจักรตามเงื่อนไขที่เลือก</div>
            <p className="text-xs text-slate-400">ลองล้างคำค้นหา หรือกดปุ่ม "เพิ่มเครื่องจักรใหม่"</p>
          </div>
        )}
      </div>
      </>
      )}

      {/* Modal: View Machine Specification Detail (จากตาราง KOCH Report) */}
      {inspectingMachine && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-start justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-xs bg-amber-400 text-slate-900 px-2 py-0.5 rounded">
                    #{String(inspectingMachine.no || '-').padStart(2, '0')}
                  </span>
                  <span className="font-mono font-black text-xs bg-blue-600 text-white px-2.5 py-0.5 rounded shadow-2xs">
                    {inspectingMachine.tagCode || `BS-${String(inspectingMachine.no || '').padStart(2, '0')}`}
                  </span>
                  <span className="font-mono text-xs text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    Asset Code: {inspectingMachine.code}
                  </span>
                  <span className="font-mono text-xs text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    Location: {inspectingMachine.location}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">
                  {inspectingMachine.name}
                </h3>
                <div className="text-xs text-slate-400 mt-0.5">
                  Process: {inspectingMachine.processName} | ลำดับที่: #{inspectingMachine.no || '-'}
                </div>
              </div>
              <button
                onClick={() => setInspectingMachine(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs sm:text-sm text-slate-800 overflow-y-auto max-h-[70vh]">
              {/* Machine Photo Banner if available */}
              {inspectingMachine.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-sm relative group">
                  <img
                    src={inspectingMachine.imageUrl}
                    alt={inspectingMachine.name}
                    className="w-full h-48 object-cover object-center group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[11px] font-mono px-2 py-0.5 rounded">
                    📷 รูปภาพเครื่องจักรทางการ (KOCH Assets)
                  </div>
                </div>
              )}

              {/* Dimensions & Specs */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">ขนาดตัวเครื่อง (WxLxH)</div>
                  <div className="font-mono font-bold text-slate-800 mt-0.5">{inspectingMachine.dimensions || 'ไม่ระบุ'}</div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-500 font-medium">ขนาดแผ่นงาน Min/Max Sheet</div>
                  <div className="font-mono font-bold text-slate-800 mt-0.5">{inspectingMachine.minMaxSheet || 'ไม่ระบุ'}</div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-500 font-medium">ระบบไฟฟ้า (Power / Breaker)</div>
                  <div className="font-mono font-bold text-slate-800 mt-0.5">{inspectingMachine.power || 'ไม่ระบุ'}</div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-500 font-medium">กำลังแรงม้า / KW รวม</div>
                  <div className="font-mono font-bold text-slate-800 mt-0.5">{inspectingMachine.kwHp || 'ไม่ระบุ'}</div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-500 font-medium">ระบบลม / น้ำ (Air / Water)</div>
                  <div className="font-bold text-slate-800 mt-0.5">{inspectingMachine.airWater || 'No'}</div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-500 font-medium">Supplier / ผู้ผลิต</div>
                  <div className="font-bold text-slate-800 mt-0.5">{inspectingMachine.supplier || 'KOCH Factory Standard'}</div>
                </div>
              </div>

              {/* Motor & Gear Spec Detail */}
              {inspectingMachine.motorSpec && (
                <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 space-y-1">
                  <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-blue-600" />
                    <span>ข้อมูลสเปกมอเตอร์ (Motor Spec ตามรายงาน KOCH):</span>
                  </div>
                  <p className="text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {inspectingMachine.motorSpec}
                  </p>
                </div>
              )}

              {inspectingMachine.gearSpec && (
                <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 space-y-1">
                  <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Cog className="w-3.5 h-3.5 text-amber-600" />
                    <span>ข้อมูลชุดเกียร์ (Gear Spec):</span>
                  </div>
                  <p className="text-xs font-mono text-slate-800 leading-relaxed">
                    {inspectingMachine.gearSpec}
                  </p>
                </div>
              )}

              {inspectingMachine.notes && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium mb-0.5">หมายเหตุการใช้งาน:</div>
                  <div className="text-xs text-slate-700">{inspectingMachine.notes}</div>
                </div>
              )}

              {/* Active tickets on this machine */}
              {activeTicketMap[inspectingMachine.code] && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>งานแจ้งซ่อมที่กำลังดำเนินการ ({activeTicketMap[inspectingMachine.code].count} รายการ)</span>
                  </div>
                  <div className="space-y-1.5">
                    {activeTicketMap[inspectingMachine.code].tickets.map((t) => (
                      <div key={t.id} className="text-xs bg-white p-2 rounded-lg border border-rose-200 flex items-center justify-between">
                        <div>
                          <span className="font-mono font-bold text-slate-800">{t.ticketNo}</span>
                          <span className="text-slate-600 ml-2">{t.problemDescription}</span>
                        </div>
                        <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-semibold">
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onReportIssueForMachine(inspectingMachine);
                    setInspectingMachine(null);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>แจ้งซ่อมเครื่องนี้ทันที</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setHistorySelectedMachineId(inspectingMachine.id);
                    setActiveSubTab('history');
                    setInspectingMachine(null);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>ประวัติการซ่อมทั้งหมด</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setInspectingMachine(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add or Edit Machine */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600 rounded-xl">
                  <Cog className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {editingMachine ? `แก้ไขเครื่องจักร: ${editingMachine.code}` : 'ลงทะเบียนเครื่องจักรใหม่ (KOCH Master)'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    บันทึกข้อมูลเข้าตาราง Machine Report ประจำโรงงาน
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-slate-800 text-xs sm:text-sm max-h-[75vh] overflow-y-auto">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* No., Tag Code, Running Code & Location */}
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-3 sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. (ลำดับ)
                  </label>
                  <input
                    type="number"
                    value={formNo}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setFormNo(val);
                      if (!editingMachine) {
                        setFormTagCode(`BS-${String(val).padStart(2, '0')}`);
                        setFormCode(`MA23120${String(val).padStart(2, '0')}`);
                      }
                    }}
                    className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-center font-bold"
                  />
                </div>

                <div className="col-span-4 sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tag หน้างาน (เช่น BS-01)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น BS-19"
                    value={formTagCode}
                    onChange={(e) => setFormTagCode(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-2.5 font-mono uppercase font-bold"
                  />
                </div>

                <div className="col-span-5 sm:col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Running Code (Asset) *
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น MA2312019"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono uppercase font-bold"
                    required
                  />
                </div>

                <div className="col-span-12 sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Location (โรงงาน) *
                  </label>
                  <select
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-blue-900"
                  >
                    <option value="บางแสน BS">บางแสน BS</option>
                  </select>
                </div>
              </div>

              {/* Name & Process */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Machine Name (ชื่อเครื่อง) *
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น Cutting, Long way, Die Cut, Fan Coil Unit"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Process Name (กระบวนการ / ฟังก์ชัน) *
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น Cutting, Printing, Die Cut, Office AC, Utility"
                    value={formProcess}
                    onChange={(e) => setFormProcess(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                    required
                  />
                </div>
              </div>

              {/* Category, Model & Serial No. */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ประเภทเครื่องจักร (Category) *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => {
                      const cat = e.target.value as any;
                      setFormCategory(cat);
                      if (cat === 'office') {
                        setFormDepartment('สำนักงาน / Office');
                        if (!formProcess || formProcess === 'Cutting') setFormProcess('Office AC');
                      } else if (cat === 'infrastructure') {
                        setFormDepartment('ฝ่ายบริหารอาคารและสถานที่');
                      }
                    }}
                    className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800"
                  >
                    <option value="machine">🏭 เครื่องจักรไลน์ผลิต</option>
                    <option value="office">🏢 เครื่องใน Office / ปรับอากาศ</option>
                    <option value="infrastructure">⚙️ ระบบสาธารณูปโภค / ปั๊ม</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Model (ชื่อรุ่น)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น AMENA 12000 BTU, Haier 18000 BTU"
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Serial No.
                  </label>
                  <input
                    type="text"
                    placeholder="ระบุ Serial No. (ถ้ามี)"
                    value={formSerialNo}
                    onChange={(e) => setFormSerialNo(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
                  />
                </div>
              </div>

              {/* Dimensions & Min/Max Sheet */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Machine Dimensions WxLxH (m.)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น 1.3 x 3.6 x 1.4 m."
                    value={formDimensions}
                    onChange={(e) => setFormDimensions(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Min / Max Sheet Size (mm.)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น 400-1800 x 800-3000 mm"
                    value={formMinMaxSheet}
                    onChange={(e) => setFormMinMaxSheet(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
                  />
                </div>
              </div>

              {/* Power & KW/HP & Air/Water */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Power & Breaker
                  </label>
                  <input
                    type="text"
                    placeholder="3Phase 380V 63A"
                    value={formPower}
                    onChange={(e) => setFormPower(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    แรงม้า / KW รวม
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น 5 HP / 4 KW"
                    value={formKwHp}
                    onChange={(e) => setFormKwHp(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Air / Water
                  </label>
                  <input
                    type="text"
                    placeholder="Air 5-6 Bar, Water Yes"
                    value={formAirWater}
                    onChange={(e) => setFormAirWater(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  />
                </div>
              </div>

              {/* Motor Spec & Supplier */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motor Spec (สเปกมอเตอร์)
                </label>
                <textarea
                  rows={2}
                  placeholder="เช่น Star 380V 50Hz 4 Pole | 5 HP 4 KW | 8.66A RPM 1435"
                  value={formMotorSpec}
                  onChange={(e) => setFormMotorSpec(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
                />
              </div>

              {/* Gear Spec & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gear Spec / Ratio
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น TL GEAR MOTOR Ratio 1:10"
                    value={formGearSpec}
                    onChange={(e) => setFormGearSpec(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Supplier (ผู้จำหน่าย)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น TECO, Fuanshi Baoma"
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  สถานะการทำงาน
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'active', label: '🟢 พร้อมใช้งาน', color: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
                    { id: 'maintenance', label: '🟡 อยู่ระหว่างตรวจเช็ก', color: 'border-amber-500 bg-amber-50 text-amber-800' },
                    { id: 'breakdown', label: '🔴 เสีย/หยุดชั่วคราว', color: 'border-rose-500 bg-rose-50 text-rose-800' }
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setFormStatus(st.id as any)}
                      className={`p-2 rounded-xl border text-xs font-medium transition text-center ${
                        formStatus === st.id
                          ? `${st.color} font-bold ring-2 ring-blue-500/20`
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หมายเหตุเพิ่มเติม
                </label>
                <input
                  type="text"
                  placeholder="เช่น จุดตรวจเช็กความร้อน, รอบเปลี่ยนน้ำมันเกียร์"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              {/* Machine Photo Upload directly from Computer */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-blue-600" />
                    <span>รูปภาพเครื่องจักร (อัปโหลดจากคอมพิวเตอร์)</span>
                  </span>
                  <span className="text-[10px] text-slate-400">รองรับไฟล์ PNG, JPG, JPEG, WEBP จากเครื่อง</span>
                </label>

                <input
                  type="file"
                  ref={machinePhotoInputRef}
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleMachinePhotoFile(f);
                  }}
                  className="hidden"
                />

                {formImageUrl ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={formImageUrl}
                        alt="รูปเครื่องจักร"
                        className="w-14 h-14 rounded-lg object-cover border border-slate-300 shadow-2xs shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>เลือกรูปภาพเรียบร้อยแล้ว</span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">
                          {formImageUrl.startsWith('data:') ? 'รูปภาพจากคอมพิวเตอร์ (Base64 Data)' : formImageUrl}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => machinePhotoInputRef.current?.click()}
                        className="text-xs bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-medium px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                      >
                        <FileUp className="w-3.5 h-3.5 text-blue-600" />
                        <span>เปลี่ยนรูป</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormImageUrl('')}
                        className="text-xs bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-medium px-2.5 py-1.5 rounded-lg transition"
                        title="ลบรูปภาพนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingPhoto(true);
                    }}
                    onDragLeave={() => setIsDraggingPhoto(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingPhoto(false);
                      const droppedFile = e.dataTransfer.files?.[0];
                      if (droppedFile) handleMachinePhotoFile(droppedFile);
                    }}
                    onClick={() => machinePhotoInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                      isDraggingPhoto
                        ? 'border-blue-500 bg-blue-50/70 scale-[0.99]'
                        : 'border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/40'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-2xs">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-bold text-slate-800">
                        คลิกเพื่อเลือกไฟล์รูปภาพจากคอมพิวเตอร์
                      </div>
                      <p className="text-[11px] text-slate-500">
                        หรือลากไฟล์ภาพจากโฟลเดอร์ในคอมพิวเตอร์มาวางที่นี่
                      </p>
                      <span className="inline-block mt-1 text-[10px] font-semibold bg-white border border-slate-200 text-blue-700 px-2.5 py-1 rounded-md shadow-2xs">
                        📁 ค้นหารูปจากเครื่องคอมฯ (Browse File)
                      </span>
                    </div>
                  </div>
                )}

                {/* Optional external URL fallback toggle */}
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => setShowUrlFallback(!showUrlFallback)}
                    className="text-[11px] text-slate-500 hover:text-blue-600 underline cursor-pointer"
                  >
                    {showUrlFallback ? 'ซ่อนการระบุ URL ลิงก์' : 'หรือต้องการใส่ URL ลิงก์รูปภาพแทน?'}
                  </button>
                  {showUrlFallback && (
                    <div className="mt-1.5 flex gap-2">
                      <input
                        type="text"
                        placeholder="วาง URL รูปภาพ (เช่น https://...)"
                        value={formImageUrl}
                        onChange={(e) => setFormImageUrl(e.target.value)}
                        className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5 disabled:opacity-60"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : editingMachine ? 'บันทึกการแก้ไข' : 'ลงทะเบียนเครื่องจักร'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Preview Zoom Modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-sm truncate">{previewPhoto.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-100 flex items-center justify-center">
              <img
                src={previewPhoto.url}
                alt={previewPhoto.title}
                className="max-h-[65vh] w-auto object-contain rounded-xl shadow-md"
              />
            </div>
          </div>
        </div>
      )}

      {/* Hidden container for 1-click PDF download generation matching FM-MN01-01 */}
      <div
        ref={pdfExportRef}
        id="pdf-registry-export-container"
        className="fixed -left-[9999px] top-0 w-[900px] bg-white p-8 border border-slate-300 text-slate-900 font-sans"
        style={{ width: '900px' }}
      >
        <div className="relative mb-3 flex items-start justify-between">
          <div className="pt-1">
            <KochLogo size="md" variant="full" />
          </div>
          <div className="flex-1 text-center pr-12">
            <h1 className="text-base font-bold tracking-tight text-slate-900">
              บริษัท โค้ช แพคเกจจิ้ง แอนด์ แพคกิ้ง เซอร์วิสเซส จำกัด
            </h1>
            <h2 className="text-sm font-bold text-slate-800 mt-1">
              รายชื่อทะเบียนเครื่องมือ-เครื่องจักร
            </h2>
          </div>
        </div>

        <div className="border-2 border-slate-900 overflow-hidden mt-4">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-900 bg-slate-100 font-bold text-slate-900 text-center">
                <th className="border-r border-slate-900 py-1.5 px-2 w-14 text-center">ลำดับ</th>
                <th className="border-r border-slate-900 py-1.5 px-3 w-36 text-center">รหัสเครื่องมือ</th>
                <th className="border-r border-slate-900 py-1.5 px-3 text-center">ชื่อเครื่อง</th>
                <th className="border-r border-slate-900 py-1.5 px-3 w-48 text-center">Model</th>
                <th className="py-1.5 px-3 w-36 text-center">Serial No.</th>
              </tr>
            </thead>
            <tbody>
              {filteredMachines.map((m, index) => (
                <tr key={m.id || index} className="border-b border-slate-400">
                  <td className="border-r border-slate-900 py-1.5 px-2 text-center font-medium">
                    {m.no || index + 1}
                  </td>
                  <td className="border-r border-slate-900 py-1.5 px-3 text-left font-mono font-medium">
                    {m.code}
                  </td>
                  <td className="border-r border-slate-900 py-1.5 px-3 text-left">
                    <span className="font-medium text-slate-900">{m.name}</span>
                  </td>
                  <td className="border-r border-slate-900 py-1.5 px-3 text-left">
                    {m.model && m.model !== '-' ? m.model : ''}
                  </td>
                  <td className="py-1.5 px-3 text-left font-mono">
                    {m.serialNo && m.serialNo !== '-' ? m.serialNo : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
          <div className="text-[11px] text-slate-500">
            โรงงานบางแสน BS • ข้อมูลทั้งหมด {filteredMachines.length} รายการ
          </div>
          <div className="font-mono font-medium text-slate-900 text-xs text-right">
            FM-MN01-01 Rev.00 Date 19/10/2026
          </div>
        </div>
      </div>

    </div>
  );
};
