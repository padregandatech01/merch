import assert from "node:assert/strict";
import test from "node:test";
import {accountDetailUrl,accountRoles,buildAccountMatrix,inlineCubeUrl,parseCubeView,parseInlineCubeView,periodBounds,adminRole,accountListFields,manilaMonth,timeDrillDown,timeDrillUp} from "../lib/admin/account-cube-model.ts";
import {canReviewApplication,isApplicationRevision} from "../lib/admin/application-review.ts";
const roles=["reader","creator","publisher"],customer="reader";
const cells=[
 {account_type:"reader",status:"active",month:"2026-11",total:2},
 {account_type:"creator",status:"active",month:"2026-10",total:3},
 {account_type:"publisher",status:"suspended",month:"2026-11",total:1},
 {account_type:"publisher",status:"active",month:"2025-12",total:4}
];
test("application decisions are limited to the precise pending revision",()=>{
 assert.equal(canReviewApplication("pending"),true);
 for(const state of ["verified","needs_info","rejected","suspended",""]) assert.equal(canReviewApplication(state),false);
 assert.equal(isApplicationRevision("2026-11-17T12:20:00.123456+00:00"),true);
 assert.equal(isApplicationRevision("pending"),false);
});
test("pivot exchanges row and column totals without changing the measure",()=>{
 const view=parseCubeView({},roles),a=buildAccountMatrix(cells,view,roles,customer);
 const b=buildAccountMatrix(cells,{...view,row:view.col,col:view.row},roles,customer);
 assert.equal(a.total,10);
 assert.equal(a.total,b.total);
 assert.equal(a.counts.get("2026").get("suppliers"),b.counts.get("suppliers").get("2026"));
});
test("drill levels preserve totals and support exact filtered detail",()=>{
 const group=parseCubeView({row:"account",col:"time",period:"2026"},roles);
 const year=buildAccountMatrix(cells,group,roles,customer);
 const monthView={...group,timeLevel:"month",accountLevel:"type"};
 const months=buildAccountMatrix(cells,monthView,roles,customer);
 assert.equal(year.total,6);
 assert.equal(months.total,6);
 assert.equal(months.counts.get("creator").get("2026-10"),3);
 assert.equal(accountDetailUrl(monthView,"creator","2026-10",roles,customer),"/admin/accounts?role=creator&period=2026-10");
});
test("slices combine into a dice and keep every filter on drill-through",()=>{
 const view=parseCubeView({row:"account",col:"status",roles:["publisher","creator","admin"],status:"suspended",period:"2026-11"},roles);
 assert.deepEqual(accountRoles(["publisher,creator","publisher"],roles),["creator","publisher"]);
 assert.equal(buildAccountMatrix(cells,view,roles,customer).total,1);
 assert.equal(accountDetailUrl(view,"suppliers","suspended",roles,customer),"/admin/accounts?roles=creator%2Cpublisher&status=suspended&period=2026-11");
 assert.match(inlineCubeUrl(view),/cubePeriod=2026-11/);
 assert.notEqual(parseCubeView({row:"status",col:"status"},roles).row,parseCubeView({row:"status",col:"status"},roles).col);
});
test("date filters use half-open Philippine-time periods",()=>{
 assert.deepEqual(periodBounds("2026-12"),{from:"2026-11-30T16:00:00.000Z",to:"2026-12-31T16:00:00.000Z"});
 assert.equal(periodBounds("2026-13"),null);
});

