import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import type {EmailOtpType} from "@supabase/supabase-js";
export async function GET(request:NextRequest) {
 const url=new URL(request.url);
 const code=url.searchParams.get("code");
 const token_hash=url.searchParams.get("token_hash");
 const type=url.searchParams.get("type");
 const next=url.searchParams.get("next")==="/set-password"?"/set-password":"/portal";
 let success=false;
 if(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
  const db=await createClient();
  if(code) {
   const {error}=await db.auth.exchangeCodeForSession(code);
   success=!error;
  } else if(token_hash && type && ["invite","signup","recovery","email"].includes(type)) {
   const {error}=await db.auth.verifyOtp({token_hash,type:type as EmailOtpType});
   success=!error;
  }
 }
 return NextResponse.redirect(new URL(success?next:"/login?error=invalid-link",request.url));
}
