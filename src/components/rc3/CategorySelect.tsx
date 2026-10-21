import {useId,useState} from 'react';
import type {Category,TransactionType} from '../../core/model';
export default function CategorySelect({categories,defaultValue='',type}:{categories:Category[];defaultValue?:string;type:TransactionType}){
 const [query,setQuery]=useState(''),[value,setValue]=useState(defaultValue),id=useId();
 const path=(c:Category):string=>{const p=categories.find(p=>p.id===c.parentId);return p?`${path(p)} → ${c.name}`:c.name};
 return <div className="bc-field"><label htmlFor={id+'search'}>Find category</label><input id={id+'search'} type="search" placeholder="Search categories" value={query} onChange={e=>setQuery(e.target.value)}/><label htmlFor={id}>Category</label><select id={id} name="categoryId" value={value} onChange={e=>setValue(e.target.value)}><option value="">Uncategorized</option>{categories.filter(c=>c.level!=='group'&&(c.id===value||((type==='adjustment'||c.type===(type==='refund'?'expense':type))&&path(c).toLowerCase().includes(query.toLowerCase())))).map(c=><option key={c.id} value={c.id}>{path(c)} · {c.type}</option>)}</select></div>
}
