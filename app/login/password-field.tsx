"use client";
import { useState } from "react";
export default function PasswordField() {
 const [open,setOpen]=useState(false);
 return <div className="me-password"><input id="me-pass" name="password" type={open?"text":"password"} required autoComplete="current-password"/><button type="button" aria-label={open?"Hide password":"Show password"} aria-pressed={open} onClick={()=>setOpen(!open)}>{open?"Hide":"Show"}</button></div>;
}
