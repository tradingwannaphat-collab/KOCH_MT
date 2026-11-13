import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { MachineMonthlyCheckSheet, DEFAULT_INSPECTION_ITEMS } from '../types/inspection';
import { MachineAsset } from '../types/ticket';
import { KochLogo } from './KochLogo';
import { Printer, ArrowLeft, Globe, Download, Loader2, Upload, Camera, Check } from 'lucide-react';
import { Language, translations, SUPPORTED_LANGUAGES, DEFAULT_ITEMS_I18N } from '../i18n/translations';
import { exportElementToPdf } from '../utils/pdfExport';
import { compressImageFile } from '../utils/imageCompressor';

export interface PrintableInspectionDocumentHandle {
  exportPdf: () => Promise<void>;
}

interface PrintableInspectionDocumentProps {
  sheet: MachineMonthlyCheckSheet;
  allMachines: MachineAsset[];
  allSheets: MachineMonthlyCheckSheet[];
  onSelectSheet: (sheet: MachineMonthlyCheckSheet) => void;
  onBack: () => void;
  onUpdateMachine?: (id: string, updates: Partial<MachineAsset>) => Promise<any>;
  selectedMonth?: string;
  onSelectMonth?: (month: string) => void;
}

export const PrintableInspectionDocument = forwardRef<PrintableInspectionDocumentHandle, PrintableInspectionDocumentProps>(({
  sheet,
  allMachines,
  allSheets,
  onSelectSheet,
  onBack,
  onUpdateMachine,
  selectedMonth,
  onSelectMonth
}, ref) => {
  const [printMode, setPrintMode] = useState<'filled' | 'blank'>('filled');
  const [printLang, setPrintLang] = useState<Language>('th');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const documentRef = useRef<HTMLDivElement>(null);
  const diagramInputRef = useRef<HTMLInputElement>(null);
  const [customDiagram, setCustomDiagram] = useState<string>('');
  const [diagramError, setDiagramError] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const t = translations[printLang] || translations.th;

  React.useEffect(() => {
    setDiagramError(false);
  }, [sheet.machineId, customDiagram]);

  const handleDiagramUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file, 1024, 0.75);
      if (dataUrl) {
        setCustomDiagram(dataUrl);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
        if (currentMachine && onUpdateMachine) {
          await onUpdateMachine(currentMachine.id, { imageUrl: dataUrl, photoUrl: dataUrl });
        }
      }
    } catch (err) {
      console.warn('Failed compressing inspection diagram:', err);
    }
    e.target.value = '';
  };

  const currentMachine = allMachines.find((m) => m.id === sheet.machineId);
  const items = sheet.items && sheet.items.length > 0 ? sheet.items : DEFAULT_INSPECTION_ITEMS;
  const days = sheet.days || {};
  const daysArray = Array.from({ length: 31 }, (_, i) => i + 1);

  // Month and Year display (e.g., ตุลาคม 2569 / October 2026)
  const [yearStr, monthStr] = (sheet.month || '2026-10').split('-');
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const mIndex = parseInt(monthStr, 10) - 1;
  const monthLabel = thaiMonths[mIndex] || monthStr;
  const thaiYear = parseInt(yearStr, 10) + 543;

  const getItemDescription = (no: number, defaultDesc: string) => {
    const itemObj = items.find((it) => it.no === no);
    if (printLang === 'th' || !itemObj?.translations) {
      return itemObj?.description || defaultDesc;
    }
    if (itemObj.translations[printLang]) {
      return itemObj.translations[printLang];
    }
    const defaultTrans = DEFAULT_ITEMS_I18N[no];
    if (defaultTrans && defaultTrans[printLang]) {
      return defaultTrans[printLang];
    }
    return itemObj?.description || defaultDesc;
  };

  const handlePrint = () => {
    const prevTitle = document.title;
    document.title = `FM-MN01-04_ใบตรวจสอบเครื่องจักร_${sheet.machineNo || 'PM'}_${sheet.month}`;
    window.print();
    document.title = prevTitle;
  };

  const handleDownloadPdf = async () => {
    if (!documentRef.current) return;
    setIsDownloadingPdf(true);
    const fileName = `FM-MN01-04_ใบตรวจสอบเครื่องจักร_${sheet.machineNo || 'PM-RECORD'}_${sheet.month}.pdf`;
    await exportElementToPdf(documentRef.current, fileName, {
      orientation: 'landscape',
      fitToOnePage: true,
      marginMm: 5
    });
    setIsDownloadingPdf(false);
  };

  useImperativeHandle(ref, () => ({
    exportPdf: handleDownloadPdf
  }));

  const isSlotMachine = (currentMachine?.code === 'MA2312014') || 
                        (currentMachine?.name.toLowerCase().includes('slot')) || 
                        (sheet.machineName.toLowerCase().includes('slot'));

  return (
    <div className="min-h-screen bg-slate-100/90 py-6 px-2 sm:px-6">
      {/* Print Control Toolbar (hidden when printing) */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ย้อนกลับ</span>
          </button>
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <span>ใบตรวจสอบเครื่องจักร / อุปกรณ์ (PREVENTIVE MAINTENANCE RECORD)</span>
              <span className="text-[10px] font-mono bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded font-bold">
                KOCH Standard
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              ประเภท: {currentMachine?.processName || currentMachine?.name || 'SLOT'} • หมายเลข: {currentMachine?.code || sheet.machineNo || 'MA2312014'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Language Selector */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1 text-xs">
            <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            {SUPPORTED_LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setPrintLang(l.code)}
                className={`px-2 py-0.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  printLang === l.code ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {l.flag} {l.nativeLabel}
              </button>
            ))}
          </div>

          {/* Print Mode: Filled vs Blank Sheet for Clipboard */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setPrintMode('filled')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                printMode === 'filled' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              พร้อมผลตรวจ (Filled)
            </button>
            <button
              onClick={() => setPrintMode('blank')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                printMode === 'blank' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              แบบฟอร์มเปล่า (Blank Form)
            </button>
          </div>

          {/* Year & Month selector for 2570-2571 and all 12 months */}
          {onSelectMonth && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1">
              <span className="text-xs font-bold text-slate-600">รอบตรวจ:</span>
              <select
                value={parseInt(yearStr, 10) || 2026}
                onChange={(e) => onSelectMonth(`${e.target.value}-${monthStr || '10'}`)}
                className="text-xs font-bold text-blue-700 bg-transparent border-0 focus:outline-hidden cursor-pointer"
              >
                <option value="2027">★ ปี 2570 (2027)</option>
                <option value="2028">★ ปี 2571 (2028)</option>
                <option value="2026">ปี 2569 (2026)</option>
                <option value="2025">ปี 2568 (2025)</option>
                <option value="2024">ปี 2567 (2024)</option>
                <option value="2029">ปี 2572 (2029)</option>
                <option value="2030">ปี 2573 (2030)</option>
                <option value="2031">ปี 2574 (2031)</option>
                <option value="2032">ปี 2575 (2032)</option>
              </select>
              <select
                value={mIndex >= 0 ? mIndex : 9}
                onChange={(e) => {
                  const mNum = String(parseInt(e.target.value, 10) + 1).padStart(2, '0');
                  onSelectMonth(`${yearStr || '2026'}-${mNum}`);
                }}
                className="text-xs font-bold text-slate-800 bg-transparent border-0 focus:outline-hidden cursor-pointer"
              >
                {thaiMonths.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Machine selector */}
          <select
            value={sheet.id}
            onChange={(e) => {
              const target = allSheets.find((s) => s.id === e.target.value);
              if (target) onSelectSheet(target);
            }}
            className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
          >
            {allSheets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.machineName} ({s.machineNo}) - {s.month}
              </option>
            ))}
          </select>

          {/* Change Diagram / Machine Visual from PC */}
          <button
            type="button"
            onClick={() => diagramInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200 shadow-2xs transition cursor-pointer"
            title="เลือกรูปภาพเครื่องจักรหรือไดอะแกรมจากคอมพิวเตอร์ของคุณ"
          >
            <Upload className="w-4 h-4 text-blue-600" />
            <span>{uploadSuccess ? '✓ เปลี่ยนรูปแล้ว' : 'เปลี่ยนรูปจากคอมฯ'}</span>
          </button>
          <input
            type="file"
            ref={diagramInputRef}
            accept="image/*"
            onChange={handleDiagramUpload}
            className="hidden"
          />

          {/* Download PDF directly */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            title="ดาวน์โหลดเป็น PDF แบบมาตรฐาน KOCH"
          >
            {isDownloadingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังสร้าง PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>บันทึกเป็น PDF (1 หน้า)</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์เอกสาร (Print)</span>
          </button>
        </div>
      </div>

      {/* Official Sheet Document Container matching FM-MN01-04 Standard (1 Page A4 Landscape) */}
      <div 
        ref={documentRef}
        id="printable-inspection-container"
        className="max-w-[1160px] mx-auto bg-white p-4 sm:p-5 shadow-lg rounded-xl border border-slate-300 print:shadow-none print:border-none print:p-0 print:max-w-none text-slate-900 font-sans"
      >
        <style>{`
          @media print {
            @page {
              size: A4 landscape;
              margin: 5mm;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        `}</style>

        {/* Top Header with Official Document Control Box (FM-MN01-04) */}
        <div className="border border-slate-900 mb-1.5">
          <div className="grid grid-cols-12 divide-x divide-slate-900">
            {/* Logo box */}
            <div className="col-span-3 flex items-center justify-center p-2 bg-white">
              <KochLogo size="md" variant="full" />
            </div>

            {/* Document Title Header */}
            <div className="col-span-6 flex flex-col items-center justify-center p-2 text-center bg-white">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                ใบตรวจสอบเครื่องจักร / อุปกรณ์
              </h1>
              <h2 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-800 uppercase mt-0.5 font-mono">
                PREVENTIVE MAINTENANCE RECORD
              </h2>
            </div>

            {/* Document Control Number Box */}
            <div className="col-span-3 p-2 bg-slate-50/70 flex flex-col justify-center text-[10px] font-mono leading-snug">
              <div className="flex justify-between gap-2 border-b border-slate-300 pb-0.5 mb-0.5">
                <span className="text-slate-600 font-sans">หมายเลขเอกสาร :</span>
                <span className="font-bold text-slate-900">FM-MN01-04</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-600 font-sans">แก้ไขครั้งที่ :</span>
                <span className="font-semibold text-slate-800">Rev.00</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-600 font-sans">วันที่บังคับใช้ :</span>
                <span className="font-semibold text-slate-800">19/10/2026</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-600 font-sans">หน้าที่ :</span>
                <span className="font-semibold text-slate-800">1 / 1</span>
              </div>
            </div>
          </div>
        </div>

        {/* Machine Visual / Callout Inspection Diagram */}
        <div className="border border-slate-900 mb-1.5 p-1.5 bg-slate-50/50">
          <div className="flex flex-col md:flex-row items-center justify-center gap-3">
            {/* Machine Graphic with Callouts & Click to Upload from PC */}
            <div 
              onClick={() => diagramInputRef.current?.click()}
              className="group relative max-w-[400px] w-full flex items-center justify-center bg-white border border-slate-200 rounded-lg p-1.5 overflow-hidden shadow-2xs cursor-pointer"
              title="คลิกเพื่อเลือกไฟล์รูปภาพจากคอมพิวเตอร์เพื่อเปลี่ยนรูปในแบบฟอร์ม"
            >
              {!diagramError ? (
                <img
                  src={customDiagram || currentMachine?.imageUrl || currentMachine?.photoUrl || (isSlotMachine 
                    ? 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=80'
                    : 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=800&auto=format&fit=crop&q=80')}
                  alt={currentMachine?.name || 'Machine Visual'}
                  onError={() => setDiagramError(true)}
                  className="w-full h-24 object-contain rounded group-hover:opacity-90 transition"
                />
              ) : (
                <div className="w-full h-24 rounded bg-slate-100 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-600 px-4">
                  <div className="text-xs font-bold font-mono text-blue-900">
                    {currentMachine?.tagCode || sheet.machineNo} • {currentMachine?.name || sheet.machineName}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    รหัสเครื่องจักร: {currentMachine?.code || sheet.machineNo} (จุดตรวจเช็ค 1 - {Math.min(items.length, 8)})
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition print:hidden">
                <span className="bg-white/95 text-slate-800 text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-xs flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-blue-600" />
                  เปลี่ยนรูปจากคอมฯ
                </span>
              </div>
              {/* Callout Pins 1 to 7 mimicking KOCH standard */}
              <div className="absolute left-6 top-6 bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold shadow-sm">
                1
              </div>
              <div className="absolute left-24 top-2 bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold shadow-sm">
                2
              </div>
              <div className="absolute left-44 top-2 bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold shadow-sm">
                7
              </div>
              <div className="absolute right-28 top-2 bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold shadow-sm">
                3
              </div>
              <div className="absolute left-40 bottom-3 bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold shadow-sm">
                4
              </div>
              <div className="absolute left-2 bottom-6 bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold shadow-sm">
                5
              </div>
              <div className="absolute left-2 top-2 bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold shadow-sm">
                6
              </div>
            </div>

            {/* Quick Points Legend */}
            <div className="flex-1 text-[10px] text-slate-700 grid grid-cols-2 gap-x-3 gap-y-0.5">
              {items.slice(0, 8).map((it) => (
                <div key={it.no} className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8.5px] font-bold flex-shrink-0">
                    {it.no}
                  </span>
                  <span className="font-medium truncate">{it.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Machine Type and Machine Code Header Bar */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-900 border-x border-t border-slate-900 px-2.5 py-1 bg-slate-100/60">
          <div>
            ประเภทเครื่องจักร : <span className="font-semibold">{currentMachine?.processName || currentMachine?.name || 'SLOT'}</span>
          </div>
          <div>
            หมายเลขเครื่องจักร : <span className="font-mono font-semibold">{currentMachine?.code || sheet.machineNo || 'MA2312014'}</span>
          </div>
        </div>

        {/* Matrix Table with Columns: No. | หัวข้อตรวจสอบ | เกณฑ์มาตรฐานการตรวจสอบ | ความถี่ | วันที่ 1..31 | เลขที่ใบแจ้งซ่อม */}
        <div className="border border-slate-900 overflow-x-auto">
          <table className="w-full text-[9.5px] border-collapse">
            <thead>
              {/* Row 1 of Table Header */}
              <tr className="border-b border-slate-900 bg-slate-50">
                <th rowSpan={2} className="border-r border-slate-900 p-0.5 text-center w-6 font-bold">
                  No.
                </th>
                <th rowSpan={2} className="border-r border-slate-900 p-1 text-center min-w-[125px] font-bold">
                  {t.colDescription}
                </th>
                <th rowSpan={2} className="border-r border-slate-900 p-1 text-center min-w-[130px] font-bold">
                  {t.colCriteria}
                </th>
                <th rowSpan={2} className="border-r border-slate-900 p-0.5 text-center w-7 font-bold leading-tight text-[8.5px]">
                  <div>ความ</div>
                  <div>ถี่</div>
                </th>
                <th colSpan={31} className="border-b border-slate-900 p-0.5 text-center font-bold">
                  เดือน <span className="underline font-semibold px-2">{printMode === 'blank' ? '...........................' : monthLabel}</span> 
                  ปี <span className="underline font-semibold px-2">{printMode === 'blank' ? '........................' : `${thaiYear} (${yearStr})`}</span>
                </th>
                <th rowSpan={2} className="border-l border-slate-900 p-0.5 text-center w-[72px] font-bold leading-tight text-[8.5px]">
                  {t.colTicketNo}
                </th>
              </tr>

              {/* Row 2: Days 1 to 31 */}
              <tr className="border-b border-slate-900 text-[8.5px] font-bold bg-slate-50/80">
                {daysArray.map((d) => (
                  <th key={d} className="border-r border-slate-400 p-0 text-center w-[19px] last:border-r-0">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.no} className="border-b border-slate-400 hover:bg-slate-50/40">
                  <td className="border-r border-slate-900 py-0.5 px-1 text-center font-bold">
                    {it.no}
                  </td>
                  <td className="border-r border-slate-900 py-0.5 px-1.5 text-left text-[9.5px] leading-tight font-medium">
                    {getItemDescription(it.no, it.description)}
                  </td>
                  <td className="border-r border-slate-900 py-0.5 px-1.5 text-left text-[9px] text-slate-700 leading-tight">
                    {it.criteria || '-'}
                  </td>
                  <td className="border-r border-slate-900 py-0.5 px-0.5 text-center font-bold text-slate-800">
                    {it.frequency || 'D'}
                  </td>

                  {/* Day Results Columns 1 to 31 */}
                  {daysArray.map((d) => {
                    const status = printMode === 'filled' ? days[d]?.results?.[it.no] : null;
                    return (
                      <td key={d} className="border-r border-slate-300 p-0 text-center text-[10px] last:border-r-0 font-medium">
                        {status === 'pass' && <span className="text-slate-900 font-bold">/</span>}
                        {status === 'abnormal' && <span className="text-rose-600 font-bold">x</span>}
                        {status === 'off' && <span className="text-slate-500 font-bold">■</span>}
                      </td>
                    );
                  })}

                  {/* เลขที่ใบแจ้งซ่อม Column */}
                  <td className="border-l border-slate-900 py-0.5 px-1 text-center text-[8.5px] font-mono font-semibold text-rose-600 truncate">
                    {printMode === 'filled' ? (it.repairTicketNo || '') : ''}
                  </td>
                </tr>
              ))}

              {/* Table Bottom Row: ผู้ตรวจสอบ (Signatures / initials per day) */}
              <tr className="border-b border-slate-900 bg-slate-50/60">
                <td colSpan={4} className="border-r border-slate-900 p-1 text-center font-bold text-[10px]">
                  ผู้ตรวจสอบ
                </td>
                {daysArray.map((d) => {
                  const inspector = printMode === 'filled' ? days[d]?.inspectorName : '';
                  return (
                    <td key={d} className="border-r border-slate-300 p-0 text-center text-[7px] truncate max-w-[19px] last:border-r-0 font-medium text-slate-700">
                      {inspector ? (inspector === '-' ? '-' : inspector.split(' ')[0]) : ''}
                    </td>
                  );
                })}
                <td className="border-l border-slate-900 p-0 text-center"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Sign-off and Approval Footer matching user Image 2 */}
        <div className="border-x border-b border-slate-900 text-xs">
          <div className="grid grid-cols-12 divide-x divide-slate-900">
            {/* ผู้จัดทำ */}
            <div className="col-span-4 p-2.5 space-y-2">
              <div>
                ผู้จัดทำ ..............................................................
              </div>
              <div>
                ตำแหน่ง ..............................................................
              </div>
              <div>
                วันที่ .......... / .......... / ....................
              </div>
            </div>

            {/* ผู้อนุมัติ */}
            <div className="col-span-4 p-2.5 space-y-2">
              <div>
                ผู้อนุมัติ ..............................................................
              </div>
              <div>
                ตำแหน่ง ..............................................................
              </div>
              <div>
                วันที่ .......... / .......... / ....................
              </div>
            </div>

            {/* หมายเหตุ */}
            <div className="col-span-4 p-2.5 space-y-1">
              <div className="font-bold">หมายเหตุ:</div>
              <div className="text-[11px] text-slate-700 min-h-[36px] leading-relaxed">
                {sheet.remarks || '....................................................................................................'}
              </div>
            </div>
          </div>
        </div>

        {/* Authentic Legend line matching user Image 2 */}
        <div className="mt-2 text-[10px] text-slate-700 leading-relaxed font-sans px-1">
          <div className="flex flex-wrap items-center justify-between gap-y-1">
            <div className="flex items-center gap-6 font-semibold">
              <span><strong>D</strong> = ตรวจประจำวัน</span>
              <span><strong>W</strong> = ตรวจรายสัปดาห์</span>
              <span><strong>M</strong> = ตรวจรายเดือน</span>
            </div>
            <div className="font-medium">
              การบันทึกผลที่ได้จากการตรวจสอบ : <span className="font-bold">/</span> = ปกติ , <span className="font-bold text-rose-600">x</span> = ผิดปกติ (รายละเอียดระบุในใบแจ้งซ่อม ตามเลขที่ใบแจ้งซ่อม)
            </div>
          </div>
        </div>

        {/* Sub-footer doc ref */}
        <div className="mt-3 flex items-center justify-between text-[9px] text-slate-500 font-mono border-t border-slate-200 pt-1.5">
          <div>
            บริษัท โค้ช แพคเกจจิ้ง แอนด์ แพคกิ้ง เซอร์วิสเซส จำกัด • โรงงานบางแสน BS
          </div>
          <div>
            {sheet.formCode || 'FM-MN01-04 Rev.00 Date 19/10/2026'}
          </div>
        </div>
      </div>
    </div>
  );
});

PrintableInspectionDocument.displayName = 'PrintableInspectionDocument';