test("account records and inline analysis retain independent URL filters",()=>{
 const view=parseInlineCubeView({row:"account",col:"time",cubePeriod:"2026",cubeStatus:"active",cubeRoles:["creator","publisher"],period:"2026-10",status:"suspended",roles:"reader"},roles);
 const list="/admin/accounts?q=A%26B&role=reader&period=2026-10&status=suspended&page=2#account-records";
 const changed={...view,accountLevel:"type",timeLevel:"month"};
 const target=new URL(inlineCubeUrl(changed,list),"https://example.com");
 assert.equal(target.pathname,"/admin/accounts");
 assert.equal(target.hash,"#account-analysis");
 assert.equal(target.searchParams.get("view"),"analysis");
 assert.equal(target.searchParams.get("q"),"A&B");
 assert.equal(target.searchParams.get("page"),"2");
 assert.equal(target.searchParams.get("status"),"suspended");
 assert.equal(target.searchParams.get("cubeStatus"),"active");
 assert.deepEqual(parseInlineCubeView(Object.fromEntries(target.searchParams),roles),changed);
 const details=new URL(inlineCubeUrl(changed,accountDetailUrl(changed,"creator","2026-10",roles,customer),"account-records"),"https://example.com");
 assert.equal(details.hash,"#account-records");
 assert.equal(details.searchParams.has("view"),false);
 assert.equal(details.searchParams.get("role"),"creator");
 assert.equal(details.searchParams.get("period"),"2026-10");
 assert.equal(details.searchParams.get("status"),"active");
 assert.equal(details.searchParams.has("q"),false);
 assert.equal(accountListFields(details.pathname+details.search+details.hash).get("cubePeriod"),"2026");
});

test("account group, year and time grouping can be chosen independently",()=>{
 const options=[...roles,adminRole];
 const data=[...cells,{account_type:adminRole,status:"not_tracked",month:"2026-04",total:1}];
 const quarters=parseInlineCubeView({cubeGroup:"admins",cubePeriod:"2026",timeLevel:"quarter"},roles);
 const adminMatrix=buildAccountMatrix(data,quarters,options,customer);
 assert.deepEqual(adminMatrix.rows,["2026-Q1","2026-Q2","2026-Q3","2026-Q4"]);
 assert.deepEqual(adminMatrix.columns,["admins"]);
 assert.equal(adminMatrix.counts.get("2026-Q2").get("admins"),1);
 assert.equal(accountDetailUrl(quarters,"2026-Q2","admins",options,customer),null);
 const lastYear=parseInlineCubeView({cubeGroup:"suppliers",cubePeriod:"2025",timeLevel:"month"},roles);
 const suppliers=buildAccountMatrix(data,lastYear,options,customer);
 assert.equal(suppliers.rows.length,12);
 assert.equal(suppliers.counts.get("2025-12").get("suppliers"),4);
 assert.equal(accountDetailUrl(lastYear,"2025-12","suppliers",options,customer),"/admin/accounts?roles=creator%2Cpublisher&period=2025-12");
 const years=buildAccountMatrix(data,parseInlineCubeView({cubeGroup:"customers"},roles),options,customer);
 assert.deepEqual(years.rows,["2026"]);
 assert.equal(years.total,2);
});
test("quarter drill-through preserves the narrower period and PHT cutoff",()=>{
 assert.deepEqual(periodBounds("2026-Q4"),{from:"2026-09-30T16:00:00.000Z",to:"2026-12-31T16:00:00.000Z"});
 assert.equal(manilaMonth(new Date("2026-09-30T16:00:00Z")),"2026-10");
 assert.equal(periodBounds("2026-Q5"),null);
 const view=parseInlineCubeView({cubeGroup:"suppliers",cubePeriod:"2026-Q4",timeLevel:"month"},roles);
 const matrix=buildAccountMatrix(cells,view,roles,customer);
 assert.deepEqual(matrix.rows,["2026-10","2026-11","2026-12"]);
 assert.equal(matrix.total,4);
 assert.equal(accountDetailUrl(view,"2026-10","suppliers",roles,customer),"/admin/accounts?roles=creator%2Cpublisher&period=2026-10");
 const quarter={...view,timeLevel:"quarter",period:"2026"};
 assert.equal(accountDetailUrl(quarter,"2026-Q4","suppliers",roles,customer),"/admin/accounts?roles=creator%2Cpublisher&period=2026-Q4");
});
test("staff do not contaminate user and supplier access counts or detail links",()=>{
 const options=[...roles,adminRole];
 const data=[...cells,{account_type:adminRole,status:"not_tracked",month:"2026-10",total:2}];
 const view=parseInlineCubeView({row:"time",col:"status",timeLevel:"quarter"},roles);
 const matrix=buildAccountMatrix(data,view,options,customer);
 assert.equal(matrix.counts.get("2026-Q4").get("not_tracked"),2);
 assert.equal(matrix.counts.get("2026-Q4").get("active"),5);
 assert.equal(accountDetailUrl(view,"2026-Q4","not_tracked",options,customer),null);
 assert.equal(accountDetailUrl(view,"2026-Q4","active",options,customer),"/admin/accounts?status=active&period=2026-Q4");
});

