import React, { useState, useRef } from 'react';
import { 
  AlertCircle, 
  Camera, 
  Send, 
  CheckCircle2, 
  Building2, 
  Cog, 
  Flame, 
  Clock, 
  User, 
  MapPin, 
  FileText, 
  X,
  Sparkles,
  PenTool,
  Plus,
  Scissors,
  Printer,
  Scan,
  Check,
  Search,
  Upload,
  FileUp,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { MaintenanceTicket, UrgencyLevel, MachineAsset } from '../types/ticket';
import { SignaturePad } from './SignaturePad';
import { safeApiCall } from '../utils/apiClient';

interface NewTicketFormProps {
  onSubmit: (ticketData: Partial<MaintenanceTicket>) => Promise<{ success: boolean; ticket?: MaintenanceTicket; message?: string }>;
  onSuccess: (ticket: MaintenanceTicket) => void;
  machines?: MachineAsset[];
  initialMachine?: MachineAsset | null;
  initialProblemNotes?: string;
  onCreateMachine?: (data: Partial<MachineAsset>) => Promise<any>;
}

export const NewTicketForm: React.FC<NewTicketFormProps> = ({ 
  onSubmit, 
  onSuccess,
  machines = [],
  initialMachine = null,
  initialProblemNotes = '',
  onCreateMachine
}) => {
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const [requesterName, setRequesterName] = useState('');
  const [department, setDepartment] = useState(initialMachine?.department || 'ฝ่ายผลิต');
  const [category, setCategory] = useState<'machine' | 'infrastructure' | 'office'>(
    initialMachine?.category === 'office' ? 'office' : initialMachine?.category === 'infrastructure' ? 'infrastructure' : 'machine'
  );
  const [machineNo, setMachineNo] = useState(initialMachine?.code || '');
  const [location, setLocation] = useState(initialMachine?.location || '');
  const [urgency, setUrgency] = useState<UrgencyLevel>('high');
  const [problemDescription, setProblemDescription] = useState(initialProblemNotes || '');
  const [requestDate, setRequestDate] = useState(currentDate);
  const [requestTime, setRequestTime] = useState(currentTime);

  React.useEffect(() => {
    if (initialMachine) {
      setMachineNo(initialMachine.code);
      setCategory(
        initialMachine.category === 'office' ? 'office' : initialMachine.category === 'infrastructure' ? 'infrastructure' : 'machine'
      );
      setLocation(initialMachine.location ? `${initialMachine.location} (${initialMachine.name})` : 'บางแสน BS');
      if (initialMachine.department) setDepartment(initialMachine.department);
    }
  }, [initialMachine]);

  React.useEffect(() => {
    if (initialProblemNotes) {
      setProblemDescription(initialProblemNotes);
    }
  }, [initialProblemNotes]);
  
  // Quick Machine Creation Inline Modal
  const [showInlineNewMachine, setShowInlineNewMachine] = useState(false);
  const [newMachCode, setNewMachCode] = useState('');
  const [newMachName, setNewMachName] = useState('');
  const [newMachType, setNewMachType] = useState('cutting');
  const [newMachLocation, setNewMachLocation] = useState('');

  // Photos
  const [photos, setPhotos] = useState<string[]>([]);
  
  // Signature
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');
  const [showSignModal, setShowSignModal] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick problem tags for on-site rapid reporting
  const quickTags = [
    'มอเตอร์ไหม้/ร้อนจัด',
    'มีเสียงดังผิดปกติ',
    'น้ำมันไฮดรอลิกรั่วซึม',
    'ท่อลมรั่ว/ความดันตก',
    'สายพานขับเคลื่อนขาด',
    'ระบบไฟฟ้าทริป/ดับ',
    'ใบมีดตัดไม่คม/ทื่อ',
    'กระดาษติด/เซ็นเซอร์ไม่จับ',
    'ระบบหล่อเย็นไม่ทำงาน'
  ];

  // Machine Tag OCR Scanning state
  const [isScanningTag, setIsScanningTag] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [tagSearch, setTagSearch] = useState('');
  const tagCameraInputRef = React.useRef<HTMLInputElement>(null);

  const handleTagPhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningTag(true);
    setScanMessage('กำลังอ่านรูปภาพและตรวจจับหมายเลขเครื่องจักร...');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (!base64) {
        setIsScanningTag(false);
        return;
      }

      // Also add to ticket photos so technician can see the machine tag photo
      setPhotos((prev) => [...prev, base64]);

      try {
        const apiRes = await safeApiCall<{
          success: boolean;
          matchedMachine?: MachineAsset;
          aiResult?: { detectedText?: string };
        }>('/api/ai/scan-machine-tag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64 })
        });

        const data = apiRes.data;
        if (apiRes.ok && data?.success && data.matchedMachine) {
          handleSelectMachineAsset(data.matchedMachine);
          setScanMessage(`✓ ตรวจพบเครื่อง: ${data.matchedMachine.tagCode || ''} - ${data.matchedMachine.name} (${data.matchedMachine.code})`);
        } else if (data?.aiResult?.detectedText) {
          const detected = String(data.aiResult.detectedText).toLowerCase();
          const localMatch = machines.find((m) => 
            (m.tagCode && detected.includes(m.tagCode.toLowerCase())) ||
            detected.includes(m.code.toLowerCase()) ||
            detected.includes(m.name.toLowerCase()) ||
            (m.model && detected.includes(m.model.toLowerCase()))
          );
          if (localMatch) {
            handleSelectMachineAsset(localMatch);
            setScanMessage(`✓ ตรวจพบเครื่อง: ${localMatch.tagCode} - ${localMatch.name} (${localMatch.code})`);
          } else {
            setScanMessage(`อ่านข้อความได้: "${data.aiResult.detectedText}" กรุณายืนยันเครื่องในช่อง Drop Down`);
          }
        } else {
          setScanMessage('แนบรูปป้ายเครื่องเรียบร้อย กรุณาเลือกเครื่องจักรจาก Drop Down ด้านล่าง');
        }
      } catch (err) {
        setScanMessage('แนบรูปป้ายเครื่องเรียบร้อย กรุณาเลือกเครื่องจักรจาก Drop Down ด้านล่าง');
      } finally {
        setIsScanningTag(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectMachineAsset = (mach: MachineAsset) => {
    setMachineNo(mach.code);
    setCategory(mach.category === 'office' ? 'office' : mach.category === 'infrastructure' ? 'infrastructure' : 'machine');
    setLocation(mach.location ? `${mach.location} (${mach.name})` : 'บางแสน BS');
    if (mach.department) setDepartment(mach.department);
  };

  const handleSaveInlineMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMachCode.trim() || !newMachName.trim()) return;

    if (onCreateMachine) {
      const res = await onCreateMachine({
        code: newMachCode.trim().toUpperCase(),
        name: newMachName.trim(),
        category: 'machine',
        machineType: newMachType as any,
        machineTypeLabel: newMachName.trim(),
        location: newMachLocation.trim() || 'บางแสน BS',
        department: 'ฝ่ายผลิต',
        status: 'active'
      });

      if (res.success && res.machine) {
        handleSelectMachineAsset(res.machine);
        setShowInlineNewMachine(false);
        setNewMachCode('');
        setNewMachName('');
        setNewMachLocation('');
      }
    }
  };

  const pcPhotoInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingPhotos, setIsDraggingPhotos] = useState(false);

  const addFilesAsPhotos = (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotos((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFilesAsPhotos(e.target.files);
      e.target.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddQuickTag = (tag: string) => {
    if (!problemDescription) {
      setProblemDescription(tag);
    } else if (!problemDescription.includes(tag)) {
      setProblemDescription((prev) => `${prev}, ${tag}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requesterName.trim()) {
      setErrorMessage('กรุณาระบุชื่อผู้แจ้งปัญหา');
      return;
    }
    if (!machineNo.trim()) {
      setErrorMessage('กรุณาระบุหมายเลขเครื่องจักรหรือทรัพย์สิน');
      return;
    }
    if (!problemDescription.trim()) {
      setErrorMessage('กรุณาระบุรายละเอียดของปัญหา');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await onSubmit({
      requesterName,
      department,
      category,
      machineNo,
      location,
      urgency,
      problemDescription,
      requestDate,
      requestTime,
      photos,
      requesterSignature: signatureDataUrl
    } as any);

    setIsSubmitting(false);

    if (result.success && result.ticket) {
      onSuccess(result.ticket);
    } else {
      setErrorMessage(result.message || 'เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่อีกครั้ง');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-24">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 text-white rounded-2xl p-5 shadow-lg mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-blue-500/30 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded text-[11px] font-mono">
                FM-MN01-03 Rev.00
              </span>
              <span className="text-xs text-slate-300">KOCH Smart Maintenance</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">ใบแจ้งซ่อมด่วนผ่านมือถือ</h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              แจ้งปัญหาหน้างานทันที ช่างรับทราบและเริ่มงานได้แบบเรียลไทม์
            </p>
          </div>
          <div className="hidden sm:block text-right">
            <div className="text-xs text-slate-400">ระบบซิงก์สด</div>
            <div className="text-emerald-400 font-semibold text-sm flex items-center gap-1 justify-end">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              พร้อมใช้งาน
            </div>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 bg-white p-5 sm:p-7 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Row 1: วันที่ & เวลา & ผู้แจ้ง */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              วันที่แจ้ง
            </label>
            <input
              type="date"
              value={requestDate}
              onChange={(e) => setRequestDate(e.target.value)}
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              เวลาแจ้ง
            </label>
            <input
              type="time"
              value={requestTime}
              onChange={(e) => setRequestTime(e.target.value)}
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800"
              required
            />
          </div>
        </div>

        {/* Row 2: ชื่อผู้แจ้ง & แผนก */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>ชื่อผู้แจ้งปัญหา *</span>
            </label>
            <input
              type="text"
              placeholder="เช่น นายสมเกียรติ มั่นคง"
              value={requesterName}
              onChange={(e) => setRequesterName(e.target.value)}
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder:text-slate-400"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              แผนก *
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800"
            >
              <option value="ฝ่ายผลิต">ฝ่ายผลิต (Production)</option>
              <option value="คลังสินค้าและโลจิสติกส์">คลังสินค้าและโลจิสติกส์ (Warehouse)</option>
              <option value="แผนกบรรจุภัณฑ์">แผนกบรรจุภัณฑ์ (Packaging)</option>
              <option value="ควบคุมคุณภาพ (QC)">ควบคุมคุณภาพ (QC)</option>
              <option value="ซ่อมบำรุง">ซ่อมบำรุง (Maintenance)</option>
              <option value="ฝ่ายบริหารอาคารและสถานที่">ฝ่ายบริหารอาคารและสถานที่ (Facility)</option>
              <option value="วิศวกรรมความปลอดภัย">วิศวกรรมความปลอดภัย (Safety)</option>
            </select>
          </div>
        </div>

        {/* Category Choice: เครื่องจักร VS โครงสร้างพื้นฐาน (Based on form) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            หมวดหมู่งานซ่อม (ตามใบแจ้งซ่อม KOCH) *
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setCategory('machine')}
              className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2.5 font-medium text-xs sm:text-sm transition ${
                category === 'machine'
                  ? 'border-blue-600 bg-blue-50 text-blue-800 font-semibold shadow-xs'
                  : 'border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Cog className={`w-4 h-4 ${category === 'machine' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>เครื่องจักร (Machine)</span>
            </button>

            <button
              type="button"
              onClick={() => setCategory('infrastructure')}
              className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2.5 font-medium text-xs sm:text-sm transition ${
                category === 'infrastructure'
                  ? 'border-blue-600 bg-blue-50 text-blue-800 font-semibold shadow-xs'
                  : 'border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Building2 className={`w-4 h-4 ${category === 'infrastructure' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>โครงสร้างพื้นฐาน</span>
            </button>
          </div>
        </div>

        {/* Machine / Asset ID & Location */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Cog className="w-4 h-4 text-blue-600" />
              <span>เลือกเครื่องจักร / หมายเลขทรัพย์สิน *</span>
            </label>
            <button
              type="button"
              onClick={() => setShowInlineNewMachine(true)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>สร้างเครื่องจักรเพิ่ม</span>
            </button>
          </div>

          {/* Machine Selection: Camera OCR Scan OR Dropdown (User Request) */}
          {machines.length > 0 && (
            <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  วิธีการเลือกเครื่องจักร (ถ่ายรูป หรือ เลือกแบบ Drop Down):
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  ทั้งหมด {machines.length} เครื่อง
                </span>
              </div>

              {/* Action 1: Take Photo / Scan Tag */}
              <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-2xs space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        วิธีที่ 1: ถ่ายรูปหมายเลขเครื่อง / สแกนป้าย Tag
                      </div>
                      <div className="text-[11px] text-slate-500">
                        ถ่ายภาพป้ายชื่อเครื่อง, สติ๊กเกอร์ BS หรือบาร์โค้ดหน้างาน
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center justify-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-xs transition">
                      {isScanningTag ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>กำลังสแกนรูป...</span>
                        </>
                      ) : (
                        <>
                          <Scan className="w-4 h-4" />
                          <span>📷 ถ่ายรูปป้ายเครื่อง</span>
                        </>
                      )}
                      <input
                        ref={tagCameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleTagPhotoCapture}
                        disabled={isScanningTag}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Scan message banner */}
                {scanMessage && (
                  <div className={`text-xs p-2 rounded-lg flex items-center gap-1.5 ${
                    scanMessage.startsWith('✓') 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold' 
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    {scanMessage.startsWith('✓') ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin shrink-0" />
                    )}
                    <span>{scanMessage}</span>
                  </div>
                )}
              </div>

              {/* Action 2: Categorized Drop Down */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>วิธีที่ 2: หรือเลือกแบบ Drop Down</span>
                    <span className="text-[10px] text-slate-400 font-normal">(จัดหมวดหมู่แล้ว)</span>
                  </div>
                </div>

                {/* Search input to filter dropdown quickly */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="พิมพ์ค้นหาชื่อเครื่อง, รหัส หรือรุ่น (เช่น BS-01, Slot, Cutting, Amena)..."
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Drop Down Select */}
                <select
                  value={machineNo}
                  onChange={(e) => {
                    const found = machines.find((m) => m.code === e.target.value);
                    if (found) handleSelectMachineAsset(found);
                    else setMachineNo(e.target.value);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                >
                  <option value="">-- แตะเลือกเครื่องจักร / เครื่อง Office ({machines.length} เครื่อง) --</option>
                  
                  {/* Group 1: Production Machines */}
                  <optgroup label="🏭 เครื่องจักรไลน์ผลิต (โรงงานบางแสน BS)">
                    {machines
                      .filter((m) => m.category === 'machine')
                      .filter((m) => !tagSearch || 
                        (m.tagCode && m.tagCode.toLowerCase().includes(tagSearch.toLowerCase())) ||
                        m.code.toLowerCase().includes(tagSearch.toLowerCase()) ||
                        m.name.toLowerCase().includes(tagSearch.toLowerCase())
                      )
                      .map((mach, idx) => {
                        const noStr = String(mach.no || idx + 1).padStart(2, '0');
                        const tag = mach.tagCode || `BS-${noStr}`;
                        return (
                          <option key={mach.id} value={mach.code}>
                            #{noStr} | {tag} - {mach.name} ({mach.code})
                          </option>
                        );
                      })}
                  </optgroup>

                  {/* Group 2: Office Equipment */}
                  <optgroup label="🏢 เครื่องใน Office / แอร์ปรับอากาศ (FCU & CDU)">
                    {machines
                      .filter((m) => m.category === 'office')
                      .filter((m) => !tagSearch || 
                        (m.tagCode && m.tagCode.toLowerCase().includes(tagSearch.toLowerCase())) ||
                        m.code.toLowerCase().includes(tagSearch.toLowerCase()) ||
                        m.name.toLowerCase().includes(tagSearch.toLowerCase()) ||
                        (m.model && m.model.toLowerCase().includes(tagSearch.toLowerCase()))
                      )
                      .map((mach, idx) => {
                        const noStr = String(mach.no || idx + 1).padStart(2, '0');
                        const tag = mach.tagCode || `BS-${noStr}`;
                        return (
                          <option key={mach.id} value={mach.code}>
                            #{noStr} | {tag} - {mach.name} ({mach.code}) [{mach.model || 'Air'}]
                          </option>
                        );
                      })}
                  </optgroup>

                  {/* Group 3: Utility / Infrastructure */}
                  <optgroup label="⚡ สาธารณูปโภค / ปั๊มลม / บำบัดน้ำ">
                    {machines
                      .filter((m) => m.category === 'infrastructure' || m.category === 'utility')
                      .filter((m) => !tagSearch || 
                        (m.tagCode && m.tagCode.toLowerCase().includes(tagSearch.toLowerCase())) ||
                        m.code.toLowerCase().includes(tagSearch.toLowerCase()) ||
                        m.name.toLowerCase().includes(tagSearch.toLowerCase())
                      )
                      .map((mach, idx) => {
                        const noStr = String(mach.no || idx + 1).padStart(2, '0');
                        const tag = mach.tagCode || `BS-${noStr}`;
                        return (
                          <option key={mach.id} value={mach.code}>
                            #{noStr} | {tag} - {mach.name} ({mach.code})
                          </option>
                        );
                      })}
                  </optgroup>
                </select>
              </div>

              {/* Selected Machine Summary Info Card */}
              {machineNo && (
                <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-slate-600">เครื่องที่เลือก:</span>
                    <strong className="text-blue-900 font-mono font-bold">{machineNo}</strong>
                    {machines.find((m) => m.code === machineNo)?.name && (
                      <span className="text-slate-700">({machines.find((m) => m.code === machineNo)?.name})</span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    พร้อมแจ้งซ่อม
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                หมายเลขเครื่องจักรที่เลือก (Machine Code) *
              </label>
              <input
                type="text"
                placeholder="เช่น MA2312001, MA2312009"
                value={machineNo}
                onChange={(e) => setMachineNo(e.target.value)}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder:text-slate-400 font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>สถานที่ใช้งาน / ไลน์ผลิต *</span>
              </label>
              <input
                type="text"
                placeholder="เช่น แผนกตัด ไลน์ 1"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder:text-slate-400"
                required
              />
            </div>
          </div>
        </div>

        {/* ระดับความเร่งด่วน */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-rose-500" />
            <span>ระดับความเร่งด่วน *</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'emergency', label: '🚨 ฉุกเฉิน-หยุดไลน์', desc: 'หยุดสายการผลิตทันที', color: 'border-rose-500 bg-rose-50 text-rose-800' },
              { id: 'high', label: '⚠️ ด่วนมาก', desc: 'เสี่ยงกระทบงาน', color: 'border-orange-500 bg-orange-50 text-orange-800' },
              { id: 'normal', label: '🟡 ปานกลาง', desc: 'ทำงานได้บางส่วน', color: 'border-blue-500 bg-blue-50 text-blue-800' },
              { id: 'low', label: '🟢 ตามรอบ', desc: 'บำรุงรักษาตามรอบ', color: 'border-slate-500 bg-slate-50 text-slate-800' }
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setUrgency(item.id as UrgencyLevel)}
                className={`p-2.5 rounded-xl border text-left transition ${
                  urgency === item.id
                    ? `${item.color} font-semibold ring-2 ring-blue-500/30`
                    : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs font-bold">{item.label}</div>
                <div className="text-[10px] opacity-75 mt-0.5">{item.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* รายละเอียดของปัญหา */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>รายละเอียดของปัญหา (ระบุให้ชัดเจน) *</span>
            </span>
            <span className="text-[11px] text-slate-400 font-normal">ตามฟอร์ม KOCH</span>
          </label>
          <textarea
            rows={3}
            placeholder="อธิบายอาการเสีย สิ่งผิดปกติที่สังเกตได้ กลิ่น เสียง หรือรหัส Error บนหน้าจอควบคุม..."
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
            className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder:text-slate-400"
            required
          />

          {/* Quick Problem Tag Buttons */}
          <div className="mt-2">
            <div className="text-[11px] text-slate-500 mb-1 font-medium">กดแท็กด่วนเพื่อช่วยพิมพ์:</div>
            <div className="flex flex-wrap gap-1.5">
              {quickTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleAddQuickTag(tag)}
                  className="text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 transition"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* แนบรูปถ่ายหน้างาน (Photo Attachment with Direct PC Upload) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-blue-600" />
              <span>แนบภาพถ่ายหน้างาน (เลือกจากคอมพิวเตอร์ หรือถ่ายรูป)</span>
            </span>
            <span className="text-[11px] font-mono text-blue-600 font-semibold">{photos.length} รูป</span>
          </label>

          {/* Hidden inputs: 1 for standard PC file browser, 1 for mobile camera capture */}
          <input
            type="file"
            ref={pcPhotoInputRef}
            accept="image/*"
            multiple
            onChange={handlePhotoUpload}
            className="hidden"
          />

          {/* Drag & Drop Zone for PC files */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingPhotos(true);
            }}
            onDragLeave={() => setIsDraggingPhotos(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingPhotos(false);
              if (e.dataTransfer.files) {
                addFilesAsPhotos(e.dataTransfer.files);
              }
            }}
            className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center transition ${
              isDraggingPhotos
                ? 'border-blue-500 bg-blue-50/80 scale-[0.99]'
                : 'border-slate-300 hover:border-blue-400 bg-slate-50/70'
            }`}
          >
            {/* Buttons Row */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 mb-2">
              <button
                type="button"
                onClick={() => pcPhotoInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>📁 เลือกรูปจากคอมพิวเตอร์ (Browse File)</span>
              </button>

              <label className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-medium text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs">
                <Camera className="w-4 h-4 text-slate-600" />
                <span>ถ่ายรูปหน้างาน (มือถือ)</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            <p className="text-xs text-slate-500">
              หรือลากไฟล์ภาพจากคอมพิวเตอร์มาวางในกรอบนี้ได้เลย (PNG, JPG, JPEG, WEBP)
            </p>
          </div>

          {/* Photo Thumbnails Grid */}
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2.5 mt-3 p-2.5 bg-slate-100/70 rounded-xl border border-slate-200">
              {photos.map((photo, index) => (
                <div key={index} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shadow-xs group bg-white">
                  <img src={photo} alt={`รูปถ่ายหน้างาน ${index + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition" />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 bg-black/70 hover:bg-rose-600 text-white rounded-full p-1 transition shadow-xs"
                    title="ลบรูปภาพนี้"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[9px] text-center font-mono py-0.5">
                    #{index + 1}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Digital Signature ผู้แจ้ง */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <PenTool className="w-3.5 h-3.5 text-blue-600" />
              <span>ลายเซ็นผู้แจ้ง (ช่อง "ผู้แจ้ง" ตามแบบฟอร์ม)</span>
            </label>
            <button
              type="button"
              onClick={() => setShowSignModal(true)}
              className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1"
            >
              {signatureDataUrl ? 'เซ็นใหม่' : '+ เซ็นชื่อดิจิทัล'}
            </button>
          </div>

          {signatureDataUrl ? (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={signatureDataUrl} alt="Signature" className="h-10 border border-slate-200 bg-white rounded px-2" />
                <div>
                  <div className="text-xs font-semibold text-slate-800">{requesterName || 'ผู้แจ้ง'}</div>
                  <div className="text-[10px] text-slate-500">ลงชื่อเมื่อ {requestDate} {requestTime} น.</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSignatureDataUrl('')}
                className="text-xs text-slate-400 hover:text-rose-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => setShowSignModal(true)}
              className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500 cursor-pointer hover:bg-slate-100 transition"
            >
              คลิกตรงนี้เพื่อเซ็นชื่อด้วยนิ้วมือบนหน้าจอ (หรือเว้นไว้ใช้การยืนยันอัตโนมัติ)
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm sm:text-base disabled:opacity-60"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                กำลังส่งข้อมูลหน้างาน...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                ส่งใบแจ้งซ่อมทันที (Broadcast Real-time)
              </span>
            )}
          </button>
          <p className="text-center text-[11px] text-slate-400 mt-2">
            ข้อมูลจะถูกส่งเข้าหน้าจอมอนิเตอร์และมือถือของทีมซ่อมบำรุงทันทีโดยไม่ต้องรีเฟรชหน้าเว็บ
          </p>
        </div>
      </form>

      {/* Signature Modal */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <SignaturePad
            title="ลงลายมือชื่อผู้แจ้งซ่อม"
            signeeName={requesterName || 'ผู้แจ้งซ่อม'}
            onSave={(dataUrl) => {
              setSignatureDataUrl(dataUrl);
              setShowSignModal(false);
            }}
            onCancel={() => setShowSignModal(false)}
          />
        </div>
      )}

      {/* Inline Create Machine Modal */}
      {showInlineNewMachine && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <Cog className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">สร้างเครื่องจักรเพิ่มทันที</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowInlineNewMachine(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveInlineMachine} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  รหัสเครื่องจักร (เช่น CUT-03, DC-SM-03, FLX-02) *
                </label>
                <input
                  type="text"
                  placeholder="เช่น CUT-03"
                  value={newMachCode}
                  onChange={(e) => setNewMachCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono uppercase font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  ชื่อเครื่องจักร *
                </label>
                <input
                  type="text"
                  placeholder="เช่น เครื่องตัด 3, เครื่องพิมพ์ 3"
                  value={newMachName}
                  onChange={(e) => setNewMachName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  ประเภทเครื่องจักร
                </label>
                <select
                  value={newMachType}
                  onChange={(e) => setNewMachType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                >
                  <option value="cutting">เครื่องตัด (Cutting)</option>
                  <option value="printing">เครื่องพิมพ์ (Printing)</option>
                  <option value="diecut_small">เครื่องไดคัทเล็ก (Diecut เล็ก)</option>
                  <option value="diecut_large">เครื่องไดคัทใหญ่ (Diecut ใหญ่)</option>
                  <option value="flexo">เครื่องพิมพ์เฟล็กโซ่ (Flexo)</option>
                  <option value="stitch_auto">เครื่องเย็บออโต้ (Auto Stitching)</option>
                  <option value="stitch_manual">เครื่องเย็บเมนนวล (Manual Stitching)</option>
                  <option value="other">อื่นๆ</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  สถานที่ติดตั้ง / ไลน์ผลิต
                </label>
                <input
                  type="text"
                  placeholder="เช่น โรงงานบางแสน BS (แผนกตัด)"
                  value={newMachLocation}
                  onChange={(e) => setNewMachLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInlineNewMachine(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> บันทึกและเลือกเครื่องนี้
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
