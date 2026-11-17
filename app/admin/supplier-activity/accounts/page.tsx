import Link from "next/link";
import Form from "next/form";
import {accountLabels,customerType,departmentId,departmentName,supplierTypes} from "@/lib/portal/config";
import {loadAccountCube} from "@/lib/admin/account-cube";
import {accountDetailUrl,axes,buildAccountMatrix,cubeRoute,cubeUrl,parseCubeView,type Axis,type CubeParams} from "@/lib/admin/account-cube-model";

export const metadata={title:"Account Analysis"};
const roles=[customerType,...supplierTypes];
const formatter=new Intl.NumberFormat("en-PH");
const months=new Intl.DateTimeFormat("en-PH",{month:"short",year:"numeric",timeZone:"UTC"});
const labelTime=(key:string)=>key.length===7?months.format(new Date(key+"-01T00:00:00Z")):key;
const accessLabels={active:"Not suspended",suspended:"Suspended"};
function memberLabel(axis:Axis,key:string){
 if(axis==="time")return labelTime(key);
 if(axis==="status")return accessLabels[key as keyof typeof accessLabels]??key;
 return key==="customers"?"Customers":key==="suppliers"?"Suppliers":accountLabels[key]??key;
}

export default async function AccountCubePage({searchParams}:{searchParams:Promise<CubeParams>}){
 const [params,cells]=await Promise.all([searchParams,loadAccountCube()]);
 const view=parseCubeView(params,roles);
 const matrix=cells?buildAccountMatrix(cells,view,roles,customerType):null;
 const allMonths=[...new Set([...(cells??[]).map(cell=>cell.month),...(view.period.length===7?[view.period]:[])])].sort().reverse();
 const years=[...new Set([...allMonths.map(month=>month.slice(0,4)),...(view.period?[view.period.slice(0,4)]:[])])].sort().reverse();
 const rowLabel=axes.find(([axis])=>axis===view.row)?.[1];
 const colLabel=axes.find(([axis])=>axis===view.col)?.[1];
 const accountVisible=view.row==="account"||view.col==="account";
 const timeVisible=view.row==="time"||view.col==="time";
 return <main className="sr-shell" data-dept={departmentId}>
  <header className="sr-top"><div><span className="sr-kicker">{departmentName} / Business intelligence</span>
   <h1>Account Analysis</h1><p>Explore department account counts by type, access status, and registration date.</p></div>
   <Link href="/admin/supplier-activity">Supplier Activity</Link>
  </header>
  {!cells?<p className="sr-alert" role="alert">Account counts are unavailable. Reload to try again.</p>:<>
   <section className="sr-card" aria-labelledby="cube-controls">
    <h2 id="cube-controls">Explore accounts</h2>
    <Form action={cubeRoute} className="ac-form">
     <input type="hidden" name="accountLevel" value={view.accountLevel}/>
     <input type="hidden" name="timeLevel" value={view.timeLevel}/>
     <fieldset><legend>Slice or dice</legend>
      <div className="ac-fields">
       <label>Registration period<select name="period" defaultValue={view.period}>
        <option value="">All time</option>
        <optgroup label="Years">{years.map(year=><option key={year} value={year}>{year}</option>)}</optgroup>
        <optgroup label="Months">{allMonths.map(month=><option key={month} value={month}>{labelTime(month)}</option>)}</optgroup>
       </select></label>
       <label>Access status<select name="status" defaultValue={view.status}><option value="">All statuses</option>
        <option value="active">Not suspended</option><option value="suspended">Suspended</option>
       </select></label>
      </div>
      <div className="ac-types" role="group" aria-label="Account types">
       {roles.map(role=><label key={role}><input type="checkbox" name="roles" value={role} defaultChecked={view.roles.includes(role)}/>{accountLabels[role]??role}</label>)}
      </div>
      <p className="sr-note">Leave account types unchecked to include all. Combine filters to compare a subset.</p>
     </fieldset>
     <fieldset><legend>Table layout</legend><div className="ac-fields">
      <label>Rows<select name="row" defaultValue={view.row}>{axes.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label>Columns<select name="col" defaultValue={view.col}>{axes.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
     </div></fieldset>
     <div className="sr-actions"><button type="submit">Apply view</button><Link className="sr-link" href={cubeRoute}>Reset view</Link></div>
    </Form>
   </section>
   <section className="sr-card" aria-labelledby="cube-results">
    <div className="sr-section-heading"><div><h2 id="cube-results">Account cube</h2><p>{rowLabel} × {colLabel} · {formatter.format(matrix?.total??0)} accounts</p></div>
     <Link className="sr-link" prefetch={false} href={cubeUrl({...view,row:view.col,col:view.row})}>Pivot rows and columns</Link>
    </div>
    <div className="sr-actions ac-drills">
     {accountVisible?<Link className="sr-link" prefetch={false} href={cubeUrl({...view,accountLevel:view.accountLevel==="group"?"type":"group"})}>
      {view.accountLevel==="group"?"Drill down to account type":"Drill up to account group"}
     </Link>:null}
     {timeVisible?<Link className="sr-link" prefetch={false} href={cubeUrl({...view,timeLevel:view.timeLevel==="year"?"month":"year"})}>
      {view.timeLevel==="year"?"Drill down to month":"Drill up to year"}
     </Link>:null}
    </div>
    {matrix&&matrix.rows.length&&matrix.columns.length?<div className="sa-table-wrap"><table className="sa-table ac-table" aria-label={rowLabel+" by "+colLabel}>
     <thead><tr><th scope="col">{rowLabel}</th>{matrix.columns.map(col=><th key={col} scope="col">{memberLabel(view.col,col)}</th>)}<th scope="col">Total</th></tr></thead>
     <tbody>{matrix.rows.map(row=><tr key={row}><th scope="row">{memberLabel(view.row,row)}</th>
      {matrix.columns.map(col=>{const count=matrix.counts.get(row)?.get(col)??0;return <td key={col}>{count>0?
       <Link className="sr-link" prefetch={false} href={accountDetailUrl(view,row,col,roles,customerType)} aria-label={memberLabel(view.row,row)+", "+memberLabel(view.col,col)+", "+count+" accounts. Open matching accounts."}>{formatter.format(count)}</Link>:0}</td>;})}
      <td>{formatter.format(matrix.rowTotals.get(row)??0)}</td></tr>)}</tbody>
     <tfoot><tr><th scope="row">Total</th>{matrix.columns.map(col=><td key={col}>{formatter.format(matrix.columnTotals.get(col)??0)}</td>)}<td>{formatter.format(matrix.total)}</td></tr></tfoot>
    </table></div>:<p className="sr-note">No accounts match this view.</p>}
    {matrix&&matrix.total===0&&matrix.rows.length>0&&matrix.columns.length>0?<p className="sr-note">No accounts match these filters.</p>:null}
    <p className="sr-note">Select a nonzero count to open the matching account list. Dates use Philippine time. Staff are excluded. Role and suspension are current values, not historical states.</p>
   </section>
  </>}
 </main>;
}
