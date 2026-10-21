import type {FinancialStore, TransactionType} from './model';
// Additive defaults: never rename, remap or remove an existing ID or category.
export function expandCategories(s:FinancialStore):boolean{
 let changed=false;
 const add=(name:string,type:TransactionType,level:'group'|'category',parentId?:string)=>{let c=s.categories.find(c=>c.type===type&&c.level===level&&c.name.toLowerCase()===name.toLowerCase());if(!c){const baseId=`rc3:${type}:${name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`;let id=baseId,n=2;while(s.categories.some(x=>x.id===id))id=`${baseId}-${n++}`;c={id,name,type,level,...(parentId?{parentId}: {})};s.categories.push(c);changed=true}return c.id};
 const groups=Object.fromEntries(['Home','Personal','Credit & Loan','Others'].map(n=>[n,add(n,'expense','group')]));
 for(const [group,names] of Object.entries({'Home':['Groceries','Household','Insurance'],'Personal':['Auto & Transport','Childcare & Education','Drinks & Dining','Entertainment','Healthcare','Personal Care','Shopping','Travel & Vacation'],'Credit & Loan':['Financial'],'Others':['Taxes']}))for(const name of names)add(name,'expense','category',groups[group]);
 const income=add('Income','income','group');for(const n of ['Paycheck','Interest','Reimbursement'])add(n,'income','category',income);
 const transfer=add('Transfers','transfer','group');for(const n of ['Credit Card Payment','Savings Transfer'])add(n,'transfer','category',transfer);
 return changed;
}
