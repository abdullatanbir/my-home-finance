import { today, money, type Transaction } from '../../core/model';
import { totals } from '../../core/engine';

export type ActivityScale = 'Monthly' | 'Weekly';

export default function SpendingActivity({ transactions, period, scale, onScale, onInspect }: {
    transactions: Transaction[];
    period: string;
    scale: ActivityScale;
    onScale: (scale: ActivityScale) => void;
    onInspect: (start: string, end: string) => void;
}) {
    const count = new Date(Number(period.slice(0, 4)), Number(period.slice(5)), 0).getDate();
    const date = (day: number) => `${period}-${String(day).padStart(2, '0')}`;
    const step = scale === 'Monthly' ? 1 : 7;
    const points = Array.from({ length: Math.ceil(count / step) }, (_, i) => {
        const first = i * step + 1, last = Math.min(count, first + step - 1);
        const start = date(first), end = date(last);
        return { start, end, first, last, future: start > today(), value: totals(transactions, start, end < today() ? end : today()).spending };
    });
    const maximum = Math.max(1, ...points.map(point => Math.abs(point.value)));
    return <div className="bc-spending-activity">
        <div className="bc-activity-scale" role="group" aria-label="Spending chart period">
            {(['Monthly', 'Weekly'] as const).map(value => <button key={value} aria-pressed={scale === value} onClick={() => onScale(value)}>{value}</button>)}
        </div>
        <p className="bc-help">{scale === 'Monthly' ? 'Daily actual spending across the month.' : 'Actual spending in seven-day groups, starting on the first.'} Select a bar to inspect its transactions. Refunds reduce spending; future and pending amounts are excluded.</p>
        <div className="bc-activity-scroll" tabIndex={0} role="region" aria-label={`${scale} actual spending chart`}>
            <div className={`bc-activity-bars ${scale === 'Monthly' ? 'is-monthly' : ''}`}>
                {points.map(point => <button key={point.start} disabled={point.future} className={point.value < 0 ? 'is-refund' : ''}
                    aria-label={`${point.start}${point.end !== point.start ? ` through ${point.end}` : ''}: ${money(point.value)}${point.future ? ' · Future, no actual spending' : ' actual spending'}`}
                    onClick={() => onInspect(point.start, point.end)}>
                    <strong>{money(point.value)}</strong>
                    <span className="bc-activity-bar-track" aria-hidden="true"><i style={{ height: `${Math.abs(point.value) / maximum * 100}%` }}/></span>
                    <small>{point.first === point.last ? point.first : `${point.first}–${point.last}`}</small>
                </button>)}
            </div>
        </div>
    </div>;
}
