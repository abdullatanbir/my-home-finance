import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
const months = Array.from({ length: 12 }, (_, i) => new Date(2026, i, 1).toLocaleDateString('en-US', { month: 'short' }));
export function historyYears(dates: string[]) { const recorded = dates.filter(d => /^\d{4}-/.test(d)).map(d => Number(d.slice(0, 4))).filter(y => y >= 1 && y <= 9999); const min = Math.min(2026, ...recorded); const end = Math.max(2026, new Date().getFullYear()) + 2; return [...new Set([...Array.from({ length: end - min + 1 }, (_, i) => min + i), ...recorded])].sort((a, b) => a - b); }
export default function PeriodPicker({ value, onChange, years }: {
    value: string;
    onChange: (v: string) => void;
    years: number[];
}) {
    const [open, setOpen] = useState(false), [draft, setDraft] = useState(value);
    const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLButtonElement>(null);
    const allYears = [...new Set([...years, Number(value.slice(0, 4))])].sort((a, b) => a - b);
    useEffect(() => { if (open) {
        setDraft(value);
        dialog.current?.showModal();
    }
    else {
        dialog.current?.close();
    } }, [open, value]);
    const close = () => { setOpen(false); trigger.current?.focus(); };
    const year = Number(draft.slice(0, 4)), month = Number(draft.slice(5, 7));
    const yearIndex = allYears.indexOf(year);
    return <div className="bc-period-control"><button ref={trigger} className="bc-period-trigger" aria-label="Choose reporting period" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}><CalendarDays size={15}/><span>{new Date(`${value}-01T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span></button><dialog ref={dialog} className="bc-period-dialog" aria-label="Choose reporting month and year" onCancel={e => { e.preventDefault(); close(); }} onClick={e => { const r = e.currentTarget.getBoundingClientRect(); if (e.target === e.currentTarget && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom))
        close(); }}><div className="bc-section-head"><h2>Reporting period</h2><button aria-label="Close period picker" onClick={close}><X size={18}/></button></div><div className="bc-year-stepper"><button aria-label="Previous reporting year" disabled={yearIndex <= 0} onClick={() => setDraft(`${allYears[yearIndex - 1]}-${String(month).padStart(2, '0')}`)}><ChevronLeft size={18}/></button><label><span className="bc-sr-only">Reporting year</span><select aria-label="Reporting year" value={year} onChange={e => setDraft(`${e.target.value}-${String(month).padStart(2, '0')}`)}>{allYears.map(y => <option key={y} value={y}>{y}</option>)}</select></label><button aria-label="Next reporting year" disabled={yearIndex === allYears.length - 1} onClick={() => setDraft(`${allYears[yearIndex + 1]}-${String(month).padStart(2, '0')}`)}><ChevronRight size={18}/></button></div><div className="bc-month-grid" role="group" aria-label="Reporting month">{months.map((m, i) => <button key={m} aria-label={new Date(year, i, 1).toLocaleDateString('en-US', { month: 'long' })} aria-pressed={month === i + 1} onClick={() => setDraft(`${year}-${String(i + 1).padStart(2, '0')}`)}>{m}</button>)}</div><p className="bc-help">History starts in {Math.min(...years)}. Existing financial records remain accessible.</p><button className="bc-primary bc-period-apply" onClick={() => { onChange(draft); close(); }}>Apply period</button></dialog></div>;
}
