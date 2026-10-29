import test from 'node:test';
import assert from 'node:assert/strict';
import { seed } from './seed.js';
import * as A from './actions.js';

const t = (n = 0) => new Date(Date.UTC(2026, 9, 1, 9, n)).toISOString();

test('evidence request → technician record → re-assessment → approval → submission → outcome', () => {
  const d = seed();
  const c = () => A.caseById(d, 'RF-1042');
  assert.throws(() => A.requestEvidence(d, 'u-tomas', 'RF-1042', ['Serial-number photograph'], '', t(0)), A.PermissionError);
  A.requestEvidence(d, 'u-alex', 'RF-1042', ['Serial-number photograph'], 'Rating plate please', t(1));
  assert.equal(c().claimStatus, 'Evidence requested');
  assert.throws(() => A.markReady(d, 'u-alex', 'RF-1042', t()), /Needs evidence/);
  assert.throws(() => A.addEvidence(d, 'u-alex', 'RF-1042', 'Serial-number photograph', 'CRU-2602-418', t()), A.PermissionError);
  assert.equal(A.addEvidence(d, 'u-tomas', 'RF-1042', 'Serial-number photograph', 'CRU 2602 418', t(2)), 'Ready for review');
  assert.equal(c().claimStatus, 'Draft');
  A.markReady(d, 'u-alex', 'RF-1042', t(3));
  A.approve(d, 'u-alex', 'RF-1042', t(4));
  assert.equal(c().claimStatus, 'Approved to submit', '$240 is under the $250 two-person threshold');
  assert.throws(() => A.recordSubmission(d, 'u-alex', 'RF-1042', '', t()), /reference/);
  A.recordSubmission(d, 'u-alex', 'RF-1042', 'NPC-DEMO-9001', t(5));
  assert.throws(() => A.addEvidence(d, 'u-tomas', 'RF-1042', 'Parts invoice', 240, t()), /locked/);
  assert.throws(() => A.recordOutcome(d, 'u-alex', 'RF-1042', 'Partly paid', 300, 'Supplier capped the amount', t()), /less than/);
  A.recordOutcome(d, 'u-alex', 'RF-1042', 'Partly paid', 200, 'Supplier deducted a handling fee', t(6));
  assert.equal(c().claimStatus, 'Partly paid');
  assert.match(A.claimPack(d, c()), /SIMULATED RECORD/);
  for (const x of ['Evidence requested', 'Evidence added (simulated record)', 'Claim pack prepared', 'Claim approved to submit', 'Submission recorded', 'Outcome recorded']) assert.ok(d.audit.some(a => a.action === x), x);
});

test('AI suggestion gate and two-person approval above the threshold', () => {
  const d = seed();
  assert.throws(() => A.markReady(d, 'u-alex', 'RF-1045', t()), /AI suggestion/);
  const sid = A.caseById(d, 'RF-1045').suggestions[0].id;
  assert.throws(() => A.decideSuggestion(d, 'u-alex', 'RF-1045', sid, false, 'no', t()), /10 characters/);
  A.decideSuggestion(d, 'u-alex', 'RF-1045', sid, false, 'Site logger shows no surge; mechanical fault.', t(1));
  A.markReady(d, 'u-alex', 'RF-1045', t(2));
  A.approve(d, 'u-alex', 'RF-1045', t(3));
  assert.equal(A.caseById(d, 'RF-1045').claimStatus, 'Awaiting second approval');
  assert.throws(() => A.approve(d, 'u-alex', 'RF-1045', t()), /different analyst/);
  A.approve(d, 'u-riya', 'RF-1045', t(4));
  assert.equal(A.caseById(d, 'RF-1045').claimStatus, 'Approved to submit');
});

test('confirming an exclusion blocks the claim; term changes revoke pending approvals', () => {
  const d = seed();
  const sid = A.caseById(d, 'RF-1045').suggestions[0].id;
  A.decideSuggestion(d, 'u-alex', 'RF-1045', sid, true, '', t());
  assert.throws(() => A.markReady(d, 'u-alex', 'RF-1045', t()), /exclusion applies/);
  assert.match(A.claimPack(d, A.caseById(d, 'RF-1045')), /“power surge”: confirmed/);
});

test('admin bounds, terms re-assessment and roles', () => {
  const d = seed();
  assert.throws(() => A.editTerms(d, 'u-alex', 'S1', 'coverageMonths', 24, t()), A.PermissionError);
  assert.throws(() => A.editTerms(d, 'u-grace', 'S1', 'labourPct', 150, t()), /between/);
  A.editTerms(d, 'u-grace', 'S1', 'coverageMonths', 36, t(1));
  assert.equal(A.assessCase(d, A.caseById(d, 'RF-1043')).status, 'Ready for review', 'longer coverage brings RF-1043 inside');
  A.markReady(d, 'u-alex', 'RF-1043', t(2));
  A.editTerms(d, 'u-grace', 'S1', 'filingDays', 30, t(3));
  assert.equal(A.caseById(d, 'RF-1043').claimStatus, 'Draft', 'term change returns a prepared claim to draft');
  assert.throws(() => A.setRole(d, 'u-grace', 'u-grace', 'analyst', t()), /own administrator/);
  A.setPolicy(d, 'u-grace', 'today', '2027-01-01', t());
  assert.equal(A.assessCase(d, A.caseById(d, 'RF-1042')).status, 'Filing window closed');
});

test('creating a case requires an analyst and starts with required evidence missing', () => {
  const d = seed();
  const input = { supplierId: 'S2', site: 'X', equipment: 'Fridge', component: 'Fan', serial: 'S-1', installed: '2026-01-01', repaired: '2026-09-20', partsLines: [{ desc: 'Fan', amount: '60' }], labour: '40', notes: 'After a power surge.' };
  assert.throws(() => A.createCase(d, 'u-tomas', input, t()), A.PermissionError);
  const id = A.createCase(d, 'u-alex', input, t());
  const c = A.caseById(d, id);
  assert.equal(id, 'RF-1048');
  assert.deepEqual(c.evidence.map(e => e.present), [true, false, false]);
  assert.equal(c.suggestions.length, 1);
  assert.equal(A.assessCase(d, c).status, 'Eligibility unknown');
});

test('early-access validation and HubSpot payload', async () => {
  const { validateLead, leadPayload, hubspotConfig } = await import('../lead.js');
  const f = { name: 'Sam Lee', email: 'sam@example.com', company: 'Cold Co', companyType: 'Service company', equipment: 'Commercial refrigeration', volume: '50–250', challenge: 'Matching invoices', consent: false, marketing: true };
  assert.match(validateLead(f), /agree/);
  assert.equal(validateLead({ ...f, consent: true }), '');
  assert.match(validateLead({ ...f, consent: true, email: 'nope' }), /valid work email/);
  const p = leadPayload({ ...f, consent: true }, { pageUri: 'x' }, {});
  assert.deepEqual(p.fields.slice(0, 2).map(x => x.value), ['Sam', 'Lee']);
  assert.deepEqual(p.legalConsentOptions.consent.communications, [], 'no subscription without a configured type id');
  assert.equal(hubspotConfig({}), null);
});
