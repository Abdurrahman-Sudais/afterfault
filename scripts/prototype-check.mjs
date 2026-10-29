// Drives the /app prototype across all three roles in a DOM simulation (not a real browser).
// Run after `npm run build`: node scripts/prototype-check.mjs
import { JSDOM } from 'jsdom';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const html = await fs.readFile('dist/app/index.html', 'utf8');
assert.match(html, /<title>Afterfault — Interactive prototype<\/title>/);
assert.match(html, /Prototype · fictional data/);
assert.match(html, /Good morning, Alex/);
assert.match(html, /noindex,nofollow/);
const home = await fs.readFile('dist/index.html', 'utf8');
for (const id of ['benefits', 'use-cases', 'safeguards', 'pricing', 'faq']) assert.match(home, new RegExp(`id="${id}"`), id);
assert.doesNotMatch(home, /\$\d+\s*\/\s*(month|mo|user)/i, 'no invented prices');
console.log('PASS prerendered /app and new home sections');

const dom = new JSDOM('<div id="app"></div>', { url: 'https://afterfault.site/app' });
const w = dom.window;
Object.assign(globalThis, { window: w, document: w.document, location: w.location, localStorage: w.localStorage, HTMLElement: w.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
globalThis.addEventListener = w.addEventListener.bind(w);
globalThis.removeEventListener = w.removeEventListener.bind(w);
const downloads = [];
globalThis.URL.createObjectURL = () => 'blob:x';
globalThis.URL.revokeObjectURL = () => {};
w.HTMLAnchorElement.prototype.click = function () { downloads.push(this.download); };

const React = await import('react');
const { act } = React;
const { createRoot } = await import('react-dom/client');
const { default: App } = await import('../.ssr/render.js');
let root = createRoot(document.getElementById('app'));
await act(async () => root.render(React.createElement(App, { path: '/app' })));

const text = () => document.body.textContent;
const btn = s => [...document.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(s));
const link = s => [...document.querySelectorAll('a')].find(a => a.textContent.trim().startsWith(s));
const click = async el => { assert.ok(el, 'control exists'); await act(async () => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }))); };
const change = async (el, value) => {
  const proto = el.tagName === 'SELECT' ? w.HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? w.HTMLTextAreaElement.prototype : w.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  await act(async () => el.dispatchEvent(new w.Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })));
};
const nav = async hash => { await act(async () => { w.location.hash = hash; w.dispatchEvent(new w.HashChangeEvent('hashchange')); }); };
const demoAs = name => change(document.querySelector('[aria-label="Demo as user"]'), [...document.querySelectorAll('[aria-label="Demo as user"] option')].find(o => o.textContent.startsWith(name)).value);
const submit = async form => act(async () => form.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })));

assert.match(text(), /Good morning, Alex/);
assert.match(text(), /RF-1045 · Expansion valve/, 'deadline list shows the 7-day case');
await click(link('RF-1045 · Expansion valve'));
assert.equal(w.location.hash, '#/cases/RF-1045/assessment');
assert.match(text(), /Potential recovery\$390/);
await click(link('AI suggestions'));
await change(document.querySelector('.pa-reason input'), 'Site logger shows no surge; valve fault is mechanical.');
await submit(document.querySelector('.pa-reason'));
assert.match(text(), /Suggestion dismissed/);
await click(link('Claim'));
await click(btn('Prepare claim pack'));
await click(btn('Approve to submit'));
assert.match(text(), /a different analyst must also approve/);
await click(btn('Draft claim pack'));
assert.deepEqual(downloads, ['Afterfault-RF-1045-SAMPLE-DRAFT.txt']);
console.log('PASS analyst: deadline → AI dismissal → prepare → first approval → export');

await demoAs('Riya Desai');
await nav('#/cases/RF-1045/claim');
await click(btn('Give second approval'));
await change(document.querySelector('.pa-form input'), 'CLC-DEMO-0042');
await submit(document.querySelector('.pa-form'));
assert.match(text(), /Submission recorded/);
await submit(document.querySelector('.pa-form'));
assert.match(text(), /Paid · \$390 recorded/);
console.log('PASS second analyst: approval → submission → outcome');

await nav('#/cases/RF-1042/evidence');
await submit(document.querySelector('.pa-form'));
assert.match(text(), /Request sent to the field technician/);
await demoAs('Tomas Reyes');
assert.equal(w.location.hash, '#/technician');
assert.match(text(), /RF-1042 · Compressor/);
assert.doesNotMatch(text(), /\$240/, 'technician does not see amounts');
await nav('#/cases/RF-1042');
assert.match(text(), /Not available for this role/);
await nav('#/technician/RF-1042');
await change(document.querySelector('.pa-request input'), 'CRU-2602-418');
await submit(document.querySelector('.pa-request'));
assert.match(text(), /Serial-number photograph added/);
console.log('PASS technician: sees only the request, adds the record, is kept out of case views');

// Persistence across a remount, then admin.
await act(async () => root.unmount());
root = createRoot(document.getElementById('app'));
await act(async () => root.render(React.createElement(App, { path: '/app' })));
await demoAs('Alex Morgan');
await nav('#/cases/RF-1042/assessment');
assert.match(text(), /Ready for review/);
await demoAs('Grace Bello');
await nav('#/admin');
assert.match(text(), /\$570recovery recorded/, '$180 seeded + $390 recorded now');
await nav('#/admin/audit');
assert.match(text(), /Evidence added \(simulated record\)/);
await click(btn('Export CSV'));
await click(btn('Reset demo data'));
assert.equal(localStorage.getItem('afterfault-prototype-v1'), null);
await nav('#/cases/RF-1042/assessment');
assert.match(text(), /Needs evidence/);
await act(async () => root.unmount());
w.close();
console.log('PASS persistence, admin overview and audit, reset');
