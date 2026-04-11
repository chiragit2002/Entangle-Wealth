export const TIER_THRESHOLDS = [
  { tier: "Diamond", minLevel: 40, minXp: 50000 },
  { tier: "Platinum", minLevel: 30, minXp: 25000 },
  { tier: "Gold", minLevel: 20, minXp: 10000 },
  { tier: "Silver", minLevel: 10, minXp: 3000 },
  { tier: "Bronze", minLevel: 1, minXp: 0 },
] as const;

export function calculateLevel(totalXp: number): number {
  return Math.floor(Math.cbrt(totalXp / 10)) + 1;
}

export function xpForLevel(level: number): number {
  return Math.round((level - 1) ** 3 * 10);
}

export function xpForNextLevel(level: number): number {
  return Math.round(level ** 3 * 10);
}

export function calculateTier(level: number, totalXp: number): string {
  for (const t of TIER_THRESHOLDS) {
    if (level >= t.minLevel && totalXp >= t.minXp) return t.tier;
  }
  return "Bronze";
}

export function applyMultiplier(baseXP: number, multiplier: number): number {
  return Math.floor(baseXP * multiplier);
}
