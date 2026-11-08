import {createClient} from "@supabase/supabase-js";
/** Use only in server-side admin code after requireAdmin(). */
export function createAdminClient() {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.SUPABASE_SECRET_KEY;
 if(!url||!key)return null;
 return createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
}
