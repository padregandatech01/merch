const applicationSteps = {
 not_started:{label:"Not submitted",next:"Submit your details so the department can review your supplier application.",action:"Start application",editable:true},
 pending:{label:"Waiting for review",next:"Your application is with the department. No action is needed unless they ask for more information.",action:"View application",editable:false},
 needs_info:{label:"More details requested",next:"Read the department's feedback and resubmit your updated details.",action:"Review feedback and update",editable:true},
 verified:{label:"Application verified",next:"The department verified your application. Keep using Messages for any follow-up.",action:"View application",editable:false},
 rejected:{label:"Application declined",next:"Read the department's decision and feedback. Use Messages if you have questions.",action:"View decision",editable:false},
 suspended:{label:"Application suspended",next:"Read the latest feedback and contact the department in Messages for next steps.",action:"View decision",editable:false},
 unavailable:{label:"Status unavailable",next:"We couldn't load your application status. Open the application and try again.",action:"Open application",editable:false},
} as const;

export function applicationStep(status:string|null,loadFailed=false){
 if(loadFailed)return applicationSteps.unavailable;
 if(status===null)return applicationSteps.not_started;
 if(Object.hasOwn(applicationSteps,status)&&status!=="not_started")return applicationSteps[status as keyof typeof applicationSteps];
 return applicationSteps.unavailable;
}

export function hasUnreadSupplierActivity(relation:{
 last_message_at:string|null;last_sender_kind:string|null;supplier_read_at:string|null;
}|null){
 if(!relation||relation.last_sender_kind!=="admin"||!relation.last_message_at)return false;
 return !relation.supplier_read_at||Date.parse(relation.last_message_at)>Date.parse(relation.supplier_read_at);
}
