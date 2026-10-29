import React, { useState } from 'react';
import { Download, Check, X } from 'lucide-react';
import { money, csv, PRE_SUBMIT } from './engine.js';
import { assessCase, editTerms, setRole, setPolicy, PERMISSIONS, displayName } from './actions.js';
import { PageHead, Kpi, StackBar, Empty, fmtDate, download } from './ui.jsx';

const ROLES = [['analyst', 'Warranty analyst'], ['technician', 'Field technician'], ['admin', 'Administrator']];
const EVIDENCE = ['Repair report', 'Parts invoice', 'Installation record', 'Serial-number photograph'];

export function AdminOverview({ data }) {
  const rows = data.cases.map(c => ({ c, a: assessCase(data, c) }));
  const sum = xs => xs.reduce((s, x) => s + x, 0);
  const open = rows.filter(r => PRE_SUBMIT.includes(r.c.claimStatus) && r.a.potential !== null);
  const submitted = rows.filter(r => r.c.submission);
  const paid = sum(rows.filter(r => r.c.outcome).map(r => r.c.outcome.amount));
  const missed = rows.filter(r => ['Outside coverage', 'Filing window closed'].includes(r.a.status));
  const ai = rows.flatMap(r => r.c.suggestions);
  const decided = ai.filter(s => s.decision !== 'pending');
  return (
    <>
      <PageHead title="Workspace overview" sub="Aggregate figures only. Case contents stay with analysts. All amounts are fictional demo values." />
      <div className="pa-kpis">
        <Kpi value={money(sum(open.map(r => r.a.potential)))} label="potential in open cases" />
        <Kpi value={submitted.length} label="claims recorded as submitted" />
        <Kpi value={money(paid)} label="recovery recorded" />
        <Kpi value={missed.length} label="cases outside coverage or filing window" />
      </div>
      <div className="pa-grid2">
        <section className="pa-card"><h2>Cases by assessment</h2>
          <table className="pa-table"><tbody>{Object.entries(rows.reduce((m, r) => ({ ...m, [r.a.status]: (m[r.a.status] || 0) + 1 }), {})).map(([k, n]) => <tr key={k}><td>{k}</td><td className="num">{n}</td></tr>)}</tbody></table>
          <p className="pa-hint">Cases closed by the filing window are the clearest signal of recoverable cost being missed. Shorten the time from repair to review to reduce them.</p>
        </section>
        <section className="pa-card"><h2>AI suggestion outcomes</h2>
          <StackBar parts={[{ label: 'Exclusion confirmed', value: ai.filter(s => s.decision === 'confirmed').length, tone: 'bad' }, { label: 'Dismissed', value: ai.filter(s => s.decision === 'dismissed').length, tone: 'muted' }, { label: 'Pending', value: ai.filter(s => s.decision === 'pending').length, tone: 'ai' }]} />
          <p className="pa-hint">{decided.length ? `${decided.filter(s => s.decision === 'confirmed').length} of ${decided.length} decided suggestions were confirmed by an analyst.` : 'No suggestions decided yet.'} Track this rate across prompt and model changes.</p>
        </section>
      </div>
    </>
  );
}

export function AdminTerms({ data, act, notify }) {
  return (
    <>
      <PageHead title="Supplier terms" sub="The rules each case is assessed against. Changing terms re-assesses open cases and revokes their pending approvals." />
      {data.terms.map(t => {
        const num = (key, label, step = 1) => (
          <label>{label}<input type="number" step={step} defaultValue={t[key] ?? ''} key={`${t.id}-${key}-${t[key]}`} onBlur={e => { const v = e.target.value; if (String(v) !== String(t[key] ?? '') && act(editTerms, t.id, key, v).ok) notify(`${t.supplier}: ${label.toLowerCase()} updated.`); }} /></label>
        );
        return (
          <section className="pa-card pa-form" key={t.id} aria-labelledby={`t-${t.id}`}>
            <h2 id={`t-${t.id}`}>{t.supplier} · {t.clause}</h2>
            <div className="pa-form-grid">
              {num('coverageMonths', 'Coverage from installation (months)')}
              {num('filingDays', 'Filing window after repair (days)')}
              {num('labourPct', 'Labour covered (%)')}
              {num('labourCap', 'Labour cap ($, blank = none)', 0.01)}
            </div>
            <fieldset><legend>Required evidence</legend>
              {EVIDENCE.map(n => <label key={n} className="check-label"><input type="checkbox" checked={t.requiredEvidence.includes(n)} onChange={e => { const next = e.target.checked ? [...t.requiredEvidence, n] : t.requiredEvidence.filter(x => x !== n); if (act(editTerms, t.id, 'requiredEvidence', EVIDENCE.filter(x => next.includes(x))).ok) notify(`${t.supplier}: required evidence updated.`); }} /> {n}</label>)}
            </fieldset>
            <p className="pa-hint">Excluded components: {t.excludedComponents.join(', ') || 'none'}. Exclusion wording used for AI suggestions: “{t.exclusionText}”</p>
          </section>
        );
      })}
      <p className="pa-hint">In production, terms are entered from the supplier’s actual warranty document with a link to the source page, and every rule change is versioned so past assessments stay explainable.</p>
    </>
  );
}

