from pathlib import Path
import json,sys
R=Path(__file__).resolve().parents[1]
need=['src/App.tsx','src/components/FinanceApp.tsx','src/components/TransactionModal.tsx','src/components/RestoreBackup.tsx','src/lib/data.ts','src/lib/backup.ts','src/lib/reports.ts','public/manifest.webmanifest','public/sw.js']
missing=[x for x in need if not(R/x).exists()]
if missing: print('Missing:',missing);sys.exit(1)
text='\n'.join((R/x).read_text() for x in need if (R/x).suffix in('.ts','.tsx'))
checks={x:x in text for x in ['localStorage','addTransaction','updateTransaction','deleteTransaction','restoreBackup','monthlyReportHtml','yearlyReportHtml','Personal Savings','Home Savings','due_date','paid','unpaid']}
checks['no backend references']='supabase' not in text.lower()
checks['standalone manifest']=json.loads((R/'public/manifest.webmanifest').read_text()).get('display')=='standalone'
print(json.dumps(checks,indent=2));sys.exit(not all(checks.values()))
