// State transitions for the prototype. Each action mutates a draft copy of the workspace data,
// checks the acting user's role first, and writes an audit entry. The UI clones, applies and
// persists; tests call these directly.
import { assess, suggest, approvalBlockers, money, PRE_SUBMIT, CLOSED, round2 } from './engine.js';

export const PERMISSIONS = [
  ['View cases and assessments', { analyst: true, technician: 'Requested evidence only', admin: 'Aggregates only' }],
  ['Create cases, assign, request evidence', { analyst: true, technician: false, admin: false }],
  ['Add evidence records', { analyst: false, technician: true, admin: false }],
  ['Decide AI suggestions', { analyst: true, technician: false, admin: false }],
  ['Approve, record submission and outcome', { analyst: true, technician: false, admin: false }],
  ['Edit supplier terms', { analyst: false, technician: false, admin: true }],
  ['Change roles and policy', { analyst: false, technician: false, admin: true }],
  ['View audit log', { analyst: false, technician: false, admin: true }],
];

const ALLOWED = { analyst: ['analyst'], technician: ['technician'], admin: ['admin'], note: ['analyst', 'technician'] };
export class PermissionError extends Error {}

export const userById = (d, id) => d.users.find(u => u.id === id);
export const caseById = (d, id) => d.cases.find(c => c.id === id);
export const termsFor = (d, c) => d.terms.find(t => t.id === c.supplierId);
export const displayName = (d, id) => (id === 'system' ? 'System' : userById(d, id)?.name || id);
export const assessCase = (d, c) => assess(c, termsFor(d, c), d.policy.today);

function guard(d, userId, kind, what) {
  const u = userById(d, userId);
  if (!u || !ALLOWED[kind].includes(u.role)) throw new PermissionError(`${u ? u.name : 'This user'} cannot ${what}.`);
  return u;
}

export function audit(d, userId, action, detail, now) {
  d.audit.push({ id: (d.audit.at(-1)?.id || 0) + 1, at: now, user: userId, action, detail });
}

function open(c) {
  if (!PRE_SUBMIT.includes(c.claimStatus)) throw new Error(`${c.id} has been submitted. Its records are locked.`);
}

function revoke(d, c, userId, now, why) {
  if (c.approval || ['Ready for approval', 'Awaiting second approval', 'Approved to submit'].includes(c.claimStatus)) {
    const had = c.approval;
    c.approval = null;
    c.claimStatus = c.requests.some(r => !r.done) ? 'Evidence requested' : 'Draft';
    if (had) audit(d, userId, 'Approval revoked', `${c.id} · ${why}`, now);
  }
}

export function createCase(d, userId, input, now) {
  guard(d, userId, 'analyst', 'create cases');
  const terms = d.terms.find(t => t.id === input.supplierId);
  if (!terms) throw new Error('Choose a supplier.');
  for (const k of ['site', 'equipment', 'component', 'serial', 'installed', 'repaired']) if (!String(input[k] || '').trim()) throw new Error('Complete every case field.');
  const lines = input.partsLines.filter(l => l.desc.trim() && Number(l.amount) > 0);
  if (!lines.length) throw new Error('Add at least one parts line with an amount.');
  const id = `RF-${Math.max(...d.cases.map(c => Number(c.id.slice(3)))) + 1}`;
  const c = {
    id, supplierId: input.supplierId, site: input.site.trim(), equipment: input.equipment.trim(), component: input.component.trim(), serial: input.serial.trim(),
    installed: input.installed, repaired: input.repaired, partsLines: lines.map(l => ({ desc: l.desc.trim(), amount: round2(Number(l.amount)) })), labour: round2(Number(input.labour) || 0),
    technicianNotes: input.notes.trim(), claimStatus: 'Draft', assignee: userId, requests: [], notes: [], approval: null, submission: null, outcome: null,
    evidence: terms.requiredEvidence.map(n => ({ name: n, present: n === 'Repair report', ref: `${n === 'Repair report' ? 'REP' : n === 'Parts invoice' ? 'INV' : n === 'Installation record' ? 'INS' : 'PHOTO'}-${id.slice(3)}` })),
  };
  c.suggestions = d.policy.aiSuggestions ? suggest(c, terms).map(s => ({ ...s, decision: 'pending' })) : [];
  d.cases.unshift(c);
  audit(d, userId, 'Case created', `${id} · ${c.equipment} at ${c.site}`, now);
  return id;
}

