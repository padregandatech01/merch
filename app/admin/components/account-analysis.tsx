import Link from "next/link";
import AccountAnalysisForm from "./account-analysis-form";
import SubmitButton from "./submit-button";
import {accountLabels,customerType,departmentId,supplierTypes} from "@/lib/portal/config";
import {accountDetailUrl,accountGroups,adminRole,accountListFields,accountRoute,axes,buildAccountMatrix,inlineCubeUrl,parseCubeView,groupForRole,manilaMonth,periodDepth,timeDrillDown,timeDrillUp,timeLevels,type AccountCell,type Axis,type CubeView} from "@/lib/admin/account-cube-model";

const roles=[customerType,adminRole,...supplierTypes];
const roleLabel=(role:string)=>role===adminRole?"Department admin":accountLabels[role]??role;
const formatter=new Intl.NumberFormat("en-PH");
const months=new Intl.DateTimeFormat("en-PH",{month:"short",year:"numeric",timeZone:"UTC"});
const labelTime=(key:string)=>periodDepth(key)===3?months.format(new Date(key+"-01T00:00:00Z")):periodDepth(key)===2?key.slice(5)+" "+key.slice(0,4):key;
const accessLabels={active:"Not suspended",suspended:"Suspended",not_tracked:"Not tracked"};
function memberLabel(axis:Axis,key:string){
 if(axis==="time")return labelTime(key);
 if(axis==="status")return accessLabels[key as keyof typeof accessLabels]??key;
 return accountGroups.find(([value])=>value===key)?.[1]??roleLabel(key);
}

