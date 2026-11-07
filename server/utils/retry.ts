// ==========================================
// SAFE RETRY UTILITY
// ==========================================
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delayMs: number = 500
): Promise<T> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      if (attempt >= retries) {
        throw err;
      }
      console.warn(`[SAFE_RETRY] Attempt ${attempt}/${retries} failed. Retrying in ${delayMs}ms... Error: ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)));
    }
  }
  throw new Error('All retry attempts exhausted');
}