export function assignCase(d, userId, caseId, assignee, now) {
  guard(d, userId, 'analyst', 'assign cases');
  const c = caseById(d, caseId);
  c.assignee = assignee;
  audit(d, userId, 'Case assigned', `${caseId} → ${displayName(d, assignee)}`, now);
}

export function addNote(d, userId, caseId, text, now) {
  guard(d, userId, 'note', 'add notes');
  if (!text.trim()) throw new Error('Write a note first.');
  caseById(d, caseId).notes.push({ by: userId, at: now, text: text.trim() });
  audit(d, userId, 'Note added', caseId, now);
}

export function requestEvidence(d, userId, caseId, items, note, now) {
  guard(d, userId, 'analyst', 'request evidence');
  const c = caseById(d, caseId);
  open(c);
  const missing = items.filter(n => !c.evidence.find(e => e.name === n)?.present && !c.requests.some(r => r.item === n && !r.done));
  if (!missing.length) throw new Error('Those records are already present or requested.');
  missing.forEach(item => c.requests.push({ id: `${caseId}-${c.requests.length + 1}`, item, note: note.trim(), by: userId, at: now, done: false }));
  revoke(d, c, userId, now, 'evidence requested');
  c.claimStatus = 'Evidence requested';
  audit(d, userId, 'Evidence requested', `${caseId} · ${missing.join(', ')}`, now);
}

/** Technician adds a record. `value` is what the record shows (invoice total, serial on the photo). */
export function addEvidence(d, userId, caseId, name, value, now) {
  guard(d, userId, 'technician', 'add evidence');
  const c = caseById(d, caseId);
  open(c);
  const e = c.evidence.find(x => x.name === name);
  if (!e) throw new Error('That record is not part of this case.');
  if (name === 'Parts invoice' && !(Number(value) > 0)) throw new Error('Enter the invoice total.');
  if (name === 'Serial-number photograph' && !String(value || '').trim()) throw new Error('Enter the serial number visible in the photo.');
  e.present = true;
  e.simulated = true;
  e.by = userId;
  e.at = now;
  if (name === 'Parts invoice') e.value = round2(Number(value));
  else if (name === 'Serial-number photograph') e.value = String(value).trim();
  c.requests.filter(r => r.item === name && !r.done).forEach(r => { r.done = true; r.doneAt = now; });
  revoke(d, c, userId, now, `${name} changed`);
  if (c.claimStatus === 'Evidence requested' && c.requests.every(r => r.done)) c.claimStatus = 'Draft';
  audit(d, userId, 'Evidence added (simulated record)', `${caseId} · ${name}${e.value !== undefined ? ` · ${e.value}` : ''}`, now);
  return assessCase(d, c).status;
}

export function decideSuggestion(d, userId, caseId, suggestionId, confirm, reason, now) {
  guard(d, userId, 'analyst', 'decide AI suggestions');
  const c = caseById(d, caseId);
  open(c);
  const s = c.suggestions.find(x => x.id === suggestionId);
  if (!confirm && (!reason || reason.trim().length < 10)) throw new Error('Give a reason of at least 10 characters for dismissing a suggestion.');
  s.decision = confirm ? 'confirmed' : 'dismissed';
  s.reason = confirm ? '' : reason.trim();
  s.by = userId;
  s.at = now;
  revoke(d, c, userId, now, 'AI suggestion decided');
  audit(d, userId, confirm ? 'AI suggestion confirmed: exclusion applies' : 'AI suggestion dismissed', `${caseId} · “${s.phrase}”${confirm ? '' : ` · ${s.reason}`}`, now);
}

export function markReady(d, userId, caseId, now) {
  guard(d, userId, 'analyst', 'prepare claims');
  const c = caseById(d, caseId);
  open(c);
  const blockers = approvalBlockers(c, termsFor(d, c), d.policy.today);
  if (blockers.length) throw new Error(blockers.join(' '));
  c.claimStatus = 'Ready for approval';
  audit(d, userId, 'Claim pack prepared', `${caseId} · potential ${money(assessCase(d, c).potential)}`, now);
}

