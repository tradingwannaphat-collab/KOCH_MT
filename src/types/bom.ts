export type ReplacementReason = 
  | 'scheduled_pm'    // ตามรอบบำรุงรักษาเชิงป้องกัน (PM)
  | 'breakdown'       // ชำรุด/เสียหายกะทันหัน
  | 'wear_tear'       // เสื่อมสภาพตามอายุการใช้งาน
  | 'upgrade'         // ปรับปรุงประสิทธิภาพ
  | 'other';          // อื่นๆ

export interface BOMChangeLog {
  id: string;
  bomItemId: string;
  replacedDate: string;        // YYYY-MM-DD
  replacedTime?: string;       // HH:mm
  technician: string;          // ชื่อช่างผู้เปลี่ยน/ผู้บันทึก
  quantity: number;            // จำนวนที่เปลี่ยน
  reason: ReplacementReason;
  reasonLabel: string;
  notes: string;               // บันทึกการเปลี่ยนแปลง (เช่น เปลี่ยนลูกปืนฝั่งมอเตอร์ พร้อมอัดจารบีใหม่)
  photoUrl?: string;           // รูปถ่ายอะไหล่เก่า/ใหม่
  ticketId?: string;           // เลขที่ใบแจ้งซ่อมที่เกี่ยวข้อง (ถ้ามี)
  createdAt: string;
}

export interface MachineBOMItem {
  id: string;
  machineId: string;           // รหัส ID เครื่องจักร
  machineCode: string;         // รหัสเครื่องมือ เช่น MA2312014, FCU260101
  machineTag?: string;         // เช่น BS-01
  machineName: string;         // เช่น Slot, Cutting
  partName: string;            // ชื่ออุปกรณ์/อะไหล่ เช่น ใบมีดตัด, ลูกปืนเพลาขับ, สายพานไทม์มิ่ง
  partNo: string;              // รหัสอะไหล่ เช่น BLD-SLOT-01, NSK-6205-2RS
  spec: string;                // สเปกขนาด เช่น 25x62x17 mm, Belt B-52
  category: 'mechanical' | 'electrical' | 'pneumatic' | 'hydraulic' | 'consumable' | 'filter';
  categoryLabel: string;
  quantity: number;            // จำนวนที่ติดตั้งในเครื่อง
  unit: string;                // ชิ้น, เส้น, ตลับ, ชุด, ลิตร
  replacementCycleDays: number;// รอบการเปลี่ยน (วัน) เช่น 180 (6 เดือน), 365 (1 ปี)
  cycleLabel: string;          // ป้ายบอกรอบ เช่น ทุก 6 เดือน, ทุก 1 ปี, ทุก 3 เดือน
  lastReplacedDate: string;    // วันที่เปลี่ยนล่าสุด YYYY-MM-DD
  nextDueDate: string;         // กำหนดเปลี่ยนครั้งถัดไป YYYY-MM-DD
  status: 'normal' | 'due_soon' | 'overdue';
  supplier?: string;
  unitCostEstimate?: number;
  notes?: string;
  changeHistory: BOMChangeLog[];
  createdAt: string;
  updatedAt: string;
}
