export type AuditResultCode = 'C' | 'NC' | 'O';

export interface AuditChecklistItem {
  id: string;
  no: number;
  question: string;
  clause: string;
  title: string;
  subTitle: string;
  category: 
    | 'วัตถุประสงค์คุณภาพ (Quality Objectives)' 
    | 'การจัดการความเสี่ยง (Risk Management)' 
    | 'แผนบำรุงรักษา PM (Preventive Maintenance)' 
    | 'การตรวจเช็คก่อนเริ่มงาน (Pre-Operation Inspection)' 
    | 'ประวัติการซ่อมบำรุง (Maintenance History)' 
    | 'การยืนยันส่งมอบงาน (Post-Repair Verification)' 
    | 'การประเมินประสิทธิภาพ (Performance & KPI)';
  
  // Executive explanation for ISO Auditors
  isoExplanation: string;
  
  // How the software directly complies and provides live evidence
  systemComplianceSummary: string;
  
  // Specific live evidence links and indicators
  evidencePoints: {
    label: string;
    description: string;
    badge: string;
    tabTarget: 'inspections' | 'machines' | 'spare_parts' | 'new' | 'dashboard' | 'history' | 'print_registry' | 'print_inspection' | 'print_ticket';
    buttonText: string;
  }[];

  // Official ISO requirement references
  isoRequirementDetails: string[];
}

export interface AuditEvaluationState {
  result: AuditResultCode;
  notes: string;
  auditorName: string;
  assessedAt: string;
}
