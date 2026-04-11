import { Router } from "express";
import rateLimit from "express-rate-limit";
import { db } from "@workspace/db";
import { emailSubscribersTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { logger } from "../lib/logger";

const router = Router();

const subscriberLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many subscription attempts. Please try again later." },
});

const unsubscribeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests." },
});

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

router.post("/subscribers", subscriberLimiter, async (req, res) => {
  const { email, preference } = req.body;

  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Email is required." });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();

  if (!isValidEmail(cleanEmail)) {
    res.status(400).json({ error: "Please provide a valid email address." });
    return;
  }

  const validPreferences = ["tips", "updates"];
  const cleanPreference = validPreferences.includes(preference) ? preference : "tips";

  try {
    const existing = await db
      .select({ id: emailSubscribersTable.id, subscribed: emailSubscribersTable.subscribed })
      .from(emailSubscribersTable)
      .where(eq(emailSubscribersTable.email, cleanEmail))
      .limit(1);

    if (existing.length > 0) {
      if (!existing[0].subscribed) {
        await db
          .update(emailSubscribersTable)
          .set({
            subscribed: true,
            preference: cleanPreference,
            dripStage: 0,
            nextSendAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(emailSubscribersTable.id, existing[0].id));
        res.status(200).json({ message: "You're back on the list." });
        return;
      }
      res.status(200).json({ message: "You're already subscribed." });
      return;
    }

    const isConverted = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, cleanEmail))
      .limit(1);

    const id = randomUUID();
    const unsubscribeToken = randomUUID();
    const now = new Date();

    await db.insert(emailSubscribersTable).values({
      id,
      email: cleanEmail,
      preference: cleanPreference,
      dripStage: 0,
      subscribed: true,
      unsubscribeToken,
      converted: isConverted.length > 0,
      nextSendAt: isConverted.length > 0 ? null : now,
      createdAt: now,
      updatedAt: now,
    });

    logger.info({ email: cleanEmail, preference: cleanPreference }, "New email subscriber");
    res.status(201).json({ message: "You're in. First email is on its way." });
  } catch (err) {
    logger.error({ err, email: cleanEmail }, "Failed to subscribe email");
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

router.get("/subscribers/unsubscribe", unsubscribeLimiter, async (req, res) => {
  const { token } = req.query;

  if (!token || typeof token !== "string") {
    res.status(400).send(`
      <html><body style="background:#020204;color:#ccc;font-family:monospace;text-align:center;padding-top:80px;">
        <h2 style="color:#ff4466;">Invalid unsubscribe link.</h2>
        <p>This link may be expired or malformed.</p>
      </body></html>
    `);
    return;
  }

  try {
    const result = await db
      .update(emailSubscribersTable)
      .set({ subscribed: false, nextSendAt: null, updatedAt: new Date() })
      .where(eq(emailSubscribersTable.unsubscribeToken, token))
      .returning({ email: emailSubscribersTable.email });

    if (result.length === 0) {
      res.status(404).send(`
        <html><body style="background:#020204;color:#ccc;font-family:monospace;text-align:center;padding-top:80px;">
          <h2 style="color:#ff4466;">Token not found.</h2>
          <p>You may have already been unsubscribed.</p>
        </body></html>
      `);
      return;
    }

    logger.info({ email: result[0].email }, "Email subscriber unsubscribed");

    res.status(200).send(`
      <html><body style="background:#020204;color:#ccc;font-family:-apple-system,BlinkMacSystemFont,monospace;text-align:center;padding-top:80px;max-width:480px;margin:0 auto;">
        <div style="font-size:20px;font-weight:900;color:#00D4FF;margin-bottom:24px;">EntangleWealth</div>
        <h2 style="color:#ffffff;margin-bottom:12px;">You've been unsubscribed.</h2>
        <p style="color:#888;font-size:14px;line-height:1.6;">
          You will no longer receive emails from us.<br/>
          We're sorry to see you go.
        </p>
      </body></html>
    `);
  } catch (err) {
    logger.error({ err, token }, "Unsubscribe failed");
    res.status(500).send(`
      <html><body style="background:#020204;color:#ccc;font-family:monospace;text-align:center;padding-top:80px;">
        <h2 style="color:#ff4466;">Something went wrong.</h2>
        <p>Please try again or contact support.</p>
      </body></html>
    `);
  }
});

router.post("/subscribers/unsubscribe", unsubscribeLimiter, async (req, res) => {
  const { token } = req.body;

  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "Token required." });
    return;
  }

  try {
    const result = await db
      .update(emailSubscribersTable)
      .set({ subscribed: false, nextSendAt: null, updatedAt: new Date() })
      .where(eq(emailSubscribersTable.unsubscribeToken, token))
      .returning({ email: emailSubscribersTable.email });

    if (result.length === 0) {
      res.status(404).json({ error: "Token not found." });
      return;
    }

    res.json({ message: "Unsubscribed successfully." });
  } catch (err) {
    logger.error({ err }, "Unsubscribe POST failed");
    res.status(500).json({ error: "Something went wrong." });
  }
});

export default router;
