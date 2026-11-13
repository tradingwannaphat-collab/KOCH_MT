import React, { useState } from 'react';
import { 
  X, 
  Wrench, 
  Clock, 
  User, 
  MapPin, 
  FileText, 
  Send, 
  CheckCircle, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  PenTool, 
  Printer, 
  History, 
  Camera,
  Layers,
  ArrowRight,
  Upload,
  FileUp
} from 'lucide-react';
import { MaintenanceTicket, TicketStatus, RootCauseType, SparePartItem } from '../types/ticket';
import { initialSpareParts } from '../data/initialSpareParts';
import { getStatusText, getStatusColor, getUrgencyInfo, getRootCauseText } from '../hooks/useRealtimeTickets';
import { SignaturePad } from './SignaturePad';
import { compressImageFile } from '../utils/imageCompressor';

interface TicketDetailModalProps {
  ticket: MaintenanceTicket;
  onClose: () => void;
  onUpdateTicket: (ticketId: string, updates: Partial<MaintenanceTicket>) => Promise<any>;
  onAddProgress: (ticketId: string, payload: any) => Promise<any>;
  onDeleteProgress?: (ticketId: string, logId: string) => Promise<any>;
  onPrintTicket: (ticket: MaintenanceTicket) => void;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticket,
  onClose,
  onUpdateTicket,
  onAddProgress,
  onDeleteProgress,
  onPrintTicket
}) => {
  const [activeTab, setActiveTab] = useState<'progress' | 'repair_form' | 'signatures'>('progress');

  // "สำหรับฉันเท่านั้น" mode toggle & delete states
  const [isAdminDeleteMode, setIsAdminDeleteMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('koch_admin_delete_mode') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const handleDeleteLog = async (logId: string) => {
    try {
      setIsDeletingId(logId);
      if (onDeleteProgress) {
        await onDeleteProgress(ticket.id, logId);
      } else {
        const remaining = (ticket.progressLogs || []).filter((l) => l.id !== logId);
        await onUpdateTicket(ticket.id, { progressLogs: remaining });
      }
      setConfirmDeleteId(null);
    } catch (e) {
      console.error('Failed to delete log:', e);
    } finally {
      setIsDeletingId(null);
    }
  };

  // Quick progress update form state
  const [logAction, setLogAction] = useState('');
  const [logNotes, setLogNotes] = useState('');
  const [logAuthor, setLogAuthor] = useState('นายประสิทธิ์ วิศวกร');
  const [logRole, setLogRole] = useState('ช่างผู้ปฏิบัติงาน');
  const [logStatus, setLogStatus] = useState<TicketStatus>(ticket.status);
  const [logPhoto, setLogPhoto] = useState<string>('');
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);

  // Technical Repair Form state (mapping to KOCH form)
  const [rootCause, setRootCause] = useState<RootCauseType>(ticket.rootCause || 'lack_of_maintenance');
  const [rootCauseOtherText, setRootCauseOtherText] = useState(ticket.rootCauseOtherText || '');
  const [rootCauseDetail, setRootCauseDetail] = useState(ticket.rootCauseDetail || '');
  const [troubleshootingSteps, setTroubleshootingSteps] = useState(ticket.troubleshootingSteps || '');
  const [correctiveSteps, setCorrectiveSteps] = useState(ticket.correctiveSteps || ticket.repairDetails || '');
  const [repairDetails, setRepairDetails] = useState(ticket.repairDetails || '');
  const [testRunResult, setTestRunResult] = useState(ticket.testRunResult || 'เดินเครื่องทดสอบ Trial Run 30 นาที ผลปกติ อุณหภูมิและเสียงผ่านเกณฑ์');
  const [startDate, setStartDate] = useState(ticket.startDate || '');
  const [startTime, setStartTime] = useState(ticket.startTime || '');
  const [endDate, setEndDate] = useState(ticket.endDate || '');
  const [endTime, setEndTime] = useState(ticket.endTime || '');
  const [durationText, setDurationText] = useState(ticket.durationText || '');
  const [tech1, setTech1] = useState(ticket.technicians[0] || 'นายประสิทธิ์ วิศวกร (ช่างเครื่องจักร)');
  const [tech2, setTech2] = useState(ticket.technicians[1] || 'นายสุรชัย มั่นคง (ช่างไฟฟ้า)');
  const [tech3, setTech3] = useState(ticket.technicians[2] || '');
  const [spareParts, setSpareParts] = useState<SparePartItem[]>(ticket.spareParts || []);
  const [isSavingForm, setIsSavingForm] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // New spare part row
  const [newPartName, setNewPartName] = useState('');
  const [newPartNo, setNewPartNo] = useState('');
  const [newPartQty, setNewPartQty] = useState(1);
  const [newPartUnit, setNewPartUnit] = useState('ชิ้น');

  // Signature Pad modal
  const [signingRole, setSigningRole] = useState<'requester' | 'technician' | 'supervisor' | null>(null);

  const urgency = getUrgencyInfo(ticket.urgency);
  const statusColor = getStatusColor(ticket.status);

  // Quick progress text chips
  const quickActions = [
    'เข้าตรวจสอบหน้างานเรียบร้อย',
    'กำลังถอดรื้อและตรวจเช็กชิ้นส่วน',
    'พบสาเหตุความเสียหายแล้ว',
    'กำลังเบิกอะไหล่จากสโตร์',
    'กำลังประกอบและปรับตั้งระยะ',
    'ทดสอบเดินเครื่อง 30 นาที ผลปกติ',
    'ส่งมอบงานให้ผู้แจ้งตรวจสอบ'
  ];

  const handleAddProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logAction.trim()) return;

    setIsSubmittingLog(true);
    await onAddProgress(ticket.id, {
      author: logAuthor,
      role: logRole,
      action: logAction,
      notes: logNotes,
      statusChange: logStatus,
      photoUrl: logPhoto || undefined
    });

    setIsSubmittingLog(false);
    setLogAction('');
    setLogNotes('');
    setLogPhoto('');
  };

  const handleQuickStatusChange = async (newStatus: TicketStatus) => {
    setLogStatus(newStatus);
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (newStatus === 'completed' || newStatus === 'closed') {
      await onUpdateTicket(ticket.id, {
        status: newStatus,
        endDate: ticket.endDate || currentDate,
        endTime: ticket.endTime || currentTime,
        testRunResult: ticket.testRunResult || 'ทดสอบเดินเครื่อง 1-2 นาทีปกติ พร้อมส่งมอบฝ่ายผลิต'
      });
      await onAddProgress(ticket.id, {
        author: logAuthor || 'ช่างซ่อมบำรุง',
        role: logRole || 'ทีมซ่อมบำรุง',
        action: 'ปิด Job ซ่อมเสร็จสมบูรณ์ (Closed/Completed)',
        notes: 'สถานะฉุกเฉิน กำลังซ่อม และรออะไหล่ ถูกเคลียร์เรียบร้อย ส่งมอบเครื่องจักรพร้อมใช้งานให้ฝ่ายผลิต',
        statusChange: newStatus
      });
    } else {
      await onAddProgress(ticket.id, {
        author: logAuthor,
        role: logRole,
        action: `เปลี่ยนสถานะเป็น [${getStatusText(newStatus)}]`,
        statusChange: newStatus
      });
    }
  };

  const handleAddPart = () => {
    if (!newPartName.trim()) return;
    const item: SparePartItem = {
      id: `part-${Date.now()}`,
      name: newPartName,
      partNo: newPartNo,
      quantity: Number(newPartQty) || 1,
      unit: newPartUnit || 'ชิ้น'
    };
    setSpareParts([...spareParts, item]);
    setNewPartName('');
    setNewPartNo('');
    setNewPartQty(1);
  };

  const handleRemovePart = (id: string) => {
    setSpareParts(spareParts.filter((p) => p.id !== id));
  };

  const handleSaveRepairForm = async () => {
    setIsSavingForm(true);
    setSaveSuccessMessage(null);
    await onUpdateTicket(ticket.id, {
      rootCause,
      rootCauseOtherText,
      rootCauseDetail,
      repairDetails: correctiveSteps || repairDetails,
      troubleshootingSteps,
      correctiveSteps,
      testRunResult,
      startDate,
      startTime,
      endDate,
      endTime,
      durationText,
      technicians: [tech1, tech2, tech3],
      spareParts
    });

    // Also post an automated update log
    await onAddProgress(ticket.id, {
      author: tech1 || logAuthor,
      role: 'ทีมซ่อมบำรุง',
      action: 'บันทึกขั้นตอนการแก้ไขและข้อมูลการซ่อมแซมเรียบร้อย',
      notes: correctiveSteps ? `ขั้นตอนการแก้ไข: ${correctiveSteps.slice(0, 80)}...` : undefined
    });

    setIsSavingForm(false);
    setSaveSuccessMessage('บันทึกขั้นตอนการแก้ไขและข้อมูลการซ่อมเรียบร้อยแล้ว');
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  const handleSaveSignature = async (dataUrl: string) => {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (signingRole === 'requester') {
      await onUpdateTicket(ticket.id, {
        requesterApproval: {
          name: ticket.requesterName,
          date: currentDate,
          time: currentTime,
          isSigned: true,
          signatureDataUrl: dataUrl
        }
      });
    } else if (signingRole === 'technician') {
      await onUpdateTicket(ticket.id, {
        technicianApproval: {
          name: tech1 || 'ผู้ซ่อม',
          date: currentDate,
          time: currentTime,
          isSigned: true,
          signatureDataUrl: dataUrl
        }
      });
    } else if (signingRole === 'supervisor') {
      await onUpdateTicket(ticket.id, {
        supervisorApproval: {
          name: 'สมศักดิ์ ผู้จัดการซ่อมบำรุง',
          date: currentDate,
          time: currentTime,
          isSigned: true,
          signatureDataUrl: dataUrl
        },
        status: 'closed'
      });
      // also log progress
      await onAddProgress(ticket.id, {
        author: 'สมศักดิ์ ผู้จัดการซ่อมบำรุง',
        role: 'หัวหน้าแผนกซ่อมบำรุง',
        action: 'อนุมัติปิดงานซ่อมบำรุงเรียบร้อย (Closed)',
        statusChange: 'closed'
      });
    }
    setSigningRole(null);
  };

  const handleLogPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 1024, 0.72);
      if (compressed) setLogPhoto(compressed);
    } catch (err) {
      console.warn('Failed compressing log photo:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Top Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl mt-0.5 shadow-xs">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold bg-slate-800 text-blue-300 px-2.5 py-0.5 rounded border border-slate-700">
                  {ticket.ticketNo}
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>
                  {getStatusText(ticket.status)}
                </span>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${urgency.color}`}>
                  {urgency.label}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                {ticket.machineNo}
                <span className="text-xs font-normal text-slate-300">
                  ({ticket.category === 'machine' ? 'เครื่องจักร' : 'โครงสร้างพื้นฐาน'})
                </span>
              </h2>
              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>{ticket.location}</span>
                <span>•</span>
                <span>ผู้แจ้ง: {ticket.requesterName} ({ticket.department})</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onPrintTicket(ticket)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="เปิดหน้าพิมพ์ / บันทึกเป็น PDF แบบฟอร์ม FM-MN01-03"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">บันทึก PDF / พิมพ์ (FM-MN01-03)</span>
              <span className="sm:hidden">PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2">
          <button
            onClick={() => setActiveTab('progress')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'progress'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>⚡ การอัพเดทของทางซ่อมบำรุง ({ticket.progressLogs?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('repair_form')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'repair_form'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>🔧 ขั้นตอนการแก้ไข & บันทึกช่าง</span>
          </button>

          <button
            onClick={() => setActiveTab('signatures')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'signatures'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>✍️ ลายเซ็นปิดงาน 3 ฝ่าย</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">

          {/* Quick Problem Summary Box */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>อาการเสีย / รายละเอียดปัญหาที่แจ้ง:</span>
              <span className="text-[11px] text-slate-500 font-normal">
                แจ้งเมื่อ {ticket.requestDate} {ticket.requestTime} น.
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {ticket.problemDescription}
            </p>
            {ticket.photos && ticket.photos.length > 0 && (
              <div className="flex gap-2 mt-2.5 overflow-x-auto pb-1">
                {ticket.photos.map((photo, i) => (
                  <a key={i} href={photo} target="_blank" rel="noopener noreferrer">
                    <img
                      src={photo}
                      alt="รูปปัญหา"
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-slate-200 hover:opacity-90"
                    />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* TAB 1: REAL-TIME PROGRESS TIMELINE & ON-SITE QUICK UPDATE */}
          {activeTab === 'progress' && (
            <div className="space-y-5">
              
              {/* Quick Status Buttons for Field Techs */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  เปลี่ยนสถานะงานทันที (One-Tap Status):
                </label>

                {['completed', 'closed'].includes(ticket.status) && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-semibold mb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>ปิด Job เรียบร้อยแล้ว (สถานะฉุกเฉิน / กำลังซ่อม / รออะไหล่ เคลียร์เป็น 0 และนับรวมใน ซ่อมเสร็จ/ปิดงาน)</span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-700 font-bold shrink-0">
                      เสร็จเมื่อ: {ticket.endDate || ticket.requestDate} {ticket.endTime || ''} น.
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickStatusChange('acknowledged')}
                    className={`p-2 rounded-xl text-xs font-semibold border transition ${
                      ticket.status === 'acknowledged'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    1. รับเรื่องแล้ว
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickStatusChange('in_progress')}
                    className={`p-2 rounded-xl text-xs font-semibold border transition ${
                      ticket.status === 'in_progress'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    2. กำลังซ่อมแซม
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickStatusChange('waiting_parts')}
                    className={`p-2 rounded-xl text-xs font-semibold border transition ${
                      ticket.status === 'waiting_parts'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    3. รออะไหล่
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickStatusChange('completed')}
                    className={`p-2 rounded-xl text-xs font-semibold border transition ${
                      ['completed', 'closed'].includes(ticket.status)
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-400'
                        : 'bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-300 font-bold'
                    }`}
                  >
                    4. ปิด Job / ซ่อมเสร็จ
                  </button>
                </div>
              </div>

              {/* Real-time Progress Submission Form */}
              <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200/80">
                <h3 className="text-xs font-bold text-blue-900 mb-2.5 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-blue-600" />
                  <span>บันทึกความคืบหน้าหน้างาน (ถ่ายทอดสดแบบ Real-time)</span>
                </h3>

                <form onSubmit={handleAddProgress} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-600 font-medium mb-0.5">ชื่อผู้บันทึก</label>
                      <input
                        type="text"
                        value={logAuthor}
                        onChange={(e) => setLogAuthor(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 font-medium mb-0.5">บทบาท/ตำแหน่ง</label>
                      <input
                        type="text"
                        value={logRole}
                        onChange={(e) => setLogRole(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 font-medium mb-0.5">การปฏิบัติงาน / สิ่งที่กำลังทำ *</label>
                    <input
                      type="text"
                      placeholder="เช่น กำลังรื้อตรวจเช็กชุดมอเตอร์, ตรวจพบข้อต่อหัก..."
                      value={logAction}
                      onChange={(e) => setLogAction(e.target.value)}
                      className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-lg p-2.5"
                      required
                    />

                    {/* Quick chips */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {quickActions.map((act) => (
                        <button
                          key={act}
                          type="button"
                          onClick={() => setLogAction(act)}
                          className="text-[10px] bg-white hover:bg-blue-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200"
                        >
                          + {act}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 font-medium mb-0.5">ข้อความรายละเอียดเพิ่มเติม</label>
                    <textarea
                      rows={2}
                      placeholder="เช่น อุณหภูมิมอเตอร์ 70°C, รอลูกปืนเข้ามาตอนบ่ายสอง..."
                      value={logNotes}
                      onChange={(e) => setLogNotes(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2"
                    />
                  </div>

                  {/* Photo attachment for progress directly from PC */}
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50/80 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg cursor-pointer transition">
                      <Upload className="w-3.5 h-3.5 text-blue-600" />
                      <span>{logPhoto ? 'เปลี่ยนรูปจากคอมฯ' : '📁 เลือกรูปถ่ายจากคอมพิวเตอร์'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogPhotoUpload}
                        className="hidden"
                      />
                    </label>

                    <label className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition">
                      <Camera className="w-3.5 h-3.5 text-slate-600" />
                      <span>ถ่ายรูปมือถือ</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleLogPhotoUpload}
                        className="hidden"
                      />
                    </label>

                    {logPhoto && (
                      <div className="relative flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-slate-200">
                        <img src={logPhoto} alt="ความคืบหน้า" className="w-8 h-8 rounded object-cover border" />
                        <span className="text-[11px] text-slate-600 font-medium">แนบรูปเรียบร้อย</span>
                        <button
                          type="button"
                          onClick={() => setLogPhoto('')}
                          className="bg-rose-500 hover:bg-rose-600 text-white rounded-full p-0.5 ml-1 transition"
                          title="ลบรูปภาพ"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <div className="ml-auto">
                      <button
                        type="submit"
                        disabled={isSubmittingLog || !logAction.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>ส่งอัปเดตสด</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Progress Timeline List */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-800">
                      ไทม์ไลน์ความคืบหน้าทั้งหมด ({ticket.progressLogs?.length || 0})
                    </h4>
                    <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      อัปเดตอัตโนมัติ
                    </span>
                  </div>

                  {/* "สำหรับฉันเท่านั้น" mode toggle button */}
                  <button
                    type="button"
                    onClick={() => {
                      const next = !isAdminDeleteMode;
                      setIsAdminDeleteMode(next);
                      try {
                        localStorage.setItem('koch_admin_delete_mode', String(next));
                      } catch (e) {}
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                      isAdminDeleteMode
                        ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                    }`}
                    title="สลับโหมดจัดการลบรายการอัปเดตที่ซ้ำหรือผิดพลาด (เฉพาะสิทธิ์สำหรับฉันเท่านั้น)"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>{isAdminDeleteMode ? '✓ สิทธิ์ลบเปิดอยู่ (สำหรับฉันเท่านั้น)' : 'โหมดลบรายการ (สำหรับฉันเท่านั้น)'}</span>
                  </button>
                </div>

                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {ticket.progressLogs?.slice().reverse().map((log) => (
                    <div key={log.id} className="relative group">
                      {/* Node dot */}
                      <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-xs"></div>

                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition">
                        <div className="flex items-start justify-between gap-2 text-xs mb-1">
                          <span className="font-semibold text-slate-800">
                            {log.author} <span className="text-slate-400 font-normal">({log.role})</span>
                          </span>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {log.timestamp}
                            </span>

                            {/* Delete button (only when isAdminDeleteMode is true) */}
                            {isAdminDeleteMode && (
                              <div className="shrink-0">
                                {confirmDeleteId === log.id ? (
                                  <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 p-1 rounded-lg animate-in fade-in">
                                    <span className="text-[10px] text-rose-800 font-bold px-1">ยืนยันลบ?</span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteLog(log.id)}
                                      disabled={isDeletingId === log.id}
                                      className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold transition cursor-pointer shadow-2xs"
                                    >
                                      {isDeletingId === log.id ? 'กำลังลบ...' : 'ลบเลย'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-medium transition cursor-pointer"
                                    >
                                      ยกเลิก
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(log.id)}
                                    className="flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-0.5 rounded border border-rose-200/80 transition cursor-pointer"
                                    title="ลบรายการนี้ (สำหรับฉันเท่านั้น)"
                                  >
                                    <Trash2 className="w-3 h-3 text-rose-600" />
                                    <span>ลบ</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-xs sm:text-sm font-medium text-slate-800">
                          {log.action}
                        </div>

                        {log.notes && (
                          <div className="text-xs text-slate-600 mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                            {log.notes}
                          </div>
                        )}

                        {log.statusChange && (
                          <div className="mt-1.5">
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-medium">
                              สถานะ: {getStatusText(log.statusChange)}
                            </span>
                          </div>
                        )}

                        {log.photoUrl && (
                          <div className="mt-2">
                            <img
                              src={log.photoUrl}
                              alt="รูปแนบความคืบหน้า"
                              className="max-h-36 rounded-lg border border-slate-200 object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CORRECTIVE ACTION STEPS & REPAIR PROCEDURE (KOCH FM-MN01-03) */}
          {activeTab === 'repair_form' && (
            <div className="space-y-5">
              <div className="bg-blue-50/80 border border-blue-200 p-3.5 rounded-xl text-xs text-blue-900 flex items-center justify-between">
                <div>
                  <span className="font-bold">🔧 ขั้นตอนการแก้ไข และบันทึกของทางซ่อมบำรุง</span>
                  <div className="text-[11px] text-blue-700 mt-0.5">
                    บันทึกขั้นตอนการตรวจหาสาเหตุ วิธีการแก้ไข อะไหล่ที่เปลี่ยน และผลการทดสอบ Trial Run ตามแบบฟอร์ม FM-MN01-03
                  </div>
                </div>
                <span className="text-[10px] font-mono bg-blue-200/60 text-blue-900 font-bold px-2 py-0.5 rounded">
                  KOCH Maintenance
                </span>
              </div>

              {saveSuccessMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-semibold">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveSuccessMessage}</span>
                </div>
              )}

              {/* Step 1: Troubleshooting / Diagnosis (ขั้นตอนการตรวจหาสาเหตุ) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  ขั้นตอนที่ 1: การตรวจเช็คหาสาเหตุ (Inspection & Diagnosis):
                </label>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {[
                    'ตรวจวัดกระแสไฟฟ้าและโอเวอร์โหลดรีเลย์',
                    'ตรวจเช็คแรงดันลมและจุดรั่วซึม',
                    'ตรวจสอบการสึกหรอของสายพาน/โซ่',
                    'ตรวจเช็คตลับลูกปืนและเพลาขับ',
                    'ตรวจวัดแรงดันน้ำยาแอร์ R32/R410A'
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTroubleshootingSteps((prev) => prev ? `${prev}\n- ${preset}` : `- ${preset}`)}
                      className="text-[10px] bg-white hover:bg-blue-50 text-slate-700 px-2 py-0.5 rounded border border-slate-200"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={2}
                  value={troubleshootingSteps}
                  onChange={(e) => setTroubleshootingSteps(e.target.value)}
                  placeholder="บันทึกขั้นตอนการตรวจเช็คหน้างาน เช่น ตรวจสอบมอเตอร์พบความร้อนสะสมสูง, เช็กกระแสกินเกิน 15A..."
                  className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-xl p-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Step 2: Root Cause (สาเหตุความเสียหายตามฟอร์ม FM-MN01-03) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  ขั้นตอนที่ 2: ระบุสาเหตุความเสียหาย (Root Cause ตามแบบฟอร์ม KOCH):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'lack_of_maintenance', label: 'ขาดการบำรุงรักษา' },
                    { id: 'substandard_parts', label: 'อะไหล่ไม่มีคุณภาพ' },
                    { id: 'misuse', label: 'ใช้งานผิดประเภท' },
                    { id: 'other', label: 'อื่นๆ' }
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setRootCause(c.id as RootCauseType)}
                      className={`p-2.5 rounded-xl border text-xs font-medium transition text-left ${
                        rootCause === c.id
                          ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold ring-2 ring-blue-500/20'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      ✓ {c.label}
                    </button>
                  ))}
                </div>

                {rootCause === 'other' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      placeholder="ระบุสาเหตุอื่นๆ..."
                      value={rootCauseOtherText}
                      onChange={(e) => setRootCauseOtherText(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2"
                    />
                  </div>
                )}

                <div className="mt-2">
                  <label className="block text-[11px] text-slate-600 mb-1">คำอธิบายสาเหตุอย่างละเอียด:</label>
                  <textarea
                    rows={2}
                    value={rootCauseDetail}
                    onChange={(e) => setRootCauseDetail(e.target.value)}
                    placeholder="อธิบายว่าชิ้นส่วนใดเสียหาย เกิดจากสาเหตุใด..."
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              {/* Step 3: Corrective Actions (ขั้นตอนการแก้ไขที่ดำเนินการ) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  ขั้นตอนที่ 3: ขั้นตอนการแก้ไขที่ดำเนินการ (Corrective Action Procedure):
                </label>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {[
                    'ถอดเปลี่ยนตลับลูกปืนและอัดจาระบีทนความร้อน',
                    'ปรับตั้งความตึงสายพานและแนวศูนย์มู่เล่ย์',
                    'ล้างทำความสะอาดแผงคอยล์และฟิลเตอร์',
                    'เปลี่ยนซีลยางไฮดรอลิกและขันกวดข้อต่อกันรั่ว',
                    'ขันกวดขั้วต่อสายไฟและตรวจวัดค่าความต้านทาน'
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCorrectiveSteps((prev) => prev ? `${prev}\n- ${preset}` : `- ${preset}`)}
                      className="text-[10px] bg-white hover:bg-blue-50 text-slate-700 px-2 py-0.5 rounded border border-slate-200"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  value={correctiveSteps}
                  onChange={(e) => {
                    setCorrectiveSteps(e.target.value);
                    setRepairDetails(e.target.value);
                  }}
                  placeholder="เช่น 1. ถอดฝาครอบ safety guard 2. ถอดลูกปืนเดิมที่ชำรุด 3. ประกอบลูกปืนใหม่และอัดจาระบี 4. ปรับตั้งความตึงสายพานตามสเปก..."
                  className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-xl p-3 text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Step 4: Spare Parts (รายการอะไหล่ที่เปลี่ยน) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800">
                    ขั้นตอนที่ 4: รายการอะไหล่ที่ใช้ (Spare Parts Replaced):
                  </span>
                  <span className="text-[11px] text-slate-500">{spareParts.length} รายการ</span>
                </div>

                {spareParts.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {spareParts.map((part) => (
                      <div key={part.id} className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-slate-800">{part.name}</span>
                          {part.partNo && <span className="text-slate-400 ml-2 font-mono">[{part.partNo}]</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-600 font-medium">{part.quantity} {part.unit}</span>
                          <button
                            type="button"
                            onClick={() => handleRemovePart(part.id)}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick select from Spare Parts Master Catalog */}
                <div className="mb-2">
                  <select
                    onChange={(e) => {
                      const selected = initialSpareParts.find((p) => p.id === e.target.value);
                      if (selected) {
                        setNewPartName(selected.name);
                        setNewPartNo(selected.partNo);
                        setNewPartUnit(selected.unit);
                      }
                    }}
                    defaultValue=""
                    className="w-full text-xs bg-white border border-indigo-200 text-indigo-900 font-medium rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="" disabled>-- ⚡ เลือกด่วนจากคลังสแปร์พาร์ท ({initialSpareParts.length} รายการ) --</option>
                    {initialSpareParts.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        [{sp.partNo}] {sp.name} (คงเหลือ: {sp.stockQty} {sp.unit} @ {sp.location})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Add Part Form */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200">
                  <input
                    type="text"
                    placeholder="ชื่ออะไหล่"
                    value={newPartName}
                    onChange={(e) => setNewPartName(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-lg p-2"
                  />
                  <input
                    type="text"
                    placeholder="รหัส/เบอร์อะไหล่"
                    value={newPartNo}
                    onChange={(e) => setNewPartNo(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-lg p-2 font-mono"
                  />
                  <div className="flex gap-1">
                    <input
                      type="number"
                      min={1}
                      value={newPartQty}
                      onChange={(e) => setNewPartQty(Number(e.target.value))}
                      className="w-16 text-xs bg-white border border-slate-200 rounded-lg p-2 text-center"
                    />
                    <input
                      type="text"
                      placeholder="หน่วย"
                      value={newPartUnit}
                      onChange={(e) => setNewPartUnit(e.target.value)}
                      className="w-16 text-xs bg-white border border-slate-200 rounded-lg p-2 text-center"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPart}
                    className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> เพิ่มอะไหล่
                  </button>
                </div>
              </div>

              {/* Step 5: Trial Run & Quality Verification */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  ขั้นตอนที่ 5: ผลการทดสอบเดินเครื่อง (Trial Run Verification):
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setTestRunResult('เดินเครื่องทดสอบ Trial Run 30 นาที ผลปกติ อุณหภูมิและเสียงผ่านเกณฑ์มาตรฐาน')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      testRunResult.includes('ผ่านเกณฑ์') || testRunResult.includes('ปกติ')
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-bold'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    ✓ ผ่านเกณฑ์เดินเครื่องปกติ (Pass)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestRunResult('อยู่ระหว่างเฝ้าระวังอาการขณะเดินเครื่องผลิตรอบจริง')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      testRunResult.includes('เฝ้าระวัง')
                        ? 'bg-amber-600 text-white border-amber-600 shadow-2xs font-bold'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    ⚠️ อยู่ระหว่างเฝ้าระวัง (Monitoring)
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="บันทึกผลการทดสอบเดินเครื่อง..."
                  value={testRunResult}
                  onChange={(e) => setTestRunResult(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800"
                />
              </div>

              {/* เป้าหมายการปฏิบัติงาน (เวลาเริ่ม-เสร็จ) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  เป้าหมายการปฏิบัติงาน:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-700 block mb-1">วันที่เริ่มซ่อม - เวลา</span>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="text-xs bg-white border border-slate-200 rounded-lg p-2 flex-1"
                      />
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="text-xs bg-white border border-slate-200 rounded-lg p-2 w-24"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-700 block mb-1">วันที่ซ่อมเสร็จ - เวลา</span>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="text-xs bg-white border border-slate-200 rounded-lg p-2 flex-1"
                      />
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="text-xs bg-white border border-slate-200 rounded-lg p-2 w-24"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <span className="text-[11px] font-semibold text-slate-700 block mb-1">ระยะเวลาดำเนินการ (Downtime)</span>
                    <input
                      type="text"
                      placeholder="เช่น 2 ชม. 45 นาที"
                      value={durationText}
                      onChange={(e) => setDurationText(e.target.value)}
                      className="text-xs bg-white border border-slate-200 rounded-lg p-2 w-full"
                    />
                  </div>
                </div>
              </div>

              {/* ผู้ปฏิบัติงาน 3 ท่าน (ตามแบบฟอร์ม 1, 2, 3) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  ผู้ปฏิบัติงาน (ตามแบบฟอร์ม):
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 w-5">1.</span>
                    <input
                      type="text"
                      placeholder="ชื่อ-นามสกุล ช่างคนที่ 1"
                      value={tech1}
                      onChange={(e) => setTech1(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 w-5">2.</span>
                    <input
                      type="text"
                      placeholder="ชื่อ-นามสกุล ช่างคนที่ 2"
                      value={tech2}
                      onChange={(e) => setTech2(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 w-5">3.</span>
                    <input
                      type="text"
                      placeholder="ชื่อ-นามสกุล ช่างคนที่ 3"
                      value={tech3}
                      onChange={(e) => setTech3(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Save Form Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveRepairForm}
                  disabled={isSavingForm}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition"
                >
                  {isSavingForm ? 'กำลังบันทึก...' : '💾 บันทึกข้อมูลงานซ่อม (Sync Real-time)'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SIGNATURES 3 PARTIES (ผู้แจ้งซ่อม / ผู้ซ่อม / หัวหน้าแผนกซ่อมบำรุง) */}
          {activeTab === 'signatures' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-700">
                ✍️ ลายเซ็นดิจิทัล 3 ช่องล่างตามแบบฟอร์มเอกสาร KOCH FM-MN01-03 Rev.00
              </div>

              {/* 1. ผู้แจ้งซ่อม (Requester Approval) */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">1. ช่องผู้แจ้งซ่อม (ตรวจรับงาน)</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {ticket.requesterApproval?.isSigned ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> ลงนามตรวจรับแล้ว โดย {ticket.requesterApproval.name} ({ticket.requesterApproval.date})
                      </span>
                    ) : (
                      'รอยืนยันตรวจรับงานหลังซ่อมเสร็จ'
                    )}
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setSigningRole('requester')}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold rounded-lg flex items-center gap-1"
                  >
                    <PenTool className="w-3 h-3" /> {ticket.requesterApproval?.isSigned ? 'เซ็นใหม่' : 'ลงลายมือชื่อ'}
                  </button>
                </div>
              </div>

              {/* 2. ผู้ซ่อม (Technician Approval) */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">2. ช่องผู้ซ่อม (ช่างเทคนิคผู้ปฏิบัติงาน)</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {ticket.technicianApproval?.isSigned ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> ลงนามช่างเรียบร้อย โดย {ticket.technicianApproval.name} ({ticket.technicianApproval.date})
                      </span>
                    ) : (
                      'รอช่างผู้ซ่อมลงนามยืนยัน'
                    )}
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setSigningRole('technician')}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold rounded-lg flex items-center gap-1"
                  >
                    <PenTool className="w-3 h-3" /> {ticket.technicianApproval?.isSigned ? 'เซ็นใหม่' : 'ลงลายมือชื่อ'}
                  </button>
                </div>
              </div>

              {/* 3. หัวหน้าแผนกซ่อมบำรุง (Supervisor Approval) */}
              <div className="p-4 bg-white border-2 border-blue-200 bg-blue-50/30 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-blue-900">3. ช่องหัวหน้าแผนกซ่อมบำรุง (อนุมัติปิดงาน)</div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {ticket.supervisorApproval?.isSigned ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle className="w-4 h-4 text-emerald-600" /> อนุมัติปิดงานสมบูรณ์ โดย {ticket.supervisorApproval.name} ({ticket.supervisorApproval.date})
                      </span>
                    ) : (
                      'รอหัวหน้าแผนกซ่อมบำรุงตรวจสอบและลงนามปิดจ็อบ'
                    )}
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setSigningRole('supervisor')}
                    className="px-3.5 py-2 bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> {ticket.supervisorApproval?.isSigned ? 'เซ็นใหม่' : 'อนุมัติปิดงาน'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onPrintTicket(ticket)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg border border-slate-200 bg-white shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            <span>ดูใบแจ้งซ่อม FM-MN01-03 ทางการ</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>

      {/* Signature Modal */}
      {signingRole && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <SignaturePad
            title={
              signingRole === 'requester'
                ? 'ลงลายมือชื่อผู้แจ้งซ่อม (ตรวจรับงาน)'
                : signingRole === 'technician'
                ? 'ลงลายมือชื่อผู้ซ่อม (ช่างเทคนิค)'
                : 'ลงนามอนุมัติปิดงาน (หัวหน้าแผนกซ่อมบำรุง)'
            }
            signeeName={
              signingRole === 'requester'
                ? ticket.requesterName
                : signingRole === 'technician'
                ? tech1 || 'ผู้ซ่อม'
                : 'สมศักดิ์ ผู้จัดการซ่อมบำรุง'
            }
            onSave={handleSaveSignature}
            onCancel={() => setSigningRole(null)}
          />
        </div>
      )}
    </div>
  );
};
