import Link from "next/link";
import {accountLabels,departmentId,departmentName} from "@/lib/portal/config";
import {loadSupplierActivity} from "@/lib/admin/supplier-activity";
import {daysSince,totalOrNull} from "@/lib/admin/supplier-activity-metrics";

export const metadata={title:"Supplier Activity"};
const numberFormat=new Intl.NumberFormat("en-PH");
const dateFormat=new Intl.DateTimeFormat("en-PH",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Manila"});
const display=(n:number|null)=>n===null?"Unavailable":numberFormat.format(n);

type Metric={status:string;label:string;hint:string;count:number|null;oldestSubmittedAt?:string|null};
function MetricList({rows,path,now}:{rows:Metric[];path:string;now:Date}){
 return <ul className="sa-metrics">
  {rows.map(row=>{
   const age=row.oldestSubmittedAt?daysSince(row.oldestSubmittedAt,now):null;
   return <li key={row.status}>
    <Link className="sa-metric" href={path+"?status="+row.status} prefetch={false}>
     <strong>{row.label}</strong><span className="sa-number">{display(row.count)}</span>
     <span className="sa-hint">{row.hint}</span>
     {age===null?null:<span className="sa-hint">{age===0?"Oldest submission: less than a day ago":`Oldest submission: ${age} day${age===1?"":"s"} ago`}</span>}
    </Link>
   </li>;
  })}
 </ul>;
}
function AccountCount({role,status,count}:{role:string;status?:"active"|"suspended";count:number|null}){
 if(count===null)return <span>Unavailable</span>;
 const params=new URLSearchParams();
 if(role!=="all")params.set("role",role);
 if(status)params.set("status",status);
 const roleLabel=accountLabels[role]??"All accounts";
 const statusLabel=status==="active"?"not suspended":status==="suspended"?"suspended":"total";
 return <Link className="sr-link" href={"/admin/accounts"+(params.size?"?"+params:"")}
    aria-label={`${roleLabel}, ${statusLabel}, ${display(count)}. Open account list`} prefetch={false}>{display(count)}</Link>;
}
export default async function SupplierActivityPage(){
 const data=await loadSupplierActivity();
 const hasError=data&&(data.inviteRows.some(row=>row.count===null)||data.applicationRows.some(row=>row.count===null)
  ||data.accountRows.some(row=>row.active===null||row.suspended===null)||data.currentIntake===null||data.previousIntake===null);
 const activeTotal=data?totalOrNull(data.accountRows.map(row=>row.active)):null;
 const suspendedTotal=data?totalOrNull(data.accountRows.map(row=>row.suspended)):null;
 return <main className="sr-shell sa-report" data-dept={departmentId}>
  <header className="sr-top">
   <div><span className="sr-kicker">{departmentName} / Admin report</span>
    <h1>Supplier Activity</h1><p>See which suppliers need a follow-up, which applications need a decision, and how many accounts are suspended.</p></div>
   {data?<small className="sa-as-of">As of <time dateTime={data.now.toISOString()}>{dateFormat.format(data.now)} PHT</time></small>:null}
  </header>
  {!data?<p role="alert" className="sr-alert">Reporting is unavailable. Check again once this department&apos;s account settings are configured.</p>:<>
   {hasError?<p role="alert" className="sr-alert">Some counts could not be loaded. Unavailable counts are not zero.</p>:null}
   <section className="sr-card" aria-labelledby="sa-invites">
    <h2 id="sa-invites">Invitation follow-up</h2>
    <MetricList rows={data.inviteRows} path="/admin/relations" now={data.now}/>
   </section>
   <section className="sr-card" aria-labelledby="sa-applications">
    <h2 id="sa-applications">Supplier applications</h2>
    <MetricList rows={data.applicationRows} path="/admin/onboarding" now={data.now}/>
    <div className="sa-intake">
     <h3>New applications submitted</h3>
     <dl><div><dt>Last 30 days</dt><dd>{display(data.currentIntake)}</dd></div>
      <div><dt>Previous 30 days</dt><dd>{display(data.previousIntake)}</dd></div></dl>
     <p className="sr-note">Counts original submissions, not edits or resubmissions.</p>
    </div>
   </section>
   <section className="sr-card" aria-labelledby="sa-access">
    <h2 id="sa-access">Account access by type</h2>
    <p className="sr-note">Staff are excluded. Not suspended does not mean the supplier finished setting up their account or was verified.</p>
    <div className="sa-table-wrap"><table className="sa-table" aria-labelledby="sa-access">
     <thead><tr><th scope="col">Account type</th><th scope="col">Not suspended</th><th scope="col">Suspended</th><th scope="col">Total</th></tr></thead>
     <tbody>{data.accountRows.map(row=><tr key={row.role}><th scope="row">{accountLabels[row.role]??row.role}</th>
      <td><AccountCount role={row.role} status="active" count={row.active}/></td>
      <td><AccountCount role={row.role} status="suspended" count={row.suspended}/></td>
      <td><AccountCount role={row.role} count={totalOrNull([row.active,row.suspended])}/></td>
     </tr>)}</tbody>
     <tfoot><tr><th scope="row">All accounts</th>
      <td><AccountCount role="all" status="active" count={activeTotal}/></td>
      <td><AccountCount role="all" status="suspended" count={suspendedTotal}/></td>
      <td><AccountCount role="all" count={totalOrNull([activeTotal,suspendedTotal])}/></td>
     </tr></tfoot>
    </table></div>
   </section>
  </>}
 </main>;
}
