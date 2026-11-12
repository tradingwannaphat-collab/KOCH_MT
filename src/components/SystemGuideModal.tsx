import React, { useState } from 'react';
import { 
  BookOpen, 
  X, 
  CheckCircle2, 
  ClipboardCheck, 
  Wrench, 
  Printer, 
  Database, 
  Upload, 
  AlertTriangle, 
  ChevronRight, 
  Check, 
  Clock, 
  ShieldCheck, 
  Package, 
  FileSpreadsheet,
  Download,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { KochLogo } from './KochLogo';

interface SystemGuideModalProps {
  onClose: () => void;
  onOpenTab?: (tab: string) => void;
}

export const SystemGuideModal: React.FC<SystemGuideModalProps> = ({ onClose, onOpenTab }) => {
  const [activeSection, setActiveSection] = useState<'all' | 'step1' | 'step2' | 'step3' | 'step4' | 'step5'>('all');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 my-6 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-200 shadow-2xs">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  คู่มือและขั้นตอนการใช้งานระบบ (SOP User Guide)
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono">
                  KOCH FM-MN01-03 & FM-MN01-04
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                ขั้นตอนการตรวจเช็คเครื่องจักรประจำวัน, ออกใบแจ้งซ่อมด่วน, ปิดงานซ่อม และการสำรองข้อมูล
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Navigation Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-3 border-b border-slate-100 shrink-0 text-xs">
          <button
            onClick={() => setActiveSection('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 cursor-pointer ${
              activeSection === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🌟 ขั้นตอนทั้งหมด (ภาพรวม)
          </button>
          <button
            onClick={() => setActiveSection('step1')}
            className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 cursor-pointer ${
              activeSection === 'step1'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            1. ตรวจเช็คประจำวัน (FM-MN01-04)
          </button>
          <button
            onClick={() => setActiveSection('step2')}
            className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 cursor-pointer ${
              activeSection === 'step2'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            2. ออกใบแจ้งซ่อม (FM-MN01-03)
          </button>
          <button
            onClick={() => setActiveSection('step3')}
            className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 cursor-pointer ${
              activeSection === 'step3'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            3. ช่างเข้าซ่อม & ปิด Job
          </button>
          <button
            onClick={() => setActiveSection('step4')}
            className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 cursor-pointer ${
              activeSection === 'step4'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            4. พิมพ์แบบฟอร์ม A4 & PDF
          </button>
          <button
            onClick={() => setActiveSection('step5')}
            className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 cursor-pointer ${
              activeSection === 'step5'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            5. สำรองข้อมูล (Auto-Save)
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto flex-1 pr-1 py-4 space-y-6">
          {/* Quick Flowchart Summary */}
          {(activeSection === 'all' || activeSection === 'step1') && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 sm:p-5">
              <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>ผังการทำงานหลักของระบบ (Daily Maintenance Workflow)</span>
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center mb-1.5">
                    1
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">ตรวจเช็คตอนเช้า 08:00</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    เปิดแบบตรวจเช็ค FM-MN01-04 ตรวจสอบตามเกณฑ์มาตรฐานรายวัน
                  </p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                  <div className="w-6 h-6 rounded-lg bg-amber-500 text-white font-bold text-xs flex items-center justify-center mb-1.5">
                    2
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">พบจุดผิดปกติ (X)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    ระบบขึ้นเตือนสีส้ม และมีปุ่มลัดออกใบแจ้งซ่อม FM-MN01-03 อัตโนมัติ
                  </p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center mb-1.5">
                    3
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">ช่างซ่อมบำรุงเข้าหน้างาน</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    เปลี่ยนสถานะเป็น "กำลังซ่อม", เบิกสเปร์พาร์ท และลงบันทึกเวลา
                  </p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center mb-1.5">
                    4
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">ปิดงานซ่อม (ปิด Job)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    ทดสอบงาน 3 ฝ่ายเซ็นรับมอบ สถานะรอย้ายไป "ซ่อมเสร็จ" คำนวณ KPI อัตโนมัติ
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: Daily Inspection Detailed */}
          {(activeSection === 'all' || activeSection === 'step1') && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  1
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    ขั้นตอนที่ 1: การตรวจเช็คเครื่องจักรประจำวัน (FM-MN01-04)
                  </h3>
                  <p className="text-xs text-slate-500">
                    สำหรับทีมซ่อมบำรุงและฝ่ายผลิตโรงงานบางแสน BS
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs text-slate-700">
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <span>1.1 เลือกปีและเดือนในการตรวจเช็ค:</span>
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px] pl-1">
                    <li>กดปุ่มลัดปีด่วน เช่น <strong>★ ปี 2570 (2027)</strong> หรือ <strong>★ ปี 2571 (2028)</strong> หรือกดลูกศร <span className="font-mono">&lt;</span> <span className="font-mono">&gt;</span></li>
                    <li>กดแท็บปุ่มลัด <strong>12 เดือน (01 ม.ค. ถึง 12 ธ.ค.)</strong> เพื่อเปิดดูและบันทึกข้อมูลของเดือนนั้นได้ทันทีในคลิกเดียว</li>
                    <li>เลือกรหัสเครื่องจักรจากแถบเครื่อง 33 รายการ (เช่น BS-01 Slot, BS-02 Cutting หรือเครื่องปรับอากาศ Office)</li>
                  </ul>
                </div>

                <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <ClipboardCheck className="w-4 h-4 text-blue-600" />
                    <span>1.2 วิธีการลงผลตรวจบนตาราง Matrix (1-31):</span>
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px] pl-1">
                    <li><strong>วิธีตรวจทีเดียวทั้งวัน:</strong> คลิกปุ่มสีน้ำเงิน <strong>"ตรวจประจำวันวันนี้"</strong> หรือคลิกหัวเลขวันที่ (1..31) เพื่อเปิดหน้าต่างตรวจบันทึกทุกข้อพร้อมกัน</li>
                    <li><strong>วิธีคลิกสลับในช่องตาราง:</strong> คลิกที่ช่องวันที่เพื่อเปลี่ยนสถานะวนรอบ:
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-bold text-emerald-600">✓ ปกติ (Pass)</span>
                        <span>➔</span>
                        <span className="font-bold text-rose-600">✕ ผิดปกติ (Abnormal)</span>
                        <span>➔</span>
                        <span className="font-bold text-slate-700">■ ไม่ตรวจ/วันหยุด (Off)</span>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>1.3 เมื่อตรวจพบความผิดปกติ (✕):</span>
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px] pl-1">
                    <li>ระบบจะแจ้งเตือนแถบสีส้ม <strong>"ตรวจพบจุดผิดปกติ (X)"</strong> ทันที</li>
                    <li>คลิกปุ่มสีแดง <strong>"ออกใบแจ้งซ่อม FM-MN01-03 ทันที"</strong> ระบบจะกรอกรหัสเครื่องจักรและหัวข้อปัญหาที่พบให้อัตโนมัติ</li>
                  </ul>
                </div>

                <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-indigo-600" />
                    <span>1.4 ปรับแต่งรายการตรวจเฉพาะเครื่อง (Customize):</span>
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px] pl-1">
                    <li>กดปุ่ม <strong>"ปรับแต่งรายการตรวจของเครื่องนี้"</strong></li>
                    <li>แก้ไขชื่อหัวข้อตรวจสอบ, เกณฑ์มาตรฐาน, ความถี่ (D=วัน / W=สัปดาห์ / M=เดือน)</li>
                    <li>มีปุ่มโหลดแม่แบบสำเร็จรูปมาตรฐาน KOCH เช่น แม่แบบ SLOT, CUTTING, เฟล็กโซ่, ไดคัท, แอร์ Office</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Issue Repair Ticket */}
          {(activeSection === 'all' || activeSection === 'step2') && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <span className="w-7 h-7 rounded-lg bg-rose-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  2
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    ขั้นตอนที่ 2: การออกใบแจ้งซ่อมหน้างาน (FM-MN01-03)
                  </h3>
                  <p className="text-xs text-slate-500">
                    ออกใบแจ้งซ่อมด่วนผ่านมือถือหรือคอมพิวเตอร์เมื่อเครื่องจักรขัดข้อง
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-800">1. เลือกระดับความเร่งด่วน:</div>
                  <div className="space-y-1 text-[11px]">
                    <div className="p-1.5 bg-rose-50 border border-rose-200 rounded text-rose-800 font-bold">
                      🚨 ฉุกเฉิน-หยุดไลน์ (Line Stop)
                    </div>
                    <div className="p-1.5 bg-amber-50 border border-amber-200 rounded text-amber-800 font-semibold">
                      ⚡ เร่งด่วน (Urgent)
                    </div>
                    <div className="p-1.5 bg-blue-50 border border-blue-200 rounded text-blue-800 font-medium">
                      📋 ทั่วไป (Normal)
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-800">2. ข้อมูลเครื่องและอาการเสีย:</div>
                  <p className="text-[11px] text-slate-600">
                    เลือกรหัสเครื่องจักร ระบบจะดึงรหัสโมเดล แผนก และตำแหน่งให้อัตโนมัติ ระบุอาการเสียที่พบหน้างาน
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-800">3. แนบรูปถ่ายหน้างาน:</div>
                  <p className="text-[11px] text-slate-600">
                    กดปุ่ม <strong>"เลือกรูปจากคอมพิวเตอร์"</strong> หรือกดถ่ายภาพจากกล้องสมาร์ทโฟนเพื่อส่งให้ทีมช่างประเมินทันที
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Maintenance Staff Work & Closing Job */}
          {(activeSection === 'all' || activeSection === 'step3') && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  3
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    ขั้นตอนที่ 3: ขั้นตอนช่างซ่อมบำรุง & การปิดงานซ่อม (Closing Job)
                  </h3>
                  <p className="text-xs text-slate-500">
                    การเปลี่ยนสถานะ, เบิกอะไหล่, บันทึกสาเหตุที่แท้จริง และการเซ็นอนุมัติปิดงาน
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-700">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900">ขั้นตอนการดำเนินงานของช่าง:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <strong className="text-amber-700 block">① ช่างรับงาน</strong>
                      เปลี่ยนสถานะเป็น <span className="bg-amber-100 text-amber-800 px-1 rounded font-bold">กำลังซ่อมแซม</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <strong className="text-purple-700 block">② เบิกสเปร์พาร์ท</strong>
                      เลือกอะไหล่ในระบบ ตัดสต็อกอัตโนมัติ (หรือระบุ <span className="bg-purple-100 text-purple-800 px-1 rounded font-bold">รออะไหล่</span> หากต้องสั่งซื้อ)
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <strong className="text-blue-700 block">③ วิเคราะห์สาเหตุ</strong>
                      เลือกสาเหตุแท้จริง (ขาดการบำรุงรักษา / ใช้งานผิดวิธี / สิ้นอายุขัย / อุบัติเหตุ)
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-emerald-200 bg-emerald-50/50">
                      <strong className="text-emerald-700 block">④ ปิด Job สมบูรณ์</strong>
                      เปลี่ยนสถานะเป็น <span className="bg-emerald-100 text-emerald-800 px-1 rounded font-bold">ซ่อมเสร็จ/ปิดงาน</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs space-y-1.5">
                  <div className="font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>เมื่อกด "ปิด Job / ซ่อมเสร็จสมบูรณ์" ในระบบ:</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] space-y-0.5 text-emerald-800 pl-1">
                    <li>สถานะ <strong>ฉุกเฉิน, กำลังซ่อม, รออะไหล่</strong> จะถูกเคลียร์ออกจากหน้างาน และถูกนับรวมในยอด <strong>"ซ่อมเสร็จ/ปิดงาน"</strong> บนแดชบอร์ด KPI ทันที</li>
                    <li>ระบบบันทึกเวลาเสร็จสิ้นและคำนวณระยะเวลาซ่อม (Repair Duration) ให้อัตโนมัติ</li>
                    <li>มีช่องลงชื่อครบทั้ง 3 ฝ่าย: <strong>ผู้แจ้งซ่อมรับมอบงาน</strong>, <strong>ช่างผู้ซ่อม</strong>, และ <strong>หัวหน้าฝ่ายอนุมัติ</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Printing & PDF Export */}
          {(activeSection === 'all' || activeSection === 'step4') && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  4
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    ขั้นตอนที่ 4: การพิมพ์แบบฟอร์ม A4 และการดาวน์โหลด PDF
                  </h3>
                  <p className="text-xs text-slate-500">
                    แบบฟอร์มถูกต้องตามมาตรฐานโรงงาน KOCH PACKAGING
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Printer className="w-4 h-4 text-slate-700" />
                    <span>แบบตรวจเช็ค FM-MN01-04</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    เลือกพิมพ์ได้ 2 โหมด: <strong>พร้อมผลตรวจ</strong> หรือ <strong>แบบฟอร์มเปล่า</strong> สำหรับปริ้นท์นำไปหนีบคลิปบอร์ดหน้าเครื่อง พร้อมปุ่ม <strong>"เปลี่ยนรูปจากคอมฯ"</strong> สำหรับใส่ภาพจริงของเครื่องจักร
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-indigo-800 flex items-center gap-1.5">
                    <Printer className="w-4 h-4 text-indigo-700" />
                    <span>แผน PM ประจำปี FM-MN01-02</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    แบบฟอร์มควบคุมแผนการบำรุงรักษาเชิงป้องกันประจำปี <strong>พ.ศ. 2569 และ 2570</strong> (A4 แนวนอน) 12 เดือน 33 เครื่องจักร พร้อมช่องลายเซ็น 3 ฝ่าย
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Printer className="w-4 h-4 text-slate-700" />
                    <span>ใบแจ้งซ่อม FM-MN01-03</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    พิมพ์ใบแจ้งซ่อมขนาด A4 แสดงประวัติการซ่อม รายการอะไหล่ที่เปลี่ยน และลายเซ็นส่งมอบงาน 3 ฝ่าย
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-blue-600" />
                    <span>ดาวน์โหลด PDF คุณภาพสูง</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    ทุกหน้าพิมพ์มีปุ่ม <strong>"ดาวน์โหลด PDF"</strong> ส่งออกไฟล์เพื่อแนบรายงานเสนอผู้จัดการหรือเก็บในระบบ Cloud ได้ทันที
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Data Safety & Backup */}
          {(activeSection === 'all' || activeSection === 'step5') && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  5
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    ขั้นตอนที่ 5: การบันทึกข้อมูลถาวร & การสำรองข้อมูล (Data Safety)
                  </h3>
                  <p className="text-xs text-slate-500">
                    ระบบป้องกันข้อมูลสูญหาย 2 ชั้น (ฮาร์ดดิสก์เครื่องเซิร์ฟเวอร์ + เบราว์เซอร์)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-blue-900 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-blue-600" />
                    <span>ระบบบันทึกอัตโนมัติ (Auto-Save to Disk):</span>
                  </h4>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    ทุกครั้งที่มีการลงผลตรวจ, แก้ไขรายการเครื่องจักร, อัปเดตรูปภาพ หรือออกใบแจ้งซ่อม ข้อมูลจะถูกเขียนลงไฟล์ฐานข้อมูล <strong>app_db.json</strong> บนฮาร์ดดิสก์ทันที ไม่สูญหายแม้จะมีการรีเฟรชหน้าเว็บหรือรีสตาร์ตเซิร์ฟเวอร์
                  </p>
                </div>

                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>ปุ่ม "สำรองข้อมูล" และ "กู้คืน":</span>
                  </h4>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    ที่แถบด้านบนของหน้าจอ มีปุ่ม <strong>"สำรองข้อมูล"</strong> สำหรับดาวน์โหลดไฟล์สำรองเก็บไว้ในคอมพิวเตอร์ และปุ่ม <strong>"กู้คืน"</strong> เพื่อนำข้อมูลสำรองกลับมาใช้งานได้ตลอดเวลา
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 shrink-0 text-xs">
          <div className="text-slate-500 flex items-center gap-2">
            <KochLogo size="sm" />
            <span className="hidden sm:inline font-mono">KOCH PACKAGING • โรงงานบางแสน BS</span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenTab && (
              <button
                type="button"
                onClick={() => {
                  onOpenTab('inspections');
                  onClose();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                เริ่มใช้งานการตรวจเช็คประจำวัน
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
