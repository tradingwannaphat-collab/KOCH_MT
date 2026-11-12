import { MachineAnnualPMPlan, PMMonthRecord, PMTaskItem, PMFrequency } from '../types/pm';
import { initialMachines } from './initialMachines';

export const THAI_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const THAI_MONTH_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export const STANDARD_PM_TASKS: Record<string, PMTaskItem[]> = {
  mechanical: [
    { id: 't-1', name: 'ตรวจสอบความตึงและสภาพสายพานขับเคลื่อน (V-Belt & Flat Belt)', category: 'mechanical', standardCriteria: 'ไม่แตก ไม่หย่อน ยุบตัวไม่เกิน 10-15 mm', status: 'pass' },
    { id: 't-2', name: 'ตรวจสอบความตึงและรอยสึกหรอของโซ่ขับ (Drive Chains)', category: 'mechanical', standardCriteria: 'ไม่ตึง/หย่อนเกินไป ทาน้ำมันหล่อลื่นสม่ำเสมอ', status: 'pass' },
    { id: 't-3', name: 'ตรวจขันแน่นน็อตยึดแท่นเครื่องและเพลาส่งกำลัง (Fasteners Tightness)', category: 'mechanical', standardCriteria: 'ขันแน่นทุกจุดตามค่าทอร์ค ไม่มีรอยคลอน', status: 'pass' },
    { id: 't-4', name: 'ตรวจสอบสภาพใบมีดตัด / ใบมีดกรีด (Cutting & Slitting Blades)', category: 'mechanical', standardCriteria: 'ใบมีดคม ไม่บิ่น ไม่งอ ระยะชิดได้เกณฑ์', status: 'pass' }
  ],
  lubrication: [
    { id: 't-5', name: 'อัดจาระบีลูกปืนหัวเพลาและตลับลูกปืนทุกจุด (Grease Bearing Points)', category: 'lubrication', standardCriteria: 'อัดจาระบี NLGI 2 ครบทุกหัวอัด ไม่มีเศษผงปนเปื้อน', status: 'pass' },
    { id: 't-6', name: 'ตรวจสอบระดับและสีน้ำมันเกียร์ทด / กระปุกเกียร์ (Gearbox Oil Level)', category: 'lubrication', standardCriteria: 'ระดับกึ่งกลางตาแมว น้ำมันใส ไม่เป็นโคลน', status: 'pass' },
    { id: 't-7', name: 'ตรวจระดับน้ำมันไฮดรอลิกและแรงดันระบบ (Hydraulic System)', category: 'lubrication', standardCriteria: 'ระดับปกติ อุณหภูมิไม่เกิน 60°C แรงดันตามสเปก', status: 'pass' }
  ],
  electrical: [
    { id: 't-8', name: 'ตรวจวัดกระแสไฟฟ้า (Ampere) และอุณหภูมิมอเตอร์หลัก (Motor Thermal Check)', category: 'electrical', standardCriteria: 'กระแสไม่เกิน Full Load Amp, อุณหภูมิผิว < 70°C', status: 'pass' },
    { id: 't-9', name: 'ตรวจขันแน่นขั้วต่อสายไฟในตู้ควบคุม (Control Panel Terminal Check)', category: 'electrical', standardCriteria: 'สายไฟยึดแน่น ไม่มีรอยไหม้หรือหลวม', status: 'pass' },
    { id: 't-10', name: 'ทำความสะอาดฝุ่นและเป่าแผงวงจรอิเล็กทรอนิกส์ / อินเวอร์เตอร์ (Inverter Clean)', category: 'electrical', standardCriteria: 'ไม่มีฝุ่นกระดาษสะสม พัดลมระบายอากาศหมุนปกติ', status: 'pass' }
  ],
  pneumatic: [
    { id: 't-11', name: 'ตรวจเช็คแรงดันลมและระบบดักน้ำ/กรองลม (Air Filter & Regulator)', category: 'pneumatic', standardCriteria: 'แรงดัน 5-7 bar เดรนน้ำทิ้งสม่ำเสมอ กรองไม่อุดตัน', status: 'pass' },
    { id: 't-12', name: 'ตรวจการรั่วซึมของสายลม ข้อต่อ และกระบอกสูบ (Pneumatic Leak Check)', category: 'pneumatic', standardCriteria: 'ไม่มีเสียงลมรั่ว ซีลกระบอกสูบไม่แตกรั่ว', status: 'pass' }
  ],
  safety: [
    { id: 't-13', name: 'ทดสอบปุ่มหยุดฉุกเฉิน (Emergency Stop Switch) ทุกจุด', category: 'safety', standardCriteria: 'กดแล้วเครื่องตัดการทำงานทันที ระบบหยุดสมบูรณ์', status: 'pass' },
    { id: 't-14', name: 'ตรวจสภาพการ์ดป้องกัน Safety Guard และเซ็นเซอร์แสง (Photo Sensors)', category: 'safety', standardCriteria: 'การ์ดครอบปิดมิดชิด เซ็นเซอร์ตัดเมื่อมีสิ่งกีดขวาง', status: 'pass' }
  ]
};

