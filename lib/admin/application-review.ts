// A decision belongs to the exact pending submission the admin opened.
export function canReviewApplication(status:string){
 return status==="pending";
}
export function isApplicationRevision(value:string){
 return value.length<=40&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)&&Number.isFinite(Date.parse(value));
}
