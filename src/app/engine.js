// Warranty assessment rules for the Afterfault prototype. Pure functions, no DOM.
// The same rules are implemented in backend/lambdas/assess_case/handler.py; both are tested
// against backend/tests/fixtures/cases.json so the prototype and the proposed Lambda stay in step.

const DAY = 86400000;
const day = iso => Date.parse(iso + 'T00:00:00Z');
export const isoDay = ms => new Date(ms).toISOString().slice(0, 10);
export const round2 = n => Math.floor(n * 100 + 0.5) / 100;
export const money = n => (n === null || n === undefined ? 'Not established' : `$${round2(n).toFixed(2).replace(/\.00$/, '')}`);
export const normalise = text => String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const serialKey = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Add calendar months in UTC. Day overflow rolls forward, e.g. 31 Jan + 1 month = 3 Mar. */
export function addMonths(iso, months) {
  const d = new Date(day(iso));
  d.setUTCMonth(d.getUTCMonth() + months);
  return isoDay(d.getTime());
}

export const daysBetween = (a, b) => Math.round((day(b) - day(a)) / DAY);
export const partsTotal = c => round2(c.partsLines.reduce((s, l) => s + Number(l.amount), 0));
const evidence = (c, name) => c.evidence.find(e => e.name === name);
const has = (c, name) => !!evidence(c, name)?.present;

/**
 * Assess one repair case against its supplier terms on a given date.
 * Returns the individual checks (each traceable to a clause or a document), a status,
 * and the potential recovery (null whenever it cannot be established).
 */
export function assess(c, terms, today) {
  const checks = [];
  const add = (id, label, result, detail) => checks.push({ id, label, result, detail });
  const coverageEnd = addMonths(c.installed, terms.coverageMonths);
  const deadline = isoDay(day(c.repaired) + terms.filingDays * DAY);
  const daysLeft = daysBetween(today, deadline);

  const datesValid = day(c.repaired) >= day(c.installed);
  add('dates', 'Repair after installation', datesValid ? 'pass' : 'fail',
    datesValid ? `Installed ${c.installed}, repaired ${c.repaired}.` : `Repair date ${c.repaired} is before installation ${c.installed}. Check the records.`);

  const covered = day(c.repaired) <= day(coverageEnd);
  add('coverage', 'Within coverage period', covered ? 'pass' : 'fail',
    covered ? `${terms.clause}: ${terms.coverageMonths} months from installation, ending ${coverageEnd}. Repair on ${c.repaired} is inside the period.`
      : `${terms.clause}: coverage ended ${coverageEnd}. Repair on ${c.repaired} is outside the period.`);

  const excluded = terms.excludedComponents.map(normalise).includes(normalise(c.component));
  add('component', 'Component covered', excluded ? 'fail' : 'pass',
    excluded ? `${terms.clause} excludes “${c.component}”.` : `“${c.component}” is not on the clause’s exclusion list.`);

  add('filing', 'Filing window open', daysLeft < 0 ? 'fail' : daysLeft <= 7 ? 'warn' : 'pass',
    daysLeft < 0 ? `Claims must be filed within ${terms.filingDays} days of repair. The window closed on ${deadline}.`
      : `File by ${deadline} (${daysLeft} day${daysLeft === 1 ? '' : 's'} left; ${terms.filingDays}-day window).`);

  const missing = terms.requiredEvidence.filter(n => !has(c, n));
  add('evidence', 'Required evidence present', missing.length ? 'fail' : 'pass',
    missing.length ? `Missing: ${missing.join(', ')}.` : `All ${terms.requiredEvidence.length} required records are present.`);

  const photo = evidence(c, 'Serial-number photograph');
  if (!photo?.present || !photo.value) {
    // Only an open question when the supplier requires the photo.
    if (terms.requiredEvidence.includes('Serial-number photograph')) add('serial', 'Serial matches across records', 'unknown', 'No serial-number photograph to compare with the repair report yet.');
  } else {
    const same = serialKey(photo.value) === serialKey(c.serial);
    add('serial', 'Serial matches across records', same ? 'pass' : 'fail',
      same ? `Photo shows ${photo.value}, matching the repair report.` : `Photo shows ${photo.value}; the repair report says ${c.serial}.`);
  }

  const invoice = evidence(c, 'Parts invoice');
  const parts = partsTotal(c);
  if (!invoice?.present || invoice.value === undefined || invoice.value === null || invoice.value === '') {
    add('invoice', 'Invoice matches repair report', 'unknown', 'No parts invoice yet, so the parts amount cannot be established.');
  } else {
    const same = Math.abs(Number(invoice.value) - parts) < 0.005;
    add('invoice', 'Invoice matches repair report', same ? 'pass' : 'fail',
      same ? `Invoice total ${money(Number(invoice.value))} matches the parts on the repair report.` : `Invoice total ${money(Number(invoice.value))} differs from the parts on the repair report (${money(parts)}).`);
  }

  const labourCovered = round2(Math.min(c.labour * terms.labourPct / 100, terms.labourCap ?? Infinity));
  const fail = id => checks.find(x => x.id === id).result === 'fail';
  let status;
  if (fail('dates')) status = 'Check dates';
  else if (fail('coverage')) status = 'Outside coverage';
  else if (fail('component')) status = 'Excluded component';
  else if (fail('filing')) status = 'Filing window closed';
  else if (checks.find(x => x.id === 'invoice').result === 'unknown') status = 'Eligibility unknown';
  else if (checks.some(x => x.result === 'fail' || x.result === 'unknown')) status = 'Needs evidence';
  else status = 'Ready for review';

  const establish = !['Check dates', 'Outside coverage', 'Excluded component', 'Filing window closed', 'Eligibility unknown'].includes(status);
  return {
    checks, status, coverageEnd, deadline, daysLeft,
    parts, labourCovered, labourExcluded: round2(c.labour - labourCovered),
    potential: establish ? round2(parts + labourCovered) : null,
  };
}

