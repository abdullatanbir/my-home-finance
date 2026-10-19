import { uid, isLiability, minor, type FinancialStore, type ImportBatch, type StagedRow, type TransactionType } from './model';
import { addCanonical } from './store';
export function parseCSV(text: string): string[][] { text = text.replace(/^\uFEFF/, ''); if (!text.trim())
    throw Error('The file is empty.'); const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false; for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
        if (quoted && text[i + 1] === '"') {
            cell += '"';
            i++;
        }
        else if (!quoted && cell.trim())
            throw Error('Malformed CSV quoting.');
        else
            quoted = !quoted;
    }
    else if (c === ',' && !quoted) {
        row.push(cell.trim());
        cell = '';
    }
    else if ((c === '\n' || c === '\r') && !quoted) {
        if (c === '\r' && text[i + 1] === '\n')
            i++;
        row.push(cell.trim());
        if (row.some(Boolean))
            rows.push(row);
        row = [];
        cell = '';
    }
    else
        cell += c;
} if (quoted)
    throw Error('Unclosed CSV quote.'); row.push(cell.trim()); if (row.some(Boolean))
    rows.push(row); if (rows.length < 2)
    throw Error('Include a header and at least one transaction.'); if (rows.slice(1).some(r => r.length !== rows[0].length))
    throw Error('CSV rows have inconsistent columns.'); return rows; }
export const normalize = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
export const fingerprint = (accountId: string, date: string, amount: number, description: string) => [accountId, date, amount, normalize(description)].join('|');
export interface Mapping {
    date: number;
    description: number;
    amount?: number;
    debit?: number;
    credit?: number;
}
export function inferMapping(header: string[]): Mapping { const index = (re: RegExp) => header.findIndex(c => re.test(c)); return { date: index(/^(date|transaction date|posted date)$/i), description: index(/^(description|merchant|memo|name)$/i), amount: index(/^(amount|transaction amount)$/i), debit: index(/^(debit|withdrawal|charge)$/i), credit: index(/^(credit|deposit|payment)$/i) }; }
function dateValue(s: string) { if (/^\d{4}-\d{2}-\d{2}$/.test(s))
    return s; const match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return match ? `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}` : ''; }
function amountValue(s: string) { const cleaned = s.replace(/[$,\s]/g, '').replace(/^\((.*)\)$/, '-$1'); return minor(cleaned); }
export function stageCSV(s: FinancialStore, accountId: string, text: string, mapping?: Mapping, format: 'csv' | 'pdf' = 'csv'): ImportBatch { const a = s.accounts.find(a => a.id === accountId && !a.archived); if (!a)
    throw Error('Select a destination account.'); const table = parseCSV(text); const map = mapping || inferMapping(table[0]); if (map.date < 0 || map.description < 0 || !((map.amount ?? -1) >= 0 || ((map.debit ?? -1) >= 0 && (map.credit ?? -1) >= 0)))
    throw Error('Map Date, Description and Amount or Debit/Credit columns.'); const seen = new Set<string>(); const rows: StagedRow[] = table.slice(1).map((r) => { const errors: string[] = []; const date = dateValue(r[map.date] || ''); if (!date || Number.isNaN(Date.parse(date)) || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date)
    errors.push('Invalid date'); const description = r[map.description] || ''; if (!description)
    errors.push('Missing description'); let signed = 0; try {
    if ((map.amount ?? -1) >= 0)
        signed = amountValue(r[map.amount!] || '0');
    else {
        const debit = r[map.debit!] ? amountValue(r[map.debit!]) : 0;
        const credit = r[map.credit!] ? amountValue(r[map.credit!]) : 0;
        if (debit && credit)
            errors.push('Both Debit and Credit are populated');
        signed = credit - debit;
    }
}
catch {
    errors.push('Invalid amount');
} if (!signed)
    errors.push('Zero amount'); let type: TransactionType = signed < 0 ? 'expense' : isLiability(a) ? 'refund' : 'income'; let status: StagedRow['status'] = 'Unknown'; if (/payment (received|thank you)|autopay|transfer|card payment/i.test(description)) {
    type = 'transfer';
    status = 'Review';
}
else if (/refund|reversal|returned purchase/i.test(description)) {
    type = 'refund';
    status = 'Review';
} const rule = s.classificationRules.find(x => normalize(description).includes(normalize(x.contains))); if (rule) {
    type = rule.type;
    status = 'Ready';
} if (format === 'pdf')
    status = 'Review'; const amountMinor = Math.abs(signed); const fp = fingerprint(accountId, date, amountMinor, description); const duplicateIds = s.transactions.filter(t => (t.accountId === accountId || t.destinationAccountId === accountId) && t.amountMinor === amountMinor && t.transactionDate === date && !['cancelled', 'reversed'].includes(t.status)).map(t => t.id); if (duplicateIds.length)
    status = 'Possible Duplicate'; const row = { id: uid(), date, amountMinor, description, type, status, categoryId: rule?.categoryId, errors, fingerprint: fp, duplicateIds }; if (errors.length)
    row.status = 'Review'; if (seen.has(fp)) {
    row.status = 'Possible Duplicate';
    row.duplicateIds.push('within-file');
} seen.add(fp); return row; }); return { id: uid(), accountId, createdAt: new Date().toISOString(), format, state: 'staged', rows, importedIds: [], excludedCount: 0, duplicatesSkipped: 0, period: [...new Set(rows.map(r => r.date.slice(0, 7)))].join(', ') }; }
export function approveBatch(s: FinancialStore, id: string) { const b = s.importBatches.find(b => b.id === id); if (!b || b.state !== 'staged')
    throw Error('Batch is not awaiting approval.'); if (b.rows.some(r => r.status !== 'Excluded' && (r.status !== 'Ready' || r.errors.length)))
    throw Error('Review every included row and resolve validation errors before approval.'); const copy = structuredClone(s); const ids: string[] = []; for (const r of b.rows) {
    if (r.status === 'Excluded')
        continue;
    if (r.type === 'transfer' && isLiability(copy.accounts.find(a => a.id === b.accountId)!) && (!r.fromAccountId || r.fromAccountId === b.accountId))
        throw Error('Select the owned bank source for a credit-card payment.');
    const tx = addCanonical(copy, { type: r.type, status: 'posted', amountMinor: r.amountMinor, transactionDate: r.date, description: r.description, merchant: r.description, accountId: r.type === 'transfer' ? (r.fromAccountId || b.accountId) : b.accountId, destinationAccountId: r.destinationAccountId, originalTransactionId: r.originalTransactionId, categoryId: r.categoryId, sourceType: 'statement_import', importBatchId: b.id });
    ids.push(tx.id);
} s.transactions = copy.transactions; b.importedIds = ids; b.excludedCount = b.rows.filter(r => r.status === 'Excluded').length; b.duplicatesSkipped = b.rows.filter(r => r.status === 'Excluded' && r.duplicateIds.length).length; b.state = 'approved'; }
export function rollbackBatch(s: FinancialStore, id: string) { const b = s.importBatches.find(b => b.id === id); if (!b || b.state !== 'approved')
    throw Error('Only approved batches can be undone.'); const ids = new Set(b.importedIds);
    const allTransactions=[...s.transactions,...s.trash.map(entry=>entry.transaction)]; if (allTransactions.some(t => ids.has(t.id) && t.updatedAt !== t.createdAt) || s.transactions.some(t => t.originalTransactionId && ids.has(t.originalTransactionId) && !ids.has(t.id)) || s.contributions.some(c => c.transactionId && ids.has(c.transactionId)))
    throw Error('This batch has edited or linked records. Review those records before undo.'); for (const t of allTransactions)
    if (ids.has(t.id)) {
        t.status = 'cancelled';
        t.updatedAt = new Date().toISOString();
    } b.state = 'rolled_back'; }
