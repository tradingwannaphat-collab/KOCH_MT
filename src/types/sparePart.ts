export type SparePartCategory = 
  | 'blade'         // ใบมีด / อุปกรณ์ตัด
  | 'bearing'       // ลูกปืน / แบริ่ง
  | 'belt'          // สายพาน / โซ่ส่งกำลัง
  | 'electrical'    // ไฟฟ้า / เซนเซอร์ / คอนแทกเตอร์
  | 'pneumatic'     // นิวเมติกส์ / กระบอกลม / โซลินอยด์
  | 'roller_rubber' // ลูกกลิ้งยาง / ยางดึงกระดาษ
  | 'lubricant'     // น้ำมันหล่อลื่น / จาระบี
  | 'filter'        // ฟิลเตอร์แอร์ / ไส้กรอง
  | 'consumable';   // วัสดุสิ้นเปลือง / อื่นๆ

export interface SparePartItemMaster {
  id: string;
  partNo: string;                  // รหัสอะไหล่ เช่น SP-BLD-01, SP-BRG-6205
  name: string;                    // ชื่ออะไหล่ เช่น ใบมีด Slotting Blade
  spec: string;                    // สเปกละเอียด เช่น SKD-11 ขนาด 280x65x8 mm
  category: SparePartCategory;
  categoryLabel: string;
  compatibleMachines: string[];    // รหัสเครื่องที่ใช้ได้ เช่น ['MA2312014', 'MA2312001'] หรือ ['all']
  compatibleMachineNames: string;  // ข้อความแสดงเครื่อง เช่น Slot (BS-01), Cutting (BS-02)
  stockQty: number;                // จำนวนคงเหลือในสต๊อก
  minStock: number;                // จุดสั่งซื้อ / Safety stock
  unit: string;                    // ชิ้น, เส้น, ตลับ, กระป๋อง, ชุด, ลิตร
  location: string;                // ตำแหน่งจัดเก็บ เช่น Shelf A-01, Bin 12
  unitPrice: number;               // ราคาต่อหน่วย (บาท)
  supplier: string;                // ผู้จำหน่าย / ร้านค้า
  leadTimeDays?: number;           // ระยะเวลาจัดส่ง (วัน)
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  imageUrl?: string;
  notes?: string;
  lastRestockedDate?: string;      // วันที่รับเข้าล่าสุด
  lastUsedDate?: string;           // วันที่เบิกล่าสุด
  createdAt: string;
  updatedAt: string;
}

export interface StockTransaction {
  id: string;
  sparePartId: string;
  partNo: string;
  partName: string;
  type: 'in' | 'out' | 'adjust';   // รับเข้า | เบิกใช้ | ปรับยอด
  quantity: number;
  balanceAfter: number;
  date: string;                    // YYYY-MM-DD
  time: string;                    // HH:mm
  referenceTicketNo?: string;      // เลขที่ใบแจ้งซ่อมถ้าเบิกใช้ (เช่น MN-202610-001)
  machineCode?: string;            // รหัสเครื่องที่นำไปใส่
  operator: string;                // ผู้เบิก / ผู้รับของ
  notes?: string;
}
