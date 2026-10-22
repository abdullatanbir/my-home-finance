import { useEffect, useId, useRef, useState } from 'react';
import type { Category } from '../../core/model';
import { categoryIcons, categoryColors, categoryAppearance, type IconName, type ColorName } from './CategoryIcon';

export function CategoryAppearancePicker({ category }: { category?: Category }) {
 const appearance=categoryAppearance(category);
 const [icon,setIcon]=useState<IconName>(appearance.icon),[color,setColor]=useState<ColorName>(appearance.color);
 const id=useId(), Icon=categoryIcons[icon];
 return <div className="category-appearance-picker">
  <input type="hidden" name="categoryIcon" value={icon}/><input type="hidden" name="categoryColor" value={color}/>
  <div className="category-selection-preview"><Icon size={25} style={{color:categoryColors[color]}} aria-hidden="true"/><span>{icon[0].toUpperCase()+icon.slice(1)} · {color}</span></div>
  <fieldset><legend>Icon color</legend><div className="category-color-grid">{Object.entries(categoryColors).map(([key,value])=><button key={key} type="button" aria-label={`${key} icon color`} aria-pressed={color===key} onClick={()=>setColor(key as ColorName)} style={{'--icon-color':value} as React.CSSProperties}><span/></button>)}</div></fieldset>
  <fieldset aria-describedby={id}><legend>Category icon</legend><p id={id}>Choose an icon for this category.</p><div className="category-icon-grid">{Object.entries(categoryIcons).map(([key,Icon])=><button key={key} type="button" aria-label={`${key} icon`} title={key} aria-pressed={icon===key} onClick={()=>setIcon(key as IconName)}><Icon size={23} strokeWidth={1.5} aria-hidden="true"/></button>)}</div></fieldset>
 </div>;
}
export default function CategoryAppearanceEditor({category,onSave}:{category:Category;onSave:(icon:string,color:string)=>void}){
 const [open,setOpen]=useState(false),dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(open)dialog.current?.showModal();else dialog.current?.close()},[open]);
 const close=()=>{setOpen(false);trigger.current?.focus()};
 return <><button ref={trigger} type="button" className="category-appearance-edit" aria-label={`Edit appearance for ${category.name}`} onClick={()=>setOpen(true)}>Icon & color</button>
 <dialog ref={dialog} className="category-appearance-dialog" aria-label={`Appearance for ${category.name}`} onCancel={e=>{e.preventDefault();close()}}>
  {open&&<form onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget);onSave(String(data.get('categoryIcon')),String(data.get('categoryColor')));close()}}>
   <div className="bc-section-head"><h2>{category.name}</h2><button type="button" aria-label="Close category appearance" onClick={close}>×</button></div>
   <CategoryAppearancePicker category={category}/><div className="bc-actions"><button type="button" onClick={close}>Cancel</button><button type="submit">Save appearance</button></div>
  </form>}
 </dialog></>;
}
