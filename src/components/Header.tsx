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
  const [statusFeedback, setStatusFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success', duration = 3500) => {
    setStatusFeedback({ text, type });
    setTimeout(() => setStatusFeedback(null), duration);
  };

  const handleDownloadBackup = async () => {
    try {
      setIsBackingUp(true);
      await downloadFullSystemBackup();
      showFeedback('สำรองข้อมูลสำเร็จ!', 'success');
    } catch (e: any) {
      console.error('[KOCH Header] Backup failed', e);
      showFeedback('ดาวน์โหลดสำรองไม่สำเร็จ', 'error');
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
        showFeedback('กู้คืนข้อมูลสำเร็จ! กำลังรีเฟรช...', 'success', 2000);
        setTimeout(() => {
          window.location.reload();
        }, 700);
      } else {
        showFeedback(res.message || 'ไฟล์ข้อมูลไม่ถูกต้อง', 'error', 5000);
      }
    } catch (e) {
      showFeedback('ไฟล์ไม่ถูกต้องหรือไม่ใช่ JSON', 'error', 5000);
    } finally {
      setIsRestoring(false);
      e.target.value = '';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs print:hidden no-print">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        {/* Top Row: Brand & Utility Controls */}
        <div className="flex items-center justify-between gap-3 py-2 min-h-[56px]">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onSelectTab('inspections')}>
              <div className="p-1 px-2 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-slate-100 transition shadow-2xs shrink-0">
                <KochLogo size="md" variant="horizontal" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-slate-900 text-sm sm:text-base leading-tight tracking-tight flex items-center gap-1.5 whitespace-nowrap">
                  <span>{t.systemTitle}</span>
                  <span className="hidden xl:inline-block text-[10px] font-normal px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                    FM-MN01-01 / 04 / 03
                  </span>
                </span>
                <span className="text-[11px] text-slate-500 hidden sm:inline-block whitespace-nowrap">
                  {t.systemSubtitle}
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Controls (compact, non-wrapping pills) */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            {/* Multilingual Switcher */}
            {onSelectLang && (
              <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs shrink-0">
                {SUPPORTED_LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => onSelectLang(l.code)}
                    className={`px-1.5 py-1 rounded text-xs transition whitespace-nowrap cursor-pointer ${
                      currentLang === l.code
                        ? 'bg-white text-slate-900 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title={l.label}
                  >
                    <span>{l.flag}</span>{' '}
                    <span className="hidden md:inline text-[10px] font-mono">{l.code.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Persistence & Connection Status Indicator */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border whitespace-nowrap shrink-0 ${
                statusFeedback?.type === 'error'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : statusFeedback?.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : isConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
              title={
                isConnected
                  ? 'เชื่อมต่อระบบเรียลไทม์ + บันทึกถาวรอัตโนมัติ'
                  : 'บันทึกข้อมูลถาวรลงในเครื่อง (IndexedDB + Auto-Save) พร้อมใช้งานตลอดเวลา'
              }
            >
              {statusFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>{statusFeedback.text}</span>
                </>
              ) : isConnected ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="font-mono">LIVE SYNC</span>
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="font-medium">บันทึกอัตโนมัติ (Auto-Saved)</span>
                </>
              )}
            </div>

            {/* Backup & Restore Buttons */}
            <button
              type="button"
              onClick={handleDownloadBackup}
              disabled={isBackingUp}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition cursor-pointer whitespace-nowrap shrink-0"
              title="ดาวน์โหลดสำรองข้อมูลทั้งหมดในระบบเป็นไฟล์ JSON เก็บไว้ในเครื่องคอมพิวเตอร์"
            >
              <Download className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="hidden sm:inline">{isBackingUp ? 'กำลังโหลด...' : 'สำรองข้อมูล'}</span>
            </button>

            <button
              type="button"
              onClick={() => restoreInputRef.current?.click()}
              disabled={isRestoring}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition cursor-pointer whitespace-nowrap shrink-0"
              title="กู้คืนข้อมูลจากไฟล์ JSON สำรองในคอมพิวเตอร์"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="hidden sm:inline">{isRestoring ? 'กำลังกู้คืน...' : 'กู้คืน'}</span>
            </button>

            <input
              type="file"
              ref={restoreInputRef}
              accept=".json"
              onChange={handleRestoreFile}
              className="hidden"
            />

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={onToggleSound}
              className={`p-1.5 rounded-lg text-xs transition border shrink-0 cursor-pointer ${
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
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 shadow-2xs transition cursor-pointer whitespace-nowrap shrink-0"
                title="ดูขั้นตอนและคู่มือการใช้งานระบบ (SOP User Guide)"
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="hidden md:inline">ขั้นตอนการใช้ระบบ</span>
              </button>
            )}

            {/* View Original Form Doc button */}
            <button
              type="button"
              onClick={onOpenOriginalDoc}
              className="hidden md:flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition cursor-pointer whitespace-nowrap shrink-0"
              title="เปรียบเทียบกับเอกสารกระดาษต้นฉบับ FM-MN01-03"
            >
              <FileText className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span>แบบฟอร์มต้นฉบับ</span>
            </button>

            {/* Reset Demo Data button with inline confirmation guard */}
            {confirmReset ? (
              <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1 shrink-0">
                <span className="text-[11px] font-bold text-rose-700 whitespace-nowrap">ยืนยันรีเซ็ต?</span>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmReset(false);
                    onResetData();
                  }}
                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded cursor-pointer whitespace-nowrap"
                >
                  ตกลง
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-1.5 py-0.5 bg-white hover:bg-slate-100 text-slate-600 text-[11px] font-medium rounded border border-slate-200 cursor-pointer whitespace-nowrap"
                >
                  ยกเลิก
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer shrink-0"
                title="รีเซ็ตข้อมูลกลับเป็นค่าเริ่มต้น"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Second Row: Clean Horizontal Desktop Navigation Tabs (Never overlaps content or wraps vertically) */}
        <nav className="hidden lg:flex items-center justify-between gap-2 py-1.5 border-t border-slate-100 overflow-x-auto">
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => onSelectTab('inspections')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'inspections'
                  ? 'bg-white text-blue-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📋 {t.tabInspections}
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('pm_plan')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'pm_plan'
                  ? 'bg-white text-indigo-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="แผนการบำรุงรักษาเชิงป้องกันประจำปี (Annual PM Plan vs Act. FM-MN01-02)"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>แผน PM ประจำปี (Plan/Act)</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('machines')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'machines' || activeTab === 'print_registry'
                  ? 'bg-white text-blue-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              เครื่องจักร & Office ({totalMachinesCount})
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('spare_parts')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'spare_parts'
                  ? 'bg-white text-indigo-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>📦 สแปร์พาร์ท</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === 'spare_parts' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200/80 text-slate-700'
                }`}
              >
                {sparePartsCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('new')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'new'
                  ? 'bg-white text-rose-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              + แจ้งซ่อมด่วน (FM-MN01-03)
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('dashboard')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-white text-blue-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.tabDashboard}
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
};
