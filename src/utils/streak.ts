/**
 * Helper to calculate localized date strings (YYYY-MM-DD) for streak logic,
 * avoiding UTC shift issues that might move the day forward/backward in local timezone (e.g. Asia/Jakarta).
 */
export function getLocalIsoDateString(date = new Date()): string {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  const localDate = new Date(date.getTime() - offsetMs);
  return localDate.toISOString().split("T")[0];
}

/** Parse a YYYY-MM-DD value as a local calendar date without UTC midnight shifts. */
export function parseLocalIsoDateString(value: string): Date {
  const datePart = value.split("T")[0];
  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return new Date(value);
  return new Date(year, month - 1, day, 12);
}

/**
 * Validates and calculates the current streak given an array of ISO date strings (YYYY-MM-DD).
 * It computes the local today and yesterday, checks if a streak is active, 
 * and iterates backwards.
 */
export function calculateStreak(dateStrings: string[]): number {
  if (!dateStrings || dateStrings.length === 0) return 0;
  
  // Ensure we only look at unique YYYY-MM-DD dates, sorted descending
  const uniqueDates = Array.from(new Set(dateStrings.map(d => d.split("T")[0]))).sort().reverse();
  
  const now = new Date();
  const todayStr = getLocalIsoDateString(now);

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayStr = getLocalIsoDateString(yesterday);
  
  // If user hasn't logged today or yesterday, streak is broken
  if (!uniqueDates.includes(todayStr) && !uniqueDates.includes(yesterdayStr)) {
    return 0;
  }
  
  // Start counting backwards from today (or yesterday if today isn't logged yet)
  let currentCheckDate = uniqueDates.includes(todayStr) ? now : yesterday;
  let streak = 0;
  
  while (true) {
    const checkStr = getLocalIsoDateString(currentCheckDate);
    if (uniqueDates.includes(checkStr)) {
      streak++;
      // Move back 1 day
      currentCheckDate = new Date(currentCheckDate.getFullYear(), currentCheckDate.getMonth(), currentCheckDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streak;
}
