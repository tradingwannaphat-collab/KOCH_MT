export type OilConditionStatus = 'clean' | 'dark' | 'metal_debris';
export type NoiseStatus = 'normal' | 'moderate' | 'abnormal';
export type PdMRiskLevel = 'healthy' | 'watch' | 'critical';

export interface ConditionReading {
  id: string;
  machineId: string;
  machineCode: string;
  machineName: string;
  recordedAt: string; // YYYY-MM-DD HH:mm
  inspectorName: string;
  vibrationRms: number; // mm/s (ISO 10816-3: <2.8 Good, 2.8-4.5 Watch, >4.5 Critical)
  temperatureC: number; // Celsius (<65 Normal, 65-80 Watch, >80 Critical)
  currentAmp: number; // Measured Ampere
  ratedAmp?: number; // Rated Motor Ampere
  pressureBar?: number; // Pneumatic / Hydraulic pressure (bar)
  noiseStatus: NoiseStatus;
  oilCondition: OilConditionStatus;
  notes?: string;
}

export interface MachinePdMAssessment {
  machineId: string;
  tagCode: string;
  code: string;
  name: string;
  department: string;
  healthScore: number; // 0 - 100
  riskLevel: PdMRiskLevel;
  estimatedRulDays: number; // Estimated Remaining Useful Life before planned intervention
  predictedComponent: string;
  recommendedAction: string;
  signals: string[];
  latestReading?: ConditionReading;
  historyReadings: ConditionReading[];
  abnormalCheckCount: number;
  recentTicketCount: number;
  overdueBomCount: number;
}
