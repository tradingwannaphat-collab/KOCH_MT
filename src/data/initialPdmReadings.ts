import { ConditionReading } from '../types/pdm';

export const initialPdmReadings: ConditionReading[] = [
  // BS-01 Slot (MA2312014) - Watch trend on Upper Cutting Shaft vibration & bearing temp
  {
    id: 'pdm-bs01-1',
    machineId: 'm-01',
    machineCode: 'MA2312014',
    machineName: 'Slot',
    recordedAt: '2026-10-15 08:30',
    inspectorName: 'นายประสิทธิ์ (PdM)',
    vibrationRms: 2.1,
    temperatureC: 56,
    currentAmp: 11.4,
    ratedAmp: 14,
    pressureBar: 6.1,
    noiseStatus: 'normal',
    oilCondition: 'clean',
    notes: 'ค่าสั่นสะเทือนและอุณหภูมิลูกปืนเพลา Slot อยู่ในเกณฑ์ปกติ'
  },
  {
    id: 'pdm-bs01-2',
    machineId: 'm-01',
    machineCode: 'MA2312014',
    machineName: 'Slot',
    recordedAt: '2026-10-29 08:30',
    inspectorName: 'นายประสิทธิ์ (PdM)',
    vibrationRms: 2.7,
    temperatureC: 62,
    currentAmp: 12.1,
    ratedAmp: 14,
    pressureBar: 5.9,
    noiseStatus: 'normal',
    oilCondition: 'clean',
    notes: 'เริ่มพบความสั่นสะเทือนเพิ่มขึ้นเล็กน้อยบริเวณตลับลูกปืนชุด Upper Cutting'
  },
  {
    id: 'pdm-bs01-3',
    machineId: 'm-01',
    machineCode: 'MA2312014',
    machineName: 'Slot',
    recordedAt: '2026-11-12 08:30',
    inspectorName: 'นายประสิทธิ์ (PdM)',
    vibrationRms: 3.5,
    temperatureC: 68,
    currentAmp: 13.0,
    ratedAmp: 14,
    pressureBar: 5.8,
    noiseStatus: 'moderate',
    oilCondition: 'dark',
    notes: 'ความสั่นเข้าสู่โซนเฝ้าระวัง ISO 10816 (3.5 mm/s) แนะนำเตรียมตลับลูกปืนและอัดจาระบี'
  },

  // BS-02 Cutting (MA2312001) - Healthy after PU air hose replacement
  {
    id: 'pdm-bs02-1',
    machineId: 'm-02',
    machineCode: 'MA2312001',
    machineName: 'Cutting',
    recordedAt: '2026-10-20 09:00',
    inspectorName: 'นายสมเกียรติ (ซ่อมบำรุง)',
    vibrationRms: 2.4,
    temperatureC: 58,
    currentAmp: 7.2,
    ratedAmp: 9.5,
    pressureBar: 3.6,
    noiseStatus: 'normal',
    oilCondition: 'clean',
    notes: 'พบแรงดันลมตกก่อนเปลี่ยนสาย PU Tubing 8x5mm'
  },
  {
    id: 'pdm-bs02-2',
    machineId: 'm-02',
    machineCode: 'MA2312001',
    machineName: 'Cutting',
    recordedAt: '2026-11-11 09:00',
    inspectorName: 'นายสมเกียรติ (ซ่อมบำรุง)',
    vibrationRms: 1.6,
    temperatureC: 49,
    currentAmp: 6.8,
    ratedAmp: 9.5,
    pressureBar: 6.2,
    noiseStatus: 'normal',
    oilCondition: 'clean',
    notes: 'หลังเปลี่ยนสายลมและข้อต่อ One-Touch แรงดันคงที่ 6.2 bar เดินเครื่องเรียบ'
  },

  // BS-03 Long way (MA2312005) - Healthy
  {
    id: 'pdm-bs03-1',
    machineId: 'm-03',
    machineCode: 'MA2312005',
    machineName: 'Long way',
    recordedAt: '2026-11-10 09:15',
    inspectorName: 'นายประสิทธิ์ (PdM)',
    vibrationRms: 1.4,
    temperatureC: 47,
    currentAmp: 5.4,
    ratedAmp: 8.0,
    pressureBar: 6.0,
    noiseStatus: 'normal',
    oilCondition: 'clean',
    notes: 'สภาพมอเตอร์ขับเคลื่อนและเฟืองทดปกติ'
  },

  // BS-05 Die Cut 1 (MA2312006) - Critical trend (Motor heat & vibration spike)
  {
    id: 'pdm-bs05-1',
    machineId: 'm-05',
    machineCode: 'MA2312006',
    machineName: 'Die Cut 1',
    recordedAt: '2026-10-18 10:00',
    inspectorName: 'นายประสิทธิ์ (PdM)',
    vibrationRms: 2.6,
    temperatureC: 61,
    currentAmp: 14.2,
    ratedAmp: 16.0,
    pressureBar: 6.0,
    noiseStatus: 'normal',
    oilCondition: 'clean',
    notes: 'ตรวจติดตามรอบเดือน ต.ค.'
  },
  {
    id: 'pdm-bs05-2',
    machineId: 'm-05',
    machineCode: 'MA2312006',
    machineName: 'Die Cut 1',
    recordedAt: '2026-11-01 10:00',
    inspectorName: 'นายประสิทธิ์ (PdM)',
    vibrationRms: 3.9,
    temperatureC: 73,
    currentAmp: 15.1,
    ratedAmp: 16.0,
    pressureBar: 5.8,
    noiseStatus: 'moderate',
    oilCondition: 'dark',
    notes: 'มีเสียงหอนเล็กน้อยที่ชุดเกียร์ขับเคลื่อนหลัก'
  },
  {
    id: 'pdm-bs05-3',
    machineId: 'm-05',
    machineCode: 'MA2312006',
    machineName: 'Die Cut 1',
    recordedAt: '2026-11-13 08:45',
    inspectorName: 'นายประสิทธิ์ (PdM)',
    vibrationRms: 4.9,
    temperatureC: 82,
    currentAmp: 16.4,
    ratedAmp: 16.0,
    pressureBar: 5.7,
    noiseStatus: 'abnormal',
    oilCondition: 'metal_debris',
    notes: 'เตือนระดับอันตราย! พบแรงสั่น 4.9 mm/s อุณหภูมิห้องเกียร์ 82°C และเศษโลหะในน้ำมันเกียร์ ต้องวางแผนหยุดเปลี่ยนลูกปืน/เกียร์ด่วน'
  },

  // BS-09 Flexo (MA2312009) - Watch trend on roller current
  {
    id: 'pdm-bs09-1',
    machineId: 'm-09',
    machineCode: 'MA2312009',
    machineName: 'Flexo',
    recordedAt: '2026-11-12 14:00',
    inspectorName: 'นายเปา (ช่างไฟฟ้า)',
    vibrationRms: 2.9,
    temperatureC: 66,
    currentAmp: 18.8,
    ratedAmp: 20.0,
    pressureBar: 5.9,
    noiseStatus: 'moderate',
    oilCondition: 'clean',
    notes: 'กระแสมอเตอร์ลูกกลิ้งพิมพ์เริ่มสูงขึ้น ควรตรวจสอบแนวเพลาและตั้งสายพาน'
  }
];