export default function AccountAnalysis({view,cells,listUrl,checkedAt}:{view:CubeView;cells:AccountCell[]|null;listUrl:string;checkedAt:string|null}){
 const cubeHref=(next:CubeView)=>inlineCubeUrl(next,listUrl);
 const rowLabelForView=(axis:Axis)=>axis==="account"?(view.accountLevel==="group"?"Account group":"Account type"):axis==="time"?"By "+view.timeLevel:"Access status";
 const matrix=cells?buildAccountMatrix(cells,view,roles,customerType):null;
 const year=Number(manilaMonth(new Date()).slice(0,4));
 const scopeYear=view.period.slice(0,4)||String(year);
 const quarters=Array.from({length:4},(_,i)=>scopeYear+"-Q"+(i+1));
 const scopeMonths=Array.from({length:12},(_,i)=>scopeYear+"-"+String(i+1).padStart(2,"0"));
 const otherYears=[...new Set([...(cells??[]).map(cell=>Number(cell.month.slice(0,4))),Number(scopeYear)])]
  .filter(value=>value!==year&&value!==year-1).sort((a,b)=>b-a);
 const hasTime=view.row==="time"||view.col==="time",down=timeDrillDown(view),up=timeDrillUp(view);
 const heading=(axis:Axis,key:string)=>{
  const label=memberLabel(axis,key),next=axis==="time"?timeDrillDown(view,key):null;
  return next?<Link className="sr-link" prefetch={false} href={cubeHref(next)} aria-label={"Drill into "+label}>{label} <span aria-hidden="true">▾</span></Link>:label;
 };
 const countCell=(count:number,row="",col="")=>{
  const detail=count>0?accountDetailUrl(view,row,col,roles,customerType):null;
  const label=[row&&memberLabel(view.row,row),col&&memberLabel(view.col,col),formatter.format(count)+" accounts"].filter(Boolean).join(", ");
  return detail?<Link className="sr-link" prefetch={false} href={inlineCubeUrl(view,detail,"account-records")} aria-label={label+". Open matching accounts."}>{formatter.format(count)}</Link>:formatter.format(count);
 };
 const rowLabel=rowLabelForView(view.row),colLabel=rowLabelForView(view.col);
 const scope=accountGroups.find(([key])=>key===view.group)?.[1];
 const isAdvanced=!!(view.roles.length||view.status||view.accountLevel!=="group"||view.row!=="time"||view.col!=="account");
 return <section id="account-analysis" tabIndex={-1} className="sr-shell ac-inline" data-dept={departmentId} aria-labelledby="cube-heading">
  <div className="sr-card ac-panel">
   <div className="sr-section-heading"><div><h2 id="cube-heading">Account Analysis</h2>
    <p>{matrix?scope+" · "+formatter.format(matrix.total)+" current account records":"Department account counts"}</p></div>
    <Link className="sr-link" href="#account-records">Jump to accounts</Link>
   </div>
   {!cells?<p className="sr-alert" role="alert">Account counts are unavailable. Reload to try again.</p>:<>
    <AccountAnalysisForm key={JSON.stringify(view)} action={accountRoute+"#account-analysis"}>
     {Array.from(accountListFields(listUrl),([name,value])=><input key={name} type="hidden" name={name} value={value}/>)}
     <div className="ac-fields ac-direct-controls">
      <label>Account group<select key={view.group} name="cubeGroup" defaultValue={view.group}>
       {accountGroups.map(([key,label])=><option key={key} value={key}>{label}</option>)}
      </select></label>
      <label>Date range<select key={view.period} name="cubePeriod" defaultValue={view.period}>
       <option value="">All time</option><option value={year}>This year ({year})</option><option value={year-1}>Last year ({year-1})</option>
       {otherYears.length?<optgroup label="Other years">{otherYears.map(value=><option key={value} value={value}>{value}</option>)}</optgroup>:null}
       <optgroup label={scopeYear+" quarters"}>{quarters.map(value=><option key={value} value={value}>{labelTime(value)}</option>)}</optgroup>
       <optgroup label={scopeYear+" months"}>{scopeMonths.map(value=><option key={value} value={value}>{labelTime(value)}</option>)}</optgroup>
      </select></label>
      <label>Group dates by<select key={view.timeLevel} name="timeLevel" defaultValue={view.timeLevel}>
       {timeLevels.map(([key,label])=><option key={key} value={key}>{label}</option>)}
      </select></label>
     </div>
     <details className="ac-filter-panel" open={isAdvanced||undefined}>
      <summary>More filters and table layout</summary>
      <div className="ac-extra-controls">
       <div className="ac-fields">
        <label>Access status<select key={view.status} name="cubeStatus" defaultValue={view.status}>
         <option value="">All statuses</option>
         <option value="active">Not suspended</option><option value="suspended">Suspended</option>
         <option value="not_tracked">Not tracked (staff)</option>
        </select></label>
        <label>Account breakdown<select key={view.accountLevel} name="accountLevel" defaultValue={view.accountLevel}>
         <option value="group">By account group</option><option value="type">By specific account type</option>
        </select></label>
        <label>Rows<select key={view.row} name="row" defaultValue={view.row}>
         {axes.map(([key,label])=><option key={key} value={key}>{label}</option>)}
        </select></label>
        <label>Columns<select key={view.col} name="col" defaultValue={view.col}>
         {axes.map(([key,label])=><option key={key} value={key}>{label}</option>)}
        </select></label>
       </div>
       <fieldset><legend>Include specific account types</legend>
        <div className="ac-types">
         {roles.filter(role=>view.group==="all"||groupForRole(role,customerType)===view.group).map(role=><label key={role+view.roles.includes(role)}>
          <input type="checkbox" name="cubeRoles" value={role} defaultChecked={view.roles.includes(role)}/>{roleLabel(role)}
         </label>)}
        </div>
        <p className="sr-note">Leave unchecked to include every type in the selected group.</p>
       </fieldset>
      </div>
     </details>
     <div className="ac-report-actions"><SubmitButton label="Apply report filters" pendingLabel="Updating report…"/></div>
    </AccountAnalysisForm>
    <nav className="ac-drills ac-time-nav" aria-label="Account analysis controls">
     {hasTime?<span>{view.period?labelTime(view.period):"All dates"} · By {view.timeLevel}</span>:null}
     {hasTime&&up?<Link className="ac-control" prefetch={false} href={cubeHref(up)}>↑ Drill up</Link>:null}
     {hasTime&&down?<Link className="ac-control" prefetch={false} href={cubeHref(down)}>↓ Drill down to {down.timeLevel==="quarter"?"quarters":"months"}</Link>:null}
     <Link className="ac-control" prefetch={false} href={cubeHref({...view,row:view.col,col:view.row})}>Swap rows and columns</Link>
     <Link className="sr-link" prefetch={false} href={cubeHref(parseCubeView({},roles))}>Reset report</Link>
    </nav>
    {matrix&&matrix.rows.length&&matrix.columns.length?<div className="sa-table-wrap"><table className="sa-table ac-table" aria-label={rowLabel+" by "+colLabel}>
     <thead><tr><th scope="col">{rowLabel}</th>{matrix.columns.map(col=><th key={col} scope="col">{heading(view.col,col)}</th>)}<th scope="col">Total</th></tr></thead>
     <tbody>{matrix.rows.map(row=><tr key={row}><th scope="row">{heading(view.row,row)}</th>
      {matrix.columns.map(col=><td key={col}>{countCell(matrix.counts.get(row)?.get(col)??0,row,col)}</td>)}
      <td>{countCell(matrix.rowTotals.get(row)??0,row)}</td></tr>)}</tbody>
     <tfoot><tr><th scope="row">Total</th>{matrix.columns.map(col=><td key={col}>{countCell(matrix.columnTotals.get(col)??0,"",col)}</td>)}<td>{countCell(matrix.total)}</td></tr></tfoot>
    </table></div>:<p className="sr-note">No accounts match this view.</p>}
    {matrix&&matrix.total===0&&matrix.rows.length>0&&matrix.columns.length>0?<p className="sr-note">No accounts match these filters.</p>:null}
    <p className="sr-note">Current records, grouped by registration or staff role assignment date in Philippine time. Access status is current, not historical, and “Not suspended” does not guarantee sign-in. Linked totals open matching users and suppliers only. Staff counts are aggregate-only.</p>
    {checkedAt?<p className="sr-note">Checked <time dateTime={checkedAt}>{new Intl.DateTimeFormat("en-PH",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Manila"}).format(new Date(checkedAt))}</time> PHT</p>:null}
   </>}
  </div>
 </section>;
}
