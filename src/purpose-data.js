export default {
  name: 'Afterfault',
  eyebrow: 'Why Afterfault exists',
  manifesto: 'When a part fails early, someone has already paid to fix it. We believe the repair shop that did the work should be able to show the evidence — and recover what the warranty already promised.',
  purpose: 'Afterfault exists to turn the paperwork after a repair into a clear, evidence-backed warranty case — so service teams stop writing off money they are owed, and suppliers receive claims they can actually assess.',
  why: 'Repair reports, parts invoices and supplier terms almost never sit in the same place. By the time someone pieces them together, the claim window has closed or the evidence is too thin to send. The cost quietly becomes the repairer’s.',
  stakesTitle: 'Warranty is a multi-billion-dollar promise.',
  stats: [
    { value: 31, prefix: '$', suffix: 'B', label: 'set aside by US-based manufacturers for warranty costs in 2024 — up about 10% on the year before.', source: 'Warranty Week, annual US warranty report', url: 'https://www.warrantyweek.com/' },
    { value: 2.06, dec: 2, prefix: '$', suffix: 'B', label: 'paid in warranty claims by US auto-parts manufacturers alone in 2024 — money that flows only when a claim is made and proven.', source: 'Warranty Week, auto parts warranty report', url: 'https://www.warrantyweek.com/' },
    { value: 22, suffix: '%', label: 'rise in warranty claims paid by one major automaker in a single year (2024) — evidence that failures, and claims, are growing.', source: 'Warranty Week, automotive warranty report', url: 'https://www.warrantyweek.com/' }
  ],
  statsNote: 'Figures reported by Warranty Week from company filings, linked above. They describe the scale of warranty spending, not Afterfault results. Afterfault prepares claims for people to review; it does not decide coverage.',
  changeTitle: 'From scattered paperwork to a claim worth sending.',
  before: ['The technician’s report lives in one system, the parts invoice in another.', 'Supplier warranty terms sit in a PDF nobody has open.', 'Claim windows close while evidence is being chased.', 'Small claims are written off because they take too long.', 'Nobody can see which repairs might have been recoverable.'],
  after: ['Repair, part and invoice evidence linked into one case file.', 'Each case checked against the supplier’s own terms, with the clause shown.', 'Deadlines and missing evidence surfaced while there is still time.', 'Review-ready claim drafts for an analyst to approve.', 'A clear view of what was claimed, recovered — and why.'],
  principlesTitle: 'The rules we build by.',
  principles: [
    ['Evidence first', 'Every suggested claim shows the repair record, the part, the invoice and the clause it relies on.'],
    ['People decide', 'Afterfault prepares. An analyst reviews and approves every claim before it reaches a supplier.'],
    ['Fair to both sides', 'Clear, well-evidenced claims are easier for suppliers to assess. Good claims help everyone.'],
    ['No invented coverage', 'If the terms don’t support a claim, Afterfault says so — it never stretches a clause to fit.'],
    ['Built for the shop floor', 'Technicians record what they found once; the case file does the rest.'],
    ['Your records stay yours', 'In the proposed design, repair and supplier data is encrypted, scoped to your team and never used to train models.']
  ],
  letterTitle: 'Why we’re building this.',
  letter: [
    'The repair is finished, the customer is happy, and the job is closed. But if the part failed early, there is often money still owed — and it rarely gets claimed.',
    'We started Afterfault because recovering warranty costs shouldn’t depend on someone finding an afternoon to dig through three systems and a PDF. The evidence already exists. It just needs to be assembled.',
    'We’re building Afterfault with service companies, repair networks and the analysts who run their warranty desks. We’d love to build it with you.'
  ],
  founders: [{ name: 'Chinedu Eze', role: 'Founder & CEO' }, { name: 'Bashiru Alabi', role: 'Co-founder & CTO' }],
  visionTitle: 'No warranty dollar left behind.',
  visionIntro: 'Our plan, shaped by early-access teams. The order may change as pilots teach us more.',
  vision: [
    { stage: 'Now', title: 'Prototype & early access', text: 'An interactive warranty review desk on fictional repairs: case files, term checks, exclusions and analyst approval.' },
    { stage: 'Next', title: 'Pilots with real repairs', text: 'Your repair reports, invoices and supplier terms, assembled into review-ready cases.' },
    { stage: 'Then', title: 'Everyday recovery', text: 'Supplier-specific claim formats, deadline reminders and recovery reporting for every site.' },
    { stage: 'Later', title: 'A fairer warranty chain', text: 'Shared evidence standards between repairers and suppliers, so good claims are settled faster.' }
  ]
};
