import { Resend } from 'resend';
import * as React from 'react';
import { DEMO_MODE } from '@/lib/demo-mode';
import { BriefingEmail } from '@repo/email';

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function sendWelcomeEmail(name: string, email: string) {
  if (DEMO_MODE) {
    console.log(`[DEMO] Would send welcome email to ${email}`);
    return { data: { id: 'demo-email-id' }, error: null };
  }
  try {
    const result = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
      to: email,
      subject: `Welcome ${escapeHtml(name)}!`,
      html: `
        <h1>Welcome to our platform!</h1>
        <p>Hi ${escapeHtml(name)},</p>
        <p>Thanks for signing up. We're excited to have you on board.</p>
        <p>Get started by logging into your dashboard.</p>
      `,
    });
    return result;
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    throw error;
  }
}

export async function sendPaymentFailedEmail(email: string) {
  if (DEMO_MODE) {
    console.log(`[DEMO] Would send payment failed email to ${email}`);
    return { data: { id: 'demo-email-id' }, error: null };
  }
  try {
    const result = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
      to: email,
      subject: 'Payment Failed - Action Required',
      html: `
        <h1>Payment Failed</h1>
        <p>Hi,</p>
        <p>We tried to process your subscription payment but it failed.</p>
        <p>Please update your payment method in your account settings.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing">Update Payment Method</a>
      `,
    });
    return result;
  } catch (error) {
    console.error('Failed to send payment failed email:', error);
    throw error;
  }
}

export async function sendBriefingEmail({
  to,
  firstName,
  weekNumber,
  year,
  patents,
  totalLapsedCount,
  briefingId,
}: {
  to: string;
  firstName?: string;
  weekNumber: number;
  year: number;
  patents: import('@repo/email').BriefingPatent[];
  totalLapsedCount: number;
  briefingId: string;
}): Promise<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://patentbrief.de';
  const dryRun = process.env.RESEND_DRY_RUN === 'true';

  if (DEMO_MODE || dryRun) {
    console.log(`[EMAIL DRY_RUN] to=${to} briefingId=${briefingId} patents=${patents.length}`);
    return 'dry-run-message-id';
  }

  const { data, error } = await getResend().emails.send({
    from: process.env.BRIEFING_FROM_EMAIL ?? 'briefing@patentbrief.de',
    replyTo: process.env.BRIEFING_REPLY_TO ?? 'support@patentbrief.de',
    to,
    subject: `Patentbrief KW ${weekNumber}/${year}: ${patents.length} Patente in Ihrem Feld frei geworden`,
    react: React.createElement(BriefingEmail, {
      weekNumber,
      year,
      patents,
      totalLapsedCount,
      dashboardUrl: `${appUrl}/briefings`,
      watchlistUrl: `${appUrl}/watchlist`,
      unsubscribeUrl: `${appUrl}/api/unsubscribe?briefingId=${briefingId}`,
      userFirstName: firstName,
    }),
  });

  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`);
  return data?.id ?? '';
}

export async function sendSubscriptionCanceledEmail(email: string) {
  if (DEMO_MODE) {
    console.log(`[DEMO] Would send subscription canceled email to ${email}`);
    return { data: { id: 'demo-email-id' }, error: null };
  }
  try {
    const result = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
      to: email,
      subject: 'Subscription Canceled',
      html: `
        <h1>Subscription Canceled</h1>
        <p>Hi,</p>
        <p>Your subscription has been canceled and will end at the next billing cycle.</p>
        <p>If you have any questions, please reach out to our support team.</p>
      `,
    });
    return result;
  } catch (error) {
    console.error('Failed to send subscription canceled email:', error);
    throw error;
  }
}
