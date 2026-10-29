import React, { createContext, useContext } from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, Circle, HelpCircle } from 'lucide-react';

export const fmtDate = iso => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
export const fmtDay = iso => new Date(iso.length === 10 ? iso + 'T00:00:00Z' : iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function download(name, text, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// In-app navigation. The offline preview file uses the URL hash for page routing, so prototype
// links go through `go` instead of letting the browser change the hash directly.
export const NavContext = createContext({ go: () => {} });
export function Link({ to, children, ...rest }) {
  const { go } = useContext(NavContext);
  return <a href={to} onClick={e => { e.preventDefault(); go(to); }} {...rest}>{children}</a>;
}

export function PageHead({ title, sub, children }) {
  return (
    <div className="pa-head">
      <div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
      {children && <div className="pa-head-actions">{children}</div>}
    </div>
  );
}

export const AiBadge = ({ children = 'AI-suggested' }) => <span className="pa-badge ai"><Sparkles size={12} aria-hidden="true" /> {children}</span>;

const TONE = {
  pass: 'ok', fail: 'bad', warn: 'warn', unknown: 'muted',
  'Ready for review': 'ok', 'Needs evidence': 'warn', 'Eligibility unknown': 'muted', 'Outside coverage': 'bad', 'Excluded component': 'bad', 'Filing window closed': 'bad', 'Check dates': 'bad',
  Draft: 'muted', 'Evidence requested': 'info', 'Ready for approval': 'warn', 'Awaiting second approval': 'info', 'Approved to submit': 'ok', 'Submitted (recorded)': 'info',
  Paid: 'ok', 'Partly paid': 'warn', 'Rejected by supplier': 'bad',
  pending: 'ai', confirmed: 'bad', dismissed: 'muted',
};

export function Status({ value, label }) {
  const tone = TONE[value] || 'muted';
  const Icon = tone === 'ok' ? CheckCircle2 : tone === 'bad' || tone === 'warn' ? AlertTriangle : tone === 'muted' ? HelpCircle : Circle;
  return <span className={`pa-status ${tone}`}><Icon size={12} aria-hidden="true" /> {label || value}</span>;
}

export function Kpi({ value, label, to }) {
  const body = <><b>{value}</b><span>{label}</span></>;
  return to ? <Link className="pa-kpi link" to={to}>{body}</Link> : <div className="pa-kpi">{body}</div>;
}

export const Empty = ({ children }) => <p className="pa-empty">{children}</p>;

export function StackBar({ parts }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div className="pa-stack" role="img" aria-label={parts.map(p => `${p.label}: ${p.value}`).join(', ')}>
      {parts.filter(p => p.value).map(p => <span key={p.label} className={p.tone} style={{ width: `${(p.value / total) * 100}%` }} title={`${p.label}: ${p.value}`} />)}
    </div>
  );
}
