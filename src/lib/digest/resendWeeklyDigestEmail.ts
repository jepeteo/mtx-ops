import { Resend } from "resend";
import { getResendInvoiceConfigFromEnv } from "@/lib/invoices/resendInvoiceEmail";

export function getWeeklyDigestEmailConfigFromEnv(): { apiKey: string; from: string } | null {
  return getResendInvoiceConfigFromEnv();
}

export async function sendWeeklyDigestEmailWithResend(params: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  textBody: string;
}): Promise<{ messageId: string } | { error: string }> {
  const resend = new Resend(params.apiKey);
  const result = await resend.emails.send({
    from: params.from,
    to: params.to,
    subject: params.subject,
    text: params.textBody,
  });

  if (result.error) {
    return { error: result.error.message || "resend_error" };
  }

  const id = result.data?.id;
  if (!id) {
    return { error: "missing_message_id" };
  }

  return { messageId: id };
}
