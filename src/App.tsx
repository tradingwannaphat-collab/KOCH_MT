import React, { useState, useEffect } from 'react';
import { useRealtimeTickets } from './hooks/useRealtimeTickets';
import { useRealtimeInspections } from './hooks/useRealtimeInspections';
import { Header } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { DailyInspectionManager } from './components/DailyInspectionManager';
import { PrintableInspectionDocument } from './components/PrintableInspectionDocument';
import { PrintableMachineRegistryDocument } from './components/PrintableMachineRegistryDocument';
import { NewTicketForm } from './components/NewTicketForm';
import { DashboardOverview } from './components/DashboardOverview';
import { PrintableTicketDocument } from './components/PrintableTicketDocument';
import { TicketDetailModal } from './components/TicketDetailModal';
import { OriginalDocModal } from './components/OriginalDocModal';
import { MachineListManager } from './components/MachineListManager';
import { MaintenanceTicket, MachineAsset } from './types/ticket';
import { MachineMonthlyCheckSheet } from './types/inspection';
import { Language } from './i18n/translations';
import { useRealtimeBOM } from './hooks/useRealtimeBOM';
import { useRealtimeSpareParts } from './hooks/useRealtimeSpareParts';
import { useRealtimePM } from './hooks/useRealtimePM';
import { SparePartsManager } from './components/SparePartsManager';
import { AnnualPMPlanManager } from './components/AnnualPMPlanManager';
import { SystemGuideModal } from './components/SystemGuideModal';
import { BlankFormsModal } from './components/BlankFormsModal';
import { PredictiveMaintenanceManager } from './components/PredictiveMaintenanceManager';
import { usePredictiveMaintenance } from './hooks/usePredictiveMaintenance';
import { Bell, X } from 'lucide-react';

