/**
 * Public Endpoint Security Policy
 * ================================
 * This file formally documents EVERY unauthenticated API endpoint that
 * touches user-derived data (usersTable or any table joined to user records),
 * along with the privacy controls that make each endpoint safe to expose
 * without requireAuth middleware.
 *
 * POLICY REQUIREMENTS:
 * 1. Any new public endpoint that reads user records MUST be added here.
 * 2. The endpoint MUST satisfy ALL privacy controls listed for its category.
 * 3. The endpoint MUST add a compile-time policy reference (`void PUBLIC_ENDPOINT_POLICY[n]`).
 * 4. PII (email, full lastName, photoUrl, phone, address) MUST never be returned raw.
 *
 * Reviewed and approved as part of Security & Backend Hardening task #85.
 */

export const PUBLIC_ENDPOINT_POLICY = [
  {
    method: "GET",
    path: "/api/gamification/leaderboard",
    route: "gamification.ts",
    userDataAccessed: ["usersTable.firstName", "usersTable.lastName"],
    privacyControls: [
      "Raw firstName/lastName are NEVER returned. Server-side transform produces only 'FirstName L.' displayName.",
      "photoUrl is explicitly excluded from the SELECT clause.",
      "userId included (opaque CUID, non-secret) for rank deduplication only.",
      "Input validated via LeaderboardQuerySchema (Zod) — period enum, limit 1-100.",
    ],
    businessJustification:
      "Public leaderboard drives viral engagement and social proof before users sign up.",
  },
  {
    method: "GET",
    path: "/api/stats/recent-signups",
    route: "viral.ts",
    userDataAccessed: ["usersTable.firstName", "usersTable.lastName", "usersTable.createdAt"],
    privacyControls: [
      "Raw firstName/lastName are NEVER returned. Only 'FirstName L.' + relative time.",
      "Email, userId, and all other PII fields are not selected from usersTable.",
      "Relative time ('2h ago') replaces exact timestamp, preventing join-based re-identification.",
      "Input validated via PaginationQuerySchema (Zod) — limit capped at 50.",
    ],
    businessJustification:
      "Landing-page social proof feature showing recent community growth to drive sign-ups.",
  },
  {
    method: "GET",
    path: "/api/users/:userId/profile",
    route: "users.ts",
    userDataAccessed: ["usersTable.*"],
    privacyControls: [
      "Gate: usersTable.isPublicProfile must be true — returns 404 otherwise (prevents enumeration).",
      "Only explicit public fields selected (id, firstName, lastName, photoUrl, headline, bio, location, createdAt).",
      "isPublicProfile flag stripped from response before sending.",
      "No email, phone, stripeCustomerId, clerkId, or internal notes ever returned.",
      "userId param validated via UserIdParamsSchema (Zod).",
    ],
    businessJustification:
      "Opt-in public profile page that users explicitly enable in their account settings.",
  },
  {
    method: "GET",
    path: "/api/resumes/public/:userId",
    route: "resumes.ts",
    userDataAccessed: ["usersTable.isPublicProfile", "resumesTable.*"],
    privacyControls: [
      "Gate: usersTable.isPublicProfile must be true — returns 404 otherwise (prevents enumeration).",
      "Resume data only served AFTER successful privacy gate check.",
      "userId param validated via PublicUserIdParamsSchema (Zod).",
    ],
    businessJustification:
      "Opt-in public resume sharing that users explicitly enable in their account settings.",
  },
  {
    method: "GET",
    path: "/api/giveaway/leaderboard",
    route: "giveaway.ts",
    userDataAccessed: ["usersTable.firstName", "usersTable.lastName"],
    privacyControls: [
      "Raw firstName/lastName are NEVER returned. Server-side transform produces only 'FirstName L.' name.",
      "email, photoUrl, and all other PII excluded from SELECT clause.",
      "userId included (opaque CUID, non-secret) for rank deduplication only.",
      "Input validated via inline Zod schema — limit 1-50.",
    ],
    businessJustification:
      "Public giveaway leaderboard drives referral participation and viral growth.",
  },
  {
    method: "GET",
    path: "/api/token/rewards/history",
    route: "token.ts",
    userDataAccessed: ["usersTable.firstName", "usersTable.lastName"],
    privacyControls: [
      "Raw firstName/lastName are NEVER returned. Server-side transform produces only 'FirstName L.' name.",
      "email, photoUrl, and all other PII excluded from SELECT clause.",
      "userId fallback 'User XXXXXX' uses only the first 6 chars of opaque CUID.",
      "Input validated via PaginationQuerySchema (Zod) — limit capped at 50.",
    ],
    businessJustification:
      "Public historical token reward leaderboard for transparency and community engagement.",
  },
  {
    method: "GET",
    path: "/api/stats/user-count",
    route: "viral.ts",
    userDataAccessed: ["usersTable (COUNT only)"],
    privacyControls: [
      "Only COUNT(*) aggregate returned — no individual user records accessed.",
      "Returns a single integer: the total number of registered users.",
    ],
    businessJustification:
      "Landing-page social proof counter showing total community size.",
  },
  {
    method: "GET",
    path: "/api/stats/hero",
    route: "viral.ts",
    userDataAccessed: ["usersTable (COUNT only)", "alertHistoryTable (COUNT only)"],
    privacyControls: [
      "Only COUNT(*) aggregates returned — no individual user records accessed.",
      "Returns computed stats (member count, signals count, accuracy %) only.",
    ],
    businessJustification:
      "Landing-page hero section statistics for social proof and credibility.",
  },
] as const;
