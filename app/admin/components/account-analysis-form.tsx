"use client";

import Form from "next/form";
import type {ReactNode} from "react";

export default function AccountAnalysisForm({action,children}:{action:string;children:ReactNode}){
 return <Form action={action} className="ac-form" scroll={false} onChange={event=>{
  const target=event.target,form=event.currentTarget;
  if(!(target instanceof HTMLSelectElement)&&!(target instanceof HTMLInputElement))return;
  if(target.name==="cubeGroup"){
   form.querySelectorAll<HTMLInputElement>('input[name="cubeRoles"]').forEach(input=>{input.checked=false;});
   // Staff do not have the supplier/customer access-status field.
   const status=form.elements.namedItem("cubeStatus");
   if(status instanceof HTMLSelectElement&&((target.value==="admins"&&status.value!=="not_tracked")||
      (target.value!=="all"&&target.value!=="admins"&&status.value==="not_tracked")))status.value="";
  }
  if(target.name==="timeLevel"){
   const row=form.elements.namedItem("row"),col=form.elements.namedItem("col");
   if(row instanceof HTMLSelectElement&&col instanceof HTMLSelectElement&&row.value!=="time"&&col.value!=="time"){
    if(row.value==="account")col.value="account";
    row.value="time";
   }
  }
  if(target instanceof HTMLSelectElement&&(target.name==="row"||target.name==="col")){
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
