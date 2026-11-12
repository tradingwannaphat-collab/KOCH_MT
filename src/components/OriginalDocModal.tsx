import React from 'react';
import { X, CheckCircle, Info, ExternalLink } from 'lucide-react';

interface OriginalDocModalProps {
  onClose: () => void;
}

export const OriginalDocModal: React.FC<OriginalDocModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-blue-400 font-semibold bg-slate-800 px-2 py-0.5 rounded">
              FM-MN01-03 Rev.00 Date 19/10/2026
            </span>
            <h3 className="text-base sm:text-lg font-bold mt-1">
              แบบฟอร์มใบแจ้งซ่อมต้นฉบับ KOCH
            </h3>
            <p className="text-xs text-slate-300">
              เปรียบเทียบเอกสารกระดาษเดิมกับระบบดิจิทัลแจ้งซ่อมผ่านมือถือแบบเรียลไทม์
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Image Display */}
          <div className="md:col-span-7 bg-slate-100 rounded-xl p-2 border border-slate-200 flex flex-col items-center">
            <div className="text-xs font-semibold text-slate-600 mb-2">
              ภาพสแกนเอกสารจริง (User Attachment)
            </div>
            <img
              src="/public/assets/aistudio/image_1d19cefd.png"
              alt="ใบแจ้งซ่อม KOCH ต้นฉบับ"
              className="max-h-[65vh] w-auto object-contain rounded border border-slate-300 shadow-md"
            />
          </div>

          {/* Mapping Checklist */}
          <div className="md:col-span-5 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900">
              <div className="font-bold mb-1 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600" />
                <span>การแปลงเป็นระบบมือถือเรียลไทม์</span>
              </div>
              ระบบได้ถอดช่องข้อมูลทุกช่องจากใบแจ้งซ่อมกระดาษมาเป็นระบบออนไลน์ เพื่อให้หน้างานแจ้งได้จากมือถือทันที และช่างอัปเดตงานแบบ Real-time:
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">1. ส่วนผู้แจ้งปัญหา:</span> วันที่, ชื่อ, แผนก, เลือกเครื่องจักร / โครงสร้างพื้นฐาน, หมายเลข, สถานที่ใช้งาน และรายละเอียดของปัญหา พร้อมถ่ายรูปหน้างาน
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">2. ไทม์ไลน์สด (Real-time Progress):</span> ช่างหน้างานส่งอัปเดตทุกขั้นตอน พร้อมรูปความคืบหน้า ทุกคนในโรงงานเห็นสดทันที
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">3. สาเหตุ (ตามแบบฟอร์ม 4 ข้อ):</span> ขาดการบำรุงรักษา, อะไหล่ไม่มีคุณภาพ, ใช้งานผิดประเภท, อื่นๆ
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">4. รายละเอียดการซ่อม & อะไหล่:</span> บันทึกรายละเอียดการซ่อม รายการอะไหล่ที่เปลี่ยน และเวลาเริ่ม-เสร็จ
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">5. ลายเซ็นดิจิทัล 3 ฝ่าย:</span> ผู้แจ้งซ่อม, ผู้ซ่อม, หัวหน้าแผนกซ่อมบำรุง ด้วยระบบเซ็นบนหน้าจอมือถือ
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">6. พิมพ์ฟอร์มจริง (1-Click Print):</span> สั่งพิมพ์เป็นเอกสารหน้าตาเป๊ะตามแบบฟอร์มกระดาษเพื่อใช้ตรวจรับหรือส่งฝ่ายบัญชี
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
