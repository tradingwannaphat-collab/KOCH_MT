import React, { useState, useMemo, useRef } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  History, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Boxes, 
  Wrench, 
  Layers, 
  Edit3, 
  Trash2, 
  MapPin, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RotateCcw, 
  ExternalLink, 
  Image as ImageIcon, 
  X, 
  Check, 
  Loader2,
  Calendar,
  User,
  Hash,
  DollarSign,
  Tag,
  Clock,
  Printer,
  ChevronRight,
  Upload,
  Camera
} from 'lucide-react';
import { SparePartCategory, SparePartItemMaster, StockTransaction } from '../types/sparePart';
import { MachineAsset, MaintenanceTicket } from '../types/ticket';
import { KochLogo } from './KochLogo';
import { exportElementToPdf } from '../utils/pdfExport';
import { compressImageFile } from '../utils/imageCompressor';

interface SparePartsManagerProps {
  spareParts: SparePartItemMaster[];
  transactions: StockTransaction[];
  machines: MachineAsset[];
  tickets: MaintenanceTicket[];
  onCreatePart: (data: Partial<SparePartItemMaster>) => Promise<any>;
  onUpdatePart: (id: string, updates: Partial<SparePartItemMaster>) => Promise<any>;
  onDeletePart: (id: string) => Promise<any>;
  onAdjustStock: (
    id: string, 
    payload: {
      type: 'in' | 'out' | 'adjust';
      quantity: number;
      operator?: string;
      referenceTicketNo?: string;
      machineCode?: string;
      notes?: string;
    }
  ) => Promise<any>;
  onSelectMachine?: (machineCode: string) => void;
  onOpenNewTicketForPart?: (part: SparePartItemMaster) => void;
}

const CATEGORY_TABS: { key: string; label: string; icon: string }[] = [
  { key: 'all', label: 'ทั้งหมด', icon: '📦' },
  { key: 'blade', label: 'ใบมีด / ตัด', icon: '🔪' },
  { key: 'bearing', label: 'ลูกปืน / แบริ่ง', icon: '⚙️' },
  { key: 'belt', label: 'สายพาน / โซ่', icon: '🔄' },
  { key: 'electrical', label: 'ไฟฟ้า / เซนเซอร์', icon: '⚡' },
  { key: 'pneumatic', label: 'นิวเมติกส์ / วาล์ว', icon: '💨' },
  { key: 'roller_rubber', label: 'ลูกกลิ้งยาง / ยางดึง', icon: '🛞' },
  { key: 'lubricant', label: 'น้ำมัน / จาระบี', icon: '🛢️' },
  { key: 'filter', label: 'ฟิลเตอร์ / กรอง', icon: '❄️' },
  { key: 'consumable', label: 'วัสดุสิ้นเปลือง', icon: '🏷️' },
];

