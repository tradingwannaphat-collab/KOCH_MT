export type InspectionResult = 'pass' | 'abnormal' | 'off' | null;

export interface DailyCheckItem {
  no: number;              // 1 to 10 (or custom 1..N)
  description: string;     // หัวข้อตรวจสอบ (เช่น เบลคเกอร์สวิทส์, ปลั๊ก เพาเวอร์ปลั๊ก)
  criteria?: string;        // เกณฑ์มาตรฐานการตรวจสอบ (เช่น ไม่แตกหัก , หลวมคลอน,ชำรุด / พร้อมใช้งาน)
  frequency?: string;      // ความถี่: 'D' (ตรวจประจำวัน), 'W' (ตรวจรายสัปดาห์), 'M' (ตรวจรายเดือน)
  time?: string;           // เวลา เช่น 08:00
  repairTicketNo?: string; // เลขที่ใบแจ้งซ่อม (ถ้าพบข้อผิดปกติ เช่น MN-202610-001)
  translations?: {
    th?: string;
    en?: string;
    my?: string;
    lo?: string;
  };
  criteriaTranslations?: {
    th?: string;
    en?: string;
    my?: string;
    lo?: string;
  };
}

export interface DayCheckRecord {
  day: number;             // 1 to 31
  results: Record<number, InspectionResult>; // key = item no (1..N)
  ticketNos?: Record<number, string>; // key = item no -> ticket number e.g. "MN-202610-001"
  inspectorName?: string;  // ผู้ตรวจ
  inspectorRole?: 'maintenance' | 'production'; // ทีมซ่อมบำรุง vs แผนกผลิต
  supervisorName?: string; // หัวหน้าฝ่าย
  notes?: string;          // บันทึกเฉพาะวัน
  updatedAt?: string;
}

export interface MachineMonthlyCheckSheet {
  id: string;
  machineId: string;
  machineNo: string;
  machineName: string;
  department: string;
  month: string;           // YYYY-MM เช่น "2026-10"
  items: DailyCheckItem[]; // รายการตรวจเช็คประจำเครื่อง (แก้ไขเฉพาะเครื่องได้)
  days: Record<number, DayCheckRecord>; // 1..31
  remarks: string;         // ข้อเสนอแนะ
  approverName: string;    // ผู้อนุมัติ
  approverRole?: string;   // เช่น "ผู้จัดการโรงงาน บางแสน BS"
  approvedDate?: string;
  pilotPhaseNotice?: string; // ทำการตรวจสอบโดยทีมซ่อมบำรุงก่อนชั่วคราว 1 เดือน ก่อนส่งมอบให้ทางแผนกผลิตตรวจสอบ
  formCode: string;        // "FM-MN01-04 Rev.00 Date 19/10/2026"
  createdAt: string;
  updatedAt: string;
}

// รายการตรวจเช็คและเกณฑ์มาตรฐานสำหรับเครื่อง SLOT (MA2312014) ตามเอกสาร KOCH ต้นฉบับ
export const SLOT_INSPECTION_ITEMS: DailyCheckItem[] = [
  { no: 1, description: 'ปลั๊ก , เพาเวอร์ปลั๊ก', criteria: 'ไม่แตกหัก , หลวมคลอน', frequency: 'D', time: '08:00' },
  { no: 2, description: 'สวิตช์ปิดเปิด', criteria: 'ไม่แตกหัก , หลวมคลอน', frequency: 'D', time: '08:00' },
  { no: 3, description: 'UPPER CUTTING', criteria: 'ไม่แตกหัก , หลวมคลอน', frequency: 'D', time: '08:00' },
  { no: 4, description: 'LOWER CUTTING', criteria: 'ไม่แตกหัก , หลวมคลอน', frequency: 'D', time: '08:00' },
  { no: 5, description: 'STOPPER #1', criteria: 'ไม่แตกหัก , หลวมคลอน', frequency: 'D', time: '08:00' },
  { no: 6, description: 'STOPPER #2', criteria: 'ไม่แตกหัก , หลวมคลอน', frequency: 'D', time: '08:00' },
  { no: 7, description: 'MOTER (มอเตอร์ขับเคลื่อน)', criteria: 'พร้อมใช้งาน', frequency: 'D', time: '08:00' },
  { no: 8, description: 'ความสะอาด', criteria: 'ไม่มีคราบสกปรก', frequency: 'D', time: '08:00' },
  { no: 9, description: 'สภาพโดยรวม', criteria: 'พร้อมใช้งาน', frequency: 'D', time: '08:00' },
];

