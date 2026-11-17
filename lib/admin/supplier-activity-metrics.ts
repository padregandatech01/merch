export const invitationMetrics = [
 {status:"invited",label:"Invitations awaiting a first response",hint:"Invitation sent, no supplier reply or decision recorded."},
 {status:"discussing",label:"Conversations in discussion",hint:"Active discussion with no current acceptance or decline."},
 {status:"accepted",label:"Accepted, account setup pending",hint:"Supplier accepted but has not finished account setup."},
] as const;

export const applicationMetrics = [
 {status:"pending",label:"Waiting for admin review",hint:"Submitted applications that need an admin decision."},
 {status:"needs_info",label:"Waiting for supplier details",hint:"Applications returned to the supplier for more information."},
 {status:"verified",label:"Verified applications",hint:"Applications currently verified. This is not a sign-in status."},
] as const;

const DAY_MS=86_400_000;
export function reportWindows(now:Date){
 const cut=(days:number)=>new Date(now.getTime()-days*DAY_MS).toISOString();
 return {end:cut(0),currentStart:cut(30),previousStart:cut(60)};
}

export function countOrNull(result:{error:unknown;count:number|null}){
 return result.error?null:result.count;
}

export function totalOrNull(counts:readonly (number|null)[]){
 if(counts.some(count=>count===null))return null;
 return counts.reduce<number>((total,count)=>total+(count??0),0);
}

export function daysSince(iso:string,now:Date){
 const time=Date.parse(iso);
 return Number.isFinite(time)?Math.max(0,Math.floor((now.getTime()-time)/DAY_MS)):null;
}
