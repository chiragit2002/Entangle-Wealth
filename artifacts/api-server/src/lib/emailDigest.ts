import { Resend } from "resend";
import { db } from "@workspace/db";
import { usersTable, alertHistoryTable } from "@workspace/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { logger } from "./logger";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.ALERT_FROM_EMAIL || "alerts@entanglewealth.com";

function getResend(): Resend | null {
  if (!RESEND_API_KEY) return null;
  return new Resend(RESEND_API_KEY);
}

function getAlertTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    price_above: "Price Above",
    price_below: "Price Below",
    rsi_oversold: "RSI Oversold",
    rsi_overbought: "RSI Overbought",
    macd_crossover: "MACD Crossover",
    bollinger_breakout: "Bollinger Breakout",
  };
  return labels[type] || type;
}

function buildDigestHtml(alerts: Array<{ symbol: string; alertType: string; message: string | null; triggeredAt: Date | null }>): string {
  const rows = alerts.map(a => `
    <tr style="border-bottom: 1px solid #1a1a2e;">
      <td style="padding: 12px; color: #00D4FF; font-family: 'JetBrains Mono', monospace; font-weight: bold;">${a.symbol}</td>
      <td style="padding: 12px; color: #999;">${getAlertTypeLabel(a.alertType)}</td>
      <td style="padding: 12px; color: #ccc;">${a.message || "—"}</td>
      <td style="padding: 12px; color: #666; font-size: 12px;">${a.triggeredAt ? new Date(a.triggeredAt).toLocaleString("en-US", { timeZone: "America/New_York" }) : "—"}</td>
    </tr>
  `).join("");

  return `
    <div style="background: #020204; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #00D4FF; font-size: 24px; margin: 0;">EntangleWealth</h1>
          <p style="color: #666; font-size: 14px; margin: 4px 0 0 0;">Alert Digest</p>
        </div>
        <div style="background: #0d0d1a; border: 1px solid rgba(0,212,255,0.15); border-radius: 12px; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: rgba(0,212,255,0.05);">
                <th style="padding: 12px; text-align: left; color: #00D4FF; font-size: 12px; text-transform: uppercase;">Symbol</th>
                <th style="padding: 12px; text-align: left; color: #00D4FF; font-size: 12px; text-transform: uppercase;">Type</th>
                <th style="padding: 12px; text-align: left; color: #00D4FF; font-size: 12px; text-transform: uppercase;">Details</th>
                <th style="padding: 12px; text-align: left; color: #00D4FF; font-size: 12px; text-transform: uppercase;">Time</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <p style="color: #444; font-size: 11px; text-align: center; margin-top: 16px;">
          You're receiving this because you enabled alert digests on EntangleWealth.<br/>
          Update your preferences in Settings → Alert Digest.
        </p>
      </div>
    </div>
  `;
}

async function sendDigestForUser(userId: string, email: string, since: Date, resend: Resend) {
  const alerts = await db
    .select({
      symbol: alertHistoryTable.symbol,
      alertType: alertHistoryTable.alertType,
      message: alertHistoryTable.message,
      triggeredAt: alertHistoryTable.triggeredAt,
    })
    .from(alertHistoryTable)
    .where(
      and(
        eq(alertHistoryTable.userId, userId),
        gte(alertHistoryTable.triggeredAt, since)
      )
    )
    .orderBy(desc(alertHistoryTable.triggeredAt))
    .limit(50);

  if (alerts.length === 0) return;

  const html = buildDigestHtml(alerts);
  const period = since.getTime() > Date.now() - 2 * 86_400_000 ? "Daily" : "Weekly";

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `${period} Alert Digest — ${alerts.length} alert${alerts.length > 1 ? "s" : ""} triggered`,
      html,
    });
    logger.info({ userId, alertCount: alerts.length, period }, "Sent alert digest email");
  } catch (err) {
    logger.error({ err, userId }, "Failed to send alert digest email");
  }
}

export async function runDailyDigest() {
  const resend = getResend();
  if (!resend) {
    logger.warn("RESEND_API_KEY not set, skipping daily digest");
    return;
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const users = await db
    .select({ clerkId: usersTable.clerkId, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.alertEmailDigest, "daily"));

  for (const user of users) {
    await sendDigestForUser(user.clerkId, user.email, since, resend);
  }
}

export async function runWeeklyDigest() {
  const resend = getResend();
  if (!resend) {
    logger.warn("RESEND_API_KEY not set, skipping weekly digest");
    return;
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const users = await db
    .select({ clerkId: usersTable.clerkId, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.alertEmailDigest, "weekly"));

  for (const user of users) {
    await sendDigestForUser(user.clerkId, user.email, since, resend);
  }
}

let dailyTimer: ReturnType<typeof setInterval> | null = null;
let weeklyTimer: ReturnType<typeof setInterval> | null = null;

export function startDigestScheduler() {
  const now = new Date();
  const msUntil8am = getMillisUntilHour(8);

  setTimeout(() => {
    runDailyDigest().catch(err => logger.error({ err }, "Daily digest error"));
    dailyTimer = setInterval(() => {
      runDailyDigest().catch(err => logger.error({ err }, "Daily digest error"));
    }, 24 * 60 * 60 * 1000);
  }, msUntil8am);

  const dayOfWeek = now.getUTCDay();
  let daysUntilMonday: number;
  if (dayOfWeek === 1 && now.getUTCHours() < 8) {
    daysUntilMonday = 0;
  } else if (dayOfWeek === 0) {
    daysUntilMonday = 1;
  } else if (dayOfWeek === 1) {
    daysUntilMonday = 7;
  } else {
    daysUntilMonday = (8 - dayOfWeek) % 7;
  }
  const nextMonday8am = new Date(now);
  nextMonday8am.setUTCDate(nextMonday8am.getUTCDate() + daysUntilMonday);
  nextMonday8am.setUTCHours(8, 0, 0, 0);
  if (nextMonday8am <= now) nextMonday8am.setUTCDate(nextMonday8am.getUTCDate() + 7);
  const msUntilMonday8am = nextMonday8am.getTime() - now.getTime();

  setTimeout(() => {
    runWeeklyDigest().catch(err => logger.error({ err }, "Weekly digest error"));
    weeklyTimer = setInterval(() => {
      runWeeklyDigest().catch(err => logger.error({ err }, "Weekly digest error"));
    }, 7 * 24 * 60 * 60 * 1000);
  }, msUntilMonday8am);

  logger.info(
    { dailyInMs: msUntil8am, weeklyInMs: msUntilMonday8am },
    "Email digest scheduler started"
  );
}

export function stopDigestScheduler() {
  if (dailyTimer) { clearInterval(dailyTimer); dailyTimer = null; }
  if (weeklyTimer) { clearInterval(weeklyTimer); weeklyTimer = null; }
}

function getMillisUntilHour(hourUTC: number): number {
  const now = new Date();
  const target = new Date(now);
  target.setUTCHours(hourUTC, 0, 0, 0);
  if (target <= now) target.setUTCDate(target.getUTCDate() + 1);
  return target.getTime() - now.getTime();
}
