"use client";
import {useState} from "react";
export default function NewPasswordFields() {
 const [show,setShow]=useState(false);
 return <div className="portal-field-group">
   <label htmlFor="new-password">Password</label>
   <input id="new-password" name="password" type={show?"text":"password"} minLength={12} maxLength={128} autoComplete="new-password" required/>
   <label htmlFor="new-password-confirm">Confirm password</label>
   <input id="new-password-confirm" name="confirm_password" type={show?"text":"password"} minLength={12} maxLength={128} autoComplete="new-password" required/>
   <button className="portal-link-button" type="button" onClick={()=>setShow(!show)} aria-pressed={show}>{show?"Hide passwords":"Show passwords"}</button>
   <small>Use at least 12 characters.</small>
 </div>;
}