export function AdminUsers({ data, user, act, notify }) {
  return (
    <>
      <PageHead title="Users & roles" sub="Least privilege: technicians see only requested records; administrators see aggregates, not case contents." />
      <div className="pa-card pa-tablewrap">
        <table className="pa-table">
          <thead><tr><th>Name</th><th>Title</th><th>Role</th></tr></thead>
          <tbody>{data.users.map(u => (
            <tr key={u.id}><td><span className="pa-avatar">{u.initials}</span> {u.name}{u.id === user.id && ' (you)'}</td><td>{u.title}</td>
              <td><select aria-label={`Role for ${u.name}`} value={u.role} onChange={e => { if (act(setRole, u.id, e.target.value).ok) notify(`${u.name} is now ${ROLES.find(r => r[0] === e.target.value)[1]}.`); }}>{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></td></tr>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}

export function AdminPolicy({ data, act, notify }) {
  const p = data.policy;
  return (
    <>
      <PageHead title="Policy" sub="Workspace-wide controls. Every change is written to the audit log." />
      <section className="pa-card pa-form">
        <label className="check-label"><input type="checkbox" checked={p.aiSuggestions} onChange={e => { if (act(setPolicy, 'aiSuggestions', e.target.checked).ok) notify(`AI suggestions ${e.target.checked ? 'on' : 'off'} for new cases.`); }} /> AI suggestions on clause exclusions</label>
        <label>Second approval required above ($)<input type="number" min="0" defaultValue={p.secondApprovalOver} key={`soa-${p.secondApprovalOver}`} onBlur={e => { if (Number(e.target.value) !== p.secondApprovalOver && act(setPolicy, 'secondApprovalOver', e.target.value).ok) notify('Threshold updated.'); }} /></label>
        <label>Demo date (drives coverage and filing-window checks)<input type="date" value={p.today} onChange={e => { if (e.target.value && act(setPolicy, 'today', e.target.value).ok) notify('Demo date changed; all cases re-assessed.'); }} /></label>
        <p className="pa-hint">Rule checks always run whether AI is on or off. AI output is always labelled and always needs an analyst decision; that gate cannot be switched off.</p>
      </section>
    </>
  );
}

export function AdminAudit({ data }) {
  const [q, setQ] = useState('');
  const rows = data.audit.filter(a => `${a.action} ${a.detail} ${displayName(data, a.user)}`.toLowerCase().includes(q.toLowerCase())).reverse();
  return (
    <>
      <PageHead title="Audit log" sub="Append-only record of who did what, and when.">
        <button className="text-button" onClick={() => download('afterfault-audit.csv', csv([['id', 'time', 'user', 'action', 'detail'], ...data.audit.map(a => [a.id, a.at, displayName(data, a.user), a.action, a.detail])]), 'text/csv')}><Download size={16} aria-hidden="true" /> Export CSV</button>
      </PageHead>
      <div className="pa-filters"><label><span className="sr-only">Filter audit log</span><input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Filter by action, case or person…" /></label></div>
      <div className="pa-card pa-tablewrap">
        <table className="pa-table">
          <thead><tr><th>Time (UTC)</th><th>Who</th><th>Action</th><th>Detail</th></tr></thead>
          <tbody>{rows.map(a => <tr key={a.id}><td>{fmtDate(a.at)}</td><td>{displayName(data, a.user)}</td><td>{a.action}</td><td>{a.detail}</td></tr>)}</tbody>
        </table>
        {!rows.length && <Empty>No entries match.</Empty>}
      </div>
    </>
  );
}

export function AdminPermissions() {
  const cell = v => (v === true ? <Check size={14} aria-label="Allowed" /> : v === false ? <X size={14} aria-label="Not allowed" /> : <small>{v}</small>);
  return (
    <>
      <PageHead title="Permissions" sub="What each role can do. The prototype checks this on every action; production enforces it on the server." />
      <div className="pa-card pa-tablewrap">
        <table className="pa-table pa-matrix">
          <thead><tr><th>Capability</th><th>Analyst</th><th>Technician</th><th>Administrator</th></tr></thead>
          <tbody>{PERMISSIONS.map(([label, r]) => <tr key={label}><td>{label}</td><td>{cell(r.analyst)}</td><td>{cell(r.technician)}</td><td>{cell(r.admin)}</td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