// รายการตรวจเช็คและเกณฑ์มาตรฐานสำหรับเครื่อง CUTTING (MA2312001) ตามเอกสาร KOCH ต้นฉบับ
export const CUTTING_INSPECTION_ITEMS: DailyCheckItem[] = [
  { no: 1, description: 'เบลคเกอร์สวิทส์', criteria: 'ไม่แตกหัก , หลวมคลอน,ชำรุด', frequency: 'D', time: '08:00' },
  { no: 2, description: 'มอเตอร์ (Motor)', criteria: 'พร้อมใช้งาน', frequency: 'D', time: '08:00' },
  { no: 3, description: 'สวิตช์ปิด-เปิด ON/OFF', criteria: 'พร้อมใช้งาน , ไม่แตก หัก', frequency: 'D', time: '08:00' },
  { no: 4, description: 'Roller Feed', criteria: 'ไม่มีคราบสกปรก', frequency: 'D', time: '08:00' },
  { no: 5, description: 'สายลม', criteria: 'ไม่ฉีกขาด , ไม่รั่วซึม', frequency: 'D', time: '08:00' },
  { no: 6, description: 'โซลินอยวาล์ว', criteria: 'ไม่แตก ,หัก ,รั่วซึม', frequency: 'D', time: '08:00' },
  { no: 7, description: 'Tool Froming', criteria: 'ไม่แตกหัก , หลวมคลอน,ชำรุด', frequency: 'D', time: '08:00' },
  { no: 8, description: 'Tool cutting', criteria: 'ไม่สึก , ไม่แตก หัก', frequency: 'D', time: '08:00' },
  { no: 9, description: 'ความสะอาด', criteria: 'ไม่มีคราบสกปรก', frequency: 'D', time: '08:00' },
  { no: 10, description: 'สภาพโดยรวม', criteria: 'พร้อมใช้งาน', frequency: 'D', time: '08:00' },
  { no: 11, description: 'สเกลอนิล็อค', criteria: 'ไม่แตกหัก , หลวมคลอน,ชำรุด', frequency: 'D', time: '08:00' },
];

export const DEFAULT_INSPECTION_ITEMS: DailyCheckItem[] = [
  { no: 1, description: 'ความสะอาดทั่วไปและรอบบริเวณตัวเครื่องจักร', criteria: 'ไม่มีคราบสกปรกและเศษกระดาษ', frequency: 'D', time: '08:00' },
  { no: 2, description: 'ระดับน้ำมันหล่อลื่น / จาระบี / ถังน้ำมันไฮดรอลิก', criteria: 'อยู่ในระดับเกณฑ์มาตรฐาน ไม่รั่วซึม', frequency: 'D', time: '08:00' },
  { no: 3, description: 'แรงดันลมระบบนิวเมติกส์ (Air Pressure Gauge 5-7 bar)', criteria: 'แรงดัน 5 - 7 bar สม่ำเสมอ ไม่รั่ว', frequency: 'D', time: '08:00' },
  { no: 4, description: 'ระบบไฟฟ้า สายไฟ และแผงควบคุมสวิตช์หน้าตู้คอนโทรล', criteria: 'ไม่แตกหัก หลวมคลอน สายไฟสมบูรณ์', frequency: 'D', time: '08:00' },
  { no: 5, description: 'ปุ่มหยุดฉุกเฉิน (Emergency Stop) และระบบ Safety Guard', criteria: 'พร้อมใช้งาน ตอบสนองทันที ไม่ชำรุด', frequency: 'D', time: '08:00' },
  { no: 6, description: 'เสียงและการสั่นสะเทือนของมอเตอร์ / ชุดเกียร์ขับเคลื่อน', criteria: 'หมุนเรียบ ไม่มีเสียงดังหรือสั่นสะเทือนผิดปกติ', frequency: 'D', time: '08:00' },
  { no: 7, description: 'ความตึงและการสึกหรอของสายพาน / โซ่ส่งกำลัง', criteria: 'ความตึงพอดี ไม่หย่อน ไม่แตกหรือสึกหรอ', frequency: 'D', time: '08:00' },
  { no: 8, description: 'สภาพใบมีดตัด / บล็อกไดคัท / ลูกกลิ้งยาง / แม่พิมพ์', criteria: 'คมสมบูรณ์ ไม่บิ่น ไม่สึกหรอ ผิวเรียบ', frequency: 'D', time: '08:00' },
  { no: 9, description: 'ระบบดูดเศษกระดาษ / ท่อลมเป่า / เซ็นเซอร์วัดระยะ', criteria: 'ท่อไม่อุดตัน เซ็นเซอร์อ่านแม่นยำ สะอาด', frequency: 'D', time: '08:00' },
  { no: 10, description: 'การทดสอบเดินเครื่องเปล่า (Trial Run 1-2 นาทีก่อนเริ่มงาน)', criteria: 'เครื่องจักรเดินเรียบ ระบบพร้อมทำงาน', frequency: 'D', time: '08:15' },
];
