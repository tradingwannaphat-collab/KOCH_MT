export type UrgencyLevel = 'emergency' | 'high' | 'normal' | 'low';

export type TicketStatus = 
  | 'pending'          // รอดำเนินการ
  | 'acknowledged'     // รับแจ้งแล้ว
  | 'in_progress'      // กำลังซ่อมแซม
  | 'waiting_parts'    // รออะไหล่
  | 'testing'          // อยู่ระหว่างทดสอบ
  | 'completed'        // ซ่อมเสร็จแล้ว
  | 'closed';          // ปิดงานสมบูรณ์

export type RootCauseType = 
  | 'lack_of_maintenance' // ขาดการบำรุงรักษา
  | 'substandard_parts'   // อะไหล่ไม่มีคุณภาพ
  | 'misuse'              // ใช้งานผิดประเภท
  | 'other';              // อื่นๆ

export interface SparePartItem {
  id: string;
  name: string;
  partNo: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
}

export interface ProgressLog {
  id: string;
  timestamp: string;
  author: string;
  role: string;
  action: string;
  notes?: string;
  statusChange?: TicketStatus;
  photoUrl?: string;
}

export interface SignOffInfo {
  name: string;
  date: string;
  time: string;
  isSigned: boolean;
  signatureDataUrl?: string;
}

export interface MaintenanceTicket {
  id: string;
  ticketNo: string; // เลขที่ใบแจ้งซ่อม เช่น KOCH-MN-202610-001
  formCode: string; // FM-MN01-03 Rev.00 Date 19/10/2026
  
  // วันที่และข้อมูลผู้แจ้ง
  requestDate: string;
  requestTime: string;
  requesterName: string;
  department: string;
  
  // ประเภทและการระบุทรัพย์สิน
  category: 'machine' | 'infrastructure' | 'office'; // เครื่องจักร, โครงสร้างพื้นฐาน, เครื่องใน Office
  machineNo: string; // หมายเลขเครื่องจักร / รหัสทรัพย์สิน
  location: string; // สถานที่ใช้งาน
  urgency: UrgencyLevel;
  problemDescription: string;
  photos: string[]; // รูปถ่ายหน้างาน
  
  // ลายเซ็นเบื้องต้น
  requesterSign: SignOffInfo;
  receiverSign: SignOffInfo;

  // ส่วนเจ้าหน้าที่ซ่อมบำรุง
  status: TicketStatus;
  rootCause: RootCauseType;
  rootCauseOtherText?: string;
  rootCauseDetail: string;
  repairDetails: string; // รายละเอียดการซ่อม / เปลี่ยนอะไหล่
  spareParts: SparePartItem[];
  
  // เป้าหมายการปฏิบัติงาน
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  durationText: string;
  
  // ผู้ปฏิบัติงาน 3 ท่าน
  technicians: [string, string, string];
  
  // ลายเซ็นปิดงาน
  requesterApproval: SignOffInfo;
  technicianApproval: SignOffInfo;
  supervisorApproval: SignOffInfo;

  // ขั้นตอนการแก้ไขของทางซ่อมบำรุง
  troubleshootingSteps?: string; // ขั้นตอนการตรวจหาสาเหตุ
  correctiveSteps?: string;      // ขั้นตอนการแก้ไขที่ดำเนินการ
  testRunResult?: string;        // ผลการทดสอบเดินเครื่อง Trial Run

  // ไทม์ไลน์ความคืบหน้าแบบเรียลไทม์
  progressLogs: ProgressLog[];
  
  updatedAt: string;
  createdAt: string;
}

export interface MachineAsset {
  id: string;
  no?: number;                 // ลำดับ No. 1, 2, 3...
  tagCode?: string;           // รหัสลำดับหน้างาน เช่น BS-01, BS-02 (อ่านง่าย)
  code: string;               // รหัสเครื่องมือ เช่น MA2312014, FCU260101, CDU260101
  name: string;               // ชื่อเครื่อง เช่น Slot, Fan Coil Unit, Condensing Unit
  model?: string;             // ชื่อรุ่น เช่น AMENA 12000 BTU, Haier 18000 BTU
  serialNo?: string;          // Serial No.
  imageUrl?: string;          // รูปภาพเครื่องจักร / อุปกรณ์
  photoUrl?: string;          // รูปภาพเครื่องจักร (alias)
  processName: string;        // Process_Name เช่น Slot, Cutting, Office AC, Utility
  category: 'machine' | 'office' | 'infrastructure' | 'utility';
  machineType: string;
  machineTypeLabel: string;
  location: string;           // Location เช่น บางแสน BS (โรงงาน), สำนักงาน บางแสน BS
  department: string;         // แผนก เช่น ฝ่ายผลิต, สำนักงาน/Office, ฝ่ายอาคารสถานที่
  status: 'active' | 'breakdown' | 'maintenance';
  dimensions?: string;        // Machine W(m.) x L(m.) x H(m.)
  minMaxSheet?: string;       // Min/Max W & L
  power?: string;             // Power & Main Breaker
  kwHp?: string;              // แรงม้า/KW
  airWater?: string;          // Air / Water
  motorSpec?: string;         // Motor Spec
  gearSpec?: string;          // Gear Spec
  supplier?: string;          // Supplier
  installationYear?: string;
  notes?: string;
  createdAt?: string;
}
