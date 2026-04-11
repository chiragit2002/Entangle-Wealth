/**
 * Hour-based streak evaluation utility.
 *
 * Windows measured as elapsed hours since the last activity:
 *
 *  0 – DUPLICATE_WINDOW_HOURS  → duplicate guard: too soon after the last check-in
 *                                 (alreadyActive: true – caller should reject as duplicate)
 *
 *  DUPLICATE_WINDOW_HOURS – 24 → increment: user is checking in "within 24 hours" of
 *                                 their last activity, so the streak continues (+1)
 *
 *  24 – 48 h                   → grace window: user is late but still within 2 days;
 *                                 streak is preserved (no increment, no reset)
 *
 *  > 48 h                      → streak resets to 1
 *
 * The DUPLICATE_WINDOW_HOURS constant defines the minimum time that must elapse
 * before a second check-in is accepted. This replaces the original
 * "lastActivityDate === today" calendar-day guard with a timezone-resilient,
 * hour-based equivalent.
 */

const DUPLICATE_WINDOW_HOURS = 12;

export interface StreakEvalResult {
  newStreak: number;
  alreadyActive: boolean;
}

/**
 * Evaluate streak state given the last activity timestamp and the current streak count.
 *
 * @param lastActive - Timestamp of the last recorded activity (null/undefined = new user)
 * @param currentStreak - Current streak count stored in the DB
 * @param now - Current time (injectable for testing; defaults to new Date())
 * @returns { newStreak, alreadyActive }
 *   - alreadyActive: true → caller should return "already checked in" without updating DB
 *   - newStreak: the streak value to persist (only used when alreadyActive is false)
 */
export function evaluateStreak(
  lastActive: Date | null | undefined,
  currentStreak: number,
  now: Date = new Date(),
): StreakEvalResult {
  if (!lastActive) {
    return { newStreak: 1, alreadyActive: false };
  }

  const hoursElapsed = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);

  if (hoursElapsed < DUPLICATE_WINDOW_HOURS) {
    return { newStreak: currentStreak, alreadyActive: true };
  }

  if (hoursElapsed <= 24) {
    return { newStreak: currentStreak + 1, alreadyActive: false };
  }

  if (hoursElapsed <= 48) {
    return { newStreak: currentStreak, alreadyActive: false };
  }

  return { newStreak: 1, alreadyActive: false };
}
