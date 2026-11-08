import Link from "next/link";
import {register} from "@/app/actions/auth";
import NewPasswordFields from "./password-fields";
const errors:Record<string,string>={invalid:"Check the form, matching passwords, and minimum 12-character password.",failed:"We could not create the buyer account. Try again.",configuration:"Registration is unavailable."};
export default async function BuyerRegistration({searchParams}:{searchParams:Promise<{error?:string}>}){
 const {error}=await searchParams;
 return <main className="store-register"><div className="store-signup-shell">
  <section className="store-signup-intro">
   <div><span className="store-label">LOXADA / MERCHANDISE</span>
    <h1>A place for your next find.</h1>
    <p>Create a buyer account for our merchandise store. Orders, payments and delivery will be handled separately when shopping is available.</p>
   </div>
   <p className="store-signup-feature">Buyers can sign up here. Wholesale suppliers and lead manufacturers join by invitation from the store team.</p>
  </section>
  <section className="store-signup-form">
   <span className="store-label">BUYER REGISTRATION</span><h2>Create your buyer account</h2>
   <p>Only basic details are needed to register. No payment or delivery information is collected at this stage.</p>
   {error&&<p role="alert" className="store-message">{errors[error]??errors.failed}</p>}
   <form action={register}>
    <input type="hidden" name="account_type" value="buyer"/>
    <label htmlFor="store-name">Your name<input id="store-name" name="display_name" autoComplete="name" minLength={2} maxLength={80} required/></label>
    <label htmlFor="store-email">Email address<input id="store-email" name="email" type="email" autoComplete="email" maxLength={254} required/></label>
    <NewPasswordFields/>
    <button type="submit">Create buyer account</button>
   </form>
   <p>Email confirmation may be required before you sign in.</p>
   <Link href="/login">Already have an account? Sign in</Link>
  </section>
 </div></main>;
}