export function approve(d, userId, caseId, now) {
  guard(d, userId, 'analyst', 'approve claims');
  const c = caseById(d, caseId);
  if (!['Ready for approval', 'Awaiting second approval'].includes(c.claimStatus)) throw new Error('Prepare the claim pack before approving.');
  const blockers = approvalBlockers(c, termsFor(d, c), d.policy.today);
  if (blockers.length) throw new Error(blockers.join(' '));
  const potential = assessCase(d, c).potential;
  if (c.claimStatus === 'Awaiting second approval') {
    if (c.approval.by === userId) throw new Error('A different analyst must give the second approval.');
    c.approval = { ...c.approval, second: userId, secondAt: now, final: true };
    c.claimStatus = 'Approved to submit';
    audit(d, userId, 'Claim approved (second approver)', `${caseId} · ${money(potential)}`, now);
    return;
  }
  const two = potential > d.policy.secondApprovalOver;
  c.approval = { by: userId, at: now, final: !two };
  c.claimStatus = two ? 'Awaiting second approval' : 'Approved to submit';
  audit(d, userId, two ? 'Claim approved (first approver)' : 'Claim approved to submit', `${caseId} · ${money(potential)}`, now);
}

export function recordSubmission(d, userId, caseId, ref, now) {
  guard(d, userId, 'analyst', 'record submissions');
  const c = caseById(d, caseId);
  if (c.claimStatus !== 'Approved to submit') throw new Error('Only approved claims can be recorded as submitted.');
  if (!ref || ref.trim().length < 3) throw new Error('Enter the supplier’s claim reference.');
  c.submission = { ref: ref.trim(), by: userId, at: now };
  c.claimStatus = 'Submitted (recorded)';
  audit(d, userId, 'Submission recorded', `${caseId} · supplier ref ${c.submission.ref}`, now);
}

export function recordOutcome(d, userId, caseId, type, amount, reason, now) {
  guard(d, userId, 'analyst', 'record outcomes');
  const c = caseById(d, caseId);
  if (c.claimStatus !== 'Submitted (recorded)') throw new Error('Record the submission first.');
  const potential = assessCase(d, c).potential;
  const amt = round2(Number(amount));
  if (type === 'Paid' && !(amt > 0)) throw new Error('Enter the amount paid.');
  if (type === 'Partly paid' && !(amt > 0 && amt < potential)) throw new Error(`A partial payment must be more than $0 and less than ${money(potential)}.`);
  if (type !== 'Paid' && (!reason || reason.trim().length < 10)) throw new Error('Record the supplier’s reason (at least 10 characters).');
  if (!CLOSED.includes(type)) throw new Error('Unknown outcome.');
  c.outcome = { type, amount: type === 'Rejected by supplier' ? 0 : amt, reason: (reason || '').trim(), by: userId, at: now };
  c.claimStatus = type;
  audit(d, userId, 'Outcome recorded', `${caseId} · ${type}${type === 'Rejected by supplier' ? '' : ` ${money(amt)}`}`, now);
}

const BOUNDS = { coverageMonths: [1, 120], labourPct: [0, 100], labourCap: [0, 10000], filingDays: [1, 365] };
const LABELS = { coverageMonths: 'Coverage (months)', labourPct: 'Labour covered (%)', labourCap: 'Labour cap ($)', filingDays: 'Filing window (days)' };

