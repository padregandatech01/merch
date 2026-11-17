export type Axis="account"|"status"|"time";
export type AccountStatus="active"|"suspended";
export type AccountCell={account_type:string;status:AccountStatus;month:string;total:number};
export type CubeView={row:Axis;col:Axis;accountLevel:"group"|"type";timeLevel:"year"|"month";roles:string[];status:AccountStatus|"";period:string};
export type CubeParams=Record<string,string|string[]|undefined>;
export const cubeRoute="/admin/supplier-activity/accounts";
export const axes=[["account","Account"],["status","Access status"],["time","Registration date"]] as const;

export function accountRoles(value:string|string[]|undefined,allowed:readonly string[]){
 const requested=new Set((Array.isArray(value)?value:value?[value]:[]).flatMap(v=>v.split(",")));
 return allowed.filter(role=>requested.has(role));
}
export function accountPeriod(value:unknown):string{
 return typeof value==="string"&&/^(?:19|20|21)\d{2}(?:-(?:0[1-9]|1[0-2]))?$/.test(value)?value:"";
}
export function periodBounds(value:string){
 const period=accountPeriod(value);
 if(!period)return null;
 const [year,month]=period.split("-").map(Number);
 const utc=(y:number,m:number)=>new Date(Date.UTC(y,m,1)-8*3_600_000).toISOString();
 return {from:utc(year,month?month-1:0),to:month?utc(year,month):utc(year+1,0)};
}
const isAxis=(v:unknown):v is Axis=>axes.some(([key])=>v===key);
export function parseCubeView(params:CubeParams,roles:readonly string[]):CubeView{
 const row=isAxis(params.row)?params.row:"account";
 const col=isAxis(params.col)&&params.col!==row?params.col:row==="status"?"account":"status";
 return {row,col,accountLevel:params.accountLevel==="type"?"type":"group",
  timeLevel:params.timeLevel==="month"?"month":"year",roles:accountRoles(params.roles,roles),
  status:params.status==="active"||params.status==="suspended"?params.status:"",period:accountPeriod(params.period)};
}
export function cubeUrl(view:CubeView){
 const p=new URLSearchParams({row:view.row,col:view.col,accountLevel:view.accountLevel,timeLevel:view.timeLevel});
 if(view.roles.length)p.set("roles",view.roles.join(","));
 if(view.status)p.set("status",view.status);
 if(view.period)p.set("period",view.period);
 return cubeRoute+"?"+p.toString();
}
const inPeriod=(month:string,period:string)=>!period||month===period||month.slice(0,4)===period;
export function buildAccountMatrix(cells:AccountCell[],view:CubeView,allowed:readonly string[],customer:string){
 const roles=view.roles.length?view.roles:allowed;
 const filtered=cells.filter(cell=>roles.includes(cell.account_type)&&(!view.status||cell.status===view.status)&&inPeriod(cell.month,view.period));
 const key=(dimension:Axis,cell:AccountCell)=>{
  switch(dimension){
   case "account":return view.accountLevel==="type"?cell.account_type:cell.account_type===customer?"customers":"suppliers";
   case "status":return cell.status;
   case "time":return view.timeLevel==="month"?cell.month:cell.month.slice(0,4);
  }
 };
 const keys=(axis:Axis)=>{
  if(axis==="account"){
   return view.accountLevel==="type"?roles:[...(roles.includes(customer)?["customers"]:[]),...(roles.some(role=>role!==customer)?["suppliers"]:[])];
  }
  if(axis==="status")return view.status?[view.status]:["active","suspended"];
  const times=new Set(filtered.map(cell=>key(axis,cell)));
  if(view.period&&(view.timeLevel==="year"||view.period.length===7))times.add(view.timeLevel==="year"?view.period.slice(0,4):view.period);
  return [...times].sort().reverse();
 };
 const rows=keys(view.row),columns=keys(view.col);
 const counts=new Map<string,Map<string,number>>(),rowTotals=new Map<string,number>(),columnTotals=new Map<string,number>();
 let total=0;
 for(const cell of filtered){
  const r=key(view.row,cell),c=key(view.col,cell),row=counts.get(r)??new Map<string,number>();
  row.set(c,(row.get(c)??0)+cell.total);counts.set(r,row);
  rowTotals.set(r,(rowTotals.get(r)??0)+cell.total);
  columnTotals.set(c,(columnTotals.get(c)??0)+cell.total);
  total+=cell.total;
 }
 return {rows,columns,counts,rowTotals,columnTotals,total};
}

export function accountDetailUrl(view:CubeView,row:string,col:string,allowed:readonly string[],customer:string){
 let roles=[...(view.roles.length?view.roles:allowed)],status=view.status,period=view.period;
 const apply=(axis:Axis,value:string)=>{
  if(axis==="account")roles=roles.filter(role=>view.accountLevel==="type"?role===value:(role===customer?"customers":"suppliers")===value);
  if(axis==="status"&&(value==="active"||value==="suspended"))status=value;
  if(axis==="time"&&(!period||period.length<value.length))period=value;
 };
 apply(view.row,row);apply(view.col,col);
 const p=new URLSearchParams();
 if(roles.length===1)p.set("role",roles[0]);
 else if(roles.length<allowed.length&&roles.length>0)p.set("roles",roles.join(","));
 if(status)p.set("status",status);
 if(period)p.set("period",period);
 return "/admin/accounts"+(p.size?"?"+p.toString():"");
}
