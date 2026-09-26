export type Kind='income'|'expense'; export type Status='paid'|'unpaid';
export type Transaction={id:string;occurred_on:string;kind:Kind;group_name:string|null;category:string|null;name:string;merchant:string|null;amount:number;status:Status;payment_method:string|null;due_date:string|null;notes:string|null;created_at:string};
export type Budget={month_start:string;amount:number}; export type Goal={id:string;name:'Personal Savings'|'Home Savings';current_amount:number;goal_amount:number;created_at:string};
type Store={version:1;transactions:Transaction[];budgets:Budget[];goals:Goal[]}; const KEY='my-home-finance-personal-v1';
const clean=():Store=>({version:1,transactions:[],budgets:[],goals:[]}); const store=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'');if(x?.version===1&&Array.isArray(x.transactions)&&Array.isArray(x.budgets)&&Array.isArray(x.goals))return x as Store}catch{}return clean()}; const save=(x:Store)=>{localStorage.setItem(KEY,JSON.stringify(x));window.dispatchEvent(new Event('mhf-data'))};
export const range=(y:number,m:number)=>{const mm=String(m).padStart(2,'0');return [`${y}-${mm}-01`,`${y}-${mm}-${new Date(y,m,0).getDate()}`] as const};
export async function listTransactions(start:string,end:string){return {data:store().transactions.filter(x=>x.occurred_on>=start&&x.occurred_on<=end).sort((a,b)=>b.occurred_on.localeCompare(a.occurred_on))}}
export async function listYear(y:number){return listTransactions(`${y}-01-01`,`${y}-12-31`)}
export async function addTransaction(v:Omit<Transaction,'id'|'created_at'>){const s=store(),item={...v,id:crypto.randomUUID(),created_at:new Date().toISOString()};s.transactions.push(item);save(s);return{data:item}}
export async function updateTransaction(id:string,v:Partial<Transaction>){const s=store(),i=s.transactions.findIndex(x=>x.id===id);if(i<0)return{error:{message:'Record not found'}};s.transactions[i]={...s.transactions[i],...v};save(s);return{data:s.transactions[i]}}
export async function deleteTransaction(id:string){const s=store();s.transactions=s.transactions.filter(x=>x.id!==id);save(s);return{data:true}}
export async function getBudget(month_start:string){return{data:store().budgets.find(x=>x.month_start===month_start)||null}}
export async function setBudget(month_start:string,amount:number){if(!Number.isFinite(amount)||amount<0)return{error:{message:'Enter a valid budget.'}};const s=store(),i=s.budgets.findIndex(x=>x.month_start===month_start),v={month_start,amount};if(i<0)s.budgets.push(v);else s.budgets[i]=v;save(s);return{data:v}}
export async function listGoals(){return{data:store().goals}}
export async function saveGoal(v:Partial<Goal>&{name:Goal['name']}){const s=store(),i=s.goals.findIndex(x=>x.name===v.name),item={id:i<0?crypto.randomUUID():s.goals[i].id,name:v.name,current_amount:Number(v.current_amount||0),goal_amount:Number(v.goal_amount||0),created_at:i<0?new Date().toISOString():s.goals[i].created_at};if(i<0)s.goals.push(item);else s.goals[i]=item;save(s);return{data:item}}
export async function exportBackup(){return{...store(),exported_at:new Date().toISOString(),app:'My Home Finance Simple Personal Edition'}}
export async function replaceBackup(b:Store){save({version:1,transactions:b.transactions,budgets:b.budgets,goals:b.goals})}
export function subscribe(fn:()=>void){window.addEventListener('mhf-data',fn);return()=>window.removeEventListener('mhf-data',fn)}
