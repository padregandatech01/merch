import assert from "node:assert/strict";
import test from "node:test";
import {applicationMetrics,countOrNull,daysSince,invitationMetrics,reportWindows,totalOrNull} from "../lib/admin/supplier-activity-metrics.ts";

test("invitation decisions and application queues stay separate",()=>{
 assert.deepEqual(invitationMetrics.map(item=>item.status),["invited","discussing","accepted"]);
 assert.deepEqual(applicationMetrics.map(item=>item.status),["pending","needs_info","verified"]);
});
test("a failed or missing count is not shown as zero",()=>{
 assert.equal(countOrNull({error:null,count:0}),0);
 assert.equal(countOrNull({error:null,count:null}),null);
 assert.equal(countOrNull({error:new Error("query failed"),count:0}),null);
 assert.equal(totalOrNull([1,0,3]),4);
 assert.equal(totalOrNull([1,null,3]),null);
});
test("the two 30-day intake windows touch but do not overlap",()=>{
 const now=new Date("2026-11-17T05:00:00Z");
 assert.deepEqual(reportWindows(now),{end:"2026-11-17T05:00:00.000Z",currentStart:"2026-10-18T05:00:00.000Z",previousStart:"2026-09-18T05:00:00.000Z"});
 assert.equal(daysSince("2026-11-16T06:00:00Z",now),0);
 assert.equal(daysSince("2026-11-15T05:00:00Z",now),2);
 assert.equal(daysSince("not-a-date",now),null);
});