export function editTerms(d, userId, termsId, key, value, now) {
  guard(d, userId, 'admin', 'edit supplier terms');
  const t = d.terms.find(x => x.id === termsId);
  let v = value;
  if (key === 'requiredEvidence') {
    if (!value.length) throw new Error('At least one record must be required.');
  } else {
    if (key === 'labourCap' && (value === '' || value === null)) v = null;
    else {
      v = Number(value);
      const [lo, hi] = BOUNDS[key];
      if (!Number.isFinite(v) || v < lo || v > hi) throw new Error(`${LABELS[key]} must be between ${lo} and ${hi}.`);
    }
  }
  const old = t[key];
  t[key] = v;
  if (key === 'requiredEvidence') {
    d.cases.filter(c => c.supplierId === termsId && PRE_SUBMIT.includes(c.claimStatus)).forEach(c => {
      v.filter(n => !c.evidence.some(e => e.name === n)).forEach(n => c.evidence.push({ name: n, present: false, ref: `${n.slice(0, 4).toUpperCase()}-${c.id.slice(3)}` }));
    });
  }
  d.cases.filter(c => c.supplierId === termsId && PRE_SUBMIT.includes(c.claimStatus)).forEach(c => revoke(d, c, userId, now, 'supplier terms changed'));
  const show = x => (Array.isArray(x) ? x.join(', ') : x ?? 'none');
  audit(d, userId, 'Supplier terms changed', `${t.supplier} · ${key === 'requiredEvidence' ? 'Required evidence' : LABELS[key]}: ${show(old)} → ${show(v)}`, now);
}

export function setRole(d, userId, targetId, role, now) {
  guard(d, userId, 'admin', 'change roles');
  if (targetId === userId && role !== 'admin') throw new Error('You cannot remove your own administrator role.');
  const t = userById(d, targetId);
  const old = t.role;
  t.role = role;
  audit(d, userId, 'Role changed', `${t.name}: ${old} → ${role}`, now);
}

export function setPolicy(d, userId, key, value, now) {
  guard(d, userId, 'admin', 'change policy');
  let v = value;
  if (key === 'secondApprovalOver') {
    v = Number(value);
    if (!Number.isFinite(v) || v < 0 || v > 100000) throw new Error('Second-approval threshold must be between 0 and 100000.');
  }
  if (key === 'today' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Enter a valid date.');
  const old = d.policy[key];
  d.policy[key] = v;
  audit(d, userId, 'Policy changed', `${key}: ${old} → ${v}`, now);
}

/** Plain-text claim pack for export. */
export function claimPack(d, c) {
  const t = termsFor(d, c);
  const a = assessCase(d, c);
  return [
    'AFTERFAULT PROTOTYPE — DRAFT CLAIM PACK',
    'Fictional sample data. Simulated records. This file is not a submission and no recovery has been received.',
    '',
    `Case ${c.id} · ${c.equipment} · ${c.component} · serial ${c.serial} · site ${c.site}`,
    `Supplier: ${t.supplier} · ${t.clause}`,
    `Installed ${c.installed} · repaired ${c.repaired} · coverage ends ${a.coverageEnd} · file by ${a.deadline}`,
    '',
    'COSTS',
    ...c.partsLines.map(l => `  ${l.desc}: ${money(l.amount)}`),
    `  Labour: ${money(c.labour)} (${t.labourPct}% covered${t.labourCap !== null ? `, capped at ${money(t.labourCap)}` : ''}: ${money(a.labourCovered)}; excluded ${money(a.labourExcluded)})`,
    `  Potential recovery: ${money(a.potential)}`,
    '',
    `ASSESSMENT: ${a.status}`,
    ...a.checks.map(x => `  [${x.result.toUpperCase()}] ${x.label}: ${x.detail}`),
    '',
    'EVIDENCE',
    ...c.evidence.map(e => `  ${e.present ? 'Present' : 'Missing'}: ${e.name} (${e.ref})${e.value !== undefined ? ` · ${e.value}` : ''}${e.simulated ? ' · SIMULATED RECORD' : ''}`),
    '',
    'AI SUGGESTIONS',
    ...(c.suggestions.length ? c.suggestions.map(s => `  “${s.phrase}”: ${s.decision}${s.reason ? ` (${s.reason})` : ''}`) : ['  None']),
    '',
    `Claim status: ${c.claimStatus}${c.submission ? ` · supplier ref ${c.submission.ref}` : ''}${c.outcome ? ` · ${c.outcome.type} ${money(c.outcome.amount)}` : ''}`,
    `Assignee: ${displayName(d, c.assignee)}`,
    ...c.notes.map(n => `Note (${displayName(d, n.by)}): ${n.text}`),
    '',
    'Human review required. Evidence completeness is not supplier approval.',
  ].join('\n');
}