/**
 * Simulated AI suggestion. In production Amazon Bedrock reads the technician's notes against the
 * clause wording and must quote both. Here a deterministic rule produces the same shape: if the
 * notes contain an exclusion phrase from the clause, suggest that the exclusion may apply.
 */
export function suggest(c, terms) {
  const notes = normalise(c.technicianNotes);
  return terms.exclusions.filter(x => notes.includes(normalise(x))).map(x => ({
    id: `excl:${normalise(x)}`,
    phrase: x,
    notesQuote: c.technicianNotes,
    clauseQuote: terms.exclusionText,
    detail: `The technician’s notes mention “${x}”. ${terms.clause} excludes failures caused by ${x}. A reviewer should decide whether the exclusion applies before this claim goes further.`,
  }));
}

export const CLOSED = ['Paid', 'Partly paid', 'Rejected by supplier'];
export const PRE_SUBMIT = ['Draft', 'Evidence requested', 'Ready for approval', 'Awaiting second approval', 'Approved to submit'];

/** Blocking reasons for approving a claim to be submitted. Empty = may approve. */
export function approvalBlockers(c, terms, today) {
  const a = assess(c, terms, today);
  const out = [];
  if (a.status !== 'Ready for review') out.push(`Assessment is “${a.status}”.`);
  const pending = c.suggestions.filter(s => s.decision === 'pending').length;
  if (pending) out.push(`${pending} AI suggestion${pending > 1 ? 's need' : ' needs'} a reviewer decision.`);
  if (c.suggestions.some(s => s.decision === 'confirmed')) out.push('A reviewer confirmed that a clause exclusion applies.');
  if (c.requests.some(r => !r.done)) out.push('Evidence requests are still open.');
  return out;
}

export function csv(rows) {
  return rows.map(r => r.map(v => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n');
}
