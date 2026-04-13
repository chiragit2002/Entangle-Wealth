import { Resend } from "resend";
import { db, pool } from "@workspace/db";
import { emailSubscribersTable } from "@workspace/db/schema";
import { eq, lte, and } from "drizzle-orm";
import { logger } from "./logger";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.ALERT_FROM_EMAIL || "updates@entanglewealth.com";
const UNSUBSCRIBE_BASE_URL = process.env.APP_URL || "https://entanglewealth.com";

function getResend(): Resend | null {
  if (!RESEND_API_KEY) return null;
  return new Resend(RESEND_API_KEY);
}

function baseLayout(content: string, unsubscribeToken: string): string {
  const unsubscribeUrl = `${UNSUBSCRIBE_BASE_URL}/api/subscribers/unsubscribe?token=${unsubscribeToken}`;
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EntangleWealth</title>
</head>
<body style="margin:0;padding:0;background:#020204;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:900;color:#00D4FF;letter-spacing:-0.5px;">Entangle<span style="color:#ffffff;">Wealth</span></span>
      <div style="width:40px;height:2px;background:linear-gradient(90deg,#00D4FF,transparent);margin:8px auto 0;"></div>
    </div>

    <div style="background:#0d0d1a;border:1px solid rgba(0,212,255,0.15);border-radius:12px;padding:32px;">
      ${content}
    </div>

    <div style="margin-top:24px;text-align:center;">
      <p style="color:#333;font-size:11px;font-family:'JetBrains Mono',monospace;margin:0 0 8px;">
        You're receiving this because you subscribed for financial clarity tips.
      </p>
      <a href="${unsubscribeUrl}" style="color:#555;font-size:11px;text-decoration:underline;">Unsubscribe instantly</a>
    </div>
  </div>
</body>
</html>`;
}

const DRIP_EMAILS: Array<{
  subject: string;
  build: (unsubscribeToken: string) => string;
}> = [
  {
    subject: "Welcome to EntangleWealth — here's what this is",
    build: (token) => baseLayout(`
      <h1 style="font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:700;color:#ffffff;margin:0 0 8px;">
        Welcome. Let's cut through the noise.
      </h1>
      <p style="color:#00D4FF;font-size:13px;font-family:'JetBrains Mono',monospace;margin:0 0 24px;">
        &gt; initializing your financial clarity feed...
      </p>

      <p style="color:#ccc;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Hey — thanks for signing up.
      </p>
      <p style="color:#ccc;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Most financial tools are built for hedge funds and trading desks. They cost $24,000 a year, require a Bloomberg terminal, and assume you already know what RSI or options flow means.
      </p>
      <p style="color:#ccc;font-size:15px;line-height:1.7;margin:0 0 24px;">
        <strong style="color:#ffffff;">EntangleWealth is different.</strong> It's a financial intelligence platform built for everyone — retail investors, freelancers, families trying to make smarter money decisions. Same analysis, same signals, same tools institutional traders use. But presented clearly.
      </p>

      <div style="background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.15);border-radius:8px;padding:20px;margin:0 0 24px;">
        <p style="color:#00D4FF;font-size:12px;font-family:'JetBrains Mono',monospace;font-weight:700;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">What it actually does:</p>
        <ul style="color:#ccc;font-size:14px;line-height:1.8;margin:0;padding-left:20px;">
          <li>Runs 6 analysis models simultaneously (RSI, MACD, Options Flow, Volume, Sentiment, Risk)</li>
          <li>Cross-checks them — only fires a signal when multiple models agree</li>
          <li>Gives you a clear BUY / SELL / HOLD with a confidence score and the reasoning</li>
          <li>Includes risk parameters (target price, stop loss) so you know exactly what you're in for</li>
        </ul>
      </div>

      <p style="color:#ccc;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Over the next few emails, I'll share some standalone financial insights — things that are useful whether or not you ever use the platform.
      </p>
      <p style="color:#ccc;font-size:15px;line-height:1.7;margin:0;">
        See you in a few days.
      </p>
    `, token),
  },
  {
    subject: "The one financial metric most people never check (they should)",
    build: (token) => baseLayout(`
      <h1 style="font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:700;color:#ffffff;margin:0 0 24px;">
        Why your gut feeling about a stock is almost always wrong
      </h1>

      <p style="color:#ccc;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Here's something most retail investors never think about: the stock market is a <em>sentiment machine</em> that sometimes prices things correctly.
      </p>
      <p style="color:#ccc;font-size:15px;line-height:1.7;margin:0 0 24px;">
        When a stock feels exciting and everyone's talking about it, it's usually already priced for perfection. When it feels boring or scary, it's often where value lives.
      </p>

      <div style="background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.15);border-radius:8px;padding:20px;margin:0 0 24px;">
        <p style="color:#00D4FF;font-size:12px;font-family:'JetBrains Mono',monospace;font-weight:700;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">The RSI insight most people miss:</p>
        <p style="color:#ccc;font-size:14px;line-height:1.7;margin:0 0 12px;">
          RSI (Relative Strength Index) measures momentum on a 0–100 scale. Most people know: above 70 = overbought, below 30 = oversold.
        </p>
        <p style="color:#ccc;font-size:14px;line-height:1.7;margin:0 0 12px;">
          What they miss: RSI <em>divergence</em>. When a stock's price makes a new high, but RSI doesn't — that's a warning sign. The momentum is fading even though the price looks strong.
        </p>
        <p style="color:#f5c842;font-size:14px;font-family:'JetBrains Mono',monospace;margin:0;">
          This divergence often precedes a reversal. It's one of the most reliable early signals institutional traders watch.
        </p>
      </div>

      <p style="color:#ccc;font-size:15px;line-height:1.7;margin:0 0 16px;">
        The problem: calculating RSI divergence manually across hundreds of stocks takes hours. Which is why most retail traders skip it entirely and rely on gut feel instead.
      </p>
      <p style="color:#ccc;font-size:15px;line-height:1.7;margin:0;">
        More clarity coming your way soon.
      </p>
    `, token),
  },
  {
    subject: "Why people get stuck with their finances (it's not what you think)",
    build: (token) => baseLayout(`
      <h1 style="font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:700;color:#ffffff;margin:0 0 24px;">
        The real reason financial clarity feels so hard
      </h1>

      <p style="color:#ccc;font-size:15px;line-height:1.7;margin:0 0 16px;">
        I talk to a lot of people about money. And almost universally, when someone feels stuck — it's not because they're bad with money. It's because the tools they have are built for a different kind of person.
      </p>

      <div style="border-left:3px solid #00D4FF;padding-left:16px;margin:0 0 24px;">
        <p style="color:#ccc;font-size:15px;line-height:1.7;margin:0 0 8px;font-style:italic;">
          "I know I should be doing something smarter with my money. I just don't know where to start."
        </p>
        <p style="color:#666;font-size:12px;font-family:'JetBrains Mono',monospace;margin:0;">— basically everyone</p>
      </div>

      <p style="color:#ccc;font-size:15px;line-height:1.7;margin:0 0 16px;">
        The problem isn't knowledge. It's signal-to-noise ratio. Financial media is designed to keep you engaged, not informed. CNBC needs you scared or excited — because that keeps you watching. Brokerage apps need you trading — because that's how they make money.
      </p>

      <div style="background:rgba(245,200,66,0.06);border:1px solid rgba(245,200,66,0.2);border-radius:8px;padding:20px;margin:0 0 24px;">
        <p style="color:#f5c842;font-size:12px;font-family:'JetBrains Mono',monospace;font-weight:700;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">What actually helps:</p>
        <ul style="color:#ccc;font-size:14px;line-height:1.8;margin:0;padding-left:20px;">
          <li>Less information, more signal — know what actually matters for a given stock</li>
          <li>Context over raw data — what does a number mean relative to historical patterns?</li>
          <li>Clear risk framing — what's the worst case? Is it acceptable?</li>
          <li>Decisions, not just data — what should I actually do with this?</li>
        </ul>
      </div>

      <p style="color:#ccc;font-size:15px;line-height:1.7;margin:0 0 16px;">
        The goal isn't to become a market expert. It's to have enough clarity to make confident decisions with the money you have.
      </p>
      <p style="color:#ccc;font-size:15px;line-height:1.7;margin:0;">
        One more email coming your way.
      </p>
    `, token),
  },
  {
    subject: "How EntangleWealth fits in (this is the only time I'll pitch)",
    build: (token) => baseLayout(`
      <h1 style="font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:700;color:#ffffff;margin:0 0 24px;">
        Here's what EntangleWealth actually does for you
      </h1>

      <p style="color:#ccc;font-size:15px;line-height:1.7;margin:0 0 16px;">
        This is the last email in this sequence, and I want to be straightforward about what we've built and why.
      </p>
      <p style="color:#ccc;font-size:15px;line-height:1.7;margin:0 0 24px;">
        We built EntangleWealth because we were tired of the same two options: either pay $24,000/year for a Bloomberg terminal, or guess your way through retail investing apps that don't give you real signals.
      </p>

      <div style="background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.15);border-radius:8px;padding:20px;margin:0 0 24px;">
        <p style="color:#00D4FF;font-size:12px;font-family:'JetBrains Mono',monospace;font-weight:700;margin:0 0 16px;text-transform:uppercase;letter-spacing:1px;">What you get on the free tier:</p>
        <div style="display:flex;align-items:flex-start;gap:12px;margin:0 0 12px;">
          <span style="color:#00e676;font-weight:700;flex-shrink:0;">✓</span>
          <span style="color:#ccc;font-size:14px;line-height:1.6;">AI stock signals with confidence scores — BUY/SELL/HOLD with reasoning, not just a number</span>
        </div>
        <div style="display:flex;align-items:flex-start;gap:12px;margin:0 0 12px;">
          <span style="color:#00e676;font-weight:700;flex-shrink:0;">✓</span>
          <span style="color:#ccc;font-size:14px;line-height:1.6;">6-model cross-verification — signals only fire when multiple methods agree</span>
        </div>
        <div style="display:flex;align-items:flex-start;gap:12px;margin:0 0 12px;">
          <span style="color:#00e676;font-weight:700;flex-shrink:0;">✓</span>
          <span style="color:#ccc;font-size:14px;line-height:1.6;">Risk parameters on every signal — target price, stop loss, position sizing</span>
        </div>
        <div style="display:flex;align-items:flex-start;gap:12px;margin:0 0 12px;">
          <span style="color:#00e676;font-weight:700;flex-shrink:0;">✓</span>
          <span style="color:#ccc;font-size:14px;line-height:1.6;">Options flow analysis — see where institutional money is moving</span>
        </div>
        <div style="display:flex;align-items:flex-start;gap:12px;">
          <span style="color:#00e676;font-weight:700;flex-shrink:0;">✓</span>
          <span style="color:#ccc;font-size:14px;line-height:1.6;">Tax optimization tools — built for gig workers and freelancers too</span>
        </div>
      </div>

      <p style="color:#ccc;font-size:15px;line-height:1.7;margin:0 0 16px;">
        It's free to start. No credit card. No trial period that converts to a surprise charge.
      </p>

      <div style="text-align:center;margin:32px 0;">
        <a href="${UNSUBSCRIBE_BASE_URL}/sign-up"
           style="display:inline-block;background:linear-gradient(135deg,#f5c842,#cc9900);color:#000000;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;font-family:'JetBrains Mono',monospace;">
          Try EntangleWealth Free →
        </a>
        <p style="color:#555;font-size:11px;font-family:'JetBrains Mono',monospace;margin:12px 0 0;">
          No credit card · Free forever tier · Cancel anytime
        </p>
      </div>

      <p style="color:#666;font-size:13px;line-height:1.7;margin:0;">
        If you decide it's not for you — no hard feelings. You've already gotten the value from this sequence regardless.
      </p>
    `, token),
  },
];

export async function runDripScheduler() {
  const resend = getResend();
  if (!resend) {
    logger.info("Email drip scheduler skipped (RESEND_API_KEY not configured)");
    return;
  }

  const client = await pool.connect();
  try {
    const { rows: due } = await client.query<{
      id: string;
      email: string;
      drip_stage: number;
      unsubscribe_token: string;
    }>(
      `UPDATE email_subscribers
       SET next_send_at = NULL, updated_at = now()
       WHERE subscribed = true
         AND converted = false
         AND next_send_at IS NOT NULL
         AND next_send_at <= now()
       RETURNING id, email, drip_stage, unsubscribe_token`
    );

    for (const subscriber of due) {
      const nextStage = subscriber.drip_stage + 1;

      if (nextStage > 4) {
        logger.info({ email: subscriber.email }, "Drip sequence complete for subscriber");
        continue;
      }

      const emailDef = DRIP_EMAILS[nextStage - 1];
      if (!emailDef) continue;

      const html = emailDef.build(subscriber.unsubscribe_token);

      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: subscriber.email,
          subject: emailDef.subject,
          html,
        });

        const nextSendDate = nextStage < 4
          ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
          : null;

        await client.query(
          `UPDATE email_subscribers
           SET drip_stage = $1, next_send_at = $2, updated_at = now()
           WHERE id = $3`,
          [nextStage, nextSendDate, subscriber.id]
        );

        logger.info({ email: subscriber.email, stage: nextStage }, "Drip email sent");
      } catch (err) {
        logger.error({ err, email: subscriber.email, stage: nextStage }, "Failed to send drip email");
        const nextSendDate = new Date(Date.now() + 60 * 60 * 1000);
        await client.query(
          `UPDATE email_subscribers
           SET next_send_at = $1, updated_at = now()
           WHERE id = $2`,
          [nextSendDate, subscriber.id]
        ).catch(e => logger.error({ e }, "Failed to reschedule drip after send error"));
      }
    }
  } finally {
    client.release();
  }
}

let dripTimer: ReturnType<typeof setInterval> | null = null;

export function startDripScheduler() {
  if (dripTimer) return;
  runDripScheduler().catch(err => logger.error({ err }, "Drip scheduler initial run error"));
  dripTimer = setInterval(() => {
    runDripScheduler().catch(err => logger.error({ err }, "Drip scheduler error"));
  }, 60 * 60 * 1000);
  logger.info("Drip email scheduler started (runs every hour)");
}

export function stopDripScheduler() {
  if (dripTimer) {
    clearInterval(dripTimer);
    dripTimer = null;
  }
}
