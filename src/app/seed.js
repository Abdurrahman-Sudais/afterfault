// Fictional seed data for the prototype. Every supplier, clause, case, person and serial is invented.
// RF-1042, RF-1043 and RF-1044 match the sample desk on the home page.
import { suggest } from './engine.js';

export const DEMO_TODAY = '2026-10-01';

export const USERS = [
  { id: 'u-alex', name: 'Alex Morgan', title: 'Warranty analyst', role: 'analyst', initials: 'AM' },
  { id: 'u-riya', name: 'Riya Desai', title: 'Service operations lead', role: 'analyst', initials: 'RD' },
  { id: 'u-tomas', name: 'Tomas Reyes', title: 'Field technician', role: 'technician', initials: 'TR' },
  { id: 'u-grace', name: 'Grace Bello', title: 'Workspace administrator', role: 'admin', initials: 'GB' },
];

export const DEFAULT_POLICY = { aiSuggestions: true, secondApprovalOver: 250, today: DEMO_TODAY };

export const TERMS = [
  {
    id: 'S1', supplier: 'Northpoint Compressors (fictional)', clause: 'Clause DEMO-W01', coverageMonths: 12, labourPct: 0, labourCap: null, filingDays: 60,
    requiredEvidence: ['Repair report', 'Parts invoice', 'Installation record', 'Serial-number photograph'],
    excludedComponents: [], exclusions: ['power surge', 'improper installation', 'physical damage'],
    exclusionText: 'Failures caused by power surge, improper installation or physical damage are not covered.',
  },
  {
    id: 'S2', supplier: 'Coldline Components (fictional)', clause: 'Clause DEMO-W02', coverageMonths: 24, labourPct: 50, labourCap: 100, filingDays: 30,
    requiredEvidence: ['Repair report', 'Parts invoice', 'Serial-number photograph'],
    excludedComponents: ['Door gasket', 'Light bulb'], exclusions: ['power surge', 'refrigerant contamination'],
    exclusionText: 'Consumables (door gaskets, light bulbs) are excluded, as are failures caused by power surge or refrigerant contamination.',
  },
];

const ev = (name, present, ref, value) => ({ name, present, ref, ...(value !== undefined && present ? { value } : {}) });

function build(c) {
  const terms = TERMS.find(t => t.id === c.supplierId);
  return {
    claimStatus: 'Draft', assignee: 'Unassigned', requests: [], notes: [], approval: null, submission: null, outcome: null,
    ...c,
    suggestions: (c.suggestions || suggest(c, terms)).map(s => ({ decision: 'pending', ...s })),
  };
}

