import React, { useState } from 'react';
import { ArrowRight, Download, Check, X, Send, Play, FileText, Paperclip } from 'lucide-react';
import { money, approvalBlockers, csv, PRE_SUBMIT, CLOSED } from './engine.js';
import {
  assessCase, termsFor, displayName, createCase, assignCase, addNote, requestEvidence, decideSuggestion,
  markReady, approve, recordSubmission, recordOutcome, claimPack,
} from './actions.js';
import { Link, PageHead, AiBadge, Status, Kpi, Empty, StackBar, fmtDate, fmtDay, download } from './ui.jsx';

const NEXT = {
  Draft: ['Review the assessment', 'assessment'],
  'Evidence requested': ['Waiting for the technician', 'evidence'],
  'Ready for approval': ['Approve the claim', 'claim'],
  'Awaiting second approval': ['A second analyst approves', 'claim'],
  'Approved to submit': ['Submit to the supplier, then record it', 'claim'],
  'Submitted (recorded)': ['Record the supplier’s outcome', 'claim'],
  Paid: ['Closed', 'claim'], 'Partly paid': ['Closed', 'claim'], 'Rejected by supplier': ['Closed', 'claim'],
};

/* ---------------- Dashboard ---------------- */
export function AnalystDashboard({ data, user }) {
  const rows = data.cases.map(c => ({ c, a: assessCase(data, c) }));
  const active = rows.filter(r => PRE_SUBMIT.includes(r.c.claimStatus));
  const recoverable = active.filter(r => r.a.potential !== null);
  const pipeline = recoverable.reduce((s, r) => s + r.a.potential, 0);
  const closing = active.filter(r => r.a.potential !== null && r.a.daysLeft >= 0 && r.a.daysLeft <= 14).sort((x, y) => x.a.daysLeft - y.a.daysLeft);
  const ai = active.reduce((s, r) => s + r.c.suggestions.filter(x => x.decision === 'pending').length, 0);
  const by = st => active.filter(r => r.a.status === st).length;
  return (
    <>
      <PageHead title={`Good morning, ${user.name.split(' ')[0]}`} sub="Completed repairs that may be recoverable under supplier terms, and what each one still needs." />
      <div className="pa-kpis">
        <Kpi value={money(pipeline)} label={`potential across ${recoverable.length} open cases`} to="#/cases" />
        <Kpi value={closing.length} label="filing deadlines in the next 14 days" />
        <Kpi value={by('Needs evidence') + by('Eligibility unknown')} label="cases waiting on evidence" />
        <Kpi value={ai} label="AI suggestions awaiting a decision" />
      </div>
      <div className="pa-grid2">
        <section className="pa-card" aria-labelledby="deadlines">
          <h2 id="deadlines">Deadlines first</h2>
          {closing.length ? (
            <ul className="pa-list">
              {closing.map(({ c, a }) => (
                <li key={c.id}>
                  <Link to={`#/cases/${c.id}/${NEXT[c.claimStatus][1]}`}><strong>{c.id} · {c.component}</strong><small>{c.site} · {money(a.potential)}</small></Link>
                  <Status value={a.daysLeft <= 7 ? 'warn' : 'pass'} label={`${a.daysLeft} days left`} />
                  <span className="pa-next">{NEXT[c.claimStatus][0]} <ArrowRight size={14} aria-hidden="true" /></span>
                </li>
              ))}
            </ul>
          ) : <Empty>No recoverable case closes within 14 days.</Empty>}
        </section>
        <section className="pa-card" aria-labelledby="mix">
          <h2 id="mix">Open cases by assessment</h2>
          <StackBar parts={[{ label: 'Ready for review', value: by('Ready for review'), tone: 'ok' }, { label: 'Needs evidence', value: by('Needs evidence'), tone: 'warn' }, { label: 'Eligibility unknown', value: by('Eligibility unknown'), tone: 'muted' }, { label: 'Not recoverable', value: by('Outside coverage') + by('Excluded component') + by('Filing window closed'), tone: 'bad' }]} />
          <ul className="pa-legend"><li><i className="ok" />Ready {by('Ready for review')}</li><li><i className="warn" />Needs evidence {by('Needs evidence')}</li><li><i className="muted" />Unknown {by('Eligibility unknown')}</li><li><i className="bad" />Not recoverable {by('Outside coverage') + by('Excluded component') + by('Filing window closed')}</li></ul>
          <p className="pa-hint">“Not recoverable” is a rule result under the supplied fictional terms (outside coverage, excluded component or filing window closed), not a judgement about the repair.</p>
          <h2>Recent activity</h2>
          <ol className="pa-feed">{data.audit.slice(-5).reverse().map(a => <li key={a.id}><span>{a.action}</span><small>{a.detail} · {fmtDate(a.at)}</small></li>)}</ol>
        </section>
      </div>
    </>
  );
}

