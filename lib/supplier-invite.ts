export const inviteErrors = {
 invalid: "Check the contact name, email, category and message. The message must be 40–3,000 characters.",
 configuration: "Invitations are not configured for this portal. Ask the department technician to check the Auth setup.",
 existing: "This email already has an account in this department. Check Account Access or Supplier Invitations & Messages before inviting again.",
 restricted: "The email service does not allow this recipient. In Resend test mode, use your Resend account email. To invite outside suppliers, use a verified sender domain or a production SMTP provider.",
 delivery: "The invitation email could not be sent. Check the SMTP sender, verified domain, or email template in Supabase. If using onboarding@resend.dev, it can only send to your Resend account email.",
 limited: "Too many recent invitation requests. Wait a few minutes before trying again.",
 setup: "The email was sent, but the supplier record could not be saved. Ask the department technician to check the setup before sending another invitation.",
 unavailable: "The invitation could not be completed. Check Supplier Invitations & Messages and the Auth logs before retrying.",
 relationship_exists: "This email already has a conversation. Open it to check the invitation and read the messages.",
} as const;

export type InviteError = keyof typeof inviteErrors;
export type InviteState = { error?: InviteError; relationshipId?: string };
type ProviderError = { code?: string; status?: number; message?: string };

export function inviteErrorFor(error: ProviderError | null | undefined): InviteError {
 switch (error?.code) {
  case "email_exists":
  case "user_already_exists":
   return "existing";
  case "email_address_not_authorized":
   return "restricted";
  case "over_email_send_rate_limit":
  case "over_request_rate_limit":
   return "limited";
  case "email_address_invalid":
  case "validation_failed":
   return "invalid";
  case "email_provider_disabled":
  case "signup_disabled":
  case "not_admin":
  case "no_authorization":
  case "bad_jwt":
   return "configuration";
 }
 // Auth wraps SMTP errors in unexpected_failure, including Resend's 403.
 // This narrow fallback identifies the mail operation, never a duplicate account.
 if (/\b(?:error|failed) sending (?:the )?invit(?:e|ation) email\b/i.test(error?.message ?? "")) return "delivery";
 if (error?.status === 429) return "limited";
 if (error?.status === 401) return "configuration";
 return "unavailable";
}
