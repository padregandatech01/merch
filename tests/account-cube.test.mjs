import assert from "node:assert/strict";
import test from "node:test";
import {accountDetailUrl,accountRoles,buildAccountMatrix,cubeUrl,parseCubeView,periodBounds} from "../lib/admin/account-cube-model.ts";
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
 assert.match(cubeUrl(view),/period=2026-11/);
 assert.notEqual(parseCubeView({row:"status",col:"status"},roles).row,parseCubeView({row:"status",col:"status"},roles).col);
});
test("date filters use half-open Philippine-time periods",()=>{
 assert.deepEqual(periodBounds("2026-12"),{from:"2026-11-30T16:00:00.000Z",to:"2026-12-31T16:00:00.000Z"});
 assert.equal(periodBounds("2026-13"),null);
});
