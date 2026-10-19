import { useState, lazy, Suspense } from 'react';
const FinanceApp = lazy(() => import('./components/FinanceApp'));
import BlueprintApp from './components/BlueprintApp';
import { syncLegacy } from './core/store';
export default function App() { const [legacy, setLegacy] = useState((import.meta as unknown as {env:{DEV:boolean}}).env.DEV && localStorage.getItem('mhf-workspace') === 'legacy'); return legacy ? <><div style={{ padding: 8, background: '#c9e7b2', color: '#152311', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>Accepted Release 2 workspace</span><button onClick={() => { try {
    syncLegacy();
    localStorage.removeItem('mhf-workspace');
    setLegacy(false);
}
catch (e) {
    alert(String(e));
} }}>Return to Blueprint C</button></div><Suspense fallback={<p>Loading accepted workspace…</p>}><FinanceApp /></Suspense></> : <BlueprintApp />; }
