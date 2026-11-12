import React from 'react';
import { PlusCircle, Wrench, BarChart3, FileSpreadsheet, Cog, ClipboardCheck, Boxes, Calendar } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  pendingCount: number;
  inProgressCount: number;
  machineCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  pendingCount,
  inProgressCount,
  machineCount = 0
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-1.5 px-2 lg:hidden shadow-lg safe-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {/* Tab 1: Daily Inspection (FM-MN01-04) */}
        <button
          onClick={() => onSelectTab('inspections')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition ${
            activeTab === 'inspections'
              ? 'text-blue-600 font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="relative">
            <ClipboardCheck className={`w-5 h-5 ${activeTab === 'inspections' ? 'text-blue-600' : 'text-slate-500'}`} />
          </div>
          <span className="text-[10px] mt-0.5">ตรวจประจำวัน</span>
        </button>

        {/* Tab: Annual PM Plan vs Act */}
        <button
          onClick={() => onSelectTab('pm_plan')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition ${
            activeTab === 'pm_plan'
              ? 'text-indigo-600 font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className={`w-5 h-5 ${activeTab === 'pm_plan' ? 'text-indigo-600' : 'text-slate-500'}`} />
          <span className="text-[10px] mt-0.5 font-medium">แผน PM</span>
        </button>

        {/* Tab 2: Machines List */}
        <button
          onClick={() => onSelectTab('machines')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition ${
            activeTab === 'machines'
              ? 'text-blue-600 font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Cog className={`w-5 h-5 ${activeTab === 'machines' ? 'text-blue-600' : 'text-slate-500'}`} />
          <span className="text-[10px] mt-0.5 font-medium truncate max-w-[85px]">เครื่องจักร & Office</span>
        </button>

        {/* Tab 3: Spare Parts List */}
        <button
          onClick={() => onSelectTab('spare_parts')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition ${
            activeTab === 'spare_parts'
              ? 'text-indigo-600 font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className={`w-5 h-5 ${activeTab === 'spare_parts' ? 'text-indigo-600' : 'text-slate-500'}`} />
          <span className="text-[10px] mt-0.5 font-medium">สแปร์พาร์ท</span>
        </button>

        {/* Tab 4: New Repair Ticket (FM-MN01-03) */}
        <button
          onClick={() => onSelectTab('new')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition ${
            activeTab === 'new'
              ? 'text-rose-600 font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="relative">
            <PlusCircle className={`w-5 h-5 ${activeTab === 'new' ? 'text-rose-600' : 'text-slate-500'}`} />
          </div>
          <span className="text-[11px] mt-0.5">+แจ้งซ่อม</span>
        </button>


        {/* Tab 5: Dashboard */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition ${
            activeTab === 'dashboard'
              ? 'text-blue-600 font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className={`w-5 h-5 ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-500'}`} />
          <span className="text-[11px] mt-0.5">แดชบอร์ด</span>
        </button>
      </div>
    </nav>
  );
};
