export function buildContentSecurityPolicyDirectives(
  trustedOrigins: string[],
  options: { production: boolean; preview: boolean },
) {
  return {
    defaultSrc: ["'self'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    scriptSrc: ["'self'", ...(options.production ? [] : ["'unsafe-eval'"]), 'blob:'],
    scriptSrcAttr: ["'none'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
    imgSrc: ["'self'", 'data:', 'blob:', 'https://images.unsplash.com', 'https://api.dicebear.com', 'https://*.google.com', 'https://*.googleapis.com', 'https://*.googleusercontent.com', 'https://*.gstatic.com'],
    connectSrc: ["'self'", 'https://generativelanguage.googleapis.com', ...(options.preview ? ['ws:', 'wss:', 'data:'] : []), ...trustedOrigins],
    frameAncestors: [...new Set(["'self'", ...trustedOrigins])],
    workerSrc: ["'self'", 'blob:'],
    reportUri: ['/api/v1/security/csp-report'],
  };
}
