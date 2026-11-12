import React, { useState, useRef } from 'react';
import { MachineAsset } from '../types/ticket';
import { KochLogo } from './KochLogo';
import { Printer, ArrowLeft, Filter, Download, CheckCircle2, Loader2, FileText } from 'lucide-react';
import { exportElementToPdf } from '../utils/pdfExport';

interface PrintableMachineRegistryDocumentProps {
  machines: MachineAsset[];
  onBack: () => void;
}

export const PrintableMachineRegistryDocument: React.FC<PrintableMachineRegistryDocumentProps> = ({
  machines,
  onBack
}) => {
  const [filterCategory, setFilterCategory] = useState<'all' | 'machine' | 'office' | 'infrastructure'>('all');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const documentRef = useRef<HTMLDivElement>(null);

  const filteredMachines = machines.filter((m) => {
    if (filterCategory === 'all') return true;
    if (filterCategory === 'office') return m.category === 'office';
    if (filterCategory === 'machine') return m.category === 'machine';
    if (filterCategory === 'infrastructure') return m.category === 'infrastructure';
    return true;
  });

  const handlePrint = () => {
    const prevTitle = document.title;
    document.title = 'รายชื่อทะเบียนเครื่องมือ-เครื่องจักร FM-MN01-01 Rev.00 Date 19/10/2026';
    window.print();
    document.title = prevTitle;
  };

  const handleDownloadPdf = async () => {
    if (!documentRef.current) return;
    setIsDownloadingPdf(true);
    await exportElementToPdf(
      documentRef.current,
      'รายชื่อทะเบียนเครื่องมือ-เครื่องจักร_FM-MN01-01.pdf'
    );
    setIsDownloadingPdf(false);
  };

  return (
    <div className="min-h-screen bg-slate-100/80 py-6 px-3 sm:px-6">
      {/* Print Control Toolbar (hidden when printing) */}
      <div className="max-w-5xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ย้อนกลับ</span>
          </button>
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>รายชื่อทะเบียนเครื่องมือ-เครื่องจักร (ตาราง PDF)</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              หมายเลขเอกสาร: FM-MN01-01 Rev.00 Date 19/10/2026
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as any)}
              className="text-xs font-medium text-slate-700 bg-transparent border-0 focus:outline-hidden cursor-pointer pr-2"
            >
              <option value="all">ทั้งหมด ({machines.length} รายการ)</option>
              <option value="machine">เฉพาะเครื่องจักรไลน์ผลิต</option>
              <option value="office">เฉพาะเครื่องใน Office / ปรับอากาศ</option>
              <option value="infrastructure">เฉพาะระบบสาธารณูปโภค / ปั๊ม</option>
            </select>
          </div>

          {/* Download PDF directly */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            title="ดาวน์โหลดไฟล์ PDF ทันที (ชื่อไฟล์: รายชื่อทะเบียนเครื่องมือ-เครื่องจักร_FM-MN01-01.pdf)"
          >
            {isDownloadingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังสร้าง PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลดเป็น PDF</span>
              </>
            )}
          </button>

          {/* Print A4 */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            title="พิมพ์เอกสารออกเครื่องพิมพ์ หรือเลือก Save as PDF"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์เอกสาร A4 (PDF)</span>
          </button>
        </div>
      </div>

      {/* Official Form FM-MN01-01 Document matching Image 2 */}
      <div 
        ref={documentRef}
        id="pdf-registry-container"
        className="max-w-[900px] mx-auto bg-white p-8 sm:p-12 shadow-lg rounded-xl border border-slate-300 print:shadow-none print:border-none print:p-0 print:max-w-none text-slate-900 font-sans"
      >
        {/* Header Section */}
        <div className="relative mb-3 flex items-start justify-between">
          <div className="pt-1">
            <KochLogo size="md" variant="full" />
          </div>

          <div className="flex-1 text-center pr-12">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
              บริษัท โค้ช แพคเกจจิ้ง แอนด์ แพคกิ้ง เซอร์วิสเซส จำกัด
            </h1>
            <h2 className="text-sm sm:text-base font-bold text-slate-800 mt-1">
              รายชื่อทะเบียนเครื่องมือ-เครื่องจักร
            </h2>
          </div>
        </div>

        {/* Official Registry Table matching Image 2 */}
        <div className="border-2 border-slate-900 overflow-hidden mt-4">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-900 bg-slate-100 font-bold text-slate-900 text-center">
                <th className="border-r border-slate-900 py-1.5 px-2 w-14 text-center">
                  ลำดับ
                </th>
                <th className="border-r border-slate-900 py-1.5 px-3 w-36 text-center">
                  รหัสเครื่องมือ
                </th>
                <th className="border-r border-slate-900 py-1.5 px-3 text-center">
                  ชื่อเครื่อง
                </th>
                <th className="border-r border-slate-900 py-1.5 px-3 w-48 text-center">
                  Model
                </th>
                <th className="py-1.5 px-3 w-36 text-center">
                  Serial No.
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredMachines.map((m, index) => (
                <tr
                  key={m.id || index}
                  className="border-b border-slate-400 hover:bg-slate-50/60 transition"
                >
                  <td className="border-r border-slate-900 py-1.5 px-2 text-center font-medium">
                    {m.no || index + 1}
                  </td>
                  <td className="border-r border-slate-900 py-1.5 px-3 text-left font-mono font-medium">
                    {m.code}
                  </td>
                  <td className="border-r border-slate-900 py-1.5 px-3 text-left">
                    <span className="font-medium text-slate-900">{m.name}</span>
                    {m.category === 'office' && (
                      <span className="ml-2 text-[10px] text-slate-400 print:hidden">
                        (Office)
                      </span>
                    )}
                  </td>
                  <td className="border-r border-slate-900 py-1.5 px-3 text-left">
                    {m.model && m.model !== '-' ? (
                      <span className="font-medium text-slate-800">{m.model}</span>
                    ) : (
                      <span className="text-slate-400"></span>
                    )}
                  </td>
                  <td className="py-1.5 px-3 text-left">
                    {m.serialNo && m.serialNo !== '-' ? (
                      <span className="font-mono text-slate-800">{m.serialNo}</span>
                    ) : (
                      <span className="text-slate-400"></span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Document Code matching FM-MN01-01 */}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
          <div className="text-[11px] text-slate-500">
            โรงงานบางแสน BS • ข้อมูลทั้งหมด {filteredMachines.length} รายการ
          </div>
          <div className="font-mono font-medium text-slate-900 text-xs text-right">
            FM-MN01-01 Rev.00 Date 19/10/2026
          </div>
        </div>
      </div>
    </div>
  );
};
