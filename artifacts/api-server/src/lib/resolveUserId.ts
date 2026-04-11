import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { Request } from "express";

const CACHE_KEY = Symbol("resolveUserIdCache");

type RequestWithCache = Request & {
  [CACHE_KEY]?: Map<string, string | null>;
};

export async function resolveUserId(clerkId: string, req?: RequestWithCache): Promise<string | null> {
  if (req) {
    if (!req[CACHE_KEY]) {
      req[CACHE_KEY] = new Map();
    }
    const cache = req[CACHE_KEY]!;
    if (cache.has(clerkId)) {
      return cache.get(clerkId)!;
    }
    const result = await lookupUserId(clerkId);
    cache.set(clerkId, result);
    return result;
  }
  return lookupUserId(clerkId);
}

async function lookupUserId(clerkId: string): Promise<string | null> {
  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId));
  return user?.id ?? null;
}
