import React from 'react';
import { ArrowUpRight, ArrowRight, Check } from 'lucide-react';

// Sections added alongside the original home page. Copy describes the prototype and the proposed
// product only: no customer numbers, testimonials, recovery rates, certifications or invented prices.

export function PrototypeCta() {
  return (
    <section className="section prototype-cta" aria-labelledby="prototype-heading">
      <div>
        <span className="eyebrow"><span className="tiny-line" /> INTERACTIVE PROTOTYPE</span>
        <h2 id="prototype-heading">Run the whole claim.<br /><em>Every role, end to end.</em></h2>
      </div>
      <div>
        <p>The desk above shows three cases. The prototype runs the full workflow with fictional data: rule checks against two sets of supplier terms, filing deadlines, evidence requests to the field, AI suggestions on clause exclusions, two-person approval, and recording the supplier’s outcome.</p>
        <ul className="role-list">
          <li><strong>Warranty analyst</strong> Deadline-first dashboard, rule checks, evidence requests, claim approval and outcomes.</li>
          <li><strong>Field technician</strong> Only the records that were asked for, added from the job.</li>
          <li><strong>Administrator</strong> Supplier terms, roles, approval policy, audit log and recovery totals.</li>
        </ul>
        <div className="hero-actions">
          <a className="button" href="/app">Open the prototype <ArrowUpRight size={18} aria-hidden="true" /></a>
          <span className="fine-print">No sign-up. Changes stay in your browser.</span>
        </div>
      </div>
    </section>
  );
}

const BENEFITS = [
  ['See every deadline', 'Each case shows its coverage end date and filing deadline from the supplier’s own terms, so recoverable costs are not lost to the calendar.'],
  ['Know why, not just what', 'Every result traces to a clause or a document: the coverage period, an excluded component, a missing record, or a serial that does not match.'],
  ['Ask the field for the right record', 'Analysts request a specific missing record. Technicians see only that request and add it from the job, and the case re-assesses straight away.'],
  ['Separate parts from labour', 'Labour cover and caps are applied as the terms state, so the potential amount is explainable line by line.'],
  ['Catch mismatches before the supplier does', 'Invoice totals are checked against the repair report and serial photos against the recorded serial, before a claim goes out.'],
  ['Keep decisions with people', 'Approvals, second approvals above a threshold, and recorded outcomes are logged with names and times.'],
];

export function Benefits() {
  return (
    <section id="benefits" className="section benefits" aria-labelledby="benefits-heading">
      <div className="section-heading"><div><span className="eyebrow">WHY SERVICE TEAMS WOULD USE IT</span><h2 id="benefits-heading">Fewer missed claims.<br />Clearer evidence.</h2></div><p>Built around the people who close out repairs and the people who chase suppliers.</p></div>
      <div className="card-grid">{BENEFITS.map(([t, p], i) => <article className="grid-card" key={t}><span className="mono">0{i + 1}</span><h3>{t}</h3><p>{p}</p></article>)}</div>
    </section>
  );
}

const USES = [
  ['Compressor and major component failures', 'High-value parts where the coverage period and evidence requirements decide whether a claim is worth filing.'],
  ['Early-life failures', 'Repairs in the first months after installation, when parts are most likely to be covered and easiest to overlook.'],
  ['Multi-supplier equipment estates', 'Different suppliers with different terms, filing windows and labour rules, assessed consistently.'],
  ['Repairs closed out from the van', 'Missing serial photos and invoices requested from the technician while the job is still fresh.'],
  ['Month-end recovery reviews', 'One list of open potential, deadlines and outcomes instead of rebuilding it from job sheets.'],
  ['Supplier performance conversations', 'Recorded outcomes and rejection reasons per supplier, from your own records.'],
];

export function UseCases() {
  return (
    <section id="use-cases" className="section usecases" aria-labelledby="uses-heading">
      <span className="eyebrow">USE CASES</span>
      <h2 id="uses-heading">Where warranty value<br />tends to slip away.</h2>
      <div className="card-grid">{USES.map(([t, p]) => <article className="grid-card plain" key={t}><h3>{t}</h3><p>{p}</p></article>)}</div>
    </section>
  );
}