/* ---------------- Case list ---------------- */
export function CaseList({ data }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const rows = data.cases.map(c => ({ c, a: assessCase(data, c) })).filter(({ c, a }) =>
    `${c.id} ${c.site} ${c.equipment} ${c.component} ${c.serial}`.toLowerCase().includes(q.toLowerCase()) && (status === 'All' || a.status === status || c.claimStatus === status));
  return (
    <>
      <PageHead title="Repair cases" sub="Each case links a completed repair to the supplier terms that may cover it."><Link className="button small" to="#/cases/new">New case</Link></PageHead>
      <div className="pa-filters">
        <label><span className="sr-only">Search cases</span><input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search case, site, equipment or serial…" /></label>
        <label><span className="sr-only">Filter by status</span>
          <select value={status} onChange={e => setStatus(e.target.value)}>
            {['All', 'Ready for review', 'Needs evidence', 'Eligibility unknown', 'Outside coverage', 'Excluded component', 'Filing window closed', ...Object.keys(NEXT)].map(s => <option key={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <div className="pa-card pa-tablewrap">
        <table className="pa-table">
          <thead><tr><th>Case</th><th>Supplier</th><th>Repaired</th><th>Assessment</th><th className="num">Potential</th><th>Claim</th></tr></thead>
          <tbody>
            {rows.map(({ c, a }) => (
              <tr key={c.id}>
                <td><Link to={`#/cases/${c.id}`}><strong>{c.id} · {c.component}</strong></Link><small>{c.equipment} · {c.site}</small></td>
                <td>{termsFor(data, c).supplier}</td>
                <td>{fmtDay(c.repaired)}</td>
                <td><Status value={a.status} /></td>
                <td className="num">{money(a.potential)}</td>
                <td><Status value={c.claimStatus} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <Empty>No cases match. Clear the search or choose another status.</Empty>}
      </div>
    </>
  );
}

/* ---------------- New case ---------------- */
const EXAMPLE = { supplierId: 'S2', site: 'Lakeside Bakery', equipment: 'Reach-in refrigerator', component: 'Evaporator fan', serial: 'RIR-2508-114', installed: '2025-08-20', repaired: '2026-09-29', partsLines: [{ desc: 'Evaporator fan motor', amount: '95' }, { desc: '', amount: '' }], labour: '110', notes: 'Fan motor seized; replaced. No sign of external damage.' };
const BLANK = { supplierId: '', site: '', equipment: '', component: '', serial: '', installed: '', repaired: '', partsLines: [{ desc: '', amount: '' }, { desc: '', amount: '' }], labour: '', notes: '' };

export function NewCase({ data, act, go, notify }) {
  const [f, setF] = useState(BLANK);
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const setLine = (i, k, v) => setF(s => ({ ...s, partsLines: s.partsLines.map((l, n) => (n === i ? { ...l, [k]: v } : l)) }));
  function submit(e) {
    e.preventDefault();
    const res = act(createCase, f);
    if (res.ok) { notify(`${res.result} created and assessed.`); go(`#/cases/${res.result}`); }
  }
  return (
    <>
      <PageHead title="New case" sub="In production, completed repairs are imported from your service system and documents are read by extraction. Here you type what the repair report says.">
        <button type="button" className="text-button" onClick={() => setF(EXAMPLE)}><FileText size={16} aria-hidden="true" /> Fill with an example</button>
      </PageHead>
      <form className="pa-card pa-form" onSubmit={submit} noValidate>
        <div className="pa-form-grid">
          <label>Supplier terms *<select value={f.supplierId} onChange={e => set('supplierId', e.target.value)}><option value="">Choose…</option>{data.terms.map(t => <option key={t.id} value={t.id}>{t.supplier} · {t.clause}</option>)}</select></label>
          <label>Site *<input value={f.site} onChange={e => set('site', e.target.value)} /></label>
          <label>Equipment *<input value={f.equipment} onChange={e => set('equipment', e.target.value)} /></label>
          <label>Component replaced *<input value={f.component} onChange={e => set('component', e.target.value)} /></label>
          <label>Serial on repair report *<input value={f.serial} onChange={e => set('serial', e.target.value)} /></label>
          <label>Labour cost ($)<input type="number" min="0" step="0.01" value={f.labour} onChange={e => set('labour', e.target.value)} /></label>
          <label>Installation date *<input type="date" value={f.installed} onChange={e => set('installed', e.target.value)} /></label>
          <label>Repair date *<input type="date" value={f.repaired} onChange={e => set('repaired', e.target.value)} /></label>
        </div>
        <fieldset>
          <legend>Parts on the repair report</legend>
          {f.partsLines.map((l, i) => (
            <div className="pa-form-grid" key={i}>
              <label>Part {i + 1}<input value={l.desc} onChange={e => setLine(i, 'desc', e.target.value)} /></label>
              <label>Amount ($)<input type="number" min="0" step="0.01" value={l.amount} onChange={e => setLine(i, 'amount', e.target.value)} /></label>
            </div>
          ))}
        </fieldset>
        <label>Technician notes<textarea value={f.notes} onChange={e => set('notes', e.target.value)} maxLength={600} /></label>
        <p className="pa-hint">The repair report is marked present; the other records the supplier requires start as missing until the technician adds them.</p>
        <button className="button small">Create and assess</button>
      </form>
    </>
  );
}

/* ---------------- Case detail ---------------- */
const TABS = [['assessment', 'Assessment'], ['evidence', 'Evidence'], ['ai', 'AI suggestions'], ['claim', 'Claim'], ['activity', 'Activity']];

export function CaseDetail(props) {
  const { data, id, tab, act } = props;
  const c = data.cases.find(x => x.id === id);
  if (!c) return <div className="pa-card pa-denied"><h1>Case not found</h1><Link className="button small" to="#/cases">All cases</Link></div>;
  const a = assessCase(data, c);
  const t = termsFor(data, c);
  const Tab = { assessment: AssessmentTab, evidence: EvidenceTab, ai: AiTab, claim: ClaimTab, activity: ActivityTab }[tab] || AssessmentTab;
  const pendingAi = c.suggestions.filter(s => s.decision === 'pending').length;
  const analysts = data.users.filter(u => u.role === 'analyst');
  return (
    <>
      <PageHead title={`${c.id} · ${c.component}`} sub={`${c.equipment} · ${c.site} · serial ${c.serial} · ${t.supplier}`}>
        <button type="button" className="text-button" onClick={() => download(`Afterfault-${c.id}-SAMPLE-DRAFT.txt`, claimPack(data, c))}><Download size={16} aria-hidden="true" /> Draft claim pack</button>
      </PageHead>
      <div className="pa-review-status">
        <Status value={a.status} /><Status value={c.claimStatus} />
        <span>Next: {NEXT[c.claimStatus][0]}</span>
        <label className="pa-inline">Assignee
          <select value={c.assignee} onChange={e => act(assignCase, c.id, e.target.value)}><option value="Unassigned">Unassigned</option>{analysts.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
        </label>
      </div>
      <nav className="pa-tabs" aria-label="Case sections">
        {TABS.map(([k, label]) => {
          const n = k === 'ai' ? pendingAi : k === 'evidence' ? c.evidence.filter(e => !e.present).length : 0;
          return <Link key={k} to={`#/cases/${c.id}/${k}`} aria-current={k === tab ? 'page' : undefined}>{label}{n ? <span className="pa-count">{n}</span> : null}</Link>;
        })}
      </nav>
      <Tab {...props} c={c} a={a} t={t} />
    </>
  );
}

function AssessmentTab({ c, a, t }) {
  return (
    <div className="pa-grid2">
      <section className="pa-card">
        <h2>Rule checks</h2>
        <ul className="pa-checks">
          {a.checks.map(x => <li key={x.id} className={x.result}><Status value={x.result} label={x.result === 'pass' ? 'Pass' : x.result === 'fail' ? 'Fails' : x.result === 'warn' ? 'Soon' : 'Unknown'} /><div><strong>{x.label}</strong><p>{x.detail}</p></div></li>)}
        </ul>
        <p className="pa-hint">Every check is a deterministic rule tied to {t.clause} or to a document. “Unknown” means a record is missing, which is different from failing.</p>
      </section>
      <section className="pa-card">
        <h2>Potential recovery</h2>
        <table className="pa-table">
          <tbody>
            {c.partsLines.map((l, i) => <tr key={i}><td>{l.desc}</td><td className="num">{money(l.amount)}</td></tr>)}
            <tr><td>Labour {money(c.labour)} · {t.labourPct}% covered{t.labourCap !== null ? `, cap ${money(t.labourCap)}` : ''}</td><td className="num">{money(a.labourCovered)}</td></tr>
            <tr className="total"><td>Potential recovery</td><td className="num">{money(a.potential)}</td></tr>
            <tr><td>Labour not covered</td><td className="num">{money(a.labourExcluded)}</td></tr>
          </tbody>
        </table>
        <p className="pa-hint">{a.potential === null ? 'The amount is not established while the assessment is not recoverable or a parts invoice is missing.' : 'A potential amount under the supplied fictional terms. Eligibility, supplier approval and payment are never guaranteed.'}</p>
        <h3>Supplier terms</h3>
        <p className="pa-hint">{t.clause}: {t.coverageMonths} months from installation · labour {t.labourPct}%{t.labourCap !== null ? ` up to ${money(t.labourCap)}` : ''} · file within {t.filingDays} days · requires {t.requiredEvidence.join(', ')}. {t.exclusionText}</p>
        <h3>Technician notes</h3>
        <p className="pa-quote">{c.technicianNotes || '—'}</p>
      </section>
    </div>
  );
}

function EvidenceTab({ data, c, act, notify }) {
  const missing = c.evidence.filter(e => !e.present && !c.requests.some(r => r.item === e.name && !r.done)).map(e => e.name);
  const [pick, setPick] = useState(missing);
  const [note, setNote] = useState('');
  const locked = !PRE_SUBMIT.includes(c.claimStatus);
  return (
    <div className="pa-grid2">
      <section className="pa-card">
        <h2>Records</h2>
        <ul className="pa-evidence">
          {c.evidence.map(e => (
            <li key={e.name} className={e.present ? 'ok' : 'missing'}>
              {e.present ? <Check size={16} aria-hidden="true" /> : <Paperclip size={16} aria-hidden="true" />}
              <div><strong>{e.name}</strong><small>{e.ref}{e.value !== undefined ? ` · ${e.name === 'Parts invoice' ? money(e.value) : e.value}` : ''}{e.simulated ? ` · simulated record added by ${displayName(data, e.by)}` : ''}</small></div>
              <span>{e.present ? 'Present' : c.requests.some(r => r.item === e.name && !r.done) ? 'Requested' : 'Missing'}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="pa-card">
        <h2>Request from the technician</h2>
        {locked ? <Empty>The claim has been submitted; records are locked.</Empty> : missing.length ? (
          <form className="pa-form" onSubmit={e => { e.preventDefault(); if (act(requestEvidence, c.id, pick, note).ok) { notify('Request sent to the field technician.'); setNote(''); } }}>
            {missing.map(m => <label key={m} className="check-label"><input type="checkbox" checked={pick.includes(m)} onChange={e => setPick(p => (e.target.checked ? [...p, m] : p.filter(x => x !== m)))} /> {m}</label>)}
            <label>Note for the technician<input value={note} onChange={e => setNote(e.target.value)} maxLength={200} placeholder="e.g. Photo of the rating plate, serial clearly visible" /></label>
            <button className="button small" disabled={!pick.length}><Send size={16} aria-hidden="true" /> Request {pick.length || ''} record{pick.length === 1 ? '' : 's'}</button>
          </form>
        ) : <Empty>{c.requests.some(r => !r.done) ? 'Requested records are with the technician.' : 'All required records are present.'}</Empty>}
        {c.requests.length > 0 && (
          <>
            <h3>Requests</h3>
            <ul className="pa-feed">{c.requests.map(r => <li key={r.id}><span>{r.item} · {r.done ? 'received' : 'open'}</span><small>{displayName(data, r.by)} · {fmtDate(r.at)}{r.note ? ` · “${r.note}”` : ''}</small></li>)}</ul>
          </>
        )}
      </section>
    </div>
  );
}

function AiTab({ data, c, act, notify }) {
  const [reason, setReason] = useState({});
  const locked = !PRE_SUBMIT.includes(c.claimStatus);
  return (
    <section className="pa-card">
      <h2>AI suggestions</h2>
      <p className="pa-hint">In production, Amazon Bedrock reads the technician’s notes against the clause wording and must quote both. Suggestions never change the assessment or approve anything on their own. A reviewer decides each one. {data.policy.aiSuggestions ? '' : 'AI suggestions are currently switched off by your administrator.'}</p>
      {c.suggestions.length ? c.suggestions.map(s => (
        <article key={s.id} className="pa-suggestion">
          <div className="pa-row between"><AiBadge /><Status value={s.decision} label={s.decision === 'pending' ? 'Needs a decision' : s.decision === 'confirmed' ? 'Exclusion confirmed' : 'Dismissed'} /></div>
          <p>{s.detail}</p>
          <div className="detail-values">
            <div><small>Technician notes</small><q>{s.notesQuote}</q></div>
            <div><small>Clause wording</small><q>{s.clauseQuote}</q></div>
          </div>
          {s.decision !== 'pending' && <p className="pa-hint">Decided by {displayName(data, s.by)} · {fmtDate(s.at)}{s.reason ? ` · “${s.reason}”` : ''}</p>}
          {s.decision === 'pending' && !locked && (
            <div className="pa-actions">
              <button className="button small" onClick={() => { if (act(decideSuggestion, c.id, s.id, true, '').ok) notify('Exclusion confirmed. The claim will not proceed.'); }}><Check size={16} aria-hidden="true" /> Exclusion applies</button>
              <form className="pa-reason" onSubmit={e => { e.preventDefault(); if (act(decideSuggestion, c.id, s.id, false, reason[s.id] || '').ok) notify('Suggestion dismissed. The reason is in the audit log.'); }}>
                <label>Dismiss with reason<input value={reason[s.id] || ''} onChange={e => setReason(r => ({ ...r, [s.id]: e.target.value }))} placeholder="e.g. Site logger shows no surge; valve fault is mechanical" maxLength={300} /></label>
                <button className="text-button"><X size={16} aria-hidden="true" /> Dismiss</button>
              </form>
            </div>
          )}
        </article>
      )) : <Empty>No suggestions for this case.</Empty>}
    </section>
  );
}

function ClaimTab({ data, c, a, t, act, notify, user }) {
  const [ref, setRef] = useState('');
  const [outcome, setOutcome] = useState({ type: 'Paid', amount: a.potential ?? '', reason: '' });
  const blockers = approvalBlockers(c, t, data.policy.today);
  const s = c.claimStatus;
  return (
    <div className="pa-grid2">
      <section className="pa-card">
        <h2>Claim progress</h2>
        <ol className="pa-steps">
          {['Draft', 'Ready for approval', 'Approved to submit', 'Submitted (recorded)', 'Outcome'].map((label, i) => {
            const order = ['Draft', 'Evidence requested', 'Ready for approval', 'Awaiting second approval', 'Approved to submit', 'Submitted (recorded)', 'Paid'];
            const at = CLOSED.includes(s) ? 6 : order.indexOf(s);
            const stepAt = [0, 2, 4, 5, 6][i];
            return <li key={label} className={at > stepAt ? 'done' : at >= stepAt ? 'now' : ''}>{label}</li>;
          })}
        </ol>
        {['Draft', 'Evidence requested'].includes(s) && (
          <>
            <h3>Before preparing the claim pack</h3>
            {blockers.length ? <ul className="pa-checklist">{blockers.map(b => <li key={b} className="bad"><X size={14} aria-hidden="true" /> {b}</li>)}</ul> : <p className="pa-hint">All checks pass. Potential recovery {money(a.potential)}.</p>}
            <button className="button small" disabled={!!blockers.length} onClick={() => { if (act(markReady, c.id).ok) notify('Claim pack prepared. It now needs approval.'); }}><Play size={16} aria-hidden="true" /> Prepare claim pack</button>
          </>
        )}
        {['Ready for approval', 'Awaiting second approval'].includes(s) && (
          <>
            <p>{s === 'Awaiting second approval' ? `First approval by ${displayName(data, c.approval.by)} on ${fmtDate(c.approval.at)}. Potential ${money(a.potential)} is above the ${money(data.policy.secondApprovalOver)} policy threshold, so a different analyst must also approve.` : `Potential ${money(a.potential)}.${a.potential > data.policy.secondApprovalOver ? ` Above ${money(data.policy.secondApprovalOver)}: two approvals are needed.` : ''}`}</p>
            {s === 'Awaiting second approval' && c.approval.by === user.id
              ? <p className="pa-hint">Switch “Demo as” to another analyst to give the second approval.</p>
              : <button className="button small" onClick={() => { if (act(approve, c.id).ok) notify('Approval recorded.'); }}><Check size={16} aria-hidden="true" /> {s === 'Awaiting second approval' ? 'Give second approval' : 'Approve to submit'}</button>}
          </>
        )}
        {s === 'Approved to submit' && (
          <form className="pa-form" onSubmit={e => { e.preventDefault(); if (act(recordSubmission, c.id, ref).ok) notify('Submission recorded.'); }}>
            <p>Submit the pack through the supplier’s own portal or email, then record the reference here. Afterfault does not send claims.</p>
            <label>Supplier claim reference<input value={ref} onChange={e => setRef(e.target.value)} placeholder="e.g. CLC-DEMO-0042" maxLength={60} /></label>
            <button className="button small">Record submission</button>
          </form>
        )}
        {s === 'Submitted (recorded)' && (
          <form className="pa-form" onSubmit={e => { e.preventDefault(); if (act(recordOutcome, c.id, outcome.type, outcome.amount, outcome.reason).ok) notify('Outcome recorded.'); }}>
            <p>Supplier reference {c.submission.ref}, recorded by {displayName(data, c.submission.by)} on {fmtDate(c.submission.at)}.</p>
            <label>Supplier outcome<select value={outcome.type} onChange={e => setOutcome(o => ({ ...o, type: e.target.value }))}>{CLOSED.map(x => <option key={x}>{x}</option>)}</select></label>
            {outcome.type !== 'Rejected by supplier' && <label>Amount paid ($)<input type="number" min="0" step="0.01" value={outcome.amount} onChange={e => setOutcome(o => ({ ...o, amount: e.target.value }))} /></label>}
            {outcome.type !== 'Paid' && <label>Supplier’s reason<input value={outcome.reason} onChange={e => setOutcome(o => ({ ...o, reason: e.target.value }))} maxLength={300} /></label>}
            <button className="button small">Record outcome</button>
          </form>
        )}
        {CLOSED.includes(s) && <p>{s}{c.outcome.type !== 'Rejected by supplier' ? ` · ${money(c.outcome.amount)} recorded` : ''}{c.outcome.reason ? ` · “${c.outcome.reason}”` : ''}. Recorded by {displayName(data, c.outcome.by)} on {fmtDate(c.outcome.at)}.</p>}
      </section>
      <NotesCard data={data} c={c} act={act} />
    </div>
  );
}

export function NotesCard({ data, c, act }) {
  const [text, setText] = useState('');
  return (
    <section className="pa-card">
      <h2>Notes</h2>
      {c.notes.length ? <ul className="pa-comments">{c.notes.map((n, i) => <li key={i}><strong>{displayName(data, n.by)}</strong> · <small>{fmtDate(n.at)}</small><p>{n.text}</p></li>)}</ul> : <p className="pa-hint">No notes yet.</p>}
      <form className="pa-comment-form" onSubmit={e => { e.preventDefault(); if (text.trim() && act(addNote, c.id, text).ok) setText(''); }}>
        <label><span className="sr-only">Add a note</span><textarea value={text} onChange={e => setText(e.target.value)} maxLength={1000} placeholder="Add a note for the team…" /></label>
        <button className="text-button" disabled={!text.trim()}>Add note</button>
      </form>
    </section>
  );
}

function ActivityTab({ data, c }) {
  const rows = data.audit.filter(x => x.detail.startsWith(c.id)).reverse();
  return (
    <section className="pa-card">
      <h2>Activity</h2>
      {rows.length ? <ol className="pa-feed">{rows.map(x => <li key={x.id}><span>{x.action} · {displayName(data, x.user)}</span><small>{x.detail} · {fmtDate(x.at)}</small></li>)}</ol> : <Empty>No activity recorded for this case yet.</Empty>}
      <button className="text-button" onClick={() => download(`Afterfault-${c.id}-activity.csv`, csv([['time', 'user', 'action', 'detail'], ...rows.map(x => [x.at, displayName(data, x.user), x.action, x.detail])]), 'text/csv')}><Download size={16} aria-hidden="true" /> Activity CSV</button>
    </section>
  );
}
