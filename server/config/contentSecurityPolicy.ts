export function buildContentSecurityPolicyDirectives(
  trustedOrigins: string[],
  _options: { production: boolean; preview: boolean },
) {
  const allowedIframeHosts = [
    "'self'",
    'https://aistudio.google.com',
    'https://*.google.com',
    'https://*.run.app',
    'https://*.googleusercontent.com',
    ...trustedOrigins,
  ];

  return {
    defaultSrc: ["'self'", 'data:', 'blob:'],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'blob:', 'https://*.googleapis.com'],
    scriptSrcAttr: ["'none'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
    imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
    connectSrc: ["'self'", 'https:', 'http:', 'ws:', 'wss:', 'data:', 'blob:', ...trustedOrigins],
    frameAncestors: [...new Set(allowedIframeHosts)],
    workerSrc: ["'self'", 'blob:'],
    reportUri: ['/api/v1/security/csp-report'],
  };
}