// Helper to determine default frequency for a machine
export function getMachineDefaultFrequency(m: any): PMFrequency {
  const n = (m.name || '').toLowerCase();
  const c = (m.code || '').toLowerCase();
  const cat = m.category;

  if (cat === 'office') return '3M'; // แอร์ Office PM ทุก 3 เดือน
  if (n.includes('air pump') || n.includes('wastewater')) return '1M';
  if (n.includes('slot') || n.includes('cutting') || n.includes('die cut') || n.includes('flexo') || n.includes('long way')) {
    return '1M'; // เครื่องจักรหลักฝ่ายผลิต PM ประจำเดือน
  }
  return '1M';
}

// Generate annual PM plan for a machine in a given year
export function generateMachineAnnualPlan(machine: any, year: number): MachineAnnualPMPlan {
  const defaultFreq = getMachineDefaultFrequency(machine);
  const months: Record<number, PMMonthRecord> = {};
  
  // Assign planned weeks based on machine number to distribute technician workload across weeks 1-4
  const assignedWeek = ((machine.no || 1) % 4) + 1; // Week 1 to 4

  for (let m = 1; m <= 12; m++) {
    const monthNumStr = String(m).padStart(2, '0');
    let isPlanned = true;
    let scope = 'PM ประจำเดือน (1M Routine)';

    // Adjust planning by frequency
    if (defaultFreq === '3M') {
      isPlanned = m % 3 === 0;
      scope = 'PM ใหญ่รอบ 3 เดือน (3M Comprehensive)';
    } else if (defaultFreq === '6M') {
      isPlanned = m % 6 === 0;
      scope = 'PM ใหญ่รอบ 6 เดือน (6M Major Overhaul)';
    } else if (defaultFreq === '1Y') {
      isPlanned = m === 12;
      scope = 'PM ประจำปี (Annual Overhaul)';
    } else {
      // 1M routine: every month is planned. Highlight months 6 & 12 as major PM
      if (m === 6 || m === 12) {
        scope = 'PM ใหญ่รอบ 6 เดือน (6M Major)';
      } else if (m === 3 || m === 9) {
        scope = 'PM รอบไตรมาส (3M Quarterly)';
      }
    }

    // Default status logic based on time relative to year 2026:
    // Months 1-10 in 2026 are completed past actuals.
    // Month 11 in 2026 is current (in progress / scheduled).
    // Month 12 in 2026 is future planned.
    let status: PMMonthRecord['status'] = 'unplanned';
    let actualDate: string | undefined = undefined;
    let actualTechnicians: string[] | undefined = undefined;
    let supervisorName: string | undefined = undefined;
    let durationHours: number | undefined = undefined;
    let findings: string | undefined = undefined;
    let correctiveAction: string | undefined = undefined;
    let replacedParts: PMMonthRecord['replacedParts'] = undefined;

    if (isPlanned) {
      const plannedDay = Math.min(28, assignedWeek * 7 - 2);
      const plannedDate = `${year}-${monthNumStr}-${String(plannedDay).padStart(2, '0')}`;

      if (year < 2026 || (year === 2026 && m <= 10)) {
        // Past months: Completed
        // Simulate minor variance: machine 14 had delay on month 8
        if (machine.id === 'm-14' && m === 8) {
          status = 'delayed';
          actualDate = `${year}-${monthNumStr}-26`;
          actualTechnicians = ['นายเปา (ช่างไฟฟ้า)', 'นายประสิทธิ์ (วิศวกร)'];
          supervisorName = 'นายเกียรติศักดิ์ พ. (ผจก.ซ่อมบำรุง)';
          durationHours = 4.0;
          findings = 'ตรวจพบแบริ่งลูกกลิ้ง Munal Glued มีเสียงดังและจาระบีแห้ง';
          correctiveAction = 'ทำการเปลี่ยนแบริ่งตลับลูกปืนใหม่ 2 ตัว และอัดจาระบีความร้อนสูง';
          replacedParts = [
            { partName: 'Bearing ตลับลูกปืน 6205-2RS', partNo: 'BRG-6205-RS', quantity: 2, unit: 'ตัว' },
            { partName: 'จาระบีทนความร้อน Shell Gadus S2', quantity: 1, unit: 'กระป๋อง' }
          ];
        } else {
          status = 'completed';
          actualDate = `${year}-${monthNumStr}-${String(plannedDay).padStart(2, '0')}`;
          actualTechnicians = ['นายประสิทธิ์ (วิศวกร)', 'ทีมช่างซ่อมบำรุง KOCH'];
          supervisorName = 'นายเกียรติศักดิ์ พ.';
          durationHours = 2.0;
          findings = 'ระบบกลไกและการทำงานปกติ ตรวจขันแน่นน็อตและทำความสะอาดตู้ไฟ';
          correctiveAction = 'อัดจาระบีครบจุด ทำความสะอาดไส้กรองลมและปรับความตึงสายพาน';

          // Simulate replaced parts for Slot in month 5
          if (machine.id === 'm-01' && m === 5) {
            replacedParts = [
              { partName: 'สายพานขับ V-Belt B-58', partNo: 'BLT-B58', quantity: 2, unit: 'เส้น' }
            ];
          }
        }
      } else if (year === 2026 && m === 11) {
        // Current Month (November 2026)
        if (assignedWeek <= 2) {
          status = 'in_progress';
          actualDate = `${year}-11-09`;
          actualTechnicians = ['นายเปา (ช่างไฟฟ้า)', 'นายประสิทธิ์ (วิศวกร)'];
          supervisorName = 'นายเกียรติศักดิ์ พ.';
          durationHours = 1.5;
          findings = 'อยู่ระหว่างดำเนินการตรวจเช็คระบบไฟฟ้าและชุดเกียร์';
          correctiveAction = 'ตรวจวัดกระแสไฟฟ้ามอเตอร์และทดสอบระบบหยุดฉุกเฉินแล้ว';
        } else {
          status = 'planned';
        }
      } else {
        // Future months (Month 12 or 2027+)
        status = 'planned';
      }

      months[m] = {
        month: m,
        monthLabel: THAI_MONTH_SHORT[m - 1],
        isPlanned: true,
        plannedWeek: assignedWeek,
        plannedDate,
        plannedScope: scope,
        frequencyType: defaultFreq,
        status,
        actualDate,
        actualTechnicians,
        supervisorName,
        durationHours,
        findings,
        correctiveAction,
        replacedParts,
        tasks: [
          ...STANDARD_PM_TASKS.mechanical,
          ...STANDARD_PM_TASKS.lubrication,
          ...STANDARD_PM_TASKS.electrical,
          ...STANDARD_PM_TASKS.pneumatic,
          ...STANDARD_PM_TASKS.safety
        ]
      };
    } else {
      months[m] = {
        month: m,
        monthLabel: THAI_MONTH_SHORT[m - 1],
        isPlanned: false,
        status: 'unplanned'
      };
    }
  }

  return {
    id: `pm-${machine.id}-${year}`,
    machineId: machine.id,
    machineCode: machine.code,
    machineTag: machine.tagCode || `BS-${String(machine.no || 1).padStart(2, '0')}`,
    machineName: machine.name,
    processName: machine.processName || machine.category,
    category: machine.category,
    location: machine.location || 'บางแสน BS (โรงงาน)',
    year,
    defaultFrequency: defaultFreq,
    months,
    updatedAt: new Date().toISOString()
  };
}

// Generate full initial PM plans for all machines
export function generateInitialAnnualPMPlans(year: number = 2026): MachineAnnualPMPlan[] {
  return initialMachines.map((m) => generateMachineAnnualPlan(m, year));
}

export const initialAnnualPMPlans: MachineAnnualPMPlan[] = generateInitialAnnualPMPlans(2026);