test("time headings focus the scope and the drill toolbar rolls back without losing filters",()=>{
 const view=parseInlineCubeView({cubeGroup:"suppliers",cubeRoles:["publisher"],cubeStatus:"active",row:"account",col:"time"},roles);
 const year=timeDrillDown(view,"2025");
 const quarter=timeDrillDown(year,"2025-Q4");
 assert.deepEqual(quarter,{...view,focus:"2025-Q4",timeLevel:"month"});
 assert.deepEqual(timeDrillUp(quarter),year);
 assert.deepEqual(timeDrillUp(year),view);
 assert.equal(timeDrillDown(quarter),null);
 assert.equal(buildAccountMatrix(cells,quarter,roles,customer).total,4);
 assert.match(inlineCubeUrl(quarter,"/admin/accounts?q=A&page=2"),/q=A&page=2/);
});

test("drilling and pivoting retain a separately applied date slice",()=>{
 const view=parseInlineCubeView({cubeGroup:"suppliers",cubePeriod:"2026",cubeStatus:"active"},roles);
 const quarters=timeDrillDown(view,"2026");
 const focused=timeDrillDown(quarters,"2026-Q4");
 assert.equal(focused.period,"2026");
 assert.equal(focused.focus,"2026-Q4");
 assert.deepEqual(timeDrillUp(focused),quarters);
 assert.deepEqual(timeDrillUp(quarters),view);
 assert.deepEqual(timeDrillUp(timeDrillDown(quarters)),quarters);
 const pivot={...focused,row:focused.col,col:focused.row};
 assert.equal(buildAccountMatrix(cells,focused,roles,customer).total,buildAccountMatrix(cells,pivot,roles,customer).total);
 assert.match(accountDetailUrl(focused,"","",roles,customer),/period=2026-Q4$/);
 assert.equal(parseInlineCubeView({cubePeriod:"2026",cubeFocus:"2025-Q4"},roles).focus,"");
 const url=new URL(inlineCubeUrl(focused),"https://example.com");
 assert.deepEqual(parseInlineCubeView(Object.fromEntries(url.searchParams),roles),focused);
});

test("portal subtotals drill through, while staff and mixed grand totals do not",()=>{
 const options=[...roles,adminRole];
 const view=parseInlineCubeView({cubeGroup:"suppliers",cubePeriod:"2026",timeLevel:"quarter"},roles);
 assert.equal(accountDetailUrl(view,"2026-Q4","",options,customer),"/admin/accounts?roles=creator%2Cpublisher&period=2026-Q4");
 assert.equal(accountDetailUrl(view,"","suppliers",options,customer),"/admin/accounts?roles=creator%2Cpublisher&period=2026");
 assert.equal(accountDetailUrl(view,"","",options,customer),"/admin/accounts?roles=creator%2Cpublisher&period=2026");
 const mixed=parseInlineCubeView({cubePeriod:"2026"},roles);
 assert.equal(accountDetailUrl(mixed,"","",options,customer),null);
 assert.equal(accountDetailUrl(mixed,"","admins",options,customer),null);
});
