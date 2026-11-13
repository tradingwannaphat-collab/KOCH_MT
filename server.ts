import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initialTickets } from './src/data/initialTickets.ts';
import { initialMachines } from './src/data/initialMachines.ts';
import { initialInspectionSheets, createEmptyMonthSheet, generateInitialCheckSheets } from './src/data/initialInspections.ts';
import { initialBOMItems } from './src/data/initialBOM.ts';
import { initialSpareParts, initialStockTransactions } from './src/data/initialSpareParts.ts';
import { initialAnnualPMPlans, generateInitialAnnualPMPlans, generateMachineAnnualPlan } from './src/data/initialPMPlans.ts';
import { MaintenanceTicket, ProgressLog, MachineAsset } from './src/types/ticket.ts';
import { MachineMonthlyCheckSheet, DayCheckRecord } from './src/types/inspection.ts';
import { MachineBOMItem, BOMChangeLog } from './src/types/bom.ts';
import { SparePartItemMaster, StockTransaction } from './src/types/sparePart.ts';
import { MachineAnnualPMPlan } from './src/types/pm.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Persistent File-backed database on disk (survives dev server restarts & reloads)
  const DATA_DIR = path.join(__dirname, 'data_storage');
  const DB_FILE = path.join(DATA_DIR, 'app_db.json');

  function loadStoredData() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        console.log('[KOCH DB] Loaded persistent database from disk successfully.');
        const loadedTickets = Array.isArray(parsed.tickets) && parsed.tickets.length > 0
          ? parsed.tickets
          : initialTickets;
        const loadedMachines = Array.isArray(parsed.machines) && parsed.machines.length > 0
          ? parsed.machines
          : initialMachines;
        const loadedInspections = Array.isArray(parsed.inspections) && parsed.inspections.length > 0
          ? parsed.inspections
          : initialInspectionSheets;

        return {
          tickets: loadedTickets,
          machines: loadedMachines,
          inspections: loadedInspections,
          bomItems: parsed.bomItems || initialBOMItems,
          spareParts: parsed.spareParts || initialSpareParts,
          stockTransactions: parsed.stockTransactions || initialStockTransactions,
          pmPlans: Array.isArray(parsed.pmPlans) && parsed.pmPlans.length > 0 ? parsed.pmPlans : initialAnnualPMPlans
        };
      }
    } catch (e) {
      console.warn('[KOCH DB] Could not read app_db.json, using seed defaults:', e);
    }
    return {
      tickets: initialTickets,
      machines: initialMachines,
      inspections: initialInspectionSheets,
      bomItems: initialBOMItems,
      spareParts: initialSpareParts,
      stockTransactions: initialStockTransactions,
      pmPlans: initialAnnualPMPlans
    };
  }

  const stored = loadStoredData();
  let tickets: MaintenanceTicket[] = [...stored.tickets];
  let machines: MachineAsset[] = [...stored.machines];
  let inspections: MachineMonthlyCheckSheet[] = [...stored.inspections];
  let bomItems: MachineBOMItem[] = [...stored.bomItems];
  let spareParts: SparePartItemMaster[] = [...stored.spareParts];
  let stockTransactions: StockTransaction[] = [...stored.stockTransactions];
  let pmPlans: MachineAnnualPMPlan[] = [...stored.pmPlans];

  function persistToDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify({
        tickets,
        machines,
        inspections,
        bomItems,
        spareParts,
        stockTransactions,
        pmPlans,
        lastSaved: new Date().toISOString()
      }, null, 2), 'utf-8');
    } catch (err) {
      console.error('[KOCH DB] Error persisting data to disk:', err);
    }
  }

  // Ensure disk file exists immediately with current data
  persistToDisk();

  // SSE Client connections
  type SSEClient = { id: number; res: express.Response };
  let sseClients: SSEClient[] = [];
  let nextClientId = 1;

  function broadcast(eventType: string, data: any) {
    if (!['connected', 'keepalive'].includes(eventType)) {
      persistToDisk();
    }
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
      try {
        client.res.write(payload);
      } catch (err) {
        // Client might have disconnected
      }
    }
  }

  // SSE Heartbeat to keep mobile connections alive
  setInterval(() => {
    for (const client of sseClients) {
      try {
        client.res.write(': keepalive\n\n');
      } catch (err) {
        // Disconnected
      }
    }
  }, 15000);

  // SSE endpoint
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const clientId = nextClientId++;
    const newClient: SSEClient = { id: clientId, res };
    sseClients.push(newClient);

    // Initial handshake
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId, timestamp: new Date().toISOString() })}\n\n`);

    req.on('close', () => {
      sseClients = sseClients.filter((c) => c.id !== clientId);
    });
  });

  // REST API Endpoints
  // GET all tickets
  app.get('/api/tickets', (req, res) => {
    res.json({
      success: true,
      tickets: tickets.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    });
  });

  // GET single ticket
  app.get('/api/tickets/:id', (req, res) => {
    const ticket = tickets.find((t) => t.id === req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }
    res.json({ success: true, ticket });
  });

  // POST create new maintenance ticket
  app.post('/api/tickets', (req, res) => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const count = tickets.length + 1;
      const ticketNo = `MN-${year}${month}-${String(count).padStart(3, '0')}`;

      const newTicket: MaintenanceTicket = {
        id: `ticket-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        ticketNo: req.body.ticketNo || ticketNo,
        formCode: 'FM-MN01-03 Rev.00 Date 19/10/2026',
        requestDate: req.body.requestDate || now.toISOString().split('T')[0],
        requestTime: req.body.requestTime || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        requesterName: req.body.requesterName || 'ไม่ระบุชื่อ',
        department: req.body.department || 'ฝ่ายผลิต',
        category: req.body.category || 'machine',
        machineNo: req.body.machineNo || '',
        location: req.body.location || '',
        urgency: req.body.urgency || 'normal',
        problemDescription: req.body.problemDescription || '',
        photos: req.body.photos || [],
        requesterSign: {
          name: req.body.requesterName || '',
          date: req.body.requestDate || now.toISOString().split('T')[0],
          time: req.body.requestTime || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
          isSigned: true,
          signatureDataUrl: req.body.requesterSignature || ''
        },
        receiverSign: {
          name: '',
          date: '',
          time: '',
          isSigned: false
        },
        status: 'pending',
        rootCause: 'lack_of_maintenance',
        rootCauseOtherText: '',
        rootCauseDetail: '',
        repairDetails: '',
        spareParts: [],
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        durationText: '',
        technicians: ['', '', ''],
        requesterApproval: { name: '', date: '', time: '', isSigned: false },
        technicianApproval: { name: '', date: '', time: '', isSigned: false },
        supervisorApproval: { name: '', date: '', time: '', isSigned: false },
        progressLogs: [
          {
            id: `p-${Date.now()}`,
            timestamp: `${now.toISOString().split('T')[0]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
            author: req.body.requesterName || 'ผู้แจ้งหน้างาน',
            role: 'ผู้แจ้งซ่อม',
            action: 'สร้างใบแจ้งซ่อมใหม่ผ่านระบบมือถือ',
            notes: req.body.problemDescription || 'แจ้งปัญหาหน้างานใหม่',
            statusChange: 'pending'
          }
        ],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };

      tickets.unshift(newTicket);
      broadcast('ticket_created', newTicket);

      res.status(201).json({ success: true, ticket: newTicket });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // PATCH update ticket details (for maintenance staff & supervisor)
  app.patch('/api/tickets/:id', (req, res) => {
    const index = tickets.findIndex((t) => t.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const currentTicket = tickets[index];
    const updatedTicket: MaintenanceTicket = {
      ...currentTicket,
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    tickets[index] = updatedTicket;
    broadcast('ticket_updated', updatedTicket);

    res.json({ success: true, ticket: updatedTicket });
  });

  // POST add real-time progress update / on-site log
  app.post('/api/tickets/:id/progress', (req, res) => {
    const index = tickets.findIndex((t) => t.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const ticket = tickets[index];
    const now = new Date();
    const timestamp = `${now.toISOString().split('T')[0]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newLog: ProgressLog = {
      id: `p-${Date.now()}`,
      timestamp,
      author: req.body.author || 'ช่างเทคนิคหน้างาน',
      role: req.body.role || 'ช่างผู้ปฏิบัติงาน',
      action: req.body.action || 'อัปเดตความคืบหน้าหน้างาน',
      notes: req.body.notes || '',
      statusChange: req.body.statusChange,
      photoUrl: req.body.photoUrl
    };

    const newStatus = req.body.statusChange || ticket.status;

    // Check if technicians or schedule need updating
    let updatedSchedule = { ...ticket };
    if (req.body.statusChange === 'in_progress' && !ticket.startDate) {
      updatedSchedule.startDate = now.toISOString().split('T')[0];
      updatedSchedule.startTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
    if (['completed', 'closed'].includes(req.body.statusChange) && !ticket.endDate) {
      updatedSchedule.endDate = now.toISOString().split('T')[0];
      updatedSchedule.endTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }

    const updatedTicket: MaintenanceTicket = {
      ...updatedSchedule,
      status: newStatus,
      progressLogs: [...ticket.progressLogs, newLog],
      updatedAt: now.toISOString()
    };

    tickets[index] = updatedTicket;
    broadcast('ticket_updated', updatedTicket);
    broadcast('progress_added', { ticketId: ticket.id, log: newLog, ticket: updatedTicket });

    res.json({ success: true, ticket: updatedTicket, log: newLog });
  });

  // DELETE single progress log from ticket (สำหรับฉันเท่านั้น / Admin Delete)
  app.delete('/api/tickets/:id/progress/:logId', (req, res) => {
    try {
      const index = tickets.findIndex((t) => t.id === req.params.id);
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Ticket not found' });
      }

      const { logId } = req.params;
      tickets[index] = {
        ...tickets[index],
        progressLogs: (tickets[index].progressLogs || []).filter((l) => l.id !== logId),
        updatedAt: new Date().toISOString()
      };

      persistToDisk();
      broadcast('ticket_updated', tickets[index]);

      res.json({ success: true, ticket: tickets[index] });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Machine Management Endpoints
  app.get('/api/machines', (req, res) => {
    res.json({ success: true, machines });
  });

  app.post('/api/machines', (req, res) => {
    try {
      const {
        no,
        code,
        name,
        processName = 'Cutting',
        category = 'machine',
        machineType = 'other',
        machineTypeLabel,
        location = 'บางแสน BS',
        department = 'ฝ่ายผลิต',
        status = 'active',
        dimensions = '',
        minMaxSheet = '',
        power = '',
        kwHp = '',
        airWater = 'No',
        motorSpec = '',
        gearSpec = '',
        supplier = '',
        model = '',
        installationYear = new Date().getFullYear().toString(),
        notes = ''
      } = req.body;

      if (!code || !name) {
        return res.status(400).json({ success: false, message: 'กรุณาระบุรหัสและชื่อเครื่องจักร' });
      }

      // Check duplicate code
      const existing = machines.find((m) => m.code.toUpperCase() === code.toUpperCase());
      if (existing) {
        return res.status(400).json({ success: false, message: `รหัสเครื่องจักร ${code} มีอยู่ในระบบแล้ว` });
      }

      const machineNo = Number(no) || machines.length + 1;
      const machineTagCode = req.body.tagCode || `BS-${String(machineNo).padStart(2, '0')}`;

      const newMachine: MachineAsset = {
        id: `m-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        no: machineNo,
        tagCode: machineTagCode,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        processName: processName.trim(),
        category,
        machineType: machineType || processName.toLowerCase(),
        machineTypeLabel: machineTypeLabel || processName,
        location: location.trim(),
        department: department.trim(),
        status,
        dimensions: dimensions.trim(),
        minMaxSheet: minMaxSheet.trim(),
        power: power.trim(),
        kwHp: kwHp.trim(),
        airWater: airWater.trim(),
        motorSpec: motorSpec.trim(),
        gearSpec: gearSpec.trim(),
        supplier: supplier.trim(),
        model: (model || req.body.model || '-').trim(),
        serialNo: (req.body.serialNo || '-').trim(),
        installationYear: installationYear.trim(),
        notes: notes.trim(),
        createdAt: new Date().toISOString()
      };

      machines.push(newMachine);
      broadcast('machine_created', newMachine);

      res.status(201).json({ success: true, machine: newMachine });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.patch('/api/machines/:id', (req, res) => {
    const index = machines.findIndex((m) => m.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Machine not found' });
    }

    const updatedMachine: MachineAsset = {
      ...machines[index],
      ...req.body
    };

    machines[index] = updatedMachine;
    broadcast('machine_updated', updatedMachine);

    res.json({ success: true, machine: updatedMachine });
  });

  app.delete('/api/machines/:id', (req, res) => {
    const index = machines.findIndex((m) => m.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Machine not found' });
    }

    const deleted = machines[index];
    machines = machines.filter((m) => m.id !== req.params.id);
    broadcast('machine_deleted', { id: req.params.id, code: deleted.code });

    res.json({ success: true, message: 'Machine deleted successfully' });
  });

  // ==========================================
  // Daily Machine Inspection (FM-MN01-04) APIs
  // ==========================================
  app.get('/api/inspections', (req, res) => {
    const { machineId, month = '2026-10' } = req.query as { machineId?: string; month?: string };
    
    if (machineId) {
      let sheet = inspections.find((s) => s.machineId === machineId && s.month === month);
      if (!sheet) {
        // Auto-create month sheet for this machine and year-month if it doesn't exist yet
        sheet = createEmptyMonthSheet(machineId, month);
        inspections.push(sheet);
        persistToDisk();
        broadcast('inspection_created', sheet);
      }
      return res.json({ success: true, sheet, inspections: [sheet] });
    }

    if (month) {
      let filtered = inspections.filter((s) => s.month === month);
      if (filtered.length === 0) {
        // Auto-create empty sheets for all machines for this newly selected month across years
        for (const m of machines) {
          const newSheet = createEmptyMonthSheet(m.id, month);
          inspections.push(newSheet);
        }
        persistToDisk();
        filtered = inspections.filter((s) => s.month === month);
      }
      return res.json({ success: true, inspections: filtered });
    }

    res.json({ success: true, inspections });
  });

  app.get('/api/inspections/:id', (req, res) => {
    const sheet = inspections.find((s) => s.id === req.params.id);
    if (!sheet) {
      return res.status(404).json({ success: false, message: 'Inspection sheet not found' });
    }
    res.json({ success: true, sheet });
  });

  // Save an entire day's check results (mobile quick-check / daily submission)
  app.post('/api/inspections/save-day', (req, res) => {
    try {
      const {
        machineId,
        month = '2026-10',
        day,
        results,
        inspectorName = '',
        supervisorName = '',
        notes = ''
      } = req.body;

      if (!machineId || !day || !results) {
        return res.status(400).json({ success: false, message: 'กรุณาระบุเครื่องจักร วันที่ และผลการตรวจ' });
      }

      let sheet = inspections.find((s) => s.machineId === machineId && s.month === month);
      if (!sheet) {
        sheet = createEmptyMonthSheet(machineId, month);
        inspections.push(sheet);
      }

      const existingTicketNos = sheet.days[day]?.ticketNos || {};
      sheet.days[day] = {
        day: Number(day),
        results,
        ticketNos: existingTicketNos,
        inspectorName: inspectorName.trim(),
        supervisorName: supervisorName.trim(),
        notes: notes.trim(),
        updatedAt: new Date().toISOString()
      };
      sheet.updatedAt = new Date().toISOString();

      broadcast('inspection_updated', sheet);
      broadcast('inspection_day_saved', { machineId, month, day, dayRecord: sheet.days[day] });

      res.json({ success: true, sheet, dayRecord: sheet.days[day] });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Toggle single cell on the 1-31 matrix
  app.post('/api/inspections/toggle-cell', (req, res) => {
    try {
      const { machineId, month = '2026-10', day, itemNo, status } = req.body;
      
      let sheet = inspections.find((s) => s.machineId === machineId && s.month === month);
      if (!sheet) {
        sheet = createEmptyMonthSheet(machineId, month);
        inspections.push(sheet);
      }

      if (!sheet.days[day]) {
        sheet.days[day] = {
          day: Number(day),
          results: {},
          ticketNos: {},
          inspectorName: '',
          supervisorName: '',
          notes: ''
        };
      }
      if (!sheet.days[day].results) {
        sheet.days[day].results = {};
      }

      sheet.days[day].results[Number(itemNo)] = status;
      sheet.days[day].updatedAt = new Date().toISOString();
      sheet.updatedAt = new Date().toISOString();

      broadcast('inspection_updated', sheet);

      res.json({ success: true, sheet, day: sheet.days[day] });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Update sheet remarks or approver
  app.patch('/api/inspections/:id', (req, res) => {
    const index = inspections.findIndex((s) => s.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Inspection sheet not found' });
    }

    inspections[index] = {
      ...inspections[index],
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    broadcast('inspection_updated', inspections[index]);
    res.json({ success: true, sheet: inspections[index] });
  });

  // Update customized checklist items for a specific machine
  app.post('/api/inspections/update-items', (req, res) => {
    try {
      const { machineId, month = '2026-10', items } = req.body;
      if (!machineId || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'กรุณาระบุ machineId และรายการข้อตรวจเช็ค' });
      }

      // Format items with sequential numbers, preserving criteria, frequency, repair ticket number, and time
      const sanitizedItems = items.map((it: any, idx: number) => ({
        no: idx + 1,
        description: (it.description || `ข้อที่ ${idx + 1}`).trim(),
        criteria: (it.criteria !== undefined && it.criteria !== null ? it.criteria : 'ไม่แตกหัก , หลวมคลอน, พร้อมใช้งาน').trim(),
        frequency: (it.frequency || 'D').trim(),
        repairTicketNo: (it.repairTicketNo || '').trim(),
        time: (it.time || '08:00').trim(),
        translations: it.translations || undefined,
        criteriaTranslations: it.criteriaTranslations || undefined
      }));

      // Update all sheets for this machine
      let affectedSheet: MachineMonthlyCheckSheet | undefined;
      inspections.forEach((s) => {
        if (s.machineId === machineId) {
          s.items = sanitizedItems;
          s.updatedAt = new Date().toISOString();
          if (s.month === month) {
            affectedSheet = s;
          }
        }
      });

      if (!affectedSheet) {
        affectedSheet = createEmptyMonthSheet(machineId, month);
        affectedSheet.items = sanitizedItems;
        inspections.push(affectedSheet);
      }

      broadcast('inspection_updated', affectedSheet);
      broadcast('inspection_items_updated', { machineId, month, items: sanitizedItems });

      res.json({ success: true, sheet: affectedSheet, items: sanitizedItems });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // AI OCR Scan Machine Tag / Plate Endpoint using Gemini
  app.post('/api/ai/scan-machine-tag', async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ success: false, message: 'กรุณาส่งรูปภาพเพื่อสแกน' });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const mimeType = imageBase64.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Fallback if no API key
        return res.json({
          success: false,
          message: 'ไม่ได้ตั้งค่า GEMINI_API_KEY กรุณาเลือกจากดรอปดาวน์',
          suggestedMachine: null
        });
      }

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI();

      const machineListContext = machines.map((m, idx) => ({
        no: m.no || idx + 1,
        tagCode: m.tagCode || `BS-${String(m.no || idx + 1).padStart(2, '0')}`,
        code: m.code,
        name: m.name,
        model: m.model || '',
        serialNo: m.serialNo || '',
        category: m.category,
        location: m.location
      }));

      const prompt = `You are an expert industrial machine recognition assistant for "KOCH Packaging (Bangsaen BS factory)".
The user provided a photo of a machine, equipment tag, nameplate, asset barcode/label, or air conditioner unit in the factory.
Identify which machine from the following 33 official assets this photo belongs to:
${JSON.stringify(machineListContext, null, 2)}

Look for clues in the image such as:
- Asset tag like BS-01, BS-02, ..., BS-33
- Equipment code like MA2312014, MA2312001, HA2311005, FCU260101, CDU260102, etc.
- Machine name (Slot, Cutting, Die Cut, Long way, Flexo, Stitching, Munal Glued, Centrifugal, Fan Coil Unit, Condensing Unit, Air pump)
- Model or Brand (AMENA, Haier, BTU ratings like 12000, 18000, 9000 BTU)
- Visual machine appearance (corrugated slotter, cutting press, printing flexo, stitcher, air conditioning unit).

Respond ONLY with a JSON object:
{
  "detectedText": "any text seen on tag or machine",
  "matchedCode": "the code from list e.g. MA2312014 or FCU260101",
  "matchedTagCode": "e.g. BS-01",
  "confidence": "high" | "medium" | "low",
  "explanation": "brief reason in Thai why this machine was matched"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: mimeType
                }
              },
              { text: prompt }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });

      const text = response.text || '{}';
      let parsedResult: any = {};
      try {
        parsedResult = JSON.parse(text);
      } catch (e) {
        parsedResult = { raw: text };
      }

      const matchedMachine = machines.find(
        (m) =>
          (parsedResult.matchedCode && m.code.toUpperCase() === parsedResult.matchedCode.toUpperCase()) ||
          (parsedResult.matchedTagCode && m.tagCode?.toUpperCase() === parsedResult.matchedTagCode.toUpperCase())
      );

      return res.json({
        success: true,
        aiResult: parsedResult,
        matchedMachine: matchedMachine || null
      });
    } catch (err: any) {
      console.error('OCR Error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ==========================================
  // Machine BOM (Bill of Materials) Endpoints
  // ==========================================

  // Get all BOM items
  app.get('/api/bom', (req, res) => {
    res.json({ success: true, count: bomItems.length, bomItems });
  });

  // Get BOM items for a specific machine
  app.get('/api/machines/:machineId/bom', (req, res) => {
    const { machineId } = req.params;
    const items = bomItems.filter(
      (b) => b.machineId === machineId || b.machineCode.toLowerCase() === machineId.toLowerCase()
    );
    res.json({ success: true, count: items.length, bomItems: items });
  });

  // Create new BOM item
  app.post('/api/bom', (req, res) => {
    try {
      const {
        machineId,
        machineCode,
        machineTag,
        machineName,
        partName,
        partNo,
        spec,
        category = 'mechanical',
        categoryLabel = 'ชิ้นส่วนกลไก',
        quantity = 1,
        unit = 'ชิ้น',
        replacementCycleDays = 180,
        cycleLabel = 'ทุก 6 เดือน',
        lastReplacedDate = new Date().toISOString().split('T')[0],
        supplier = '',
        notes = ''
      } = req.body;

      if (!partName || !machineCode) {
        return res.status(400).json({ success: false, message: 'กรุณาระบุชื่ออุปกรณ์ และรหัสเครื่องจักร' });
      }

      // Calculate next due date
      const lastDate = new Date(lastReplacedDate);
      const nextDate = new Date(lastDate.getTime() + (Number(replacementCycleDays) || 180) * 86400000);
      const nextDueDate = nextDate.toISOString().split('T')[0];

      const newItem: MachineBOMItem = {
        id: `bom-${Date.now()}`,
        machineId: machineId || 'm-custom',
        machineCode,
        machineTag: machineTag || '',
        machineName: machineName || '',
        partName,
        partNo: partNo || '-',
        spec: spec || '-',
        category,
        categoryLabel,
        quantity: Number(quantity) || 1,
        unit,
        replacementCycleDays: Number(replacementCycleDays) || 180,
        cycleLabel,
        lastReplacedDate,
        nextDueDate,
        status: 'normal',
        supplier,
        notes,
        changeHistory: [
          {
            id: `log-${Date.now()}`,
            bomItemId: `bom-${Date.now()}`,
            replacedDate: lastReplacedDate,
            technician: 'บันทึกตั้งต้นระบบ',
            quantity: Number(quantity) || 1,
            reason: 'scheduled_pm',
            reasonLabel: 'บันทึกตั้งต้นข้อมูล BOM',
            notes: 'บันทึกข้อมูลอุปกรณ์เริ่มต้นประจำเครื่องจักร',
            createdAt: new Date().toISOString()
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      bomItems.unshift(newItem);
      broadcast('bom_created', newItem);
      res.json({ success: true, bomItem: newItem });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Update Replacement Date & Record Change History
  app.post('/api/bom/:id/replace', (req, res) => {
    try {
      const { id } = req.params;
      const {
        replacedDate = new Date().toISOString().split('T')[0],
        technician = 'ช่างซ่อมบำรุง KOCH',
        quantity,
        reason = 'scheduled_pm',
        reasonLabel = 'ตามรอบบำรุงรักษาเชิงป้องกัน (PM)',
        notes = '',
        photoUrl = '',
        ticketId = ''
      } = req.body;

      const index = bomItems.findIndex((b) => b.id === id);
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'ไม่พบรายการ BOM นี้' });
      }

      const item = bomItems[index];
      const cycleDays = item.replacementCycleDays || 180;
      const repDateObj = new Date(replacedDate);
      const nextDueObj = new Date(repDateObj.getTime() + cycleDays * 86400000);
      const nextDueDate = nextDueObj.toISOString().split('T')[0];

      const changeLog: BOMChangeLog = {
        id: `log-${Date.now()}`,
        bomItemId: id,
        replacedDate,
        technician,
        quantity: Number(quantity) || item.quantity || 1,
        reason,
        reasonLabel,
        notes: notes || `เปลี่ยนอะไหล่ ${item.partName} ตามรอบ`,
        photoUrl: photoUrl || undefined,
        ticketId: ticketId || undefined,
        createdAt: new Date().toISOString()
      };

      item.lastReplacedDate = replacedDate;
      item.nextDueDate = nextDueDate;
      item.status = 'normal';
      item.changeHistory = [changeLog, ...(item.changeHistory || [])];
      item.updatedAt = new Date().toISOString();

      broadcast('bom_updated', item);
      broadcast('bom_replaced', { bomItem: item, changeLog });

      res.json({ success: true, bomItem: item, changeLog });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Update BOM item info
  app.put('/api/bom/:id', (req, res) => {
    try {
      const { id } = req.params;
      const index = bomItems.findIndex((b) => b.id === id);
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'ไม่พบรายการ BOM' });
      }

      bomItems[index] = {
        ...bomItems[index],
        ...req.body,
        updatedAt: new Date().toISOString()
      };

      broadcast('bom_updated', bomItems[index]);
      res.json({ success: true, bomItem: bomItems[index] });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Delete BOM item
  app.delete('/api/bom/:id', (req, res) => {
    try {
      const { id } = req.params;
      const index = bomItems.findIndex((b) => b.id === id);
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'ไม่พบรายการ BOM' });
      }

      const deleted = bomItems.splice(index, 1)[0];
      broadcast('bom_deleted', { id });
      res.json({ success: true, deleted });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ==========================================
  // Spare Parts (สแปร์พาร์ท) Endpoints
  // ==========================================

  // Get all spare parts & transaction history
  app.get('/api/spare-parts', (req, res) => {
    res.json({
      success: true,
      count: spareParts.length,
      spareParts,
      transactions: stockTransactions
    });
  });

  // Create new spare part
  app.post('/api/spare-parts', (req, res) => {
    try {
      const {
        partNo,
        name,
        spec = '-',
        category = 'consumable',
        categoryLabel = 'วัสดุสิ้นเปลือง',
        compatibleMachines = ['all'],
        compatibleMachineNames = 'ทุกเครื่องจักร',
        stockQty = 0,
        minStock = 2,
        unit = 'ชิ้น',
        location = 'Shelf A-01',
        unitPrice = 0,
        supplier = '',
        leadTimeDays = 3,
        imageUrl,
        notes = ''
      } = req.body;

      if (!partNo || !name) {
        return res.status(400).json({ success: false, message: 'กรุณาระบุรหัสอะไหล่ (Part No) และชื่ออะไหล่' });
      }

      const qty = Number(stockQty) || 0;
      const min = Number(minStock) || 2;
      const status: 'in_stock' | 'low_stock' | 'out_of_stock' = 
        qty <= 0 ? 'out_of_stock' : qty <= min ? 'low_stock' : 'in_stock';

      const now = new Date();
      const newPart: SparePartItemMaster = {
        id: `sp-${Date.now()}`,
        partNo: partNo.trim().toUpperCase(),
        name: name.trim(),
        spec: spec.trim(),
        category,
        categoryLabel,
        compatibleMachines: Array.isArray(compatibleMachines) ? compatibleMachines : [compatibleMachines],
        compatibleMachineNames: compatibleMachineNames || 'ทุกเครื่องจักร',
        stockQty: qty,
        minStock: min,
        unit,
        location: location.trim(),
        unitPrice: Number(unitPrice) || 0,
        supplier: supplier.trim(),
        leadTimeDays: Number(leadTimeDays) || 3,
        status,
        imageUrl: imageUrl || undefined,
        notes: notes.trim(),
        lastRestockedDate: qty > 0 ? now.toISOString().split('T')[0] : undefined,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };

      spareParts.unshift(newPart);
      broadcast('spare_part_created', newPart);
      res.json({ success: true, sparePart: newPart });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Update spare part details
  app.put('/api/spare-parts/:id', (req, res) => {
    try {
      const { id } = req.params;
      const index = spareParts.findIndex((p) => p.id === id);
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'ไม่พบรายการสแปร์พาร์ท' });
      }

      const current = spareParts[index];
      const updatedQty = req.body.stockQty !== undefined ? Number(req.body.stockQty) : current.stockQty;
      const updatedMin = req.body.minStock !== undefined ? Number(req.body.minStock) : current.minStock;
      const status = updatedQty <= 0 ? 'out_of_stock' : updatedQty <= updatedMin ? 'low_stock' : 'in_stock';

      spareParts[index] = {
        ...current,
        ...req.body,
        stockQty: updatedQty,
        minStock: updatedMin,
        status,
        updatedAt: new Date().toISOString()
      };

      broadcast('spare_part_updated', spareParts[index]);
      res.json({ success: true, sparePart: spareParts[index] });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Delete spare part
  app.delete('/api/spare-parts/:id', (req, res) => {
    try {
      const { id } = req.params;
      const index = spareParts.findIndex((p) => p.id === id);
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'ไม่พบรายการสแปร์พาร์ท' });
      }

      const deleted = spareParts.splice(index, 1)[0];
      broadcast('spare_part_deleted', { id });
      res.json({ success: true, deleted });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Stock Transaction: In / Out / Adjust
  app.post('/api/spare-parts/:id/stock', (req, res) => {
    try {
      const { id } = req.params;
      const index = spareParts.findIndex((p) => p.id === id);
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'ไม่พบรายการสแปร์พาร์ท' });
      }

      const part = spareParts[index];
      const { type, quantity, referenceTicketNo, machineCode, operator, notes } = req.body;
      const changeQty = Math.abs(Number(quantity) || 1);

      let newQty = part.stockQty;
      if (type === 'in') {
        newQty += changeQty;
      } else if (type === 'out') {
        newQty = Math.max(0, newQty - changeQty);
      } else if (type === 'adjust') {
        newQty = Math.max(0, Number(quantity) || 0);
      }

      const status: 'in_stock' | 'low_stock' | 'out_of_stock' =
        newQty <= 0 ? 'out_of_stock' : newQty <= part.minStock ? 'low_stock' : 'in_stock';

      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      part.stockQty = newQty;
      part.status = status;
      if (type === 'in') part.lastRestockedDate = currentDate;
      if (type === 'out') part.lastUsedDate = currentDate;
      part.updatedAt = now.toISOString();

      const tx: StockTransaction = {
        id: `tx-${Date.now()}`,
        sparePartId: part.id,
        partNo: part.partNo,
        partName: part.name,
        type: type || 'out',
        quantity: changeQty,
        balanceAfter: newQty,
        date: currentDate,
        time: currentTime,
        referenceTicketNo,
        machineCode,
        operator: operator || 'ช่างซ่อมบำรุง',
        notes: notes || (type === 'in' ? 'รับของเข้าสต๊อก' : 'เบิกอะไหล่ใช้งาน')
      };

      stockTransactions.unshift(tx);
      broadcast('spare_part_stock_adjusted', { sparePart: part, transaction: tx });
      res.json({ success: true, sparePart: part, transaction: tx });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ==========================================
  // ANNUAL PREVENTIVE MAINTENANCE (PM) ROUTES
  // Plan vs Actual (แผน PM ประจำปี & ซ่อมจริง)
  // ==========================================

  // GET Annual PM Plans for a specific year (default 2026)
  app.get('/api/pm-plans', (req, res) => {
    try {
      const year = parseInt(req.query.year as string, 10) || 2026;
      let plansForYear = pmPlans.filter((p) => p.year === year);

      // If plans for requested year don't exist yet, auto-generate for all machines
      if (plansForYear.length === 0) {
        console.log(`[KOCH PM] Generating annual PM plans for year ${year}...`);
        const generated = machines.map((m) => generateMachineAnnualPlan(m, year));
        pmPlans.push(...generated);
        persistToDisk();
        plansForYear = generated;
      }

      res.json({ success: true, year, pmPlans: plansForYear });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // PUT update a specific machine's annual plan
  app.put('/api/pm-plans/:id', (req, res) => {
    try {
      const { id } = req.params;
      const index = pmPlans.findIndex((p) => p.id === id);
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'PM Plan not found' });
      }

      pmPlans[index] = {
        ...pmPlans[index],
        ...req.body,
        updatedAt: new Date().toISOString()
      };

      persistToDisk();
      broadcast('pm_plan_updated', pmPlans[index]);
      res.json({ success: true, plan: pmPlans[index] });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // POST record actual PM execution for a machine and month (บันทึกผลการลงมือซ่อมบำรุงจริง - Act.)
  app.post('/api/pm-plans/:id/record-actual', (req, res) => {
    try {
      const { id } = req.params;
      const { 
        month, 
        status, 
        actualDate, 
        actualTechnicians, 
        supervisorName, 
        durationHours, 
        findings, 
        correctiveAction, 
        replacedParts, 
        tasks, 
        notes,
        isPlanned,
        plannedWeek,
        plannedScope
      } = req.body;

      const index = pmPlans.findIndex((p) => p.id === id);
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'PM Plan not found' });
      }

      const plan = pmPlans[index];
      const targetMonth = parseInt(month, 10);
      if (isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12) {
        return res.status(400).json({ success: false, message: 'Invalid month (1-12 required)' });
      }

      const existingRecord = plan.months[targetMonth] || {
        month: targetMonth,
        monthLabel: `เดือน ${targetMonth}`,
        isPlanned: isPlanned !== undefined ? isPlanned : true,
        status: 'planned'
      };

      plan.months[targetMonth] = {
        ...existingRecord,
        isPlanned: isPlanned !== undefined ? isPlanned : existingRecord.isPlanned,
        plannedWeek: plannedWeek !== undefined ? plannedWeek : existingRecord.plannedWeek,
        plannedScope: plannedScope !== undefined ? plannedScope : existingRecord.plannedScope,
        status: status || existingRecord.status || 'completed',
        actualDate: actualDate !== undefined ? actualDate : (existingRecord.actualDate || new Date().toISOString().split('T')[0]),
        actualTechnicians: actualTechnicians || existingRecord.actualTechnicians,
        supervisorName: supervisorName || existingRecord.supervisorName,
        durationHours: durationHours !== undefined ? parseFloat(durationHours) : existingRecord.durationHours,
        findings: findings !== undefined ? findings : existingRecord.findings,
        correctiveAction: correctiveAction !== undefined ? correctiveAction : existingRecord.correctiveAction,
        replacedParts: replacedParts || existingRecord.replacedParts,
        tasks: tasks || existingRecord.tasks,
        notes: notes !== undefined ? notes : existingRecord.notes
      };

      plan.updatedAt = new Date().toISOString();
      pmPlans[index] = plan;

      persistToDisk();
      broadcast('pm_plan_updated', plan);
      res.json({ success: true, plan, updatedMonth: targetMonth });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Reset to initial clean state
  app.post('/api/reset-data', (req, res) => {
    tickets = JSON.parse(JSON.stringify(initialTickets));
    machines = JSON.parse(JSON.stringify(initialMachines));
    inspections = generateInitialCheckSheets();
    bomItems = JSON.parse(JSON.stringify(initialBOMItems));
    spareParts = JSON.parse(JSON.stringify(initialSpareParts));
    stockTransactions = JSON.parse(JSON.stringify(initialStockTransactions));
    pmPlans = JSON.parse(JSON.stringify(initialAnnualPMPlans));
    persistToDisk();
    broadcast('data_reset', { tickets, machines, inspections, bomItems, spareParts, stockTransactions, pmPlans });
    res.json({ success: true, tickets, machines, inspections, bomItems, spareParts, stockTransactions, pmPlans });
  });

  // Full Database Backup Endpoint (Download entire system state as JSON)
  app.get('/api/backup-data', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="koch_maintenance_backup.json"');
    res.json({
      success: true,
      exportedAt: new Date().toISOString(),
      factory: 'KOCH Packaging (บางแสน BS)',
      tickets,
      machines,
      inspections,
      bomItems,
      spareParts,
      stockTransactions,
      pmPlans
    });
  });

  // Full Database Restore Endpoint
  app.post('/api/restore-data', (req, res) => {
    try {
      const { 
        tickets: restoredTickets, 
        machines: restoredMachines, 
        inspections: restoredInspections, 
        bomItems: restoredBom, 
        spareParts: restoredSpareParts, 
        stockTransactions: restoredTx,
        pmPlans: restoredPM
      } = req.body;

      if (!restoredTickets && !restoredMachines && !restoredInspections && !restoredPM) {
        return res.status(400).json({ success: false, message: 'ข้อมูล Backup ไม่ถูกต้อง' });
      }

      if (Array.isArray(restoredTickets) && restoredTickets.length > 0) {
        tickets = restoredTickets;
      } else if (tickets.length === 0) {
        tickets = [...initialTickets];
      }
      if (Array.isArray(restoredMachines) && restoredMachines.length > 0) machines = restoredMachines;
      if (Array.isArray(restoredInspections)) inspections = restoredInspections;
      if (Array.isArray(restoredBom)) bomItems = restoredBom;
      if (Array.isArray(restoredSpareParts)) spareParts = restoredSpareParts;
      if (Array.isArray(restoredTx)) stockTransactions = restoredTx;
      if (Array.isArray(restoredPM)) pmPlans = restoredPM;

      persistToDisk();
      broadcast('data_reset', { tickets, machines, inspections, bomItems, spareParts, stockTransactions, pmPlans });
      res.json({
        success: true,
        message: 'กู้คืนข้อมูลสำเร็จเรียบร้อย',
        count: {
          tickets: tickets.length,
          machines: machines.length,
          inspections: inspections.length,
          bomItems: bomItems.length,
          spareParts: spareParts.length
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[KOCH Maintenance Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