export const SparePartsManager: React.FC<SparePartsManagerProps> = ({
  spareParts,
  transactions,
  machines,
  tickets,
  onCreatePart,
  onUpdatePart,
  onDeletePart,
  onAdjustStock,
  onSelectMachine,
  onOpenNewTicketForPart
}) => {
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMachineFilter, setSelectedMachineFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPart, setEditingPart] = useState<SparePartItemMaster | null>(null);
  const [stockModalPart, setStockModalPart] = useState<SparePartItemMaster | null>(null);
  const [stockModalType, setStockModalType] = useState<'in' | 'out' | 'adjust'>('out');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedPartForHistory, setSelectedPartForHistory] = useState<SparePartItemMaster | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string } | null>(null);

  // Stock In / Out Form State
  const [stockQuantity, setStockQuantity] = useState<number>(1);
  const [stockOperator, setStockOperator] = useState<string>('ช่างซ่อมบำรุง');
  const [stockTicketNo, setStockTicketNo] = useState<string>('');
  const [stockMachineCode, setStockMachineCode] = useState<string>('');
  const [stockNotes, setStockNotes] = useState<string>('');
  const [isSubmittingStock, setIsSubmittingStock] = useState(false);

  // Add / Edit Form State
  const [formPartNo, setFormPartNo] = useState('');
  const [formName, setFormName] = useState('');
  const [formSpec, setFormSpec] = useState('');
  const [formCategory, setFormCategory] = useState<SparePartCategory>('blade');
  const [formCategoryLabel, setFormCategoryLabel] = useState('ใบมีด / อุปกรณ์ตัด');
  const [formStockQty, setFormStockQty] = useState<number>(10);
  const [formMinStock, setFormMinStock] = useState<number>(2);
  const [formUnit, setFormUnit] = useState('ชิ้น');
  const [formLocation, setFormLocation] = useState('Shelf A-01');
  const [formUnitPrice, setFormUnitPrice] = useState<number>(500);
  const [formSupplier, setFormSupplier] = useState('');
  const [formLeadTime, setFormLeadTime] = useState<number>(3);
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formCompatibleMachines, setFormCompatibleMachines] = useState<string[]>([]);
  const [formCompatibleMachineNames, setFormCompatibleMachineNames] = useState('');
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // PDF Export
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const printInventoryRef = useRef<HTMLDivElement>(null);

  // Image Upload Refs
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  const handleSparePartImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsProcessingPhoto(true);
      const compressed = await compressImageFile(file, 800, 0.78);
      if (compressed) {
        setFormImageUrl(compressed);
      }
    } catch (err) {
      console.warn('Failed compressing spare part image:', err);
    } finally {
      setIsProcessingPhoto(false);
      e.target.value = '';
    }
  };

  // Filtered List
  const filteredParts = useMemo(() => {
    return spareParts.filter((part) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery = 
          part.partNo.toLowerCase().includes(q) ||
          part.name.toLowerCase().includes(q) ||
          part.spec.toLowerCase().includes(q) ||
          part.location.toLowerCase().includes(q) ||
          part.supplier.toLowerCase().includes(q) ||
          part.compatibleMachineNames.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      // Category
      if (selectedCategory !== 'all' && part.category !== selectedCategory) {
        return false;
      }

      // Machine Filter
      if (selectedMachineFilter !== 'all') {
        const isMatched = 
          part.compatibleMachines.includes('all') ||
          part.compatibleMachines.includes(selectedMachineFilter) ||
          part.compatibleMachineNames.toLowerCase().includes(selectedMachineFilter.toLowerCase());
        if (!isMatched) return false;
      }

      // Status Filter
      if (selectedStatusFilter !== 'all') {
        if (selectedStatusFilter === 'in_stock' && part.stockQty <= part.minStock) return false;
        if (selectedStatusFilter === 'low_stock' && (part.stockQty > part.minStock || part.stockQty === 0)) return false;
        if (selectedStatusFilter === 'out_of_stock' && part.stockQty > 0) return false;
      }

      return true;
    });
  }, [spareParts, searchQuery, selectedCategory, selectedMachineFilter, selectedStatusFilter]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = spareParts.length;
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let totalPieces = 0;
    let totalValue = 0;

    spareParts.forEach((p) => {
      totalPieces += p.stockQty;
      totalValue += p.stockQty * p.unitPrice;
      if (p.stockQty === 0) {
        outOfStock++;
      } else if (p.stockQty <= p.minStock) {
        lowStock++;
      } else {
        inStock++;
      }
    });

    return { total, inStock, lowStock, outOfStock, totalPieces, totalValue };
  }, [spareParts]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingPart(null);
    setFormPartNo(`SP-${Date.now().toString().slice(-4)}`);
    setFormName('');
    setFormSpec('');
    setFormCategory('blade');
    setFormCategoryLabel('ใบมีด / อุปกรณ์ตัด');
    setFormStockQty(5);
    setFormMinStock(2);
    setFormUnit('ชิ้น');
    setFormLocation('Shelf A-01');
    setFormUnitPrice(500);
    setFormSupplier('บริษัท สหเครื่องมือกล จำกัด');
    setFormLeadTime(3);
    setFormImageUrl('https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&auto=format&fit=crop&q=80');
    setFormNotes('');
    setFormCompatibleMachines([]);
    setFormCompatibleMachineNames('');
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (part: SparePartItemMaster) => {
    setEditingPart(part);
    setFormPartNo(part.partNo);
    setFormName(part.name);
    setFormSpec(part.spec);
    setFormCategory(part.category);
    setFormCategoryLabel(part.categoryLabel);
    setFormStockQty(part.stockQty);
    setFormMinStock(part.minStock);
    setFormUnit(part.unit);
    setFormLocation(part.location);
    setFormUnitPrice(part.unitPrice);
    setFormSupplier(part.supplier);
    setFormLeadTime(part.leadTimeDays || 3);
    setFormImageUrl(part.imageUrl || '');
    setFormNotes(part.notes || '');
    setFormCompatibleMachines(part.compatibleMachines || []);
    setFormCompatibleMachineNames(part.compatibleMachineNames || '');
    setShowAddModal(true);
  };

  // Handle Form Submit (Create / Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPartNo.trim() || !formName.trim()) {
      alert('กรุณากรอกรหัสอะไหล่และชื่ออะไหล่');
      return;
    }

    setIsSubmittingForm(true);
    try {
      const payload: Partial<SparePartItemMaster> = {
        partNo: formPartNo.trim().toUpperCase(),
        name: formName.trim(),
        spec: formSpec.trim(),
        category: formCategory,
        categoryLabel: formCategoryLabel,
        stockQty: Number(formStockQty),
        minStock: Number(formMinStock),
        unit: formUnit.trim() || 'ชิ้น',
        location: formLocation.trim() || 'Warehouse',
        unitPrice: Number(formUnitPrice) || 0,
        supplier: formSupplier.trim(),
        leadTimeDays: Number(formLeadTime) || 3,
        imageUrl: formImageUrl.trim(),
        notes: formNotes.trim(),
        compatibleMachines: formCompatibleMachines.length > 0 ? formCompatibleMachines : ['all'],
        compatibleMachineNames: formCompatibleMachineNames.trim() || 'ทุกเครื่องจักร'
      };

      if (editingPart) {
        await onUpdatePart(editingPart.id, payload);
      } else {
        await onCreatePart(payload);
      }
      setShowAddModal(false);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Handle Open Stock Adjustment Modal
  const handleOpenStockModal = (part: SparePartItemMaster, type: 'in' | 'out' | 'adjust') => {
    setStockModalPart(part);
    setStockModalType(type);
    setStockQuantity(type === 'adjust' ? part.stockQty : 1);
    setStockOperator('ทีมช่างซ่อมบำรุง');
    setStockTicketNo('');
    setStockMachineCode(part.compatibleMachines[0] !== 'all' ? part.compatibleMachines[0] : '');
    setStockNotes(type === 'in' ? 'รับสินค้าเข้าสต๊อกตาม PO' : type === 'out' ? 'เบิกใช้งานซ่อมบำรุง' : 'ตรวจนับสต๊อกจริง');
  };

  // Submit Stock Adjustment
  const handleSubmitStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockModalPart) return;

    if (stockQuantity <= 0 && stockModalType !== 'adjust') {
      alert('กรุณาระบุจำนวนที่มากกว่า 0');
      return;
    }

    if (stockModalType === 'out' && stockQuantity > stockModalPart.stockQty) {
      alert(`สต๊อกมีเพียง ${stockModalPart.stockQty} ${stockModalPart.unit} ไม่พอต่อการเบิก ${stockQuantity} ${stockModalPart.unit}`);
      return;
    }

    setIsSubmittingStock(true);
    try {
      await onAdjustStock(stockModalPart.id, {
        type: stockModalType,
        quantity: Number(stockQuantity),
        operator: stockOperator.trim() || 'ช่างซ่อมบำรุง',
        referenceTicketNo: stockTicketNo.trim() || undefined,
        machineCode: stockMachineCode.trim() || undefined,
        notes: stockNotes.trim()
      });
      setStockModalPart(null);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการปรับสต๊อก: ' + err.message);
    } finally {
      setIsSubmittingStock(false);
    }
  };

  // Export PDF
  const handleDownloadInventoryPdf = async () => {
    if (!printInventoryRef.current) return;
    setIsDownloadingPdf(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await exportElementToPdf(
        printInventoryRef.current,
        `FM-MN01-06_KOCH_SpareParts_Inventory_${today}.pdf`,
        { orientation: 'landscape', fitToOnePage: true, marginMm: 6 }
      );
    } catch (err) {
      console.error('PDF export error:', err);
      alert('ไม่สามารถสร้าง PDF ได้ในขณะนี้');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold">
                SPARE PARTS MASTER CATALOG • โรงงานบางแสน BS
              </span>
              <span className="text-xs text-indigo-300">
                ระบบจัดการคลังอะไหล่สำรอง & เชื่อมโยงใบแจ้งซ่อม FM-MN01-03
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2.5">
              <Boxes className="w-6 h-6 text-indigo-400" />
              <span>รายการสแปร์พาร์ทโรงงาน (Spare Parts Inventory List)</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              ควบคุมสต๊อกใบมีด ลูกปืน สายพาน อุปกรณ์ไฟฟ้า นิวเมติกส์ จุดสั่งซื้อ Safety Stock และบันทึกประวัติการเบิกใช้อะไหล่เรียลไทม์
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View History Button */}
            <button
              type="button"
              onClick={() => {
                setSelectedPartForHistory(null);
                setShowHistoryModal(true);
              }}
              className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="ดูประวัติการรับเข้าและเบิกใช้อะไหล่ทั้งหมด"
            >
              <History className="w-4 h-4 text-indigo-400" />
              <span>ประวัติเบิก-รับ ({transactions.length})</span>
            </button>

            {/* Direct PDF Download */}
            <button
              type="button"
              onClick={handleDownloadInventoryPdf}
              disabled={isDownloadingPdf}
              className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
              title="ดาวน์โหลดรายงานสรุปสต๊อกสแปร์พาร์ทเป็นเอกสาร PDF ทางการ"
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังสร้าง PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>บันทึกเป็น PDF (FM-MN01-06)</span>
                </>
              )}
            </button>

            {/* Add Part Button */}
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ เพิ่มสแปร์พาร์ทใหม่</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. KPI Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Master Items */}
        <div 
          onClick={() => setSelectedStatusFilter('all')}
          className={`bg-white rounded-xl p-3.5 border transition cursor-pointer shadow-xs ${
            selectedStatusFilter === 'all' ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">สแปร์พาร์ททั้งหมด</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-800">{stats.total}</span>
            <span className="text-xs text-slate-500 font-medium">รายการ</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            รวม {stats.totalPieces.toLocaleString()} ชิ้นในคลัง
          </div>
        </div>

        {/* In Stock */}
        <div 
          onClick={() => setSelectedStatusFilter('in_stock')}
          className={`bg-white rounded-xl p-3.5 border transition cursor-pointer shadow-xs ${
            selectedStatusFilter === 'in_stock' ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">สต๊อกพร้อมใช้</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-emerald-600">{stats.inStock}</span>
            <span className="text-xs text-slate-500 font-medium">รายการ</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
            ระดับสต๊อกปลอดภัย &gt; Min
          </div>
        </div>

        {/* Low Stock (Near / At Reorder Point) */}
        <div 
          onClick={() => setSelectedStatusFilter('low_stock')}
          className={`bg-white rounded-xl p-3.5 border transition cursor-pointer shadow-xs ${
            selectedStatusFilter === 'low_stock' ? 'border-amber-500 ring-2 ring-amber-100' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ใกล้หมด / ต้องสั่งซื้อ</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-amber-600">{stats.lowStock}</span>
            <span className="text-xs text-slate-500 font-medium">รายการ</span>
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-0.5">
            ต่ำกว่า Safety Stock
          </div>
        </div>

        {/* Out of Stock */}
        <div 
          onClick={() => setSelectedStatusFilter('out_of_stock')}
          className={`bg-white rounded-xl p-3.5 border transition cursor-pointer shadow-xs ${
            selectedStatusFilter === 'out_of_stock' ? 'border-rose-500 ring-2 ring-rose-100' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">หมดสต๊อก (0 ชิ้น)</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-rose-600">{stats.outOfStock}</span>
            <span className="text-xs text-slate-500 font-medium">รายการ</span>
          </div>
          <div className="text-[11px] text-rose-600 font-medium mt-0.5">
            กระทบงานซ่อมบำรุง
          </div>
        </div>

        {/* Total Value */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">มูลค่าสต๊อกรวม</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-bold text-slate-800">
              ฿{stats.totalValue.toLocaleString()}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            คำนวณจากราคาต่อหน่วย
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORY_TABS.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            const count = cat.key === 'all' 
              ? spareParts.length 
              : spareParts.filter((p) => p.category === cat.key).length;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Machine Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1 border-t border-slate-100">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหารหัสอะไหล่, ชื่อชิ้นส่วน, สเปก, ที่เก็บ (Shelf), ผู้ผลิต..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Machine Filter Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedMachineFilter}
              onChange={(e) => setSelectedMachineFilter(e.target.value)}
              className="w-full sm:w-56 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:bg-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">-- เครื่องจักรทั้งหมด (33 เครื่อง) --</option>
              {machines.map((m) => (
                <option key={m.id} value={m.code}>
                  #{m.no || m.code} {m.name} ({m.code})
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full sm:w-40 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:bg-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">สถานะสต๊อกทั้งหมด</option>
              <option value="in_stock">🟢 สต๊อกพร้อม (&gt; Min)</option>
              <option value="low_stock">⚠️ ใกล้หมด (≤ Min)</option>
              <option value="out_of_stock">❌ หมดสต๊อก (0 ชิ้น)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Spare Parts Master Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-sm">
              รายการสแปร์พาร์ทในคลัง
            </span>
            <span className="bg-indigo-100 text-indigo-800 text-[11px] font-semibold px-2 py-0.5 rounded-full font-mono">
              {filteredParts.length} / {spareParts.length} รายการ
            </span>
          </div>
          <span className="text-xs text-slate-500">
            แตะที่รูปเพื่อซูมดูรูปอะไหล่ | กดปุ่มรับเข้า-เบิกใช้เพื่อบันทึกประวัติทันที
          </span>
        </div>

        {filteredParts.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Boxes className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="font-medium">ไม่พบสแปร์พาร์ทที่ตรงกับเงื่อนไขการค้นหา</p>
            <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหาหรือตัวกรองหมวดหมู่</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3 w-14 text-center">รูป</th>
                  <th className="py-3 px-3 w-32">รหัสอะไหล่</th>
                  <th className="py-3 px-4 min-w-[200px]">ชื่อชิ้นส่วน & สเปก</th>
                  <th className="py-3 px-3 w-36">หมวดหมู่</th>
                  <th className="py-3 px-3 min-w-[150px]">เครื่องจักรที่รองรับ</th>
                  <th className="py-3 px-3 w-28 text-center">จุดจัดเก็บ</th>
                  <th className="py-3 px-3 w-36 text-center">สต๊อกคงเหลือ / Safety</th>
                  <th className="py-3 px-3 w-28 text-right">ราคาต่อหน่วย</th>
                  <th className="py-3 px-3 w-28 text-center">สถานะ</th>
                  <th className="py-3 px-3 w-40 text-center">จัดการสต๊อก & ข้อมูล</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {filteredParts.map((part) => {
                  const isOutOfStock = part.stockQty === 0;
                  const isLowStock = !isOutOfStock && part.stockQty <= part.minStock;
                  const stockPercent = Math.min(100, Math.round((part.stockQty / (part.minStock * 2 || 1)) * 100));

                  return (
                    <tr 
                      key={part.id} 
                      className={`hover:bg-indigo-50/30 transition-colors ${
                        isOutOfStock ? 'bg-rose-50/20' : isLowStock ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Image Thumbnail */}
                      <td className="py-2.5 px-3 text-center">
                        {part.imageUrl ? (
                          <img
                            src={part.imageUrl}
                            alt={part.name}
                            onClick={() => setPreviewPhoto({ url: part.imageUrl!, title: `${part.partNo} - ${part.name}` })}
                            className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-2xs cursor-pointer hover:opacity-85 transition mx-auto"
                            onError={(e) => {
                              // Fallback if image fails to load
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                      </td>

                      {/* Part No */}
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/80 inline-block">
                          {part.partNo}
                        </span>
                      </td>

                      {/* Name & Spec */}
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">
                          {part.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5 line-clamp-2">
                          {part.spec}
                        </div>
                        {part.notes && (
                          <div className="text-[10px] text-slate-400 italic mt-0.5">
                            * {part.notes}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {part.categoryLabel}
                        </span>
                      </td>

                      {/* Compatible Machines */}
                      <td className="py-2.5 px-3">
                        <div className="text-slate-800 font-medium text-[11px]">
                          {part.compatibleMachineNames || 'ทุกเครื่องจักร'}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {part.compatibleMachines.slice(0, 3).map((code) => (
                            <span 
                              key={code} 
                              className="text-[9px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded"
                            >
                              {code}
                            </span>
                          ))}
                          {part.compatibleMachines.length > 3 && (
                            <span className="text-[9px] text-slate-400 font-mono">
                              +{part.compatibleMachines.length - 3} เครื่อง
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Storage Location */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex items-center gap-1 font-mono font-bold text-[11px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                          <MapPin className="w-3 h-3 text-rose-500" />
                          <span>{part.location}</span>
                        </div>
                      </td>

                      {/* Stock Level & Progress */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1 font-bold">
                          <span className={`text-base font-mono ${
                            isOutOfStock 
                              ? 'text-rose-600' 
                              : isLowStock 
                              ? 'text-amber-600' 
                              : 'text-slate-800'
                          }`}>
                            {part.stockQty}
                          </span>
                          <span className="text-slate-500 text-xs">/ {part.minStock}</span>
                          <span className="text-slate-500 text-[11px] font-normal">{part.unit}</span>
                        </div>

                        {/* Visual Stock Bar */}
                        <div className="w-24 mx-auto bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              isOutOfStock 
                                ? 'bg-rose-500' 
                                : isLowStock 
                                ? 'bg-amber-500' 
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.max(5, stockPercent)}%` }}
                          />
                        </div>
                      </td>

                      {/* Unit Price */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="font-mono font-semibold text-slate-800">
                          ฿{part.unitPrice.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          รวม: ฿{(part.stockQty * part.unitPrice).toLocaleString()}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3" />
                            <span>หมดสต๊อก</span>
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                            <AlertTriangle className="w-3 h-3" />
                            <span>ใกล้หมด (สั่งซื้อ)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>พร้อมใช้</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Stock In Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenStockModal(part, 'in')}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold px-2 py-1 rounded text-[11px] transition cursor-pointer flex items-center gap-0.5 shadow-2xs"
                            title="รับเข้าสต๊อก (+)"
                          >
                            <Plus className="w-3 h-3" />
                            <span>รับเข้า</span>
                          </button>

                          {/* Stock Out Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenStockModal(part, 'out')}
                            disabled={isOutOfStock}
                            className={`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer flex items-center gap-0.5 shadow-2xs ${
                              isOutOfStock 
                                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300'
                            }`}
                            title="เบิกใช้อะไหล่ (-)"
                          >
                            <ArrowDownLeft className="w-3 h-3" />
                            <span>เบิกใช้</span>
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(part)}
                            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                            title="แก้ไขรายละเอียดอะไหล่"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`คุณต้องการลบสแปร์พาร์ท [${part.partNo}] ${part.name} ใช่หรือไม่?`)) {
                                onDeletePart(part.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                            title="ลบสแปร์พาร์ท"
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
        )}
      </div>

      {/* 5. Stock Adjustment Modal (Stock In / Stock Out / Adjust) */}
      {stockModalPart && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className={`p-4 border-b text-white flex items-center justify-between ${
              stockModalType === 'in' 
                ? 'bg-emerald-600' 
                : stockModalType === 'out' 
                ? 'bg-blue-600' 
                : 'bg-amber-600'
            }`}>
              <div className="flex items-center gap-2">
                {stockModalType === 'in' ? (
                  <TrendingUp className="w-5 h-5" />
                ) : stockModalType === 'out' ? (
                  <TrendingDown className="w-5 h-5" />
                ) : (
                  <RotateCcw className="w-5 h-5" />
                )}
                <div>
                  <h3 className="font-bold text-sm">
                    {stockModalType === 'in' 
                      ? 'รับสแปร์พาร์ทเข้าสต๊อก (+ Stock In)' 
                      : stockModalType === 'out' 
                      ? 'เบิกใช้อะไหล่ซ่อมบำรุง (- Stock Out)' 
                      : 'ปรับยอดคงเหลือจริง (Audit Adjust)'}
                  </h3>
                  <p className="text-[11px] text-white/80 font-mono">
                    {stockModalPart.partNo} • {stockModalPart.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStockModalPart(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitStockAdjustment} className="p-4 space-y-3.5">
              {/* Type Switcher */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setStockModalType('out')}
                  className={`py-1.5 rounded-lg transition ${
                    stockModalType === 'out' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  เบิกใช้ (-)
                </button>
                <button
                  type="button"
                  onClick={() => setStockModalType('in')}
                  className={`py-1.5 rounded-lg transition ${
                    stockModalType === 'in' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  รับเข้า (+)
                </button>
                <button
                  type="button"
                  onClick={() => setStockModalType('adjust')}
                  className={`py-1.5 rounded-lg transition ${
                    stockModalType === 'adjust' ? 'bg-white text-amber-600 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  ปรับยอดนับ
                </button>
              </div>

              {/* Current Stock Banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500">ยอดสต๊อกคงเหลือปัจจุบัน:</span>
                  <div className="font-mono font-bold text-slate-800 text-sm">
                    {stockModalPart.stockQty} {stockModalPart.unit}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">จัดเก็บที่:</span>
                  <div className="font-mono font-semibold text-slate-700">
                    {stockModalPart.location}
                  </div>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {stockModalType === 'adjust' ? 'ยอดที่ตรวจนับได้จริงในคลัง *' : 'จำนวนที่ทำรายการ *'} ({stockModalPart.unit})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={stockModalType === 'out' ? stockModalPart.stockQty : 99999}
                    required
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(Number(e.target.value))}
                    className="w-full text-base font-mono font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                    {stockModalPart.unit}
                  </span>
                </div>
                {stockModalType === 'out' && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    สต๊อกหลังเบิก: <span className="font-mono font-bold text-blue-600">{Math.max(0, stockModalPart.stockQty - stockQuantity)} {stockModalPart.unit}</span>
                  </p>
                )}
                {stockModalType === 'in' && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    สต๊อกหลังรับเข้า: <span className="font-mono font-bold text-emerald-600">{stockModalPart.stockQty + stockQuantity} {stockModalPart.unit}</span>
                  </p>
                )}
              </div>

              {/* Operator */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ผู้ทำรายการ / ผู้เบิกของ *
                </label>
                <input
                  type="text"
                  required
                  value={stockOperator}
                  onChange={(e) => setStockOperator(e.target.value)}
                  placeholder="เช่น ช่างสมชาย, วิศวกรซ่อมบำรุง"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Machine Selection (for Stock Out) */}
              {stockModalType === 'out' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    นำไปเปลี่ยน/ติดตั้งกับเครื่องจักร
                  </label>
                  <select
                    value={stockMachineCode}
                    onChange={(e) => setStockMachineCode(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">-- ไม่ระบุเครื่อง --</option>
                    {machines.map((m) => (
                      <option key={m.id} value={m.code}>
                        #{m.no || m.code} {m.name} ({m.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Link to Ticket No (Optional) */}
              {stockModalType === 'out' && tickets.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เชื่อมโยงเลขที่ใบแจ้งซ่อม (FM-MN01-03)
                  </label>
                  <select
                    value={stockTicketNo}
                    onChange={(e) => setStockTicketNo(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none font-mono"
                  >
                    <option value="">-- ไม่ระบุใบแจ้งซ่อม --</option>
                    {tickets.map((t) => (
                      <option key={t.id} value={t.ticketNo}>
                        {t.ticketNo} - {t.machineNo} ({t.problemDescription.slice(0, 25)}...)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  หมายเหตุ / เลขที่ใบสั่งซื้อ / รายละเอียดเพิ่มเติม
                </label>
                <textarea
                  rows={2}
                  value={stockNotes}
                  onChange={(e) => setStockNotes(e.target.value)}
                  placeholder="เช่น สั่งซื้อจากบ.สหเครื่องมือกล, เปลี่ยนตามรอบบำรุงรักษา PM"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStockModalPart(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStock}
                  className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer ${
                    stockModalType === 'in' 
                      ? 'bg-emerald-600 hover:bg-emerald-500' 
                      : stockModalType === 'out' 
                      ? 'bg-blue-600 hover:bg-blue-500' 
                      : 'bg-amber-600 hover:bg-amber-500'
                  }`}
                >
                  {isSubmittingStock ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>ยืนยันบันทึกยอด</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Add / Edit Master Spare Part Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="p-4 bg-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">
                  {editingPart ? `แก้ไขข้อมูลสแปร์พาร์ท [${editingPart.partNo}]` : '+ เพิ่มสแปร์พาร์ทใหม่เข้าระบบ'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Part No */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    รหัสอะไหล่ (Part No) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formPartNo}
                    onChange={(e) => setFormPartNo(e.target.value.toUpperCase())}
                    placeholder="เช่น SP-BLD-01, SP-BRG-6205"
                    className="w-full text-xs font-mono font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none uppercase"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่ออะไหล่ / อุปกรณ์ *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="เช่น ใบมีด Slotting Blade, สายพานส่งกำลัง V-Belt"
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    หมวดหมู่อะไหล่ *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => {
                      const val = e.target.value as SparePartCategory;
                      setFormCategory(val);
                      const tab = CATEGORY_TABS.find((t) => t.key === val);
                      if (tab) setFormCategoryLabel(tab.label);
                    }}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="blade">🔪 ใบมีด / อุปกรณ์ตัด (Blade)</option>
                    <option value="bearing">⚙️ ลูกปืน / แบริ่ง (Bearing)</option>
                    <option value="belt">🔄 สายพาน / โซ่ส่งกำลัง (Belt)</option>
                    <option value="electrical">⚡ ไฟฟ้า / เซนเซอร์ / คอนแทกเตอร์</option>
                    <option value="pneumatic">💨 นิวเมติกส์ / โซลินอยด์วาล์ว</option>
                    <option value="roller_rubber">🛞 ลูกกลิ้งยาง / ยางดึงกระดาษ</option>
                    <option value="lubricant">🛢️ น้ำมันหล่อลื่น / จาระบี</option>
                    <option value="filter">❄️ ฟิลเตอร์แอร์ / ไส้กรอง</option>
                    <option value="consumable">🏷️ วัสดุสิ้นเปลือง / อื่นๆ</option>
                  </select>
                </div>

                {/* Storage Location */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ตำแหน่งจัดเก็บ (Shelf / Bin) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="เช่น Shelf A-01, ตู้ B-2, ชั้นวางใบมีด"
                    className="w-full text-xs font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Stock Qty */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    จำนวนคงเหลือในสต๊อก *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formStockQty}
                    onChange={(e) => setFormStockQty(Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Min Stock (Safety Stock) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    จุดสั่งซื้อขั้นต่ำ (Safety Stock / Min Stock) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    หน่วยนับ *
                  </label>
                  <input
                    type="text"
                    required
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="เช่น ชิ้น, เส้น, ตลับ, กระป๋อง, ชุด, ลิตร"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Unit Price */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ราคาต่อหน่วย (บาท)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formUnitPrice}
                    onChange={(e) => setFormUnitPrice(Number(e.target.value))}
                    className="w-full text-xs font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Supplier */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ผู้จำหน่าย / ร้านค้า (Supplier)
                  </label>
                  <input
                    type="text"
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                    placeholder="เช่น บริษัท สหเครื่องมือกล จำกัด"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Lead Time Days */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ระยะเวลาจัดส่ง (Lead Time วัน)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formLeadTime}
                    onChange={(e) => setFormLeadTime(Number(e.target.value))}
                    className="w-full text-xs font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Detailed Spec */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  สเปกทางเทคนิคละเอียด (Spec / Material / Dimensions)
                </label>
                <input
                  type="text"
                  value={formSpec}
                  onChange={(e) => setFormSpec(e.target.value)}
                  placeholder="เช่น เหล็ก SKD-11 เกรดพิเศษ ขนาด 280x65x8 มม. รูใน 40 มม."
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none font-mono"
                />
              </div>

              {/* Compatible Machines Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  เครื่องจักรที่ใช้งานได้ (ข้อความอธิบาย)
                </label>
                <input
                  type="text"
                  value={formCompatibleMachineNames}
                  onChange={(e) => setFormCompatibleMachineNames(e.target.value)}
                  placeholder="เช่น Slot (BS-01), Cutting (BS-02), Flexo (BS-09)"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Photo Upload + Preview + Image URL with Preset Options */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  รูปภาพอะไหล่ (อัปโหลดรูป / ถ่ายภาพ หรือวางลิงก์ URL)
                </label>

                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-slate-50 border border-slate-200 rounded-xl p-3">
                  {/* Live Thumbnail Preview */}
                  <div className="w-20 h-20 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                    {formImageUrl ? (
                      <img
                        src={formImageUrl}
                        alt="ตัวอย่างรูปอะไหล่"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <ImageIcon className="w-7 h-7 text-slate-300" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={isProcessingPhoto}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-2xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isProcessingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        <span>{isProcessingPhoto ? 'กำลังย่อรูป...' : 'อัปโหลดรูปจากเครื่อง'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        disabled={isProcessingPhoto}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-2xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>ถ่ายรูปอะไหล่</span>
                      </button>

                      {formImageUrl && (
                        <button
                          type="button"
                          onClick={() => setFormImageUrl('')}
                          className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-semibold rounded-lg transition cursor-pointer"
                        >
                          ลบรูป
                        </button>
                      )}
                    </div>

                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleSparePartImageUpload}
                      className="hidden"
                    />
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleSparePartImageUpload}
                      className="hidden"
                    />

                    <input
                      type="text"
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      placeholder="หรือวางลิงก์ URL รูปภาพ เช่น https://..."
                      className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-slate-500 py-0.5">รูปสำเร็จรูป:</span>
                  <button
                    type="button"
                    onClick={() => setFormImageUrl('https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=80')}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded text-slate-700 cursor-pointer"
                  >
                    มีด/ใบเลื่อย
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormImageUrl('https://images.unsplash.com/photo-1618042164219-62c820f10723?w=400&auto=format&fit=crop&q=80')}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded text-slate-700 cursor-pointer"
                  >
                    ลูกปืนแบริ่ง
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormImageUrl('https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=400&auto=format&fit=crop&q=80')}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded text-slate-700 cursor-pointer"
                  >
                    สายพาน/มอเตอร์
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormImageUrl('https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=400&auto=format&fit=crop&q=80')}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded text-slate-700 cursor-pointer"
                  >
                    วาล์วลม/ไฟฟ้า
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  หมายเหตุเพิ่มเติม (Notes)
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="ข้อมูลการเก็บรักษา ข้อควรระวัง หรือข้อกำหนดพิเศษ"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingForm}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingForm ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingPart ? 'บันทึกการแก้ไข' : 'บันทึกสแปร์พาร์ทใหม่'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Stock Movement History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-base">
                    สมุดบันทึกประวัติการรับเข้า-เบิกใช้อะไหล่ (Stock Movement Ledger)
                  </h3>
                  <p className="text-xs text-slate-400">
                    โรงงานบางแสน BS • ประวัติทำรายการทั้งหมด {transactions.length} รายการ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {transactions.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <History className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p>ยังไม่มีประวัติการรับเข้าหรือเบิกใช้อะไหล่</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3">วัน-เวลา</th>
                        <th className="py-2.5 px-3">ประเภท</th>
                        <th className="py-2.5 px-3">รหัส & ชื่ออะไหล่</th>
                        <th className="py-2.5 px-3 text-center">จำนวน</th>
                        <th className="py-2.5 px-3 text-center">คงเหลือหลังทำ</th>
                        <th className="py-2.5 px-3">ผู้ทำรายการ</th>
                        <th className="py-2.5 px-3">เครื่อง / ใบแจ้งซ่อม</th>
                        <th className="py-2.5 px-3">หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                            {tx.date} {tx.time}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            {tx.type === 'in' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                <TrendingUp className="w-3 h-3" />
                                <span>รับเข้า</span>
                              </span>
                            ) : tx.type === 'out' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                                <TrendingDown className="w-3 h-3" />
                                <span>เบิกใช้</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                                <RotateCcw className="w-3 h-3" />
                                <span>ปรับสต๊อก</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-mono font-bold text-indigo-700 mr-1.5">
                              {tx.partNo}
                            </span>
                            <span className="text-slate-800">{tx.partName}</span>
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold">
                            <span className={tx.type === 'in' ? 'text-emerald-600' : tx.type === 'out' ? 'text-blue-600' : 'text-amber-600'}>
                              {tx.type === 'in' ? `+${tx.quantity}` : tx.type === 'out' ? `-${tx.quantity}` : tx.quantity}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-700">
                            {tx.balanceAfter}
                          </td>
                          <td className="py-2 px-3 text-slate-700">
                            {tx.operator}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px]">
                            {tx.machineCode && (
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded mr-1">
                                {tx.machineCode}
                              </span>
                            )}
                            {tx.referenceTicketNo && (
                              <span className="text-blue-600 font-bold">
                                {tx.referenceTicketNo}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-500 text-[11px]">
                            {tx.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 text-right">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 text-xs font-semibold bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-100 transition"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Photo Zoom Preview Modal */}
      {previewPhoto && (
        <div 
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-2xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-bold text-xs sm:text-sm font-mono truncate">{previewPhoto.title}</span>
              <button 
                type="button" 
                onClick={() => setPreviewPhoto(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-slate-950 flex items-center justify-center p-4 max-h-[75vh]">
              <img 
                src={previewPhoto.url} 
                alt={previewPhoto.title} 
                className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* 9. Printable Document Container for PDF Export (FM-MN01-06) */}
      <div className="hidden">
        <div ref={printInventoryRef} className="p-6 bg-white text-slate-900 font-sans w-[297mm] mx-auto">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-3 mb-3 flex items-center justify-between gap-4">
            <div>
              <div className="text-lg font-black text-slate-900">
                บริษัท โค้ช แพคเกจจิ้ง แอนด์ แพคกิ้ง เซอร์วิสเซส จำกัด
              </div>
              <div className="text-sm font-bold text-slate-700">
                KOCH PACKAGING AND PACKING SERVICES CO., LTD. • โรงงานบางแสน BS
              </div>
              <div className="text-base font-extrabold text-blue-900 mt-1">
                รายงานการตรวจนับและยอดคงเหลือสแปร์พาร์ท (SPARE PARTS INVENTORY REPORT)
              </div>
            </div>
            <div className="text-right font-mono text-[11px] text-slate-800 border border-slate-800 px-3 py-2 rounded bg-slate-50 shrink-0 space-y-0.5">
              <div className="font-bold text-slate-900">หมายเลขเอกสาร: FM-MN01-06</div>
              <div className="text-[10px]">อ้างอิง: FM-MN01-03 Link • Rev.00</div>
              <div className="text-[10px]">วันที่พิมพ์: {new Date().toLocaleDateString('th-TH')}</div>
              <div className="text-[10px]">จำนวน {spareParts.length} รายการ • หน้าที่ 1 / 1</div>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-left border-collapse text-xs border border-slate-400">
            <thead>
              <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-400">
                <th className="py-2 px-2 border border-slate-300 w-10 text-center">ลำดับ</th>
                <th className="py-2 px-2 border border-slate-300 w-24">รหัสอะไหล่</th>
                <th className="py-2 px-3 border border-slate-300">ชื่อชิ้นส่วน & สเปกละเอียด</th>
                <th className="py-2 px-2 border border-slate-300 w-28">หมวดหมู่</th>
                <th className="py-2 px-2 border border-slate-300">เครื่องจักรที่ใช้</th>
                <th className="py-2 px-2 border border-slate-300 w-20 text-center">ที่จัดเก็บ</th>
                <th className="py-2 px-2 border border-slate-300 w-16 text-center">สต๊อกจริง</th>
                <th className="py-2 px-2 border border-slate-300 w-16 text-center">จุดสั่งซื้อ</th>
                <th className="py-2 px-2 border border-slate-300 w-14 text-center">หน่วย</th>
                <th className="py-2 px-2 border border-slate-300 w-20 text-right">ราคา/หน่วย</th>
                <th className="py-2 px-2 border border-slate-300 w-20 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {spareParts.map((item, idx) => (
                <tr key={item.id} className="border-b border-slate-300">
                  <td className="py-1.5 px-2 border border-slate-300 text-center font-mono">{idx + 1}</td>
                  <td className="py-1.5 px-2 border border-slate-300 font-mono font-bold">{item.partNo}</td>
                  <td className="py-1.5 px-3 border border-slate-300 font-semibold">
                    {item.name}
                    <div className="text-[10px] text-slate-500 font-mono">{item.spec}</div>
                  </td>
                  <td className="py-1.5 px-2 border border-slate-300">{item.categoryLabel}</td>
                  <td className="py-1.5 px-2 border border-slate-300">{item.compatibleMachineNames}</td>
                  <td className="py-1.5 px-2 border border-slate-300 text-center font-mono">{item.location}</td>
                  <td className="py-1.5 px-2 border border-slate-300 text-center font-mono font-bold">{item.stockQty}</td>
                  <td className="py-1.5 px-2 border border-slate-300 text-center font-mono">{item.minStock}</td>
                  <td className="py-1.5 px-2 border border-slate-300 text-center">{item.unit}</td>
                  <td className="py-1.5 px-2 border border-slate-300 text-right font-mono">฿{item.unitPrice.toLocaleString()}</td>
                  <td className="py-1.5 px-2 border border-slate-300 text-center font-bold">
                    {item.stockQty === 0 ? 'หมดสต๊อก' : item.stockQty <= item.minStock ? 'ใกล้หมด' : 'พร้อมใช้'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Signatures */}
          <div className="mt-8 grid grid-cols-3 gap-8 text-center text-xs pt-4 border-t border-slate-300">
            <div>
              <div className="border-b border-slate-400 pb-8 mb-2"></div>
              <div className="font-bold">ลงชื่อ ......................................................</div>
              <div className="text-slate-600">เจ้าหน้าที่คลังอะไหล่ (ผู้ตรวจนับ)</div>
              <div className="text-[10px] text-slate-400 mt-0.5">วันที่ ......./......./...........</div>
            </div>
            <div>
              <div className="border-b border-slate-400 pb-8 mb-2"></div>
              <div className="font-bold">ลงชื่อ ......................................................</div>
              <div className="text-slate-600">หัวหน้าฝ่ายซ่อมบำรุง (ผู้ตรวจสอบ)</div>
              <div className="text-[10px] text-slate-400 mt-0.5">วันที่ ......./......./...........</div>
            </div>
            <div>
              <div className="border-b border-slate-400 pb-8 mb-2"></div>
              <div className="font-bold">ลงชื่อ ......................................................</div>
              <div className="text-slate-600">ผู้จัดการโรงงาน / ฝ่ายผลิต (ผู้อนุมัติ)</div>
              <div className="text-[10px] text-slate-400 mt-0.5">วันที่ ......./......./...........</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
