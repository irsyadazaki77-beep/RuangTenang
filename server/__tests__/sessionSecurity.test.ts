import { describe, it, expect, beforeAll } from 'vitest';
import { authService } from '../services/authService.js';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../middleware/auth.js';

describe('Session and JWT Hardening Tests', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-32-chars-long-minimum-ruangtenang';
  });

  it('should generate JWT with correct issuer, audience, and algorithm', () => {
    const payload = {
      userId: 'user_123',
      email: 'mahasiswa@ui.ac.id',
      role: 'mahasiswa' as const,
      tier: 'Free' as const,
      sessionId: 'sess_abc123',
      name: 'Mahasiswa Test'
    };

    const token = authService.generateSessionToken(payload);
    expect(token).toBeDefined();

    const decoded = jwt.verify(token, getJwtSecret(), {
      issuer: 'ruangtenang',
      audience: 'ruangtenang-web',
      algorithms: ['HS256']
    }) as any;

    expect(decoded.userId).toBe('user_123');
    expect(decoded.iss).toBe('ruangtenang');
    expect(decoded.aud).toBe('ruangtenang-web');
  });

  it('should reject JWT forged with incorrect issuer or audience', () => {
    const badToken = jwt.sign(
      { userId: 'user_123', role: 'admin' },
      getJwtSecret(),
      { issuer: 'evil-issuer', audience: 'evil-aud' }
    );

    expect(() => {
      jwt.verify(badToken, getJwtSecret(), {
        issuer: 'ruangtenang',
        audience: 'ruangtenang-web',
        algorithms: ['HS256']
      });
    }).toThrow();
  });
});
