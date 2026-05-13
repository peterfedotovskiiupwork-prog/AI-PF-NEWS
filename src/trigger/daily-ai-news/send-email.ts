import { task } from "@trigger.dev/sdk";
import nodemailer from "nodemailer";

export const sendEmail = task({
  id: "send-email",
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 5_000,
    maxTimeoutInMs: 30_000,
  },
  run: async (payload: { briefing: string }): Promise<{ sent: boolean }> => {
    const gmailAccount = process.env.GMAIL_ACCOUNT;
    if (!gmailAccount) throw new Error("GMAIL_ACCOUNT is not set");

    const appPassword = process.env.GMAIL_APP_PASSWORD;
    if (!appPassword) throw new Error("GMAIL_APP_PASSWORD is not set");

    const recipientEmail = process.env.RECIPIENT_EMAIL;
    if (!recipientEmail) throw new Error("RECIPIENT_EMAIL is not set");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailAccount,
        pass: appPassword,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #1a1a1a; }
    h1 { font-size: 22px; border-bottom: 2px solid #eee; padding-bottom: 8px; }
    h2 { font-size: 18px; color: #555; margin-top: 28px; }
    p { line-height: 1.6; margin: 12px 0; }
    .source { font-size: 13px; color: #888; }
    a { color: #2563eb; }
    hr { border: none; border-top: 1px solid #eee; margin: 24px 0; }
  </style>
</head>
<body>
  <h1>Daily AI News — ${today}</h1>
  ${payload.briefing
    .replace(/^###?\s?(.*)$/gm, "<h2>$1</h2>")
    .replace(/^\*\*(.+?)\*\* — (.+)$/gm, "<p><strong>$1</strong> — $2</p>")
    .replace(/^Source: (.+?) \((https?:\/\/.+?)\)$/gm, '<p class="source">Source: <a href="$2">$1</a></p>')
    .replace(/^---$/gm, "<hr>")
    .replace(/\n\n/g, "\n")}
</body>
</html>`;

    await transporter.sendMail({
      from: gmailAccount,
      to: recipientEmail,
      subject: `Daily AI News — ${today}`,
      html,
    });

    console.log(`Email sent to ${recipientEmail}`);
    return { sent: true };
  },
});