export function seed() {
  const cases = [
    build({
      id: 'RF-1042', supplierId: 'S1', site: 'Harbour Street Market', equipment: 'Commercial refrigeration unit', component: 'Compressor', serial: 'CRU-2602-418',
      installed: '2026-02-10', repaired: '2026-09-22', partsLines: [{ desc: 'Replacement compressor', amount: 240 }], labour: 90,
      technicianNotes: 'Compressor seized. Replaced and recharged. Unit holding temperature.',
      evidence: [ev('Repair report', true, 'REP-1042'), ev('Parts invoice', true, 'INV-1042', 240), ev('Installation record', true, 'INS-1042'), ev('Serial-number photograph', false, 'PHOTO-1042')],
    }),
    build({
      id: 'RF-1043', supplierId: 'S1', site: 'Northgate Deli', equipment: 'Walk-in cold room', component: 'Evaporator fan', serial: 'WCR-2403-117',
      installed: '2024-03-04', repaired: '2026-09-19', partsLines: [{ desc: 'Evaporator fan motor', amount: 180 }], labour: 75,
      technicianNotes: 'Fan motor bearings worn. Replaced.', assignee: 'u-alex',
      evidence: [ev('Repair report', true, 'REP-1043'), ev('Parts invoice', true, 'INV-1043', 180), ev('Installation record', true, 'INS-1043'), ev('Serial-number photograph', true, 'PHOTO-1043', 'WCR-2403-117')],
    }),
    build({
      id: 'RF-1044', supplierId: 'S1', site: 'Riverside Grocer', equipment: 'Display refrigeration cabinet', component: 'Condenser motor', serial: 'DRC-2605-702',
      installed: '2026-05-18', repaired: '2026-09-24', partsLines: [{ desc: 'Condenser fan motor', amount: 125 }], labour: 65,
      technicianNotes: 'Condenser motor not starting. Replaced from van stock.',
      evidence: [ev('Repair report', true, 'REP-1044'), ev('Parts invoice', false, 'INV-1044'), ev('Installation record', true, 'INS-1044'), ev('Serial-number photograph', true, 'PHOTO-1044', 'DRC-2605-702')],
    }),
    build({
      id: 'RF-1045', supplierId: 'S2', site: 'Eastside Supermarket', equipment: 'Walk-in freezer', component: 'Expansion valve', serial: 'WFZ-2506-221',
      installed: '2025-06-01', repaired: '2026-09-08', partsLines: [{ desc: 'Thermostatic expansion valve', amount: 260 }, { desc: 'Fitting kit', amount: 50 }], labour: 160,
      technicianNotes: 'Valve stuck closed. Store manager reports the fault started after a power surge on the site last week.',
      evidence: [ev('Repair report', true, 'REP-1045'), ev('Parts invoice', true, 'INV-1045', 310), ev('Serial-number photograph', true, 'PHOTO-1045', 'WFZ-2506-221')],
    }),
    build({
      id: 'RF-1046', supplierId: 'S2', site: 'Harbour Street Market', equipment: 'Display refrigeration cabinet', component: 'Door gasket', serial: 'DRC-2511-090',
      installed: '2025-11-03', repaired: '2026-09-27', partsLines: [{ desc: 'Door gasket set', amount: 70 }], labour: 40,
      technicianNotes: 'Gasket split along hinge side. Replaced.',
      evidence: [ev('Repair report', true, 'REP-1046'), ev('Parts invoice', true, 'INV-1046', 70), ev('Serial-number photograph', true, 'PHOTO-1046', 'DRC-2511-090')],
    }),
    build({
      id: 'RF-1047', supplierId: 'S2', site: 'Northgate Deli', equipment: 'Ice machine', component: 'Water pump', serial: 'ICM-2409-033',
      installed: '2025-09-15', repaired: '2026-09-15', partsLines: [{ desc: 'Water pump', amount: 85 }], labour: 120,
      technicianNotes: 'Pump noisy and not circulating. Replaced.',
      evidence: [ev('Repair report', true, 'REP-1047'), ev('Parts invoice', true, 'INV-1047', 95), ev('Serial-number photograph', true, 'PHOTO-1047', 'ICM-2409-03')],
    }),
    build({
      id: 'RF-1038', supplierId: 'S1', site: 'Riverside Grocer', equipment: 'Commercial refrigeration unit', component: 'Control board', serial: 'CRU-2601-077',
      installed: '2026-01-12', repaired: '2026-08-04', partsLines: [{ desc: 'Control board', amount: 180 }], labour: 60,
      technicianNotes: 'Control board unresponsive. Replaced.', assignee: 'u-riya', claimStatus: 'Paid',
      evidence: [ev('Repair report', true, 'REP-1038'), ev('Parts invoice', true, 'INV-1038', 180), ev('Installation record', true, 'INS-1038'), ev('Serial-number photograph', true, 'PHOTO-1038', 'CRU-2601-077')],
      approval: { by: 'u-riya', at: '2026-08-06T10:00:00Z', final: true },
      submission: { ref: 'NPC-DEMO-5521', by: 'u-riya', at: '2026-08-06T14:20:00Z' },
      outcome: { type: 'Paid', amount: 180, by: 'u-riya', at: '2026-09-02T09:00:00Z' },
    }),
  ];

  const audit = [
    ['2026-08-06T10:00:00Z', 'u-riya', 'Claim approved to submit', 'RF-1038 · potential $180'],
    ['2026-08-06T14:20:00Z', 'u-riya', 'Submission recorded', 'RF-1038 · supplier ref NPC-DEMO-5521'],
    ['2026-09-02T09:00:00Z', 'u-riya', 'Outcome recorded', 'RF-1038 · Paid $180'],
    ['2026-09-29T08:30:00Z', 'u-grace', 'Policy changed', 'Second approval above $250'],
    ['2026-09-30T16:10:00Z', 'system', 'Cases imported', '6 completed repairs from the service system (sample)'],
  ].map(([at, user, action, detail], i) => ({ id: i + 1, at, user, action, detail }));

  return { version: 1, users: USERS.map(u => ({ ...u })), policy: { ...DEFAULT_POLICY }, terms: TERMS.map(t => structuredClone(t)), cases, audit };
}
