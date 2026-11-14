import React, { useState, useMemo, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Printer,
  Download,
  Search,
  Tag,
  CheckSquare,
  Square,
  Loader2,
  QrCode,
  Scissors,
  Grid,
  Zap,
  MapPin,
  Copy
} from 'lucide-react';
import { MachineAsset } from '../types/ticket';
import { KochLogo } from './KochLogo';
import { exportPagesToPdf, printElementOnly } from '../utils/pdfExport';

interface MachineTagPrintManagerProps {
  machines: MachineAsset[];
}

type LabelFormat = 'medium_8' | 'large_4' | 'compact_15';

export const MachineTagPrintManager: React.FC<MachineTagPrintManagerProps> = ({ machines }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'machine' | 'office' | 'infrastructure'>('all');
  const [labelFormat, setLabelFormat] = useState<LabelFormat>('medium_8');
  const [copiesPerMachine, setCopiesPerMachine] = useState<1 | 2>(1);
  const [showQrCode, setShowQrCode] = useState(true);
  const [showCutLines, setShowCutLines] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => machines.map((m) => m.id));
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const sheetsContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Filter machines cleanly
  const filteredMachines = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return machines
      .filter((m) => {
        const matchCat =
          selectedCategory === 'all' ||
          (selectedCategory === 'infrastructure'
            ? m.category === 'infrastructure' || m.category === 'utility'
            : m.category === selectedCategory);
        const matchSearch =
          !q ||
          (m.tagCode && m.tagCode.toLowerCase().includes(q)) ||
          m.code.toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q) ||
          (m.model && m.model.toLowerCase().includes(q)) ||
          m.department.toLowerCase().includes(q) ||
          m.location.toLowerCase().includes(q);
        return matchCat && matchSearch;
      })
      .sort((a, b) => (a.no || 0) - (b.no || 0));
  }, [machines, searchQuery, selectedCategory]);

  const toggleMachine = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllVisible = () => {
    const visibleIds = filteredMachines.map((m) => m.id);
    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  // Expanded list of tags to print (honoring copiesPerMachine)
  const labelsToPrint = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    const ordered = filteredMachines.filter((m) => selectedSet.has(m.id));
    if (copiesPerMachine === 1) return ordered;
    return ordered.flatMap((m) => [m, m]);
  }, [filteredMachines, selectedIds, copiesPerMachine]);

  const perPage = labelFormat === 'large_4' ? 4 : labelFormat === 'compact_15' ? 15 : 8;

  // Split labels into exact A4 sheet chunks so printing never splits a tag across page boundaries
  const a4Pages = useMemo(() => {
    const chunks: MachineAsset[][] = [];
    for (let i = 0; i < labelsToPrint.length; i += perPage) {
      chunks.push(labelsToPrint.slice(i, i + perPage));
    }
    return chunks;
  }, [labelsToPrint, perPage]);

  const baseAppUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const getMachineQrUrl = (m: MachineAsset) =>
    `${baseAppUrl}/?machine=${encodeURIComponent(m.code)}`;

  const handleDownloadPdf = async () => {
    const validEls = pageRefs.current.slice(0, a4Pages.length).filter((el): el is HTMLDivElement => Boolean(el));
    if (validEls.length === 0) return;
    setIsExportingPdf(true);
    try {
      const formatLabel = labelFormat === 'large_4' ? 'ขนาดใหญ่4ป้าย' : labelFormat === 'compact_15' ? 'ขนาดเล็ก15ป้าย' : 'มาตรฐาน8ป้าย';
      await exportPagesToPdf(validEls, `ป้ายติดหน้าเครื่องจักร_KOCH_${formatLabel}.pdf`, {
        orientation: 'portrait',
        fitToOnePage: true,
        marginMm: 5
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrintSheets = () => {
    printElementOnly(sheetsContainerRef.current, 'ป้ายติดหน้าเครื่องจักร_KOCH', 'portrait');
  };

  return (
    <div className="space-y-4">
      {/* Control Toolbar & Filter Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Tag className="w-5 h-5 text-blue-600 shrink-0" />
              <span>รายการป้ายติดหน้าเครื่องจักร (Printable Machine Nameplate List)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              เลือกรายชื่อเครื่องจักรและขนาดป้าย เพื่อสั่งพิมพ์หรือดาวน์โหลด PDF สำหรับตัด-เคลือบติดหน้าเครื่องจักรหน้างาน
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={labelsToPrint.length === 0 || isExportingPdf}
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer whitespace-nowrap"
            >
              {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{isExportingPdf ? 'กำลังสร้าง PDF...' : `บันทึกเป็น PDF (${a4Pages.length} หน้า)`}</span>
            </button>

            <button
              type="button"
              disabled={labelsToPrint.length === 0}
              onClick={handlePrintSheets}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ป้าย A4 ({labelsToPrint.length} ป้าย)</span>
            </button>
          </div>
        </div>

        {/* Label Format, Copies, and Options */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
          {/* Format Selector */}
          <div className="lg:col-span-6 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1">
              <Grid className="w-3.5 h-3.5 text-slate-500" />
              ขนาดป้าย:
            </span>
            <button
              type="button"
              onClick={() => setLabelFormat('large_4')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                labelFormat === 'large_4'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              ใหญ่พิเศษ (4 ป้าย/A4)
            </button>
            <button
              type="button"
              onClick={() => setLabelFormat('medium_8')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                labelFormat === 'medium_8'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              มาตรฐาน (8 ป้าย/A4)
            </button>
            <button
              type="button"
              onClick={() => setLabelFormat('compact_15')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                labelFormat === 'compact_15'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              สติกเกอร์เล็ก (15 ป้าย/A4)
            </button>
          </div>

          {/* Toggles */}
          <div className="lg:col-span-6 flex flex-wrap items-center lg:justify-end gap-2">
            <button
              type="button"
              onClick={() => setCopiesPerMachine(copiesPerMachine === 1 ? 2 : 1)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                copiesPerMachine === 2
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              title="พิมพ์เครื่องละ 2 ป้าย (สำหรับติดด้านหน้าและด้านหลังเครื่อง)"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiesPerMachine === 2 ? '2 ป้าย / เครื่อง' : '1 ป้าย / เครื่อง'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowQrCode((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                showQrCode
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR สแกนแจ้งซ่อม</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCutLines((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                showCutLines
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>เส้นประตัดป้าย</span>
            </button>
          </div>
        </div>

        {/* Search, Category Filter & Interactive Machine Selection List */}
        <div className="border-t border-slate-100 pt-3 space-y-2.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหา Tag (BS-01), รหัสทรัพย์สิน (MA...), ชื่อเครื่อง, แผนก..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-hidden"
            >
              <option value="all">ทุกหมวดหมู่ ({machines.length})</option>
              <option value="machine">เครื่องจักรไลน์ผลิต</option>
              <option value="office">เครื่องใน Office &amp; แอร์</option>
              <option value="infrastructure">สาธารณูปโภค / Utility</option>
            </select>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={selectAllVisible}
                className="px-3 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition cursor-pointer whitespace-nowrap"
              >
                เลือกทั้งหมดที่แสดง ({filteredMachines.length})
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition cursor-pointer whitespace-nowrap"
              >
                ล้างที่เลือก
              </button>
            </div>
          </div>

          {/* Compact Scrollable Machine Selection List */}
          <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/40">
            {filteredMachines.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                ไม่พบเครื่องจักรที่ตรงกับการค้นหา
              </div>
            ) : (
              filteredMachines.map((m, i) => {
                const checked = selectedIds.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className={`flex items-center justify-between gap-3 px-3 py-2 text-xs cursor-pointer transition ${
                      checked ? 'bg-blue-50/70 hover:bg-blue-50' : 'hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMachine(m.id)}
                        className="sr-only"
                      />
                      {checked ? (
                        <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span className="font-mono text-[11px] text-slate-400 w-6 tabular-nums shrink-0">
                        {String(m.no || i + 1).padStart(2, '0')}
                      </span>
                      <span className="font-mono font-extrabold text-slate-900 bg-white border border-slate-300 px-2 py-0.5 rounded shrink-0">
                        {m.tagCode || m.code}
                      </span>
                      <span className="font-bold text-slate-900 truncate">{m.name}</span>
                      <span className="text-[11px] font-mono text-slate-500 hidden sm:inline shrink-0">
                        {m.code}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 shrink-0">
                      <span className="hidden md:inline truncate max-w-[160px]">{m.department}</span>
                      <span className="hidden lg:inline font-mono">{m.power || '-'}</span>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================
          PRINTABLE A4 LABEL SHEETS PREVIEW
         ======================================================================== */}
      {labelsToPrint.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-2">
          <Tag className="w-8 h-8 text-slate-300 mx-auto" />
          <div className="text-sm font-bold text-slate-700">ยังไม่ได้เลือกเครื่องจักรสำหรับพิมพ์ป้าย</div>
          <p className="text-xs text-slate-500">ติ๊กเลือกเครื่องจักรจากรายการด้านบน หรือกด &quot;เลือกทั้งหมดที่แสดง&quot; เพื่อสร้างป้ายพิมพ์ A4</p>
        </div>
      ) : (
        <div ref={sheetsContainerRef} className="space-y-6 print:space-y-0">
          {a4Pages.map((pageMachines, pageIdx) => (
            <div
              key={pageIdx}
              style={{
                breakAfter: pageIdx < a4Pages.length - 1 ? 'page' : 'auto',
                pageBreakAfter: pageIdx < a4Pages.length - 1 ? 'always' : 'auto'
              }}
              className="space-y-1.5 print:space-y-0"
            >
              {/* Sheet Page Indicator (hidden on print/PDF) */}
              <div className="flex items-center justify-between text-xs text-slate-500 px-1 no-print print:hidden">
                <span className="font-bold text-slate-700">
                  แผ่นที่ {pageIdx + 1} / {a4Pages.length} ({pageMachines.length} ป้าย)
                </span>
                <span className="font-mono text-[11px]">ขนาด A4 แนวตั้ง (210 × 297 mm)</span>
              </div>

              {/* Exact A4 Sheet Surface */}
              <div
                ref={(el) => {
                  pageRefs.current[pageIdx] = el;
                }}
                className="w-full max-w-[794px] mx-auto bg-white p-4 sm:p-5 border border-slate-300 shadow-sm print:shadow-none print:border-none print:p-0 text-slate-900"
              >
                {/* Sheet Mini Header */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 border-b border-slate-200 pb-1.5 mb-2.5">
                  <span className="font-bold text-slate-700">KOCH PACKAGING &amp; PACKAGE SERVICES — MACHINE IDENTIFICATION TAGS</span>
                  <span className="font-mono">FM-MN01-01 · แผ่น {pageIdx + 1}/{a4Pages.length}</span>
                </div>

                {/* Label Grid per format */}
                <div
                  className={
                    labelFormat === 'large_4'
                      ? 'grid grid-cols-2 gap-3'
                      : labelFormat === 'compact_15'
                      ? 'grid grid-cols-3 gap-2'
                      : 'grid grid-cols-2 gap-2.5'
                  }
                >
                  {pageMachines.map((m, tagIdx) => {
                    const displayTag = m.tagCode || m.code;
                    const qrValue = getMachineQrUrl(m);

                    if (labelFormat === 'large_4') {
                      /* LARGE 2x2 NAMEPLATE (440px+ tall crisp card) */
                      return (
                        <div
                          key={`${m.id}-${tagIdx}`}
                          className={`bg-white flex flex-col justify-between p-3.5 min-h-[430px] ${
                            showCutLines ? 'border-2 border-dashed border-slate-400' : 'border-2 border-slate-900'
                          }`}
                        >
                          <div className="border-2 border-slate-900 h-full flex flex-col justify-between">
                            {/* Top Brand + Tag Header */}
                            <div>
                              <div className="bg-slate-900 text-white px-3 py-2 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <KochLogo size="sm" variant="mark-only" textColor="white" />
                                  <div>
                                    <div className="text-[11px] font-extrabold tracking-wide leading-tight">KOCH PACKAGING</div>
                                    <div className="text-[9px] text-slate-300 leading-tight">ทะเบียนเครื่องจักรมาตรฐาน</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-[8px] text-slate-300">ลำดับ #{m.no || tagIdx + 1}</div>
                                  <div className="text-[10px] font-mono font-bold text-amber-300">FM-MN01-01</div>
                                </div>
                              </div>

                              {/* Huge Tag Code Banner */}
                              <div className="bg-red-700 text-white px-3 py-2 flex items-baseline justify-between border-b-2 border-slate-900">
                                <span className="text-[10px] font-bold tracking-wider">MACHINE TAG</span>
                                <span className="text-3xl font-mono font-black tracking-tight tabular-nums">{displayTag}</span>
                              </div>

                              {/* Machine Name & Asset Code */}
                              <div className="p-3 border-b border-slate-300 space-y-1">
                                <div className="text-[10px] font-bold text-slate-500">ชื่อเครื่องจักร / อุปกรณ์</div>
                                <div className="text-lg font-extrabold text-slate-900 leading-tight">{m.name}</div>
                                <div className="flex items-center justify-between text-xs pt-1">
                                  <span className="text-slate-600">
                                    รหัสทรัพย์สิน: <strong className="font-mono text-slate-950">{m.code}</strong>
                                  </span>
                                  {m.model && <span className="text-slate-600 font-mono text-[11px]">Model: {m.model}</span>}
                                </div>
                              </div>

                              {/* Technical Specs Grid */}
                              <div className="p-3 grid grid-cols-2 gap-y-2 gap-x-2 text-[11px] border-b border-slate-300 bg-slate-50/70">
                                <div>
                                  <div className="text-[9px] text-slate-500 font-semibold">แผนก / กระบวนการ</div>
                                  <div className="font-bold text-slate-900 truncate">{m.department} ({m.processName || '-'})</div>
                                </div>
                                <div>
                                  <div className="text-[9px] text-slate-500 font-semibold">สถานที่ติดตั้ง</div>
                                  <div className="font-bold text-slate-900 truncate">{m.location}</div>
                                </div>
                                <div>
                                  <div className="text-[9px] text-slate-500 font-semibold">ระบบไฟฟ้า / Power</div>
                                  <div className="font-mono font-semibold text-slate-900 truncate">{m.power || '-'}</div>
                                </div>
                                <div>
                                  <div className="text-[9px] text-slate-500 font-semibold">สเปกมอเตอร์ / kW-HP</div>
                                  <div className="font-mono font-semibold text-slate-900 truncate">{m.kwHp || m.motorSpec || '-'}</div>
                                </div>
                              </div>
                            </div>

                            {/* Bottom QR + Daily Check Reminder */}
                            <div className="p-2.5 flex items-center justify-between gap-3 bg-white">
                              <div className="space-y-1 text-[10px] flex-1">
                                <div className="font-extrabold text-slate-900">มาตรฐานซ่อมบำรุงหน้างาน</div>
                                <div className="text-slate-700 leading-snug">
                                  • ตรวจเช็คก่อนเริ่มงาน 08:00 น. (FM-MN01-04)<br />
                                  • พบอาการผิดปกติ สแกนแจ้งซ่อม (FM-MN01-03)
                                </div>
                                <div className="text-[9px] font-mono text-slate-500 pt-0.5">
                                  S/N: {m.serialNo || m.code}
                                </div>
                              </div>
                              {showQrCode && (
                                <div className="p-1.5 border border-slate-300 rounded bg-white text-center shrink-0">
                                  <QRCodeSVG value={qrValue} size={72} level="M" />
                                  <div className="text-[8px] font-mono font-bold text-slate-700 mt-0.5">{displayTag}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (labelFormat === 'compact_15') {
                      /* COMPACT 3x5 STICKER (15 tags / A4) */
                      return (
                        <div
                          key={`${m.id}-${tagIdx}`}
                          className={`bg-white p-1.5 ${
                            showCutLines ? 'border border-dashed border-slate-400' : 'border border-slate-800'
                          }`}
                        >
                          <div className="border border-slate-900 p-2 h-[170px] flex flex-col justify-between">
                            <div className="flex items-center justify-between border-b border-slate-900 pb-1">
                              <span className="text-[9px] font-black tracking-tight text-red-700">KOCH BS</span>
                              <span className="text-sm font-mono font-black text-slate-950 tabular-nums">{displayTag}</span>
                            </div>

                            <div className="py-1 flex-1 flex flex-col justify-center">
                              <div className="text-xs font-extrabold text-slate-900 leading-tight line-clamp-2">
                                {m.name}
                              </div>
                              <div className="text-[10px] font-mono font-bold text-slate-700 mt-0.5">
                                Code: {m.code}
                              </div>
                              <div className="text-[9px] text-slate-500 truncate mt-0.5">
                                {m.department}
                              </div>
                            </div>

                            <div className="flex items-end justify-between gap-1.5 border-t border-slate-200 pt-1">
                              <div className="text-[8px] text-slate-600 leading-tight">
                                <div className="font-mono truncate max-w-[110px]">{m.power || 'มาตรฐาน KOCH'}</div>
                                <div>FM-MN01-01 / 04</div>
                              </div>
                              {showQrCode && (
                                <div className="shrink-0">
                                  <QRCodeSVG value={qrValue} size={38} level="L" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    /* MEDIUM 2x4 STANDARD TAG (8 tags / A4) */
                    return (
                      <div
                        key={`${m.id}-${tagIdx}`}
                        className={`bg-white p-2 ${
                          showCutLines ? 'border border-dashed border-slate-400' : 'border border-slate-800'
                        }`}
                      >
                        <div className="border-2 border-slate-900 h-[216px] flex flex-col justify-between overflow-hidden">
                          {/* Card Top Bar */}
                          <div className="bg-slate-900 text-white px-2.5 py-1.5 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <KochLogo size="sm" variant="mark-only" textColor="white" />
                              <span className="text-[10px] font-extrabold tracking-wide truncate">
                                KOCH MACHINE TAG
                              </span>
                            </div>
                            <span className="bg-red-600 text-white px-2 py-0.5 text-sm font-mono font-black tracking-tight rounded-xs shrink-0 tabular-nums">
                              {displayTag}
                            </span>
                          </div>

                          {/* Card Body */}
                          <div className="p-2.5 flex items-center justify-between gap-2.5 flex-1">
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="text-sm font-extrabold text-slate-950 leading-tight line-clamp-2">
                                {m.name}
                              </div>
                              <div className="text-[11px] font-mono font-bold text-blue-900">
                                รหัสทรัพย์สิน: {m.code}
                              </div>
                              <div className="text-[10px] text-slate-600 flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{m.department} · {m.location}</span>
                              </div>
                              <div className="text-[10px] text-slate-700 font-mono flex items-center gap-1 truncate">
                                <Zap className="w-3 h-3 text-amber-600 shrink-0" />
                                <span className="truncate">{m.power || m.kwHp || 'เช็คก่อนเดินเครื่อง 08:00'}</span>
                              </div>
                            </div>

                            {showQrCode && (
                              <div className="border border-slate-300 p-1 rounded bg-white text-center shrink-0">
                                <QRCodeSVG value={qrValue} size={64} level="M" />
                                <div className="text-[7px] font-mono font-bold text-slate-600 mt-0.5">SCAN CHECK</div>
                              </div>
                            )}
                          </div>

                          {/* Card Footer */}
                          <div className="bg-slate-100 border-t border-slate-300 px-2.5 py-1 flex items-center justify-between text-[9px] font-semibold text-slate-700">
                            <span>ตรวจประจำวัน FM-MN01-04</span>
                            <span className="font-mono text-slate-900">แจ้งซ่อม: FM-MN01-03</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
