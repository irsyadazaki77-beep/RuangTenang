/**
 * API v1 Helpers & Common Utilities Barrel Module
 * 
 * Refactored: Sub-modules have been decomposed into dedicated directories:
 * - server/utils/ (urlSanitizer, pagination, retry, prismaErrorFormatter)
 * - server/middleware/ (requestLogger, timeoutMiddleware, idempotency, centralizedErrorHandler)
 * - server/openapi/ (openApiSpec, swaggerHandler)
 * - server/config/ (startupValidation)
 * - server/services/ai/ (aiTelemetryLogger)
 *
 * This file maintains full backwards-compatibility with existing routes, services, and tests.
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId?: string;
      idempotencyKey?: string;
      attachmentOwnerId?: string;
      user?: {
        userId: string;
        role: 'mahasiswa' | 'konselor' | 'admin' | 'campus_admin';
        name: string;
        email: string;
        tier?: string;
        sessionId?: string;
        campusId?: string;
      };
    }
  }
}

// 1. Utilities
export { sanitizeUrlForLogs, pseudonymizeIp } from './utils/urlSanitizer.js';
export { validatePagination, type PaginationParams } from './utils/pagination.js';
export { withRetry } from './utils/retry.js';
export { formatP2002ErrorMessage } from './utils/prismaErrorFormatter.js';

// 2. Middleware
export { requestIdAndLoggerMiddleware, classifyHttpRequest } from './middleware/requestLogger.js';
export { timeoutMiddleware } from './middleware/timeoutMiddleware.js';
export {
  idempotencyStore,
  clearIdempotencyStoreForTesting,
  idempotencyMiddleware,
  type IdempotencyMiddlewareOptions
} from './middleware/idempotency.js';
export { centralizedErrorHandler } from './middleware/centralizedErrorHandler.js';

// 3. OpenAPI & Documentation
export { openApiSpec } from './openapi/openApiSpec.js';
export { renderSwaggerHtml } from './openapi/swaggerHandler.js';

// 4. Configuration & Startup
export { validateStartupEnvironment } from './config/startupValidation.js';

// 5. AI Telemetry
export { logAiTelemetry, type AiTelemetryData } from './services/ai/aiTelemetryLogger.js';
