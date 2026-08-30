/**
 * Safely parse and validate the server port.
 * Throws an Error if the provided port string is invalid (not an integer or out of range 1-65535).
 * Falls back to defaultPort (3000) if undefined or empty.
 */
export function parsePort(envPort?: string, defaultPort = 3000): number {
  if (envPort === undefined || envPort.trim() === '') {
    return defaultPort;
  }

  const trimmed = envPort.trim();
  const parsed = Number(trimmed);

  if (!Number.isInteger(parsed) || isNaN(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`[STARTUP ERROR] Invalid PORT configuration: '${envPort}'. Port must be an integer between 1 and 65535.`);
  }

  return parsed;
}
