import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Plus, 
  Wrench, 
  History, 
  Search, 
  Filter, 
  Camera, 
  ArrowRight, 
  Building2, 
  Cog, 
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Layers,
  FileText
} from 'lucide-react';
import { MachineBOMItem, BOMChangeLog, ReplacementReason } from '../types/bom';
import { MachineAsset } from '../types/ticket';
import { compressImageFile } from '../utils/imageCompressor';

interface MachineBOMManagerProps {
  bomItems: MachineBOMItem[];
  machines: MachineAsset[];
  onRecordReplacement: (
    bomItemId: string,
    payload: {
      replacedDate: string;
      technician: string;
      quantity?: number;
      reason: ReplacementReason;
      reasonLabel?: string;
      notes: string;
      photoUrl?: string;
      ticketId?: string;
    }
  ) => Promise<any>;
  onCreateBOMItem: (itemData: Partial<MachineBOMItem>) => Promise<any>;
  onUpdateBOMItem: (id: string, updates: Partial<MachineBOMItem>) => Promise<any>;
  onDeleteBOMItem: (id: string) => Promise<any>;
  selectedMachineId?: string;
  onSelectMachineId?: (id: string) => void;
}

export const MachineBOMManager: React.FC<MachineBOMManagerProps> = ({
  bomItems,
  machines,
  onRecordReplacement,
  onCreateBOMItem,
  onUpdateBOMItem,
  onDeleteBOMItem,
  selectedMachineId,
  onSelectMachineId
}) => {
  const [filterMachine, setFilterMachine] = useState<string>(selectedMachineId || 'all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Expand state for change history timeline per item
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // Modal: Record Replacement
  const [replacingItem, setReplacingItem] = useState<MachineBOMItem | null>(null);
  const [replaceDate, setReplaceDate] = useState(new Date().toISOString().split('T')[0]);
  const [replaceTech, setReplaceTech] = useState('สมเกียรติ มั่นคง');
  const [replaceQty, setReplaceQty] = useState(1);
  const [replaceReason, setReplaceReason] = useState<ReplacementReason>('scheduled_pm');
  const [replaceNotes, setReplaceNotes] = useState('');
  const [replacePhoto, setReplacePhoto] = useState<string>('');
  const [isSubmittingReplace, setIsSubmittingReplace] = useState(false);

  // Modal: Add New BOM Item
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMachCode, setNewMachCode] = useState(machines[0]?.code || '');
  const [newPartName, setNewPartName] = useState('');
  const [newPartNo, setNewPartNo] = useState('');
  const [newSpec, setNewSpec] = useState('');
  const [newCategory, setNewCategory] = useState<'mechanical' | 'electrical' | 'pneumatic' | 'hydraulic' | 'consumable' | 'filter'>('mechanical');
  const [newQty, setNewQty] = useState(1);
  const [newUnit, setNewUnit] = useState('ชิ้น');
  const [newCycleDays, setNewCycleDays] = useState(180);
  const [newCycleLabel, setNewCycleLabel] = useState('ทุก 6 เดือน');
  const [newLastDate, setNewLastDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSupplier, setNewSupplier] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Calculate current status (overdue, due_soon, normal) based on today's date
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTime = new Date(todayStr).getTime();

  const enrichedItems = useMemo(() => {
    return bomItems.map((item) => {
      const dueTime = new Date(item.nextDueDate).getTime();
      const diffDays = Math.ceil((dueTime - todayTime) / (1000 * 60 * 60 * 24));

      let calculatedStatus: 'normal' | 'due_soon' | 'overdue' = 'normal';
      if (diffDays < 0) {
        calculatedStatus = 'overdue';
      } else if (diffDays <= 15) {
        calculatedStatus = 'due_soon';
      }

      return {
        ...item,
        status: calculatedStatus,
        diffDays
      };
    });
  }, [bomItems, todayTime]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return enrichedItems.filter((item) => {
      // Machine filter
      if (filterMachine !== 'all') {
        if (item.machineId !== filterMachine && item.machineCode !== filterMachine) return false;
      }
      // Category filter
      if (filterCategory !== 'all' && item.category !== filterCategory) return false;
      // Status filter
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.partName.toLowerCase().includes(q) ||
          item.partNo.toLowerCase().includes(q) ||
          item.machineName.toLowerCase().includes(q) ||
          item.machineCode.toLowerCase().includes(q) ||
          (item.machineTag && item.machineTag.toLowerCase().includes(q)) ||
          item.spec.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [enrichedItems, filterMachine, filterCategory, filterStatus, searchQuery]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = enrichedItems.length;
    const normal = enrichedItems.filter((i) => i.status === 'normal').length;
    const dueSoon = enrichedItems.filter((i) => i.status === 'due_soon').length;
    const overdue = enrichedItems.filter((i) => i.status === 'overdue').length;
    return { total, normal, dueSoon, overdue };
  }, [enrichedItems]);

  const openReplaceModal = (item: MachineBOMItem) => {
    setReplacingItem(item);
    setReplaceDate(new Date().toISOString().split('T')[0]);
    setReplaceTech('สมเกียรติ มั่นคง (ช่างซ่อมบำรุง)');
    setReplaceQty(item.quantity || 1);
    setReplaceReason('scheduled_pm');
    setReplaceNotes(`เปลี่ยนอะไหล่ ${item.partName} ตามรอบการบำรุงรักษา พร้อมตรวจสอบการติดตั้ง`);
    setReplacePhoto('');
  };

  const handleConfirmReplacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replacingItem) return;

    setIsSubmittingReplace(true);
    const reasonLabels: Record<ReplacementReason, string> = {
      scheduled_pm: 'ตามรอบบำรุงรักษาเชิงป้องกัน (PM)',
      breakdown: 'ชำรุด/เสียหายกะทันหัน',
      wear_tear: 'เสื่อมสภาพตามอายุการใช้งาน',
      upgrade: 'ปรับปรุงประสิทธิภาพ',
      other: 'อื่นๆ'
    };

    await onRecordReplacement(replacingItem.id, {
      replacedDate: replaceDate,
      technician: replaceTech,
      quantity: Number(replaceQty) || 1,
      reason: replaceReason,
      reasonLabel: reasonLabels[replaceReason] || 'ตามรอบ',
      notes: replaceNotes,
      photoUrl: replacePhoto || undefined
    });

    setIsSubmittingReplace(false);
    setReplacingItem(null);
  };

  const handleCreateNewBOM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartName.trim()) return;

    setIsSubmittingNew(true);
    const matchedMach = machines.find((m) => m.code === newMachCode);

    const categoryLabels: Record<string, string> = {
      mechanical: 'ชิ้นส่วนกลไก',
      electrical: 'ชิ้นส่วนไฟฟ้า',
      pneumatic: 'ระบบลมและนิวแมติกส์',
      hydraulic: 'ระบบไฮดรอลิก',
      consumable: 'วัสดุสิ้นเปลือง',
      filter: 'ไส้กรอง/ระบบกรอง'
    };

    await onCreateBOMItem({
      machineId: matchedMach?.id || 'm-custom',
      machineCode: matchedMach?.code || newMachCode,
      machineTag: matchedMach?.tagCode || '',
      machineName: matchedMach?.name || 'เครื่องจักร',
      partName: newPartName.trim(),
      partNo: newPartNo.trim() || '-',
      spec: newSpec.trim() || '-',
      category: newCategory,
      categoryLabel: categoryLabels[newCategory] || 'ทั่วไป',
      quantity: Number(newQty) || 1,
      unit: newUnit,
      replacementCycleDays: Number(newCycleDays) || 180,
      cycleLabel: newCycleLabel || `ทุก ${newCycleDays} วัน`,
      lastReplacedDate: newLastDate,
      supplier: newSupplier.trim(),
      notes: newNotes.trim()
    });

    setIsSubmittingNew(false);
    setShowAddModal(false);
    // Reset form
    setNewPartName('');
    setNewPartNo('');
    setNewSpec('');
    setNewNotes('');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 800, 0.75);
      if (compressed) setReplacePhoto(compressed);
    } catch (err) {
      console.warn('Failed compressing BOM photo:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 pb-28 space-y-5">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-blue-500/30 text-blue-300 border border-blue-400/30 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold">
                MACHINE BOM & SPARE PARTS - โรงงานบางแสน BS
              </span>
              <span className="text-xs text-slate-300">ระบบติดตามรอบเปลี่ยนอะไหล่</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <Package className="w-6 h-6 text-blue-400" />
              <span>BOM อุปกรณ์ประจำเครื่องจักร & บันทึกการเปลี่ยนแปลง</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              ระบุรายการอะไหล่ที่ต้องเปลี่ยนของแต่ละเครื่องจักร อัปเดตวันเปลี่ยน และบันทึกประวัติการเปลี่ยนแปลง
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ เพิ่มอุปกรณ์ใน BOM</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">รายการอะไหล่ใน BOM</div>
            <div className="text-xl font-bold font-mono text-slate-900">{metrics.total} รายการ</div>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-xs text-emerald-800 font-medium">สถานะปกติ</div>
            <div className="text-xl font-bold font-mono text-emerald-700">{metrics.normal} รายการ</div>
          </div>
          <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-xs text-amber-800 font-medium">ใกล้ครบกำหนด (≤15 วัน)</div>
            <div className="text-xl font-bold font-mono text-amber-700">{metrics.dueSoon} รายการ</div>
          </div>
          <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-rose-50/70 p-3.5 rounded-xl border border-rose-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-xs text-rose-800 font-medium">เกินกำหนดเปลี่ยน</div>
            <div className="text-xl font-bold font-mono text-rose-700">{metrics.overdue} รายการ</div>
          </div>
          <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="ค้นหาชื่ออุปกรณ์, รหัสอะไหล่, สเปก หรือชื่อเครื่องจักร..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Machine Filter Dropdown */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <Cog className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-500 font-medium">เครื่องจักร:</span>
              <select
                value={filterMachine}
                onChange={(e) => setFilterMachine(e.target.value)}
                className="text-xs font-semibold text-slate-800 bg-transparent border-0 focus:outline-hidden cursor-pointer"
              >
                <option value="all">ทุกเครื่อง ({machines.length} เครื่อง)</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.code}>
                    {m.tagCode || ''} {m.name} ({m.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs font-semibold text-slate-800 bg-transparent border-0 focus:outline-hidden cursor-pointer"
              >
                <option value="all">ทุกสถานะ</option>
                <option value="due_soon">⚠️ ใกล้ครบกำหนด</option>
                <option value="overdue">🚨 เกินกำหนดเปลี่ยน</option>
                <option value="normal">✓ ปกติ</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* BOM Items List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 space-y-2">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-semibold">ไม่พบรายการอุปกรณ์ตามเงื่อนไขที่ค้นหา</div>
            <p className="text-xs text-slate-400">
              ลองเปลี่ยนคำค้นหา หรือกดปุ่ม "+ เพิ่มอุปกรณ์ใน BOM" เพื่อลงทะเบียนอะไหล่ใหม่
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isExpanded = expandedHistoryId === item.id;
            const diffDays = item.diffDays;
            const matchedMachine = machines.find((m) => m.code === item.machineCode);

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition overflow-hidden"
              >
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Machine Tag + Part Info */}
                  <div className="flex items-start gap-3.5">
                    {matchedMachine?.imageUrl ? (
                      <img
                        src={matchedMachine.imageUrl}
                        alt={item.machineName}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-700 shrink-0">
                        <Cog className="w-6 h-6 text-slate-500" />
                        <span className="text-[10px] font-mono font-bold mt-0.5">{item.machineTag || 'MACH'}</span>
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                          {item.machineTag || item.machineCode}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {item.machineName}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {item.categoryLabel}
                        </span>
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{item.partName}</span>
                        {item.partNo && item.partNo !== '-' && (
                          <span className="font-mono text-xs text-slate-500 font-normal">
                            [{item.partNo}]
                          </span>
                        )}
                      </h3>

                      <div className="text-xs text-slate-600 flex items-center gap-3 flex-wrap">
                        <span>สเปก: <strong className="text-slate-800">{item.spec}</strong></span>
                        <span>•</span>
                        <span>จำนวนติดตั้ง: <strong className="text-slate-800">{item.quantity} {item.unit}</strong></span>
                        {item.supplier && (
                          <>
                            <span>•</span>
                            <span className="text-slate-500">ผู้จัดจำหน่าย: {item.supplier}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Dates, Status & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    {/* Dates Box */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1 min-w-[210px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">รอบการเปลี่ยน:</span>
                        <span className="font-semibold text-slate-800">{item.cycleLabel}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">เปลี่ยนล่าสุด:</span>
                        <span className="font-mono font-medium text-slate-700">{item.lastReplacedDate}</span>
                      </div>
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-700">กำหนดครั้งถัดไป:</span>
                        <span className={`font-mono ${
                          item.status === 'overdue' ? 'text-rose-600' : item.status === 'due_soon' ? 'text-amber-600' : 'text-emerald-700'
                        }`}>
                          {item.nextDueDate}
                        </span>
                      </div>
                      <div className="pt-0.5 text-right">
                        {item.status === 'overdue' ? (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                            🚨 เกินกำหนด {Math.abs(diffDays)} วัน!
                          </span>
                        ) : item.status === 'due_soon' ? (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                            ⚠️ เหลืออีก {diffDays} วัน
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                            ✓ เหลืออีก {diffDays} วัน
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openReplaceModal(item)}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                        title="อัปเดตวันเปลี่ยนอะไหล่ และบันทึกประวัติ"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>อัปเดตวันเปลี่ยน</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpandedHistoryId(isExpanded ? null : item.id)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                          isExpanded
                            ? 'bg-slate-200 text-slate-800 border-slate-300'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                        title="ดูประวัติการเปลี่ยนแปลงอะไหล่"
                      >
                        <History className="w-4 h-4 text-slate-600" />
                        <span className="text-[11px] font-mono">({item.changeHistory?.length || 0})</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Timeline: History of Changes */}
                {isExpanded && (
                  <div className="bg-slate-50/80 p-4 border-t border-slate-200 space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <History className="w-4 h-4 text-blue-600" />
                        <span>ประวัติการเปลี่ยนแปลงอะไหล่ (Replacement History):</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        บันทึกทั้งหมด {item.changeHistory?.length || 0} ครั้ง
                      </span>
                    </div>

                    {item.changeHistory && item.changeHistory.length > 0 ? (
                      <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                        {item.changeHistory.map((log) => (
                          <div key={log.id} className="relative bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-xs space-y-1">
                            <div className="absolute -left-6 top-2.5 w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white"></div>
                            
                            <div className="flex items-center justify-between flex-wrap gap-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-900">
                                  วันที่ {log.replacedDate}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium text-[10px]">
                                  {log.reasonLabel || log.reason}
                                </span>
                              </div>
                              <span className="text-slate-500 text-[11px]">
                                ช่างผู้บันทึก: <strong>{log.technician}</strong>
                              </span>
                            </div>

                            <p className="text-slate-700 font-medium mt-1">
                              {log.notes}
                            </p>

                            <div className="text-[11px] text-slate-400">
                              จำนวนที่เปลี่ยน: {log.quantity} {item.unit}
                            </div>

                            {log.photoUrl && (
                              <div className="mt-2">
                                <img
                                  src={log.photoUrl}
                                  alt="รูปหลักฐานการเปลี่ยน"
                                  className="w-24 h-24 object-cover rounded-lg border border-slate-200"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-xs text-slate-400">
                        ยังไม่มีประวัติการเปลี่ยนก่อนหน้านี้
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: Record Replacement Date & Change Log */}
      {replacingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600 rounded-xl">
                  <RotateCcw className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">บันทึกการเปลี่ยนอะไหล่ (Update BOM)</h3>
                  <p className="text-xs text-slate-400">
                    {replacingItem.machineTag} • {replacingItem.machineName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReplacingItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReplacement} className="p-5 space-y-4 text-xs">
              {/* Part summary card */}
              <div className="bg-blue-50/80 p-3 rounded-xl border border-blue-200">
                <div className="font-bold text-blue-900 text-xs sm:text-sm">
                  {replacingItem.partName}
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  รหัส: <span className="font-mono font-medium">{replacingItem.partNo}</span> • สเปก: {replacingItem.spec}
                </div>
                <div className="text-[11px] text-blue-700 mt-1">
                  รอบเปลี่ยนปกติ: {replacingItem.cycleLabel} (ระบบจะคำนวณวันครบกำหนดครั้งต่อไปให้อัตโนมัติ)
                </div>
              </div>

              {/* Row: วันที่เปลี่ยน & จำนวน */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    วันที่เปลี่ยน (Date Replaced) *
                  </label>
                  <input
                    type="date"
                    value={replaceDate}
                    onChange={(e) => setReplaceDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    จำนวนที่เปลี่ยน ({replacingItem.unit}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={replaceQty}
                    onChange={(e) => setReplaceQty(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono text-slate-800"
                    required
                  />
                </div>
              </div>

              {/* Row: ช่างผู้เปลี่ยน & สาเหตุ */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    ช่างผู้เปลี่ยน / ผู้ปฏิบัติงาน *
                  </label>
                  <input
                    type="text"
                    value={replaceTech}
                    onChange={(e) => setReplaceTech(e.target.value)}
                    placeholder="ชื่อช่างซ่อมบำรุง..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    สาเหตุการเปลี่ยน *
                  </label>
                  <select
                    value={replaceReason}
                    onChange={(e) => setReplaceReason(e.target.value as ReplacementReason)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800 font-medium"
                  >
                    <option value="scheduled_pm">ตามรอบบำรุงรักษา (PM)</option>
                    <option value="wear_tear">เสื่อมสภาพตามอายุ</option>
                    <option value="breakdown">ชำรุดเสียหายกะทันหัน</option>
                    <option value="upgrade">ปรับปรุงประสิทธิภาพ</option>
                    <option value="other">อื่นๆ</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  บันทึกการเปลี่ยนแปลง (Change Notes) *
                </label>
                <textarea
                  rows={3}
                  value={replaceNotes}
                  onChange={(e) => setReplaceNotes(e.target.value)}
                  placeholder="เช่น ทำการถอดเปลี่ยนลูกปืนใหม่ยกชุด พร้อมอัดจารบีและทดสอบหมุนลื่นปกติ..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800"
                  required
                />
              </div>

              {/* Photo Attachment */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  รูปถ่ายอะไหล่ / การติดตั้ง (Photo)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl cursor-pointer text-slate-700">
                    <Camera className="w-4 h-4 text-blue-600" />
                    <span>แนบรูปถ่าย</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  {replacePhoto && (
                    <div className="flex items-center gap-2">
                      <img src={replacePhoto} alt="preview" className="w-9 h-9 rounded-lg object-cover border" />
                      <button
                        type="button"
                        onClick={() => setReplacePhoto('')}
                        className="text-rose-600 hover:underline text-[10px]"
                      >
                        ลบรูป
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReplacingItem(null)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReplace}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl shadow-xs transition"
                >
                  {isSubmittingReplace ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนอะไหล่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add New BOM Component */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600 rounded-xl">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">เพิ่มรายการอุปกรณ์ใน BOM (Bill of Materials)</h3>
                  <p className="text-xs text-slate-400">ลงทะเบียนอะไหล่และรอบเปลี่ยนประจำเครื่อง</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewBOM} className="p-5 space-y-4 text-xs">
              {/* Select Machine */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  เลือกเครื่องจักร (Machine) *
                </label>
                <select
                  value={newMachCode}
                  onChange={(e) => setNewMachCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800 font-medium"
                  required
                >
                  {machines.map((m) => (
                    <option key={m.id} value={m.code}>
                      {m.tagCode || ''} {m.name} ({m.code}) [{m.category === 'office' ? 'Office' : 'Factory'}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Part Name & Part No */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    ชื่ออุปกรณ์ / ชิ้นส่วน *
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ใบมีดตัดบน, ซีลกระบอกลม"
                    value={newPartName}
                    onChange={(e) => setNewPartName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    รหัสอะไหล่ (Part No.)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น BLD-1300, 6205-2RS"
                    value={newPartNo}
                    onChange={(e) => setNewPartNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800 font-mono"
                  />
                </div>
              </div>

              {/* Spec & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    สเปก / ขนาด (Specification)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น 25x62x17 mm, B-52"
                    value={newSpec}
                    onChange={(e) => setNewSpec(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    หมวดหมู่ชิ้นส่วน *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800 font-medium"
                  >
                    <option value="mechanical">ชิ้นส่วนกลไก / ใบมีด</option>
                    <option value="electrical">ชิ้นส่วนไฟฟ้า / มอเตอร์</option>
                    <option value="pneumatic">ระบบลมและนิวแมติกส์</option>
                    <option value="hydraulic">ระบบไฮดรอลิก</option>
                    <option value="consumable">วัสดุสิ้นเปลือง / สายพาน</option>
                    <option value="filter">ไส้กรอง / แผ่นกรอง</option>
                  </select>
                </div>
              </div>

              {/* Quantity, Unit & Cycle Days */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    จำนวนติดตั้ง *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newQty}
                    onChange={(e) => setNewQty(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    หน่วยนับ
                  </label>
                  <input
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="ชิ้น, เส้น, ตลับ"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    รอบเปลี่ยน (วัน) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newCycleDays}
                    onChange={(e) => {
                      const days = Number(e.target.value);
                      setNewCycleDays(days);
                      if (days === 30) setNewCycleLabel('ทุก 1 เดือน');
                      else if (days === 60) setNewCycleLabel('ทุก 2 เดือน');
                      else if (days === 90) setNewCycleLabel('ทุก 3 เดือน');
                      else if (days === 180) setNewCycleLabel('ทุก 6 เดือน');
                      else if (days === 365) setNewCycleLabel('ทุก 1 ปี');
                      else setNewCycleLabel(`ทุก ${days} วัน`);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Last Replaced Date & Supplier */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    วันที่เปลี่ยนล่าสุด
                  </label>
                  <input
                    type="date"
                    value={newLastDate}
                    onChange={(e) => setNewLastDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    ผู้จัดจำหน่าย / ซัพพลายเออร์
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น บจก. ไทยแบริ่ง"
                    value={newSupplier}
                    onChange={(e) => setNewSupplier(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  คำแนะนำ / บันทึกเพิ่มเติม
                </label>
                <input
                  type="text"
                  placeholder="เช่น ข้อควรระวังในการติดตั้ง หรือจุดตรวจเช็ก"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNew}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl shadow-xs transition"
                >
                  {isSubmittingNew ? 'กำลังบันทึก...' : 'เพิ่มอุปกรณ์ลงใน BOM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
