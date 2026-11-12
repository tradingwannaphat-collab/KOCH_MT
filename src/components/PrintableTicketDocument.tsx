import React from 'react';
import { Printer, Download, ArrowLeft, CheckSquare, Square, Share2 } from 'lucide-react';
import { MaintenanceTicket } from '../types/ticket';
import { KochLogo } from './KochLogo';

interface PrintableTicketDocumentProps {
  ticket: MaintenanceTicket;
  onBack?: () => void;
  allTickets?: MaintenanceTicket[];
  onSelectTicket?: (t: MaintenanceTicket) => void;
}

export const PrintableTicketDocument: React.FC<PrintableTicketDocumentProps> = ({
  ticket,
  onBack,
  allTickets = [],
  onSelectTicket
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-24">
      {/* Top Action Bar (hidden when printing) */}
      <div className="no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> ย้อนกลับ
            </button>
          )}
          <span className="text-xs sm:text-sm font-bold text-slate-800">
            เอกสารทางการ: FM-MN01-03 Rev.00
          </span>
        </div>

        {allTickets.length > 1 && onSelectTicket && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">เลือกใบงาน:</span>
            <select
              value={ticket.id}
              onChange={(e) => {
                const found = allTickets.find((t) => t.id === e.target.value);
                if (found) onSelectTicket(found);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono font-medium"
            >
              {allTickets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.ticketNo} - {t.machineNo} ({t.requesterName})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์ใบแจ้งซ่อม (Print / PDF)</span>
          </button>
        </div>
      </div>

      {/* Official Form Reproduction (Matching KOCH FM-MN01-03) */}
      <div className="print-page bg-white p-6 sm:p-10 border-2 border-black rounded-lg shadow-xl text-black font-sans leading-relaxed text-sm select-none">
        
        {/* Top Header Grid */}
        <div className="grid grid-cols-12 border-b-2 border-black pb-3">
          {/* KOCH Logo & Icon */}
          <div className="col-span-3 flex items-center">
            <KochLogo size="md" variant="full" textColor="dark" />
          </div>

          {/* Form Title */}
          <div className="col-span-6 flex items-center justify-center">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center">
              ใบแจ้งซ่อม
            </h1>
          </div>

          {/* Ticket Number Box */}
          <div className="col-span-3 border-l-2 border-black pl-3 flex flex-col justify-center">
            <div className="text-xs">
              <span className="font-semibold">เลขที่ : </span>
              <span className="font-mono font-bold text-sm text-blue-900">{ticket.ticketNo}</span>
            </div>
            <div className="text-[11px] text-slate-700 mt-1 font-medium">
              สำหรับเจ้าหน้าที่ซ่อมบำรุง
            </div>
          </div>
        </div>

        {/* Section 1: Requester & Asset Information */}
        <div className="border-b-2 border-black py-2.5 text-xs sm:text-sm">
          <div className="grid grid-cols-12 gap-y-2">
            
            {/* Left Info Column */}
            <div className="col-span-7 pr-2 space-y-1.5">
              <div className="flex items-baseline">
                <span className="font-semibold w-16 shrink-0">วันที่ :</span>
                <span className="border-b border-dotted border-black flex-1 font-medium px-2">
                  {ticket.requestDate}
                </span>
              </div>

              <div className="flex items-baseline">
                <span className="font-semibold w-16 shrink-0">ชื่อ :</span>
                <span className="border-b border-dotted border-black flex-1 font-medium px-2">
                  {ticket.requesterName}
                </span>
              </div>

              <div className="flex items-baseline">
                <span className="font-semibold w-16 shrink-0">แผนก :</span>
                <span className="border-b border-dotted border-black flex-1 font-medium px-2">
                  {ticket.department}
                </span>
              </div>
            </div>

            {/* Right Info Column (Category & Machine) */}
            <div className="col-span-5 pl-2 space-y-1.5">
              {/* Category Checkboxes */}
              <div className="flex items-center gap-4 py-0.5">
                <div className="flex items-center gap-1.5">
                  <div className={`w-3.5 h-3.5 border border-black flex items-center justify-center ${ticket.category === 'machine' ? 'bg-black text-white' : ''}`}>
                    {ticket.category === 'machine' && '✓'}
                  </div>
                  <span className="font-bold">เครื่องจักร</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className={`w-3.5 h-3.5 border border-black flex items-center justify-center ${ticket.category === 'infrastructure' ? 'bg-black text-white' : ''}`}>
                    {ticket.category === 'infrastructure' && '✓'}
                  </div>
                  <span className="font-bold">โครงสร้างพื้นฐาน</span>
                </div>
              </div>

              <div className="flex items-baseline">
                <span className="font-semibold w-20 shrink-0">หมายเลข :</span>
                <span className="border-b border-dotted border-black flex-1 font-mono font-bold px-2 text-blue-900">
                  {ticket.machineNo}
                </span>
              </div>

              <div className="flex items-baseline">
                <span className="font-semibold w-20 shrink-0">สถานที่ใช้งาน :</span>
                <span className="border-b border-dotted border-black flex-1 font-medium px-2">
                  {ticket.location}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Section 2: Problem Description */}
        <div className="border-b-2 border-black py-2">
          <div className="font-bold text-xs sm:text-sm mb-1">รายละเอียดของปัญหา</div>
          <div className="min-h-24 sm:min-h-28 text-xs sm:text-sm leading-relaxed p-2 font-medium bg-slate-50/50 rounded">
            {ticket.problemDescription}
          </div>
        </div>

        {/* Section 3: Middle Requester & Receiver Sign-off */}
        <div className="grid grid-cols-2 border-b-2 border-black text-xs sm:text-sm divide-x-2 divide-black">
          {/* Left: ผู้แจ้ง */}
          <div className="p-3 text-center flex flex-col justify-between min-h-24">
            <div className="font-bold">ผู้แจ้ง</div>
            <div className="my-1">
              {ticket.requesterSign?.signatureDataUrl ? (
                <img src={ticket.requesterSign.signatureDataUrl} alt="ลายเซ็นผู้แจ้ง" className="h-8 mx-auto" />
              ) : (
                <span className="font-medium text-slate-700">({ticket.requesterName})</span>
              )}
            </div>
            <div className="text-[11px] text-slate-700">
              วันที่ {ticket.requestDate} เวลา {ticket.requestTime} น.
            </div>
          </div>

          {/* Right: ผู้รับแจ้ง */}
          <div className="p-3 text-center flex flex-col justify-between min-h-24">
            <div className="font-bold">ผู้รับแจ้ง</div>
            <div className="my-1">
              {ticket.receiverSign?.isSigned ? (
                <span className="font-medium text-slate-700">({ticket.receiverSign.name || 'ประสิทธิ์ วิศวกร'})</span>
              ) : (
                <span className="font-medium text-slate-500">(นายประสิทธิ์ วิศวกรซ่อมบำรุง)</span>
              )}
            </div>
            <div className="text-[11px] text-slate-700">
              วันที่ {ticket.receiverSign?.date || ticket.requestDate} เวลา {ticket.receiverSign?.time || '08:30'} น.
            </div>
          </div>
        </div>

        {/* Section 4: Root Cause (Left) vs Repair & Spare Parts (Right) */}
        <div className="grid grid-cols-2 border-b-2 border-black text-xs sm:text-sm divide-x-2 divide-black">
          
          {/* Left: สาเหตุ */}
          <div className="p-3 space-y-2">
            <div className="font-bold text-center border-b border-black pb-1">
              สาเหตุ
            </div>

            <div className="grid grid-cols-2 gap-y-2 pt-1">
              <div className="flex items-center gap-1.5">
                <div className={`w-3.5 h-3.5 border border-black flex items-center justify-center ${ticket.rootCause === 'lack_of_maintenance' ? 'bg-black text-white font-bold' : ''}`}>
                  {ticket.rootCause === 'lack_of_maintenance' && '✓'}
                </div>
                <span>ขาดการบำรุงรักษา</span>
              </div>

              <div className="flex items-center gap-1.5">
                <div className={`w-3.5 h-3.5 border border-black flex items-center justify-center ${ticket.rootCause === 'substandard_parts' ? 'bg-black text-white font-bold' : ''}`}>
                  {ticket.rootCause === 'substandard_parts' && '✓'}
                </div>
                <span>อะไหล่ไม่มีคุณภาพ</span>
              </div>

              <div className="flex items-center gap-1.5">
                <div className={`w-3.5 h-3.5 border border-black flex items-center justify-center ${ticket.rootCause === 'misuse' ? 'bg-black text-white font-bold' : ''}`}>
                  {ticket.rootCause === 'misuse' && '✓'}
                </div>
                <span>ใช้งานผิดประเภท</span>
              </div>

              <div className="flex items-center gap-1.5">
                <div className={`w-3.5 h-3.5 border border-black flex items-center justify-center ${ticket.rootCause === 'other' ? 'bg-black text-white font-bold' : ''}`}>
                  {ticket.rootCause === 'other' && '✓'}
                </div>
                <span>อื่นๆ {ticket.rootCauseOtherText || '...............'}</span>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-700">
              <span className="font-semibold">รายละเอียดสาเหตุ: </span>
              <span>{ticket.rootCauseDetail || 'ตรวจพบชิ้นส่วนสึกหรอตามชั่วโมงการทำงาน'}</span>
            </div>
          </div>

          {/* Right: รายละเอียดการซ่อม / เปลี่ยนอะไหล่ */}
          <div className="p-3 flex flex-col justify-between">
            <div>
              <div className="font-bold text-center border-b border-black pb-1">
                รายละเอียดการซ่อม / เปลี่ยนอะไหล่
              </div>
              <div className="pt-2 text-xs leading-relaxed">
                <p>{ticket.repairDetails || 'ทำการถอดประกอบและตรวจสอบแก้ไขระบบเรียบร้อย'}</p>
                
                {ticket.spareParts && ticket.spareParts.length > 0 && (
                  <div className="mt-2 text-[11px] border-t border-dotted border-black pt-1">
                    <span className="font-semibold block mb-0.5">รายการเปลี่ยนอะไหล่:</span>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {ticket.spareParts.map((sp) => (
                        <li key={sp.id}>
                          {sp.name} {sp.partNo && `[${sp.partNo}]`} จำนวน {sp.quantity} {sp.unit}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Section 5: Target Schedule (Left) vs Technicians (Right) */}
        <div className="grid grid-cols-2 border-b-2 border-black text-xs sm:text-sm divide-x-2 divide-black">
          {/* Left: เป้าหมายการปฏิบัติงาน */}
          <div className="p-3 space-y-1.5">
            <div className="font-bold mb-2">เป้าหมายการปฏิบัติงาน</div>
            
            <div className="flex items-baseline">
              <span className="w-24 shrink-0 font-medium">วันที่เริ่มซ่อม :</span>
              <span className="border-b border-dotted border-black flex-1 px-1">
                {ticket.startDate || ticket.requestDate} เวลา {ticket.startTime || '08:45 น.'}
              </span>
            </div>

            <div className="flex items-baseline">
              <span className="w-24 shrink-0 font-medium">วันที่ซ่อมเสร็จ :</span>
              <span className="border-b border-dotted border-black flex-1 px-1">
                {ticket.endDate || ticket.requestDate} เวลา {ticket.endTime || '12:00 น.'}
              </span>
            </div>

            <div className="flex items-baseline">
              <span className="w-28 shrink-0 font-medium">ระยะเวลาดำเนินการ :</span>
              <span className="border-b border-dotted border-black flex-1 px-1">
                {ticket.durationText || '3 ชม. 15 นาที'}
              </span>
            </div>
          </div>

          {/* Right: ผู้ปฏิบัติงาน */}
          <div className="p-3 space-y-1.5">
            <div className="font-bold mb-2">ผู้ปฏิบัติงาน</div>
            
            <div className="flex items-baseline">
              <span className="w-6 shrink-0 font-bold">1</span>
              <span className="border-b border-dotted border-black flex-1 px-2 font-medium">
                {ticket.technicians[0] || 'นายประสิทธิ์ วิศวกร'}
              </span>
            </div>

            <div className="flex items-baseline">
              <span className="w-6 shrink-0 font-bold">2</span>
              <span className="border-b border-dotted border-black flex-1 px-2 font-medium">
                {ticket.technicians[1] || 'นายณรงค์ ช่างกล'}
              </span>
            </div>

            <div className="flex items-baseline">
              <span className="w-6 shrink-0 font-bold">3</span>
              <span className="border-b border-dotted border-black flex-1 px-2 font-medium">
                {ticket.technicians[2] || '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 6: Bottom Sign-off (3 Columns) */}
        <div className="grid grid-cols-3 border-b-2 border-black text-xs sm:text-sm divide-x-2 divide-black">
          {/* Column 1: ผู้แจ้งซ่อม */}
          <div className="p-3 text-center flex flex-col justify-between min-h-28">
            <div className="font-bold">ผู้แจ้งซ่อม</div>
            <div className="my-1">
              {ticket.requesterApproval?.signatureDataUrl ? (
                <img src={ticket.requesterApproval.signatureDataUrl} alt="ลายเซ็นผู้แจ้ง" className="h-7 mx-auto" />
              ) : ticket.requesterApproval?.isSigned ? (
                <span className="font-semibold text-slate-800">({ticket.requesterApproval.name})</span>
              ) : (
                <span className="text-slate-400">(...................................................)</span>
              )}
            </div>
            <div className="text-[11px] text-slate-700">
              วันที่ {ticket.requesterApproval?.date || '......./......./.......'} เวลา {ticket.requesterApproval?.time || '..................'}
            </div>
          </div>

          {/* Column 2: ผู้ซ่อม */}
          <div className="p-3 text-center flex flex-col justify-between min-h-28">
            <div className="font-bold">ผู้ซ่อม</div>
            <div className="my-1">
              {ticket.technicianApproval?.signatureDataUrl ? (
                <img src={ticket.technicianApproval.signatureDataUrl} alt="ลายเซ็นผู้ซ่อม" className="h-7 mx-auto" />
              ) : ticket.technicianApproval?.isSigned ? (
                <span className="font-semibold text-slate-800">({ticket.technicianApproval.name})</span>
              ) : (
                <span className="text-slate-400">(...................................................)</span>
              )}
            </div>
            <div className="text-[11px] text-slate-700">
              วันที่ {ticket.technicianApproval?.date || '......./......./.......'} เวลา {ticket.technicianApproval?.time || '..................'}
            </div>
          </div>

          {/* Column 3: หัวหน้าแผนกซ่อมบำรุง */}
          <div className="p-3 text-center flex flex-col justify-between min-h-28">
            <div className="font-bold">หัวหน้าแผนกซ่อมบำรุง</div>
            <div className="my-1">
              {ticket.supervisorApproval?.signatureDataUrl ? (
                <img src={ticket.supervisorApproval.signatureDataUrl} alt="ลายเซ็นหัวหน้า" className="h-7 mx-auto" />
              ) : ticket.supervisorApproval?.isSigned ? (
                <span className="font-semibold text-slate-800">({ticket.supervisorApproval.name})</span>
              ) : (
                <span className="text-slate-400">(...................................................)</span>
              )}
            </div>
            <div className="text-[11px] text-slate-700">
              วันที่ {ticket.supervisorApproval?.date || '......./......./.......'} เวลา {ticket.supervisorApproval?.time || '..................'}
            </div>
          </div>
        </div>

        {/* Footer Code */}
        <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-slate-800 font-semibold">
          <span>KOCH MAINTENANCE MANAGEMENT SYSTEM</span>
          <span>FM-MN01-03 Rev.00 Date 19/10/2026</span>
        </div>

      </div>
    </div>
  );
};
