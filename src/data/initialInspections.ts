import { 
  MachineMonthlyCheckSheet, 
  DEFAULT_INSPECTION_ITEMS, 
  SLOT_INSPECTION_ITEMS, 
  CUTTING_INSPECTION_ITEMS, 
  DailyCheckItem,
  DayCheckRecord, 
  InspectionResult 
} from '../types/inspection';
import { initialMachines } from './initialMachines';

export function getMachineDefaultItems(machineCode: string, machineName: string): DailyCheckItem[] {
  const code = (machineCode || '').toUpperCase();
  const name = (machineName || '').toLowerCase();

  if (code === 'MA2312014' || name.includes('slot') || code === 'BS-01') {
    return JSON.parse(JSON.stringify(SLOT_INSPECTION_ITEMS));
  }
  if (code === 'MA2312001' || name.includes('cutting') || code === 'BS-02') {
    return JSON.parse(JSON.stringify(CUTTING_INSPECTION_ITEMS));
  }
  return JSON.parse(JSON.stringify(DEFAULT_INSPECTION_ITEMS));
}

export function createEmptyMonthSheet(machineId: string, month: string = '2026-10'): MachineMonthlyCheckSheet {
  const machine = initialMachines.find((m) => m.id === machineId) || initialMachines[0];
  const items = getMachineDefaultItems(machine.code, machine.name);
  
  const days: Record<number, DayCheckRecord> = {};
  for (let d = 1; d <= 31; d++) {
    const results: Record<number, InspectionResult> = {};
    for (const it of items) {
      results[it.no] = null;
    }
    days[d] = {
      day: d,
      results,
      ticketNos: {},
      inspectorName: '',
      supervisorName: '',
      notes: ''
    };
  }

  return {
    id: `sheet-${machine.id}-${month}`,
    machineId: machine.id,
    machineNo: machine.code,
    machineName: `${machine.tagCode} : ${machine.name}`,
    department: 'ฝ่ายผลิต',
    month,
    items,
    days,
    remarks: 'ตรวจเช็คตามเกณฑ์มาตรฐานการตรวจสอบประจำวัน KOCH ก่อนเริ่มงานทุกเช้า 08:00 น.',
    approverName: 'สิรภพ ชูสิทธิ์ (ผู้จัดการโรงงาน บางแสน BS)',
    approvedDate: '2026-10-19',
    formCode: 'FM-MN01-04 Rev.00 Date 19/10/2026',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// Generate seeded sheets with realistic daily inspection checks up to day 29 for October 2026
export function generateInitialCheckSheets(): MachineMonthlyCheckSheet[] {
  const currentMonth = '2026-10';
  
  return initialMachines.map((machine, mIdx) => {
    const sheet = createEmptyMonthSheet(machine.id, currentMonth);
    const items = sheet.items;
    
    // Fill up days 1 to 29 (October 1 to October 29)
    for (let d = 1; d <= 29; d++) {
      const dayOfWeek = (d + 2) % 7; // Sunday = 0
      const isSunday = dayOfWeek === 0;

      const results: Record<number, InspectionResult> = {};
      const ticketNos: Record<number, string> = {};

      for (const it of items) {
        if (isSunday) {
          results[it.no] = 'off'; // ■ ไม่ทำการตรวจ (วันหยุดประจำสัปดาห์)
        } else {
          // On machine BS-14 (Flexo) on day 28, item 6 had abnormal vibration
          // On machine BS-01 (Slot) on day 15, item 3 (Upper Cutting) had abnormal check
          if (machine.tagCode === 'BS-01' && d === 15 && it.no === 3) {
            results[it.no] = 'abnormal'; // X
            ticketNos[it.no] = 'MN-202610-001';
            it.repairTicketNo = 'MN-202610-001';
          } else if (machine.no === 14 && d === 28 && it.no === 6) {
            results[it.no] = 'abnormal'; // X
            ticketNos[it.no] = 'MN-202610-002';
            it.repairTicketNo = 'MN-202610-002';
          } else {
            results[it.no] = 'pass'; // ✓
          }
        }
      }

      sheet.days[d] = {
        day: d,
        results,
        ticketNos,
        inspectorName: isSunday ? '-' : (mIdx % 2 === 0 ? 'สมเกียรติ ม.' : 'วิเชียร ก.'),
        supervisorName: isSunday ? '-' : 'เกียรติศักดิ์ พ.',
        notes: (machine.tagCode === 'BS-01' && d === 15)
          ? 'ตรวจพบ Upper Cutting หลวมคลอน แจ้งเปิดใบซ่อม MN-202610-001'
          : (machine.no === 14 && d === 28) 
            ? 'ตรวจพบเสียงแบริ่งลูกกลิ้งมีเสียงดังผิดปกติ' 
            : ''
      };
    }

    return sheet;
  });
}

export const initialInspectionSheets: MachineMonthlyCheckSheet[] = generateInitialCheckSheets();
