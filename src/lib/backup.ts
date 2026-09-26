import {replaceBackup} from './data';
type Backup={version:1;transactions:any[];budgets:any[];goals:any[]};
export async function restoreBackup(b:Backup){
 if(!b||b.version!==1||!Array.isArray(b.transactions)||!Array.isArray(b.budgets)||!Array.isArray(b.goals))throw new Error('Invalid or unsupported backup.');
 if(!b.transactions.every((x:any)=>x&&typeof x.id==='string'&&typeof x.occurred_on==='string'&&typeof x.amount==='number'&&(x.kind==='income'||x.kind==='expense')))throw new Error('Backup contains invalid transaction data.');
 await replaceBackup(b);
 return true;
}
