import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { buildContentSecurityPolicyDirectives } from '../../config/contentSecurityPolicy.js';

describe('Content Security Policy hardening', () => {
  it('omits inline script execution and permits iframe ancestors only from configured origins', () => {
    const configured = ['https://preview.example.edu'];
    const directives = buildContentSecurityPolicyDirectives(configured, { production: true, preview: false });
    expect(directives.scriptSrc).not.toContain("'unsafe-inline'");
    expect(directives.frameAncestors).toEqual(["'self'", ...configured]);
    expect(directives.connectSrc).toContain('https://preview.example.edu');
  });

  it('serves bootstrap code externally and lets the reverse proxy pass through the Express policy', () => {
    const root = process.cwd();
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const nginx = fs.readFileSync(path.join(root, 'nginx/conf.d/default.conf'), 'utf8');
    expect(html).toContain('src="/early-logging.js"');
    expect(html).toContain('src="/early-theme.js"');
    expect(html).toContain('src="/disable-service-workers.js"');
    expect(html).not.toMatch(/<script\s*>[\s\S]*?<\/script>/i);
    expect(nginx).toContain('proxy_pass_header Content-Security-Policy;');
    expect(nginx).not.toMatch(/add_header\s+Content-Security-Policy/i);
  });
});
