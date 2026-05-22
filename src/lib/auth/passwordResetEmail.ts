import { Resend } from "resend";

export function getPasswordResetEmailConfigFromEnv(): { apiKey: string; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.AUTH_EMAIL_FROM?.trim() || process.env.INVOICE_EMAIL_FROM?.trim();
  if (!apiKey || !from) return null;
  return { apiKey, from };
}

export async function sendPasswordResetEmailWithResend(params: {
  apiKey: string;
  from: string;
  to: string;
  resetUrl: string;
}): Promise<{ messageId: string } | { error: string }> {
  const resend = new Resend(params.apiKey);
  const result = await resend.emails.send({
    from: params.from,
    to: params.to,
    subject: "Reset your MTX Ops password",
    text: [
      "You requested a password reset for MTX Ops.",
      "",
      `Reset your password using this link (valid for 1 hour):`,
      params.resetUrl,
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
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
