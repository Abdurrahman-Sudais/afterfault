import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { addEvidence, displayName } from './actions.js';
import { Link, PageHead, Empty, fmtDate, fmtDay } from './ui.jsx';
import { NotesCard } from './AnalystViews.jsx';

const openRequests = c => c.requests.filter(r => !r.done);

export function TechnicianQueue({ data }) {
  const cases = data.cases.filter(c => openRequests(c).length);
  return (
    <>
      <PageHead title="Evidence requests" sub="Records analysts need from the field. You see the request and the repair, not the supplier assessment or amounts." />
      {cases.length ? cases.map(c => (
        <section className="pa-card" key={c.id} aria-labelledby={`h-${c.id}`}>
          <div className="pa-row between">
            <div><h2 id={`h-${c.id}`}>{c.id} · {c.component}</h2><p className="pa-hint">{c.equipment} at {c.site} · repaired {fmtDay(c.repaired)} · serial on report {c.serial}</p></div>
            <Link className="button small" to={`#/technician/${c.id}`}><Upload size={16} aria-hidden="true" /> Add records</Link>
          </div>
          <ul className="pa-feed">{openRequests(c).map(r => <li key={r.id}><span>{r.item}</span><small>Requested by {displayName(data, r.by)} · {fmtDate(r.at)}{r.note ? ` · “${r.note}”` : ''}</small></li>)}</ul>
        </section>
      )) : (
        <div className="pa-card"><Empty>No open requests. When an analyst asks for a record it appears here. Try it: switch “Demo as” to Alex Morgan, open RF-1042 → Evidence, and request the serial-number photograph.</Empty></div>
      )}
    </>
  );
}

export function TechnicianCase({ data, id, act, notify, go }) {
  const c = data.cases.find(x => x.id === id);
  const [values, setValues] = useState({});
  if (!c) return <div className="pa-card"><Empty>Case not found.</Empty></div>;
  const reqs = openRequests(c);
  function submit(e, name) {
    e.preventDefault();
    const res = act(addEvidence, c.id, name, values[name]);
    if (res.ok) {
      notify(`${name} added. The case has been re-assessed.`);
      if (reqs.length === 1) go('#/technician');
    }
  }
  return (
    <>
      <PageHead title={`${c.id} · ${c.component}`} sub={`${c.equipment} at ${c.site} · serial on repair report ${c.serial}. In production you photograph or upload the document and the details are extracted; here you type what the record shows.`} />
      <div className="pa-grid2">
        <section className="pa-card">
          <h2>Requested records</h2>
          {reqs.length ? reqs.map(r => (
            <form key={r.id} className="pa-form pa-request" onSubmit={e => submit(e, r.item)}>
              <h3>{r.item}</h3>
              {r.note && <p className="pa-hint">“{r.note}” · {displayName(data, r.by)}</p>}
              {r.item === 'Parts invoice' && <label>Invoice total ($)<input type="number" min="0" step="0.01" value={values[r.item] || ''} onChange={e => setValues(v => ({ ...v, [r.item]: e.target.value }))} /></label>}
              {r.item === 'Serial-number photograph' && <label>Serial visible in the photo<input value={values[r.item] || ''} onChange={e => setValues(v => ({ ...v, [r.item]: e.target.value }))} placeholder={c.serial} /></label>}
              <button className="button small"><Upload size={16} aria-hidden="true" /> Add {r.item.toLowerCase()} (simulated)</button>
            </form>
          )) : <Empty>Nothing is waiting for this case.</Empty>}
        </section>
        <NotesCard data={data} c={c} act={act} />
      </div>
    </>
  );
}
