export type ErrorCategory =
  | 'AUTH_FAILED'
  | 'AUTH_FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'DATABASE_ERROR'
  | 'AI_ERROR'
  | 'PRIVACY_ERROR'
  | 'APPOINTMENT_CONFLICT'
  | 'SCREENING_ERROR'
  | 'MOOD_ERROR'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public code: ErrorCategory;
  public statusCode: number;
  public details?: unknown;

  constructor(message: string, code: ErrorCategory, statusCode = 500, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}
