import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assess, suggest, addMonths, approvalBlockers, csv } from './engine.js';
import { seed } from './seed.js';

const fx = JSON.parse(await readFile(new URL('../../backend/tests/fixtures/cases.json', import.meta.url), 'utf8'));

test('rules match the shared fixtures used by the Python Lambda', () => {
  for (const c of fx.cases) {
    const terms = { ...fx.terms[c.terms], ...(c.termsPatch || {}) };
    const a = assess({ ...fx.base, ...c.patch }, terms, c.today);
    assert.equal(a.status, c.status, `${c.name}: status`);
    assert.equal(a.potential, c.potential, `${c.name}: potential`);
    for (const [id, result] of Object.entries(c.results)) assert.equal(a.checks.find(x => x.id === id)?.result ?? null, result, `${c.name}: ${id}`);
  }
});

test('AI suggestion rule matches the shared fixtures', () => {
  for (const s of fx.suggestions) assert.deepEqual(suggest({ technicianNotes: s.notes }, fx.terms[s.terms]).map(x => x.phrase), s.phrases);
});

test('calendar month arithmetic rolls over like the Lambda', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-03-03');
  assert.equal(addMonths('2024-02-29', 12), '2025-03-01');
  assert.equal(addMonths('2026-02-10', 12), '2027-02-10');
});

test('seed cases match the home-page demo and cover every status', () => {
  const d = seed();
  const get = id => { const c = d.cases.find(x => x.id === id); return [c, assess(c, d.terms.find(t => t.id === c.supplierId), d.policy.today)]; };
  const [c42, a42] = get('RF-1042');
  assert.equal(a42.status, 'Needs evidence'); assert.equal(a42.potential, 240); assert.equal(a42.coverageEnd, '2027-02-10'); assert.equal(c42.labour, 90);
  assert.equal(get('RF-1043')[1].status, 'Outside coverage');
  assert.equal(get('RF-1044')[1].status, 'Eligibility unknown');
  const [c45, a45] = get('RF-1045');
  assert.equal(a45.potential, 390); assert.equal(a45.labourCovered, 80); assert.equal(c45.suggestions.length, 1);
  assert.deepEqual(approvalBlockers(c45, d.terms[1], d.policy.today), ['1 AI suggestion needs a reviewer decision.']);
  assert.equal(get('RF-1046')[1].status, 'Excluded component');
  assert.deepEqual(get('RF-1047')[1].checks.filter(x => x.result === 'fail').map(x => x.id), ['serial', 'invoice']);
});

test('csv escaping', () => assert.equal(csv([['a', 'b,c'], ['"q"', 'x\ny']]), 'a,"b,c"\n"""q""","x\ny"'));
