import { BaseAgent } from "./BaseAgent";
import { eventBus } from "./EventBus";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../logger";

interface UserSessionPayload {
  userId: string;
  event: "login" | "activity";
}

const OCCUPATION_MODULE_MAP: Record<string, string[]> = {
  "freelancer": ["GigIncomeOptimizer", "TaxSavings", "ExpenseTracking", "InvestmentStrategy"],
  "employee": ["InvestmentStrategy", "RetirementPlanning", "TaxSavings", "ExpenseTracking"],
  "business_owner": ["BusinessDeductions", "TaxSavings", "InvestmentStrategy", "RealEstateDeductions"],
  "investor": ["InvestmentStrategy", "CapitalGainsPlanner", "TaxSavings", "RealEstateDeductions"],
  "real_estate": ["RealEstateDeductions", "TaxSavings", "InvestmentStrategy", "CapitalGainsPlanner"],
  "default": ["TaxSavings", "InvestmentStrategy", "ExpenseTracking", "RetirementPlanning"],
};

export class UserProfileAgent extends BaseAgent {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super("UserProfile", "Adapts dashboard module selection based on occupation and activity");
  }

  async init(): Promise<void> {
    eventBus.subscribe("user_session", this.name, async (payload) => {
      await this.onUserSession(payload as UserSessionPayload);
    });
    this.setStatus("idle");
  }

  async start(): Promise<void> {
    this.setStatus("running");
    this.startedAt = new Date();
    this.heartbeat();
    this.intervalHandle = setInterval(() => this.heartbeat(), 60_000);
    await this.log("start", "UserProfile agent started");
    logger.info("[UserProfileAgent] Started");
  }

  async stop(): Promise<void> {
    eventBus.unsubscribe("user_session", this.name);
    if (this.intervalHandle) { clearInterval(this.intervalHandle); this.intervalHandle = null; }
    this.setStatus("stopped");
    await this.log("stop", "UserProfile agent stopped");
  }

  async handleEvent(eventType: string, payload: unknown): Promise<void> {
    this.heartbeat();
    if (eventType === "user_session") await this.onUserSession(payload as UserSessionPayload);
  }

  private async onUserSession(payload: UserSessionPayload): Promise<void> {
    const t0 = Date.now();
    try {
      const { userId } = payload;

      const [user] = await db
        .select({
          occupationId: usersTable.occupationId,
          isBusinessOwner: usersTable.isBusinessOwner,
          dashboardModules: usersTable.dashboardModules,
        })
        .from(usersTable)
        .where(eq(usersTable.clerkId, userId));

      if (!user) return;

      const occupation = user.occupationId || "default";
      const isBusinessOwner = user.isBusinessOwner === true;

      let modules = OCCUPATION_MODULE_MAP[occupation] || OCCUPATION_MODULE_MAP["default"];
      if (isBusinessOwner && !modules.includes("BusinessDeductions")) {
        modules = ["BusinessDeductions", ...modules.slice(0, 3)];
      }

      const currentModules = user.dashboardModules as string[] | null;
      const changed = JSON.stringify(currentModules) !== JSON.stringify(modules);

      await eventBus.publish({
        eventType: "dashboard_configured",
        sourceAgent: this.name,
        payload: { userId, modules, occupation, isBusinessOwner, changed },
      });

      this.heartbeat();
      this.resetErrors();
      await this.log(
        "user_session",
        `Dashboard configured for user ${userId} (occupation: ${occupation})`,
        { modules, changed },
        "info",
        undefined,
        Date.now() - t0
      );
    } catch (err) {
      this.incrementError();
      logger.error({ err, payload }, "[UserProfileAgent] Failed to configure dashboard");
      await this.log("user_session", "Failed to configure dashboard", {}, "error", String(err));
    }
  }
}
