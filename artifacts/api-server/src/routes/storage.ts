import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { Readable } from "stream";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { validateBody } from "../lib/validateRequest";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { ObjectPermission } from "../lib/objectAcl";
import { requireAuth } from "../middlewares/requireAuth";
import { db } from "@workspace/db";
import { sql, eq, or } from "drizzle-orm";
import { usersTable } from "@workspace/db/schema";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";

function validateWildcardPath(paramKey: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const raw = req.params[paramKey];
    const filePath = Array.isArray(raw) ? raw.join("/") : (raw ?? "");
    if (!filePath || filePath.length > 512 || /\.\.\/|\.\.\\/.test(filePath)) {
      res.status(400).json({ error: "Invalid path" });
      return;
    }
    next();
  };
}

const KYC_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);
const KYC_MAX_SIZE_BYTES = 10 * 1024 * 1024;
const UPLOAD_ALLOC_TTL_HOURS = 1;

async function recordUploadAllocation(objectPath: string, clerkId: string): Promise<void> {
  await db.execute(
    sql`INSERT INTO kyc_upload_allocations (object_path, clerk_id, expires_at)
        VALUES (${objectPath}, ${clerkId}, NOW() + INTERVAL '${sql.raw(String(UPLOAD_ALLOC_TTL_HOURS))} hours')
        ON CONFLICT (object_path) DO UPDATE SET clerk_id = ${clerkId}, expires_at = NOW() + INTERVAL '${sql.raw(String(UPLOAD_ALLOC_TTL_HOURS))} hours'`
  );
}

export async function isUploadOwnedBy(objectPath: string, clerkId: string): Promise<boolean> {
  const result = await db.execute(
    sql`SELECT clerk_id FROM kyc_upload_allocations
        WHERE object_path = ${objectPath} AND expires_at > NOW() AND clerk_id = ${clerkId}
        LIMIT 1`
  );
  return (result.rows as { clerk_id: string }[]).length > 0;
}

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload.
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned presigned URL.
 */
router.post("/storage/uploads/request-url", requireAuth, validateBody(RequestUploadUrlBody), async (req: Request, res: Response) => {
  const { name, size, contentType } = req.body;

  if (!KYC_ALLOWED_MIME_TYPES.has(contentType)) {
    res.status(400).json({ error: "File type not allowed. Accepted types: JPEG, PNG, WebP, HEIC, PDF." });
    return;
  }

  if (size > KYC_MAX_SIZE_BYTES) {
    res.status(400).json({ error: "File too large. Maximum size is 10 MB." });
    return;
  }

  const clerkId = (req as AuthenticatedRequest).userId;

  try {
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

    await recordUploadAllocation(objectPath, clerkId);

    res.json(
      RequestUploadUrlResponse.parse({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get("/storage/public-objects/*filePath", validateWildcardPath("filePath"), async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const response = await objectStorageService.downloadObject(file);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * GET /storage/objects/*
 *
 * Serve private object entities from PRIVATE_OBJECT_DIR.
 * Requires authentication. Access is granted to the document owner or an admin.
 */
router.get("/storage/objects/*path", requireAuth, validateWildcardPath("path"), async (req: Request, res: Response) => {
  const requestingUserId = (req as AuthenticatedRequest).userId;

  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;

    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);

    const canAccessViaAcl = await objectStorageService.canAccessObjectEntity({
      userId: requestingUserId,
      objectFile,
      requestedPermission: ObjectPermission.READ,
    });

    if (!canAccessViaAcl) {
      const [docOwner] = await db
        .select({ clerkId: usersTable.clerkId, businessDocPaths: usersTable.businessDocPaths })
        .from(usersTable)
        .where(
          or(
            eq(usersTable.kycIdPhotoPath, objectPath),
            eq(usersTable.kycSelfiePath, objectPath),
          )
        )
        .limit(1);

      const businessDocOwner = docOwner ? docOwner : await (async () => {
        const allUsers = await db
          .select({ clerkId: usersTable.clerkId, businessDocPaths: usersTable.businessDocPaths })
          .from(usersTable);
        return allUsers.find(u =>
          Array.isArray(u.businessDocPaths) && (u.businessDocPaths as string[]).includes(objectPath)
        ) || null;
      })();

      const isOwner = docOwner?.clerkId === requestingUserId || businessDocOwner?.clerkId === requestingUserId;

      if (!isOwner) {
        const adminIds = (process.env.ADMIN_CLERK_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
        const isEnvAdmin = adminIds.includes(requestingUserId);

        if (!isEnvAdmin) {
          const [requestorRow] = await db
            .select({ subscriptionTier: usersTable.subscriptionTier })
            .from(usersTable)
            .where(eq(usersTable.clerkId, requestingUserId))
            .limit(1);

          if (requestorRow?.subscriptionTier !== "admin") {
            res.status(403).json({ error: "Access denied" });
            return;
          }
        }
      }
    }

    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