export default function App() {
  const {
    tickets,
    machines,
    loading: ticketsLoading,
    isConnected,
    soundEnabled,
    setSoundEnabled,
    recentNotification,
    setRecentNotification,
    createTicket,
    updateTicket,
    addProgressLog,
    deleteProgressLog,
    createMachine,
    updateMachine,
    deleteMachine,
    resetDemoData
  } = useRealtimeTickets();

  const {
    bomItems,
    recordReplacement,
    createBOMItem,
    updateBOMItem,
    deleteBOMItem
  } = useRealtimeBOM();

  const {
    spareParts,
    transactions: stockTransactions,
    createSparePart,
    updateSparePart,
    deleteSparePart,
    adjustStock
  } = useRealtimeSpareParts();

  const {
    selectedYear: pmSelectedYear,
    setSelectedYear: setPmSelectedYear,
    pmPlans,
    recordActualPM,
    updatePlan: updatePMPlan
  } = useRealtimePM(2026);

  const {
    sheets,
    currentSheet,
    selectedMachineId,
    setSelectedMachineId,
    selectedMonth,
    setSelectedMonth,
    loading: inspectionsLoading,
    saveDayCheck,
    toggleCell,
    updateSheetDetails,
    updateMachineItems
  } = useRealtimeInspections();

  const {
    readings: pdmReadings,
    addReading: addPdmReading,
    deleteReading: deletePdmReading
  } = usePredictiveMaintenance();

  // Language state (th, en, my, lo)
  const [currentLang, setCurrentLang] = useState<Language>('th');

  // Active navigation tab (default to daily inspections FM-MN01-04)
  const [activeTab, setActiveTab] = useState<
    'inspections' | 'pm_plan' | 'pdm' | 'machines' | 'spare_parts' | 'new' | 'print_inspection' | 'print_registry' | 'print_ticket' | 'dashboard' | 'jobs'
  >('inspections');

  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);
  const [ticketToPrint, setTicketToPrint] = useState<MaintenanceTicket | null>(null);
  const [sheetToPrint, setSheetToPrint] = useState<MachineMonthlyCheckSheet | null>(null);
  const [showOriginalDoc, setShowOriginalDoc] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showBlankFormsModal, setShowBlankFormsModal] = useState(false);
  const [prefilledMachine, setPrefilledMachine] = useState<MachineAsset | null>(null);
  const [prefilledNotes, setPrefilledNotes] = useState<string>('');

  // Keep selectedTicket in sync with real-time updates and deletions
  useEffect(() => {
    if (selectedTicket) {
      const current = tickets.find((t) => t.id === selectedTicket.id);
      if (current && JSON.stringify(current) !== JSON.stringify(selectedTicket)) {
        setSelectedTicket(current);
      }
    }
  }, [tickets, selectedTicket]);

  // Select machine automatically if user scans QR code on a printed Machine Tag (?machine=CODE)
  useEffect(() => {
    if (machines.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const machineParam = params.get('machine');
    if (machineParam) {
      const matched = machines.find(
        (m) =>
          m.code.toLowerCase() === machineParam.toLowerCase() ||
          (m.tagCode && m.tagCode.toLowerCase() === machineParam.toLowerCase())
      );
      if (matched) {
        setSelectedMachineId(matched.id);
        setActiveTab('inspections');
      }
    }
  }, [machines.length]);

  // Counts for mobile badge
  const pendingCount = tickets.filter((t: MaintenanceTicket) => t.status === 'pending').length;
  const inProgressCount = tickets.filter((t: MaintenanceTicket) => t.status === 'in_progress').length;

  const handleTicketCreated = (newTicket: MaintenanceTicket) => {
    setSelectedTicket(newTicket);
    setPrefilledMachine(null);
    setPrefilledNotes('');
    setActiveTab('inspections');
  };

  const handleOpenPrintTicket = (ticket: MaintenanceTicket) => {
    setTicketToPrint(ticket);
    setActiveTab('print_ticket');
    setSelectedTicket(null);
  };

  const handleOpenPrintInspection = (sheet: MachineMonthlyCheckSheet) => {
    setSheetToPrint(sheet);
    setActiveTab('print_inspection');
  };

  const handleReportIssueForMachine = (machine: MachineAsset, notes: string = '') => {
    setPrefilledMachine(machine);
    setPrefilledNotes(notes);
    setActiveTab('new');
  };

  const handleViewChecklistForMachine = (machine: MachineAsset) => {
    setSelectedMachineId(machine.id);
    setActiveTab('inspections');
  };

  const loading = ticketsLoading && inspectionsLoading;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans pb-16 lg:pb-0">
      {/* Real-time Toast Notification Alert */}
      {recentNotification && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200 max-w-sm">
          <div className="w-8 h-8 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-slate-400 font-mono">แจ้งเตือนสด ({recentNotification.time})</div>
            <div className="text-xs font-semibold text-white truncate">{recentNotification.message}</div>
          </div>
          <button
            onClick={() => setRecentNotification(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header */}
      <Header
        isConnected={isConnected}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onOpenOriginalDoc={() => setShowOriginalDoc(true)}
        onResetData={resetDemoData}
        activeTab={activeTab}
        onSelectTab={(tab: string) => setActiveTab(tab as any)}
        currentLang={currentLang}
        onSelectLang={setCurrentLang}
        totalMachinesCount={machines.length}
        sparePartsCount={spareParts.length}
        onOpenGuide={() => setShowGuideModal(true)}
        onOpenBlankForms={() => setShowBlankFormsModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500 font-medium">กำลังโหลดข้อมูลระบบโรงงานบางแสน BS...</p>
          </div>
        ) : (
          <>
            {/* Tab 1: Daily Machine Inspection FM-MN01-04 */}
            {activeTab === 'inspections' && (
              <DailyInspectionManager
                machines={machines}
                sheets={sheets}
                currentSheet={currentSheet}
                selectedMachineId={selectedMachineId}
                selectedMonth={selectedMonth}
                currentLang={currentLang}
                onSelectLang={setCurrentLang}
                onSelectMachine={(mId) => setSelectedMachineId(mId)}
                onSelectMonth={(m) => setSelectedMonth(m)}
                onToggleCell={toggleCell}
                onSaveDayCheck={saveDayCheck}
                onUpdateSheetDetails={updateSheetDetails}
                onUpdateMachineItems={updateMachineItems}
                onOpenReportTicket={handleReportIssueForMachine}
                onOpenPrintInspection={handleOpenPrintInspection}
                onUpdateMachine={updateMachine}
                onOpenGuide={() => setShowGuideModal(true)}
              />
            )}

            {/* Tab: Annual Preventive Maintenance (PM) Plan vs Actual Execution (FM-MN01-02) */}
            {activeTab === 'pm_plan' && (
              <AnnualPMPlanManager
                machines={machines}
                pmPlans={pmPlans}
                selectedYear={pmSelectedYear}
                onSelectYear={setPmSelectedYear}
                onRecordActualPM={recordActualPM}
                onUpdatePlan={updatePMPlan}
                spareParts={spareParts}
                onOpenReportTicket={handleReportIssueForMachine}
                onViewMachineHistory={(m) => {
                  setSelectedMachineId(m.id);
                  setActiveTab('machines');
                }}
              />
            )}

            {/* Tab: Predictive Maintenance (PdM) */}
            {activeTab === 'pdm' && (
              <PredictiveMaintenanceManager
                machines={machines}
                tickets={tickets}
                sheets={sheets}
                pmPlans={pmPlans}
                bomItems={bomItems}
                readings={pdmReadings}
                onAddReading={addPdmReading}
                onDeleteReading={deletePdmReading}
                onOpenReportTicket={(m, notes) => handleReportIssueForMachine(m, notes)}
              />
            )}

            {/* Tab 2: Machine Registry Table & BOM */}
            {activeTab === 'machines' && (
              <MachineListManager
                machines={machines}
                tickets={tickets}
                onCreateMachine={createMachine}
                onUpdateMachine={updateMachine}
                onDeleteMachine={deleteMachine}
                onReportIssueForMachine={(m) => handleReportIssueForMachine(m)}
                onViewChecklist={handleViewChecklistForMachine}
                onOpenPrintRegistry={() => setActiveTab('print_registry')}
                onSelectTicket={(ticket) => setSelectedTicket(ticket)}
                onPrintTicket={handleOpenPrintTicket}
                bomItems={bomItems}
                onRecordReplacement={recordReplacement}
                onCreateBOMItem={createBOMItem}
                onUpdateBOMItem={updateBOMItem}
                onDeleteBOMItem={deleteBOMItem}
                spareParts={spareParts}
                transactions={stockTransactions}
                onCreateSparePart={createSparePart}
                onUpdateSparePart={updateSparePart}
                onDeleteSparePart={deleteSparePart}
                onAdjustStock={adjustStock}
              />
            )}

            {/* Tab: Dedicated Spare Parts Inventory Manager */}
            {activeTab === 'spare_parts' && (
              <SparePartsManager
                spareParts={spareParts}
                transactions={stockTransactions}
                machines={machines}
                tickets={tickets}
                onCreatePart={createSparePart}
                onUpdatePart={updateSparePart}
                onDeletePart={deleteSparePart}
                onAdjustStock={adjustStock}
                onSelectMachine={() => {
                  setActiveTab('machines');
                }}
                onOpenNewTicketForPart={(part) => {
                  setPrefilledNotes(`ต้องการเบิก/เปลี่ยนสแปร์พาร์ท: [${part.partNo}] ${part.name} (สเปก: ${part.spec})`);
                  setActiveTab('new');
                }}
              />
            )}

            {/* Tab: Print Machine Registry Document (FM-MN01-01) */}
            {activeTab === 'print_registry' && (
              <PrintableMachineRegistryDocument
                machines={machines}
                onBack={() => setActiveTab('machines')}
              />
            )}

            {/* Tab 3: New Ticket Form (FM-MN01-03) */}
            {activeTab === 'new' && (
              <NewTicketForm
                onSubmit={createTicket}
                onSuccess={handleTicketCreated}
                machines={machines}
                initialMachine={prefilledMachine}
                initialProblemNotes={prefilledNotes}
                onCreateMachine={createMachine}
              />
            )}

            {/* Tab 4: Printable Inspection Document (FM-MN01-04) */}
            {activeTab === 'print_inspection' && (
              <PrintableInspectionDocument
                sheet={sheetToPrint || currentSheet || sheets[0]}
                allMachines={machines}
                allSheets={sheets}
                onSelectSheet={(s) => setSheetToPrint(s)}
                selectedMonth={selectedMonth}
                onSelectMonth={setSelectedMonth}
                onBack={() => setActiveTab('inspections')}
              />
            )}

            {/* Tab 5: Printable Ticket Document (FM-MN01-03) */}
            {activeTab === 'print_ticket' && (
              <PrintableTicketDocument
                ticket={ticketToPrint || tickets[0] || ({} as any)}
                allTickets={tickets}
                onSelectTicket={(t) => setTicketToPrint(t)}
                onBack={() => setActiveTab('inspections')}
              />
            )}

            {/* Tab 6: Dashboard Overview */}
            {activeTab === 'dashboard' && (
              <DashboardOverview
                tickets={tickets}
                machines={machines}
                onSelectTicket={(ticket) => setSelectedTicket(ticket)}
                onNewTicket={() => {
                  setPrefilledMachine(null);
                  setPrefilledNotes('');
                  setActiveTab('new');
                }}
                onPrintTicket={handleOpenPrintTicket}
              />
            )}
          </>
        )}
      </main>

      {/* Ticket Detail / Update Modal (if user clicks on a ticket) */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onUpdateTicket={async (id, updates) => {
            const res = await updateTicket(id, updates);
            if (res.ticket) setSelectedTicket(res.ticket);
            return res;
          }}
          onAddProgress={async (id, payload) => {
            const res = await addProgressLog(id, payload);
            if (res.ticket) setSelectedTicket(res.ticket);
            return res;
          }}
          onDeleteProgress={async (id, logId) => {
            const res = await deleteProgressLog(id, logId);
            if (res.ticket) setSelectedTicket(res.ticket);
            return res;
          }}
          onPrintTicket={handleOpenPrintTicket}
        />
      )}

      {/* Original Document Modal (FM-MN01-03 Inspection) */}
      {showOriginalDoc && (
        <OriginalDocModal onClose={() => setShowOriginalDoc(false)} />
      )}

      {/* System Operation & SOP Guide Modal */}
      {showGuideModal && (
        <SystemGuideModal
          onClose={() => setShowGuideModal(false)}
          onOpenTab={(tab) => setActiveTab(tab as any)}
        />
      )}

      {/* Blank Forms Center Modal */}
      {showBlankFormsModal && (
        <BlankFormsModal
          machines={machines}
          onClose={() => setShowBlankFormsModal(false)}
        />
      )}

      {/* Mobile Bottom Thumb Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={(tab: string) => setActiveTab(tab as any)}
        pendingCount={pendingCount}
        inProgressCount={inProgressCount}
        machineCount={machines.length}
      />
    </div>
  );
}
