import { MaintenanceTicket } from '../types/ticket';

// ข้อมูลใบแจ้งซ่อมมาตรฐานประจำระบบ KOCH (FM-MN01-03)
// มีข้อมูลงานจริง รวมถึงงานเครื่องเย็บ Stitching ที่มีไทม์ไลน์ความคืบหน้าของช่าง 10 รายการ
export const initialTickets: MaintenanceTicket[] = [
  {
    id: 'ticket-stitching-bs11',
    ticketNo: 'MN-202611-002',
    formCode: 'FM-MN01-03 Rev.00 Date 19/10/2026',
    requestDate: '2026-11-02',
    requestTime: '03:34',
    requesterName: 'นายประสิทธิ์ วิศวกร',
    department: 'ฝ่ายผลิต',
    category: 'machine',
    machineNo: 'MA2312002',
    location: 'บางแสน BS (โรงงาน) (Stitching Manul 1)',
    urgency: 'high',
    problemDescription: 'เครื่องเย็บ Stitching หัวตอกลวดติดขัด ลวดเย็บไม่ลงกล่อง มอเตอร์ขับโซ่มีเสียงดังผิดปกติ',
    photos: [
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=80'
    ],
    requesterSign: {
      name: 'นายประสิทธิ์ วิศวกร',
      date: '2026-11-02',
      time: '03:34',
      isSigned: true,
      signatureDataUrl: ''
    },
    receiverSign: {
      name: 'นายเปา (ช่างไฟฟ้า)',
      date: '2026-11-02',
      time: '03:35',
      isSigned: true
    },
    status: 'in_progress',
    rootCause: 'lack_of_maintenance',
    rootCauseDetail: 'เศษผงลวดเย็บและคราบจาระบีสะสมบริเวณชุดสไลด์หัวตอก ทำให้หัวตอกคืนตัวช้า',
    repairDetails: 'ถอดล้างทำความสะอาดชุดสไลด์หัวตอก ปรับตั้งระยะห่างใบมีดตัดลวด และอัดจาระบีทนความร้อน',
    troubleshootingSteps: '1. ตรวจสอบระบบจ่ายไฟมอเตอร์ 0.5 HP ปกติ\n2. ตรวจสอบการป้อนลวดเย็บ พบเศษลวดขัดตัวในร่อง\n3. เช็คความตึงโซ่ขับเคลื่อน',
    correctiveSteps: '1. รื้อล้างชุด Guide ลวดและชุดค้อนตอก\n2. เจียรแต่งคมมีดตัดลวด\n3. หยอดน้ำมันหล่อลื่นและตั้งโซ่ขับใหม่',
    testRunResult: 'ทดสอบเย็บกล่องตัวอย่าง 50 กล่อง รอยเย็บสม่ำเสมอ แน่นหนา ไม่ติดขัด',
    spareParts: [
      {
        id: 'sp-wire-01',
        name: 'ลวดเย็บกล่องเบอร์ 17 (Flat Stitching Wire)',
        partNo: 'SP-STITCH-WIRE-17',
        quantity: 1,
        unit: 'ม้วน'
      },
      {
        id: 'sp-grease-01',
        name: 'จาระบีขาวหล่อลื่น Food Grade EP-2',
        partNo: 'SP-LUB-EP2',
        quantity: 1,
        unit: 'กระป๋อง'
      }
    ],
    startDate: '2026-11-02',
    startTime: '03:35',
    endDate: '2026-11-02',
    endTime: '04:15',
    durationText: '40 นาที',
    technicians: [
      'นายประสิทธิ์ วิศวกร (ช่างผู้ปฏิบัติงาน)',
      'นายเปา (ช่างไฟฟ้า)',
      'สมเกียรติ มั่นคง'
    ],
    requesterApproval: {
      name: 'นายประสิทธิ์ วิศวกร',
      date: '2026-11-02',
      time: '04:20',
      isSigned: true
    },
    technicianApproval: {
      name: 'นายเปา (ช่างไฟฟ้า)',
      date: '2026-11-02',
      time: '04:15',
      isSigned: true
    },
    supervisorApproval: {
      name: 'เกียรติศักดิ์ พรหมดี (หัวหน้าแผนกซ่อมบำรุง)',
      date: '2026-11-02',
      time: '04:30',
      isSigned: false
    },
    progressLogs: [
      {
        id: 'p-1',
        timestamp: '2026-11-02 03:34',
        author: 'นายประสิทธิ์ วิศวกร',
        role: 'ช่างแจ้งซ่อม',
        action: 'สร้างใบแจ้งซ่อมใหม่ผ่านระบบมือถือ',
        notes: 'แจ้งปัญหาเครื่องเย็บแมนนวล 1 (Stitching Manul 1) หัวตอกลวดขัดตัว',
        statusChange: 'pending'
      },
      {
        id: 'p-2',
        timestamp: '2026-11-02 03:35',
        author: 'นายเปา (ช่างไฟฟ้า)',
        role: 'ทีมซ่อมบำรุง',
        action: 'รับแจ้งงานซ่อมบำรุงและลงพื้นที่ตรวจสอบหน้างาน',
        notes: 'ช่างเข้าถึงหน้างาน เตรียมชุดเครื่องมือถอดล้าง',
        statusChange: 'acknowledged'
      },
      {
        id: 'p-3',
        timestamp: '2026-11-02 03:36',
        author: 'นายประสิทธิ์ วิศวกร',
        role: 'ช่างผู้ปฏิบัติงาน',
        action: 'เปลี่ยนสถานะเป็น [กำลังซ่อมแซม]',
        notes: 'เริ่มถอดฝาครอบหัวตอกและตรวจสอบร่องรางลวด',
        statusChange: 'in_progress'
      },
      {
        id: 'p-4',
        timestamp: '2026-11-02 03:36',
        author: 'นายประสิทธิ์ วิศวกร',
        role: 'ช่างผู้ปฏิบัติงาน',
        action: 'ตรวจสอบพบเศษลวดติดขัดในร่องสไลด์',
        notes: 'ใช้แปรงลวดและน้ำยาทำความสะอาดคราบจาระบีเก่าออก',
        statusChange: 'in_progress'
      },
      {
        id: 'p-5',
        timestamp: '2026-11-02 03:37',
        author: 'เปา',
        role: 'ช่างผู้ปฏิบัติงาน',
        action: 'รอปรับตั้ง',
        notes: 'ประกอบชิ้นส่วนคืนตำแหน่ง ปรับตั้งช่องว่างใบมีดและแรงดึงสปริง',
        statusChange: 'in_progress'
      },
      {
        id: 'p-6',
        timestamp: '2026-11-02 03:38',
        author: 'นายเปา (ช่างไฟฟ้า)',
        role: 'ทีมซ่อมบำรุง',
        action: 'บันทึกขั้นตอนการแก้ไขและข้อมูลการซ่อมแซมเรียบร้อย',
        notes: 'อัดจาระบีหล่อลื่นลูกปืนและร่องสไลด์เรียบร้อย',
        statusChange: 'in_progress'
      },
      {
        id: 'p-7',
        timestamp: '2026-11-02 03:45',
        author: 'นายประสิทธิ์ วิศวกร',
        role: 'ช่างผู้ปฏิบัติงาน',
        action: 'เริ่มทดสอบเดินเครื่อง Trial Run (รอบที่ 1)',
        notes: 'ทดสอบเย็บกล่องเปล่า 10 ตัว ลวดเย็บเข้าตำแหน่งปกติ',
        statusChange: 'testing'
      },
      {
        id: 'p-8',
        timestamp: '2026-11-02 03:55',
        author: 'นายเปา (ช่างไฟฟ้า)',
        role: 'ทีมซ่อมบำรุง',
        action: 'ทดสอบเย็บต่อเนื่องกับงานผลิตจริง 50 กล่อง',
        notes: 'ความเร็วปกติ เสียงเงียบ ไม่มีลวดติดขัด',
        statusChange: 'testing'
      },
      {
        id: 'p-9',
        timestamp: '2026-11-02 04:10',
        author: 'นายประสิทธิ์ วิศวกร',
        role: 'ช่างผู้ปฏิบัติงาน',
        action: 'ส่งมอบเครื่องจักรคืนฝ่ายผลิต',
        notes: 'ทำความสะอาดรอบตัวเครื่อง ส่งมอบให้หัวหน้ากะทดสอบรับมอบ',
        statusChange: 'in_progress'
      },
      {
        id: 'p-10',
        timestamp: '2026-11-02 04:15',
        author: 'นายเปา (ช่างไฟฟ้า)',
        role: 'ทีมซ่อมบำรุง',
        action: 'ลงลายมือชื่อช่างผู้ปฏิบัติงาน และรอฝ่ายบริหารอนุมัติปิดงาน',
        notes: 'งานซ่อมเสร็จสมบูรณ์เรียบร้อย เครื่องจักรพร้อมใช้งาน 100%',
        statusChange: 'in_progress'
      }
    ],
    createdAt: '2026-11-02T03:34:00.000Z',
    updatedAt: '2026-11-02T04:15:00.000Z'
  },
  {
    id: 'ticket-slot-bs01',
    ticketNo: 'MN-202610-001',
    formCode: 'FM-MN01-03 Rev.00 Date 19/10/2026',
    requestDate: '2026-10-15',
    requestTime: '08:30',
    requesterName: 'สมเกียรติ มั่นคง',
    department: 'ฝ่ายผลิต',
    category: 'machine',
    machineNo: 'MA2312014',
    location: 'บางแสน BS (โรงงาน) (Slot)',
    urgency: 'high',
    problemDescription: 'ตรวจพบ Upper Cutting หลวมคลอน ระหว่างการตรวจเช็คประจำวัน FM-MN01-04 ข้อ 3',
    photos: [
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500&auto=format&fit=crop&q=80'
    ],
    requesterSign: {
      name: 'สมเกียรติ มั่นคง',
      date: '2026-10-15',
      time: '08:30',
      isSigned: true,
      signatureDataUrl: ''
    },
    receiverSign: {
      name: 'ประสิทธิ์ วิศวกร',
      date: '2026-10-15',
      time: '08:45',
      isSigned: true
    },
    status: 'completed',
    rootCause: 'lack_of_maintenance',
    rootCauseDetail: 'น็อตยึดก้านใบมีด Upper Cutting คลายตัวจากการสั่นสะเทือนต่อเนื่อง',
    repairDetails: 'ขันกวดน็อตยึดเกลียวด้วยประแจปอนด์มาตรฐาน 85 N.m และทาน้ำยาล็อคเกลียว Loctite 243',
    troubleshootingSteps: '1. ตรวจสอบระยะคลอนแกนมีดด้วยไดอัลเกจ\n2. ตรวจสภาพบูชและเพลาขับเคลื่อน',
    correctiveSteps: '1. เปลี่ยนน็อตยึดเกรด 8.8 ใหม่\n2. ใช้น้ำยากันคลาย Loctite 243\n3. ตั้งระยะตัดให้ขนานกับ Lower Cutting',
    testRunResult: 'ทดสอบตัดชีทกล่องลูกฟูก 20 แผ่น รอยตัดคมเรียบ ได้ฉากตามมาตรฐาน KOCH',
    spareParts: [
      {
        id: 'sp-bolt-01',
        name: 'Hex Bolt M12x45 High Tensile 8.8',
        partNo: 'SP-BLT-M12-45',
        quantity: 4,
        unit: 'ตัว'
      }
    ],
    startDate: '2026-10-15',
    startTime: '09:00',
    endDate: '2026-10-15',
    endTime: '10:30',
    durationText: '1 ชั่วโมง 30 นาที',
    technicians: [
      'ประสิทธิ์ วิศวกร (ช่างเครื่องกล)',
      'สมเกียรติ มั่นคง (ช่างผู้ช่วย)',
      'เกียรติศักดิ์ พรหมดี (หัวหน้าช่าง)'
    ],
    requesterApproval: {
      name: 'สมเกียรติ มั่นคง',
      date: '2026-10-15',
      time: '10:45',
      isSigned: true
    },
    technicianApproval: {
      name: 'ประสิทธิ์ วิศวกร',
      date: '2026-10-15',
      time: '10:30',
      isSigned: true
    },
    supervisorApproval: {
      name: 'สิรภพ ชูสิทธิ์ (ผู้จัดการโรงงาน)',
      date: '2026-10-15',
      time: '11:00',
      isSigned: true
    },
    progressLogs: [
      {
        id: 'p-s1',
        timestamp: '2026-10-15 08:30',
        author: 'สมเกียรติ มั่นคง',
        role: 'ผู้ตรวจเช็คประจำวัน',
        action: 'เปิดใบแจ้งซ่อมจากผลตรวจเช็คข้อ 3 ผิดปกติ',
        notes: 'Upper Cutting หลวมคลอน มีความเสี่ยงต่อคุณภาพงานตัดกล่อง',
        statusChange: 'pending'
      },
      {
        id: 'p-s2',
        timestamp: '2026-10-15 08:45',
        author: 'ประสิทธิ์ วิศวกร',
        role: 'ช่างเครื่องกล',
        action: 'รับแจ้งงานซ่อมและเข้าตรวจสอบหน้างาน',
        notes: 'พบสกรูยึดคลายตัว ปิดเครื่องตัดและติดป้ายเตือนความปลอดภัย LOTO',
        statusChange: 'in_progress'
      },
      {
        id: 'p-s3',
        timestamp: '2026-10-15 10:30',
        author: 'ประสิทธิ์ วิศวกร',
        role: 'ช่างเครื่องกล',
        action: 'ขันกวดน็อตและปรับตั้งระนาบเสร็จสิ้น',
        notes: 'ทดสอบตัดกล่องผ่านเกณฑ์มาตรฐาน ส่งมอบเครื่องจักรเรียบร้อย',
        statusChange: 'completed'
      }
    ],
    createdAt: '2026-10-15T08:30:00.000Z',
    updatedAt: '2026-10-15T10:30:00.000Z'
  },
  {
    id: 'ticket-cutting-bs02',
    ticketNo: 'MN-202610-002',
    formCode: 'FM-MN01-03 Rev.00 Date 19/10/2026',
    requestDate: '2026-10-22',
    requestTime: '13:15',
    requesterName: 'วินัย สมบูรณ์',
    department: 'ฝ่ายผลิต',
    category: 'machine',
    machineNo: 'MA2312001',
    location: 'บางแสน BS (โรงงาน) (Cutting)',
    urgency: 'emergency',
    problemDescription: 'ระบบลมดันกระบอกสูบตกเหลือ 3.5 Bar (มาตรฐาน 5-6 Bar) เครื่องหยุดการทำงานฉุกเฉิน',
    photos: [
      'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=500&auto=format&fit=crop&q=80'
    ],
    requesterSign: {
      name: 'วินัย สมบูรณ์',
      date: '2026-10-22',
      time: '13:15',
      isSigned: true,
      signatureDataUrl: ''
    },
    receiverSign: {
      name: 'ประสิทธิ์ วิศวกร',
      date: '2026-10-22',
      time: '13:20',
      isSigned: true
    },
    status: 'in_progress',
    rootCause: 'lack_of_maintenance',
    rootCauseDetail: 'สายลม PU ขนาด 8mm บริเวณข้อต่อข้องอสึกหรอตามอายุการใช้งานและมีรอยปริแตก',
    repairDetails: 'ตัดเปลี่ยนสายลม PU สายใหม่ และเปลี่ยนข้อต่อสวมเร็ว One-touch Fitting 8mm',
    troubleshootingSteps: '1. ใช้สเปรย์ตรวจเช็ครอยรั่วพบฟองอากาศบริเวณข้อต่อวาล์วหลัก\n2. ตรวจเกจวัดแรงดันลม',
    correctiveSteps: '1. ปิดวาล์วลมหลักและเดรนลมค้างท่อ\n2. เปลี่ยนท่อลม PU ความยาว 1.5 เมตร\n3. เปลี่ยนข้อต่อทองเหลือง',
    testRunResult: 'แรงดันลมกลับมาคงที่ที่ 5.8 Bar กระบอกสูบทำงานได้ราบรื่น',
    spareParts: [
      {
        id: 'sp-air-01',
        name: 'สายลมโพลียูรีเทน PU Tubing 8x5mm (Blue)',
        partNo: 'SP-PU-0805-BL',
        quantity: 2,
        unit: 'เมตร'
      },
      {
        id: 'sp-fit-01',
        name: 'ข้อต่อสวมเร็ว Fitting One Touch 8mm',
        partNo: 'SP-FIT-PC08-02',
        quantity: 2,
        unit: 'ตัว'
      }
    ],
    startDate: '2026-10-22',
    startTime: '13:30',
    endDate: '',
    endTime: '',
    durationText: '',
    technicians: [
      'ประสิทธิ์ วิศวกร (ช่างนิวเมติกส์)',
      'นายเปา (ช่างไฟฟ้า)',
      'สมเกียรติ มั่นคง'
    ],
    requesterApproval: {
      name: '',
      date: '',
      time: '',
      isSigned: false
    },
    technicianApproval: {
      name: 'ประสิทธิ์ วิศวกร',
      date: '',
      time: '',
      isSigned: false
    },
    supervisorApproval: {
      name: '',
      date: '',
      time: '',
      isSigned: false
    },
    progressLogs: [
      {
        id: 'p-c1',
        timestamp: '2026-10-22 13:15',
        author: 'วินัย สมบูรณ์',
        role: 'ผู้ควบคุมเครื่อง',
        action: 'กดปุ่มแจ้งเหตุฉุกเฉินลมตกหน้างาน',
        notes: 'แรงดันลมไม่พอ เครื่องหยุดไลน์ตัด',
        statusChange: 'pending'
      },
      {
        id: 'p-c2',
        timestamp: '2026-10-22 13:20',
        author: 'ประสิทธิ์ วิศวกร',
        role: 'ช่างนิวเมติกส์',
        action: 'เข้าตรวจสอบและพบจุดรั่ว',
        notes: 'เบิกสายลม PU 8mm และข้อต่อจากคลังสแปร์พาร์ท',
        statusChange: 'in_progress'
      }
    ],
    createdAt: '2026-10-22T13:15:00.000Z',
    updatedAt: '2026-10-22T13:30:00.000Z'
  }
];
