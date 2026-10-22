import { useEffect, useRef } from 'react';
import { X, ArrowUpRight } from 'lucide-react';
const groups = [['Overview', 'Home', 'Net Worth'], ['Finance', 'Accounts & Cards', 'Transactions', 'Budget', 'Finance Calendar', 'Recurring & Upcoming', 'Reports'], ['Personal', 'Income', 'Goals', 'Savings', 'Investments'], ['Tools', 'Quick Add', 'Import Statement'], ['System', 'Backup / Restore', 'Settings']];
export default function NavigationDrawer({ open, current, onClose, onNavigate }: {
    open: boolean;
    current: string;
    onClose: () => void;
    onNavigate: (v: string) => void;
}) {
    const ref = useRef<HTMLDialogElement>(null), previous = useRef<HTMLElement | null>(null), closeButton = useRef<HTMLButtonElement>(null);
    useEffect(() => { if (open) {
        previous.current = document.activeElement as HTMLElement;
        ref.current?.showModal();
        closeButton.current?.focus({ preventScroll: true });
        if (ref.current)
            ref.current.scrollTop = 0;
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = overflow; };
    }
    else {
        ref.current?.close();
        previous.current?.focus();
    } }, [open]);
    return <dialog ref={ref} id="bc-navigation-drawer" className="bc-drawer" aria-label="Navigation drawer" onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { const r = e.currentTarget.getBoundingClientRect(); if (e.target === e.currentTarget && (e.clientX > r.right || e.clientX < r.left || e.clientY < r.top || e.clientY > r.bottom))
        onClose(); }}><div className="bc-drawer-top"><div><strong>MY HOME FINANCE</strong><small>A clearer view of your money</small></div><button ref={closeButton} aria-label="Close navigation drawer" onClick={onClose}><X size={20}/></button></div><nav className="bc-feature-menu" aria-label="Features">{groups.map(([group, ...items]) => <section key={group}><h2>{group}</h2>{items.map(v => <button key={v} aria-current={current === v ? 'page' : undefined} onClick={() => onNavigate(v)}><span>{v}</span><ArrowUpRight size={15} aria-hidden="true"/></button>)}</section>)}</nav><p className="bc-drawer-foot">Local-first. Always yours.</p></dialog>;
}
