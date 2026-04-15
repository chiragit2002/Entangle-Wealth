import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

let sharpModule: typeof import("sharp") | null = null;

async function getSharp() {
  if (sharpModule) return sharpModule;
  try {
    sharpModule = (await import("sharp")).default as unknown as typeof import("sharp");
    return sharpModule;
  } catch (err) {
    logger.debug({ error: err }, "Sharp module not available for image compression");
    return null;
  }
}

export function imageCompressionMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.method !== "POST" && req.method !== "PUT") {
    next();
    return;
  }

  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("application/json")) {
    next();
    return;
  }

  const body = req.body;
  if (!body || typeof body !== "object") {
    next();
    return;
  }

  const screenshotUrl = body.screenshotUrl;
  if (!screenshotUrl || typeof screenshotUrl !== "string" || !screenshotUrl.startsWith("data:image/")) {
    next();
    return;
  }

  compressBase64Image(screenshotUrl)
    .then((compressed) => {
      if (compressed) {
        body.screenshotUrl = compressed;
      }
      next();
    })
    .catch(() => {
      next();
    });
}

async function compressBase64Image(dataUrl: string): Promise<string | null> {
  const sharp = await getSharp();
  if (!sharp) return null;

  try {
    const matches = dataUrl.match(/^data:image\/\w+;base64,(.+)$/);
    if (!matches || !matches[1]) return null;

    const buffer = Buffer.from(matches[1], "base64");

    const compressed = await (sharp as Function)(buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const result = `data:image/jpeg;base64,${compressed.toString("base64")}`;

    const savings = Math.round((1 - result.length / dataUrl.length) * 100);
    if (savings > 0) {
      logger.info({ originalSize: dataUrl.length, compressedSize: result.length, savings: `${savings}%` }, "Image compressed");
    }

    return result;
  } catch (err) {
    logger.warn({ err }, "Image compression failed, using original");
    return null;
  }
}
