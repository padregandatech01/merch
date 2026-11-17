import Link from "next/link";
import Form from "next/form";
import {accountLabels,customerType,departmentId,supplierTypes} from "@/lib/portal/config";
import {accountCubeFields,accountDetailUrl,accountListFields,accountRoute,axes,buildAccountMatrix,inlineCubeUrl,parseCubeView,registrationView,type AccountCell,type Axis,type CubeView} from "@/lib/admin/account-cube-model";

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

export default function AccountAnalysis({view,cells,listUrl}:{view:CubeView;cells:AccountCell[]|null;listUrl:string}){
 const cubeHref=(next:CubeView)=>inlineCubeUrl(next,listUrl);
 const rowLabelForView=(axis:Axis)=>axis==="account"?(view.accountLevel==="group"?"Account group":"Account type"):axis==="time"?(view.timeLevel==="year"?"Registration year":"Registration month"):"Access status";
 const matrix=cells?buildAccountMatrix(cells,view,roles,customerType):null;
 const allMonths=[...new Set([...(cells??[]).map(cell=>cell.month),...(view.period.length===7?[view.period]:[])])].sort().reverse();
 const years=[...new Set([...allMonths.map(month=>month.slice(0,4)),...(view.period?[view.period.slice(0,4)]:[])])].sort().reverse();
 const rowLabel=rowLabelForView(view.row),colLabel=rowLabelForView(view.col);
 const accountVisible=view.row==="account"||view.col==="account";
 const timeVisible=view.row==="time"||view.col==="time";
 return <section id="account-analysis" tabIndex={-1} className="sr-shell ac-inline" data-dept={departmentId} aria-labelledby="cube-heading">
  <div className="sr-card ac-panel">
   <div className="sr-section-heading"><div><h2 id="cube-heading">Account Analysis</h2>
    <p>{matrix?rowLabel+" × "+colLabel+" · "+formatter.format(matrix.total)+" accounts":"Department account counts"}</p></div>
    <Link className="sr-link" href="#account-records">Jump to accounts</Link>
   </div>
   {!cells?<p className="sr-alert" role="alert">Account counts are unavailable. Reload to try again.</p>:<>
    <div className="ac-drills" aria-label="Explore account totals" role="group">
     {accountVisible?<Link className="ac-control" prefetch={false} href={cubeHref({...view,accountLevel:view.accountLevel==="group"?"type":"group"})}>
      {view.accountLevel==="group"?"↓ Drill down to account type":"↑ Drill up to account group"}
     </Link>:<Link className="ac-control" prefetch={false} href={cubeHref({...view,row:"account",col:view.row,accountLevel:"group"})}>Show account groups</Link>}
     {timeVisible?<Link className="ac-control" prefetch={false} href={cubeHref({...view,timeLevel:view.timeLevel==="year"?"month":"year"})}>
      {view.timeLevel==="year"?"↓ Drill down to month":"↑ Drill up to year"}
     </Link>:<Link className="ac-control" prefetch={false} href={cubeHref(registrationView(view))}>Show registration years</Link>}
     <Link className="ac-control" prefetch={false} href={cubeHref({...view,row:view.col,col:view.row})}>Pivot rows and columns</Link>
    </div>
    <details className="ac-filter-panel">
     <summary>Filter or change dimensions (slice / dice){view.roles.length||view.period||view.status?" · Filters active":""}</summary>
     <Form action={accountRoute+"#account-analysis"} className="ac-form" key={accountCubeFields(view).toString()}>
     {Array.from(accountListFields(listUrl),([name,value])=><input key={name} type="hidden" name={name} value={value}/>)}
     <input type="hidden" name="accountLevel" value={view.accountLevel}/>
     <input type="hidden" name="timeLevel" value={view.timeLevel}/>
     <fieldset><legend>Slice or dice</legend>
      <div className="ac-fields">
       <label>Registration period<select name="cubePeriod" defaultValue={view.period}>
        <option value="">All time</option>
        <optgroup label="Years">{years.map(year=><option key={year} value={year}>{year}</option>)}</optgroup>
        <optgroup label="Months">{allMonths.map(month=><option key={month} value={month}>{labelTime(month)}</option>)}</optgroup>
       </select></label>
       <label>Access status<select name="cubeStatus" defaultValue={view.status}><option value="">All statuses</option>
        <option value="active">Not suspended</option><option value="suspended">Suspended</option>
       </select></label>
      </div>
      <div className="ac-types" role="group" aria-label="Account types">
       {roles.map(role=><label key={role}><input type="checkbox" name="cubeRoles" value={role} defaultChecked={view.roles.includes(role)}/>{accountLabels[role]??role}</label>)}
      </div>
      <p className="sr-note">Leave account types unchecked to include all. Combine filters to compare a subset.</p>
     </fieldset>
     <fieldset><legend>Table layout</legend><div className="ac-fields">
      <label>Rows<select name="row" defaultValue={view.row}>{axes.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label>Columns<select name="col" defaultValue={view.col}>{axes.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
     </div></fieldset>
     <div className="sr-actions"><button type="submit">Apply view</button><Link className="sr-link" href={cubeHref(parseCubeView({},roles))}>Reset view</Link></div>
     </Form>
    </details>
    {matrix&&matrix.rows.length&&matrix.columns.length?<div className="sa-table-wrap"><table className="sa-table ac-table" aria-label={rowLabel+" by "+colLabel}>
     <thead><tr><th scope="col">{rowLabel}</th>{matrix.columns.map(col=><th key={col} scope="col">{memberLabel(view.col,col)}</th>)}<th scope="col">Total</th></tr></thead>
     <tbody>{matrix.rows.map(row=><tr key={row}><th scope="row">{memberLabel(view.row,row)}</th>
      {matrix.columns.map(col=>{const count=matrix.counts.get(row)?.get(col)??0;return <td key={col}>{count>0?
       <Link className="sr-link" prefetch={false} href={inlineCubeUrl(view,accountDetailUrl(view,row,col,roles,customerType),"account-records")} aria-label={memberLabel(view.row,row)+", "+memberLabel(view.col,col)+", "+count+" accounts. Open matching accounts."}>{formatter.format(count)}</Link>:0}</td>;})}
      <td>{formatter.format(matrix.rowTotals.get(row)??0)}</td></tr>)}</tbody>
     <tfoot><tr><th scope="row">Total</th>{matrix.columns.map(col=><td key={col}>{formatter.format(matrix.columnTotals.get(col)??0)}</td>)}<td>{formatter.format(matrix.total)}</td></tr></tfoot>
    </table></div>:<p className="sr-note">No accounts match this view.</p>}
    {matrix&&matrix.total===0&&matrix.rows.length>0&&matrix.columns.length>0?<p className="sr-note">No accounts match these filters.</p>:null}
    <p className="sr-note">Select a linked count to filter the list below. Dates use Philippine time. Staff are excluded. Account type and suspension reflect current records.</p>
   </>}
  </div>
 </section>;
}
