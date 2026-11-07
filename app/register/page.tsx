import Link from "next/link";
import {register} from "@/app/actions/auth";
import {accountLabels,customerType,departmentId,departmentName,selfSignupTypes} from "@/lib/portal/config";
import NewPasswordFields from "./password-fields";
const errors:Record<string,string>={
 invalid:"Check the form fields, password confirmation and minimum 12-character password.",
 failed:"Account registration could not be completed. Please check the details or try again.",
 configuration:"Registration is not configured."
};
export default async function Registration({searchParams}:{searchParams:Promise<{error?:string}>}) {
 const {error}=await searchParams;
 return <main className="portal-screen" data-brand={departmentId}>
  <div className="portal-card portal-form-card">
   <div className="portal-eyebrow">LOXADA / {departmentName}</div>
   <h1>Create account</h1>
   <p>Start with basic sign-in details. Supplier applications are completed inside the portal.</p>
   {error&&<p className="portal-alert" role="alert">{errors[error]??errors.failed}</p>}
   <form action={register}>
    <label htmlFor="account-display-name">Display name</label>
    <input id="account-display-name" name="display_name" autoComplete="name" maxLength={80} minLength={2} required/>
    <label htmlFor="account-email">Email</label>
    <input id="account-email" name="email" type="email" autoComplete="email" maxLength={254} required/>
    {selfSignupTypes.length>1
     ? <><label htmlFor="account-type">Register as</label>
        <select name="account_type" id="account-type" required>{selfSignupTypes.map(t=><option key={t} value={t}>{accountLabels[t]}</option>)}</select></>
     : <input type="hidden" name="account_type" value={customerType}/>}
    <NewPasswordFields/>
    <button className="portal-primary" type="submit">Create account</button>
   </form>
   <p className="portal-hint">Account creation does not grant content publishing, licensing or purchasing authority to a supplier. Email verification may be required.</p>
   <Link className="portal-inline-link" href="/login">Already registered? Sign in</Link>
  </div>
 </main>;
}