// Local digital-PDF text extraction. Unsupported font encodings/scans fail closed.
export async function pdfText(file: File): Promise<string> { const bytes = new Uint8Array(await file.arrayBuffer()); const raw = new TextDecoder('latin1').decode(bytes); if (!raw.startsWith('%PDF-'))
    throw Error('Not a PDF file.'); if (/\/Encrypt\b/.test(raw))
    throw Error('Encrypted PDF is unsupported. Export a CSV statement.'); let texts: string[] = []; const extract = (str: string) => { const blocks = str.match(/BT[\s\S]*?ET/g) || []; for (const b of blocks) {
    const chunks = [...b.matchAll(/\(((?:\\.|[^\\)])*)\)/g)].map(m => m[1].replace(/\\([()\\])/g, '$1').replace(/\\n/g, ' '));
    if (chunks.length)
        texts.push(chunks.join(' '));
} }; extract(raw); const marker = new TextEncoder().encode('stream'); for (let i = 0; i < bytes.length - marker.length; i++) {
    if (!marker.every((v, j) => bytes[i + j] === v))
        continue;
    const pre = raw.slice(Math.max(0, i - 200), i);
    if (!/FlateDecode/.test(pre))
        continue;
    let start = i + 6;
    if (bytes[start] === 13)
        start++;
    if (bytes[start] === 10)
        start++;
    let end = start;
    while (end < bytes.length - 9 && !new TextDecoder().decode(bytes.subarray(end, end + 9)).startsWith('endstream'))
        end++;
    try {
        const stream = new Blob([bytes.slice(start, end)]).stream().pipeThrough(new DecompressionStream('deflate'));
        extract(await new Response(stream).text());
    }
    catch { /* unsupported stream stays unparsed */ }
    i = end;
} if (!texts.length)
    throw Error('No reliable digital text found. Scanned/custom-font PDFs require a CSV export.'); return texts.join('\n'); }
export function pdfReviewCSV(text: string): string { const lines = text.split(/\r?\n/); const rows: string[][] = []; for (const line of lines) {
    const match = line.match(/(?:^|\s)(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})\s+(.+?)\s+(-?\$?\(?[\d,]+\.\d{2}\)?)(?:\s|$)/);
    if (match && !/opening balance|closing balance|total balance/i.test(match[2]))
        rows.push([match[1], match[2], match[3].replace(/[$,]/g, '')]);
} return rows.length ? ['Date,Description,Amount', ...rows.map(r => r.map(v => '"' + v.replaceAll('"', '""') + '"').join(','))].join('\n') : ''; }
