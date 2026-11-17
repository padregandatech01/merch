import assert from "node:assert/strict";
import test from "node:test";
import {applicationStep,hasUnreadSupplierActivity} from "../lib/portal/supplier-panel-state.ts";

test("unsubmitted and needs-info applications can be edited",()=>{
 assert.equal(applicationStep(null).editable,true);
 assert.equal(applicationStep("needs_info").action,"Review feedback and update");
});
test("review states and load failures do not open the application form",()=>{
 for(const status of ["pending","verified","rejected","suspended","unknown","__proto__"]){
  assert.equal(applicationStep(status).editable,false);
 }
 assert.equal(applicationStep(null,true).label,"Status unavailable");
});
test("unread activity is counted only for newer department messages or notices",()=>{
 const rel={last_message_at:"2026-11-17T05:00:00Z",last_sender_kind:"admin",supplier_read_at:null};
 assert.equal(hasUnreadSupplierActivity(null),false);
 assert.equal(hasUnreadSupplierActivity(rel),true);
 assert.equal(hasUnreadSupplierActivity({...rel,supplier_read_at:"2026-11-17T05:01:00Z"}),false);
 assert.equal(hasUnreadSupplierActivity({...rel,last_sender_kind:"supplier"}),false);
});