const SAFEGUARDS = [
  ['People decide', 'Afterfault never submits a claim. Analysts approve, submit through the supplier’s own channel, and record the outcome. Larger claims can require a second approver.'],
  ['Rules stay rules', 'Coverage periods, filing windows, labour cover, exclusions, evidence and serial and invoice checks are deterministic rules tied to the supplier’s terms.'],
  ['AI is labelled and quoted', 'AI only suggests where a clause exclusion might apply, quoting the technician’s notes and the clause. An analyst must confirm or dismiss it.'],
  ['No guaranteed recovery', 'Potential amounts are indications under supplied terms. Eligibility, supplier approval and payment are never guaranteed, and the product says so.'],
  ['Need-to-know access', 'Technicians see only the records requested from them. Administrators see totals, not case contents.'],
  ['Traceable', 'Every request, record, decision and term change is written to an audit log that can be exported.'],
];

export function Safeguards() {
  return (
    <section id="safeguards" className="section safeguards" aria-labelledby="safeguards-heading">
      <div className="section-heading"><div><span className="eyebrow">SAFEGUARDS</span><h2 id="safeguards-heading">AI assists.<br />Rules check. People decide.</h2></div><p>The prototype already enforces these review gates. Hosting and security items describe the proposed production design.</p></div>
      <div className="card-grid">{SAFEGUARDS.map(([t, p]) => <article className="grid-card" key={t}><Check size={18} aria-hidden="true" /><h3>{t}</h3><p>{p}</p></article>)}</div>
    </section>
  );
}

const PLANS = [
  ['Pilot', 'One service team, one or two suppliers.', ['Guided setup of your supplier terms', 'Rule checks and filing deadlines', 'Evidence requests to technicians', 'Draft claim packs']],
  ['Team', 'Service operations with several suppliers.', ['Everything in Pilot', 'Roles, two-person approval and audit log', 'AI suggestions on clause exclusions', 'Outcome and recovery reporting']],
  ['Network', 'Distributors and multi-region repair networks.', ['Everything in Team', 'Single sign-on', 'Service-system integration for completed repairs', 'Data-region options and a data-processing agreement']],
];

export function Plans() {
  return (
    <section id="pricing" className="section plans" aria-labelledby="pricing-heading">
      <div className="section-heading"><div><span className="eyebrow">PLANS</span><h2 id="pricing-heading">Start with one team.<br />Grow across the network.</h2></div><p>Proposed plans for early access. Prices are agreed with each early-access customer; none are published yet.</p></div>
      <div className="plan-grid">
        {PLANS.map(([name, d, items], i) => (
          <article className={`plan ${i === 1 ? 'featured' : ''}`} key={name}>
            {i === 1 && <span className="plan-tag">Most complete</span>}
            <h3>{name}</h3>
            <p className="plan-price">Pricing on request</p>
            <p>{d}</p>
            <ul>{items.map(x => <li key={x}><Check size={14} aria-hidden="true" /> {x}</li>)}</ul>
            <a className={i === 1 ? 'button small' : 'text-link'} href="#contact">Request early access <ArrowRight size={16} aria-hidden="true" /></a>
          </article>
        ))}
      </div>
    </section>
  );
}

const FAQS = [
  ['Does Afterfault submit claims to suppliers?', 'No. It assesses repairs against the supplier terms you supply, assembles the evidence and drafts a claim pack. Your team approves it, submits it through the supplier’s own process, and records the reference and outcome.'],
  ['What does the AI do?', 'In the proposed product, AI reads technicians’ notes against the clause wording and suggests where an exclusion, such as a power surge, might apply. It must quote both, and an analyst confirms or dismisses each suggestion. Dates, amounts, evidence and serial checks are rules, not AI.'],
  ['Is a “potential recovery” a promise?', 'No. It is the amount the supplied terms appear to cover, based on the records present. Eligibility, supplier approval and payment are never guaranteed.'],
  ['What if a record is missing?', 'The case shows “Needs evidence” or “Eligibility unknown”, which is different from not covered. An analyst can request the specific record from the technician who did the job.'],
  ['How are labour and parts treated?', 'Exactly as the terms you enter say: the share of labour covered and any cap. Parts come from the repair report and are checked against the invoice.'],
  ['Which equipment does it support?', 'The first focus is commercial refrigeration service. The rule model of coverage, deadlines, evidence and exclusions applies to other serviced equipment.'],
  ['Is it available today?', 'Afterfault is in the building stage. The prototype runs in your browser with fictional data; uploads, extraction and AI need the production backend described in the architecture section.'],
  ['How do we get early access?', 'Use the form below to tell us how your team handles completed repairs and warranty evidence. We reply by email.'],
];

export function Faq() {
  return (
    <section id="faq" className="section faq" aria-labelledby="faq-heading">
      <span className="eyebrow">FAQ</span>
      <h2 id="faq-heading">Questions service teams ask.</h2>
      <div className="faq-list">{FAQS.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
    </section>
  );
}
