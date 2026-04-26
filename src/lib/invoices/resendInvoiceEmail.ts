import { Resend } from "resend";

export function getResendInvoiceConfigFromEnv(): { apiKey: string; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.INVOICE_EMAIL_FROM?.trim();
  if (!apiKey || !from) return null;
  return { apiKey, from };
}

export async function sendInvoiceEmailWithResend(params: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  textBody: string;
  pdfBuffer: Uint8Array;
  attachmentFilename: string;
}): Promise<{ messageId: string } | { error: string }> {
  const resend = new Resend(params.apiKey);
  const result = await resend.emails.send({
    from: params.from,
    to: params.to,
    subject: params.subject,
    text: params.textBody,
    attachments: [
      {
        filename: params.attachmentFilename,
        content: Buffer.from(params.pdfBuffer),
      },
    ],
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
