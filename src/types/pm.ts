export type PMFrequency = '1M' | '2M' | '3M' | '6M' | '1Y';

export type PMTaskStatus = 
  | 'unplanned'   // ไม่มีแผนในเดือนนี้
  | 'planned'     // มีแผนกำหนดการ (Plan)
  | 'in_progress' // กำลังดำเนินการ
  | 'completed'   // ดำเนินการจริงแล้วเสร็จ (Act. Done)
  | 'delayed'     // ล่าช้ากว่าแผน / หลุดแผน
  | 'cancelled';  // ยกเลิก / เลื่อน

export interface PMTaskItem {
  id: string;
  name: string;
  category: 'mechanical' | 'electrical' | 'lubrication' | 'pneumatic' | 'safety' | 'general';
  standardCriteria: string;
  status: 'pass' | 'abnormal' | 'replaced' | 'not_applicable';
  notes?: string;
}

export interface PMReplacedPart {
  partId?: string;
  partName: string;
  partNo?: string;
  quantity: number;
  unit: string;
}

export interface PMMonthRecord {
  month: number; // 1 - 12
  monthLabel: string; // ม.ค. - ธ.ค.
  
  // Plan (แผนงานที่วางไว้)
  isPlanned: boolean;
  plannedWeek?: number; // 1, 2, 3, 4
  plannedDate?: string; // YYYY-MM-DD
  plannedScope?: string; // e.g. "PM ประจำเดือน (1M)", "PM ใหญ่รอบ 6 เดือน (6M)"
  frequencyType?: PMFrequency;
  
  // Actual (การลงมือซ่อมบำรุงจริง - Act.)
  status: PMTaskStatus;
  actualDate?: string; // YYYY-MM-DD
  actualTechnicians?: string[]; // ช่างผู้ดำเนินการ
  supervisorName?: string; // หัวหน้างานผู้ตรวจสอบ
  durationHours?: number; // ชั่วโมง Downtime/ทำงานจริง
  findings?: string; // ผลการตรวจพบ
  correctiveAction?: string; // การแก้ไข
  replacedParts?: PMReplacedPart[];
  tasks?: PMTaskItem[];
  notes?: string;
}

export interface MachineAnnualPMPlan {
  id: string;
  machineId: string;
  machineCode: string; // e.g. MA2312014
  machineTag: string; // e.g. BS-01
  machineName: string; // e.g. Slot
  processName: string; // e.g. Slot
  category: 'machine' | 'infrastructure' | 'office';
  location: string;
  year: number; // e.g. 2026 (พ.ศ. 2569)
  defaultFrequency: PMFrequency; // '1M', '3M', '6M', '1Y'
  months: Record<number, PMMonthRecord>; // 1 - 12
  updatedAt?: string;
}

export interface AnnualPMStats {
  totalMachines: number;
  totalPlanned: number;
  totalCompleted: number;
  totalDelayed: number;
  totalInProgress: number;
  totalUpcoming: number;
  achievementRate: number; // %
  onTimeRate: number; // %
  totalDowntimeHours: number;
}
