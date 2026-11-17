import assert from "node:assert/strict";
import test from "node:test";
import {accountDetailUrl,accountRoles,buildAccountMatrix,inlineCubeUrl,parseCubeView,parseInlineCubeView,periodBounds,registrationView,accountListFields} from "../lib/admin/account-cube-model.ts";
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
 assert.equal(a.counts.get("suppliers").get("active"),b.counts.get("active").get("suppliers"));
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
 const view=parseCubeView({roles:["publisher","creator","admin"],status:"suspended",period:"2026-11"},roles);
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
 assert.equal(target.searchParams.get("q"),"A&B");
 assert.equal(target.searchParams.get("page"),"2");
 assert.equal(target.searchParams.get("status"),"suspended");
 assert.equal(target.searchParams.get("cubeStatus"),"active");
 assert.deepEqual(parseInlineCubeView(Object.fromEntries(target.searchParams),roles),changed);
 const details=new URL(inlineCubeUrl(changed,accountDetailUrl(changed,"creator","2026-10",roles,customer),"account-records"),"https://example.com");
 assert.equal(details.hash,"#account-records");
 assert.equal(details.searchParams.get("role"),"creator");
 assert.equal(details.searchParams.get("period"),"2026-10");
 assert.equal(details.searchParams.get("status"),"active");
 assert.equal(details.searchParams.has("q"),false);
 assert.equal(accountListFields(details.pathname+details.search+details.hash).get("cubePeriod"),"2026");
});
test("registration shortcut preserves filters and puts years on an actual axis",()=>{
 const original=parseInlineCubeView({cubePeriod:"2026",cubeRoles:"creator"},roles);
 const years=registrationView(original);
 assert.equal(years.row,"time");
 assert.equal(years.col,"account");
 assert.equal(years.timeLevel,"year");
 const months={...years,timeLevel:"month"};
 assert.deepEqual(buildAccountMatrix(cells,years,roles,customer).rows,["2026"]);
 assert.deepEqual(buildAccountMatrix(cells,months,roles,customer).rows,["2026-10"]);
 assert.equal(buildAccountMatrix(cells,months,roles,customer).total,buildAccountMatrix(cells,years,roles,customer).total);
 assert.equal(registrationView(months),months);
});
