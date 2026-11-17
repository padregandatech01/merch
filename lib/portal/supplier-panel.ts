import type {requirePortal} from "@/lib/auth/authorization";
type PortalIdentity=Awaited<ReturnType<typeof requirePortal>>;

export async function readSupplierConversation({db,user}:PortalIdentity){
 return db.from("supplier_relationships")
  .select("id,last_message_at,last_sender_kind,supplier_read_at")
  .eq("user_id",user.id).eq("status","completed").maybeSingle();
}
