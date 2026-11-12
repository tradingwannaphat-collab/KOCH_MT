import { initialMachines } from '../data/initialMachines';
import { initialTickets } from '../data/initialTickets';
import { generateInitialCheckSheets } from '../data/initialInspections';
import { initialBOMItems } from '../data/initialBOM';
import { initialSpareParts, initialStockTransactions } from '../data/initialSpareParts';
import { generateInitialAnnualPMPlans, initialAnnualPMPlans } from '../data/initialPMPlans';

export const CACHE_KEYS = {
  TICKETS: 'koch_tickets_cache_v2',
  MACHINES: 'koch_machines_cache_v2',
  INSPECTIONS: 'koch_inspection_sheets_cache_v2',
  BOM: 'koch_bom_items_cache_v2',
  SPARE_PARTS: 'koch_spare_parts_cache_v2',
  STOCK_TX: 'koch_stock_tx_cache_v2',
  PM_2026: 'koch_pm_plans_2026',
  PM_2027: 'koch_pm_plans_2027'
};

function safeGetFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as unknown as T;
      if (parsed && typeof parsed === 'object') return parsed as unknown as T;
    }
  } catch (e) {
    console.warn(`[KOCH Backup] Failed reading ${key} from localStorage`, e);
  }
  return fallback;
}

/**
 * Download a complete JSON backup of the factory database.
 * Works seamlessly with backend if available, or directly from client storage/defaults on static hosts like Vercel.
 */
export async function downloadFullSystemBackup(): Promise<{ success: boolean; filename: string }> {
  let backupData: any = null;

  // 1. Attempt to fetch from backend API if active
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch('/api/backup-data', { signal: controller.signal });
    clearTimeout(timeoutId);

    const contentType = res.headers.get('content-type');
    if (res.ok && contentType && contentType.includes('application/json')) {
      const json = await res.json();
      if (json && (Array.isArray(json.machines) || Array.isArray(json.tickets))) {
        backupData = json;
      }
    }
  } catch (err) {
    // Backend API not reachable or static host (Vercel)
  }

  // 2. If backend didn't supply data, construct from localStorage + master initial dataset
  if (!backupData) {
    const tickets = safeGetFromStorage(CACHE_KEYS.TICKETS, initialTickets);
    const machines = safeGetFromStorage(CACHE_KEYS.MACHINES, initialMachines);
    const inspections = safeGetFromStorage(CACHE_KEYS.INSPECTIONS, generateInitialCheckSheets());
    const bomItems = safeGetFromStorage(CACHE_KEYS.BOM, initialBOMItems);
    const spareParts = safeGetFromStorage(CACHE_KEYS.SPARE_PARTS, initialSpareParts);
    const stockTransactions = safeGetFromStorage(CACHE_KEYS.STOCK_TX, initialStockTransactions);

    // Merge PM plans for 2026 (2569) and 2027 (2570)
    const pm2026 = safeGetFromStorage(CACHE_KEYS.PM_2026, generateInitialAnnualPMPlans(2026));
    const pm2027 = safeGetFromStorage(CACHE_KEYS.PM_2027, generateInitialAnnualPMPlans(2027));
    const pmPlans = [...pm2026, ...pm2027];

    backupData = {
      success: true,
      exportedAt: new Date().toISOString(),
      factory: 'KOCH Packaging (บางแสน BS)',
      generator: 'KOCH Smart Maintenance Client Standalone',
      tickets,
      machines,
      inspections,
      bomItems,
      spareParts,
      stockTransactions,
      pmPlans
    };
  }

  // 3. Trigger browser file download
  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const filename = `koch_factory_backup_${dateStr}.json`;
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { success: true, filename };
}

/**
 * Restore complete factory database from JSON backup file.
 * Restores to localStorage immediately and syncs with backend if reachable.
 */
export async function restoreFullSystemBackup(jsonText: string): Promise<{ success: boolean; message?: string }> {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    return { success: false, message: 'ไฟล์ข้อมูลไม่ใช่รูปแบบ JSON ที่ถูกต้อง' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { success: false, message: 'ข้อมูลในไฟล์ว่างเปล่าหรือไม่ถูกต้อง' };
  }

  // 1. Immediately store into browser localStorage
  try {
    if (Array.isArray(parsed.tickets) && parsed.tickets.length > 0) {
      localStorage.setItem(CACHE_KEYS.TICKETS, JSON.stringify(parsed.tickets));
    }
    if (Array.isArray(parsed.machines) && parsed.machines.length > 0) {
      localStorage.setItem(CACHE_KEYS.MACHINES, JSON.stringify(parsed.machines));
    }
    if (Array.isArray(parsed.inspections) && parsed.inspections.length > 0) {
      localStorage.setItem(CACHE_KEYS.INSPECTIONS, JSON.stringify(parsed.inspections));
    }
    if (Array.isArray(parsed.bomItems) && parsed.bomItems.length > 0) {
      localStorage.setItem(CACHE_KEYS.BOM, JSON.stringify(parsed.bomItems));
    }
    if (Array.isArray(parsed.spareParts) && parsed.spareParts.length > 0) {
      localStorage.setItem(CACHE_KEYS.SPARE_PARTS, JSON.stringify(parsed.spareParts));
    }
    if (Array.isArray(parsed.stockTransactions) && parsed.stockTransactions.length > 0) {
      localStorage.setItem(CACHE_KEYS.STOCK_TX, JSON.stringify(parsed.stockTransactions));
    }
    if (Array.isArray(parsed.pmPlans) && parsed.pmPlans.length > 0) {
      const p26 = parsed.pmPlans.filter((p: any) => p.year === 2026);
      const p27 = parsed.pmPlans.filter((p: any) => p.year === 2027);
      if (p26.length > 0) localStorage.setItem(CACHE_KEYS.PM_2026, JSON.stringify(p26));
      if (p27.length > 0) localStorage.setItem(CACHE_KEYS.PM_2027, JSON.stringify(p27));
    }
  } catch (e) {
    console.error('[KOCH Backup] Error writing to localStorage', e);
  }

  // 2. Try syncing with backend API if available
  try {
    fetch('/api/restore-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed)
    }).catch(() => {});
  } catch (e) {}

  // 3. Broadcast custom event
  try {
    window.dispatchEvent(new CustomEvent('koch_data_restored', { detail: parsed }));
  } catch (e) {}

  return { success: true };
}
