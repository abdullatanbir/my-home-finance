import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import {
    clearHistoricalTestData,
    seedHistoricalTestData
} from './lib/data';
import './styles.css';

declare global {
    interface Window {
        mhfHistoricalTestData?: {
            seed: typeof seedHistoricalTestData;
            clear: typeof clearHistoricalTestData;
        };
    }
}

const isDevelopmentBuild = (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true;

// Opt-in developer helper. It is never exposed by a production build.
if (isDevelopmentBuild && typeof window !== 'undefined') {
    window.mhfHistoricalTestData = {
        seed: seedHistoricalTestData,
        clear: clearHistoricalTestData
    };
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
}

createRoot(document.getElementById('root')!).render(
    <React.StrictMode><App /></React.StrictMode>
);
