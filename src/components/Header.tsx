import React, { useRef, useState } from 'react';
import { Volume2, VolumeX, Radio, FileText, RotateCcw, Smartphone, Bell, Globe, Printer, Download, Upload, Database, Check, BookOpen, Calendar } from 'lucide-react';
import { KochLogo } from './KochLogo';
import { Language, SUPPORTED_LANGUAGES, translations } from '../i18n/translations';
import { downloadFullSystemBackup, restoreFullSystemBackup } from '../utils/backupService';

interface HeaderProps {
  isConnected: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenOriginalDoc: () => void;
  onResetData: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  currentLang?: Language;
  onSelectLang?: (lang: Language) => void;
  totalMachinesCount?: number;
  sparePartsCount?: number;
  unreadCount?: number;
  onOpenGuide?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isConnected,
  soundEnabled,
  onToggleSound,
  onOpenOriginalDoc,
  onResetData,
  activeTab,
  onSelectTab,
  currentLang = 'th',
  onSelectLang,
  totalMachinesCount = 33,
  sparePartsCount = 18,
  unreadCount = 0,
  onOpenGuide
}) => {
  const t = translations[currentLang] || translations.th;
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const handleDownloadBackup = async () => {
    try {
      setIsBackingUp(true);
      await downloadFullSystemBackup();
      setStatusFeedback('สำรองข้อมูลสำเร็จ!');
      setTimeout(() => setStatusFeedback(null), 3000);
    } catch (e: any) {
      console.error('[KOCH Header] Backup failed', e);
      alert('เกิดข้อผิดพลาดในการดาวน์โหลดข้อมูลสำรอง');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsRestoring(true);
      const text = await file.text();
      const res = await restoreFullSystemBackup(text);

      if (res.success) {
        setStatusFeedback('กู้คืนข้อมูลสำเร็จ! กำลังรีเฟรชระบบ...');
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        alert(res.message || 'ไฟล์ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบไฟล์ JSON สำรอง');
      }
    } catch (e) {
      alert('ไฟล์ไม่ถูกต้องหรือไม่ใช่ JSON');
    } finally {
      setIsRestoring(false);
      e.target.value = '';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onSelectTab('inspections')}>
              <div className="p-1 px-2 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-slate-100 transition shadow-2xs">
                <KochLogo size="md" variant="horizontal" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 text-sm sm:text-base leading-tight tracking-tight flex items-center gap-1.5">
                  {t.systemTitle}
                  <span className="hidden xl:inline-block text-[10px] font-normal px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                    FM-MN01-01 / 04 / 03
                  </span>
                </span>
                <span className="text-[11px] text-slate-500 hidden sm:inline-block">
                  {t.systemSubtitle}
                </span>
              </div>
            </div>
          </div>

          {/* Center Navigation for Desktop/Tablet */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
            <button
              onClick={() => onSelectTab('inspections')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'inspections'
                  ? 'bg-white text-blue-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📋 {t.tabInspections}
            </button>
            <button
              onClick={() => onSelectTab('pm_plan')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'pm_plan'
                  ? 'bg-white text-indigo-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="แผนการบำรุงรักษาเชิงป้องกันประจำปี (Annual PM Plan vs Act. FM-MN01-02)"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>แผน PM ประจำปี (Plan/Act)</span>
            </button>
            <button
              onClick={() => onSelectTab('machines')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'machines' || activeTab === 'print_registry'
                  ? 'bg-white text-blue-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              เครื่องจักร & Office ({totalMachinesCount})
            </button>
            <button
              onClick={() => onSelectTab('spare_parts')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'spare_parts'
                  ? 'bg-white text-indigo-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>📦 สแปร์พาร์ท</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'spare_parts' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200/80 text-slate-700'
              }`}>
                {sparePartsCount}
              </span>
            </button>
            <button
              onClick={() => onSelectTab('new')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'new'
                  ? 'bg-white text-rose-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              + แจ้งซ่อมด่วน (FM-MN01-03)
            </button>
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white text-blue-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.tabDashboard}
            </button>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Multilingual Switcher Dropdown / Buttons */}
            {onSelectLang && (
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                {SUPPORTED_LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => onSelectLang(l.code)}
                    className={`px-1.5 py-1 rounded text-xs transition ${
                      currentLang === l.code
                        ? 'bg-white text-slate-900 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title={l.label}
                  >
                    <span>{l.flag}</span> <span className="hidden sm:inline text-[11px] font-mono">{l.code.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            )}
            {/* Live SSE status indicator */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
              title={isConnected ? 'เชื่อมต่อระบบเรียลไทม์เรียบร้อย' : 'กำลังเชื่อมต่อใหม่...'}
            >
              <span className="relative flex h-2 w-2">
                {isConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                ></span>
              </span>
              <span className="hidden sm:inline font-mono">
                {isConnected ? 'LIVE SYNC' : 'CONNECTING'}
              </span>
            </div>

            {/* Auto-Save & Disk Persistent Indicator */}
            <div 
              className="hidden md:flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium"
              title="ข้อมูลทุกอย่าง (รูปภาพ, เครื่องจักร, ใบแจ้งซ่อม, ผลตรวจเช็ค) ถูกบันทึกถาวรลงฮาร์ดดิสก์และเบราว์เซอร์อัตโนมัติ ไม่สูญหายเมื่อรีเฟรชหรือแก้ไขโค้ด"
            >
              <Database className="w-3.5 h-3.5 text-blue-600" />
              <span>{statusFeedback || 'บันทึกอัตโนมัติ (Auto-Saved)'}</span>
            </div>

            {/* Backup & Restore Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleDownloadBackup}
                disabled={isBackingUp}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition cursor-pointer"
                title="ดาวน์โหลดสำรองข้อมูลทั้งหมดในระบบเป็นไฟล์ JSON เก็บไว้ในเครื่องคอมพิวเตอร์"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">{isBackingUp ? 'กำลังโหลด...' : 'สำรองข้อมูล'}</span>
              </button>

              <button
                type="button"
                onClick={() => restoreInputRef.current?.click()}
                disabled={isRestoring}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition cursor-pointer"
                title="กู้คืนข้อมูลจากไฟล์ JSON สำรองในคอมพิวเตอร์"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">{isRestoring ? 'กำลังกู้คืน...' : 'กู้คืน'}</span>
              </button>

              <input
                type="file"
                ref={restoreInputRef}
                accept=".json"
                onChange={handleRestoreFile}
                className="hidden"
              />
            </div>

            {/* Sound Toggle */}
            <button
              onClick={onToggleSound}
              className={`p-2 rounded-lg text-xs transition border ${
                soundEnabled
                  ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
              }`}
              title={soundEnabled ? 'เปิดเสียงแจ้งเตือน (คลิกเพื่อปิด)' : 'ปิดเสียงแจ้งเตือน (คลิกเพื่อเปิด)'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-blue-600" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* System Guide SOP Button */}
            {onOpenGuide && (
              <button
                type="button"
                onClick={onOpenGuide}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 shadow-2xs transition cursor-pointer"
                title="ดูขั้นตอนและคู่มือการใช้งานระบบ (SOP User Guide)"
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">ขั้นตอนการใช้ระบบ</span>
              </button>
            )}

            {/* View Original Form Doc button */}
            <button
              onClick={onOpenOriginalDoc}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition"
              title="เปรียบเทียบกับเอกสารกระดาษต้นฉบับ FM-MN01-03"
            >
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>ดูแบบฟอร์มต้นฉบับ</span>
            </button>

            {/* Reset Demo Data button (with safety confirmation guard) */}
            <button
              type="button"
              onClick={() => {
                const confirmed = window.confirm(
                  '⚠️ ต้องการรีเซ็ตข้อมูลระบบกลับเป็นค่าเริ่มต้นหรือไม่?\n\n- ข้อมูลใบแจ้งซ่อมและผลการตรวจเช็คที่บันทึกไว้จะถูกรีเซ็ตกลับเป็นค่ามาตรฐานเริ่มต้น\n\n(หากต้องการเก็บข้อมูลไว้ กรุณากด "ยกเลิก" และใช้ปุ่ม "สำรองข้อมูล" ก่อน)'
                );
                if (confirmed) {
                  onResetData();
                }
              }}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
              title="รีเซ็ตข้อมูลตัวอย่างกลับเป็นค่าเริ่มต้น (มีระบบถามยืนยันก่อนเสมอ)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
