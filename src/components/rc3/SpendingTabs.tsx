const tabs = ['Overview', 'Breakdown', 'Budget', 'Transactions'];
export default function SpendingTabs({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    return <div role="tablist" aria-label="Spending workspace" className="bc-tabs">
        {tabs.map((tab, index) => <button key={tab} id={`spending-tab-${tab}`} role="tab" aria-selected={value === tab}
            aria-controls="spending-panel" tabIndex={value === tab ? 0 : -1} onClick={() => onChange(tab)}
            onKeyDown={event => {
                const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
                    : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
                    : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
                if (next < 0) return;
                event.preventDefault();
                onChange(tabs[next]);
                document.getElementById(`spending-tab-${tabs[next]}`)?.focus();
            }}>{tab}</button>)}
    </div>;
}
