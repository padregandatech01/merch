"use client";

import Form from "next/form";
import type {ReactNode} from "react";

export default function AccountAnalysisForm({action,children}:{action:string;children:ReactNode}){
 return <Form action={action} className="ac-form" scroll={false} onChange={event=>{
  const target=event.target,form=event.currentTarget;
  if(!(target instanceof HTMLSelectElement))return;
  if(target.name==="cubePeriod"){
   const focus=form.elements.namedItem("cubeFocus");
   if(focus instanceof HTMLInputElement)focus.value="";
  }
  if(target.name==="timeLevel"){
   const row=form.elements.namedItem("row"),col=form.elements.namedItem("col");
   if(row instanceof HTMLSelectElement&&col instanceof HTMLSelectElement&&row.value!=="time"&&col.value!=="time"){
    if(row.value==="account")col.value="account";
    row.value="time";
   }
  }
  if(target.name==="row"||target.name==="col"){
   const other=form.elements.namedItem(target.name==="row"?"col":"row");
   if(other instanceof HTMLSelectElement&&other.value===target.value){
    const previous=Array.from(target.options).find(option=>option.defaultSelected)?.value;
    other.value=previous&&previous!==target.value?previous:
      (target.value==="account"?"time":"account");
   }
  }
 }}>
  {children}
 </Form>;
}
